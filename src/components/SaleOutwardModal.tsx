import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Minus, 
  Plus, 
  AlertCircle, 
  Calendar, 
  Package, 
  Warehouse, 
  User, 
  Truck, 
  FileText, 
  Trash2, 
  Receipt,
  Handshake,
  Search,
  Check,
  ChevronDown,
  Users,
  Clock
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Yard, Material, Party, UserProfile, ExpenseCategory, TransactionCharge } from '../types';
import { storage } from '../services/storage';

interface SaleOutwardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  yards: Yard[];
  materials: Material[];
  parties: Party[];
  activeUser: UserProfile;
  preselectedPartyId?: string;
  preselectedBrokerId?: string;
}

export const SaleOutwardModal: React.FC<SaleOutwardModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  yards,
  materials,
  parties,
  activeUser,
  preselectedPartyId,
  preselectedBrokerId
}) => {
  if (!isOpen) return null;

  const buyerParties = parties.filter(p => p.type === 'buyer_company');
  const brokerParties = parties.filter(p => p.type === 'broker_agent');

  // Core Form State
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [partyId, setPartyId] = useState(
    preselectedPartyId && buyerParties.some(p => p.id === preselectedPartyId)
      ? preselectedPartyId
      : buyerParties[0]?.id || ''
  );
  const [materialId, setMaterialId] = useState(materials[0]?.id || '');
  const [yardId, setYardId] = useState(yards[0]?.id || '');

  // Broker / Commission Agent State
  const [brokerId, setBrokerId] = useState<string>(preselectedBrokerId || '');
  const [brokerageRate, setBrokerageRate] = useState<string>('');
  const [addBrokerageAsCharge, setAddBrokerageAsCharge] = useState<boolean>(true);

  // Quantities & Rates
  const [qtyQuintals, setQtyQuintals] = useState<string>('');
  const [ratePerQuintal, setRatePerQuintal] = useState<string>('');

  // Transport & Billing (Invoice shifted to top row next to broker)
  const [invoiceNo, setInvoiceNo] = useState('');
  const [transporterName, setTransporterName] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Bardana (Packaging)
  const [deductBardana, setDeductBardana] = useState<boolean>(true);
  const [bardanaYardId, setBardanaYardId] = useState<string>(yardId);
  const [bardanaYardManuallyChanged, setBardanaYardManuallyChanged] = useState<boolean>(false);
  const [bardanaType, setBardanaType] = useState<string>('🌾 Jute Gunny (ताग)');
  const [bardanaBagsUsed, setBardanaBagsUsed] = useState<string>('');

  // Single active dropdown for all searchable comboboxes
  type DropdownType = 'buyer' | 'material' | 'yard' | 'broker' | null;
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

  // Sync Bardana yard with dispatch yard by default
  useEffect(() => {
    if (!bardanaYardManuallyChanged) {
      setBardanaYardId(yardId);
    }
  }, [yardId, bardanaYardManuallyChanged]);

  // Registered Hamal / Labor partners
  const hamalPartners = useMemo(() => parties.filter(p => p.type === 'hamal' && p.is_active), [parties]);

  // Dedicated Hamali Loading State
  const [includeHamali, setIncludeHamali] = useState<boolean>(false);
  const [hamaliPartnerId, setHamaliPartnerId] = useState<string>('');
  const [customHamalName, setCustomHamalName] = useState<string>('');
  const [hamaliBags, setHamaliBags] = useState<string>('');
  const [hamaliRatePerBag, setHamaliRatePerBag] = useState<string>('7.50');
  const [hamaliManualAmount, setHamaliManualAmount] = useState<string>('');
  const [hamaliPaymentStatus, setHamaliPaymentStatus] = useState<'accrued_payable' | 'paid'>('accrued_payable');

  // Preselect first hamal partner if available
  useEffect(() => {
    if (!hamaliPartnerId && hamalPartners.length > 0) {
      setHamaliPartnerId(hamalPartners[0].id);
    }
  }, [hamalPartners, hamaliPartnerId]);

  // Auto-sync hamali bags with bardana bags if user didn't enter custom bags
  useEffect(() => {
    if (includeHamali && bardanaBagsUsed && (!hamaliBags || hamaliBags === '0')) {
      setHamaliBags(bardanaBagsUsed);
    }
  }, [includeHamali, bardanaBagsUsed]);

  // Dispatch Charges state
  interface OutwardChargeItem {
    category: ExpenseCategory;
    title: string;
    amount: string;
    paid_to: string;
    payment_status: 'paid' | 'accrued_payable';
    bag_count?: string;
    rate_per_bag?: string;
  }
  const [charges, setCharges] = useState<OutwardChargeItem[]>([]);
  const [showAddCharge, setShowAddCharge] = useState(false);
  const [newChargeCat, setNewChargeCat] = useState<ExpenseCategory>('hamali_loading');
  const [newChargeTitle, setNewChargeTitle] = useState('');
  const [newChargeAmount, setNewChargeAmount] = useState('');
  const [newChargePaidTo, setNewChargePaidTo] = useState('');
  const [newChargeBags, setNewChargeBags] = useState('');
  const [newChargeRate, setNewChargeRate] = useState('7.50');
  const [newChargeStatus, setNewChargeStatus] = useState<'paid' | 'accrued_payable'>('accrued_payable');

  // Live stock & Average Purchase Cost
  const [availableStock, setAvailableStock] = useState<number>(0);
  const [avgPurchaseRate, setAvgPurchaseRate] = useState<number>(0);
  const [overallAvgPurchaseRate, setOverallAvgPurchaseRate] = useState<number>(0);

  useEffect(() => {
    if (materialId) {
      // Calculate overall commodity purchase rate across all purchases in system
      const allPurchases = storage.getPurchases().filter(p => p.material_id === materialId);
      const totalPurchasedQty = allPurchases.reduce((sum, p) => sum + Number(p.qty_quintals || 0), 0);
      const totalPurchasedAmt = allPurchases.reduce((sum, p) => sum + Number(p.total_amount || 0), 0);
      const overallAvg = totalPurchasedQty > 0 ? Math.round(totalPurchasedAmt / totalPurchasedQty) : 0;
      setOverallAvgPurchaseRate(overallAvg);

      if (yardId) {
        const stock = storage.getAvailableStockInYard(yardId, materialId);
        setAvailableStock(stock);

        const matrix = storage.getLiveStockMatrix();
        const currentItem = matrix.find(m => m.material_id === materialId && m.yard_id === yardId);
        setAvgPurchaseRate(currentItem?.avg_purchase_rate || 0);
      } else {
        setAvailableStock(0);
        setAvgPurchaseRate(0);
      }
    } else {
      setAvailableStock(0);
      setAvgPurchaseRate(0);
      setOverallAvgPurchaseRate(0);
    }
  }, [yardId, materialId]);

  const effectiveAvgCost = avgPurchaseRate > 0 ? avgPurchaseRate : overallAvgPurchaseRate;

  const numQty = parseFloat(qtyQuintals) || 0;
  const numRate = parseFloat(ratePerQuintal) || 0;
  const totalAmount = numQty * numRate;

  // Selected Entities
  const selectedYard = yards.find(y => y.id === yardId);
  const selectedMaterial = materials.find(m => m.id === materialId);
  const selectedParty = parties.find(p => p.id === partyId);
  const selectedBroker = brokerParties.find(p => p.id === brokerId);
  const effectiveBardanaYardId = bardanaYardId || yardId;
  const selectedBardanaYard = yards.find(y => y.id === effectiveBardanaYardId) || selectedYard;
  const availableBardanaInSelectedYard = storage.getAvailableBardanaInYard(effectiveBardanaYardId, bardanaType);

  // Hamali calculations
  const numHamaliBags = parseFloat(hamaliBags) || 0;
  const numHamaliRate = parseFloat(hamaliRatePerBag) || 0;
  const autoHamaliAmount = numHamaliBags > 0 && numHamaliRate > 0 ? Number((numHamaliBags * numHamaliRate).toFixed(2)) : 0;
  const effectiveHamaliAmount = hamaliManualAmount !== '' ? (parseFloat(hamaliManualAmount) || 0) : autoHamaliAmount;

  const selectedHamalPartner = hamalPartners.find(p => p.id === hamaliPartnerId);
  const effectiveHamalName = hamaliPartnerId === '__custom__' 
    ? customHamalName.trim() 
    : (selectedHamalPartner?.name || customHamalName.trim() || 'Hamal Gang');

  // Brokerage calculations
  const numBrokerageRate = parseFloat(brokerageRate) || 0;
  const totalBrokerageAmount = numQty > 0 && numBrokerageRate > 0 ? Number((numQty * numBrokerageRate).toFixed(2)) : 0;

  // Charges & Margin calculations (All outward charges are billed & added to the Buyer's account)
  const commodityAmount = numQty * numRate;
  const directChargesAmount = charges.reduce((acc, c) => acc + (parseFloat(c.amount) || 0), 0);
  const dedicatedHamaliAmount = includeHamali ? effectiveHamaliAmount : 0;
  const totalChargesAmount = directChargesAmount + dedicatedHamaliAmount + (selectedBroker && addBrokerageAsCharge ? totalBrokerageAmount : 0);
  const totalInvoicedToBuyer = commodityAmount + totalChargesAmount;
  const netRealizedAmount = commodityAmount; // Trader realizes full commodity value as buyer pays charges

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
        payment_status: newChargeStatus,
        bag_count: newChargeBags.trim() || undefined,
        rate_per_bag: newChargeRate.trim() || undefined
      }
    ]);
    setNewChargeTitle('');
    setNewChargeAmount('');
    setNewChargePaidTo('');
    setNewChargeBags('');
    setNewChargeRate('7.50');
    setNewChargeStatus('accrued_payable');
    setShowAddCharge(false);
  };

  const handleRemoveCharge = (index: number) => {
    setCharges(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSetMax = () => {
    if (availableStock > 0) {
      setQtyQuintals(availableStock.toString());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!materialId || !yardId || !partyId) {
      setError('Please select Buyer Company, Commodity, and Dispatch Yard.');
      return;
    }

    if (numQty <= 0) {
      setError('Sale Quantity must be greater than zero.');
      return;
    }

    if (numRate <= 0) {
      setError('Sale Price per Quintal must be entered.');
      return;
    }

    if (numQty > availableStock) {
      setError(`Cannot dispatch! Selected Yard only has ${availableStock.toFixed(2)} Quintals of this material.`);
      return;
    }

    if (includeHamali) {
      if (!hamaliPartnerId && !customHamalName.trim()) {
        setError('Please select a Hamal Partner or enter Hamal name.');
        return;
      }
      if (effectiveHamaliAmount <= 0) {
        setError('Please specify Bags and Rate for Hamali, or enter total amount.');
        return;
      }
    }

    const bagsCount = parseInt(bardanaBagsUsed, 10) || 0;

    const finalCharges: TransactionCharge[] = charges.map((c, idx) => ({
      id: `chg-s-${Date.now()}-${idx}`,
      category: c.category,
      title: c.title,
      amount: parseFloat(c.amount) || 0,
      paid_to: c.paid_to || 'Labour / Transporter',
      payment_mode: 'Cash' as const,
      payment_status: c.payment_status,
      bag_count: c.bag_count ? parseFloat(c.bag_count) : undefined,
      rate_per_bag: c.rate_per_bag ? parseFloat(c.rate_per_bag) : undefined,
      created_at: new Date().toISOString()
    }));

    if (includeHamali && effectiveHamaliAmount > 0) {
      finalCharges.push({
        id: `chg-hamali-${Date.now()}`,
        category: 'hamali_loading',
        title: `Loading Hamali (${effectiveHamalName})`,
        amount: effectiveHamaliAmount,
        paid_to: effectiveHamalName,
        payment_mode: 'Cash' as const,
        payment_status: hamaliPaymentStatus,
        bag_count: numHamaliBags > 0 ? numHamaliBags : undefined,
        rate_per_bag: numHamaliRate > 0 ? numHamaliRate : undefined,
        notes: `Loading labor: ${numHamaliBags} bags @ ₹${numHamaliRate}/bag (${hamaliPaymentStatus === 'accrued_payable' ? 'Weekly Payout Due' : 'Paid'})`,
        created_at: new Date().toISOString()
      });
    }

    if (selectedBroker && totalBrokerageAmount > 0 && addBrokerageAsCharge) {
      finalCharges.push({
        id: `chg-brokerage-${Date.now()}`,
        category: 'commission_brokerage',
        title: `Brokerage (${selectedBroker.name})`,
        amount: totalBrokerageAmount,
        paid_to: selectedBroker.name,
        payment_mode: 'Bank Transfer / NEFT' as const,
        payment_status: 'paid' as const,
        notes: `Brokerage @ ₹${numBrokerageRate}/Qtl for ${numQty} Qtl dispatch`,
        created_at: new Date().toISOString()
      });
    }

    const result = storage.addSale({
      sale_date: saleDate,
      material_id: materialId,
      yard_id: yardId,
      party_id: partyId,
      broker_id: brokerId || undefined,
      broker_name: selectedBroker?.name || undefined,
      brokerage_rate_per_qtl: numBrokerageRate > 0 ? numBrokerageRate : undefined,
      brokerage_total_amount: totalBrokerageAmount > 0 ? totalBrokerageAmount : undefined,
      qty_quintals: numQty,
      rate_per_quintal: numRate,
      bardana_bags_used: deductBardana && bagsCount > 0 ? bagsCount : undefined,
      bardana_type: deductBardana && bagsCount > 0 ? bardanaType : undefined,
      bardana_yard_id: deductBardana && bagsCount > 0 ? effectiveBardanaYardId : undefined,
      bardana_deducted: deductBardana && bagsCount > 0,
      charges: finalCharges,
      invoice_no: invoiceNo.trim() || undefined,
      transporter_name: transporterName.trim() || undefined,
      vehicle_no: vehicleNo.trim() || undefined,
      notes: notes.trim() || undefined,
      created_by_name: activeUser.name
    });

    if (!result.success) {
      setError(result.error || 'Failed to record sale.');
      return;
    }

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 }
    });

    onSuccess();
    onClose();
  };

  // Filter helpers for searchable dropdowns
  const filteredBuyers = buyerParties.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (b.city && b.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (b.phone && b.phone.includes(searchQuery))
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

  const filteredBrokers = brokerParties.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (b.city && b.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (b.phone && b.phone.includes(searchQuery))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-hidden">
      <div 
        className="w-full max-w-xl bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl max-h-[94vh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header (Fixed at top) */}
        <div className="p-4 sm:p-5 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Stock Outward (Sale)
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

            {/* Row 1: Invoice No. (बिल क्र.) & Sale Date - Shifted to Top */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Invoice No. (बिल क्र.)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. SK-1042"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                className="apple-input h-10 text-xs font-mono font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Sale Date</span>
              </label>
              <input
                type="date"
                required
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                className="apple-input h-10 text-xs"
              />
            </div>
          </div>

          {/* Row 2: Searchable Buyer Company & Broker / Agent */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* Buyer Company Searchable Dropdown */}
            <div className="relative searchable-dropdown-root">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Buyer Company *</span>
              </label>

              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveDropdown(activeDropdown === 'buyer' ? null : 'buyer');
                }}
                className="w-full h-10 px-3 text-left rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 flex items-center justify-between text-xs transition"
              >
                <span className="font-semibold text-slate-900 dark:text-white truncate pr-2">
                  {selectedParty ? `${selectedParty.name}${selectedParty.city ? ` (${selectedParty.city})` : ''}` : 'Select Buyer Company'}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
              </button>

              {activeDropdown === 'buyer' && (
                <div className="absolute top-full left-0 right-0 mt-1 max-h-52 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-40 p-1.5 space-y-1">
                  <div className="p-1 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        autoFocus
                        placeholder="Search buyer name, city, phone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 border-none outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="py-0.5 space-y-0.5">
                    {filteredBuyers.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setPartyId(p.id);
                          setActiveDropdown(null);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition flex items-center justify-between ${
                          partyId === p.id 
                            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold' 
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <span className="truncate pr-2">{p.name} {p.city ? `(${p.city})` : ''}</span>
                        {partyId === p.id && <Check className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />}
                      </button>
                    ))}
                    {filteredBuyers.length === 0 && (
                      <p className="p-2 text-center text-slate-400 text-xs">No buyers match</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Broker / Agent Searchable Dropdown */}
            <div className="relative searchable-dropdown-root">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Handshake className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span>Broker / Agent (दलाल)</span>
                </label>
                {selectedBroker && (
                  <button
                    type="button"
                    onClick={() => {
                      setBrokerId('');
                      setBrokerageRate('');
                    }}
                    className="text-[10px] text-rose-500 hover:underline font-semibold"
                  >
                    Clear (Direct)
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveDropdown(activeDropdown === 'broker' ? null : 'broker');
                }}
                className="w-full h-10 px-3 text-left rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 flex items-center justify-between text-xs transition"
              >
                <span className="font-semibold text-slate-900 dark:text-white truncate pr-2">
                  {selectedBroker ? `${selectedBroker.name} (${selectedBroker.city || 'Broker'})` : 'Direct Sale (No Broker / थेट)'}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
              </button>

              {activeDropdown === 'broker' && (
                <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-40 p-1.5 space-y-1">
                  <div className="p-1 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        autoFocus
                        placeholder="Search broker name or city..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 border-none outline-none focus:ring-1 focus:ring-purple-500 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="py-0.5 space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setBrokerId('');
                        setActiveDropdown(null);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center justify-between italic"
                    >
                      <span>Direct Sale (No Broker)</span>
                      {!brokerId && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                    </button>

                    {filteredBrokers.map(b => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          setBrokerId(b.id);
                          setActiveDropdown(null);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition flex items-center justify-between ${
                          brokerId === b.id 
                            ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold' 
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <span className="truncate pr-2">{b.name} {b.city ? `(${b.city})` : ''}</span>
                        {brokerId === b.id && <Check className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Inline brokerage rate input when broker selected */}
              {selectedBroker && (
                <div className="mt-1.5 p-2 rounded-xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-purple-900 dark:text-purple-200">Rate:</span>
                    <div className="relative w-20">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="₹/Qtl"
                        value={brokerageRate}
                        onChange={(e) => setBrokerageRate(e.target.value)}
                        className="apple-input h-7 text-[11px] py-0.5"
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-purple-700 dark:text-purple-300 text-[11px] num-metric">
                      Dalali: ₹{totalBrokerageAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Row 2: Searchable Commodity & Searchable Dispatch Yard */}
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
                        className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 border-none outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white"
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
                            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold' 
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <span className="truncate pr-2">{m.name} ({m.local_name})</span>
                        {materialId === m.id && <Check className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />}
                      </button>
                    ))}
                    {filteredMaterials.length === 0 && (
                      <p className="p-2 text-center text-slate-400 text-xs">No commodity match</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Dispatch Yard Searchable Dropdown */}
            <div className="relative searchable-dropdown-root">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Warehouse className="w-3.5 h-3.5 text-slate-400" />
                  <span>Dispatch From Yard *</span>
                </span>
                <span className={`text-[10px] font-bold num-metric ${availableStock > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                  Stock: {availableStock.toFixed(2)} Qtl
                </span>
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
                        placeholder="Search yard or godown..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 border-none outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="py-0.5 space-y-0.5">
                    {filteredYards.map(y => {
                      const yardStock = storage.getAvailableStockInYard(y.id, materialId);
                      return (
                        <button
                          key={y.id}
                          type="button"
                          onClick={() => {
                            setYardId(y.id);
                            setActiveDropdown(null);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition flex items-center justify-between ${
                            yardId === y.id 
                              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold' 
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <span className="truncate pr-2">{y.name}</span>
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex-shrink-0">
                            {yardStock.toFixed(2)} Qtl
                          </span>
                        </button>
                      );
                    })}
                    {filteredYards.length === 0 && (
                      <p className="p-2 text-center text-slate-400 text-xs">No yards match</p>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Row 3: Sale Quantity & Sale Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Sale Quantity (Quintals) *
                </label>
                {availableStock > 0 && (
                  <button
                    type="button"
                    onClick={handleSetMax}
                    className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Sell All ({availableStock.toFixed(2)} Qtl)
                  </button>
                )}
              </div>
              <div className="input-group">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={availableStock}
                  required
                  placeholder="100.00"
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
              <div className="flex items-center justify-between mb-1 gap-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap flex-shrink-0">
                  Sale Price (₹/Qtl) *
                </label>
                {effectiveAvgCost > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!ratePerQuintal) {
                        setRatePerQuintal(effectiveAvgCost.toString());
                      }
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap cursor-pointer hover:bg-emerald-500/20 active:scale-95 transition flex-shrink-0"
                    title="Average Purchase Rate (खरेदी सरासरी दर) - Click to auto-fill"
                  >
                    <span className="text-slate-400 dark:text-slate-500 font-semibold">Cost:</span>
                    <strong className="num-metric font-black text-emerald-600 dark:text-emerald-400">
                      ₹{effectiveAvgCost.toLocaleString('en-IN')}
                    </strong>
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">
                    Cost: ₹0
                  </span>
                )}
              </div>
              <div className="input-group">
                <span className="input-prefix">
                  ₹
                </span>
                <input
                  type="number"
                  step="1"
                  min="1"
                  required
                  placeholder="5100"
                  value={ratePerQuintal}
                  onChange={(e) => setRatePerQuintal(e.target.value)}
                  className="num-metric text-sm font-bold"
                />
              </div>

              {/* Dynamic Live Margin / Profit Badge below input */}
              {numRate > 0 && effectiveAvgCost > 0 && (
                <div className="mt-1 flex items-center justify-between px-1 text-[10px] whitespace-nowrap">
                  <span className="text-slate-400 flex items-center gap-1">
                    <span>खरेदी:</span>
                    <strong className="text-slate-600 dark:text-slate-300 num-metric font-semibold">₹{effectiveAvgCost}</strong>
                  </span>
                  {numRate >= effectiveAvgCost ? (
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                      <span>Profit:</span>
                      <strong className="num-metric font-black">+₹{(numRate - effectiveAvgCost).toLocaleString('en-IN')}</strong>
                      <span className="text-[9px] text-emerald-500 font-semibold">
                        (+{(((numRate - effectiveAvgCost) / effectiveAvgCost) * 100).toFixed(1)}%)
                      </span>
                    </span>
                  ) : (
                    <span className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
                      <span>Loss:</span>
                      <strong className="num-metric font-black">-₹{(effectiveAvgCost - numRate).toLocaleString('en-IN')}</strong>
                      <span className="text-[9px] text-rose-500 font-semibold">
                        (-{(((effectiveAvgCost - numRate) / effectiveAvgCost) * 100).toFixed(1)}%)
                      </span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bardana Packaging Section */}
          <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={deductBardana}
                  onChange={(e) => setDeductBardana(e.target.checked)}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
                <span>Deduct Bardana Bags (बारदान वजा करा)</span>
              </label>
              {deductBardana && (
                <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 num-metric">
                  {availableBardanaInSelectedYard.toLocaleString('en-IN')} Bags in {selectedBardanaYard?.name.split('(')[0]}
                </span>
              )}
            </div>

            {deductBardana && (
              <div className="flex flex-col sm:flex-row items-end gap-2.5 pt-1.5 border-t border-amber-200/60 dark:border-amber-800/40 text-xs">
                {/* 1. Bardana Source Yard (Just location / name, without qty) */}
                <div className="w-full sm:flex-1 min-w-0">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Bardana Yard (गोडाऊन)
                  </label>
                  <select
                    value={effectiveBardanaYardId}
                    onChange={(e) => {
                      setBardanaYardId(e.target.value);
                      setBardanaYardManuallyChanged(true);
                    }}
                    className="apple-input h-10 text-xs font-medium px-3 py-2 leading-normal"
                  >
                    {yards.map(y => (
                      <option key={y.id} value={y.id}>
                        {y.name.replace(' (Govt Market)', '').replace(' (Personal)', '')}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Bardana Type (Middle box - increased to match Bardana Yard width) */}
                <div className="w-full sm:flex-1 min-w-0">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Bardana Type (बारदान)
                  </label>
                  <select
                    value={bardanaType}
                    onChange={(e) => setBardanaType(e.target.value)}
                    className="apple-input h-10 text-xs font-medium px-3 py-2 leading-normal"
                  >
                    <option value="🌾 Jute Gunny (ताग)">🌾 Jute Gunny Bag (ताग बारदान)</option>
                    <option value="⚪ Plastic / HDPE (प्लास्टिक)">⚪ Plastic / HDPE Bag (प्लास्टिक बारदान)</option>
                  </select>
                </div>

                {/* 3. Bags Count (Reduced box width) */}
                <div className="w-full sm:w-28 flex-shrink-0">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Bags
                    </label>
                    <div className="flex gap-1 text-[9px] font-bold">
                      <button
                        type="button"
                        onClick={() => setBardanaBagsUsed(numQty > 0 ? Math.ceil(numQty * 2).toString() : '200')}
                        className="px-1.5 py-0.2 rounded bg-amber-200/70 dark:bg-amber-800/70 text-amber-900 dark:text-amber-200 hover:bg-amber-300 transition cursor-pointer"
                        title="50kg bags (2x)"
                      >
                        50kg
                      </button>
                      <button
                        type="button"
                        onClick={() => setBardanaBagsUsed(numQty > 0 ? Math.ceil(numQty).toString() : '100')}
                        className="px-1.5 py-0.2 rounded bg-amber-200/70 dark:bg-amber-800/70 text-amber-900 dark:text-amber-200 hover:bg-amber-300 transition cursor-pointer"
                        title="100kg bags (1x)"
                      >
                        100kg
                      </button>
                    </div>
                  </div>
                  <div className="input-group">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={bardanaBagsUsed}
                      onChange={(e) => setBardanaBagsUsed(e.target.value)}
                      placeholder="200"
                      className="num-metric text-xs font-bold"
                    />
                    <span className="input-suffix">
                      Bags
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Loading Hamali (हमाली कामगार - Weekly Payout) */}
          <div className="p-3 rounded-2xl bg-amber-500/5 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/50 space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeHamali}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIncludeHamali(checked);
                    if (checked && !hamaliBags && bardanaBagsUsed) {
                      setHamaliBags(bardanaBagsUsed);
                    }
                  }}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 dark:border-slate-700 cursor-pointer"
                />
                <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-amber-600" />
                  <span>Loading Hamali (चढाई हमाली - Weekly Payout)</span>
                </span>
              </label>

              {includeHamali && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300/60">
                  <Clock className="w-3 h-3" />
                  <span>आठवडी बाकी (Due)</span>
                </span>
              )}
            </div>

            {includeHamali && (
              <div className="space-y-2.5 pt-1.5 border-t border-amber-200/60 dark:border-amber-800/40 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  {/* 1. Hamal Partner Dropdown */}
                  <div className="sm:col-span-5 min-w-0">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Hamal / Gang (हमाल कामगार) *
                    </label>
                    <select
                      value={hamaliPartnerId}
                      onChange={(e) => setHamaliPartnerId(e.target.value)}
                      className="apple-input h-10 text-xs font-medium px-3 py-2 leading-normal"
                    >
                      <option value="">Select Hamal Partner (हमाल निवडा)</option>
                      {hamalPartners.map(h => (
                        <option key={h.id} value={h.id}>
                          {h.name} {h.phone ? `(${h.phone})` : ''}
                        </option>
                      ))}
                      <option value="__custom__">+ Enter Custom / Other Gang</option>
                    </select>
                    {hamaliPartnerId === '__custom__' && (
                      <input
                        type="text"
                        placeholder="Enter Hamal Gang Name"
                        value={customHamalName}
                        onChange={(e) => setCustomHamalName(e.target.value)}
                        className="apple-input h-9 text-xs mt-1.5"
                      />
                    )}
                    {hamalPartners.length === 0 && hamaliPartnerId !== '__custom__' && (
                      <p className="text-[10px] text-amber-600 mt-1">
                        Tip: Register Hamals in Partners & Clients, or choose "+ Enter Custom / Other Gang".
                      </p>
                    )}
                  </div>

                  {/* 2. Bags Count */}
                  <div className="sm:col-span-2 min-w-0">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Bags (पोती) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="e.g. 200"
                      value={hamaliBags}
                      onChange={(e) => {
                        setHamaliBags(e.target.value);
                        setHamaliManualAmount('');
                      }}
                      className="apple-input h-10 text-xs font-bold num-metric px-3"
                    />
                  </div>

                  {/* 3. Rate Per Bag */}
                  <div className="sm:col-span-2 min-w-0">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Rate / Bag (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.25"
                      placeholder="7.50"
                      value={hamaliRatePerBag}
                      onChange={(e) => {
                        setHamaliRatePerBag(e.target.value);
                        setHamaliManualAmount('');
                      }}
                      className="apple-input h-10 text-xs font-bold num-metric px-3"
                    />
                  </div>

                  {/* 4. Total Amount (₹) */}
                  <div className="sm:col-span-3 min-w-0">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Total Hamali (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={hamaliManualAmount !== '' ? hamaliManualAmount : (effectiveHamaliAmount > 0 ? effectiveHamaliAmount.toString() : '')}
                        onChange={(e) => setHamaliManualAmount(e.target.value)}
                        placeholder="0"
                        className="apple-input h-10 text-xs font-bold num-metric pl-7 pr-3 text-amber-700 dark:text-amber-400"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 bg-amber-50/50 dark:bg-amber-900/10 p-2 rounded-xl border border-amber-200/40">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">खरेदीदार खाते:</span>
                    <span className="text-slate-700 dark:text-slate-300 font-medium">बिलात हमाली जोडली जाईल (+ Billed to Buyer Account)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-300 text-[10px]">
                      <input
                        type="radio"
                        name="hamali_status"
                        value="accrued_payable"
                        checked={hamaliPaymentStatus === 'accrued_payable'}
                        onChange={() => setHamaliPaymentStatus('accrued_payable')}
                        className="text-amber-600"
                      />
                      <span>Weekly Due (हमाल देय बाकी)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-300 text-[10px]">
                      <input
                        type="radio"
                        name="hamali_status"
                        value="paid"
                        checked={hamaliPaymentStatus === 'paid'}
                        onChange={() => setHamaliPaymentStatus('paid')}
                        className="text-amber-600"
                      />
                      <span>Paid Spot (रोख चुकती)</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Dispatch Charges Section */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-blue-600" />
                <span>Other Charges Billed to Buyer (खरेदीदाराला आकारायचे इतर खर्च, भाडे)</span>
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
                      onChange={(e) => {
                        const cat = e.target.value as ExpenseCategory;
                        setNewChargeCat(cat);
                        if (cat === 'hamali_loading') {
                          setNewChargeStatus('accrued_payable');
                          if (!newChargeTitle) setNewChargeTitle('Loading Hamali');
                        } else {
                          setNewChargeStatus('paid');
                        }
                      }}
                      className="apple-input h-10 text-xs font-medium px-3 py-2 leading-normal"
                    >
                      <option value="hamali_loading">📦 Loading / Hamali (चढाई)</option>
                      <option value="transport_freight">🚛 Freight / Transport (भाडे)</option>
                      <option value="weighbridge">⚖️ Weighbridge (काटा)</option>
                      <option value="other">📋 Other Deduction (इतर)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Description *</label>
                    <input
                      type="text"
                      placeholder="e.g. Loading Hamali / Freight"
                      value={newChargeTitle}
                      onChange={(e) => setNewChargeTitle(e.target.value)}
                      className="apple-input h-10 text-xs"
                    />
                  </div>
                </div>

                {newChargeCat === 'hamali_loading' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Bags (पोती)</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="e.g. 200"
                        value={newChargeBags}
                        onChange={(e) => {
                          const bags = e.target.value;
                          setNewChargeBags(bags);
                          const b = parseFloat(bags) || 0;
                          const r = parseFloat(newChargeRate) || 0;
                          if (b > 0 && r > 0) {
                            setNewChargeAmount((b * r).toFixed(2));
                          }
                        }}
                        className="apple-input h-10 text-xs font-bold num-metric"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Rate / Bag (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.25"
                        placeholder="7.50"
                        value={newChargeRate}
                        onChange={(e) => {
                          const rate = e.target.value;
                          setNewChargeRate(rate);
                          const b = parseFloat(newChargeBags) || 0;
                          const r = parseFloat(rate) || 0;
                          if (b > 0 && r > 0) {
                            setNewChargeAmount((b * r).toFixed(2));
                          }
                        }}
                        className="apple-input h-10 text-xs font-bold num-metric"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      {newChargeCat === 'hamali_loading' ? 'Hamal Gang / Labor (हमाल कामगार)' : 'Paid To / Vendor'}
                    </label>
                    {newChargeCat === 'hamali_loading' && hamalPartners.length > 0 ? (
                      <select
                        value={newChargePaidTo}
                        onChange={(e) => setNewChargePaidTo(e.target.value)}
                        className="apple-input h-10 text-xs font-medium px-3 py-2 leading-normal"
                      >
                        <option value="">Select Hamal Partner</option>
                        {hamalPartners.map(h => (
                          <option key={h.id} value={h.name}>{h.name}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder={newChargeCat === 'hamali_loading' ? "e.g. Hemat Kumar" : "e.g. Transporter / Driver"}
                        value={newChargePaidTo}
                        onChange={(e) => setNewChargePaidTo(e.target.value)}
                        className="apple-input h-10 text-xs"
                      />
                    )}
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
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{chg.title}</span>
                        {chg.payment_status === 'accrued_payable' ? (
                          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.2 rounded border border-amber-300/40">
                            आठवडी बाकी
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-1.5 py-0.2 rounded border border-emerald-300/40">
                            Paid
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {chg.paid_to && <span>{chg.paid_to}</span>}
                        {chg.bag_count && <span> • {chg.bag_count} Bags</span>}
                        {chg.rate_per_bag && <span> @ ₹{chg.rate_per_bag}/bag</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400 num-metric">
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
                No extra charges attached. Click "+ Add Charge" to add freight, weighbridge, etc.
              </p>
            )}
          </div>

          {/* Transport & Vehicle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-slate-400" />
                <span>Transporter Name (वाहतूकदार)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Nagpur Goods Transport"
                value={transporterName}
                onChange={(e) => setTransporterName(e.target.value)}
                className="apple-input h-10 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-slate-400" />
                <span>Vehicle No. (गाडी क्र.)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. MH-20-AA-5678"
                value={vehicleNo}
                onChange={(e) => setVehicleNo(e.target.value)}
                className="apple-input h-10 text-xs font-mono font-bold"
              />
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Remarks (टिपणी)
            </label>
            <input
              type="text"
              placeholder="e.g. Moisture 9.5%, delivered at plant"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="apple-input h-10 text-xs"
            />
          </div>

          {/* Total Valuation & Invoiced to Buyer Box */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50/70 via-slate-50 to-emerald-50/50 dark:from-blue-950/20 dark:via-slate-900/60 dark:to-emerald-950/20 border border-slate-200/90 dark:border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Total Invoiced to Buyer (खरेदीदार एकूण देय बिल)
              </p>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 space-y-0.5 mt-0.5">
                <p>
                  {numQty > 0 && numRate > 0 
                    ? `Produce Value: ${numQty.toFixed(2)} Qtl × ₹${numRate.toLocaleString('en-IN')} = ₹${commodityAmount.toLocaleString('en-IN')}` 
                    : 'Enter quantity and rate'}
                </p>
                {totalChargesAmount > 0 && (
                  <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                    + Billed Charges (Hamali/भाडे): +₹{totalChargesAmount.toLocaleString('en-IN')} (खरेदीदाराकडून वसुली)
                  </p>
                )}
                {effectiveAvgCost > 0 && numQty > 0 && (
                  <p className="font-medium text-slate-500 dark:text-slate-400">
                    Landed Cost: ₹{(numQty * effectiveAvgCost).toLocaleString('en-IN', { maximumFractionDigits: 0 })} (@ ₹{effectiveAvgCost}/Qtl)
                  </p>
                )}
              </div>
            </div>
            <div className="text-right">
              <span className="text-xl font-black num-metric text-blue-700 dark:text-blue-400">
                ₹{totalInvoicedToBuyer.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {numQty > 0 && numRate > 0 && effectiveAvgCost > 0 && (
                <p className={`text-[11px] font-black num-metric mt-0.5 ${
                  (commodityAmount - (numQty * effectiveAvgCost)) >= 0
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {(commodityAmount - (numQty * effectiveAvgCost)) >= 0 ? 'Est. Gain: +' : 'Est. Loss: -'}
                  ₹{Math.abs(Math.round(commodityAmount - (numQty * effectiveAvgCost))).toLocaleString('en-IN')}
                  <span className="text-[9px] font-normal text-slate-400 ml-1">
                    (margin)
                  </span>
                </p>
              )}
            </div>
          </div>

          </div>

          {/* Sticky Actions Footer (Mobile Optimized) */}
          <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 flex-shrink-0 bg-white dark:bg-slate-900 flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-end gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition w-full sm:w-auto text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={availableStock <= 0}
              className={`inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition shadow-sm w-full sm:w-auto ${
                availableStock <= 0 
                  ? 'opacity-50 cursor-not-allowed bg-slate-400' 
                  : 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/25 active:scale-95'
              }`}
            >
              <Minus className="w-4 h-4" />
              <span>Confirm Sale</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
