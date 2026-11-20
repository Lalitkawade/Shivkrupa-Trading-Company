import React from 'react';
import { 
  LayoutDashboard, 
  Warehouse, 
  Users, 
  Download, 
  History, 
  Sun, 
  Moon, 
  X,
  Receipt,
  LogOut,
  Wheat,
  Database
} from 'lucide-react';
import type { UserProfile, SupabaseConfig, Yard, Party } from '../types';

export type NavTab = 'dashboard' | 'yards' | 'partners' | 'ledger' | 'expenses' | 'export';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  activeUser: UserProfile;
  onUserChange?: (user: UserProfile) => void;
  supabaseConfig?: SupabaseConfig;
  onOpenSupabaseModal?: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  yards: Yard[];
  parties: Party[];
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  activeUser,
  theme,
  onToggleTheme,
  yards,
  parties,
  mobileOpen,
  onCloseMobile,
  onLogout,
  supabaseConfig,
  onOpenSupabaseModal
}) => {
  const apmcShedsCount = yards.filter(y => y.type === 'apmc_shed').length;
  const personalYardsCount = yards.filter(y => y.type === 'personal_yard').length;
  const apmcSellersCount = parties.filter(p => p.type === 'apmc_seller').length;
  const buyerCompaniesCount = parties.filter(p => p.type === 'buyer_company').length;

  const navItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Dashboard',
      sublabel: 'Live Stock & Deals',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'yards' as NavTab,
      label: 'Stock Yards',
      sublabel: `${apmcShedsCount} Sheds • ${personalYardsCount} Godowns`,
      icon: Warehouse,
      badge: yards.length > 0 ? `${yards.length}` : null
    },
    {
      id: 'partners' as NavTab,
      label: 'Partners & Clients',
      sublabel: `${apmcSellersCount} Sellers • ${buyerCompaniesCount} Buyers`,
      icon: Users,
      badge: parties.length > 0 ? `${parties.length}` : null
    },
    {
      id: 'ledger' as NavTab,
      label: 'In/Out Ledger',
      sublabel: 'Audit Trail & Movements',
      icon: History,
      badge: null
    },
    {
      id: 'expenses' as NavTab,
      label: 'Market Fees & Expenses',
      sublabel: 'Hamali, Cess & Overheads',
      icon: Receipt,
      badge: null
    },
    {
      id: 'export' as NavTab,
      label: 'Export Data',
      sublabel: 'WhatsApp Reports & CSV',
      icon: Download,
      badge: null
    }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-md z-40 lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Executive Dark Command Sidebar */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 w-68 flex-shrink-0
        bg-[#0B132B] dark:bg-[#060a12]
        border-r border-slate-800/80
        text-slate-100
        flex flex-col justify-between
        transition-all duration-300 ease-in-out font-sans
        lg:static lg:translate-x-0
        ${mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
      `}>
        
        {/* Brand Header */}
        <div className="p-5 pb-4 border-b border-slate-800/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-lg shadow-emerald-500/25 flex items-center justify-center text-white flex-shrink-0">
                <Wheat className="w-5 h-5 text-white stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-white tracking-tight truncate">
                  Shivkrupa Trading
                </h1>
                <p className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>APMC Grain Portal</span>
                </p>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button 
              onClick={onCloseMobile}
              className="lg:hidden w-7 h-7 rounded-full flex items-center justify-center bg-slate-800 text-slate-400 hover:text-white transition"
              aria-label="Close Sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-3 space-y-1.5 flex-1 overflow-y-auto no-scrollbar">
          <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Navigation
          </div>

          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
                className={`
                  w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-left 
                  transition-all duration-200 group cursor-pointer
                  ${isActive 
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-900/40 font-bold' 
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                  }
                `}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`
                    w-7 h-7 rounded-xl flex items-center justify-center transition-colors flex-shrink-0
                    ${isActive 
                      ? 'bg-white/20 text-white' 
                      : 'text-slate-400 group-hover:text-emerald-400 bg-slate-800/60'
                    }
                  `}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p className={`text-xs ${isActive ? 'font-bold' : 'font-semibold'}`}>
                      {item.label}
                    </p>
                    <p className={`text-[10px] truncate ${isActive ? 'text-emerald-100' : 'text-slate-400 group-hover:text-slate-300'}`}>
                      {item.sublabel}
                    </p>
                  </div>
                </div>

                {item.badge && (
                  <span className={`
                    px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0
                    ${isActive 
                      ? 'bg-white/25 text-white' 
                      : 'bg-slate-800 text-slate-300 border border-slate-700/60'
                    }
                  `}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom User Profile & Apple/Samsung Segmented Controls */}
        <div className="p-3 border-t border-slate-800/80 space-y-2.5 bg-[#070d1e]/90">
          
          {/* Cloud Database Status */}
          {onOpenSupabaseModal && (
            <button
              onClick={onOpenSupabaseModal}
              className="w-full p-2 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between text-[11px] text-slate-300 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Database className={`w-3.5 h-3.5 ${supabaseConfig?.isConnected ? 'text-emerald-400' : 'text-amber-400'}`} />
                <span className="font-semibold">{supabaseConfig?.isConnected ? 'Supabase Live' : 'Local Storage Mode'}</span>
              </div>
              <span className={`w-2 h-2 rounded-full ${supabaseConfig?.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
            </button>
          )}

          {/* Integrated User Profile Card with Inline Sign Out */}
          <div className="p-2.5 rounded-2xl bg-slate-800/90 border border-slate-700/60 shadow-sm flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shadow-xs flex-shrink-0"
                style={{ backgroundColor: activeUser.color || '#059669' }}
              >
                {activeUser.avatar_initials}
              </div>
              <div className="min-w-0 text-left">
                <p className="text-xs font-bold text-white truncate leading-tight">
                  {activeUser.name}
                </p>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">
                  {activeUser.email || activeUser.role}
                </p>
              </div>
            </div>

            {onLogout && (
              <button
                onClick={onLogout}
                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 transition-colors flex-shrink-0 cursor-pointer"
                title="Log Out (लॉग आऊट)"
                aria-label="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Segmented Theme Switcher */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] font-semibold">
            <button
              onClick={() => theme !== 'light' && onToggleTheme()}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                theme === 'light'
                  ? 'bg-white text-slate-900 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>Light</span>
            </button>
            <button
              onClick={() => theme !== 'dark' && onToggleTheme()}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                theme === 'dark'
                  ? 'bg-slate-800 text-white font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Moon className="w-3.5 h-3.5 text-slate-400" />
              <span>Dark</span>
            </button>
          </div>

        </div>

      </aside>
    </>
  );
};
