import React, { useState, useRef, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs, limit } from 'firebase/firestore';
import { lookupFood, analyzeImage, FoodNutrition } from '../services/geminiService';
import { syncDailyTotals } from '../services/googleSheetsService';
import { Sparkles, Send, Loader2, Check, X, Camera, Search, HelpCircle, Scale, Database, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

interface LogEntryFormProps {
  userId: string;
  googleAccessToken: string | null;
  sheetId?: string;
  selectedDate?: string;
}

type Step = 'IDLE' | 'SUGGESTIONS' | 'QUANTITY' | 'OPTIONS' | 'CONFIRM' | 'MANUAL';

export default function LogEntryForm({ userId, googleAccessToken, sheetId, selectedDate }: LogEntryFormProps) {
  const [step, setStep] = useState<Step>('IDLE');
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<FoodNutrition[]>([]);
  const [selectedItem, setSelectedItem] = useState<FoodNutrition | null>(null);
  const [quantity, setQuantity] = useState('100'); 
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<FoodNutrition[]>([]);
  const [baseResults, setBaseResults] = useState<FoodNutrition[]>([]);
  const [manualEntry, setManualEntry] = useState<FoodNutrition>({
    foodName: '',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    servingSize: '100g'
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleQuantityChange = (idx: number, newQuantity: string) => {
    const base = baseResults[idx];
    if (!base) return;

    const val = parseFloat(newQuantity) || 0;
    const baseQtyMatch = base.servingSize.match(/(\d+(\.\d+)?)/);
    const baseQty = baseQtyMatch ? parseFloat(baseQtyMatch[1]) : 100;

    const factor = val / baseQty;

    const updated = [...results];
    updated[idx] = {
      ...base,
      calories: Math.round(base.calories * factor),
      protein: Math.round(base.protein * factor),
      carbs: Math.round(base.carbs * factor),
      fat: Math.round(base.fat * factor),
      servingSize: `${val}${base.servingSize.replace(/[0-9.]/g, '') || 'g'}`
    };
    setResults(updated);
  };

  // Step 1: Real-time suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (input.length < 2 || step !== 'IDLE') {
        setSuggestions([]);
        return;
      }

      // Firestore prefix search (case-sensitive)
      const searchTerm = input.toLowerCase().trim();
      const q = query(
        collection(db, 'library'),
        where('userId', '==', userId),
        where('foodName', '>=', searchTerm),
        where('foodName', '<=', searchTerm + '\uf8ff'),
        limit(5)
      );

      try {
        const snap = await getDocs(q);
        const res = snap.docs.map(doc => doc.data() as FoodNutrition);
        setSuggestions(res);
      } catch (err) {
        console.error("Suggestion fetch failed", err);
      }
    };

    const timer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timer);
  }, [input, step]);

  const handleSelectSuggestion = (item: FoodNutrition) => {
    setSelectedItem(item);
    setStep('QUANTITY');
    setSuggestions([]);
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    setLoading(true);
    try {
      const searchTerm = input.toLowerCase().trim();
      const q = query(
        collection(db, 'library'), 
        where('userId', '==', userId),
        where('foodName', '==', searchTerm), 
        limit(1)
      );
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        handleSelectSuggestion(snap.docs[0].data() as FoodNutrition);
      } else {
        setStep('OPTIONS');
      }
    } catch (err) {
      setStep('OPTIONS');
    } finally {
      setLoading(false);
    }
  };

  const handleManualConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setResults([manualEntry]);
    setBaseResults([manualEntry]);
    setStep('CONFIRM');
  };

  const calculateAndConfirm = () => {
    if (!selectedItem) return;
    const factor = parseFloat(quantity) / 100;
    const calculated: FoodNutrition = {
      ...selectedItem,
      calories: Math.round(selectedItem.calories * factor),
      protein: Math.round(selectedItem.protein * factor),
      carbs: Math.round(selectedItem.carbs * factor),
      fat: Math.round(selectedItem.fat * factor),
      servingSize: `${quantity}g`
    };
    setResults([calculated]);
    setStep('CONFIRM');
  };

  const handleAIEstimate = async () => {
    setLoading(true);
    setStep('IDLE');
    try {
      const res = await lookupFood(input);
      setBaseResults(res);
      setResults(res);
      setStep('CONFIRM');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setStep('IDLE');
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Content = (reader.result as string).split(',')[1];
        const res = await analyzeImage(base64Content, file.type);
        setBaseResults(res);
        setResults(res);
        setStep('CONFIRM');
        setLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Image analysis failed", err);
      setLoading(false);
    }
  };

  const finalizeLog = async (entry: FoodNutrition) => {
    try {
      const logDate = selectedDate || format(new Date(), 'yyyy-MM-dd');
      await addDoc(collection(db, 'logs'), {
        userId,
        ...entry,
        timestamp: Date.now(),
        dateStr: logDate
      });

      const libQuery = query(
        collection(db, 'library'), 
        where('userId', '==', userId),
        where('foodName', '==', entry.foodName.toLowerCase().trim()), 
        limit(1)
      );
      const libSnap = await getDocs(libQuery);
      if (libSnap.empty) {
        await addDoc(collection(db, 'library'), {
          ...entry,
          userId,
          foodName: entry.foodName.toLowerCase().trim()
        });
      } else {
        // Update existing library entry with latest nutrition if it changed
        const libDoc = libSnap.docs[0];
        const existingData = libDoc.data();
        if (existingData.calories !== entry.calories) {
          const { doc, updateDoc } = await import('firebase/firestore');
          await updateDoc(libDoc.ref, {
            ...entry,
            foodName: entry.foodName.toLowerCase().trim()
          });
        }
      }

      // Step 6: Sync to Google Sheets if connected
      if (googleAccessToken && sheetId) {
        try {
          const dateStr = selectedDate || format(new Date(), 'yyyy-MM-dd');
          await syncDailyTotals(userId, dateStr, googleAccessToken, sheetId);
        } catch (sheetErr) {
          console.error("Google Sheets sync failed:", sheetErr);
        }
      }

      setResults(prev => prev.filter(p => p !== entry));
      if (results.length <= 1) {
        resetForm();
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'logs');
    }
  };

  const resetForm = () => {
    setStep('IDLE');
    setInput('');
    setSelectedItem(null);
    setResults([]);
    setSuggestions([]);
    setQuantity('100');
  };

  return (
    <div className="space-y-4 relative">
      {/* Loading Overlay with Scanning Effect */}
      <AnimatePresence>
        {loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/60 backdrop-blur-md rounded-[2rem] flex flex-col items-center justify-center border border-[#DFFF00]/20 overflow-hidden"
          >
            <motion.div 
              initial={{ top: '-10%' }}
              animate={{ top: '110%' }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="absolute left-0 right-0 h-1 bg-[#DFFF00] shadow-[0_0_20px_#DFFF00] z-10"
            />
            <div className="relative">
              <Loader2 className="w-12 h-12 text-[#DFFF00] animate-spin mb-4" />
              <motion.div 
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-[#DFFF00]/20 blur-xl rounded-full"
              />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#DFFF00] animate-pulse">Analyzing Biological Fuel</p>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSearchSubmit} className="relative group bg-[#DFFF00] rounded-[2rem] p-6 shadow-2xl shadow-[#DFFF00]/10">
        {/* Decorative corner accents */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-black/10 rounded-tl-[2rem]" />
        
        <div className="flex justify-between items-center mb-4 ml-2 relative z-10">
          <div className="flex items-center gap-3">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/60">Identify Fuel</h3>
            <div className="flex gap-1">
              {['IDLE', 'OPTIONS', 'CONFIRM'].map((s, i) => (
                <div key={i} className={cn(
                  "w-2 h-0.5 rounded-full transition-all duration-500",
                  (step === 'IDLE' && i === 0) || (step !== 'IDLE' && step !== 'CONFIRM' && i === 1) || (step === 'CONFIRM' && i === 2)
                    ? "bg-black w-4"
                    : "bg-black/20"
                )} />
              ))}
            </div>
          </div>
          {step !== 'IDLE' && (
            <button type="button" onClick={resetForm} className="p-1 hover:bg-black/10 rounded-full transition-colors">
              <X className="w-4 h-4 text-black" />
            </button>
          )}
        </div>
        
        <div className="relative flex items-center bg-white/20 rounded-2xl p-5 border border-black/10 focus-within:bg-white/30 truncate transition-all z-10">
          <Search className="w-5 h-5 mr-3 text-black/40 shrink-0" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={step !== 'IDLE' || loading}
            placeholder="Search biological database..."
            className="bg-transparent border-none outline-none text-black placeholder-black/40 flex-1 font-bold text-sm sm:text-base pr-20 focus:scale-[1.01] transition-transform"
          />
          <button
            type="submit"
            disabled={loading || !input.trim() || step !== 'IDLE'}
            className="absolute right-2 bg-black text-white px-6 py-3.5 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 shadow-lg min-h-[48px]"
          >
            VERIFY
          </button>
        </div>

        <AnimatePresence>
          {suggestions.length > 0 && (
            <motion.div 
               initial={{ opacity: 0, y: 10, scale: 0.95 }}
               animate={{ opacity: 1, y: 0, scale: 1 }}
               exit={{ opacity: 0, y: 10, scale: 0.95 }}
               className="absolute left-0 right-0 top-[calc(100%+0.5rem)] bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl p-2 z-[100] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden"
            >
              <div className="px-3 py-2 mb-1 border-b border-white/5">
                <p className="text-[8px] font-bold text-neutral-500 uppercase tracking-[0.2em]">Local Cache Matches</p>
              </div>
              <div className="max-h-[240px] overflow-y-auto custom-scrollbar">
                {suggestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSuggestion(item)}
                    className="w-full text-left px-3 py-3.5 hover:bg-[#DFFF00] hover:text-black rounded-xl transition-all flex justify-between items-center group mb-1 last:mb-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-black/10">
                        <Database className="w-3.5 h-3.5 text-[#DFFF00] group-hover:text-black" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold capitalize tracking-tight">{item.foodName}</span>
                        <span className="text-[9px] opacity-60 font-medium">{item.calories} kcal / serving</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Select</span>
                      <Check className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      <AnimatePresence mode="wait">
        {step === 'QUANTITY' && (
          <motion.div
            key="quantity"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-8 bg-[#0F0F0F] border border-[#1A1A1A] rounded-[2rem] space-y-6"
          >
            <div className="flex items-center gap-3">
              <Scale className="w-5 h-5 text-[#DFFF00]" />
              <div>
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-[0.2em]">Quantity for</p>
                <p className="text-lg font-bold capitalize">{selectedItem?.foodName}</p>
              </div>
            </div>
            <div className="flex gap-4">
              <input 
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="flex-1 bg-[#050505] border border-[#1A1A1A] rounded-2xl p-4 text-white focus:border-[#DFFF00] outline-none"
                placeholder="Amount (grams)"
              />
              <button 
                onClick={calculateAndConfirm}
                className="bg-[#DFFF00] text-black px-8 rounded-2xl font-bold uppercase text-xs tracking-widest hover:scale-105 transition-all"
              >
                Calc
              </button>
            </div>
          </motion.div>
        )}

        {step === 'OPTIONS' && (
          <motion.div
            key="options"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-8 bg-[#0F0F0F] border border-orange-500/20 rounded-[2rem] space-y-6"
          >
            <div className="flex items-center gap-3">
              <HelpCircle className="w-5 h-5 text-orange-500" />
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-[0.2em]">Protocol mismatch. Initialize:</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button onClick={handleAIEstimate} className="flex flex-col items-start p-5 bg-[#050505] border border-[#1A1A1A] rounded-2xl hover:border-[#DFFF00]/50 transition-all group">
                <Sparkles className="w-5 h-5 text-[#DFFF00] mb-3" />
                <span className="font-bold text-sm tracking-tight text-[#F5F5F5]">AI Estimation</span>
                <span className="text-[10px] text-neutral-500 uppercase tracking-widest mt-1">Simulate profile</span>
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-start p-5 bg-[#050505] border border-[#1A1A1A] rounded-2xl hover:border-[#DFFF00]/50 transition-all group">
                <Camera className="w-5 h-5 text-[#DFFF00] mb-3" />
                <span className="font-bold text-sm tracking-tight text-[#F5F5F5]">Extract Label</span>
                <span className="text-[10px] text-neutral-500 uppercase tracking-widest mt-1">Photo analysis</span>
              </button>
              <button 
                onClick={() => {
                  setManualEntry({
                    foodName: input || '',
                    calories: 0,
                    protein: 0,
                    carbs: 0,
                    fat: 0,
                    servingSize: '100g'
                  });
                  setStep('MANUAL');
                }} 
                className="flex flex-col items-start p-5 bg-[#050505] border border-[#1A1A1A] rounded-2xl hover:border-[#DFFF00]/50 transition-all group"
              >
                <Edit3 className="w-5 h-5 text-[#DFFF00] mb-3" />
                <span className="font-bold text-sm tracking-tight text-[#F5F5F5]">Manual Entry</span>
                <span className="text-[10px] text-neutral-500 uppercase tracking-widest mt-1">Define data</span>
              </button>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
          </motion.div>
        )}

        {step === 'MANUAL' && (
          <motion.div
            key="manual"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-8 bg-[#0F0F0F] border border-white/10 rounded-[2rem] space-y-6 shadow-2xl"
          >
            <div className="flex justify-between items-center">
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.2em]">Manual Biological Override</p>
              <button onClick={resetForm} className="text-neutral-500 hover:text-[#F5F5F5] transition-colors"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleManualConfirm} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest ml-1">Biological Identity</label>
                <input 
                  required
                  value={manualEntry.foodName}
                  onChange={(e) => setManualEntry({...manualEntry, foodName: e.target.value})}
                  placeholder="Enter food name..."
                  className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-white outline-none focus:border-[#DFFF00]/30 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest ml-1">Energy (kcal)</label>
                  <input 
                    type="number"
                    required
                    value={manualEntry.calories || ''}
                    onChange={(e) => setManualEntry({...manualEntry, calories: Number(e.target.value)})}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-[#DFFF00] font-bold outline-none focus:border-[#DFFF00]/30 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest ml-1">Serving Unit</label>
                  <input 
                    required
                    value={manualEntry.servingSize}
                    onChange={(e) => setManualEntry({...manualEntry, servingSize: e.target.value})}
                    placeholder="e.g. 100g, 1 cup"
                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-white outline-none focus:border-[#DFFF00]/30 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest ml-1">Protein (g)</label>
                  <input 
                    type="number"
                    required
                    value={manualEntry.protein || ''}
                    onChange={(e) => setManualEntry({...manualEntry, protein: Number(e.target.value)})}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-4 py-3.5 text-white outline-none focus:border-[#DFFF00]/30 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest ml-1">Carbs (g)</label>
                  <input 
                    type="number"
                    required
                    value={manualEntry.carbs || ''}
                    onChange={(e) => setManualEntry({...manualEntry, carbs: Number(e.target.value)})}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-4 py-3.5 text-white outline-none focus:border-[#DFFF00]/30 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest ml-1">Fat (g)</label>
                  <input 
                    type="number"
                    required
                    value={manualEntry.fat || ''}
                    onChange={(e) => setManualEntry({...manualEntry, fat: Number(e.target.value)})}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-4 py-3.5 text-white outline-none focus:border-[#DFFF00]/30 transition-all"
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-[#DFFF00] text-black py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-[0_10px_30px_rgba(223,255,0,0.1)] hover:scale-[1.02] active:scale-95 transition-all mt-4"
              >
                Inject Nutritional Profile
              </button>
            </form>
          </motion.div>
        )}

        {step === 'CONFIRM' && results.length > 0 && (
          <motion.div
            key="results"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-8 bg-[#0F0F0F] border border-[#DFFF00]/20 rounded-[2rem] space-y-6 shadow-2xl"
          >
            <div className="flex justify-between items-center">
              <p className="text-[10px] font-bold text-[#DFFF00] uppercase tracking-[0.2em]">Confirm & Log Fuel</p>
              <button onClick={resetForm} className="text-neutral-500 hover:text-[#F5F5F5] transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {results.map((entry, idx) => (
                <div key={idx} className="bg-[#050505] border border-[#1A1A1A] rounded-2xl p-5 flex flex-col gap-4 group/item hover:border-[#DFFF00]/20 transition-all">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 pr-4">
                      <h5 className="font-bold text-sm uppercase tracking-tight truncate text-white">{entry.foodName}</h5>
                      <div className="flex gap-2 mt-1">
                        <span className="text-[10px] font-bold text-[#DFFF00] bg-[#DFFF00]/10 px-2 py-0.5 rounded">
                          {entry.calories} kcal
                        </span>
                        <span className="text-[10px] font-bold text-neutral-500 uppercase">
                          P: {entry.protein}g • C: {entry.carbs}g • F: {entry.fat}g
                        </span>
                      </div>
                    </div>
                    <button onClick={() => finalizeLog(entry)} className="p-3 bg-[#DFFF00]/10 text-[#DFFF00] rounded-xl hover:bg-[#DFFF00] hover:text-black transition-all shrink-0">
                      <Check className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3 pt-3 border-t border-white/5">
                    <Scale className="w-3.5 h-3.5 text-neutral-500" />
                    <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">Adjust Quantity:</span>
                    <div className="flex-1 flex gap-2">
                      <input 
                        type="number"
                        value={entry.servingSize.match(/(\d+(\.\d+)?)/)?.[0] || ''}
                        onChange={(e) => handleQuantityChange(idx, e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[#DFFF00]/30 w-24"
                      />
                      <span className="text-[10px] font-bold text-neutral-600 self-center uppercase">
                        {entry.servingSize.replace(/[0-9.]/g, '') || 'grams'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
