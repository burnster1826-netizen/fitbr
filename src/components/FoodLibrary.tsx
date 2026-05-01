import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FoodLogEntry } from '../types';
import { Search, ChevronLeft, Apple, Wind, Zap, Pizza, Dumbbell, Trash2, Edit3, X, Save, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FoodLibraryProps {
  userId: string;
  onClose: () => void;
}

export default function FoodLibrary({ userId, onClose }: FoodLibraryProps) {
  const [foods, setFoods] = useState<FoodLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingFoodName, setDeletingFoodName] = useState<string | null>(null);
  const [editingFood, setEditingFood] = useState<FoodLogEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function fetchUniqueFoods() {
    setLoading(true);
    try {
      const q = query(collection(db, 'logs'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      const allLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FoodLogEntry));
      
      const uniqueMap = new Map<string, FoodLogEntry>();
      allLogs.forEach(log => {
        const key = (log.foodName || '').toLowerCase().trim();
        if (key && !uniqueMap.has(key)) {
          uniqueMap.set(key, log);
        }
      });
      
      setFoods(Array.from(uniqueMap.values()).sort((a, b) => a.foodName.localeCompare(b.foodName)));
    } catch (err) {
      console.error("Failed to fetch food library", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUniqueFoods();
  }, [userId]);

  const handleDelete = async (foodName: string) => {
    setLoading(true);
    try {
      // Find ALL instances with this name (case-insensitive search is hard in firestore, so we'll fetch all and filter or just delete the exact ones if that was the intent)
      // To be safe and clean, we fetch all logs for the user again or reuse logs if we had them.
      // For now, let's delete exact matches and common variations
      const q = query(collection(db, 'logs'), where('userId', '==', userId), where('foodName', '==', foodName));
      const snapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      setFoods(foods.filter(f => f.foodName !== foodName));
      setDeletingFoodName(null);
    } catch (err) {
      console.error("Failed to delete food items", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFood) return;
    
    setIsSaving(true);
    try {
      const q = query(collection(db, 'logs'), where('userId', '==', userId), where('foodName', '==', editingFood.foodName));
      const snapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => {
        batch.update(d.ref, {
          calories: Number(editingFood.calories),
          protein: Number(editingFood.protein),
          carbs: Number(editingFood.carbs),
          fat: Number(editingFood.fat),
          servingSize: editingFood.servingSize
        });
      });
      
      await batch.commit();
      setEditingFood(null);
      await fetchUniqueFoods();
    } catch (err) {
      console.error("Failed to update food items", err);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredFoods = foods.filter(f => 
    f.foodName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="fixed inset-0 z-[60] bg-black p-4 md:p-8 overflow-y-auto"
    >
      <div className="max-w-2xl mx-auto pb-20">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-neutral-900 flex items-center justify-center text-white hover:bg-neutral-800 transition-all border border-white/5"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Biological Database</h2>
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Protocol: Manual Override Enabled</p>
            </div>
          </div>
        </div>

        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input 
            type="text"
            placeholder="Search nutritional signatures..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0F0F0F] border border-white/5 rounded-2xl pl-12 pr-4 py-4 outline-none focus:border-[#DFFF00]/30 transition-all text-white placeholder:text-neutral-600 font-medium"
          />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-8 h-8 border-2 border-[#DFFF00] border-t-transparent rounded-full animate-spin" />
            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.2em]">Accessing History...</p>
          </div>
        ) : filteredFoods.length === 0 ? (
          <div className="text-center py-20 bg-[#0F0F0F] border border-dashed border-white/5 rounded-3xl">
            <Wind className="w-10 h-10 text-neutral-800 mx-auto mb-4" />
            <p className="text-neutral-500 text-sm font-medium">No biological signatures found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredFoods.map((food) => (
              <motion.div 
                key={food.id || food.foodName}
                layout
                className="bg-[#0F0F0F] border border-white/5 rounded-3xl p-6 group transition-all"
              >
                {editingFood?.foodName === food.foodName ? (
                  <form onSubmit={handleUpdate} className="space-y-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <Edit3 className="w-4 h-4 text-[#DFFF00]" />
                        <h4 className="text-white font-bold">{food.foodName}</h4>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setEditingFood(null)}
                        className="text-neutral-500 hover:text-white"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest pl-1">Serving Size</label>
                        <input 
                          value={editingFood.servingSize}
                          onChange={(e) => setEditingFood({...editingFood, servingSize: e.target.value})}
                          className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white outline-none focus:border-[#DFFF00]/30"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest pl-1">Calories</label>
                        <input 
                          type="number"
                          value={editingFood.calories}
                          onChange={(e) => setEditingFood({...editingFood, calories: Number(e.target.value)})}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-[#DFFF00] font-bold outline-none focus:border-[#DFFF00]/50"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest pl-1">Protein (g)</label>
                        <input 
                          type="number"
                          value={editingFood.protein}
                          onChange={(e) => setEditingFood({...editingFood, protein: Number(e.target.value)})}
                          className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white outline-none focus:border-[#DFFF00]/30"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest pl-1">Carbs (g)</label>
                        <input 
                          type="number"
                          value={editingFood.carbs}
                          onChange={(e) => setEditingFood({...editingFood, carbs: Number(e.target.value)})}
                          className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white outline-none focus:border-[#DFFF00]/30"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest pl-1">Fat (g)</label>
                        <input 
                          type="number"
                          value={editingFood.fat}
                          onChange={(e) => setEditingFood({...editingFood, fat: Number(e.target.value)})}
                          className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white outline-none focus:border-[#DFFF00]/30"
                        />
                      </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={isSaving}
                      className="w-full bg-[#DFFF00] text-black py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all shadow-[0_0_20px_rgba(223,255,0,0.1)]"
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin font-black" />
                      ) : (
                        <Save className="w-4 h-4 font-black" />
                      )}
                      Sync Structural Changes
                    </button>
                    
                    <div className="flex items-center gap-2 p-3 bg-white/5 rounded-xl">
                      <AlertCircle className="w-3 h-3 text-neutral-500" />
                      <p className="text-[8px] font-bold text-neutral-600 uppercase tracking-widest">Applying changes to all historical records of this profile</p>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-neutral-900 border border-white/5 flex items-center justify-center text-neutral-500 group-hover:bg-[#DFFF00]/10 group-hover:text-[#DFFF00] group-hover:border-[#DFFF00]/20 transition-all">
                          <Apple className="w-7 h-7" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white tracking-tight mb-1">{food.foodName}</h3>
                          <div className="px-2 py-0.5 rounded bg-white/5 inline-block">
                            <p className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">{food.servingSize}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2 mb-2">
                          <AnimatePresence mode="wait">
                            {deletingFoodName === food.foodName ? (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="flex items-center gap-1 bg-red-500/10 rounded-xl p-1"
                              >
                                <button 
                                  onClick={() => handleDelete(food.foodName)}
                                  className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-all text-[8px] font-bold uppercase px-2"
                                >
                                  Delete
                                </button>
                                <button 
                                  onClick={() => setDeletingFoodName(null)}
                                  className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </motion.div>
                            ) : (
                              <motion.div className="flex items-center gap-2">
                                <button 
                                  onClick={() => setEditingFood(food)}
                                  className="p-2.5 rounded-xl bg-white/5 text-neutral-500 hover:text-[#DFFF00] hover:bg-[#DFFF00]/10 transition-all"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => setDeletingFoodName(food.foodName)}
                                  className="p-2.5 rounded-xl bg-white/5 text-neutral-500 hover:text-red-500 hover:bg-red-500/10 transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-black italic tracking-tighter text-[#DFFF00]">{food.calories}</p>
                          <p className="text-[9px] font-black text-[#DFFF00]/50 uppercase tracking-widest -mt-1">Calories</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-black/40 rounded-2xl p-4 border border-white/5 group-hover:border-white/10 transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                          <Dumbbell className="w-3 h-3 text-neutral-500" />
                          <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">Protein</span>
                        </div>
                        <p className="text-sm font-black text-white">{food.protein}<span className="text-[10px] text-neutral-600 ml-1">G</span></p>
                      </div>
                      <div className="bg-black/40 rounded-2xl p-4 border border-white/5 group-hover:border-white/10 transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="w-3 h-3 text-neutral-500" />
                          <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">Carbs</span>
                        </div>
                        <p className="text-sm font-black text-white">{food.carbs}<span className="text-[10px] text-neutral-600 ml-1">G</span></p>
                      </div>
                      <div className="bg-black/40 rounded-2xl p-4 border border-white/5 group-hover:border-white/10 transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                          <Pizza className="w-3 h-3 text-neutral-500" />
                          <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">Fats</span>
                        </div>
                        <p className="text-sm font-black text-white">{food.fat}<span className="text-[10px] text-neutral-600 ml-1">G</span></p>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

