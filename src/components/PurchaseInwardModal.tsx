import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  AlertCircle,
  Calendar,
  Package,
  Warehouse,
  User,
  Truck,
  FileText,
  Landmark,
  Building2,
  MapPin,
  Check,
  ChevronDown,
  Trash2,
  Receipt,
  Search
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Yard, Material, Party, UserProfile, MarketCategory, ExpenseCategory } from '../types';
import { storage } from '../services/storage';

interface PurchaseInwardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  yards: Yard[];
  materials: Material[];
  parties: Party[];
  activeUser: UserProfile;
  preselectedPartyId?: string;
}

export const PurchaseInwardModal: React.FC<PurchaseInwardModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  yards,
  materials,
  parties,
  activeUser,
  preselectedPartyId
}) => {
  if (!isOpen) return null;

  const sellerParties = parties.filter(p => p.type === 'apmc_seller');
  const defaultYard = yards.find(y => y.type === 'apmc_shed') || yards[0];

  // Core Form State
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [partyId, setPartyId] = useState(
    preselectedPartyId && sellerParties.some(p => p.id === preselectedPartyId)
      ? preselectedPartyId
      : sellerParties[0]?.id || ''
  );
  const [materialId, setMaterialId] = useState(materials[0]?.id || '');
  const [yardId, setYardId] = useState(defaultYard?.id || '');

  // Market Category & Mandi Location
  const [marketCategory, setMarketCategory] = useState<MarketCategory>('government');
  const [marketLocation, setMarketLocation] = useState<string>('Nagpur (Kalamna Govt APMC)');

  // Quantities & Rates
  const [qtyQuintals, setQtyQuintals] = useState<string>('');
  const [ratePerQuintal, setRatePerQuintal] = useState<string>('');

  // Transport & Logistics
  const [vehicleNo, setVehicleNo] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Single active dropdown for all searchable comboboxes
  type DropdownType = 'seller' | 'material' | 'yard' | null;
  const [activeDropdown, setActiveDropdown] = useState<DropdownType>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.searchable-dropdown-root')) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Additional Charges state (Hamali, Tolai, Freight, Bardana)
  interface InwardChargeItem {
    category: ExpenseCategory;
    title: string;
    amount: string;
    paid_to: string;
    payment_status: 'paid' | 'accrued_payable';
  }
  const [charges, setCharges] = useState<InwardChargeItem[]>([]);
  const [showAddCharge, setShowAddCharge] = useState(false);
  const [newChargeCat, setNewChargeCat] = useState<ExpenseCategory>('hamali_loading');
  const [newChargeTitle, setNewChargeTitle] = useState('');
  const [newChargeAmount, setNewChargeAmount] = useState('');
  const [newChargePaidTo, setNewChargePaidTo] = useState('');
  const [newChargeStatus, setNewChargeStatus] = useState<'paid' | 'accrued_payable'>('paid');

  const numQty = parseFloat(qtyQuintals) || 0;
  const numRate = parseFloat(ratePerQuintal) || 0;
  const totalAmount = numQty * numRate;
  const feePercent = marketCategory === 'government' ? 0.85 : 0.55;
  const marketFeeAmount = Number((totalAmount * (feePercent / 100)).toFixed(2));

  const totalChargesAmount = charges.reduce((acc, c) => acc + (parseFloat(c.amount) || 0), 0);
  const totalLandedCost = totalAmount + marketFeeAmount + totalChargesAmount;

  const handleAddChargeItem = () => {
    const amt = parseFloat(newChargeAmount);
    if (!newChargeTitle.trim() || isNaN(amt) || amt <= 0) return;
    setCharges(prev => [
      ...prev,
      {
        category: newChargeCat,
        title: newChargeTitle.trim(),
        amount: newChargeAmount,
        paid_to: newChargePaidTo.trim(),
        payment_status: newChargeStatus
      }
    ]);
    setNewChargeTitle('');
    setNewChargeAmount('');
    setNewChargePaidTo('');
    setShowAddCharge(false);
  };

  const handleRemoveCharge = (index: number) => {
    setCharges(prev => prev.filter((_, idx) => idx !== index));
  };

  // Handle market category switch
  const handleMarketCategoryChange = (category: MarketCategory) => {
    setMarketCategory(category);
    if (category === 'government') {
      setMarketLocation('Nagpur (Kalamna Govt APMC)');
    } else {
      setMarketLocation('Nagpur (Private APMC Yard)');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!materialId || !yardId || !partyId) {
      setError('Please select APMC Seller, Commodity, and Receiving Yard.');
      return;
    }

    if (numQty <= 0) {
      setError('Quantity in Quintals must be greater than zero.');
      return;
    }

    if (numRate <= 0) {
      setError('Purchase Rate per Quintal must be entered.');
      return;
    }

    try {
      storage.addPurchase({
        purchase_date: purchaseDate,
        material_id: materialId,
        yard_id: yardId,
        party_id: partyId,
        qty_quintals: numQty,
        rate_per_quintal: numRate,
        market_category: marketCategory,
        market_location: marketLocation.trim() || 'Nagpur',
        market_fee_percent: feePercent,
        market_fee_amount: marketFeeAmount,
        market_fee_paid: false,
        charges: charges.map((c, idx) => ({
          id: `chg-p-${Date.now()}-${idx}`,
          category: c.category,
          title: c.title,
          amount: parseFloat(c.amount) || 0,
          paid_to: c.paid_to || 'Hamal / Transporter',
          payment_mode: 'Cash',
          payment_status: c.payment_status,
          created_at: new Date().toISOString()
        })),
        vehicle_no: vehicleNo.trim() || undefined,
        lot_number: lotNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        created_by_name: activeUser.name
      });

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to record purchase inward.');
    }
  };

  // Filter helpers for searchable dropdowns
  const filteredSellers = sellerParties.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.city && s.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (s.phone && s.phone.includes(searchQuery))
  );

  const filteredMaterials = materials.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.local_name && m.local_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (m.grade && m.grade.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredYards = yards.filter(y =>
    y.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (y.location && y.location.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const selectedYard = yards.find(y => y.id === yardId);
  const selectedMaterial = materials.find(m => m.id === materialId);
  const selectedSeller = sellerParties.find(p => p.id === partyId);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-hidden">
      <div
        className="w-full max-w-xl bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl max-h-[94vh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (Fixed at top) */}
        <div className="p-4 sm:p-5 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Stock Inward (Purchase)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden min-h-0">
          
          {/* Scrollable Form Body */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 overscroll-contain space-y-3">
            {error && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Row 1: Searchable Seller / Commission Agent & Purchase Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

            {/* Seller Searchable Dropdown */}
            <div className="relative searchable-dropdown-root">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>APMC Seller / Adat *</span>
              </label>

              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveDropdown(activeDropdown === 'seller' ? null : 'seller');
                }}
                className="w-full h-10 px-3 text-left rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 flex items-center justify-between text-xs transition"
              >
                <span className="font-semibold text-slate-900 dark:text-white truncate pr-2">
                  {selectedSeller ? `${selectedSeller.name}${selectedSeller.city ? ` (${selectedSeller.city})` : ''}` : 'Select APMC Seller'}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
              </button>

              {activeDropdown === 'seller' && (
                <div className="absolute top-full left-0 right-0 mt-1 max-h-52 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-40 p-1.5 space-y-1">
                  <div className="p-1 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        autoFocus
                        placeholder="Search seller name, city, phone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 border-none outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="py-0.5 space-y-0.5">
                    {filteredSellers.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setPartyId(p.id);
                          setActiveDropdown(null);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition flex items-center justify-between ${
                          partyId === p.id
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <span className="truncate pr-2">{p.name} {p.city ? `(${p.city})` : ''}</span>
                        {partyId === p.id && <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />}
                      </button>
                    ))}
                    {filteredSellers.length === 0 && (
                      <p className="p-2 text-center text-slate-400 text-xs">No sellers match</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Purchase Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Purchase Date</span>
              </label>
              <input
                type="date"
                required
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="apple-input h-10 text-xs"
              />
            </div>
          </div>

          {/* Row 2: Searchable Commodity & Searchable Receiving Yard */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

            {/* Commodity Searchable Dropdown */}
            <div className="relative searchable-dropdown-root">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-slate-400" />
                <span>Commodity *</span>
              </label>

              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveDropdown(activeDropdown === 'material' ? null : 'material');
                }}
                className="w-full h-10 px-3 text-left rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 flex items-center justify-between text-xs transition"
              >
                <span className="font-semibold text-slate-900 dark:text-white truncate pr-2">
                  {selectedMaterial ? `${selectedMaterial.name} (${selectedMaterial.local_name})` : 'Select Commodity'}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
              </button>

              {activeDropdown === 'material' && (
                <div className="absolute top-full left-0 right-0 mt-1 max-h-52 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-40 p-1.5 space-y-1">
                  <div className="p-1 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        autoFocus
                        placeholder="Search commodity name or grade..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 border-none outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="py-0.5 space-y-0.5">
                    {filteredMaterials.map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setMaterialId(m.id);
                          setActiveDropdown(null);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition flex items-center justify-between ${
                          materialId === m.id
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <span className="truncate pr-2">{m.name} ({m.local_name})</span>
                        {materialId === m.id && <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />}
                      </button>
                    ))}
                    {filteredMaterials.length === 0 && (
                      <p className="p-2 text-center text-slate-400 text-xs">No commodity match</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Receiving Yard Searchable Dropdown */}
            <div className="relative searchable-dropdown-root">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Warehouse className="w-3.5 h-3.5 text-slate-400" />
                <span>Receiving Yard / Shed *</span>
              </label>

              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveDropdown(activeDropdown === 'yard' ? null : 'yard');
                }}
                className="w-full h-10 px-3 text-left rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 flex items-center justify-between text-xs transition"
              >
                <span className="font-semibold text-slate-900 dark:text-white truncate pr-2">
                  {selectedYard?.name || 'Select Yard'}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
              </button>

              {activeDropdown === 'yard' && (
                <div className="absolute top-full left-0 right-0 mt-1 max-h-52 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-40 p-1.5 space-y-1">
                  <div className="p-1 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        autoFocus
                        placeholder="Search yard, shed or godown..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 border-none outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="py-0.5 space-y-0.5">
                    {filteredYards.map(y => (
                      <button
                        key={y.id}
                        type="button"
                        onClick={() => {
                          setYardId(y.id);
                          setActiveDropdown(null);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition flex items-center justify-between ${
                          yardId === y.id
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <span className="truncate pr-2">{y.name}</span>
                        <span className="text-[10px] text-slate-400 flex-shrink-0">
                          {y.type === 'apmc_shed' ? 'APMC Shed' : 'Personal Yard'}
                        </span>
                      </button>
                    ))}
                    {filteredYards.length === 0 && (
                      <p className="p-2 text-center text-slate-400 text-xs">No yards match</p>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Row 3: Modern Compact Segmented APMC Market Type & Mandi Location */}
          <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                APMC Market Type (बाजार प्रकार)
              </label>
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                Nagpur Market Division
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleMarketCategoryChange('government')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
                  marketCategory === 'government'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <Landmark className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Govt APMC (0.85%)</span>
              </button>

              <button
                type="button"
                onClick={() => handleMarketCategoryChange('private')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
                  marketCategory === 'private'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Private APMC (0.55%)</span>
              </button>
            </div>

            <div className="flex items-center gap-2 pt-0.5">
              <span className="text-[11px] font-semibold text-slate-400 flex-shrink-0 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Mandi:
              </span>
              <input
                type="text"
                value={marketLocation}
                onChange={(e) => setMarketLocation(e.target.value)}
                placeholder="e.g. Nagpur (Kalamna Govt APMC)"
                className="w-full text-xs font-medium py-1 px-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Row 4: Purchase Quantity & Purchase Rate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Purchase Quantity (Quintals) *
              </label>
              <div className="input-group">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="150.50"
                  value={qtyQuintals}
                  onChange={(e) => setQtyQuintals(e.target.value)}
                  className="num-metric text-sm font-bold"
                />
                <span className="input-suffix">
                  Qtl
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Purchase Rate (₹/Qtl) *
              </label>
              <div className="input-group">
                <span className="input-prefix">
                  ₹
                </span>
                <input
                  type="number"
                  step="1"
                  min="1"
                  required
                  placeholder="4800"
                  value={ratePerQuintal}
                  onChange={(e) => setRatePerQuintal(e.target.value)}
                  className="num-metric text-sm font-bold"
                />
              </div>
            </div>
          </div>

          {/* Consolidated Summary Bar: Gross Value + APMC Cess + Landed Outlay */}
          <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Total Purchase Value (Gross)</p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                  {numQty > 0 && numRate > 0 ? `${numQty.toFixed(2)} Qtl × ₹${numRate.toLocaleString('en-IN')}` : 'Enter quantity and rate'}
                </p>
              </div>
              <div className="text-right">
                <span className="text-lg font-black num-metric text-emerald-700 dark:text-emerald-300">
                  ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between pt-2 border-t border-emerald-200/60 dark:border-emerald-800/40 text-xs gap-y-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  APMC Cess ({feePercent}%):
                </span>
                <span className="font-bold text-slate-900 dark:text-white num-metric">
                  +₹{marketFeeAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                  Year-End Due
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Total Landed:
                </span>
                <span className="font-extrabold text-emerald-800 dark:text-emerald-200 num-metric">
                  ₹{totalLandedCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                {numQty > 0 && (
                  <span className="text-[10px] text-slate-400">
                    (₹{Math.round(totalLandedCost / numQty).toLocaleString('en-IN')}/Qtl)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Inward Handling Charges Section */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-amber-600" />
                <span>Inward Charges & Handling (हमाली, तोलाई, भाडे)</span>
              </span>

              <button
                type="button"
                onClick={() => setShowAddCharge(!showAddCharge)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Charge</span>
              </button>
            </div>

            {/* Inline Add Charge Form */}
            {showAddCharge && (
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-300/80 dark:border-amber-700/80 space-y-2.5 text-xs animate-in fade-in duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Category</label>
                    <select
                      value={newChargeCat}
                      onChange={(e) => setNewChargeCat(e.target.value as any)}
                      className="apple-input h-10 text-xs font-medium px-3 py-2 leading-normal"
                    >
                      <option value="hamali_loading">📦 Unloading / Hamali (उतराई)</option>
                      <option value="weighbridge">⚖️ Weighbridge / Tolai (काटा)</option>
                      <option value="transport_freight">🚛 Freight / Transport (भाडे)</option>
                      <option value="other">🌾 Bardana / Other (बारदाना/इतर)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Description *</label>
                    <input
                      type="text"
                      placeholder="e.g. Unloading Hamali"
                      value={newChargeTitle}
                      onChange={(e) => setNewChargeTitle(e.target.value)}
                      className="apple-input h-10 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Amount (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 1500"
                      value={newChargeAmount}
                      onChange={(e) => setNewChargeAmount(e.target.value)}
                      className="apple-input h-10 text-xs font-bold num-metric"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Paid To</label>
                    <input
                      type="text"
                      placeholder="e.g. Hamal Gang / Driver"
                      value={newChargePaidTo}
                      onChange={(e) => setNewChargePaidTo(e.target.value)}
                      className="apple-input h-10 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Payment Status</label>
                    <select
                      value={newChargeStatus}
                      onChange={(e) => setNewChargeStatus(e.target.value as any)}
                      className="apple-input h-10 text-xs font-medium px-3 py-2 leading-normal"
                    >
                      <option value="paid">✅ Paid (रोकड)</option>
                      <option value="accrued_payable">⏳ Payable (देय)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddCharge(false)}
                    className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddChargeItem}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    Attach Charge
                  </button>
                </div>
              </div>
            )}

            {/* List of Attached Charges */}
            {charges.length > 0 ? (
              <div className="space-y-1.5 pt-1">
                {charges.map((chg, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                  >
                    <div className="truncate pr-2">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{chg.title}</span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ml-1.5 ${
                        chg.payment_status === 'paid'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        {chg.payment_status === 'paid' ? 'Paid' : 'Payable'}
                      </span>
                      {chg.paid_to && <span className="text-[10px] text-slate-400 ml-1.5">• {chg.paid_to}</span>}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-bold text-slate-900 dark:text-white num-metric">
                        +₹{parseFloat(chg.amount || '0').toLocaleString('en-IN')}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCharge(idx)}
                        className="text-slate-400 hover:text-rose-500 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : !showAddCharge && (
              <p className="text-[11px] text-slate-400 italic">
                No extra charges attached. Click "+ Add Charge" to add Hamali, Tolai, or Freight.
              </p>
            )}
          </div>

          {/* Row 6: Vehicle No. & Mandi Lot/Invoice No. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-slate-400" />
                <span>Vehicle / Tractor No.</span>
              </label>
              <input
                type="text"
                placeholder="e.g. MH-31-AB-1234"
                value={vehicleNo}
                onChange={(e) => setVehicleNo(e.target.value)}
                className="apple-input h-10 text-xs font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>{marketCategory === 'government' ? 'Mandi Lot / Auction No.' : 'Private APMC Bill / Gate Pass'}</span>
              </label>
              <input
                type="text"
                placeholder={marketCategory === 'government' ? 'e.g. Kalamna Lot #48' : 'e.g. PVT-NGP-104'}
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value)}
                className="apple-input h-10 text-xs font-mono font-semibold"
              />
            </div>
          </div>

          {/* Remarks / Quality Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Remarks (Moisture %, bag count, sample quality)
            </label>
            <input
              type="text"
              placeholder="e.g. 300 Bags, dry condition, moisture under 10%"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="apple-input h-10 text-xs"
            />
          </div>

            {/* User Footnote */}
            <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
              <span>Trading Hub: <strong>Nagpur (Shivkrupa Trading Co.)</strong></span>
              <span>Recorded by: <strong>{activeUser.name.split(' ')[0]}</strong></span>
            </div>

          </div>

          {/* Sticky Actions Footer (Mobile Optimized) */}
          <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 flex-shrink-0 bg-white dark:bg-slate-900 flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-end gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="apple-btn-secondary w-full sm:w-auto justify-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="apple-btn-primary bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/25 w-full sm:w-auto justify-center"
            >
              <Plus className="w-4 h-4" />
              <span>Confirm Inward & Add Stock</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
