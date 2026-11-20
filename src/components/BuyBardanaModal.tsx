import React, { useState } from 'react';
import { 
  X, 
  Package, 
  Calendar, 
  Warehouse, 
  DollarSign, 
  Hash, 
  CreditCard, 
  CheckCircle, 
  AlertCircle,
  ShoppingBag,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Yard, Party, UserProfile } from '../types';
import { storage } from '../services/storage';

interface BuyBardanaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  yards: Yard[];
  parties: Party[];
  activeUser: UserProfile;
  preselectedYardId?: string;
}

export const BARDANA_TYPES = [
  { 
    id: '🌾 Jute Gunny (ताग)', 
    label: '🌾 Jute Gunny Bag (ताग बारदान)',
    sublabel: 'Natural Jute / ताग पोती (50kg / 100kg)'
  },
  { 
    id: '⚪ Plastic / HDPE (प्लास्टिक)', 
    label: '⚪ Plastic / HDPE Bag (प्लास्टिक बारदान)',
    sublabel: 'Synthetic Woven / प्लास्टिक कट्टा'
  },
];

export const BuyBardanaModal: React.FC<BuyBardanaModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  yards,
  parties,
  activeUser,
  preselectedYardId
}) => {
  if (!isOpen) return null;

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [bardanaType, setBardanaType] = useState(BARDANA_TYPES[0].id);
  const [bagCondition, setBagCondition] = useState<'new' | 'used'>('new');
  const [qtyBags, setQtyBags] = useState<string>('');
  const [ratePerBag, setRatePerBag] = useState<string>('');
  const [yardId, setYardId] = useState<string>(preselectedYardId || yards[0]?.id || '');
  const [supplierName, setSupplierName] = useState<string>('');
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Bank Transfer / NEFT' | 'UPI' | 'Cheque'>('Bank Transfer / NEFT');
  const [recordAsExpense, setRecordAsExpense] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const numQty = parseInt(qtyBags, 10) || 0;
  const numRate = parseFloat(ratePerBag) || 0;
  const totalAmount = numQty > 0 && numRate > 0 ? Number((numQty * numRate).toFixed(2)) : 0;

  const handleTypeChange = (typeId: string) => {
    setBardanaType(typeId);
  };

  const handleAddQty = (delta: number) => {
    const current = parseInt(qtyBags, 10) || 0;
    setQtyBags((current + delta).toString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (numQty <= 0) {
      setError('Please enter a valid quantity of bags (greater than 0).');
      return;
    }

    if (numRate <= 0) {
      setError('Please enter a valid purchase rate per bag.');
      return;
    }

    if (!yardId) {
      setError('Please select a storage yard/shed for the Bardana bags.');
      return;
    }

    storage.addBardanaPurchase({
      date,
      bardana_type: bardanaType,
      bag_condition: bagCondition,
      qty_bags: numQty,
      rate_per_bag: numRate,
      total_amount: totalAmount,
      yard_id: yardId,
      party_name: supplierName.trim() || 'Bardana Supplier',
      reference_no: referenceNo.trim() || undefined,
      notes: notes.trim() || undefined,
      created_by_name: activeUser.name,
      record_as_expense: recordAsExpense
    });

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 }
    });

    onSuccess();
    onClose();
  };

  const selectedYard = yards.find(y => y.id === yardId);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-hidden">
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl max-h-[94vh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (Fixed at top) */}
        <div className="p-4 sm:p-5 pb-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner flex-shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5 sm:gap-2">
                <span>Purchase Bardana</span>
                <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  बारदान
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden xs:block">
                Inward packaging bags (gunny/HDPE) to live yard stock
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden min-h-0">
          
          {/* Scrollable Form Body */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 overscroll-contain space-y-4">
            {error && (
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Date & Destination Yard */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Purchase Date (तारीख)</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="form-input text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1.5">
                <Warehouse className="w-3.5 h-3.5 text-slate-400" />
                <span>Stack in Yard / Shed (साठा जागा)</span>
              </label>
              <select
                value={yardId}
                onChange={(e) => setYardId(e.target.value)}
                className="form-input text-xs"
                required
              >
                {yards.map(y => (
                  <option key={y.id} value={y.id}>
                    {y.name} ({y.type === 'apmc_shed' ? 'APMC Shed' : 'Personal Godown'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Bardana Type */}
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-slate-400" />
              <span>Bardana Type (बारदान प्रकार)</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {BARDANA_TYPES.map(type => (
                <button
                  type="button"
                  key={type.id}
                  onClick={() => handleTypeChange(type.id)}
                  className={`text-left p-3 rounded-2xl border text-xs font-semibold transition flex flex-col justify-between cursor-pointer ${
                    bardanaType === type.id
                      ? 'bg-amber-500/10 border-amber-500 text-amber-950 dark:text-amber-200 ring-2 ring-amber-500/20 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/30'
                  }`}
                >
                  <span className="font-bold text-slate-900 dark:text-white">{type.label}</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {type.sublabel}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Condition toggle */}
          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="text-slate-600 dark:text-slate-400">Bag Condition:</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="bagCondition"
                value="new"
                checked={bagCondition === 'new'}
                onChange={() => setBagCondition('new')}
                className="text-amber-500 focus:ring-amber-500"
              />
              <span>New (नवीन बारदान)</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="bagCondition"
                value="used"
                checked={bagCondition === 'used'}
                onChange={() => setBagCondition('used')}
                className="text-amber-500 focus:ring-amber-500"
              />
              <span>Used / 2nd Hand (जुने बारदान)</span>
            </label>
          </div>

          {/* Quantity & Rate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Quantity (नग / Bags) *
                </label>
                <div className="flex gap-1 text-[10px]">
                  <button type="button" onClick={() => handleAddQty(100)} className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 font-bold cursor-pointer">+100</button>
                  <button type="button" onClick={() => handleAddQty(500)} className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 font-bold cursor-pointer">+500</button>
                  <button type="button" onClick={() => handleAddQty(1000)} className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 font-bold cursor-pointer">+1k</button>
                </div>
              </div>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={qtyBags}
                onChange={(e) => setQtyBags(e.target.value)}
                placeholder="e.g. 500"
                className="form-input text-sm font-black"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Rate per Bag (₹ / नग) *
              </label>
              <div className="input-group">
                <span className="input-prefix">₹</span>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  required
                  value={ratePerBag}
                  onChange={(e) => setRatePerBag(e.target.value)}
                  placeholder="e.g. 65"
                  className="text-sm font-black"
                />
              </div>
            </div>

            {/* Total Calculated Outlay banner */}
            <div className="sm:col-span-2 pt-2 border-t border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Total Purchase Value:</span>
              <span className="text-base font-black text-amber-600 dark:text-amber-400 num-metric">
                {totalAmount > 0 ? `₹${totalAmount.toLocaleString('en-IN')}` : '₹0'}
              </span>
            </div>
          </div>

          {/* Supplier & Invoice */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                Supplier / Vendor (विक्रेता)
              </label>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="e.g. Shree Ganesh Packaging"
                className="form-input text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                Bill / Invoice No (बिल क्र.)
              </label>
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="e.g. INV-BARD-1044"
                className="form-input text-xs"
              />
            </div>
          </div>

          {/* Payment Mode & Option to record as operating expense */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-center">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                Payment Mode
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as any)}
                className="form-input text-xs"
              >
                <option value="Cash">Cash (रोख)</option>
                <option value="Bank Transfer / NEFT">Bank Transfer / NEFT</option>
                <option value="UPI">UPI / PhonePe / GPay</option>
                <option value="Cheque">Cheque (धनादेश)</option>
              </select>
            </div>

            <div className="pt-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={recordAsExpense}
                  onChange={(e) => setRecordAsExpense(e.target.checked)}
                  className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 w-4 h-4"
                />
                <span>Record in Operating Expenses register (खर्चात नोंदवा)</span>
              </label>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
              Notes / शेरा
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Standard 50kg capacity for soybean dispatch"
              className="form-input text-xs"
            />
          </div>

          </div>

          {/* Sticky Actions Footer (Mobile Optimized) */}
          <div className="p-3.5 sm:p-4 border-t border-slate-200 dark:border-slate-800 flex-shrink-0 bg-white dark:bg-slate-900 flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-end gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition w-full sm:w-auto text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/25 transition active:scale-95 flex items-center justify-center gap-1.5 w-full sm:w-auto"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Confirm & Add to Stock</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
