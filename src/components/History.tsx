import { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { UserProfile, FoodLogEntry } from '../types';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area 
} from 'recharts';
import { Calendar, BarChart3, TrendingUp, ChevronLeft } from 'lucide-react';
import { motion } from 'motion/react';

interface HistoryProps {
  profile: UserProfile;
  onBack: () => void;
}

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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-neutral-500 hover:text-[#DFFF00] transition-colors group"
        >
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Back to Today</span>
        </button>
        <div className="flex bg-[#0F0F0F] border border-[#1A1A1A] rounded-full p-1">
          <button 
            onClick={() => setView('week')}
            className={`px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${view === 'week' ? 'bg-[#DFFF00] text-black' : 'text-neutral-500 hover:text-white'}`}
          >
            Past 7 Days
          </button>
          <button 
            onClick={() => setView('month')}
            className={`px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${view === 'month' ? 'bg-[#DFFF00] text-black' : 'text-neutral-500 hover:text-white'}`}
          >
            Past 30 Days
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-[#0F0F0F] border border-[#1A1A1A] rounded-[2rem] p-8">
          <div className="flex items-center gap-3 mb-8">
            <BarChart3 className="w-5 h-5 text-[#DFFF00]" />
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-neutral-400">Caloric Consistency</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorCal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#DFFF00" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#DFFF00" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#404040" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke="#404040" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(val) => `${val}`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0F0F0F', border: '1px solid #1A1A1A', borderRadius: '12px', fontSize: '12px' }}
                  itemStyle={{ color: '#DFFF00' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="calories" 
                  stroke="#DFFF00" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorCal)" 
                />
                <Line 
                  type="monotone" 
                  dataKey="goal" 
                  stroke="#404040" 
                  strokeDasharray="5 5" 
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#0F0F0F] border border-[#1A1A1A] rounded-[2rem] p-8 flex flex-col justify-center gap-8">
          <div>
            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1">Average Daily</p>
            <p className="text-4xl font-medium tracking-tighter">
              {Math.round(chartData.reduce((sum, d) => sum + d.calories, 0) / days).toLocaleString()}
              <span className="text-sm font-normal text-neutral-600 ml-2 italic">kcal</span>
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1">Protein Focus</p>
            <p className="text-4xl font-medium tracking-tighter">
              {Math.round(chartData.reduce((sum, d) => sum + d.protein, 0) / days)}
              <span className="text-sm font-normal text-neutral-600 ml-2 italic">g/day</span>
            </p>
          </div>
          <div className="pt-8 border-t border-[#1A1A1A]">
            <div className="flex items-center gap-2 text-[#DFFF00] mb-4">
              <TrendingUp className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Insights</span>
            </div>
            <p className="text-xs text-neutral-500 leading-relaxed uppercase tracking-tight">
              {chartData.filter(d => d.calories > d.goal).length > 2 ? 
                "You've exceeded your goal several times recently. Precision is key for high performance." :
                "Maintained excellent caloric discipline this period. Vigor optimized."
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
