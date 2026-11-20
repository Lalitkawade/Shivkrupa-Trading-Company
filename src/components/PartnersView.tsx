import React, { useState } from 'react';
import { 
  Users, 
  Building2, 
  Phone, 
  MapPin, 
  Plus, 
  Search, 
  ArrowDownLeft, 
  ArrowUpRight,
  Truck,
  TrendingUp,
  Receipt,
  Handshake
} from 'lucide-react';
import type { Party, Purchase, Sale, PartyType } from '../types';
import { storage } from '../services/storage';

interface PartnersViewProps {
  parties: Party[];
  purchases: Purchase[];
  sales: Sale[];
  onOpenAddPartner: (category?: PartyType) => void;
  onOpenPurchase?: (sellerId?: string) => void;
  onOpenSale?: (buyerId?: string, brokerId?: string) => void;
}

export const PartnersView: React.FC<PartnersViewProps> = ({
  parties,
  purchases,
  sales,
  onOpenAddPartner,
  onOpenPurchase,
  onOpenSale
}) => {
  // Selected Partner Category: APMC Seller | Buyer Company | Broker Agent
  const [activeCategory, setActiveCategory] = useState<PartyType>('apmc_seller');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. APMC SELLERS (We purchase produce from them)
  const apmcSellers = parties.filter(p => p.type === 'apmc_seller');
  const totalPurchasedFromAll = purchases.reduce((acc, p) => acc + p.qty_quintals, 0);
  const totalPurchaseValueAll = purchases.reduce((acc, p) => acc + p.total_amount, 0);
  const avgPurchaseCost = totalPurchasedFromAll > 0 ? Math.round(totalPurchaseValueAll / totalPurchasedFromAll) : 0;

  // 2. BUYER COMPANIES (We sell our material to them)
  const buyerCompanies = parties.filter(p => p.type === 'buyer_company');
  const totalSoldToAll = sales.reduce((acc, s) => acc + s.qty_quintals, 0);
  const totalSaleValueAll = sales.reduce((acc, s) => acc + s.total_amount, 0);
  const avgSaleCost = totalSoldToAll > 0 ? Math.round(totalSaleValueAll / totalSoldToAll) : 0;

  // 3. BROKERS / AGENTS (We sell material through them)
  const brokerAgents = parties.filter(p => p.type === 'broker_agent');
  const brokeredSales = sales.filter(s => !!s.broker_id);
  const totalBrokeredQty = brokeredSales.reduce((acc, s) => acc + s.qty_quintals, 0);
  const totalBrokeredValue = brokeredSales.reduce((acc, s) => acc + s.total_amount, 0);
  const avgBrokeredRate = totalBrokeredQty > 0 ? Math.round(totalBrokeredValue / totalBrokeredQty) : 0;

  // 4. HAMALS / LABOR (Loading, unloading & packaging labor)
  const hamals = parties.filter(p => p.type === 'hamal');
  const expenses = storage.getExpenses();
  const hamaliExpenses = expenses.filter(e => e.category === 'hamali_loading');
  const totalHamaliOutlay = hamaliExpenses.reduce((acc, e) => acc + e.amount, 0);
  const totalHamaliPending = hamaliExpenses.filter(e => e.payment_status === 'accrued_payable').reduce((acc, e) => acc + e.amount, 0);

  // Filter list based on search and selected category
  const currentList = (
    activeCategory === 'apmc_seller' 
      ? apmcSellers 
      : activeCategory === 'buyer_company' 
      ? buyerCompanies 
      : activeCategory === 'hamal'
      ? hamals
      : brokerAgents
  ).filter(party => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      party.name.toLowerCase().includes(q) ||
      (party.city && party.city.toLowerCase().includes(q)) ||
      (party.phone && party.phone.includes(q))
    );
  });

  const getCategoryTitle = (cat: PartyType) => {
    if (cat === 'apmc_seller') return 'APMC Seller';
    if (cat === 'buyer_company') return 'Buyer Company';
    if (cat === 'hamal') return 'Hamal / Labor';
    return 'Broker / Agent';
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 space-y-3.5 overflow-hidden">
      
      {/* ── FIXED / STEADY UPPER SECTION (Pinned at top, never scrolls) ── */}
      <div className="flex-shrink-0 space-y-3">
        
        {/* View Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2.5 border-b border-slate-200/90 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Trading Partners
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Directory of Mandi Sellers, Buyer Companies, and Brokers
            </p>
          </div>

          <button
            onClick={() => onOpenAddPartner(activeCategory)}
            className="btn-primary cursor-pointer active:scale-95 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add {getCategoryTitle(activeCategory)}</span>
          </button>
        </div>

        {/* Category Tabs, Metric Pill & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-0.5 pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
          
          {/* Segmented Switcher Buttons */}
          <div className="inline-flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 text-xs font-bold self-start overflow-x-auto max-w-full no-scrollbar shadow-2xs">
            <button
              onClick={() => setActiveCategory('apmc_seller')}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
                activeCategory === 'apmc_seller'
                  ? 'bg-emerald-600 text-white shadow-sm font-extrabold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>APMC Sellers</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeCategory === 'apmc_seller' 
                  ? 'bg-white/20 text-white' 
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {apmcSellers.length}
              </span>
            </button>

            <button
              onClick={() => setActiveCategory('buyer_company')}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
                activeCategory === 'buyer_company'
                  ? 'bg-rose-600 text-white shadow-sm font-extrabold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Buyer Companies</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeCategory === 'buyer_company' 
                  ? 'bg-white/20 text-white' 
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {buyerCompanies.length}
              </span>
            </button>

            <button
              onClick={() => setActiveCategory('broker_agent')}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
                activeCategory === 'broker_agent'
                  ? 'bg-purple-600 text-white shadow-sm font-extrabold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Handshake className="w-3.5 h-3.5" />
              <span>Brokers & Agents</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeCategory === 'broker_agent' 
                  ? 'bg-white/20 text-white' 
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {brokerAgents.length}
              </span>
            </button>

            <button
              onClick={() => setActiveCategory('hamal')}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
                activeCategory === 'hamal'
                  ? 'bg-amber-600 text-white shadow-sm font-extrabold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Hamals / Labor</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeCategory === 'hamal' 
                  ? 'bg-white/20 text-white' 
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {hamals.length}
              </span>
            </button>
          </div>

          {/* Quick Aggregate Metric Pill + Search Input */}
          <div className="flex items-center gap-2.5">
            {/* Total Turnover Metric Pill for Active Category */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 shadow-2xs">
              <span className="font-semibold text-slate-400">Total:</span>
              <span className="font-extrabold num-metric text-slate-900 dark:text-white">
                {activeCategory === 'apmc_seller' 
                  ? `${totalPurchasedFromAll.toFixed(2)} Qtl • ₹${Math.round(totalPurchaseValueAll).toLocaleString('en-IN')}`
                  : activeCategory === 'buyer_company'
                  ? `${totalSoldToAll.toFixed(2)} Qtl • ₹${Math.round(totalSaleValueAll).toLocaleString('en-IN')}`
                  : activeCategory === 'hamal'
                  ? `Earned: ₹${Math.round(totalHamaliOutlay).toLocaleString('en-IN')} • Due: ₹${Math.round(totalHamaliPending).toLocaleString('en-IN')}`
                  : `${totalBrokeredQty.toFixed(2)} Qtl • ₹${Math.round(totalBrokeredValue).toLocaleString('en-IN')}`
                }
              </span>
            </div>

            <span className="text-[11px] font-semibold text-slate-400 hidden sm:inline">
              {currentList.length} of {activeCategory === 'apmc_seller' ? apmcSellers.length : activeCategory === 'buyer_company' ? buyerCompanies.length : activeCategory === 'hamal' ? hamals.length : brokerAgents.length}
            </span>
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={`Search ${activeCategory === 'apmc_seller' ? 'sellers' : activeCategory === 'buyer_company' ? 'buyers' : 'brokers'}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input pl-10 pr-4 py-2 text-xs w-full"
              />
            </div>
          </div>

        </div>

      </div>

      {/* ── ONLY PARTNER LIST MOVES (Scrollable list) ── */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-1.5 pb-4 scroll-smooth">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {currentList.map(party => {
          const partyPurchases = purchases.filter(p => p.party_id === party.id);
          const partySales = sales.filter(s => s.party_id === party.id);
          const partyBrokeredSales = sales.filter(s => s.broker_id === party.id);

          const partyHamaliLots = hamaliExpenses.filter(e => 
            (e.paid_to && e.paid_to.toLowerCase() === party.name.toLowerCase()) || 
            (e.hamali_details?.gang_name && e.hamali_details.gang_name.toLowerCase() === party.name.toLowerCase())
          );
          const partyBagsHandled = partyHamaliLots.reduce((acc, e) => acc + (e.hamali_details?.bag_count || 0), 0);
          const partyEarned = partyHamaliLots.reduce((acc, e) => acc + e.amount, 0);
          const partyDue = partyHamaliLots.filter(e => e.payment_status === 'accrued_payable').reduce((acc, e) => acc + e.amount, 0);

          const purchasedQty = partyPurchases.reduce((acc, p) => acc + p.qty_quintals, 0);
          const purchasedVal = partyPurchases.reduce((acc, p) => acc + p.total_amount, 0);
          const avgPurchasedRate = purchasedQty > 0 ? Math.round(purchasedVal / purchasedQty) : 0;

          const soldQty = partySales.reduce((acc, s) => acc + s.qty_quintals, 0);
          const soldVal = partySales.reduce((acc, s) => acc + s.total_amount, 0);
          const soldProduceVal = partySales.reduce((acc, s) => acc + (s.material_amount ?? (s.qty_quintals * s.rate_per_quintal)), 0);
          const soldChargesVal = partySales.reduce((acc, s) => acc + (s.charges_amount ?? (s.charges || []).reduce((ca, c) => ca + (c.amount || 0), 0)), 0);
          const avgSoldRate = soldQty > 0 ? Math.round(soldProduceVal / soldQty) : 0;

          const brokeredQty = partyBrokeredSales.reduce((acc, s) => acc + s.qty_quintals, 0);
          const brokeredVal = partyBrokeredSales.reduce((acc, s) => acc + s.total_amount, 0);
          const avgBrokeredRate = brokeredQty > 0 ? Math.round(brokeredVal / brokeredQty) : 0;

          const dealsCount = 
            activeCategory === 'apmc_seller' 
              ? partyPurchases.length 
              : activeCategory === 'buyer_company' 
              ? partySales.length 
              : activeCategory === 'hamal'
              ? partyHamaliLots.length
              : partyBrokeredSales.length;

          return (
            <div 
              key={party.id}
              className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:shadow-md transition shadow-sm"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      {party.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                      {party.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {party.city}
                        </span>
                      )}
                      {party.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {party.phone}
                        </span>
                      )}
                    </div>
                  </div>

                  <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    activeCategory === 'apmc_seller' 
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20' 
                      : activeCategory === 'buyer_company'
                      ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20'
                      : activeCategory === 'hamal'
                      ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20'
                      : 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20'
                  }`}>
                    {activeCategory === 'apmc_seller' ? 'APMC Seller' : activeCategory === 'buyer_company' ? 'Buyer Client' : activeCategory === 'hamal' ? 'Hamal / Labor (हमाल)' : 'Broker / Agent (दलाल)'}
                  </span>
                </div>

                {/* Trading Stats */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2 text-xs">
                  {activeCategory === 'apmc_seller' ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Total Produce Purchased:</span>
                        <span className="font-extrabold num-metric text-emerald-600 dark:text-emerald-400">
                          {purchasedQty.toFixed(2)} Qtl
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Total Amount Paid:</span>
                        <span className="font-bold num-metric text-slate-800 dark:text-slate-200">
                          ₹{purchasedVal.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                        <span>Average Purchase Rate:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          ₹{avgPurchasedRate}/Qtl
                        </span>
                      </div>
                    </>
                  ) : activeCategory === 'buyer_company' ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Produce Dispatched:</span>
                        <span className="font-extrabold num-metric text-rose-600 dark:text-rose-400">
                          {soldQty.toFixed(2)} Qtl
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Produce Value:</span>
                        <span className="font-bold num-metric text-slate-800 dark:text-slate-200">
                          ₹{Math.round(soldProduceVal).toLocaleString('en-IN')}
                        </span>
                      </div>
                      {soldChargesVal > 0 && (
                        <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 font-semibold">
                          <span>+ Added Charges (Hamali/भाडे):</span>
                          <span className="num-metric">+₹{Math.round(soldChargesVal).toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                        <span className="font-bold text-slate-900 dark:text-white">Total Billed to Account:</span>
                        <span className="font-black num-metric text-slate-900 dark:text-white text-sm">
                          ₹{Math.round(soldVal).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                        <span>Average Produce Rate:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          ₹{avgSoldRate}/Qtl
                        </span>
                      </div>
                    </>
                  ) : activeCategory === 'hamal' ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Lots Handled:</span>
                        <span className="font-extrabold num-metric text-amber-600 dark:text-amber-400">
                          {partyHamaliLots.length} Lots {partyBagsHandled > 0 ? `(${partyBagsHandled} Bags)` : ''}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Gross Hamali Earned:</span>
                        <span className="font-bold num-metric text-slate-800 dark:text-slate-200">
                          ₹{partyEarned.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                        <span className="text-slate-500">Weekly Payout Status:</span>
                        <span className={`font-bold ${partyDue > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {partyDue > 0 ? `Due: ₹${partyDue.toLocaleString('en-IN')}` : 'All Settled ✓'}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Brokered Sales Volume:</span>
                        <span className="font-extrabold num-metric text-purple-600 dark:text-purple-400">
                          {brokeredQty.toFixed(2)} Qtl
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Facilitated Turnover:</span>
                        <span className="font-bold num-metric text-slate-800 dark:text-slate-200">
                          ₹{brokeredVal.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                        <span>Average Brokered Rate:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          ₹{avgBrokeredRate}/Qtl
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Action Footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-medium">
                    {dealsCount} {dealsCount === 1 ? 'deal' : 'deals'}
                  </span>
                  {party.phone && (
                    <a 
                      href={`tel:${party.phone}`}
                      className="text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1"
                      title={`Call ${party.name}`}
                    >
                      <Phone className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {activeCategory === 'apmc_seller' ? (
                  <button
                    onClick={() => onOpenPurchase?.(party.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white transition active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Inward Stock</span>
                  </button>
                ) : activeCategory === 'buyer_company' ? (
                  <button
                    onClick={() => onOpenSale?.(party.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-500/10 hover:bg-rose-500 hover:text-white transition active:scale-95"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Sell Material</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onOpenSale?.(undefined, party.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-500/10 hover:bg-purple-500 hover:text-white transition active:scale-95"
                  >
                    <Handshake className="w-3.5 h-3.5" />
                    <span>+ Brokered Sale</span>
                  </button>
                )}
              </div>

            </div>
          );
        })}
        </div>

        {currentList.length === 0 && (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
            No {activeCategory === 'apmc_seller' ? 'APMC sellers' : activeCategory === 'buyer_company' ? 'buyer companies' : 'brokers/agents'} found matching "{searchQuery}".
          </div>
        )}
      </div>

    </div>
  );
};
