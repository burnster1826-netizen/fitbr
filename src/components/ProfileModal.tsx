import React, { useState } from 'react';
import { UserProfile } from '../types';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { X, Save, Target, Flame, Zap, Activity, FileSpreadsheet, ExternalLink, Cloud } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface ProfileModalProps {
  profile: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (profile: UserProfile) => void;
  googleAccessToken: string | null;
  onConnectDrive: () => void;
  onDisconnectDrive: () => void;
  sheetLoading: boolean;
  sheetError: string | null;
}

export default function ProfileModal({ 
  profile, 
  isOpen, 
  onClose, 
  onUpdate,
  googleAccessToken,
  onConnectDrive,
  onDisconnectDrive,
  sheetLoading,
  sheetError
}: ProfileModalProps) {
  const [formData, setFormData] = useState({
    displayName: profile.displayName,
    dailyCalorieGoal: profile.dailyCalorieGoal,
    proteinGoal: profile.proteinGoal,
    carbGoal: profile.carbGoal,
    fatGoal: profile.fatGoal,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const profileRef = doc(db, 'users', profile.uid);
      await updateDoc(profileRef, formData);
      onUpdate({ ...profile, ...formData });
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-[#0F0F0F] border border-[#1A1A1A] rounded-[2rem] overflow-hidden shadow-2xl"
          >
            <div className="p-8 border-b border-[#1A1A1A] flex justify-between items-center bg-[#DFFF00]/5">
              <div>
                <h2 className="text-2xl font-medium tracking-tight">System Profile</h2>
                <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest mt-1">Configure performance parameters</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-neutral-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col lg:flex-row h-[80vh] lg:h-auto overflow-y-auto custom-scrollbar">
              {/* Goals Form */}
              <motion.form 
                initial="hidden"
                animate="show"
                variants={{
                  hidden: { opacity: 0 },
                  show: {
                    opacity: 1,
                    transition: { staggerChildren: 0.05 }
                  }
                }}
                onSubmit={handleSubmit} 
                className="p-6 md:p-8 space-y-8 flex-1 border-b lg:border-b-0 lg:border-r border-[#1A1A1A]"
              >
                <div className="space-y-6">
                  <motion.div 
                    variants={{ hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0 } }}
                    className="space-y-1"
                  >
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#DFFF00]">Operator Designation</label>
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      className="w-full bg-[#050505] border border-[#1A1A1A] rounded-xl px-4 py-3 focus:border-[#DFFF00] focus:ring-1 focus:ring-[#DFFF00]/20 outline-none transition-all font-medium"
                    />
                  </motion.div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { label: "Daily Fuel Cap", icon: <Flame className="w-3 h-3" />, value: formData.dailyCalorieGoal, key: 'dailyCalorieGoal', unit: 'kcal' },
                      { label: "Protein Target", icon: <Activity className="w-3 h-3" />, value: formData.proteinGoal, key: 'proteinGoal', unit: 'g' },
                      { label: "Carb Allocation", icon: <Zap className="w-3 h-3" />, value: formData.carbGoal, key: 'carbGoal', unit: 'g' },
                      { label: "Lipid Allowance", icon: <Target className="w-3 h-3" />, value: formData.fatGoal, key: 'fatGoal', unit: 'g' }
                    ].map((input, i) => (
                      <motion.div 
                        key={input.key}
                        variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                      >
                        <GoalInput
                          label={input.label}
                          icon={input.icon}
                          value={input.value}
                          onChange={(val) => setFormData({ ...formData, [input.key]: val })}
                          unit={input.unit}
                        />
                      </motion.div>
                    ))}
                  </div>
                </div>

                <motion.button
                  variants={{ hidden: { opacity: 0, scale: 0.95 }, show: { opacity: 1, scale: 1 } }}
                  type="submit"
                  disabled={saving}
                  className="w-full bg-[#DFFF00] text-black font-bold py-5 rounded-xl flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(223,255,0,0.3)] active:scale-95 transition-all disabled:opacity-50 min-h-[56px]"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'UPDATING SYSTEMS...' : 'SAVE CONFIGURATION'}
                </motion.button>
              </motion.form>

              {/* Integrations Section */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-6 md:p-8 space-y-8 flex-1 bg-[#0A0A0A]/50"
              >
                <div className="space-y-6">
                  <div>
                    <h3 className="text-[10px] text-[#DFFF00] font-bold uppercase tracking-[0.2em] mb-4">Cloud Modules</h3>
                    
                    <div className="flex flex-col gap-4 bg-[#0F0F0F] rounded-[1.5rem] p-6 border border-[#1A1A1A] relative group">
                      <div className="absolute inset-0 bg-[#DFFF00]/0 group-hover:bg-[#DFFF00]/5 transition-colors duration-500 rounded-[1.5rem]" />
                      <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-500",
                            profile.driveConnected ? "bg-[#DFFF00] text-black border-transparent shadow-[0_0_15px_rgba(223,255,0,0.3)]" : "bg-neutral-900 border-neutral-800 text-neutral-600"
                          )}>
                            <FileSpreadsheet className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-sm font-bold tracking-tight">Vigor Spreadsheet</p>
                            <p className="text-[8px] font-mono text-[#DFFF00] uppercase font-bold tracking-widest mt-1 opacity-70">
                              {profile.driveConnected ? (profile.sheetId ? 'V-SYNC ACTIVE' : 'INITIALIZING...') : 'DISCONNECTED'}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="relative z-10">
                        {profile.driveConnected && profile.sheetId ? (
                          <div className="flex flex-col gap-2">
                            <a 
                              href={`https://docs.google.com/spreadsheets/d/${profile.sheetId}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-center gap-2 px-6 py-4 bg-[#1A1A1A] hover:bg-neutral-800 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                            >
                              <ExternalLink className="w-4 h-4 text-[#DFFF00]" />
                              Access Data Stream
                            </a>
                            <button
                              onClick={onDisconnectDrive}
                              className="w-full flex items-center justify-center gap-2 px-6 py-3 text-red-500/50 hover:text-red-500 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all mt-2"
                            >
                              Terminate Connection
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={onConnectDrive}
                            disabled={sheetLoading}
                            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#1A1A1A] hover:bg-neutral-800 text-[#DFFF00] border border-[#DFFF00]/20 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                          >
                            <Cloud className="w-4 h-4" />
                            {sheetLoading ? 'AUTH IN PROGRESS...' : 'INITIATE SYNC'}
                          </button>
                        )}

                        {sheetError && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl"
                          >
                            <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
                              <X className="w-3 h-3" />
                              Protocol Error
                            </p>
                            <p className="text-[10px] text-neutral-400 leading-relaxed uppercase font-medium">
                              {sheetError.includes('Enable it by visiting') ? (
                                <>
                                  API Permission Failure. 
                                  <a 
                                    href={sheetError.match(/https?:\/\/[^\s]+/)?.[0]} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="text-red-400 hover:underline ml-1"
                                  >
                                    Resolve
                                  </a>
                                </>
                              ) : sheetError}
                            </p>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-[#0F0F0F] border border-[#1A1A1A] rounded-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/30" />
                    <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-2">Internal Diagnostics</p>
                    <p className="text-[10px] text-neutral-400 leading-relaxed uppercase font-bold tracking-tight">
                      All biological fuel logs are synchronously duplexed to Cloud storage.
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function GoalInput({ label, value, onChange, unit, icon }: { label: string, value: number, onChange: (val: number) => void, unit: string, icon: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
        {icon}
        {label}
      </label>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value) || 0)}
          className="w-full bg-[#050505] border border-[#1A1A1A] rounded-xl pl-4 pr-12 py-4 focus:border-[#DFFF00] outline-none transition-colors font-medium min-h-[48px]"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-neutral-600 uppercase">{unit}</span>
      </div>
    </div>
  );
}
