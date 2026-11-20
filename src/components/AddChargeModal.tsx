import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Receipt, 
  DollarSign, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Truck, 
  Scale, 
  Package, 
  User, 
  Building2,
  Calendar,
  Layers
} from 'lucide-react';
import type { 
  TransactionCharge, 
  ExpenseCategory, 
  UserProfile 
} from '../types';
import { storage } from '../services/storage';

export interface AddChargeTarget {
  type: 'purchase' | 'sale';
  id: string;
  title: string;
  referenceNo?: string;
  date: string;
  amount: number;
  charges: TransactionCharge[];
}

interface AddChargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  target: AddChargeTarget | null;
  activeUser: UserProfile;
}

export const AddChargeModal: React.FC<AddChargeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  target,
  activeUser
}) => {
  if (!isOpen || !target) return null;

  const isPurchase = target.type === 'purchase';
  const hamalPartners = storage.getParties().filter(p => p.type === 'hamal' && p.is_active);

  // Form State
  const [category, setCategory] = useState<ExpenseCategory>(
    isPurchase ? 'hamali_loading' : 'transport_freight'
  );
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [paidTo, setPaidTo] = useState('');
  const [bagCount, setBagCount] = useState('');
  const [ratePerBag, setRatePerBag] = useState('7.50');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Bank Transfer / NEFT' | 'UPI' | 'Cheque'>('Cash');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'accrued_payable'>(
    isPurchase ? 'accrued_payable' : 'paid'
  );
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Quick preset options
  const purchasePresets = [
    { label: '📦 Hamali / उतराई', cat: 'hamali_loading' as ExpenseCategory, title: 'Unloading Hamali & Stacking' },
    { label: '⚖️ Tolai / काटा', cat: 'weighbridge' as ExpenseCategory, title: 'Electronic Weighbridge (Dharam Kanta)' },
    { label: '🚛 Inward Freight / भाडे', cat: 'transport_freight' as ExpenseCategory, title: 'Tractor / Truck Inward Freight' },
    { label: '🌾 Bardana / बारदाना', cat: 'other' as ExpenseCategory, title: 'Bags & Jute Packaging (Bardana)' },
    { label: '🤝 Dalali / दलाली', cat: 'other' as ExpenseCategory, title: 'Mandi Commission & Brokerage' },
    { label: '🧪 Lab Testing', cat: 'fumigation_testing' as ExpenseCategory, title: 'Moisture & Oil Testing Fee' }
  ];

  const salePresets = [
    { label: '📦 Loading Hamali / चढाई', cat: 'hamali_loading' as ExpenseCategory, title: 'Dispatch Loading Hamali' },
    { label: '🚛 Outward Freight / भाडे', cat: 'transport_freight' as ExpenseCategory, title: 'Outward Delivery Freight' },
    { label: '⚖️ Weighment Slip', cat: 'weighbridge' as ExpenseCategory, title: 'Tare & Gross Weighbridge Slip' },
    { label: '🌾 Bagging / पॅकिंग', cat: 'other' as ExpenseCategory, title: 'Stacking & Bag Stitching' },
    { label: '🤝 Client Brokerage', cat: 'other' as ExpenseCategory, title: 'Brokerage / Sales Commission' },
    { label: '📋 Gate Pass / Cess', cat: 'other' as ExpenseCategory, title: 'Terminal Handling / Gate Pass' }
  ];

  const currentPresets = isPurchase ? purchasePresets : salePresets;

  const handleApplyPreset = (preset: typeof purchasePresets[0]) => {
    setCategory(preset.cat);
    setTitle(preset.title);
    if (preset.cat === 'hamali_loading') {
      setPaymentStatus('accrued_payable');
    } else {
      setPaymentStatus('paid');
    }
  };

  const handleAddCharge = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmt = parseFloat(amount);
    if (!title.trim()) {
      setError('Please enter a charge title or select a preset.');
      return;
    }

    if (isNaN(numAmt) || numAmt <= 0) {
      setError('Charge amount must be greater than zero.');
      return;
    }

    try {
      const isHamali = category === 'hamali_loading';
      const chargeData = {
        category,
        title: title.trim(),
        amount: numAmt,
        paid_to: paidTo.trim() || (isHamali ? 'Hamal Gang' : isPurchase ? 'Mandi Hamal Gang' : 'Transporter / Loader'),
        payment_mode: paymentMode,
        payment_status: paymentStatus,
        bag_count: isHamali ? (parseFloat(bagCount) || undefined) : undefined,
        rate_per_bag: isHamali ? (parseFloat(ratePerBag) || undefined) : undefined,
        notes: notes.trim() || undefined
      };

      if (isPurchase) {
        storage.addChargeToPurchase(target.id, chargeData);
      } else {
        storage.addChargeToSale(target.id, chargeData);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to attach charge.');
    }
  };

  const handleDeleteExistingCharge = (chargeId: string) => {
    if (isPurchase) {
      storage.removeChargeFromPurchase(target.id, chargeId);
    } else {
      storage.removeChargeFromSale(target.id, chargeId);
    }
    onSuccess();
  };

  const totalExistingCharges = (target.charges || []).reduce((acc, c) => acc + (c.amount || 0), 0);
  const newNumAmt = parseFloat(amount) || 0;
  const projectedTotalCharges = totalExistingCharges + newNumAmt;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200 overflow-hidden">
      <div 
        className="bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[94vh] sm:max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header (Fixed at top) */}
        <div className="p-4 sm:p-5 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-2">
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center font-bold flex-shrink-0 ${
              isPurchase 
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
            }`}>
              <Receipt className="w-5 h-5" />
            </div>
            <div className="min-w-0 truncate">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-tight truncate">
                Add Expense ({isPurchase ? 'Purchase' : 'Sale'})
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                {target.title} • {target.referenceNo ? `Ref: ${target.referenceNo}` : `Date: ${target.date}`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition flex-shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleAddCharge} className="flex-1 flex flex-col overflow-hidden min-h-0">
          
          {/* Scrollable Form Body */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 overscroll-contain space-y-4">

            {/* Transaction Snapshot Bar */}
            <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              {isPurchase ? 'Gross Purchase Value' : 'Gross Sale Value'}
            </span>
            <span className="text-base font-extrabold num-metric text-slate-900 dark:text-white">
              ₹{target.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Current Attached Charges
            </span>
            <span className="text-sm font-bold num-metric text-amber-600 dark:text-amber-400">
              ₹{totalExistingCharges.toLocaleString('en-IN')} ({(target.charges || []).length})
            </span>
          </div>
        </div>

        {/* Existing Charges List (If Any) */}
        {target.charges && target.charges.length > 0 && (
          <div className="mb-4 p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/60 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[11px] text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>Existing Charges on this Record</span>
              </span>
              <span className="text-[10px] font-semibold text-slate-400">
                Total: ₹{totalExistingCharges.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="space-y-1.5">
              {target.charges.map(chg => (
                <div 
                  key={chg.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{chg.title}</p>
                    <p className="text-[10px] text-slate-400">
                      Paid to: {chg.paid_to || 'Vendor'} • {chg.payment_mode || 'Cash'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-extrabold num-metric text-slate-900 dark:text-white whitespace-nowrap">
                      ₹{chg.amount.toLocaleString('en-IN')}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteExistingCharge(chg.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                      title="Remove charge"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Add New Charge Form Content */}
        <div className="space-y-3.5 text-xs">
          
          {/* Quick Presets */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase text-[10px] tracking-wider">
              Quick Mandi Charge Presets
            </label>
            <div className="flex flex-wrap gap-1.5">
              {currentPresets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition border ${
                    title === preset.title
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category & Title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Charge Category *
              </label>
              <select
                value={category}
                onChange={(e) => {
                  const cat = e.target.value as any;
                  setCategory(cat);
                  if (cat === 'hamali_loading') {
                    setPaymentStatus('accrued_payable');
                  }
                }}
                className="apple-input"
              >
                <option value="hamali_loading">📦 Hamali / Loading / Unloading</option>
                <option value="transport_freight">🚛 Freight & Transportation</option>
                <option value="weighbridge">⚖️ Weighbridge (Dharam Kanta)</option>
                <option value="fumigation_testing">🧪 Quality / Moisture / Testing</option>
                <option value="storage_maintenance">⚡ Yard Stacking / Handling</option>
                <option value="other">📋 Brokerage / Packaging / Other</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Charge Description *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Unloading Hamali (हमाली)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="apple-input font-medium"
              />
            </div>
          </div>

          {/* Hamali Bags & Rate Per Bag */}
          {category === 'hamali_loading' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-300/60 dark:border-amber-700/60">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Bags Handled (नग / पोती)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g. 200"
                  value={bagCount}
                  onChange={(e) => {
                    const bags = e.target.value;
                    setBagCount(bags);
                    const b = parseFloat(bags) || 0;
                    const r = parseFloat(ratePerBag) || 0;
                    if (b > 0 && r > 0) {
                      setAmount((b * r).toFixed(2));
                    }
                  }}
                  className="apple-input font-bold num-metric"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Rate / Bag (दर ₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.25"
                  placeholder="7.50"
                  value={ratePerBag}
                  onChange={(e) => {
                    const rate = e.target.value;
                    setRatePerBag(rate);
                    const b = parseFloat(bagCount) || 0;
                    const r = parseFloat(rate) || 0;
                    if (b > 0 && r > 0) {
                      setAmount((b * r).toFixed(2));
                    }
                  }}
                  className="apple-input font-bold num-metric"
                />
              </div>
            </div>
          )}

          {/* Amount & Paid To */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Amount (₹) *
              </label>
              <div className="input-group">
                <span className="input-prefix">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  placeholder="1500"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="font-extrabold num-metric text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {category === 'hamali_loading' ? 'Hamal Partner / Gang (हमाल कामगार)' : 'Paid To / Recipient'}
              </label>
              {category === 'hamali_loading' && hamalPartners.length > 0 ? (
                <select
                  value={paidTo}
                  onChange={(e) => setPaidTo(e.target.value)}
                  className="apple-input"
                >
                  <option value="">Select Hamal Partner</option>
                  {hamalPartners.map(h => (
                    <option key={h.id} value={h.name}>{h.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder={category === 'hamali_loading' ? "e.g. Hemat Kumar" : "e.g. Mathadi Union / Transporter"}
                  value={paidTo}
                  onChange={(e) => setPaidTo(e.target.value)}
                  className="apple-input"
                />
              )}
            </div>
          </div>

          {/* Mode & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Payment Mode
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as any)}
                className="apple-input"
              >
                <option value="Cash">Cash (रोकड)</option>
                <option value="UPI">UPI / GPay / PhonePe</option>
                <option value="Bank Transfer / NEFT">Bank Transfer / NEFT</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Payment Status
              </label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as any)}
                className="apple-input"
              >
                <option value="accrued_payable">⏳ Weekly Payout Due (आठवडी बाकी - देय)</option>
                <option value="paid">✅ Paid immediately (रोख चुकती)</option>
              </select>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Voucher Notes (Slip no, tractor no, rate per bag)
            </label>
            <input
              type="text"
              placeholder="e.g. ₹10 per bag for 150 bags, slip attached"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="apple-input text-xs"
            />
          </div>

          {/* Dynamic Financial Impact Preview */}
          <div className="p-3 rounded-2xl bg-blue-50/80 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/60 flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-blue-900 dark:text-blue-300 block">
                {isPurchase ? 'Total Landed Inward Cost:' : 'Net Sale Realization After Charges:'}
              </span>
              <p className="text-[11px] text-slate-500">
                {isPurchase 
                  ? `Gross ₹${target.amount.toLocaleString('en-IN')} + Charges ₹${projectedTotalCharges.toLocaleString('en-IN')}` 
                  : `Gross ₹${target.amount.toLocaleString('en-IN')} - Charges ₹${projectedTotalCharges.toLocaleString('en-IN')}`}
              </p>
            </div>
            <div className="text-right">
              <span className="text-base font-black num-metric text-blue-700 dark:text-blue-300">
                ₹{isPurchase 
                  ? (target.amount + projectedTotalCharges).toLocaleString('en-IN') 
                  : (target.amount - projectedTotalCharges).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

            </div>

          </div>

          {/* Sticky Modal Actions (Mobile Optimized) */}
          <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 flex-shrink-0 bg-white dark:bg-slate-900 flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-end gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="apple-btn-secondary w-full sm:w-auto justify-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`apple-btn-primary w-full sm:w-auto justify-center ${
                isPurchase 
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/25' 
                  : 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/25'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Attach Charge</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
