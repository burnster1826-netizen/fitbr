import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { 
  LogOut, Shield, User as UserIcon, Target, 
  Flame, Dumbbell, Pizza, Database, 
  ShieldCheck, Loader2, Zap, Cpu,
  Activity, Fingerprint, Globe, RefreshCcw,
  Check, X, Apple, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { syncDailyTotals } from '../services/googleSheetsService';
import FoodLibrary from './FoodLibrary';

interface ProfileProps {
  profile: UserProfile;
  googleAccessToken: string | null;
  onLogout: () => void;
  onConnectDrive: () => void;
  onDisconnectDrive: () => void;
  sheetLoading: boolean;
}

export default function Profile({ 
  profile, 
  googleAccessToken,
  onLogout, 
  onConnectDrive, 
  onDisconnectDrive,
  sheetLoading 
}: ProfileProps) {
  const [localProfile, setLocalProfile] = useState(profile);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showLibrary, setShowLibrary] = useState(false);

  useEffect(() => {
    setLocalProfile(profile);
  }, [profile]);

  const handleManualSync = async () => {
    if (!googleAccessToken || !profile.sheetId) return;
    setSyncing(true);
    setSyncStatus('idle');
    try {
      const today = new Date().toISOString().split('T')[0];
      await syncDailyTotals(profile.uid, today, googleAccessToken, profile.sheetId);
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (err: any) {
      console.error("Manual sync failed:", err);
      if (err.message?.includes('Requested entity was not found')) {
        // Sheet was likely deleted. Clear it to trigger re-creation
        try {
          await updateDoc(doc(db, 'users', profile.uid), { sheetId: "" });
        } catch (dbErr) {
          console.error("Failed to clear stale sheetId", dbErr);
        }
      }
      setSyncStatus('error');
    } finally {
      setSyncing(false);
    }
  };

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
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-neutral-500" />
              <h3 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Cloud Sync Hub</h3>
            </div>
            {localProfile.driveConnected && (
              <div className="flex gap-2">
                <div className={cn(
                  "px-2 py-0.5 rounded text-[8px] font-bold uppercase",
                  googleAccessToken ? "bg-green-500/10 text-green-500" : "bg-orange-500/10 text-orange-500"
                )}>
                  {googleAccessToken ? "Token Active" : "Re-auth Required"}
                </div>
              </div>
            )}
          </div>
          
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-between bg-black/40 border border-white/5 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                  localProfile.driveConnected ? "bg-[#DFFF00] text-black" : "bg-neutral-900 text-neutral-600"
                )}>
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Google Sheets Master</p>
                  <p className="text-[9px] font-bold text-neutral-500 uppercase">
                    {localProfile.driveConnected ? "Connection Established" : "Standby Status"}
                  </p>
                </div>
              </div>
              
              <button 
                onClick={() => {
                  if (!googleAccessToken && localProfile.driveConnected) {
                    onConnectDrive();
                  } else if (localProfile.driveConnected) {
                    onDisconnectDrive();
                  } else {
                    onConnectDrive();
                  }
                }}
                disabled={sheetLoading}
                className={cn(
                  "w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all",
                  (!googleAccessToken && localProfile.driveConnected)
                    ? "bg-[#DFFF00] text-black shadow-[0_0_20px_rgba(223,255,0,0.1)]"
                    : localProfile.driveConnected 
                      ? "bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white" 
                      : "bg-[#DFFF00] text-black shadow-[0_0_20px_rgba(223,255,0,0.1)]"
                )}
              >
                {sheetLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  (!googleAccessToken && localProfile.driveConnected) 
                    ? "Re-Authorize" 
                    : localProfile.driveConnected ? "Disconnect" : "Initialize Link"
                )}
              </button>
            </div>

            {localProfile.driveConnected && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={handleManualSync}
                  disabled={!googleAccessToken || syncing}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-3 p-4 bg-black/40 border rounded-2xl transition-all font-bold text-[10px] uppercase tracking-widest",
                    !googleAccessToken 
                      ? "border-white/5 opacity-30 cursor-not-allowed" 
                      : "border-[#DFFF00]/10 hover:border-[#DFFF00]/40 text-white"
                  )}
                >
                  {syncing ? (
                    <RefreshCcw className="w-4 h-4 animate-spin text-[#DFFF00]" />
                  ) : syncStatus === 'success' ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : syncStatus === 'error' ? (
                    <X className="w-4 h-4 text-red-500" />
                  ) : (
                    <RefreshCcw className="w-4 h-4 text-[#DFFF00]" />
                  )}
                  {syncing ? "Syncing..." : syncStatus === 'success' ? "Sync Complete" : syncStatus === 'error' ? "Sync Error" : "Push Manual Sync"}
                </button>

                <a 
                  href={profile.sheetId ? `https://docs.google.com/spreadsheets/d/${profile.sheetId}` : '#'}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    "flex flex-1 items-center justify-center gap-3 p-4 bg-black/40 border rounded-2xl transition-all font-bold text-[10px] uppercase tracking-widest",
                    !profile.sheetId 
                      ? "border-white/5 opacity-30 cursor-not-allowed" 
                      : "border-blue-500/10 hover:border-blue-500/40 text-white"
                  )}
                >
                  <Globe className="w-4 h-4 text-blue-400" />
                  Vault Dashboard
                </a>
              </div>
            )}
            
            {!googleAccessToken && localProfile.driveConnected && (
              <div className="p-4 bg-orange-500/5 border border-orange-500/10 rounded-2xl flex items-start gap-3">
                <Shield className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                <p className="text-[9px] text-orange-500/70 font-medium uppercase leading-relaxed tracking-wider">
                  Operational Security: Temporary session token expired. Tap 'Initialize Link' to restore real-time Cloud bi-directional sync.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Nutritional Library Section */}
        <div className="bg-[#0F0F0F] border border-white/5 rounded-3xl p-6 md:p-8">
          <div className="flex items-center gap-2 mb-6">
            <Apple className="w-3.5 h-3.5 text-[#DFFF00]" />
            <h3 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Biological Database</h3>
          </div>
          
          <button 
            onClick={() => setShowLibrary(true)}
            className="w-full bg-black/40 border border-white/5 hover:border-[#DFFF00]/30 rounded-2xl p-5 flex items-center justify-between group transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-neutral-900 flex items-center justify-center text-neutral-400 group-hover:text-[#DFFF00] transition-colors">
                <Apple className="w-6 h-6" />
              </div>
              <div className="text-left">
                <p className="font-bold text-white">Nutritional Library</p>
                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">View all logged food items and macros</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-neutral-700 group-hover:text-[#DFFF00] transition-colors" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showLibrary && (
          <FoodLibrary 
            userId={profile.uid} 
            onClose={() => setShowLibrary(false)} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
