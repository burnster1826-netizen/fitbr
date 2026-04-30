import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../types';
import { LogOut, User, Settings, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface UserNavProps {
  profile: UserProfile;
  onLogout: () => void;
  onOpenProfile: () => void;
}

export default function UserNav({ profile, onLogout, onOpenProfile }: UserNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-3 p-2 pr-4 rounded-full transition-all border",
          isOpen 
            ? "bg-[#DFFF00] border-[#DFFF00] text-black" 
            : "bg-[#1A1A1A] border-[#2A2A2A] text-white hover:bg-[#252525]"
        )}
      >
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs",
          isOpen ? "bg-black text-[#DFFF00]" : "bg-[#DFFF00] text-black"
        )}>
          {profile.displayName.charAt(0).toUpperCase()}
        </div>
        <div className="text-left hidden sm:block">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Operator</p>
          <p className="text-xs font-medium truncate max-w-[100px]">{profile.displayName}</p>
        </div>
        <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-3 w-56 bg-[#121212] border border-[#1A1A1A] rounded-2xl shadow-2xl overflow-hidden z-50 px-2 py-2"
          >
            <div className="px-4 py-3 border-b border-[#1A1A1A] mb-1">
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.2em] mb-1">Session Active</p>
              <p className="text-xs font-medium truncate">{profile.email}</p>
            </div>
            
            <button
              onClick={() => {
                onOpenProfile();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-neutral-400 hover:text-[#DFFF00] hover:bg-[#DFFF00]/5 rounded-xl transition-all group"
            >
              <Settings className="w-4 h-4 transition-transform group-hover:rotate-45" />
              <span>System Profile</span>
            </button>

            <div className="h-px bg-[#1A1A1A] my-1 mx-2" />

            <button
              onClick={() => {
                onLogout();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-500/5 rounded-xl transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>Terminate Session</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
