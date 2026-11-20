import React, { useState } from 'react';
import { 
  Warehouse, 
  Building2, 
  MapPin, 
  Plus, 
  ArrowRightLeft, 
  Boxes, 
  TrendingUp, 
  Package,
  Layers
} from 'lucide-react';
import type { Yard, CurrentYardStock, Material } from '../types';

interface StockYardsViewProps {
  yards: Yard[];
  stockMatrix: CurrentYardStock[];
  materials: Material[];
  onOpenAddYard: () => void;
  onOpenShiftModal: (preselected?: { material_id?: string; from_yard_id?: string }) => void;
}

export const StockYardsView: React.FC<StockYardsViewProps> = ({
  yards,
  stockMatrix,
  materials,
  onOpenAddYard,
  onOpenShiftModal
}) => {
  const [filterType, setFilterType] = useState<'all' | 'apmc_shed' | 'personal_yard'>('all');

  const apmcSheds = yards.filter(y => y.type === 'apmc_shed');
  const personalYards = yards.filter(y => y.type === 'personal_yard');

  const apmcStock = stockMatrix
    .filter(s => s.yard_type === 'apmc_shed')
    .reduce((acc, s) => acc + s.current_stock_quintals, 0);

  const personalStock = stockMatrix
    .filter(s => s.yard_type === 'personal_yard')
    .reduce((acc, s) => acc + s.current_stock_quintals, 0);

  const totalStock = apmcStock + personalStock;
  const totalValuation = stockMatrix.reduce((acc, s) => acc + (s.current_stock_quintals * s.avg_purchase_rate), 0);

  const filteredYards = yards.filter(y => {
    if (filterType === 'all') return true;
    return y.type === filterType;
  });

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200/60 dark:border-neutral-800">
        <div>
          <h2 className="text-xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
            Stock Yards & APMC Market Sheds
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Monitor live commodity distribution and execute internal stock shifts across yards
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenShiftModal()}
            className="apple-btn-secondary text-xs sm:text-sm py-2 px-3.5"
          >
            <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
            <span>Shift Stock (Shed ➔ Yard)</span>
          </button>

          <button
            onClick={onOpenAddYard}
            className="apple-btn-primary"
          >
            <Plus className="w-4 h-4" />
            <span>Add Storage Yard</span>
          </button>
        </div>
      </div>

      {/* KPI Cards (5 Strategic Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Total Storage */}
        <div className="glass-panel p-5">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Total Active Locations</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold num-metric text-neutral-900 dark:text-white">{yards.length}</span>
            <span className="text-xs text-neutral-400">Locations</span>
          </div>
          <p className="text-xs text-neutral-400 mt-2">
            {apmcSheds.length} APMC Sheds • {personalYards.length} Personal Godowns
          </p>
        </div>

        {/* APMC Holding */}
        <div className="glass-panel p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">APMC Sheds Holding</span>
            <span className="pill-badge pill-shed text-[10px] py-0 px-1.5">Temporary</span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold num-metric text-amber-600 dark:text-amber-400">
              {apmcStock.toFixed(2)}
            </span>
            <span className="text-xs font-semibold text-neutral-500">Qtl</span>
          </div>
          <p className="text-xs text-neutral-400 mt-2">Ready to shift or sell directly</p>
        </div>

        {/* Personal Yards Holding */}
        <div className="glass-panel p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Personal Yards</span>
            <span className="pill-badge pill-personal text-[10px] py-0 px-1.5">Owned</span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold num-metric text-emerald-600 dark:text-emerald-400">
              {personalStock.toFixed(2)}
            </span>
            <span className="text-xs font-semibold text-neutral-500">Qtl</span>
          </div>
          <p className="text-xs text-neutral-400 mt-2">Consolidated primary storage</p>
        </div>

        {/* Total Live Stock */}
        <div className="glass-panel p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Total Live Stock</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">All Locations</span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold num-metric text-blue-600 dark:text-blue-400">
              {totalStock.toFixed(2)}
            </span>
            <span className="text-xs font-semibold text-neutral-500">Qtl</span>
          </div>
          <p className="text-xs text-neutral-400 mt-2">Combined physical stock on hand</p>
        </div>

        {/* Total Available Valuation */}
        <div className="glass-panel p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Available Valuation</span>
            <span className="pill-badge pill-active text-[10px] py-0 px-1.5">Live Value</span>
          </div>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl sm:text-3xl font-extrabold num-metric text-purple-600 dark:text-purple-400">
              ₹{totalValuation.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-2">Calculated at weighted purchase cost</p>
        </div>

      </div>

      {/* Filter Tabs */}
      <div className="segmented-bar self-start overflow-x-auto no-scrollbar max-w-full flex whitespace-nowrap">
        <button
          onClick={() => setFilterType('all')}
          className={`segment-item ${filterType === 'all' ? 'active' : ''}`}
        >
          <span className="sm:hidden">All ({yards.length})</span>
          <span className="hidden sm:inline">All Storage Locations ({yards.length})</span>
        </button>
        <button
          onClick={() => setFilterType('apmc_shed')}
          className={`segment-item ${filterType === 'apmc_shed' ? 'active' : ''}`}
        >
          <span className="sm:hidden">APMC Sheds ({apmcSheds.length})</span>
          <span className="hidden sm:inline">APMC Sheds Only ({apmcSheds.length})</span>
        </button>
        <button
          onClick={() => setFilterType('personal_yard')}
          className={`segment-item ${filterType === 'personal_yard' ? 'active' : ''}`}
        >
          <span className="sm:hidden">Personal ({personalYards.length})</span>
          <span className="hidden sm:inline">Personal Godowns Only ({personalYards.length})</span>
        </button>
      </div>

      {/* Yards Detailed Cards */}
      {filteredYards.length === 0 ? (
        <div className="glass-panel p-12 text-center border border-dashed border-neutral-300 dark:border-neutral-800 rounded-3xl">
          <Warehouse className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-neutral-900 dark:text-white">
            No Storage Yards or APMC Sheds Added Yet
          </h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1 mb-5">
            Add your APMC market sheds (e.g. Kalamna Shed) and private or personal godowns to begin tracking stock arrivals.
          </p>
          <button 
            onClick={onOpenAddYard} 
            className="apple-btn-primary inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Storage Yard</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredYards.map(yard => {
          const yardStockItems = stockMatrix.filter(s => s.yard_id === yard.id && s.current_stock_quintals > 0);
          const totalStockInYard = yardStockItems.reduce((acc, s) => acc + s.current_stock_quintals, 0);

          return (
            <div 
              key={yard.id}
              className="glass-panel p-5 flex flex-col justify-between hover:shadow-floating transition-all border border-neutral-200/70 dark:border-neutral-800"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                        {yard.name}
                      </h3>
                      <span className={`pill-badge text-[10px] ${yard.type === 'apmc_shed' ? 'pill-shed' : 'pill-personal'}`}>
                        {yard.type === 'apmc_shed' ? 'APMC Shed' : 'Personal Yard'}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                      <span>{yard.location}</span>
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-2xl font-extrabold num-metric text-neutral-900 dark:text-white">
                      {totalStockInYard.toFixed(2)}
                    </span>
                    <p className="text-[11px] font-semibold text-neutral-400">Qtl Stored</p>
                  </div>
                </div>

                {/* Stored Commodities List */}
                <div className="space-y-2 mt-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                    Commodities In Stock
                  </p>
                  {yardStockItems.length === 0 ? (
                    <div className="text-xs text-neutral-400 italic py-2">
                      Yard currently has zero stock.
                    </div>
                  ) : (
                    yardStockItems.map(item => (
                      <div 
                        key={item.material_id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-neutral-800/70 border border-neutral-200/60 dark:border-neutral-700/60"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-semibold text-neutral-900 dark:text-white truncate">
                            {item.material_name}
                          </p>
                          <p className="text-[10px] text-neutral-500">
                            {item.material_local_name} • Avg ₹{item.avg_purchase_rate}/Qtl
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold num-metric text-neutral-900 dark:text-white">
                            {item.current_stock_quintals.toFixed(2)} Qtl
                          </span>
                          
                          {/* Shift button directly from yard item */}
                          <button
                            onClick={() => onOpenShiftModal({ material_id: item.material_id, from_yard_id: yard.id })}
                            title="Shift this commodity to another yard"
                            className="px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white transition text-[11px] font-bold flex items-center gap-1"
                          >
                            <ArrowRightLeft className="w-3 h-3" />
                            <span>Shift</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Bottom Quick Shift Trigger */}
              {yard.type === 'apmc_shed' && totalStockInYard > 0 && (
                <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                  <button
                    onClick={() => onOpenShiftModal({ from_yard_id: yard.id })}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500 hover:text-white transition"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>Shift All Produce from {yard.name.split('(')[0]}</span>
                  </button>
                </div>
              )}

            </div>
          );
        })}
        </div>
      )}

    </div>
  );
};
