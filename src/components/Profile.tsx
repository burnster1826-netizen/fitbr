import React, { useState } from 'react';
import { UserProfile } from '../types';
import { 
  LogOut, Shield, User as UserIcon, Target, 
  Flame, Dumbbell, Pizza, Database, 
  ShieldCheck, Loader2, Zap, Cpu,
  Activity, Fingerprint, Globe
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface ProfileProps {
  profile: UserProfile;
  onLogout: () => void;
  onConnectDrive: () => void;
  onDisconnectDrive: () => void;
  sheetLoading: boolean;
}

export default function Profile({ 
  profile, 
  onLogout, 
  onConnectDrive, 
  onDisconnectDrive,
  sheetLoading 
}: ProfileProps) {
  const [localProfile, setLocalProfile] = useState(profile);

  const handleUpdate = async (field: keyof UserProfile, value: any) => {
    const updated = { ...localProfile, [field]: value };
    setLocalProfile(updated);
    try {
      await updateDoc(doc(db, 'users', profile.uid), { [field]: value });
    } catch (error) {
       console.error("Failed to update profile", error);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto pb-32 lg:pb-12 px-4"
    >
      <div className="flex justify-between items-center mb-10">
        <h2 className="text-3xl font-bold tracking-tight text-white">Profile</h2>
        <button 
          onClick={onLogout}
          className="text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-red-400 p-2"
        >
          Logout
        </button>
      </div>

      <div className="space-y-6">
        {/* Basic Info */}
        <div className="bg-[#0F0F0F] border border-white/5 rounded-3xl p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6 mb-8 pb-8 border-b border-white/5">
            <div className="w-16 h-16 bg-[#DFFF00] rounded-2xl flex items-center justify-center text-black font-black text-2xl flex-shrink-0">
              {localProfile.displayName?.[0] || 'U'}
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-1">Display Name</label>
              <input 
                value={localProfile.displayName}
                onChange={(e) => handleUpdate('displayName', e.target.value)}
                className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 outline-none focus:border-[#DFFF00]/30 transition-all text-white font-medium"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block pl-1">Daily Calorie Goal</label>
            <div className="flex items-center gap-3">
              <input 
                type="number"
                value={localProfile.dailyCalorieGoal}
                onChange={(e) => handleUpdate('dailyCalorieGoal', parseInt(e.target.value) || 0)}
                className="w-32 bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 outline-none focus:border-[#DFFF00]/30 transition-all text-white font-mono text-lg font-bold"
              />
              <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">kcal / session</span>
            </div>
          </div>
        </div>

        {/* Nutritional Goals */}
        <div className="bg-[#0F0F0F] border border-white/5 rounded-3xl p-6 md:p-8">
          <h3 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-6">Nutritional Ratios (g)</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest block pl-1">Protein</span>
              <input 
                type="number"
                value={localProfile.proteinGoal}
                onChange={(e) => handleUpdate('proteinGoal', parseInt(e.target.value) || 0)}
                className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-3 outline-none focus:border-[#DFFF00]/30 transition-all font-bold text-center"
              />
            </div>
            <div className="space-y-2">
              <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest block pl-1">Carbs</span>
              <input 
                type="number"
                value={localProfile.carbGoal}
                onChange={(e) => handleUpdate('carbGoal', parseInt(e.target.value) || 0)}
                className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-3 outline-none focus:border-blue-500/30 transition-all font-bold text-center"
              />
            </div>
            <div className="space-y-2">
              <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest block pl-1">Fats</span>
              <input 
                type="number"
                value={localProfile.fatGoal}
                onChange={(e) => handleUpdate('fatGoal', parseInt(e.target.value) || 0)}
                className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-3 outline-none focus:border-orange-500/30 transition-all font-bold text-center"
              />
            </div>
          </div>
        </div>

        {/* Cloud Sync */}
        <div className="bg-[#0F0F0F] border border-white/5 rounded-3xl p-6 md:p-8">
          <div className="flex items-center gap-2 mb-6">
            <Database className="w-3.5 h-3.5 text-neutral-500" />
            <h3 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Cloud Sync</h3>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 justify-between bg-black/40 border border-white/5 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                localProfile.driveConnected ? "bg-[#DFFF00] text-black" : "bg-neutral-900 text-neutral-600"
              )}>
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Google Sheets Hub</p>
                <p className="text-[9px] font-bold text-neutral-500 uppercase">{localProfile.driveConnected ? "Sync Operational" : "Standby"}</p>
              </div>
            </div>
            
            <button 
              onClick={localProfile.driveConnected ? onDisconnectDrive : onConnectDrive}
              disabled={sheetLoading}
              className={cn(
                "w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all",
                localProfile.driveConnected 
                  ? "bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white" 
                  : "bg-[#DFFF00] text-black"
              )}
            >
              {sheetLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              ) : (
                localProfile.driveConnected ? "Disconnect" : "Connect Drive"
              )}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
