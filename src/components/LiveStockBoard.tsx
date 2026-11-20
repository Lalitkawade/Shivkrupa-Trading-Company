import React, { useState } from 'react';
import { 
  ArrowRightLeft, 
  Share2, 
  Printer, 
  Plus, 
  Minus, 
  Search, 
  CheckCircle,
  Copy,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  FileSpreadsheet,
  X,
  ShoppingBag,
  Package,
  Calendar,
  Layers,
  LayoutGrid,
  Table as TableIcon
} from 'lucide-react';
import type { CurrentYardStock, Yard, Material, Purchase, Sale, UserProfile, Party } from '../types';
import { storage } from '../services/storage';
import { copyToClipboard } from '../utils/clipboard';
import type { AddChargeTarget } from './AddChargeModal';
import { BuyBardanaModal } from './BuyBardanaModal';
import { BardanaLedgerModal } from './BardanaLedgerModal';

interface LiveStockBoardProps {
  stockMatrix: CurrentYardStock[];
  yards: Yard[];
  materials: Material[];
  purchases: Purchase[];
  sales: Sale[];
  activeUser: UserProfile;
  parties?: Party[];
  onOpenPurchase: () => void;
  onOpenSale: () => void;
  onOpenShift: (preselected?: { material_id?: string; from_yard_id?: string }) => void;
  onOpenAddCharge?: (target: AddChargeTarget) => void;
  onRefresh?: () => void;
}

