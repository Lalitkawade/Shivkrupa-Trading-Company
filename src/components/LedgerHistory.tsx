import React, { useState } from 'react';
import { 
  History, 
  ArrowDownLeft, 
  ArrowUpRight, 
  ArrowRightLeft, 
  Search, 
  Filter, 
  Calendar, 
  Download, 
  Printer, 
  User, 
  Truck, 
  CheckCircle2,
  X,
  Eye,
  FileSpreadsheet,
  TrendingDown,
  TrendingUp,
  Warehouse,
  Boxes,
  Building2,
  ExternalLink,
  ChevronRight,
  Receipt,
  MapPin,
  Landmark,
  Plus,
  Layers,
  Copy
} from 'lucide-react';
import type { Purchase, Sale, YardTransfer, Yard, Material, Party, MarketCategory, TransactionCharge } from '../types';
import type { AddChargeTarget } from './AddChargeModal';
import { copyToClipboard } from '../utils/clipboard';

interface LedgerHistoryProps {
  purchases: Purchase[];
  sales: Sale[];
  transfers: YardTransfer[];
  yards: Yard[];
  materials: Material[];
  parties: Party[];
  onOpenAddCharge?: (target: AddChargeTarget) => void;
}

export interface UnifiedTx {
  id: string;
  type: 'purchase' | 'transfer' | 'sale';
  date: string;
  materialId: string;
  materialName: string;
  materialLocalName: string;
  materialGrade: string;
  marketCategory?: MarketCategory;
  marketLocation?: string;
  fromYardId?: string;
  toYardId?: string;
  partyId?: string;
  fromLocation: string;
  fromType: 'apmc_seller' | 'apmc_shed' | 'personal_yard' | 'buyer_company' | 'other';
  toLocation: string;
  toType: 'apmc_seller' | 'apmc_shed' | 'personal_yard' | 'buyer_company' | 'other';
  partyName?: string;
  brokerId?: string;
  brokerName?: string;
  qtyQuintals: number;
  rate?: number;
  totalAmount?: number;
  charges?: TransactionCharge[];
  bardanaBagsUsed?: number;
  bardanaType?: string;
  vehicleNo?: string;
  referenceNo?: string;
  invoiceNo?: string;
  transporterName?: string;
  createdByName: string;
  notes?: string;
  transportCost?: number;
}

