import React, { useState, useEffect } from 'react';
import { 
  Menu, 
  Plus, 
  Minus, 
  ArrowRightLeft, 
  Database,
  Sun,
  Moon,
  ChevronDown,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { Sidebar, NavTab } from './components/Sidebar';
import { LiveStockBoard } from './components/LiveStockBoard';
import { StockYardsView } from './components/StockYardsView';
import { PartnersView } from './components/PartnersView';
import { LedgerHistory } from './components/LedgerHistory';
import { ExpensesView } from './components/ExpensesView';
import { ExportDataView } from './components/ExportDataView';
import { PurchaseInwardModal } from './components/PurchaseInwardModal';
import { YardShiftingModal } from './components/YardShiftingModal';
import { SaleOutwardModal } from './components/SaleOutwardModal';
import { MasterSetupModal } from './components/MasterSetupModal';
import { SupabaseModal } from './components/SupabaseModal';
import { AddChargeModal, AddChargeTarget } from './components/AddChargeModal';
import { LoginView } from './components/LoginView';
import { storage } from './services/storage';
import type { 
  Yard, 
  Material, 
  Party, 
  PartyType,
  Purchase, 
  Sale, 
  YardTransfer, 
  CurrentYardStock, 
  UserProfile, 
  SupabaseConfig,
  AuthSession
} from './types';

export function App() {
  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('shivkrupa_theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('shivkrupa_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Auth Session State
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => storage.getAuthSession());

  // Active User State
  const [activeUser, setActiveUser] = useState<UserProfile>(() => storage.getActiveUser());

  const handleUserChange = (user: UserProfile) => {
    setActiveUser(user);
    storage.setActiveUser(user);
  };

  const handleLogout = () => {
    storage.logout();
    setAuthSession(null);
  };

  // Main Navigation Tab
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Data State
  const [yards, setYards] = useState<Yard[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [transfers, setTransfers] = useState<YardTransfer[]>([]);
  const [stockMatrix, setStockMatrix] = useState<CurrentYardStock[]>([]);
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(() => storage.getSupabaseConfig());

  // Modals
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);
  const [isShiftOpen, setIsShiftOpen] = useState(false);
  const [isSaleOpen, setIsSaleOpen] = useState(false);
  const [isMasterOpen, setIsMasterOpen] = useState(false);
  const [isSupabaseOpen, setIsSupabaseOpen] = useState(false);
  const [isAddChargeOpen, setIsAddChargeOpen] = useState(false);
  const [selectedChargeTarget, setSelectedChargeTarget] = useState<AddChargeTarget | null>(null);

  const handleOpenAddCharge = (target: AddChargeTarget) => {
    setSelectedChargeTarget(target);
    setIsAddChargeOpen(true);
  };
  const [preselectedShift, setPreselectedShift] = useState<{ material_id?: string; from_yard_id?: string } | undefined>(undefined);
  const [preselectedSellerId, setPreselectedSellerId] = useState<string | undefined>(undefined);
  const [preselectedBuyerId, setPreselectedBuyerId] = useState<string | undefined>(undefined);
  const [preselectedBrokerId, setPreselectedBrokerId] = useState<string | undefined>(undefined);
  const [masterInitialTab, setMasterInitialTab] = useState<'yards' | 'materials' | 'parties'>('yards');
  const [masterInitialPartyType, setMasterInitialPartyType] = useState<PartyType>('apmc_seller');

  const [isSyncing, setIsSyncing] = useState(false);

  // Reload all data
  const refreshData = () => {
    setYards(storage.getYards());
    setMaterials(storage.getMaterials());
    setParties(storage.getParties());
    setPurchases(storage.getPurchases());
    setSales(storage.getSales());
    setTransfers(storage.getYardTransfers());
    setStockMatrix(storage.getLiveStockMatrix());
    setSupabaseConfig(storage.getSupabaseConfig());
  };

  const handleCloudSync = async () => {
    if (!storage.isSupabaseConnected()) return;
    setIsSyncing(true);
    try {
      await storage.syncWithSupabase();
      refreshData();
    } catch (e) {
      console.error('Cloud sync error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    refreshData();
    if (storage.isSupabaseConnected()) {
      handleCloudSync();
    }
  }, []);

  const handleOpenShift = (preselected?: { material_id?: string; from_yard_id?: string }) => {
    setPreselectedShift(preselected);
    setIsShiftOpen(true);
  };

  // Guard: If not logged in, render the Login Screen
  if (!authSession) {
    return (
      <LoginView
        onLoginSuccess={(session) => {
          setAuthSession(session);
          setActiveUser(session.user);
          refreshData();
        }}
      />
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100/90 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200 font-sans">
      
      {/* 1. Left Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        activeUser={activeUser}
        onUserChange={handleUserChange}
        supabaseConfig={supabaseConfig}
        onOpenSupabaseModal={() => setIsSupabaseOpen(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
        yards={yards}
        parties={parties}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onLogout={handleLogout}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-100/90 dark:bg-slate-950">
        
        {/* Top Frosted Navigation Header (Fully Mobile Responsive) */}
        <header className="h-16 px-3 sm:px-6 md:px-8 border-b border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl flex items-center justify-between flex-shrink-0 z-30 transition-colors shadow-xs gap-2">
          
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer flex-shrink-0"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb / Title */}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="hidden md:inline text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Shivkrupa
                </span>
                <span className="hidden md:inline text-slate-300 dark:text-slate-600">/</span>
                <h1 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
                  {currentTab === 'yards' ? (
                    <>
                      <span className="sm:hidden">Yards</span>
                      <span className="hidden sm:inline">Stock Yards & Sheds</span>
                    </>
                  ) : currentTab === 'partners' ? (
                    <>
                      <span className="sm:hidden">Partners</span>
                      <span className="hidden sm:inline">Partners & Clients</span>
                    </>
                  ) : currentTab === 'ledger' ? (
                    <>
                      <span className="sm:hidden">Ledger</span>
                      <span className="hidden sm:inline">In/Out Ledger</span>
                    </>
                  ) : currentTab === 'expenses' ? (
                    <>
                      <span className="sm:hidden">Expenses</span>
                      <span className="hidden sm:inline">Market Fees & Operating Expenses</span>
                    </>
                  ) : currentTab === 'export' ? (
                    <>
                      <span className="sm:hidden">Export</span>
                      <span className="hidden sm:inline">Export Data Hub</span>
                    </>
                  ) : (
                    <>
                      <span className="sm:hidden">Dashboard</span>
                      <span className="hidden sm:inline">Live Dashboard</span>
                    </>
                  )}
                </h1>
                <span className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 flex-shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live APMC Mandi
                </span>
              </div>
            </div>
          </div>

          {/* Quick Header Action Pills */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
            {/* On non-dashboard tabs, show quick deal buttons on desktop/tablet */}
            {currentTab !== 'dashboard' && (
              <>
                <button
                  id="btn-header-stock-in"
                  onClick={() => setIsPurchaseOpen(true)}
                  className="hidden sm:inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full font-semibold text-xs text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm shadow-emerald-500/20 transition active:scale-95 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Stock In</span>
                </button>

                <button
                  id="btn-header-shift-stock"
                  onClick={() => handleOpenShift()}
                  className="hidden md:inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full font-semibold text-xs text-white bg-slate-900 hover:bg-black dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Shift</span>
                </button>

                <button
                  id="btn-header-stock-out"
                  onClick={() => setIsSaleOpen(true)}
                  className="hidden sm:inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full font-semibold text-xs text-white bg-rose-600 hover:bg-rose-500 shadow-sm shadow-rose-500/20 transition active:scale-95 cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                  <span>Stock Out</span>
                </button>
              </>
            )}

            {/* Cloud Database Sync Pill */}
            <button
              onClick={handleCloudSync}
              disabled={isSyncing}
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-full font-semibold text-xs border transition active:scale-95 cursor-pointer shadow-2xs whitespace-nowrap ${
                isSyncing 
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-800' 
                  : supabaseConfig.isConnected
                    ? 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300/80 dark:border-slate-700'
              }`}
              title="Sync All Data with Supabase Cloud Database"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-600 dark:text-blue-400' : supabaseConfig.isConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
              <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : supabaseConfig.isConnected ? 'Cloud Sync' : 'Sync'}</span>
            </button>

            {/* Master Setup Quick Trigger (Add Yard / Commodity / Party) */}
            <button
              onClick={() => {
                setMasterInitialTab('yards');
                setIsMasterOpen(true);
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-full font-semibold text-xs text-slate-800 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300/80 dark:border-slate-700 transition active:scale-95 cursor-pointer shadow-2xs whitespace-nowrap"
              title="Add Yard, Commodity or Trading Party"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>+ Setup</span>
            </button>
          </div>

        </header>

        {/* View Port Container */}
        <main className={`flex-1 ${currentTab === 'partners' ? 'overflow-y-auto md:overflow-hidden flex flex-col p-3 sm:p-6 pb-2' : 'overflow-y-auto p-3 sm:p-6 md:p-8'}`}>
          <div className={`max-w-7xl mx-auto w-full ${currentTab === 'partners' ? 'flex-1 flex flex-col min-h-0 pb-6 md:pb-0' : 'pb-12'}`}>
            
            {/* View 1: Dashboard */}
            {currentTab === 'dashboard' && (
              <LiveStockBoard
                stockMatrix={stockMatrix}
                yards={yards}
                materials={materials}
                parties={parties}
                purchases={purchases}
                sales={sales}
                activeUser={activeUser}
                onOpenPurchase={() => setIsPurchaseOpen(true)}
                onOpenSale={() => setIsSaleOpen(true)}
                onOpenShift={handleOpenShift}
                onOpenAddCharge={handleOpenAddCharge}
                onRefresh={refreshData}
              />
            )}

            {/* View 2: Stock Yards */}
            {currentTab === 'yards' && (
              <StockYardsView
                yards={yards}
                stockMatrix={stockMatrix}
                materials={materials}
                onOpenAddYard={() => setIsMasterOpen(true)}
                onOpenShiftModal={handleOpenShift}
              />
            )}

            {/* View 3: Partners & Clients */}
            {currentTab === 'partners' && (
              <PartnersView
                parties={parties}
                purchases={purchases}
                sales={sales}
                onOpenAddPartner={(category) => {
                  setMasterInitialTab('parties');
                  if (category) setMasterInitialPartyType(category);
                  setIsMasterOpen(true);
                }}
                onOpenPurchase={(sellerId) => {
                  setPreselectedSellerId(sellerId);
                  setIsPurchaseOpen(true);
                }}
                onOpenSale={(buyerId, brokerId) => {
                  setPreselectedBuyerId(buyerId);
                  setPreselectedBrokerId(brokerId);
                  setIsSaleOpen(true);
                }}
              />
            )}

            {/* View 4: Movement Ledger */}
            {currentTab === 'ledger' && (
              <LedgerHistory
                purchases={purchases}
                sales={sales}
                transfers={transfers}
                yards={yards}
                materials={materials}
                parties={parties}
                onOpenAddCharge={handleOpenAddCharge}
              />
            )}

            {/* View 5: Market Fees & Expenses */}
            {currentTab === 'expenses' && (
              <ExpensesView
                purchases={purchases}
                sales={sales}
                yards={yards}
                materials={materials}
                parties={parties}
                activeUser={activeUser}
                onOpenAddCharge={handleOpenAddCharge}
                onRefresh={refreshData}
              />
            )}

            {/* View 6: Export Data */}
            {currentTab === 'export' && (
              <ExportDataView
                stockMatrix={stockMatrix}
                purchases={purchases}
                sales={sales}
                transfers={transfers}
                yards={yards}
                materials={materials}
                parties={parties}
              />
            )}

          </div>
        </main>

      </div>

      {/* Global Modals */}
      <PurchaseInwardModal
        isOpen={isPurchaseOpen}
        onClose={() => {
          setIsPurchaseOpen(false);
          setPreselectedSellerId(undefined);
        }}
        onSuccess={refreshData}
        yards={yards}
        materials={materials}
        parties={parties}
        activeUser={activeUser}
        preselectedPartyId={preselectedSellerId}
      />

      <YardShiftingModal
        isOpen={isShiftOpen}
        onClose={() => {
          setIsShiftOpen(false);
          setPreselectedShift(undefined);
        }}
        onSuccess={refreshData}
        yards={yards}
        materials={materials}
        activeUser={activeUser}
        preselected={preselectedShift}
      />

      <SaleOutwardModal
        isOpen={isSaleOpen}
        onClose={() => {
          setIsSaleOpen(false);
          setPreselectedBuyerId(undefined);
          setPreselectedBrokerId(undefined);
        }}
        onSuccess={refreshData}
        yards={yards}
        materials={materials}
        parties={parties}
        activeUser={activeUser}
        preselectedPartyId={preselectedBuyerId}
        preselectedBrokerId={preselectedBrokerId}
      />

      <MasterSetupModal
        isOpen={isMasterOpen}
        onClose={() => setIsMasterOpen(false)}
        onUpdated={refreshData}
        yards={yards}
        materials={materials}
        parties={parties}
        initialTab={masterInitialTab}
        initialPartyType={masterInitialPartyType}
      />

      <SupabaseModal
        isOpen={isSupabaseOpen}
        onClose={() => setIsSupabaseOpen(false)}
        config={supabaseConfig}
        onConfigUpdated={refreshData}
      />

      <AddChargeModal
        isOpen={isAddChargeOpen}
        onClose={() => {
          setIsAddChargeOpen(false);
          setSelectedChargeTarget(null);
        }}
        onSuccess={refreshData}
        target={selectedChargeTarget}
        activeUser={activeUser}
      />

    </div>
  );
}

export default App;
