import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, AlertCircle, Warehouse, Package, Truck, ArrowRight, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Yard, Material, UserProfile } from '../types';
import { storage } from '../services/storage';

interface YardShiftingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  yards: Yard[];
  materials: Material[];
  activeUser: UserProfile;
  preselected?: {
    material_id?: string;
    from_yard_id?: string;
  };
}

export const YardShiftingModal: React.FC<YardShiftingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  yards,
  materials,
  activeUser,
  preselected
}) => {
  if (!isOpen) return null;

  // Default From Yard: First APMC Shed if available, else first yard
  const defaultFromYard = yards.find(y => y.type === 'apmc_shed') || yards[0];
  // Default To Yard: First Personal Yard if available, else second yard
  const defaultToYard = yards.find(y => y.type === 'personal_yard') || yards[1] || yards[0];

  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [materialId, setMaterialId] = useState(preselected?.material_id || materials[0]?.id || '');
  const [fromYardId, setFromYardId] = useState(preselected?.from_yard_id || defaultFromYard?.id || '');
  const [toYardId, setToYardId] = useState(defaultToYard?.id || '');
  const [qtyQuintals, setQtyQuintals] = useState<string>('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [transportCost, setTransportCost] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Available stock in the source yard
  const [availableStock, setAvailableStock] = useState<number>(0);

  useEffect(() => {
    if (fromYardId && materialId) {
      const stock = storage.getAvailableStockInYard(fromYardId, materialId);
      setAvailableStock(stock);
    }
  }, [fromYardId, materialId]);

  // Handle source yard change
  const handleFromYardChange = (id: string) => {
    setFromYardId(id);
    if (id === toYardId) {
      // Pick another yard
      const other = yards.find(y => y.id !== id);
      if (other) setToYardId(other.id);
    }
  };

  const numQty = parseFloat(qtyQuintals) || 0;

  const handleSetMax = () => {
    if (availableStock > 0) {
      setQtyQuintals(availableStock.toString());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fromYardId || !toYardId || !materialId) {
      setError('Please select Material, Source Yard, and Destination Yard.');
      return;
    }

    if (fromYardId === toYardId) {
      setError('Source Yard and Destination Yard cannot be the same!');
      return;
    }

    if (numQty <= 0) {
      setError('Quantity to shift must be greater than zero.');
      return;
    }

    if (numQty > availableStock) {
      setError(`Cannot shift! Available in source yard: ${availableStock.toFixed(2)} Quintals, Attempted: ${numQty.toFixed(2)} Quintals.`);
      return;
    }

    const result = storage.addYardTransfer({
      transfer_date: transferDate,
      material_id: materialId,
      from_yard_id: fromYardId,
      to_yard_id: toYardId,
      qty_quintals: numQty,
      vehicle_no: vehicleNo.trim() || undefined,
      transport_cost: parseFloat(transportCost) || 0,
      notes: notes.trim() || undefined,
      created_by_name: activeUser.name
    });

    if (!result.success) {
      setError(result.error || 'Failed to shift stock.');
      return;
    }

    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.6 }
    });

    onSuccess();
    onClose();
  };

  const fromYard = yards.find(y => y.id === fromYardId);
  const toYard = yards.find(y => y.id === toYardId);
  const selectedMaterial = materials.find(m => m.id === materialId);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-hidden">
      <div 
        className="w-full max-w-xl bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl max-h-[94vh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header (Fixed at top) */}
        <div className="p-4 sm:p-5 pb-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Yard Shifting <span className="text-xs font-normal text-slate-400 hidden sm:inline">(Shed ➔ Godown)</span>
              </h2>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5 hidden xs:block">
              Move stored produce between APMC sheds and personal yards
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden min-h-0">
          
          {/* Scrollable Form Body */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 overscroll-contain space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Commodity & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1.5 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-neutral-400" />
                Commodity to Shift
              </label>
              <select
                value={materialId}
                onChange={(e) => setMaterialId(e.target.value)}
                className="apple-input font-medium"
              >
                {materials.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.local_name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1.5">
                Shifting Date
              </label>
              <input
                type="date"
                required
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          {/* Visual Route Flow Box (Apple Cupertino Style) */}
          <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
              Shifting Direction
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative">
              {/* FROM */}
              <div className="p-3 rounded-xl bg-white/80 dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/80">
                <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">Source (Origin)</span>
                <select
                  value={fromYardId}
                  onChange={(e) => handleFromYardChange(e.target.value)}
                  className="w-full mt-1 bg-transparent text-xs font-bold text-neutral-900 dark:text-white outline-none border-b border-neutral-300 dark:border-neutral-700 pb-1"
                >
                  <optgroup label="APMC Market Sheds">
                    {yards.filter(y => y.type === 'apmc_shed').map(y => (
                      <option key={y.id} value={y.id}>{y.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Personal Yards">
                    {yards.filter(y => y.type === 'personal_yard').map(y => (
                      <option key={y.id} value={y.id}>{y.name}</option>
                    ))}
                  </optgroup>
                </select>

                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-neutral-500">Available:</span>
                  <span className="font-bold num-metric text-indigo-600 dark:text-indigo-400">
                    {availableStock.toFixed(2)} Qtl
                  </span>
                </div>
              </div>

              {/* TO */}
              <div className="p-3 rounded-xl bg-white/80 dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/80">
                <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">Destination (Target)</span>
                <select
                  value={toYardId}
                  onChange={(e) => setToYardId(e.target.value)}
                  className="w-full mt-1 bg-transparent text-xs font-bold text-neutral-900 dark:text-white outline-none border-b border-neutral-300 dark:border-neutral-700 pb-1"
                >
                  <optgroup label="Personal Godowns (Recommended)">
                    {yards.filter(y => y.type === 'personal_yard' && y.id !== fromYardId).map(y => (
                      <option key={y.id} value={y.id}>{y.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Other APMC Sheds">
                    {yards.filter(y => y.type === 'apmc_shed' && y.id !== fromYardId).map(y => (
                      <option key={y.id} value={y.id}>{y.name}</option>
                    ))}
                  </optgroup>
                </select>

                <p className="mt-2 text-[11px] text-neutral-400">
                  Stock will be added here
                </p>
              </div>
            </div>

            {/* Dynamic Arrow */}
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              <span>{fromYard?.name.split('(')[0]}</span>
              <ArrowRight className="w-4 h-4" />
              <span>{toYard?.name.split('(')[0]}</span>
            </div>
          </div>

          {/* Quantity to Shift */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                Quantity to Shift (Quintals) *
              </label>
              {availableStock > 0 && (
                <button
                  type="button"
                  onClick={handleSetMax}
                  className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Shift All Available ({availableStock.toFixed(2)} Qtl)
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={availableStock}
                required
                placeholder="e.g. 100.00"
                value={qtyQuintals}
                onChange={(e) => setQtyQuintals(e.target.value)}
                className={`apple-input num-metric text-base font-bold ${!qtyQuintals ? 'pr-14' : 'pr-3'}`}
              />
              {!qtyQuintals && (
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400 pointer-events-none">
                  Qtl
                </span>
              )}
            </div>
            {availableStock === 0 && (
              <p className="text-[11px] text-rose-500 font-semibold mt-1">
                Zero stock of {selectedMaterial?.name} in {fromYard?.name}. Cannot shift.
              </p>
            )}
          </div>

          {/* Vehicle & Cost */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1.5 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-neutral-400" />
                Tractor / Tempo No.
              </label>
              <input
                type="text"
                placeholder="e.g. MH-20-TR-4567"
                value={vehicleNo}
                onChange={(e) => setVehicleNo(e.target.value)}
                className="form-input"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1.5">
                Transport Freight Cost (₹ Optional)
              </label>
              <div className="input-group">
                <span className="input-prefix">
                  ₹
                </span>
                <input
                  type="number"
                  placeholder="1500"
                  value={transportCost}
                  onChange={(e) => setTransportCost(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1.5">
              Reason / Shifting Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Shed #4 cleared for tomorrow's auction arrivals"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="apple-input text-xs"
            />
          </div>

            {/* User Footnote */}
            <p className="text-[11px] text-neutral-400 flex items-center justify-between pt-1">
              <span>Shift recorded by: <strong>{activeUser.name}</strong></span>
              <span>Atomic Stock Shift</span>
            </p>

          </div>

          {/* Sticky Actions Footer (Mobile Optimized) */}
          <div className="p-3.5 sm:p-4 border-t border-neutral-200 dark:border-neutral-800 flex-shrink-0 bg-white dark:bg-slate-900 flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-end gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="apple-btn-secondary w-full sm:w-auto justify-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={availableStock <= 0}
              className={`apple-btn-primary w-full sm:w-auto justify-center ${
                availableStock <= 0 
                  ? 'opacity-50 cursor-not-allowed bg-neutral-400' 
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500'
              }`}
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Confirm & Transfer Stock</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
