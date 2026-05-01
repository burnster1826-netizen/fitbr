/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from './lib/firebase';
import { GoogleAuthProvider, signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, getAdditionalUserInfo } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { UserProfile, DEFAULT_GOALS } from './types';
import { LogIn, LogOut, Target, Loader2, Mail, Lock, UserPlus, ArrowLeft, Shield, Zap, LayoutDashboard, History as HistoryIcon, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Dashboard from './components/Dashboard';
import History from './components/History';
import Profile from './components/Profile';
import UserNav from './components/UserNav';
import ProfileModal from './components/ProfileModal';
import { cn } from './lib/utils';

export default function App() {
  const [user, loading, error] = useAuthState(auth);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'initial' | 'email-login' | 'email-signup'>('initial');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'FEED' | 'HISTORY' | 'PROFILE'>('FEED');
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [isAuthInProgress, setIsAuthInProgress] = useState(false);

  useEffect(() => {
    // Auto-setup sheet if drive is connected
    const setupSheet = async () => {
      if (profile?.driveConnected && googleAccessToken && !sheetLoading) {
        setSheetLoading(true);
        setSheetError(null);
        try {
          const { createNutritionSheet, findExistingSheet, checkSheetExists } = await import('./services/googleSheetsService');
          
          let sheetId = profile.sheetId;

          // Verify if sheetId is valid if we have one
          if (sheetId) {
            const exists = await checkSheetExists(googleAccessToken, sheetId);
            if (!exists) {
              sheetId = ""; // Mark as missing
            }
          }

          // Check if we need to find or create new
          const existingIdByName = await findExistingSheet(googleAccessToken);
          
          if (existingIdByName) {
            sheetId = existingIdByName;
          } else if (!sheetId) {
            // Only create if we neither have one nor found one by name
            sheetId = await createNutritionSheet(googleAccessToken);
          }

          if (sheetId !== profile.sheetId) {
            const profileRef = doc(db, 'users', profile.uid);
            await updateDoc(profileRef, { sheetId });
            setProfile({ ...profile, sheetId });
          }
        } catch (err: any) {
          console.error("Sheet setup failed:", err);
          setSheetError(err.message || "Failed to initialize Google Sheet. Please ensure the Sheets API is enabled.");
        } finally {
          setSheetLoading(false);
        }
      }
    };
    setupSheet();
  }, [profile?.driveConnected, profile?.sheetId, googleAccessToken]);

  const handleDisconnectDrive = async () => {
    if (!user) return;
    try {
      const profileRef = doc(db, 'users', user.uid);
      await updateDoc(profileRef, { 
        driveConnected: false,
        sheetId: null 
      });
      setProfile(prev => prev ? { ...prev, driveConnected: false, sheetId: undefined } : null);
      setGoogleAccessToken(null);
      setSheetError(null);
    } catch (err: any) {
      console.error("Error disconnecting drive:", err);
    }
  };

  useEffect(() => {
    async function fetchProfile() {
      if (user) {
        setProfileLoading(true);
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            setProfile({ uid: user.uid, ...docSnap.data() } as UserProfile);
          } else {
            const newProfile: UserProfile = {
              uid: user.uid,
              displayName: user.displayName || email.split('@')[0] || 'Fitness Fanatic',
              email: user.email || email || '',
              dailyCalorieGoal: DEFAULT_GOALS.calories,
              proteinGoal: DEFAULT_GOALS.protein,
              carbGoal: DEFAULT_GOALS.carbs,
              fatGoal: DEFAULT_GOALS.fat
            };
            await setDoc(docRef, newProfile);
            setProfile(newProfile);
          }
        } catch (err) {
          console.error("Error fetching profile:", err);
        } finally {
          setProfileLoading(false);
        }
      } else {
        setProfile(null);
      }
    }
    fetchProfile();
  }, [user, email]);

  const handleGoogleLogin = async () => {
    if (isAuthInProgress) return;
    setIsAuthInProgress(true);
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    provider.addScope('https://www.googleapis.com/auth/spreadsheets');
    
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setGoogleAccessToken(credential.accessToken);
      }
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setAuthError('Google Sign-In is not enabled in the Firebase Console. Please enable it under Authentication > Sign-in method.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setAuthError(`This domain (${window.location.hostname}) is not authorized for Firebase Authentication. Please add it to the "Authorized domains" list in the Firebase Console (Authentication > Settings).`);
      } else if (err.code !== 'auth/popup-closed-by-user') {
        setAuthError(err.message);
      }
    } finally {
      setIsAuthInProgress(false);
    }
  };

  const handleConnectDrive = async () => {
    if (isAuthInProgress) return;
    setIsAuthInProgress(true);
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    provider.addScope('https://www.googleapis.com/auth/spreadsheets');
    
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setGoogleAccessToken(credential.accessToken);
        if (user) {
          const profileRef = doc(db, 'users', user.uid);
          await updateDoc(profileRef, { driveConnected: true });
          setProfile(prev => prev ? { ...prev, driveConnected: true } : null);
        }
      }
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setAuthError('Google Sign-In is not enabled in the Firebase Console. Please enable it under Authentication > Sign-in method.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setAuthError(`This domain (${window.location.hostname}) is not authorized for Firebase Authentication. Please add it to the "Authorized domains" list in the Firebase Console (Authentication > Settings).`);
      } else if (err.code !== 'auth/popup-closed-by-user') {
        setAuthError(err.message);
      }
    } finally {
      setIsAuthInProgress(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (authMode === 'email-signup') {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setAuthError('Email/Password login is not enabled in the Firebase Console. Please enable it under Authentication > Sign-in method.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setAuthError(`This domain (${window.location.hostname}) is not authorized for Firebase Authentication. Please add it to the "Authorized domains" list in the Firebase Console (Authentication > Settings).`);
      } else {
        setAuthError(err.message);
      }
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading || (user && !profile)) {
    return (
      <div className="min-h-screen bg-[#050505] text-[#F5F5F5] flex items-center justify-center font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-[#DFFF00]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-[#F5F5F5] font-sans selection:bg-[#DFFF00] selection:text-black flex flex-col lg:flex-row relative overflow-hidden">
      {/* Cinematic Scanning Line */}
      <motion.div 
        initial={{ top: '-5%' }}
        animate={{ top: '105%' }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        className="fixed left-0 right-0 h-px bg-[#DFFF00]/5 z-0 pointer-events-none shadow-[0_0_10px_rgba(223,255,0,0.1)]"
      />

      <aside className="hidden lg:flex w-24 border-r border-white/5 flex-col items-center py-10 gap-12 bg-[#080808] shrink-0 sticky top-0 h-screen z-10">
        <motion.div 
          whileHover={{ rotate: 180 }}
          transition={{ duration: 0.5 }}
          className="w-12 h-12 bg-[#DFFF00] rounded-2xl flex items-center justify-center shadow-[0_0_20px_#DFFF00]/10"
        >
          <div className="w-6 h-6 bg-black rounded-lg flex items-center justify-center font-black text-xs">V</div>
        </motion.div>
        <nav className="flex flex-col gap-8 group">
          <button 
            onClick={() => setActiveTab('FEED')}
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
              activeTab === 'FEED' ? "bg-[#DFFF00]/10 text-[#DFFF00]" : "text-neutral-500 hover:text-white"
            )}
          >
            <LayoutDashboard className="w-5 h-5" />
          </button>
          
          <button 
            onClick={() => setActiveTab('HISTORY')}
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
              activeTab === 'HISTORY' ? "bg-[#DFFF00]/10 text-[#DFFF00]" : "text-neutral-500 hover:text-white"
            )}
          >
            <HistoryIcon className="w-5 h-5" />
          </button>

          <button 
            onClick={() => setActiveTab('PROFILE')}
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
              activeTab === 'PROFILE' ? "bg-[#DFFF00]/10 text-[#DFFF00]" : "text-neutral-500 hover:text-white"
            )}
          >
            <User className="w-5 h-5" />
          </button>
        </nav>
        <div className="mt-auto opacity-10 flex flex-col items-center gap-4">
          <Shield className="w-4 h-4" />
          <div className="h-20 w-px bg-white/20" />
        </div>
      </aside>

      {/* Bottom Navigation for Mobile */}
      {user && profile && (
        <nav className="lg:hidden fixed bottom-6 left-6 right-6 h-18 bg-[#080808]/90 backdrop-blur-2xl border border-white/10 rounded-[2rem] z-50 flex items-center justify-around px-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <button 
            className="relative flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all active:scale-95"
            onClick={() => { setActiveTab('FEED'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          >
            {activeTab === 'FEED' && (
              <motion.div 
                layoutId="active-tab"
                className="absolute inset-x-2 inset-y-2 bg-[#DFFF00]/10 rounded-2xl -z-10"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <LayoutDashboard className={cn("w-5 h-5 transition-colors", activeTab === 'FEED' ? "text-[#DFFF00]" : "text-neutral-500")} />
            <span className={cn("text-[9px] font-bold uppercase tracking-tight transition-colors", activeTab === 'FEED' ? "text-[#DFFF00]" : "text-neutral-500")}>Feed</span>
          </button>
          
          <button 
            className="relative flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all active:scale-95"
            onClick={() => { setActiveTab('HISTORY'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          >
            {activeTab === 'HISTORY' && (
              <motion.div 
                layoutId="active-tab"
                className="absolute inset-x-2 inset-y-2 bg-[#DFFF00]/10 rounded-2xl -z-10"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <HistoryIcon className={cn("w-5 h-5 transition-colors", activeTab === 'HISTORY' ? "text-[#DFFF00]" : "text-neutral-500")} />
            <span className={cn("text-[9px] font-bold uppercase tracking-tight transition-colors", activeTab === 'HISTORY' ? "text-[#DFFF00]" : "text-neutral-500")}>History</span>
          </button>

          <button 
            className="relative flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all active:scale-95"
            onClick={() => { setActiveTab('PROFILE'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          >
            {activeTab === 'PROFILE' && (
              <motion.div 
                layoutId="active-tab"
                className="absolute inset-x-2 inset-y-2 bg-[#DFFF00]/10 rounded-2xl -z-10"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <User className={cn("w-5 h-5 transition-colors", activeTab === 'PROFILE' ? "text-[#DFFF00]" : "text-neutral-500")} />
            <span className={cn("text-[9px] font-bold uppercase tracking-tight transition-colors", activeTab === 'PROFILE' ? "text-[#DFFF00]" : "text-neutral-500")}>Profile</span>
          </button>
        </nav>
      )}

      <div className="flex-1 flex flex-col relative z-10 pb-24 lg:pb-0">
        <header className="p-6 md:px-12 md:pt-12">
          <div className="max-w-6xl mx-auto flex justify-between items-end">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col"
            >
              <h1 className="flex flex-col">
                <span className="text-5xl md:text-7xl font-black tracking-tighter uppercase text-white leading-[0.9]">Vigor</span>
                <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.5em] text-white/50 mt-1 ml-1">Dashboard</span>
              </h1>
            </motion.div>
            
            {user && profile && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="hidden lg:flex items-center gap-4"
              >
                <UserNav 
                  profile={profile} 
                  onLogout={handleLogout} 
                  onOpenProfile={() => setActiveTab('PROFILE')} 
                />
              </motion.div>
            )}
          </div>
        </header>

        <main className="max-w-6xl mx-auto w-full p-6 md:px-12 md:pb-12">
          <AnimatePresence mode="wait">
            {!user ? (
               // ... existing login UI ...
              <motion.div 
                key="login-ui"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-4xl mx-auto py-12 text-center"
              >
                {authMode === 'initial' ? (
                  <div className="space-y-12">
                    <div className="space-y-6">
                      <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#DFFF00]/5 border border-[#DFFF00]/15 rounded-full"
                      >
                        <Zap className="w-3 h-3 text-[#DFFF00]" />
                        <span className="text-[10px] text-[#DFFF00] font-bold uppercase tracking-[0.2em]">High Performance Nutrition Analysis</span>
                      </motion.div>
                      <h2 className="text-6xl sm:text-[9.5rem] font-medium tracking-tight leading-[0.8] uppercase flex flex-col items-center">
                        PRECISION 
                        <span className="flex items-center gap-4 text-[#DFFF00]">
                          <span className="italic tracking-tighter">AI</span> FUEL
                        </span>
                      </h2>
                    </div>
                    
                    <p className="max-w-2xl mx-auto text-neutral-500 text-xl leading-relaxed font-medium">
                      Optimizing biological performance through high-fidelity data extraction and predictive modeling.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                      <button 
                        onClick={handleGoogleLogin}
                        className="group relative flex items-center justify-center gap-3 bg-[#DFFF00] text-black px-12 py-5 rounded-2xl font-bold hover:shadow-[0_0_40px_rgba(223,255,0,0.4)] transition-all active:scale-95 overflow-hidden"
                      >
                        <LogIn className="w-5 h-5" />
                        <span className="uppercase tracking-widest text-xs">Authorize with Google</span>
                      </button>
                      <button 
                        onClick={() => setAuthMode('email-login')}
                        className="flex items-center justify-center gap-3 bg-[#111] border border-white/5 text-[#F5F5F5] px-12 py-5 rounded-2xl font-bold hover:bg-[#1A1A1A] transition-all hover:border-[#DFFF00]/20"
                      >
                        <Mail className="w-5 h-5 text-neutral-500" />
                        <span className="uppercase tracking-widest text-xs">Standard Login</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-8 pt-12 max-w-2xl mx-auto border-t border-white/5 opacity-40">
                      <div>
                        <p className="text-xl font-bold tracking-tighter">01</p>
                        <p className="text-[8px] uppercase tracking-widest font-bold">Extraction</p>
                      </div>
                      <div>
                        <p className="text-xl font-bold tracking-tighter">02</p>
                        <p className="text-[8px] uppercase tracking-widest font-bold">Analytics</p>
                      </div>
                      <div>
                        <p className="text-xl font-bold tracking-tighter">03</p>
                        <p className="text-[8px] uppercase tracking-widest font-bold">Optimization</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#0F0F0F] border border-[#1A1A1A] rounded-[3rem] p-12 text-left relative max-w-md mx-auto shadow-2xl">
                    <button 
                      onClick={() => { setAuthMode('initial'); setAuthError(''); }}
                      className="absolute top-12 left-12 p-3 bg-[#050505] rounded-xl text-neutral-500 hover:text-[#DFFF00] hover:border-[#DFFF00]/20 border border-transparent transition-all"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="pt-16">
                      <h3 className="text-3xl font-medium mb-3 tracking-tight">
                        {authMode === 'email-login' ? 'Authentication Required' : 'Initialize System Member'}
                      </h3>
                      <p className="text-neutral-500 text-sm mb-10 leading-relaxed uppercase font-bold tracking-tight">
                        Secure access gateway for performance monitoring.
                      </p>

                      <form onSubmit={handleEmailAuth} className="space-y-6">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#DFFF00]">Access Identifier</label>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                            <input 
                              type="email" 
                              required 
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="w-full bg-[#050505] border border-[#1A1A1A] rounded-xl px-12 py-4 focus:border-[#DFFF00] transition-all outline-none font-medium"
                              placeholder="operator@vigor.net"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#DFFF00]">Security Key</label>
                          <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                            <input 
                              type="password" 
                              required 
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="w-full bg-[#050505] border border-[#1A1A1A] rounded-xl px-12 py-4 focus:border-[#DFFF00] transition-all outline-none font-medium"
                              placeholder="••••••••"
                            />
                          </div>
                        </div>

                        {authError && (
                          <motion.div 
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[10px] font-bold uppercase tracking-widest"
                          >
                            ERROR_REPORT: {authError}
                          </motion.div>
                        )}

                        <button className="w-full bg-[#DFFF00] text-black font-bold py-5 rounded-2xl hover:shadow-[0_0_20px_#DFFF00]/20 active:scale-95 transition-all mt-4 tracking-[0.2em] text-xs">
                          {authMode === 'email-login' ? 'GRANT ACCESS' : 'CREATE INSTANCE'}
                        </button>
                      </form>

                      <div className="mt-10 text-center">
                        <button 
                          onClick={() => setAuthMode(authMode === 'email-login' ? 'email-signup' : 'email-login')}
                          className="text-[10px] text-neutral-500 hover:text-[#DFFF00] uppercase tracking-widest font-bold transition-colors"
                        >
                          {authMode === 'email-login' ? "New Operator? Initialize Profile" : "Existing Member? Authenticate"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'FEED' && (
                  <Dashboard 
                    profile={profile!} 
                    googleAccessToken={googleAccessToken}
                    onConnectDrive={handleConnectDrive}
                    onProfileUpdate={(p) => setProfile(p)}
                    onTabChange={setActiveTab}
                  />
                )}

                {activeTab === 'HISTORY' && (
                  <History 
                    profile={profile!} 
                    onBack={() => setActiveTab('FEED')} 
                  />
                )}

                {activeTab === 'PROFILE' && (
                  <Profile 
                    profile={profile!}
                    googleAccessToken={googleAccessToken}
                    onLogout={handleLogout}
                    onConnectDrive={handleConnectDrive}
                    onDisconnectDrive={handleDisconnectDrive}
                    sheetLoading={sheetLoading || isAuthInProgress}
                  />
                )}
                
                {/* Still keep modal for desktop trigger if requested, but tabs are primary for mobile */}
                <ProfileModal 
                  profile={profile!}
                  isOpen={isProfileModalOpen}
                  onClose={() => setIsProfileModalOpen(false)}
                  onUpdate={(p) => setProfile(p)}
                  googleAccessToken={googleAccessToken}
                  onConnectDrive={handleConnectDrive}
                  onDisconnectDrive={handleDisconnectDrive}
                  sheetLoading={sheetLoading}
                  sheetError={sheetError}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