export const LiveStockBoard: React.FC<LiveStockBoardProps> = ({
  stockMatrix,
  yards,
  materials,
  purchases,
  sales,
  activeUser,
  parties = [],
  onOpenPurchase,
  onOpenSale,
  onOpenShift,
  onOpenAddCharge,
  onRefresh
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'apmc_shed' | 'personal_yard'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'matrix'>('cards');
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [isAuditStatementOpen, setIsAuditStatementOpen] = useState(false);

  // Bardana Modal States
  const [isBuyBardanaOpen, setIsBuyBardanaOpen] = useState(false);
  const [isBardanaLedgerOpen, setIsBardanaLedgerOpen] = useState(false);

  // Financial Period Filter & Summaries
  const [financialPeriod, setFinancialPeriod] = useState<string>('all');
  const financialPeriods = storage.getDashboardYearPeriods();
  const financials = storage.getFinancialSummary(financialPeriod);
  const bardanaSummary = storage.getBardanaSummary();

  // Filtered rows for matrix view
  const filteredStock = stockMatrix.filter(item => {
    const matchesFilter = activeFilter === 'all' || item.yard_type === activeFilter;
    const matchesSearch = 
      item.material_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.material_local_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.yard_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Group by Commodity for Card View
  const commoditiesWithStock = materials.map(mat => {
    const yardEntries = stockMatrix.filter(s => s.material_id === mat.id && s.current_stock_quintals > 0);
    const totalMatStock = yardEntries.reduce((acc, s) => acc + s.current_stock_quintals, 0);
    const avgRate = yardEntries.length > 0 
      ? Math.round(yardEntries.reduce((acc, s) => acc + (s.current_stock_quintals * s.avg_purchase_rate), 0) / (totalMatStock || 1))
      : 0;

    return {
      material: mat,
      totalStock: totalMatStock,
      avgRate,
      yardEntries
    };
  }).filter(c => {
    if (!searchQuery) return true;
    return (
      c.material.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.material.local_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleCopyWhatsApp = async () => {
    const text = storage.generateWhatsAppDailyReport();
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedWhatsApp(true);
      setTimeout(() => setCopiedWhatsApp(false), 2500);
    }
  };

  const handleOpenWhatsAppWeb = () => {
    const text = encodeURIComponent(storage.generateWhatsAppDailyReport());
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-6 font-sans">

      {/* 1. Executive Financials & Profit Hub */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl sm:rounded-[28px] p-4 sm:p-7 shadow-sm relative overflow-hidden transition-all duration-300">
        
        {/* Top Multi-Color Accent Stripe */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-amber-500 pointer-events-none" />

        {/* Section Header with Period Segment & P&L Statement Button */}
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 sm:pb-4 mb-4 sm:mb-5 border-b border-slate-200/80 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5 sm:gap-2">
                <span>Trading Financials</span>
                <span className="text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                  सर्व कपातीनंतर नफा
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 hidden xs:block">
              Gross turnover, statutory APMC cess, inward/outward handling, and net realized profit
            </p>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
            {/* Period Selector Pill */}
            <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-2.5 sm:px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 shadow-2xs flex-1 sm:flex-none">
              <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <select
                id="select-financial-period"
                value={financialPeriod}
                onChange={(e) => setFinancialPeriod(e.target.value)}
                className="bg-transparent text-slate-900 dark:text-white font-bold text-xs focus:outline-none cursor-pointer pr-1 w-full sm:w-auto"
                title="Filter Trading Financials by Financial Year, Calendar Year, or All Time"
              >
                {financialPeriods.map(p => (
                  <option key={p.id} value={p.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white py-1">
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* P&L Statement Button */}
            <button
              onClick={() => setIsAuditStatementOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl text-xs font-semibold bg-slate-900 text-white hover:bg-black dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition shadow-xs whitespace-nowrap cursor-pointer active:scale-95 flex-shrink-0"
              title="View full P&L trading statement"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
              <span>P&L Statement</span>
            </button>
          </div>
        </div>

        {/* 4 Differentiated Executive KPI Cards */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Total Purchases (Emerald Tinted & Clear Hierarchy) */}
          <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/90 dark:border-emerald-800/60 rounded-2xl p-5 hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-200">
                    Purchases (खरेदी)
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300">
                    INWARD
                  </span>
                </div>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold ring-1 ring-emerald-500/30">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white num-metric">
                  ₹{financials.totalPurchaseGross.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-emerald-200/60 dark:border-emerald-800/60 text-[11px] space-y-1.5 text-slate-600 dark:text-slate-400">
              <div className="flex justify-between items-center">
                <span>Inward Charges:</span>
                <span className="text-slate-800 dark:text-slate-200 font-semibold">+₹{financials.totalPurchaseCharges.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>APMC Mandi Cess:</span>
                <span className="text-slate-800 dark:text-slate-200 font-semibold">+₹{financials.totalApmcCess.toLocaleString('en-IN')}</span>
              </div>
              <div className="mt-2.5 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60 flex justify-between items-center bg-emerald-100/70 dark:bg-emerald-900/50 px-3 py-1.5 rounded-xl text-emerald-900 dark:text-emerald-100 font-bold">
                <span>Total Landed Outlay:</span>
                <span className="text-emerald-700 dark:text-emerald-300 font-black">₹{financials.totalPurchaseNet.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Total Sales (Blue Tinted & Clear Hierarchy) */}
          <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/90 dark:border-blue-800/60 rounded-2xl p-5 hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-200">
                    Sales (विक्री)
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-800 dark:text-blue-300">
                    DISPATCH
                  </span>
                </div>
                <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold ring-1 ring-blue-500/30">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white num-metric">
                  ₹{financials.totalSaleGross.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-blue-200/60 dark:border-blue-800/60 text-[11px] space-y-1.5 text-slate-600 dark:text-slate-400">
              <div className="flex justify-between items-center">
                <span>Produce Value:</span>
                <span className="text-slate-800 dark:text-slate-200 font-semibold">₹{(financials.totalSaleGross - financials.totalSaleCharges).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Charges Billed to Buyer:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">+₹{financials.totalSaleCharges.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Sold Quantity:</span>
                <span className="text-slate-800 dark:text-slate-200 font-semibold">{(financials.totalSoldQty ?? 0).toFixed(2)} Qtl</span>
              </div>
              <div className="mt-2.5 pt-2 border-t border-blue-200/60 dark:border-blue-800/60 flex justify-between items-center bg-blue-100/70 dark:bg-blue-900/50 px-3 py-1.5 rounded-xl text-blue-900 dark:text-blue-100 font-bold">
                <span>Total Billed to Buyers:</span>
                <span className="text-blue-700 dark:text-blue-300 font-black">₹{financials.totalSaleGross.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Deductions & Costs (Amber Tinted & Warm Contrast) */}
          <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/90 dark:border-amber-800/60 rounded-2xl p-5 hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                    Deductions (खर्च)
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300">
                    CHARGES
                  </span>
                </div>
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold ring-1 ring-amber-500/30">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 num-metric">
                  ₹{financials.totalDeductions.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-amber-200/60 dark:border-amber-800/60 text-[11px] space-y-1.5 text-slate-600 dark:text-slate-400">
              <div className="flex justify-between items-center">
                <span>APMC Cess (0.85% / 0.55%):</span>
                <span className="text-slate-800 dark:text-slate-200 font-semibold">₹{financials.totalApmcCess.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Hamali & Freight Charges:</span>
                <span className="text-slate-800 dark:text-slate-200 font-semibold">₹{(financials.totalPurchaseCharges + financials.totalSaleCharges).toLocaleString('en-IN')}</span>
              </div>
              <div className="mt-2.5 pt-2 border-t border-amber-200/60 dark:border-amber-800/60 flex justify-between items-center bg-amber-100/70 dark:bg-amber-900/50 px-3 py-1.5 rounded-xl text-amber-900 dark:text-amber-100 font-bold">
                <span>Yard & Testing Overheads:</span>
                <span className="text-amber-700 dark:text-amber-300 font-black">₹{financials.totalOperatingExpenses.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Card 4: Net Realized Profit (Vibrant Emerald / Teal Signature Card) */}
          <div className="bg-gradient-to-br from-emerald-100/70 via-teal-50/40 to-emerald-50/40 dark:from-emerald-950/50 dark:via-teal-950/30 dark:to-slate-900 border-2 border-emerald-500/70 dark:border-emerald-500/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-950 dark:text-emerald-200">
                  Net Profit (नफा)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-900 dark:text-emerald-200 border border-emerald-500/40">
                  {financials.netRealizedProfit >= 0 ? `+${financials.profitMarginPercent}% Margin` : 'Loss'}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`text-2xl sm:text-3xl font-black num-metric ${
                  financials.netRealizedProfit >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {financials.netRealizedProfit >= 0 ? '+' : '-'}₹{Math.abs(financials.netRealizedProfit).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-emerald-300/70 dark:border-emerald-800/60 text-[11px] space-y-1.5 text-slate-700 dark:text-slate-300">
              <div className="flex justify-between items-center">
                <span>Realized on Dispatches:</span>
                <span className="font-bold text-slate-900 dark:text-white">₹{financials.netRealizedProfit.toLocaleString('en-IN')}</span>
              </div>
              <div className="mt-2.5 pt-2 border-t border-emerald-300/70 dark:border-emerald-800/60 flex justify-between items-center bg-emerald-500/20 dark:bg-emerald-900/60 px-3 py-1.5 rounded-xl text-emerald-950 dark:text-emerald-100 font-black">
                <span title="Sales + Unsold Inventory Valuation - Purchases - All Deductions">Comprehensive Net:</span>
                <span className="text-emerald-700 dark:text-emerald-300 font-black">₹{financials.comprehensiveNetProfit.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* 2. Elevated Floating Action Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-2 sm:p-2.5 shadow-sm overflow-x-auto no-scrollbar">
        <div className="flex flex-nowrap items-center justify-between gap-3 min-w-max">
          
          {/* Left: Primary Deal Buttons */}
          <div className="flex flex-nowrap items-center gap-2 flex-shrink-0">
            <button
              id="btn-stock-in"
              onClick={onOpenPurchase}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-full font-semibold text-xs text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm shadow-emerald-600/30 transition active:scale-95 whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Stock In (खरेदी)</span>
            </button>

            <button
              id="btn-shift-stock"
              onClick={() => onOpenShift()}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-full font-semibold text-xs text-white bg-slate-900 hover:bg-black dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 shadow-xs transition active:scale-95 whitespace-nowrap cursor-pointer"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Shift Stock</span>
            </button>

            <button
              id="btn-stock-out"
              onClick={onOpenSale}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-full font-semibold text-xs text-white bg-rose-600 hover:bg-rose-500 shadow-sm shadow-rose-600/30 transition active:scale-95 whitespace-nowrap cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
              <span>Stock Out (विक्री)</span>
            </button>

            <button
              id="btn-action-buy-bardana"
              onClick={() => setIsBuyBardanaOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-full font-semibold text-xs text-amber-900 dark:text-amber-200 bg-amber-100/80 hover:bg-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 border border-amber-300 dark:border-amber-700 shadow-2xs transition active:scale-95 whitespace-nowrap cursor-pointer"
              title="Purchase and stock gunny / HDPE bags (बारदान खरेदी)"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
              <span>+ Buy Bardana</span>
            </button>
          </div>

          {/* Right: WhatsApp & Export Controls */}
          <div className="flex flex-nowrap items-center gap-2 flex-shrink-0">
            <button
              id="btn-copy-whatsapp"
              onClick={handleCopyWhatsApp}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-full text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300/80 dark:border-slate-700 transition active:scale-95 whitespace-nowrap cursor-pointer shadow-2xs"
              title="Copy Daily Stock Summary to Clipboard"
            >
              {copiedWhatsApp ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copiedWhatsApp ? 'Copied!' : 'Copy WhatsApp'}</span>
            </button>

            <button
              id="btn-send-whatsapp"
              onClick={handleOpenWhatsAppWeb}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-full text-xs font-semibold text-white bg-[#25D366] hover:bg-[#20ba59] shadow-sm shadow-green-600/30 transition active:scale-95 whitespace-nowrap cursor-pointer"
              title="Send directly to WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>

            <button
              id="btn-print-report"
              onClick={() => window.print()}
              className="w-9 h-9 rounded-full border border-slate-300/80 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition active:scale-95 flex items-center justify-center flex-shrink-0 cursor-pointer shadow-2xs"
              title="Print Closing Stock"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </div>

      {/* 3. Search & Segmented View Switchers (Mobile Optimized) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
        
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search commodity or yard..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300/80 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs font-medium focus:outline-none focus:ring-4 focus:ring-slate-900/[0.04] focus:border-slate-400 transition shadow-2xs"
          />
        </div>

        {/* Filter Badges & View Toggle */}
        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
          {/* Yard Segmented Filter */}
          <div className="flex items-center bg-slate-200/80 dark:bg-slate-800/90 border border-slate-300/80 dark:border-slate-700/70 p-1 rounded-2xl text-xs font-semibold overflow-x-auto no-scrollbar flex-shrink min-w-0">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
                activeFilter === 'all' 
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white font-bold' 
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveFilter('apmc_shed')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
                activeFilter === 'apmc_shed' 
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white font-bold' 
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              APMC ({stockMatrix.filter(s => s.yard_type === 'apmc_shed').length})
            </button>
            <button
              onClick={() => setActiveFilter('personal_yard')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
                activeFilter === 'personal_yard' 
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white font-bold' 
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              Personal ({stockMatrix.filter(s => s.yard_type === 'personal_yard').length})
            </button>
          </div>

          {/* View Mode Toggle: Cards vs Matrix */}
          <div className="flex items-center bg-slate-200/80 dark:bg-slate-800/90 border border-slate-300/80 dark:border-slate-700/70 p-1 rounded-2xl text-xs font-semibold flex-shrink-0">
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl transition cursor-pointer ${
                viewMode === 'cards' 
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white font-bold' 
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
              title="Cards View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cards</span>
            </button>
            <button
              onClick={() => setViewMode('matrix')}
              className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl transition cursor-pointer ${
                viewMode === 'matrix' 
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white font-bold' 
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
              title="Matrix View"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Matrix</span>
            </button>
          </div>
        </div>

      </div>

      {/* 4. Main Commodity Cards Grid */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          
          {/* DEDICATED BARDANA PACKAGING CARD */}
          {(!searchQuery || 'bardana बारदान packaging bags gunny पोती कट्टे'.toLowerCase().includes(searchQuery.toLowerCase())) && (
            <div 
              key="bardana-dedicated-card"
              className="bg-gradient-to-b from-amber-50/90 via-amber-50/40 to-white dark:from-amber-950/40 dark:to-slate-900 border-2 border-amber-300 dark:border-amber-700/80 rounded-3xl p-6 flex flex-col justify-between hover:shadow-lg transition-all duration-200 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-500" />
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3.5 relative z-10">
                  <div className="flex items-start gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold ring-1 ring-amber-500/30">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-base font-extrabold text-amber-950 dark:text-white">
                          Bardana Stock
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-500/30">
                          Packaging
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        बारदान (पोती / कट्टे) • <span className="text-slate-500">Jute & HDPE Bags</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-2xl font-black text-amber-600 dark:text-amber-400 num-metric">
                      {bardanaSummary.totalBagsInStock.toLocaleString('en-IN')}
                    </span>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Bags (नग) Total</p>
                  </div>
                </div>

                {/* Avg Purchase Rate Valuation Bar */}
                <div className="mb-4 px-3 py-2 rounded-xl bg-amber-100/70 dark:bg-amber-900/40 border border-amber-200/80 dark:border-amber-800/60 flex items-center justify-between text-xs">
                  <span className="text-amber-900 dark:text-amber-200 font-medium">Avg Cost:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    ₹{bardanaSummary.avgRatePerBag}/Bag
                  </span>
                  <span className="text-amber-300 dark:text-amber-700">•</span>
                  <span className="text-amber-900 dark:text-amber-200 font-medium">Est. Value:</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    ₹{bardanaSummary.totalValuation.toLocaleString('en-IN')}
                  </span>
                </div>

                  {/* Storage Locations Distribution */}
                  <div className="space-y-1.5 mb-4">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3 text-amber-600" />
                        <span>Location Breakdown</span>
                      </span>
                    </div>

                    {bardanaSummary.yardDistribution.filter(y => y.bags_in_stock > 0).length === 0 ? (
                      <div className="px-3 py-2 rounded-xl bg-white/70 dark:bg-slate-800/50 border border-amber-200/50 dark:border-amber-800/40 text-center text-[11px] text-slate-500 font-medium">
                        0 Bags in Stock (Add via + Buy Bardana)
                      </div>
                    ) : (
                      bardanaSummary.yardDistribution
                        .filter(y => y.bags_in_stock > 0)
                        .map(entry => (
                          <div 
                            key={entry.yard_id}
                            className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-amber-200/70 dark:border-amber-800/50 flex items-center justify-between text-xs shadow-2xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`w-2 h-2 rounded-full ${entry.yard_type === 'apmc_shed' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                {entry.yard_name.split('(')[0]}
                              </span>
                            </div>
                            <span className="font-extrabold text-amber-700 dark:text-amber-400">
                              {entry.bags_in_stock.toLocaleString('en-IN')} Bags
                            </span>
                          </div>
                        ))
                    )}

                    {/* 2 Canonical Types Breakdown (Jute vs Plastic) */}
                    {bardanaSummary.totalBagsInStock > 0 && (
                      <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                        {bardanaSummary.typeDistribution.map(t => (
                          <div key={t.bardana_type} className="px-2.5 py-1.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/40 flex items-center justify-between">
                            <span className="truncate text-slate-700 dark:text-slate-300 font-medium">{t.bardana_type.split('(')[0]}</span>
                            <span className="font-bold text-amber-800 dark:text-amber-300 ml-1">{t.bags_in_stock}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
              </div>

              {/* Bottom Quick Actions */}
              <div className="pt-3 border-t border-amber-200/80 dark:border-amber-800/50 flex items-center justify-between text-xs">
                <button
                  onClick={() => setIsBuyBardanaOpen(true)}
                  className="text-amber-800 dark:text-amber-300 font-bold hover:underline flex items-center gap-1 active:scale-95 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Buy Bardana
                </button>
                <button
                  onClick={() => setIsBardanaLedgerOpen(true)}
                  className="text-slate-700 dark:text-slate-300 font-bold hover:underline flex items-center gap-1 active:scale-95 transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-amber-600" /> Audit Ledger
                </button>
                <span className="text-[10px] font-semibold text-slate-400">
                  Auto-Deduct on Sale
                </span>
              </div>

            </div>
          )}

          {/* COMMODITY CARDS */}
          {commoditiesWithStock.map(({ material, totalStock, avgRate, yardEntries }) => (
            <div 
              key={material.id} 
              className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 flex flex-col justify-between hover:shadow-lg transition-all duration-200 shadow-2xs relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3.5">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      {material.name}
                    </h3>
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      {material.local_name} • <span className="text-slate-400">{material.grade}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 num-metric">
                      {totalStock.toFixed(2)}
                    </span>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quintals Total</p>
                  </div>
                </div>

                {/* Avg Purchase Rate Valuation Bar */}
                {avgRate > 0 && (
                  <div className="mb-4 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Avg Cost:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      ₹{avgRate.toLocaleString('en-IN')}/Qtl
                    </span>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span className="text-slate-500 dark:text-slate-400">Est. Value:</span>
                    <span className="font-extrabold text-slate-900 dark:text-white">
                      ₹{Math.round(totalStock * avgRate).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}

                {/* Yard Breakdown */}
                <div className="space-y-1.5 mb-4">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-indigo-500" />
                    <span>Location Breakdown</span>
                  </div>

                  {yardEntries.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-1">No stock currently in any yard.</p>
                  ) : (
                    yardEntries.map(entry => (
                      <div 
                        key={entry.yard_id}
                        className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-2 h-2 rounded-full ${entry.yard_type === 'apmc_shed' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {entry.yard_name.split('(')[0]}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                            {entry.current_stock_quintals.toFixed(2)} Qtl
                          </span>
                          
                          {/* Direct Shift Button if in APMC Shed */}
                          {entry.yard_type === 'apmc_shed' && entry.current_stock_quintals > 0 && (
                            <button
                              onClick={() => onOpenShift({ material_id: material.id, from_yard_id: entry.yard_id })}
                              title="Shift from this Shed to Personal Yard"
                              className="px-2 py-0.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center gap-1 text-[10px] font-bold shadow-xs transition active:scale-95 cursor-pointer"
                            >
                              <ArrowRightLeft className="w-3 h-3" />
                              <span>Shift</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Bottom Quick Deal Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <button
                  onClick={onOpenPurchase}
                  className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1 active:scale-95 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Buy More
                </button>
                <button
                  onClick={onOpenSale}
                  className="text-rose-600 dark:text-rose-400 font-bold hover:underline flex items-center gap-1 active:scale-95 transition cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" /> Sell Stock
                </button>
              </div>

            </div>
          ))}

          {/* Friendly Clean Empty State */}
          {commoditiesWithStock.length === 0 && (
            <div className="col-span-full bg-white/70 dark:bg-slate-900/70 border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-10 sm:p-12 text-center backdrop-blur-xl">
              <Package className="w-10 h-10 text-slate-400 mx-auto mb-2.5" />
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No Active Grain Inventory
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Record your first stock arrival from APMC Mandi or Yard to see live commodity cards and profit tracking here.
              </p>
              <button
                onClick={onOpenPurchase}
                className="apple-btn-primary inline-flex items-center gap-1.5 text-xs py-2 px-4 rounded-full cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Record Stock Inward</span>
              </button>
            </div>
          )}

        </div>
      )}

      {/* 5. Matrix Table View */}
      {viewMode === 'matrix' && (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800/80 rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Commodity / Material</th>
                  <th className="py-3.5 px-4">Storage Yard</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4 text-right">Total Inward</th>
                  <th className="py-3.5 px-4 text-right">Shifted In</th>
                  <th className="py-3.5 px-4 text-right">Shifted Out</th>
                  <th className="py-3.5 px-4 text-right">Total Sold</th>
                  <th className="py-3.5 px-4 text-right">Available Stock</th>
                  <th className="py-3.5 px-4 text-right">Avg Cost</th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStock.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-10 text-slate-400 italic">
                      No stock records found matching filters.
                    </td>
                  </tr>
                ) : (
                  filteredStock.map(row => (
                    <tr key={`${row.yard_id}-${row.material_id}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900 dark:text-white">{row.material_name}</p>
                        <p className="text-xs text-slate-500">{row.material_local_name}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{row.yard_name}</p>
                        <p className="text-xs text-slate-400">{row.yard_location}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          row.yard_type === 'apmc_shed' 
                            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300' 
                            : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                        }`}>
                          {row.yard_type === 'apmc_shed' ? 'APMC Shed' : 'Personal Yard'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-300">
                        {row.total_purchased_qty.toFixed(2)} Qtl
                      </td>
                      <td className="py-3 px-4 text-right text-indigo-600 dark:text-indigo-400">
                        +{row.total_transferred_in_qty.toFixed(2)} Qtl
                      </td>
                      <td className="py-3 px-4 text-right text-indigo-600 dark:text-indigo-400">
                        -{row.total_transferred_out_qty.toFixed(2)} Qtl
                      </td>
                      <td className="py-3 px-4 text-right text-rose-600 dark:text-rose-400">
                        -{row.total_sold_qty.toFixed(2)} Qtl
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-base font-extrabold text-blue-600 dark:text-blue-400">
                          {row.current_stock_quintals.toFixed(2)} Qtl
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-700 dark:text-slate-300">
                        ₹{row.avg_purchase_rate.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {row.yard_type === 'apmc_shed' && row.current_stock_quintals > 0 && (
                          <button
                            onClick={() => onOpenShift({ material_id: row.material_id, from_yard_id: row.yard_id })}
                            className="px-3 py-1 rounded-full text-xs font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs transition cursor-pointer"
                          >
                            Shift to Godown
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}

                {/* Dedicated Bardana Packaging row in Matrix View */}
                {(!searchQuery || 'bardana बारदान packaging bags gunny'.toLowerCase().includes(searchQuery.toLowerCase())) && (
                  <tr className="bg-amber-500/[0.04] dark:bg-amber-950/20 font-bold border-t-2 border-amber-300/80 dark:border-amber-800/80">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                        <div>
                          <p className="font-bold text-amber-900 dark:text-amber-200">Bardana (Packaging Bags)</p>
                          <p className="text-[11px] font-normal text-amber-700 dark:text-amber-400">बारदान (५० किलो पोती व कट्टे)</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">
                      Across {yards.length} Storage Locations
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300">
                        Packaging
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400">
                      +{bardanaSummary.totalBagsPurchased.toLocaleString('en-IN')} Bags
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400">-</td>
                    <td className="py-3 px-4 text-right text-slate-400">-</td>
                    <td className="py-3 px-4 text-right text-rose-600 dark:text-rose-400">
                      -{bardanaSummary.totalBagsUsed.toLocaleString('en-IN')} Bags
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-base font-extrabold text-amber-600 dark:text-amber-400">
                        {bardanaSummary.totalBagsInStock.toLocaleString('en-IN')} Bags
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-700 dark:text-slate-300">
                      ₹{bardanaSummary.avgRatePerBag}/Bag
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setIsBuyBardanaOpen(true)}
                        className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xs transition active:scale-95 cursor-pointer"
                      >
                        + Buy Bags
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Detailed Trading & P&L Audit Statement Modal (Mobile Optimized) */}
      {isAuditStatementOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200 overflow-hidden">
          <div 
            className="bg-white dark:bg-slate-900 border-t sm:border border-slate-200/80 dark:border-slate-800/80 rounded-t-3xl sm:rounded-[32px] max-w-2xl w-full max-h-[94vh] sm:max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header (Fixed at top) */}
            <div className="p-4 sm:p-5 pb-3 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2.5 flex-shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-1">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold flex-shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight truncate">
                    Trading P&L Audit Statement
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                    Shivkrupa Trading • {financials.periodLabel}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Period Selector inside Modal */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1 text-xs">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <select
                    value={financialPeriod}
                    onChange={(e) => setFinancialPeriod(e.target.value)}
                    className="bg-transparent text-slate-900 dark:text-white font-bold text-xs focus:outline-none cursor-pointer"
                  >
                    {financialPeriods.map(p => (
                      <option key={p.id} value={p.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white py-1">
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => setIsAuditStatementOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Financial Ledger Breakdown Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 overscroll-contain space-y-4 text-xs">
              
              {/* Group 1: Sales Revenue */}
              <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white text-sm">
                  <span>1. Trading Outward Sales Revenue (विक्री महसूल)</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                    ₹{financials.totalSaleGross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="pl-3 space-y-1 text-slate-600 dark:text-slate-400 border-l-2 border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between">
                    <span>Gross Sales Billing:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      ₹{financials.totalSaleGross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Dispatched Sold Quantity:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {(financials.totalSoldQty ?? 0).toFixed(2)} Qtl ({financials.saleCount ?? 0} Dispatches)
                    </span>
                  </div>
                  <div className="flex justify-between text-rose-600 dark:text-rose-400">
                    <span>Less: Dispatch Outward Deductions (Loading/Freight):</span>
                    <span className="font-semibold">-₹{financials.totalSaleCharges.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 dark:text-white pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span>Net Realized Sales Inflow:</span>
                    <span className="text-emerald-600 dark:text-emerald-400">
                      ₹{financials.totalSaleNet.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Group 2: Cost of Goods Sold */}
              <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white text-sm">
                  <span>2. Cost of Goods Sold (COGS - खरेदी मूळ किंमत)</span>
                  <span className="text-slate-800 dark:text-slate-200 font-extrabold">
                    -₹{financials.totalCogs.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="pl-3 space-y-1 text-slate-600 dark:text-slate-400 border-l-2 border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between">
                    <span>Weighted Purchase Base Cost of Sold Stocks:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      ₹{financials.totalCogs.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 dark:text-white pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span>Gross Trading Spread (विक्री नफा):</span>
                    <span className="text-blue-600 dark:text-blue-400">
                      ₹{(financials.totalSaleNet - financials.totalCogs).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Group 3: All Statutory & Operating Deductions */}
              <div className="p-4 rounded-2xl bg-amber-500/[0.06] dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/60 space-y-2">
                <div className="flex items-center justify-between font-bold text-amber-900 dark:text-amber-300 text-sm">
                  <span>3. Statutory & Operating Deductions (एकूण कपाती व खर्च)</span>
                  <span className="text-rose-600 dark:text-rose-400 font-extrabold">
                    -₹{financials.totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="pl-3 space-y-1.5 text-slate-600 dark:text-slate-400 border-l-2 border-amber-300 dark:border-amber-800">
                  <div className="flex justify-between">
                    <span>APMC Mandi Cess (Govt 0.85% / Private APMC 0.55%):</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      -₹{financials.totalApmcCess.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Inward Purchase Charges (Hamali, Tolai, Freight):</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      -₹{financials.totalPurchaseCharges.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Outward Dispatch Charges (Loading, Delivery):</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      -₹{financials.totalSaleCharges.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Yard Electricity, Fumigation & Testing Overheads:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      -₹{financials.totalOperatingExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Group 4: Net Profit Summary Box */}
              <div className={`p-5 rounded-2xl border ${
                financials.netRealizedProfit >= 0 
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200' 
                  : 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-200'
              } space-y-3`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider block">
                      Net Realized Trading Profit After All Deductions
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Realized net margin on completed dispatches ({financials.profitMarginPercent}% net margin)
                    </span>
                  </div>
                  <div className="text-right">
                    <span className={`text-2xl font-black ${
                      financials.netRealizedProfit >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
                    }`}>
                      {financials.netRealizedProfit >= 0 ? '+' : '-'}₹{Math.abs(financials.netRealizedProfit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Comprehensive Inventory Addition */}
                <div className="pt-3 border-t border-emerald-200/80 dark:border-emerald-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold block text-slate-800 dark:text-slate-200">
                      + Live Unsold Stock Inventory Valuation:
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Valued at weighted purchase cost across all sheds & godowns
                    </span>
                  </div>
                  <span className="text-base font-extrabold text-slate-900 dark:text-white">
                    +₹{financials.totalStockValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="pt-2 border-t border-emerald-200/80 dark:border-emerald-800/80 flex items-center justify-between font-black">
                  <span className="text-xs uppercase text-slate-900 dark:text-white">
                    Comprehensive Business P&L (Total Net Worth Impact):
                  </span>
                  <span className="text-xl text-emerald-600 dark:text-emerald-400">
                    ₹{financials.comprehensiveNetProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => window.print()}
                className="apple-btn-secondary flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Audit Statement</span>
              </button>
              <button
                onClick={() => setIsAuditStatementOpen(false)}
                className="apple-btn-primary bg-slate-900 hover:bg-black dark:bg-white dark:text-slate-900 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Buy Bardana Modal */}
      {isBuyBardanaOpen && (
        <BuyBardanaModal
          isOpen={isBuyBardanaOpen}
          onClose={() => setIsBuyBardanaOpen(false)}
          onSuccess={() => {
            onRefresh?.();
          }}
          yards={yards}
          parties={parties}
          activeUser={activeUser}
        />
      )}

      {/* 9. Bardana Ledger & History Modal */}
      {isBardanaLedgerOpen && (
        <BardanaLedgerModal
          isOpen={isBardanaLedgerOpen}
          onClose={() => setIsBardanaLedgerOpen(false)}
          onOpenBuy={() => setIsBuyBardanaOpen(true)}
          yards={yards}
          onRefresh={() => {
            onRefresh?.();
          }}
        />
      )}

    </div>
  );
};
