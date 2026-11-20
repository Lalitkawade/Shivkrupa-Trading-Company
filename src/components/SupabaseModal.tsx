import React, { useState } from 'react';
import { X, Database, CheckCircle2, Copy, ExternalLink, ShieldCheck, RefreshCw, Trash2 } from 'lucide-react';
import { SupabaseConfig } from '../types';
import { storage } from '../services/storage';
import { SUPABASE_SQL_SCHEMA } from '../services/supabaseSchema';
import { copyToClipboard } from '../utils/clipboard';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SupabaseConfig;
  onConfigUpdated: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  config,
  onConfigUpdated
}) => {
  if (!isOpen) return null;

  const [url, setUrl] = useState(config.url || '');
  const [anonKey, setAnonKey] = useState(config.anonKey || '');
  const [copiedSql, setCopiedSql] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const success = storage.setSupabaseConfig(url.trim(), anonKey.trim());
    if (success) {
      setStatusMsg('Connected to Supabase successfully!');
      setTimeout(() => {
        onConfigUpdated();
        onClose();
      }, 1000);
    } else {
      setStatusMsg('Disconnected from Supabase. App will run in offline LocalStorage mode.');
      onConfigUpdated();
    }
  };

  const copySqlScript = async () => {
    const ok = await copyToClipboard(SUPABASE_SQL_SCHEMA);
    if (ok) {
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    }
  };

  const handleResetData = () => {
    if (window.confirm('Are you sure you want to reset all pages to clean empty data? This will clear all local test transactions, yards, commodities, and parties so you can start 100% fresh with your database.')) {
      storage.clearAllData();
      setStatusMsg('All pages reset to empty data successfully!');
      setTimeout(() => {
        onConfigUpdated();
        window.location.reload();
      }, 500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-hidden">
      <div 
        className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl relative max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                Supabase Database Connection
              </h2>
              <p className="text-xs text-neutral-500">
                PostgreSQL Cloud Database (Free 500 MB Tier)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">

            {/* Status Callout */}
            <div className={`p-4 rounded-2xl border ${
              config.isConnected 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300' 
                : 'bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-300'
            }`}>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                <p className="text-xs font-bold">
                  {config.isConnected ? 'Cloud PostgreSQL Connected' : 'Local-First Demo Database Active'}
                </p>
              </div>
              <p className="text-[11px] mt-1 opacity-90">
                {config.isConnected 
                  ? 'All transactions, stock levels, and yard shifts are synchronized live to Supabase.' 
                  : 'The portal is currently storing all entries in browser storage. Enter your Supabase credentials below to sync with your free cloud database.'}
              </p>
            </div>

            {statusMsg && (
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold">
                {statusMsg}
              </div>
            )}
          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1.5">
              Project URL
            </label>
            <input
              type="text"
              placeholder="https://xyzcompany.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="apple-input text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1.5">
              Anon Public API Key
            </label>
            <input
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              className="apple-input text-xs font-mono"
            />
          </div>

          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                SQL Migration File
              </span>
              <button
                type="button"
                onClick={copySqlScript}
                className="apple-btn-secondary text-xs py-1.5 px-3"
              >
                {copiedSql ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? 'Copied to Clipboard!' : 'Copy SQL Schema'}</span>
              </button>
            </div>
            <p className="text-[11px] text-neutral-500">
              Paste and run this in your Supabase SQL Editor to automatically create all tables, indexes, and stock calculation views.
            </p>
          </div>

          {/* Reset Pages & Data for Testing */}
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 flex items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Reset Pages to Clean Empty State</span>
              </h4>
              <p className="text-[11px] text-rose-700/80 dark:text-rose-300/70 mt-0.5">
                Clear all test records (purchases, sales, yards, parties) to test with 100% fresh empty tables.
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetData}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition cursor-pointer whitespace-nowrap flex-shrink-0"
            >
              Reset Data Now
            </button>
          </div>

          </div>

          {/* Modal Actions Footer (Fixed at bottom) */}
          <div className="flex-shrink-0 p-4 sm:p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-900/95 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-center"
            >
              Close
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/25 transition active:scale-95 flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Save & Connect</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
