import React, { useState } from 'react';
import { 
  Download, 
  Share2, 
  Copy, 
  CheckCircle2, 
  Printer, 
  FileSpreadsheet, 
  Boxes, 
  ArrowDownLeft, 
  ArrowRightLeft, 
  ArrowUpRight,
  ExternalLink,
  MessageSquare,
  Trash2
} from 'lucide-react';
import type { CurrentYardStock, Purchase, Sale, YardTransfer, Yard, Material, Party } from '../types';
import { storage } from '../services/storage';
import { copyToClipboard } from '../utils/clipboard';

interface ExportDataViewProps {
  stockMatrix: CurrentYardStock[];
  purchases: Purchase[];
  sales: Sale[];
  transfers: YardTransfer[];
  yards: Yard[];
  materials: Material[];
  parties: Party[];
}

export const ExportDataView: React.FC<ExportDataViewProps> = ({
  stockMatrix,
  purchases,
  sales,
  transfers,
  yards,
  materials,
  parties
}) => {
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const whatsAppText = storage.generateWhatsAppDailyReport();

  const handleCopyWhatsApp = async () => {
    const ok = await copyToClipboard(whatsAppText);
    if (ok) {
      setCopiedWhatsApp(true);
      setTimeout(() => setCopiedWhatsApp(false), 2500);
    }
  };

  const handleOpenWhatsAppWeb = () => {
    const text = encodeURIComponent(whatsAppText);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  // Helper download trigger
  const triggerCsvDownload = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 1. Export Current Stock
  const exportStockBalanceCsv = () => {
    const headers = ['Commodity', 'Local Name', 'Grade', 'Storage Yard', 'Yard Type', 'Current Stock (Quintals)', 'Avg Cost (Rs/Qtl)', 'Est. Valuation (Rs)'];
    const rows = stockMatrix.map(s => [
      `"${s.material_name}"`,
      `"${s.material_local_name}"`,
      `"${s.material_grade}"`,
      `"${s.yard_name}"`,
      s.yard_type === 'apmc_shed' ? 'APMC Shed' : 'Personal Yard',
      s.current_stock_quintals,
      s.avg_purchase_rate,
      Math.round(s.current_stock_quintals * s.avg_purchase_rate)
    ]);
    triggerCsvDownload('shivkrupa_current_stock_balance', headers, rows);
  };

  // 2. Export Purchases
  const exportPurchasesCsv = () => {
    const headers = ['Purchase Date', 'Market Category', 'Mandi Hub', 'APMC Seller', 'Commodity', 'Receiving Yard', 'Qty (Quintals)', 'Purchase Rate (Rs)', 'Total Value (Rs)', 'Lot No', 'Vehicle No', 'Operator'];
    const rows = purchases.map(p => {
      const mat = materials.find(m => m.id === p.material_id)?.name || p.material_id;
      const yard = yards.find(y => y.id === p.yard_id)?.name || p.yard_id;
      const party = parties.find(pt => pt.id === p.party_id)?.name || p.party_id;
      return [
        p.purchase_date,
        p.market_category === 'private' ? 'Private APMC' : 'Government APMC',
        `"${p.market_location || 'Nagpur'}"`,
        `"${party}"`,
        `"${mat}"`,
        `"${yard}"`,
        p.qty_quintals,
        p.rate_per_quintal,
        p.total_amount,
        `"${p.lot_number || ''}"`,
        `"${p.vehicle_no || ''}"`,
        `"${p.created_by_name}"`
      ];
    });
    triggerCsvDownload('shivkrupa_inward_purchases', headers, rows);
  };

  // 3. Export Transfers
  const exportTransfersCsv = () => {
    const headers = ['Shift Date', 'Commodity', 'From Yard (Source)', 'To Yard (Destination)', 'Shifted Qty (Quintals)', 'Vehicle No', 'Transport Cost (Rs)', 'Operator', 'Notes'];
    const rows = transfers.map(t => {
      const mat = materials.find(m => m.id === t.material_id)?.name || t.material_id;
      const fromY = yards.find(y => y.id === t.from_yard_id)?.name || t.from_yard_id;
      const toY = yards.find(y => y.id === t.to_yard_id)?.name || t.to_yard_id;
      return [
        t.transfer_date,
        `"${mat}"`,
        `"${fromY}"`,
        `"${toY}"`,
        t.qty_quintals,
        `"${t.vehicle_no || ''}"`,
        t.transport_cost || 0,
        `"${t.created_by_name}"`,
        `"${t.notes || ''}"`
      ];
    });
    triggerCsvDownload('shivkrupa_yard_shifts_transfers', headers, rows);
  };

  // 4. Export Sales
  const exportSalesCsv = () => {
    const headers = ['Sale Date', 'Buyer Company', 'Commodity', 'Dispatched Yard', 'Sale Qty (Quintals)', 'Sale Price (Rs/Qtl)', 'Total Amount (Rs)', 'Challan No', 'Vehicle No', 'Operator'];
    const rows = sales.map(s => {
      const mat = materials.find(m => m.id === s.material_id)?.name || s.material_id;
      const yard = yards.find(y => y.id === s.yard_id)?.name || s.yard_id;
      const party = parties.find(pt => pt.id === s.party_id)?.name || s.party_id;
      return [
        s.sale_date,
        `"${party}"`,
        `"${mat}"`,
        `"${yard}"`,
        s.qty_quintals,
        s.rate_per_quintal,
        s.total_amount,
        `"${s.dispatch_challan_no || ''}"`,
        `"${s.vehicle_no || ''}"`,
        `"${s.created_by_name}"`
      ];
    });
    triggerCsvDownload('shivkrupa_outward_sales', headers, rows);
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200/60 dark:border-neutral-800">
        <div>
          <h2 className="text-xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
            Data Export & Day-End Closing Hub
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            1-Click WhatsApp closing reports, full Excel/CSV downloads, and printable registers
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="apple-btn-primary"
        >
          <Printer className="w-4 h-4" />
          <span>Print Official Daily Closing</span>
        </button>
      </div>

      {/* Section 1: WhatsApp Daily Closing Report Generator */}
      <div className="glass-panel p-6 border border-emerald-500/20 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Daily Closing Stock for WhatsApp
              </h3>
              <p className="text-xs text-neutral-500">
                Instantly generated summary of APMC Sheds vs. Personal Godowns for buyers and staff
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch lg:self-auto">
            <button
              onClick={handleCopyWhatsApp}
              className="apple-btn-secondary flex-1 sm:flex-initial text-xs sm:text-sm py-2 px-4"
            >
              {copiedWhatsApp ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              <span>{copiedWhatsApp ? 'Copied to Clipboard!' : 'Copy Text'}</span>
            </button>

            <button
              onClick={handleOpenWhatsAppWeb}
              className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-full font-semibold text-xs sm:text-sm text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm transition active:scale-95 flex-1 sm:flex-initial"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Share to WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Live Preview Box */}
        <div className="p-4 rounded-2xl bg-neutral-900 text-neutral-100 font-mono text-xs leading-relaxed max-h-56 overflow-y-auto border border-neutral-800 shadow-inner">
          <pre className="whitespace-pre-wrap">{whatsAppText}</pre>
        </div>
      </div>

      {/* Section 2: CSV & Excel Spreadsheets Export Matrix */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500">
          Spreadsheet Data Downloads (CSV / Excel)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Card A: Live Stock Balance */}
          <div className="glass-panel p-5 flex items-center justify-between hover:shadow-card transition">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Boxes className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Current Stock Balance by Yard
                </h4>
                <p className="text-xs text-neutral-500">
                  {stockMatrix.length} line items across {yards.length} locations
                </p>
              </div>
            </div>

            <button
              onClick={exportStockBalanceCsv}
              className="apple-btn-secondary text-xs py-2 px-3.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV</span>
            </button>
          </div>

          {/* Card B: Inward Purchases */}
          <div className="glass-panel p-5 flex items-center justify-between hover:shadow-card transition">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Inward Purchases Register
                </h4>
                <p className="text-xs text-neutral-500">
                  {purchases.length} total purchase records from APMC sellers
                </p>
              </div>
            </div>

            <button
              onClick={exportPurchasesCsv}
              className="apple-btn-secondary text-xs py-2 px-3.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV</span>
            </button>
          </div>

          {/* Card C: Yard Shifting Transfers */}
          <div className="glass-panel p-5 flex items-center justify-between hover:shadow-card transition">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Yard Shifting Register (Shed ➔ Yard)
                </h4>
                <p className="text-xs text-neutral-500">
                  {transfers.length} internal movement and vehicle records
                </p>
              </div>
            </div>

            <button
              onClick={exportTransfersCsv}
              className="apple-btn-secondary text-xs py-2 px-3.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV</span>
            </button>
          </div>

          {/* Card D: Outward Sales */}
          <div className="glass-panel p-5 flex items-center justify-between hover:shadow-card transition">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Outward Sales Dispatches
                </h4>
                <p className="text-xs text-neutral-500">
                  {sales.length} client company sale and challan dispatches
                </p>
              </div>
            </div>

            <button
              onClick={exportSalesCsv}
              className="apple-btn-secondary text-xs py-2 px-3.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV</span>
            </button>
          </div>

          {/* Card E: Clean Slate Database Testing Reset */}
          <div className="glass-panel p-5 border border-rose-200/80 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:shadow-card transition">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                  Reset Pages to Empty (Database Testing)
                </h4>
                <p className="text-xs text-rose-700/80 dark:text-rose-300/70">
                  Wipe all local test transactions and entities to test with fresh, clean empty tables.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                if (window.confirm('Reset all pages to empty data? This will clear all local transactions, yards, and parties so you can test fresh.')) {
                  storage.clearAllData();
                  window.location.reload();
                }
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition active:scale-95 cursor-pointer whitespace-nowrap self-start sm:self-auto"
            >
              Reset All Pages
            </button>
          </div>

        </div>
      </div>

    </div>
  );
};
