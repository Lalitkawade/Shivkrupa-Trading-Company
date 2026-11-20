import React, { useState } from 'react';
import { 
  Building2, 
  Warehouse, 
  Database, 
  Sun, 
  Moon, 
  UserCheck, 
  ChevronDown, 
  Layers, 
  CheckCircle2, 
  Settings,
  Sparkles
} from 'lucide-react';
import { UserProfile, SupabaseConfig } from '../types';
import { AUTHORIZED_USERS } from '../services/storage';

interface HeaderProps {
  activeUser: UserProfile;
  onUserChange: (user: UserProfile) => void;
  supabaseConfig: SupabaseConfig;
  onOpenSupabaseModal: () => void;
  onOpenMasterModal: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeUser,
  onUserChange,
  supabaseConfig,
  onOpenSupabaseModal,
  onOpenMasterModal,
  theme,
  onToggleTheme
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  return (
    <header className="sticky top-0 z-40 px-4 pt-3 pb-2 transition-all">
      <div className="max-w-7xl mx-auto glass-panel px-4 py-3 sm:px-6 sm:py-3.5 flex items-center justify-between shadow-card">
        
        {/* Brand & Market Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-emerald-600 to-blue-600 flex items-center justify-center text-white shadow-sm font-black text-lg tracking-wider">
            SK
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-neutral-900 dark:text-white leading-tight">
                Shivkrupa Trading Co.
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                APMC Yard Live
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
              <span>Multi-Yard & Shed Stock Ledger</span>
              <span className="hidden md:inline text-neutral-300 dark:text-neutral-600">•</span>
              <span className="hidden md:inline">Grain & Commodity Trading</span>
            </p>
          </div>
        </div>

        {/* Right Action Bar (Apple / One UI controls) */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Supabase Status Pill */}
          <button
            id="btn-supabase-status"
            onClick={onOpenSupabaseModal}
            title={supabaseConfig.isConnected ? "Supabase Cloud Database Connected" : "Local Storage Mode - Click to connect Supabase"}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
          >
            <Database className={`w-3.5 h-3.5 ${supabaseConfig.isConnected ? 'text-emerald-500' : 'text-amber-500'}`} />
            <span>{supabaseConfig.isConnected ? 'Supabase Live' : 'Local DB'}</span>
            <span className={`w-2 h-2 rounded-full ${supabaseConfig.isConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
          </button>

          {/* Master Setup Button */}
          <button
            id="btn-masters-setup"
            onClick={onOpenMasterModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
            title="Manage Yards, Materials & Parties"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Masters</span>
          </button>

          {/* Theme Toggle */}
          <button
            id="btn-theme-toggle"
            onClick={onToggleTheme}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-neutral-600" />}
          </button>

          {/* Active User Switcher (The 3 Equal Users) */}
          <div className="relative">
            <button
              id="btn-user-switcher"
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800/80 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-200/60 dark:border-neutral-700/60 transition shadow-sm"
            >
              <div 
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm"
                style={{ backgroundColor: activeUser.color }}
              >
                {activeUser.avatar_initials}
              </div>
              <div className="text-left hidden lg:block leading-tight">
                <p className="text-xs font-bold text-neutral-900 dark:text-white line-clamp-1">{activeUser.name.split(' ')[0]}</p>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400">{activeUser.role.split('/')[0]}</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
            </button>

            {/* Dropdown for quick switching between the 3 users */}
            {showUserDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-30" 
                  onClick={() => setShowUserDropdown(false)}
                />
                <div className="absolute right-0 mt-2 w-64 glass-panel-elevated p-2 z-40 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 border-b border-neutral-200 dark:border-neutral-800">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Select Portal Operator</p>
                    <p className="text-xs text-neutral-500 mt-0.5">All 3 accounts have full trading access</p>
                  </div>
                  <div className="py-1">
                    {AUTHORIZED_USERS.map(user => (
                      <button
                        key={user.id}
                        onClick={() => {
                          onUserChange(user);
                          setShowUserDropdown(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition ${
                          activeUser.id === user.id 
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold' 
                            : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div 
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                            style={{ backgroundColor: user.color }}
                          >
                            {user.avatar_initials}
                          </div>
                          <div>
                            <p className="font-semibold">{user.name}</p>
                            <p className="text-[10px] text-neutral-400">{user.role}</p>
                          </div>
                        </div>
                        {activeUser.id === user.id && <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

        </div>

      </div>
    </header>
  );
};
