import { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { UserProfile, FoodLogEntry } from '../types';
import { format } from 'date-fns';
import { syncDailyTotals } from '../services/googleSheetsService';
import { Plus, Trash2, PieChart, Activity, Zap, Flame, History as HistoryIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import LogEntryForm from './LogEntryForm';
import History from './History';
import { cn } from '../lib/utils';

interface DashboardProps {
  profile: UserProfile;
  googleAccessToken: string | null;
  onConnectDrive: () => void;
  onProfileUpdate: (profile: UserProfile) => void;
}

export default function Dashboard({ profile, googleAccessToken, onConnectDrive, onProfileUpdate }: DashboardProps) {
  const [logs, setLogs] = useState<FoodLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    const q = query(
      collection(db, 'logs'),
      where('userId', '==', profile.uid),
      where('dateStr', '==', today),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FoodLogEntry[];
      setLogs(logData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'logs');
    });

    return () => unsubscribe();
  }, [profile.uid, today]);

  const totals = logs.reduce((acc, curr) => ({
    calories: acc.calories + curr.calories,
    protein: acc.protein + curr.protein,
    carbs: acc.carbs + curr.carbs,
    fat: acc.fat + curr.fat
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const deleteEntry = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'logs', id));
      
      // Step 7: Sync to Google Sheets if connected
      if (googleAccessToken && profile.sheetId) {
        try {
          await syncDailyTotals(profile.uid, today, googleAccessToken, profile.sheetId);
        } catch (sheetErr) {
          console.error("Sheets sync failed after deletion:", sheetErr);
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `logs/${id}`);
    }
  };

  if (showHistory) {
    return <History profile={profile} onBack={() => setShowHistory(false)} />;
  }

  const calPercentage = (totals.calories / profile.dailyCalorieGoal) * 100;
  const radius = 100;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(calPercentage, 100) / 100) * circumference;

  return (
    <motion.div 
      initial="hidden"
      animate="show"
      variants={{
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: {
            staggerChildren: 0.1
          }
        }
      }}
      className="grid grid-cols-12 gap-8"
    >
      {/* Overview Section */}
      <motion.div 
        variants={{
          hidden: { opacity: 0, y: 20 },
          show: { opacity: 1, y: 0 }
        }}
        className="col-span-12 lg:col-span-5 bg-[#0F0F0F] rounded-[2rem] p-8 border border-[#1A1A1A] flex flex-col items-center relative overflow-hidden group"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#DFFF00]/5 blur-[60px] group-hover:bg-[#DFFF00]/10 transition-colors duration-500" />
        <div className="flex justify-between items-center w-full mb-10">
          <div>
            <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-[0.2em] mb-1">Status Report</p>
            <h3 className="text-xl font-medium tracking-tight">Active Optimization</h3>
          </div>
          <div className="bg-[#1A1A1A] px-4 py-1.5 rounded-full border border-[#2A2A2A]">
            <p className="text-[10px] font-mono text-[#DFFF00] font-bold tracking-widest uppercase">{format(new Date(), 'dd.MMM.yy')}</p>
          </div>
        </div>
        
        <div className="relative flex items-center justify-center mb-10">
          <svg className="w-64 h-64 -rotate-90 filter drop-shadow-[0_0_20px_rgba(223,255,0,0.1)]">
            <circle cx="128" cy="128" r={radius} stroke="#1A1A1A" strokeWidth="8" fill="transparent" strokeDasharray="4 4" />
            <motion.circle 
              cx="128" 
              cy="128" 
              r={radius} 
              stroke="#DFFF00" 
              strokeWidth="10" 
              fill="transparent" 
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
              strokeLinecap="round" 
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-6xl font-bold tracking-tighter"
            >
              {Math.round(totals.calories).toLocaleString()}
            </motion.span>
            <span className="text-neutral-500 text-[10px] font-bold uppercase tracking-widest mt-1">Calorie Intake</span>
            <div className="mt-4 flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-[#DFFF00] animate-pulse" />
              <span className="text-[#DFFF00]/50 text-[10px] font-bold uppercase tracking-[0.1em]">
                {Math.max(0, profile.dailyCalorieGoal - totals.calories).toLocaleString()} kcal remaining
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 w-full border-t border-[#1A1A1A] pt-10">
          <MacroVisual label="Protein" current={totals.protein} goal={profile.proteinGoal} color="#60A5FA" />
          <MacroVisual label="Carbs" current={totals.carbs} goal={profile.carbGoal} color="#FB923C" />
          <MacroVisual label="Fats" current={totals.fat} goal={profile.fatGoal} color="#C084FC" />
        </div>
      </motion.div>

      {/* Action Section */}
      <div className="col-span-12 lg:col-span-7 flex flex-col gap-8">
        <motion.div 
          variants={{
            hidden: { opacity: 0, scale: 0.95 },
            show: { opacity: 1, scale: 1 }
          }}
        >
          <LogEntryForm userId={profile.uid} googleAccessToken={googleAccessToken} sheetId={profile.sheetId} />
        </motion.div>

        <motion.div 
          variants={{
            hidden: { opacity: 0, y: 20 },
            show: { opacity: 1, y: 0 }
          }}
          className="bg-[#0F0F0F] rounded-[2rem] p-8 border border-[#1A1A1A] flex-1 flex flex-col"
        >
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#DFFF00]/5 border border-[#DFFF00]/20 rounded-xl flex items-center justify-center text-[#DFFF00]">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="text-neutral-400 text-xs font-bold uppercase tracking-[0.2em]">Fuel Log History</h3>
            </div>
            <button 
              onClick={() => setShowHistory(true)}
              className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#DFFF00] hover:text-black text-neutral-400 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all flex items-center gap-2"
            >
              <HistoryIcon className="w-3 h-3" />
              Archived
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
            <AnimatePresence mode="popLayout" initial={false}>
              {logs.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-12 flex flex-col items-center justify-center opacity-30"
                >
                  <div className="w-12 h-12 border-2 border-dashed border-neutral-700 rounded-full mb-4" />
                  <p className="uppercase text-[10px] font-bold tracking-[0.3em]">System Standby: No Logs Found</p>
                </motion.div>
              ) : (
                <div className="flex flex-col gap-3">
                  {logs.map((log) => (
                    <motion.div
                      key={log.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="flex items-center justify-between p-4 bg-[#050505]/50 hover:bg-[#DFFF00]/5 rounded-[1.25rem] border border-[#1A1A1A] group transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-[#0F0F0F] rounded-2xl flex items-center justify-center text-2xl border border-[#1A1A1A] group-hover:border-[#DFFF00]/30 transition-all duration-300 transform group-hover:rotate-6">
                          {log.calories > 500 ? '🥩' : log.calories > 200 ? '🥗' : '☕'}
                        </div>
                        <div>
                          <p className="font-semibold text-base tracking-tight capitalize group-hover:text-[#DFFF00] transition-colors">{log.foodName}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-neutral-600 font-mono font-bold uppercase tracking-widest">{format(log.timestamp, 'HH:mm:ss')}</span>
                            <span className="w-1 h-1 rounded-full bg-neutral-800" />
                            <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">{log.servingSize}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="font-bold text-xl tracking-tighter tabular-nums text-white group-hover:text-[#DFFF00] transition-colors">+{Math.round(log.calories)}</p>
                          <p className="text-[9px] text-neutral-600 font-bold uppercase tracking-widest">KCAL</p>
                        </div>
                        <button 
                          onClick={() => log.id && deleteEntry(log.id)}
                          className="opacity-0 group-hover:opacity-100 p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all duration-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function MacroVisual({ label, current, goal, color }: { label: string, current: number, goal: number, color: string }) {
  const percentage = Math.min((current / goal) * 100, 100);
  return (
    <div className="text-center space-y-3">
      <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">{label}</p>
      <p className="font-medium text-lg tracking-tighter">{Math.round(current)}g</p>
      <div className="h-1 w-full bg-neutral-900 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
}