export const LedgerHistory: React.FC<LedgerHistoryProps> = ({
  purchases,
  sales,
  transfers,
  yards,
  materials,
  parties,
  onOpenAddCharge
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'purchases' | 'transfers' | 'sales'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState<string>('all');
  const [selectedYard, setSelectedYard] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7days' | '30days'>('all');
  const [selectedTx, setSelectedTx] = useState<UnifiedTx | null>(null);
  const [copiedSlip, setCopiedSlip] = useState(false);

  const handleCopySlip = async (tx: UnifiedTx) => {
    const lines = [
      `🏛️ SHIVKRUPA TRADING CO. - TRANSACTION SLIP`,
      `Movement: ${tx.type === 'purchase' ? 'Stock Inward (Purchase)' : tx.type === 'sale' ? 'Stock Outward (Sale)' : 'Yard Shift Transfer'}`,
      `Date: ${tx.date}`,
      tx.referenceNo ? `Ref No: ${tx.referenceNo}` : null,
      `Commodity: ${tx.materialName} (${tx.materialLocalName}) [Grade: ${tx.materialGrade}]`,
      `Route: ${tx.fromLocation} ➔ ${tx.toLocation}`,
      tx.partyName ? `Party: ${tx.partyName}` : null,
      tx.brokerName ? `Broker / Agent: ${tx.brokerName}` : null,
      `Quantity: ${tx.qtyQuintals.toFixed(2)} Quintals`,
      tx.rate ? `Rate: ₹${tx.rate.toLocaleString('en-IN')} / Qtl` : null,
      tx.totalAmount ? `Total Valuation: ₹${tx.totalAmount.toLocaleString('en-IN')}` : null,
      tx.vehicleNo ? `Vehicle No: ${tx.vehicleNo}` : null,
      `Operator: ${tx.createdByName}`,
      tx.notes ? `Notes: ${tx.notes}` : null
    ].filter(Boolean).join('\n');

    const ok = await copyToClipboard(lines);
    if (ok) {
      setCopiedSlip(true);
      setTimeout(() => setCopiedSlip(false), 2000);
    }
  };

  // Helper resolvers
  const getYard = (id: string) => yards.find(y => y.id === id);
  const getMaterial = (id: string) => materials.find(m => m.id === id);
  const getParty = (id: string) => parties.find(p => p.id === id);

  const getYardName = (id: string) => getYard(id)?.name || id;
  const getPartyName = (id: string) => getParty(id)?.name || id;

  // Unify entries into sorted chronological stream
  const txList: UnifiedTx[] = [];

  purchases.forEach(p => {
    const mat = getMaterial(p.material_id);
    const yard = getYard(p.yard_id);
    const party = getParty(p.party_id);

    txList.push({
      id: p.id,
      type: 'purchase',
      date: p.purchase_date,
      materialId: p.material_id,
      materialName: mat?.name || 'Produce',
      materialLocalName: mat?.local_name || '',
      materialGrade: mat?.grade || 'Grade A',
      marketCategory: p.market_category || 'government',
      marketLocation: p.market_location || 'Nagpur (Kalamna Govt APMC)',
      toYardId: p.yard_id,
      partyId: p.party_id,
      fromLocation: party?.name || 'Mandi Seller',
      fromType: 'apmc_seller',
      toLocation: yard?.name || 'APMC Yard',
      toType: yard?.type || 'apmc_shed',
      partyName: party?.name,
      qtyQuintals: p.qty_quintals,
      rate: p.rate_per_quintal,
      totalAmount: p.total_amount,
      charges: p.charges || [],
      vehicleNo: p.vehicle_no,
      referenceNo: p.lot_number || `INW-${p.id.slice(0, 5)}`,
      createdByName: p.created_by_name,
      notes: p.notes
    });
  });

  transfers.forEach(t => {
    const mat = getMaterial(t.material_id);
    const fromY = getYard(t.from_yard_id);
    const toY = getYard(t.to_yard_id);

    txList.push({
      id: t.id,
      type: 'transfer',
      date: t.transfer_date,
      materialId: t.material_id,
      materialName: mat?.name || 'Produce',
      materialLocalName: mat?.local_name || '',
      materialGrade: mat?.grade || 'Standard',
      fromYardId: t.from_yard_id,
      toYardId: t.to_yard_id,
      fromLocation: fromY?.name || 'Source Yard',
      fromType: fromY?.type || 'apmc_shed',
      toLocation: toY?.name || 'Destination Yard',
      toType: toY?.type || 'personal_yard',
      qtyQuintals: t.qty_quintals,
      vehicleNo: t.vehicle_no,
      referenceNo: `TRF-${t.id.slice(0, 5)}`,
      createdByName: t.created_by_name,
      notes: t.notes,
      transportCost: t.transport_cost
    });
  });

  sales.forEach(s => {
    const mat = getMaterial(s.material_id);
    const yard = getYard(s.yard_id);
    const party = getParty(s.party_id);

    txList.push({
      id: s.id,
      type: 'sale',
      date: s.sale_date,
      materialId: s.material_id,
      materialName: mat?.name || 'Produce',
      materialLocalName: mat?.local_name || '',
      materialGrade: mat?.grade || 'Grade A',
      fromYardId: s.yard_id,
      partyId: s.party_id,
      fromLocation: yard?.name || 'Dispatched Yard',
      fromType: yard?.type || 'personal_yard',
      toLocation: party?.name || 'Buyer Company',
      toType: 'buyer_company',
      partyName: party?.name,
      brokerId: s.broker_id,
      brokerName: s.broker_name,
      qtyQuintals: s.qty_quintals,
      rate: s.rate_per_quintal,
      totalAmount: s.total_amount,
      charges: s.charges || [],
      bardanaBagsUsed: s.bardana_bags_used,
      bardanaType: s.bardana_type,
      vehicleNo: s.vehicle_no,
      invoiceNo: s.invoice_no,
      transporterName: s.transporter_name,
      referenceNo: s.invoice_no ? `INV-${s.invoice_no}` : (s.dispatch_challan_no || `OUT-${s.id.slice(0, 5)}`),
      createdByName: s.created_by_name,
      notes: s.notes
    });
  });

  // Sort latest first
  txList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Aggregate KPI Metrics
  const totalInwardQty = purchases.reduce((acc, p) => acc + p.qty_quintals, 0);
  const totalInwardValue = purchases.reduce((acc, p) => acc + p.total_amount, 0);

  const totalShiftQty = transfers.reduce((acc, t) => acc + t.qty_quintals, 0);
  const totalShiftCount = transfers.length;

  const totalOutwardQty = sales.reduce((acc, s) => acc + s.qty_quintals, 0);
  const totalOutwardValue = sales.reduce((acc, s) => acc + s.total_amount, 0);

  const totalMovementsCount = txList.length;

  // Date filtering helper
  const isDateInRange = (dateStr: string) => {
    if (dateFilter === 'all') return true;
    const txDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dateFilter === 'today') {
      const txD = new Date(dateStr);
      txD.setHours(0, 0, 0, 0);
      return txD.getTime() === today.getTime();
    }
    if (dateFilter === '7days') {
      const past7 = new Date(today);
      past7.setDate(past7.getDate() - 7);
      return txDate >= past7;
    }
    if (dateFilter === '30days') {
      const past30 = new Date(today);
      past30.setDate(past30.getDate() - 30);
      return txDate >= past30;
    }
    return true;
  };

  // Filtering
  const filteredList = txList.filter(item => {
    // Tab Filter
    if (activeTab === 'purchases' && item.type !== 'purchase') return false;
    if (activeTab === 'transfers' && item.type !== 'transfer') return false;
    if (activeTab === 'sales' && item.type !== 'sale') return false;

    // Commodity Filter
    if (selectedMaterial !== 'all' && item.materialId !== selectedMaterial) {
      return false;
    }

    // Yard Filter
    if (selectedYard !== 'all') {
      const matchesYard = 
        item.fromYardId === selectedYard || 
        item.toYardId === selectedYard;
      if (!matchesYard) return false;
    }

    // Date Filter
    if (!isDateInRange(item.date)) {
      return false;
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const match = 
        item.materialName.toLowerCase().includes(q) ||
        item.materialLocalName.toLowerCase().includes(q) ||
        item.fromLocation.toLowerCase().includes(q) ||
        item.toLocation.toLowerCase().includes(q) ||
        (item.partyName && item.partyName.toLowerCase().includes(q)) ||
        (item.vehicleNo && item.vehicleNo.toLowerCase().includes(q)) ||
        (item.referenceNo && item.referenceNo.toLowerCase().includes(q)) ||
        (item.notes && item.notes.toLowerCase().includes(q)) ||
        item.createdByName.toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });

  // Filtered Totals
  const filteredQty = filteredList.reduce((acc, cur) => acc + cur.qtyQuintals, 0);
  const filteredValue = filteredList.reduce((acc, cur) => acc + (cur.totalAmount || 0), 0);

  const activeFiltersCount = 
    (selectedMaterial !== 'all' ? 1 : 0) +
    (selectedYard !== 'all' ? 1 : 0) +
    (dateFilter !== 'all' ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0);

  const handleResetFilters = () => {
    setSelectedMaterial('all');
    setSelectedYard('all');
    setDateFilter('all');
    setSearchQuery('');
  };

  // Date formatter (e.g., "31 Oct 2026")
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return {
        formatted: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        weekday: d.toLocaleDateString('en-IN', { weekday: 'short' })
      };
    } catch {
      return { formatted: dateStr, weekday: '' };
    }
  };

  // CSV Export
  const exportCsv = () => {
    const headers = [
      'Movement Type',
      'Ref / Lot No',
      'Date',
      'Commodity',
      'Grade',
      'Origin (From)',
      'Destination (To)',
      'Associated Party',
      'Quantity (Quintals)',
      'Rate (Rs/Qtl)',
      'Total Amount (Rs)',
      'Vehicle Number',
      'Recorded By',
      'Notes'
    ];

    const rows = filteredList.map(r => [
      r.type === 'purchase' ? 'Stock In (Purchase)' : r.type === 'sale' ? 'Stock Out (Sale)' : 'Yard Shift',
      `"${r.referenceNo || ''}"`,
      r.date,
      `"${r.materialName} (${r.materialLocalName})"`,
      `"${r.materialGrade}"`,
      `"${r.fromLocation}"`,
      `"${r.toLocation}"`,
      `"${r.partyName || ''}"`,
      r.qtyQuintals,
      r.rate || '',
      r.totalAmount || '',
      `"${r.vehicleNo || ''}"`,
      `"${r.createdByName}"`,
      `"${r.notes || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `shivkrupa_stock_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">

      {/* 1. Executive Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Inward Purchases */}
        <div 
          onClick={() => setActiveTab('purchases')}
          className={`cursor-pointer rounded-2xl p-5 border transition-all duration-200 shadow-sm ${
            activeTab === 'purchases'
              ? 'bg-emerald-500/10 border-emerald-500/60 ring-2 ring-emerald-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-800'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Total Inward Stock
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold num-metric text-slate-900 dark:text-white">
              {totalInwardQty.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-bold text-slate-500">Qtl</span>
          </div>
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-xs">
            <span className="text-slate-500 dark:text-slate-400">{purchases.length} Inward Lots</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 num-metric">
              ₹{totalInwardValue.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Card 2: Inter-Yard Transfers */}
        <div 
          onClick={() => setActiveTab('transfers')}
          className={`cursor-pointer rounded-2xl p-5 border transition-all duration-200 shadow-sm ${
            activeTab === 'transfers'
              ? 'bg-indigo-500/10 border-indigo-500/60 ring-2 ring-indigo-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Yard Transfers
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold num-metric text-slate-900 dark:text-white">
              {totalShiftQty.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-bold text-slate-500">Qtl</span>
          </div>
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-xs">
            <span className="text-slate-500 dark:text-slate-400">{totalShiftCount} Yard Shifts</span>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">Sheds ➔ Godowns</span>
          </div>
        </div>

        {/* Card 3: Outward Sales */}
        <div 
          onClick={() => setActiveTab('sales')}
          className={`cursor-pointer rounded-2xl p-5 border transition-all duration-200 shadow-sm ${
            activeTab === 'sales'
              ? 'bg-rose-500/10 border-rose-500/60 ring-2 ring-rose-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-800'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Total Outward Sales
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold num-metric text-slate-900 dark:text-white">
              {totalOutwardQty.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-bold text-slate-500">Qtl</span>
          </div>
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-xs">
            <span className="text-slate-500 dark:text-slate-400">{sales.length} Dispatches</span>
            <span className="font-bold text-rose-600 dark:text-rose-400 num-metric">
              ₹{totalOutwardValue.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Card 4: Total Operations */}
        <div 
          onClick={() => setActiveTab('all')}
          className={`cursor-pointer rounded-2xl p-5 border transition-all duration-200 shadow-sm ${
            activeTab === 'all'
              ? 'bg-blue-500/10 border-blue-500/60 ring-2 ring-blue-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Total Audit Movements
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <History className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold num-metric text-slate-900 dark:text-white">
              {totalMovementsCount}
            </span>
            <span className="text-xs font-bold text-slate-500">Transactions</span>
          </div>
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-xs">
            <span className="text-slate-500 dark:text-slate-400">Full Audit Trail</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">100% Reconciled</span>
          </div>
        </div>

      </div>

      {/* 2. Organized Control Toolbar & Filter Hub */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        
        {/* Row A: Navigation Tabs & Export Buttons */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5 pb-3 border-b border-slate-100 dark:border-slate-800/80">
          
          {/* Movement Type Tabs */}
          <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>All Movements</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold num-metric ${
                activeTab === 'all' 
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' 
                  : 'bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {txList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('purchases')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'purchases'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Inward Purchases</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold num-metric ${
                activeTab === 'purchases' 
                  ? 'bg-emerald-500 text-white' 
                  : 'bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {purchases.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('transfers')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'transfers'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              <span>Yard Shifts</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold num-metric ${
                activeTab === 'transfers' 
                  ? 'bg-indigo-500 text-white' 
                  : 'bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {transfers.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('sales')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'sales'
                  ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>Outward Sales</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold num-metric ${
                activeTab === 'sales' 
                  ? 'bg-rose-500 text-white' 
                  : 'bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {sales.length}
              </span>
            </button>
          </div>

          {/* Export & Print CTAs */}
          <div className="flex items-center gap-2.5 self-end lg:self-auto">
            <button
              onClick={exportCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition"
              title="Export filtered records to CSV"
            >
              <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition"
              title="Print Ledger"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>Print Ledger</span>
            </button>
          </div>

        </div>

        {/* Row B: Search Bar & Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          
          {/* Universal Search */}
          <div className="relative sm:col-span-2 lg:col-span-5">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search commodity, party, vehicle no, ref, or staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Commodity Dropdown */}
          <div className="lg:col-span-3">
            <select
              value={selectedMaterial}
              onChange={(e) => setSelectedMaterial(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">🌾 All Commodities ({materials.length})</option>
              {materials.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.local_name})
                </option>
              ))}
            </select>
          </div>

          {/* Yard / Location Dropdown */}
          <div className="lg:col-span-2">
            <select
              value={selectedYard}
              onChange={(e) => setSelectedYard(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">🏢 All Yards & Sheds</option>
              {yards.map(y => (
                <option key={y.id} value={y.id}>
                  {y.name} ({y.type === 'apmc_shed' ? 'APMC Shed' : 'Godown'})
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div className="lg:col-span-2 flex items-center gap-2">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">📅 All Time</option>
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
            </select>

            {activeFiltersCount > 0 && (
              <button
                onClick={handleResetFilters}
                className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200 dark:border-rose-900 transition flex-shrink-0"
                title="Reset all filters"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

        </div>

        {/* Row C: Active Results Banner */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>
              Showing <strong>{filteredList.length}</strong> of {txList.length} transactions
            </span>
            {activeFiltersCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                {activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''} active
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs">
            <span>
              Filtered Qty: <strong className="num-metric text-slate-900 dark:text-white font-bold">{filteredQty.toFixed(2)} Qtl</strong>
            </span>
            {filteredValue > 0 && (
              <span>
                Filtered Value: <strong className="num-metric text-slate-900 dark:text-white font-bold">₹{filteredValue.toLocaleString('en-IN')}</strong>
              </span>
            )}
          </div>
        </div>

      </div>

      {/* 3. High-Grade Ledger Table Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1050px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4 w-32">Movement</th>
                <th className="py-3 px-4 w-28">Date</th>
                <th className="py-3 px-4 w-44">Commodity</th>
                <th className="py-3 px-4 w-72">Movement Route (From ➔ To)</th>
                <th className="py-3 px-4 w-28 text-right">Quantity</th>
                <th className="py-3 px-4 w-28 text-right">Rate / Qtl</th>
                <th className="py-3 px-4 w-32 text-right">Total Amount</th>
                <th className="py-3 px-4 w-44">Vehicle & Info</th>
                <th className="py-3 px-4 w-28">Operator</th>
                <th className="py-3 px-4 w-14 text-center">Slip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-14 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                        <History className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                        No transactions found
                      </p>
                      <p className="text-xs text-slate-400 text-center">
                        No inward purchases, shifts, or dispatches match your selected search criteria.
                      </p>
                      {activeFiltersCount > 0 && (
                        <button
                          onClick={handleResetFilters}
                          className="px-4 py-1.5 rounded-full text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition mt-2 shadow-sm"
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredList.map(tx => {
                  const { formatted, weekday } = formatDate(tx.date);

                  return (
                    <tr 
                      key={tx.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                      onClick={() => setSelectedTx(tx)}
                    >
                      {/* 1. Type & Reference */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="space-y-1">
                          {tx.type === 'purchase' && (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60 whitespace-nowrap">
                                <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Stock In</span>
                              </span>
                              <div>
                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  tx.marketCategory === 'private'
                                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60'
                                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60'
                                }`}>
                                  {tx.marketCategory === 'private' ? '🏢 Private APMC' : '🏛️ Govt APMC'}
                                </span>
                              </div>
                            </div>
                          )}
                          {tx.type === 'transfer' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800/60 whitespace-nowrap">
                              <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Yard Shift</span>
                            </span>
                          )}
                          {tx.type === 'sale' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800/60 whitespace-nowrap">
                              <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                              <span>Stock Out</span>
                            </span>
                          )}
                          {tx.referenceNo && (
                            <p className="font-mono text-[10px] text-slate-400 truncate max-w-[100px]" title={tx.referenceNo}>
                              {tx.referenceNo}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* 2. Date */}
                      <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatted}</span>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                          {weekday}
                        </span>
                      </td>

                      {/* 3. Commodity */}
                      <td className="py-3.5 px-4 align-middle">
                        <p className="font-extrabold text-slate-900 dark:text-white leading-tight">
                          {tx.materialName}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {tx.materialLocalName ? `${tx.materialLocalName} • ` : ''}{tx.materialGrade}
                        </p>
                      </td>

                      {/* 4. Movement Route (From ➔ To) */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2 border border-slate-100 dark:border-slate-800 text-[11px] leading-tight space-y-1">
                          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 w-9">From:</span>
                            <span className="font-semibold truncate max-w-[190px]" title={tx.fromLocation}>
                              {tx.fromLocation}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-900 dark:text-white font-medium">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 w-9">To:</span>
                            <span className="font-bold truncate max-w-[190px]" title={tx.toLocation}>
                              {tx.toLocation}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 5. Quantity */}
                      <td className="py-3.5 px-4 align-middle text-right whitespace-nowrap">
                        <span className="text-sm font-extrabold num-metric text-slate-900 dark:text-white">
                          {tx.qtyQuintals.toFixed(2)}
                        </span>
                        <span className="text-xs font-bold text-slate-500 ml-1">Qtl</span>
                      </td>

                      {/* 6. Rate */}
                      <td className="py-3.5 px-4 align-middle text-right whitespace-nowrap">
                        {tx.rate ? (
                          <div className="font-bold num-metric text-slate-700 dark:text-slate-200">
                            ₹{tx.rate.toLocaleString('en-IN')}
                            <span className="text-[10px] font-normal text-slate-400 block">/ Quintal</span>
                          </div>
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-400 italic bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                            Internal Shift
                          </span>
                        )}
                      </td>

                      {/* 7. Total Amount & Attached Charges */}
                      <td className="py-3.5 px-4 align-middle text-right whitespace-nowrap">
                        {tx.totalAmount ? (
                          <div>
                            <span className="text-sm font-extrabold num-metric text-slate-900 dark:text-white">
                              ₹{tx.totalAmount.toLocaleString('en-IN')}
                            </span>
                            {tx.charges && tx.charges.length > 0 && (
                              <div className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                                {tx.type === 'purchase' ? '+' : '-'}₹{tx.charges.reduce((a, c) => a + c.amount, 0).toLocaleString('en-IN')} charges
                              </div>
                            )}
                          </div>
                        ) : tx.transportCost ? (
                          <div className="text-right">
                            <span className="text-xs font-semibold num-metric text-amber-600 dark:text-amber-400">
                              ₹{tx.transportCost.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] text-slate-400 block">Freight</span>
                          </div>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 font-bold">—</span>
                        )}
                      </td>

                      {/* 8. Vehicle & Info */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="space-y-1">
                          {tx.vehicleNo ? (
                            <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                              <Truck className="w-3 h-3 text-slate-400" />
                              {tx.vehicleNo}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">No vehicle</span>
                          )}
                          {tx.notes && (
                            <p className="text-[11px] text-slate-500 italic truncate max-w-[170px]" title={tx.notes}>
                              {tx.notes}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* 9. Operator */}
                      <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                          <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-bold">
                            {tx.createdByName.charAt(0)}
                          </div>
                          <span className="text-[11px] font-semibold">{tx.createdByName.split(' ')[0]}</span>
                        </div>
                      </td>

                      {/* 10. Actions & View Slip */}
                      <td className="py-3.5 px-4 align-middle text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => setSelectedTx(tx)}
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition"
                            title="View voucher slip"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Table Summary Footer */}
            {filteredList.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50/90 dark:bg-slate-800/90 border-t-2 border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <td colSpan={4} className="py-3 px-4 uppercase tracking-wider text-slate-500 text-[11px]">
                    Total Aggregated ({filteredList.length} movements):
                  </td>
                  <td className="py-3 px-4 text-right num-metric font-extrabold text-sm text-slate-900 dark:text-white">
                    {filteredQty.toFixed(2)} Qtl
                  </td>
                  <td className="py-3 px-4 text-right text-slate-400">—</td>
                  <td className="py-3 px-4 text-right num-metric font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                    {filteredValue > 0 ? `₹${filteredValue.toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td colSpan={3} className="py-3 px-4 text-slate-400 text-[11px] italic">
                    Accounting figures reconciled
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* 4. Voucher Slip Detail Modal */}
      {selectedTx && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200 overflow-hidden"
          onClick={() => setSelectedTx(null)}
        >
          <div 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[94vh] sm:max-h-[85vh] flex flex-col shadow-2xl relative animate-in fade-in duration-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* Modal Header (Fixed at top) */}
            <div className="p-4 sm:p-5 pb-3 sm:pb-4 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
                  selectedTx.type === 'purchase'
                    ? 'bg-emerald-500/10 text-emerald-600'
                    : selectedTx.type === 'transfer'
                    ? 'bg-indigo-500/10 text-indigo-600'
                    : 'bg-rose-500/10 text-rose-600'
                }`}>
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                    Stock Movement Voucher
                  </h3>
                  <p className="text-xs text-slate-500">
                    Ref: <strong className="font-mono text-slate-700 dark:text-slate-300">{selectedTx.referenceNo}</strong> • Date: {selectedTx.date}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedTx(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Voucher Body (Scrollable with min-h-0 to guarantee no vertical clipping) */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 py-3 sm:py-4 space-y-3 text-xs overscroll-contain">
              
              {/* Type Badge */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 font-semibold uppercase text-[11px]">Movement Classification</span>
                {selectedTx.type === 'purchase' && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                    Stock In (APMC Inward Purchase)
                  </span>
                )}
                {selectedTx.type === 'transfer' && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                    Yard Shift (Internal Transfer)
                  </span>
                )}
                {selectedTx.type === 'sale' && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
                    Stock Out (Buyer Company Sale)
                  </span>
                )}
              </div>

              {/* Tax / Mandi Invoice Number (If Sale) */}
              {selectedTx.invoiceNo && (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-blue-500/10 border border-blue-500/25">
                  <div>
                    <span className="text-blue-700 dark:text-blue-300 block text-[10px] uppercase font-bold">Tax / Mandi Invoice No</span>
                    <span className="font-mono font-black text-xs text-blue-900 dark:text-blue-100">
                      {selectedTx.invoiceNo}
                    </span>
                  </div>
                  <span className="font-bold text-[10px] px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                    Billed Outward Sale
                  </span>
                </div>
              )}

              {/* Inward Market Category (Government vs Private Mandi) */}
              {selectedTx.type === 'purchase' && (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">APMC Market Division</span>
                    <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200">
                      {selectedTx.marketCategory === 'private' ? '🏢 Private APMC Yard (खाजगी APMC)' : '🏛️ Government APMC Mandi (शासकीय बाजार समिती)'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Trading Hub</span>
                    <span className="font-bold text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 justify-end">
                      <MapPin className="w-3 h-3" />
                      {selectedTx.marketLocation || 'Nagpur (नागपूर)'}
                    </span>
                  </div>
                </div>
              )}

              {/* Produce & Weight Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Commodity</span>
                  <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
                    {selectedTx.materialName}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {selectedTx.materialLocalName} ({selectedTx.materialGrade})
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-right">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Net Weight</span>
                  <p className="text-sm font-extrabold num-metric text-slate-900 dark:text-white mt-0.5">
                    {selectedTx.qtyQuintals.toFixed(2)} Qtl
                  </p>
                  <p className="text-[11px] text-slate-500">Standard Mandi Weight</p>
                </div>
              </div>

              {/* Movement Pipeline */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Physical Transit Route</span>
                <div className="flex items-center justify-between text-xs pt-1">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Source (From):</span>
                    <strong className="text-slate-800 dark:text-slate-200">{selectedTx.fromLocation}</strong>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px]">Destination (To):</span>
                    <strong className="text-slate-800 dark:text-slate-200">{selectedTx.toLocation}</strong>
                  </div>
                </div>
              </div>

              {/* Valuation (If applicable) */}
              {selectedTx.rate ? (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">
                      Rate per Quintal
                    </span>
                    <p className="text-sm font-extrabold num-metric text-emerald-700 dark:text-emerald-300">
                      ₹{selectedTx.rate.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">
                      Total Valuation
                    </span>
                    <p className="text-base font-black num-metric text-emerald-700 dark:text-emerald-300">
                      ₹{selectedTx.totalAmount?.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Transport & Vehicle Details */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Vehicle Registration</span>
                  <p className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {selectedTx.vehicleNo || 'Self / Unspecified'}
                  </p>
                  {selectedTx.transporterName && (
                    <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300 mt-1 truncate" title={selectedTx.transporterName}>
                      🚛 {selectedTx.transporterName}
                    </p>
                  )}
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Recorded By</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {selectedTx.createdByName}
                  </p>
                </div>
              </div>

              {/* Broker Agent Information (If brokered sale) */}
              {selectedTx.brokerName && (
                <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🤝</span>
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">Broker / Commission Agent:</span>
                      <p className="text-[11px] text-purple-700 dark:text-purple-300">
                        {selectedTx.brokerName} (दलालामार्फत विक्री)
                      </p>
                    </div>
                  </div>
                  <span className="font-bold text-[11px] px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                    Brokered Deal
                  </span>
                </div>
              )}

              {/* Bardana Packaging Deduction Info */}
              {selectedTx.bardanaBagsUsed && selectedTx.bardanaBagsUsed > 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🎒</span>
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">Bardana Bags Deducted:</span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {selectedTx.bardanaType || 'Standard Gunny Bags'} (साठ्यातून वजावट)
                      </p>
                    </div>
                  </div>
                  <span className="font-black text-sm num-metric text-amber-700 dark:text-amber-400">
                    -{selectedTx.bardanaBagsUsed} Bags
                  </span>
                </div>
              )}

              {/* Attached Charges & Expenses */}
              {selectedTx.charges && selectedTx.charges.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[11px] text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      <span>{selectedTx.type === 'sale' ? 'Dispatch Charges Billed to Buyer Account' : 'Attached Inward Transaction Charges'}</span>
                    </span>
                    <span className="font-extrabold num-metric text-emerald-700 dark:text-emerald-400">
                      {selectedTx.type === 'sale' ? '+' : ''}₹{selectedTx.charges.reduce((acc, c) => acc + c.amount, 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    {selectedTx.charges.map(chg => (
                      <div 
                        key={chg.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-bold text-slate-800 dark:text-slate-200">{chg.title}</p>
                          <p className="text-[10px] text-slate-400">
                            Paid to: {chg.paid_to || 'Vendor'} • {chg.payment_status === 'accrued_payable' ? 'Weekly Due' : 'Paid'}
                            {selectedTx.type === 'sale' ? ' • Billed to Buyer' : ''}
                          </p>
                        </div>
                        <span className="font-bold num-metric text-emerald-600 dark:text-emerald-400">
                          {selectedTx.type === 'sale' ? '+' : ''}₹{chg.amount.toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedTx.notes && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs">
                  <span className="font-bold block text-[10px] uppercase">Remarks / Quality Notes:</span>
                  <p className="mt-0.5">{selectedTx.notes}</p>
                </div>
              )}

            </div>

            {/* Modal Actions Footer (Fixed at bottom - ALWAYS visible, never cut off) */}
            <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-800/90 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 flex-shrink-0">
              {onOpenAddCharge && selectedTx.type !== 'transfer' ? (
                <button
                  type="button"
                  onClick={() => {
                    onOpenAddCharge({
                      type: selectedTx.type as 'purchase' | 'sale',
                      id: selectedTx.id,
                      title: `${selectedTx.type === 'purchase' ? 'Inward Purchase' : 'Outward Sale'}: ${selectedTx.materialName} (${selectedTx.partyName || selectedTx.fromLocation || selectedTx.toLocation})`,
                      referenceNo: selectedTx.referenceNo,
                      date: selectedTx.date,
                      amount: selectedTx.totalAmount || 0,
                      charges: selectedTx.charges || []
                    });
                    setSelectedTx(null);
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Charge to this Voucher</span>
                </button>
              ) : <div />}

              <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleCopySlip(selectedTx)}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition active:scale-95 cursor-pointer"
                  title="Copy formatted transaction slip to clipboard"
                >
                  {copiedSlip ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSlip ? 'Copied Slip!' : 'Copy Slip'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Slip</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTx(null)}
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 transition active:scale-95 shadow-sm text-center"
                >
                  Done
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
