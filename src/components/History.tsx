import { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { UserProfile, FoodLogEntry } from '../types';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import { Calendar, BarChart3, TrendingUp, ChevronLeft, Target, Percent, Zap, Flame } from 'lucide-react';
import { motion } from 'motion/react';

interface HistoryProps {
  profile: UserProfile;
  onBack: () => void;
}

const COLORS = ['#DFFF00', '#A3A3A3', '#404040'];

export default function History({ profile, onBack }: HistoryProps) {
  const [logs, setLogs] = useState<FoodLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'week' | 'month'>('week');

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);
      const daysToFetch = view === 'week' ? 7 : 30;
      const startDate = subDays(new Date(), daysToFetch);
      
      const q = query(
        collection(db, 'logs'),
        where('userId', '==', profile.uid),
        where('timestamp', '>=', startDate.getTime()),
        orderBy('timestamp', 'asc')
      );

      try {
        const snapshot = await getDocs(q);
        const logData = snapshot.docs.map(doc => doc.data() as FoodLogEntry);
        setLogs(logData);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'logs');
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [profile.uid, view]);

  // Aggregate data by day
  const days = view === 'week' ? 7 : 30;
  const chartData = Array.from({ length: days }).map((_, i) => {
    const d = subDays(new Date(), days - 1 - i);
    const dateStr = format(d, 'yyyy-MM-dd');
    const dayLogs = logs.filter(l => l.dateStr === dateStr);
    
    return {
      date: format(d, view === 'week' ? 'EEE' : 'MMM d'),
      calories: dayLogs.reduce((sum, l) => sum + l.calories, 0),
      protein: dayLogs.reduce((sum, l) => sum + l.protein, 0),
      carbs: dayLogs.reduce((sum, l) => sum + l.carbs, 0),
      fat: dayLogs.reduce((sum, l) => sum + l.fat, 0),
      goal: profile.dailyCalorieGoal
    };
  });

  const totalCalories = chartData.reduce((sum, d) => sum + d.calories, 0);
  const totalProtein = chartData.reduce((sum, d) => sum + d.protein, 0);
  const totalCarbs = chartData.reduce((sum, d) => sum + d.carbs, 0);
  const totalFat = chartData.reduce((sum, d) => sum + d.fat, 0);

  const macroData = [
    { name: 'Protein', value: totalProtein * 4 },
    { name: 'Carbs', value: totalCarbs * 4 },
    { name: 'Fats', value: totalFat * 9 },
  ];

  const completionRate = (chartData.filter(d => d.calories > 0 && d.calories <= d.goal).length / chartData.filter(d => d.calories > 0).length) * 100 || 0;
  const avgCals = totalCalories / days;

  return (
    <div className="space-y-6 md:space-y-8 pb-20 lg:pb-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">Temporal Logs</h2>
          <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-[0.3em]">Historical Data Analysis</p>
        </div>
        <div className="flex bg-[#0F0F0F] border border-[#1A1A1A] rounded-2xl p-1">
          <button 
            onClick={() => setView('week')}
            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${view === 'week' ? 'bg-[#DFFF00] text-black shadow-[0_0_20px_rgba(223,255,0,0.2)]' : 'text-neutral-500 hover:text-white'}`}
          >
            Past 7D
          </button>
          <button 
            onClick={() => setView('month')}
            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${view === 'month' ? 'bg-[#DFFF00] text-black shadow-[0_0_20px_rgba(223,255,0,0.2)]' : 'text-neutral-500 hover:text-white'}`}
          >
            Past 30D
          </button>
        </div>
      </div>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#0F0F0F] border border-white/5 rounded-2xl p-4 md:p-6 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-2 opacity-5">
            <Target className="w-12 h-12" />
          </div>
          <p className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Efficiency</p>
          <p className="text-2xl font-bold tracking-tighter text-[#DFFF00]">{Math.round(completionRate)}%</p>
          <p className="text-[8px] text-neutral-600 font-bold uppercase mt-1 tracking-tight">Goal Compliance</p>
        </div>

        <div className="bg-[#0F0F0F] border border-white/5 rounded-2xl p-4 md:p-6 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-2 opacity-5">
            <Zap className="w-12 h-12" />
          </div>
          <p className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Avg Daily</p>
          <p className="text-2xl font-bold tracking-tighter text-white">{Math.round(avgCals).toLocaleString()}</p>
          <p className="text-[8px] text-neutral-600 font-bold uppercase mt-1 tracking-tight">Cals / Period</p>
        </div>

        <div className="bg-[#0F0F0F] border border-white/5 rounded-2xl p-4 md:p-6 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-2 opacity-5">
            <Flame className="w-12 h-12" />
          </div>
          <p className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Highest</p>
          <p className="text-2xl font-bold tracking-tighter text-white">{Math.max(...chartData.map(d => d.calories)).toLocaleString()}</p>
          <p className="text-[8px] text-neutral-600 font-bold uppercase mt-1 tracking-tight">Peak Intake</p>
        </div>

        <div className="bg-[#0F0F0F] border border-white/5 rounded-2xl p-4 md:p-6 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-2 opacity-5">
            <TrendingUp className="w-12 h-12" />
          </div>
          <p className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Lowest</p>
          <p className="text-2xl font-bold tracking-tighter text-white">{Math.min(...chartData.filter(d => d.calories > 0).map(d => d.calories)).toLocaleString()}</p>
          <p className="text-[8px] text-neutral-600 font-bold uppercase mt-1 tracking-tight">Min Session</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-8 bg-[#0F0F0F] border border-white/5 rounded-[2.5rem] p-6 md:p-10">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#DFFF00]/5 rounded-xl flex items-center justify-center text-[#DFFF00]">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-white">Consumption Curve</h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#DFFF00]" />
              <span className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest">Actual Log</span>
              <div className="w-2 h-2 rounded-full bg-neutral-800 ml-2" />
              <span className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest">Goal Threshold</span>
            </div>
          </div>
          
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorCal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#DFFF00" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#DFFF00" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#404040" 
                  fontSize={9} 
                  tickLine={false} 
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke="#404040" 
                  fontSize={9} 
                  tickLine={false} 
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #1A1A1A', borderRadius: '16px', fontSize: '11px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}
                  itemStyle={{ color: '#DFFF00' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="calories" 
                  stroke="#DFFF00" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorCal)" 
                  animationDuration={1500}
                />
                <Area 
                  type="monotone" 
                  dataKey="goal" 
                  stroke="#2A2A2A" 
                  fill="transparent"
                  strokeDasharray="4 4" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Side Stats */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Macro Pie */}
          <div className="bg-[#0F0F0F] border border-white/5 rounded-[2.5rem] p-8 flex flex-col items-center">
            <p className="text-[9px] font-bold text-neutral-500 uppercase tracking-[0.2em] mb-6 text-center w-full">Macro Composition</p>
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={macroData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {macroData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                     contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #1A1A1A', borderRadius: '12px', fontSize: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-4 w-full mt-6">
              {macroData.map((macro, i) => (
                <div key={macro.name} className="flex flex-col items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <p className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest">{macro.name}</p>
                  <p className="text-xs font-mono font-bold text-white">
                    {Math.round((macro.value / (totalProtein * 4 + totalCarbs * 4 + totalFat * 9)) * 100)}%
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Insights Card */}
          <div className="bg-[#0F0F0F] border border-white/5 rounded-[2.5rem] p-8">
            <div className="flex items-center gap-2 text-[#DFFF00] mb-6">
              <TrendingUp className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Network Insights</span>
            </div>
            <div className="space-y-6">
               <div className="space-y-2">
                 <p className="text-xs text-white leading-relaxed font-bold tracking-tight">
                  {completionRate > 80 ? "Peak Discipline Detected." : "Sub-Optimal Consistency."}
                 </p>
                 <p className="text-[10px] text-neutral-500 leading-relaxed font-medium uppercase tracking-tight">
                  {chartData.filter(d => d.calories > d.goal).length > 2 ? 
                    "Caloric overflow events registered. Recommend metabolic stabilization." :
                    "Efficiency remains within high-performance parameters. System optimized."
                  }
                 </p>
               </div>

               <div className="pt-6 border-t border-white/5">
                 <div className="flex justify-between items-center mb-2">
                    <p className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest">Protein Saturation</p>
                    <p className="text-[8px] font-bold text-[#DFFF00]">{Math.round(totalProtein / days)}g / d</p>
                 </div>
                 <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (totalProtein / days) / 1.5)}%` }}
                      className="h-full bg-[#DFFF00]"
                    />
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
