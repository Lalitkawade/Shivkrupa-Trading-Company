import React, { useState } from 'react';
import { 
  X, 
  Package, 
  Calendar, 
  Warehouse, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Search, 
  Filter, 
  Plus, 
  Trash2, 
  FileText,
  ShoppingBag,
  TrendingUp,
  AlertTriangle,
  Layers
} from 'lucide-react';
import { Yard, BardanaRecord, BardanaSummary } from '../types';
import { storage } from '../services/storage';

interface BardanaLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBuy: () => void;
  yards: Yard[];
  onRefresh: () => void;
}

export const BardanaLedgerModal: React.FC<BardanaLedgerModalProps> = ({
  isOpen,
  onClose,
  onOpenBuy,
  yards,
  onRefresh
}) => {
  if (!isOpen) return null;

  const [search, setSearch] = useState('');
  const [selectedYardFilter, setSelectedYardFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');

  const records = storage.getBardanaRecords();
  const summary = storage.getBardanaSummary();

  const filteredRecords = records.filter(r => {
    if (selectedYardFilter !== 'all' && r.yard_id !== selectedYardFilter) return false;
    if (selectedTypeFilter !== 'all' && r.type !== selectedTypeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchType = r.bardana_type.toLowerCase().includes(q);
      const matchParty = (r.party_name || '').toLowerCase().includes(q);
      const matchRef = (r.reference_no || '').toLowerCase().includes(q);
      const matchNotes = (r.notes || '').toLowerCase().includes(q);
      if (!matchType && !matchParty && !matchRef && !matchNotes) return false;
    }
    return true;
  });

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to remove this Bardana record?')) {
      storage.deleteBardanaRecord(id);
      onRefresh();
    }
  };

  const getYardName = (yardId: string) => {
    const y = yards.find(item => item.id === yardId);
    return y ? y.name : 'Unknown Yard';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200 overflow-hidden">
      <div 
        className="w-full max-w-3xl bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl max-h-[94vh] sm:max-h-[92vh] overflow-hidden text-slate-900 dark:text-slate-100 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (Fixed at top) */}
        <div className="p-4 sm:p-5 pb-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner flex-shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5 sm:gap-2">
                <span>Bardana Ledger</span>
                <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  खतावणी
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden xs:block">
                Purchases, sale outward deductions, and live balance
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenBuy();
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 transition active:scale-95 flex items-center gap-1 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Buy</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 overscroll-contain">
          
          {/* 4 Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mb-4 sm:mb-5">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Live Stock</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 num-metric">
                {summary.totalBagsInStock.toLocaleString('en-IN')}
              </span>
              <span className="text-[11px] font-bold text-slate-400">Bags (नग)</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Purchased</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 num-metric">
                {summary.totalBagsPurchased.toLocaleString('en-IN')}
              </span>
              <span className="text-[11px] font-bold text-slate-400">Bags</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Dispatched in Sales</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl sm:text-2xl font-black text-rose-500 num-metric">
                {summary.totalBagsUsed.toLocaleString('en-IN')}
              </span>
              <span className="text-[11px] font-bold text-slate-400">Bags</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Stock Valuation</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 num-metric">
                ₹{summary.totalValuation.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 mb-4">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search challan, vendor, buyer, notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input text-xs pl-8 py-1.5"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <select
              value={selectedYardFilter}
              onChange={(e) => setSelectedYardFilter(e.target.value)}
              className="form-input text-xs py-1.5"
            >
              <option value="all">All Storage Yards</option>
              {yards.map(y => (
                <option key={y.id} value={y.id}>{y.name}</option>
              ))}
            </select>

            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="form-input text-xs py-1.5"
            >
              <option value="all">All Movements</option>
              <option value="purchase">Purchases (खरेदी)</option>
              <option value="sale_usage">Sale Outward Deductions (विक्री वापर)</option>
            </select>
          </div>
        </div>

        {/* Records List */}
        <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
          {filteredRecords.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs italic bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              No Bardana movement records found.
            </div>
          ) : (
            filteredRecords.map(record => {
              const isPurchase = record.type === 'purchase';
              const isSaleUsage = record.type === 'sale_usage';

              return (
                <div 
                  key={record.id}
                  className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold ${
                      isPurchase 
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' 
                        : 'bg-rose-500/15 text-rose-500'
                    }`}>
                      {isPurchase ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isPurchase
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20'
                        }`}>
                          {isPurchase ? 'Inward Purchase' : 'Sale Dispatch Deduction'}
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                          {record.bardana_type}
                        </span>
                        {record.reference_no && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                            Ref: {record.reference_no}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                        <span>📅 {record.date}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Warehouse className="w-3 h-3 text-slate-400" />
                          <span>{getYardName(record.yard_id)}</span>
                        </span>
                        {record.party_name && (
                          <>
                            <span>•</span>
                            <span className="text-slate-700 dark:text-slate-300 font-medium">
                              {isPurchase ? 'From: ' : 'To: '}{record.party_name}
                            </span>
                          </>
                        )}
                      </div>

                      {record.notes && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 italic">
                          "{record.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Quantity & Delete */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-800">
                    <div className="text-left sm:text-right">
                      <div className={`text-base font-black num-metric ${
                        isPurchase ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                      }`}>
                        {isPurchase ? `+${record.qty_bags}` : `-${record.qty_bags}`} Bags
                      </div>
                      {isPurchase && record.rate_per_bag && (
                        <span className="text-[10px] font-semibold text-slate-400">
                          @ ₹{record.rate_per_bag}/bag • Total: ₹{(record.total_amount || 0).toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleDelete(record.id)}
                      title="Delete record"
                      className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 flex-shrink-0 bg-white dark:bg-slate-900">
          <span>Total Records: {filteredRecords.length}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
