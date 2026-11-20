import React, { useState } from 'react';
import { X, Plus, Warehouse, Package, Users, Building2, CheckCircle2 } from 'lucide-react';
import { Yard, Material, Party, YardType, PartyType } from '../types';
import { storage } from '../services/storage';

interface MasterSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
  yards: Yard[];
  materials: Material[];
  parties: Party[];
  initialTab?: 'yards' | 'materials' | 'parties';
  initialPartyType?: PartyType;
}

export const MasterSetupModal: React.FC<MasterSetupModalProps> = ({
  isOpen,
  onClose,
  onUpdated,
  yards,
  materials,
  parties,
  initialTab = 'yards',
  initialPartyType = 'apmc_seller'
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'yards' | 'materials' | 'parties'>(initialTab);

  // New Yard State
  const [newYardName, setNewYardName] = useState('');
  const [newYardType, setNewYardType] = useState<YardType>('apmc_shed');
  const [newYardLocation, setNewYardLocation] = useState('');

  // New Material State
  const [newMatName, setNewMatName] = useState('');
  const [newMatLocal, setNewMatLocal] = useState('');
  const [newMatGrade, setNewMatGrade] = useState('Standard FAQ');

  // New Party State
  const [newPartyName, setNewPartyName] = useState('');
  const [newPartyType, setNewPartyType] = useState<PartyType>(initialPartyType);
  const [newPartyPhone, setNewPartyPhone] = useState('');
  const [newPartyCity, setNewPartyCity] = useState('');

  const handleAddYard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newYardName) return;
    storage.addYard({
      name: newYardName.trim(),
      type: newYardType,
      location: newYardLocation.trim() || 'APMC Yard',
      is_active: true
    });
    setNewYardName('');
    setNewYardLocation('');
    onUpdated();
  };

  const handleAddMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMatName) return;
    storage.addMaterial({
      name: newMatName.trim(),
      local_name: newMatLocal.trim() || newMatName.trim(),
      grade: newMatGrade.trim() || 'Standard FAQ',
      is_active: true
    });
    setNewMatName('');
    setNewMatLocal('');
    onUpdated();
  };

  const handleAddParty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartyName) return;
    storage.addParty({
      name: newPartyName.trim(),
      type: newPartyType,
      phone: newPartyPhone.trim() || undefined,
      city: newPartyCity.trim() || undefined,
      is_active: true
    });
    setNewPartyName('');
    setNewPartyPhone('');
    setNewPartyCity('');
    onUpdated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-hidden">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl max-h-[94vh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header (Fixed at top) */}
        <div className="p-4 sm:p-5 pb-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
              System Masters Setup
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5 hidden xs:block">
              Add and configure APMC Sheds, Godowns, Commodities, and Traders
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 overscroll-contain space-y-4">
          
          {/* Tab Controller (Mobile Responsive) */}
          <div className="segmented-bar w-full overflow-x-auto no-scrollbar flex p-1">
            <button
              onClick={() => setActiveTab('yards')}
              className={`segment-item flex-1 justify-center whitespace-nowrap text-xs ${activeTab === 'yards' ? 'active' : ''}`}
            >
              <Warehouse className="w-3.5 h-3.5" />
              <span>Yards ({yards.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('materials')}
              className={`segment-item flex-1 justify-center whitespace-nowrap text-xs ${activeTab === 'materials' ? 'active' : ''}`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Commodities ({materials.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('parties')}
              className={`segment-item flex-1 justify-center whitespace-nowrap text-xs ${activeTab === 'parties' ? 'active' : ''}`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Parties ({parties.length})</span>
            </button>
          </div>

        {/* YARDS TAB */}
        {activeTab === 'yards' && (
          <div className="space-y-5">
            {/* Add Form */}
            <form onSubmit={handleAddYard} className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700/60 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Add New Storage Yard / Shed</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Yard Name (e.g. APMC Shed #9 or MIDC Godown 3)"
                  value={newYardName}
                  onChange={(e) => setNewYardName(e.target.value)}
                  className="apple-input text-xs"
                />
                <select
                  value={newYardType}
                  onChange={(e) => setNewYardType(e.target.value as YardType)}
                  className="apple-input text-xs"
                >
                  <option value="apmc_shed">APMC Market Shed (Temporary Allotment)</option>
                  <option value="personal_yard">Personal Godown (Owned / Leased)</option>
                </select>
                <input
                  type="text"
                  placeholder="Location (e.g. Gate 3, APMC Market)"
                  value={newYardLocation}
                  onChange={(e) => setNewYardLocation(e.target.value)}
                  className="apple-input text-xs"
                />
              </div>
              <button type="submit" className="apple-btn-primary text-xs py-2 px-4">
                <Plus className="w-3.5 h-3.5" />
                <span>Save Yard</span>
              </button>
            </form>

            {/* List */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Configured Storage Yards</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {yards.map(y => (
                  <div key={y.id} className="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-start justify-between">
                    <div>
                      <p className="text-sm font-bold text-neutral-900 dark:text-white">{y.name}</p>
                      <p className="text-xs text-neutral-500">{y.location}</p>
                      <span className={`pill-badge ${y.type === 'apmc_shed' ? 'pill-shed' : 'pill-personal'} text-[10px] mt-1.5`}>
                        {y.type === 'apmc_shed' ? 'APMC Shed' : 'Personal Yard'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MATERIALS TAB */}
        {activeTab === 'materials' && (
          <div className="space-y-5">
            <form onSubmit={handleAddMaterial} className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700/60 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Add New Agricultural Commodity</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Commodity (e.g. Cotton Bales / कापूस)"
                  value={newMatName}
                  onChange={(e) => setNewMatName(e.target.value)}
                  className="apple-input text-xs"
                />
                <input
                  type="text"
                  placeholder="Local Name (e.g. कापूस)"
                  value={newMatLocal}
                  onChange={(e) => setNewMatLocal(e.target.value)}
                  className="apple-input text-xs"
                />
                <input
                  type="text"
                  placeholder="Grade / Quality (e.g. FAQ / Bold)"
                  value={newMatGrade}
                  onChange={(e) => setNewMatGrade(e.target.value)}
                  className="apple-input text-xs"
                />
              </div>
              <button type="submit" className="apple-btn-primary text-xs py-2 px-4">
                <Plus className="w-3.5 h-3.5" />
                <span>Save Commodity</span>
              </button>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {materials.map(m => (
                <div key={m.id} className="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                  <p className="text-sm font-bold text-neutral-900 dark:text-white">{m.name}</p>
                  <p className="text-xs text-neutral-500">{m.local_name} • Grade: {m.grade}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PARTIES TAB */}
        {activeTab === 'parties' && (
          <div className="space-y-5">
            <form onSubmit={handleAddParty} className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700/60 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Add APMC Trader or Buyer Company</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Party / Trader Name (e.g. Cargil India Pvt Ltd)"
                  value={newPartyName}
                  onChange={(e) => setNewPartyName(e.target.value)}
                  className="apple-input text-xs"
                />
                <select
                  value={newPartyType}
                  onChange={(e) => setNewPartyType(e.target.value as PartyType)}
                  className="form-input text-xs font-semibold"
                >
                  <option value="apmc_seller">1. APMC Seller (खरेदी अडत - We buy from them)</option>
                  <option value="buyer_company">2. Buyer Company (ग्राहक कंपनी - We sell to them)</option>
                  <option value="broker_agent">3. Broker / Agent (दलाल / मध्यस्थ - Sales Agent)</option>
                  <option value="hamal">4. Hamal / Labor Team (हमाल / तोलाई कामगार - Weekly Payout)</option>
                </select>
                <input
                  type="text"
                  placeholder="Phone Number (e.g. 9822001122)"
                  value={newPartyPhone}
                  onChange={(e) => setNewPartyPhone(e.target.value)}
                  className="apple-input text-xs"
                />
                <input
                  type="text"
                  placeholder="City / Mandi (e.g. Latur / Nagpur)"
                  value={newPartyCity}
                  onChange={(e) => setNewPartyCity(e.target.value)}
                  className="apple-input text-xs"
                />
              </div>
              <button type="submit" className="apple-btn-primary text-xs py-2 px-4">
                <Plus className="w-3.5 h-3.5" />
                <span>Save Party</span>
              </button>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {parties.map(p => (
                <div key={p.id} className="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                  <p className="text-sm font-bold text-neutral-900 dark:text-white">{p.name}</p>
                  <p className="text-xs text-neutral-500">{p.city || 'Mandi'} {p.phone ? `• ${p.phone}` : ''}</p>
                  <span className={`pill-badge ${
                    p.type === 'apmc_seller' 
                      ? 'pill-purchase' 
                      : p.type === 'buyer_company' 
                      ? 'pill-sale' 
                      : p.type === 'hamal'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                      : 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                  } text-[10px] mt-1.5`}>
                    {p.type === 'apmc_seller' ? 'APMC Seller' : p.type === 'buyer_company' ? 'Buyer Company' : p.type === 'hamal' ? 'Hamal / Labor (हमाल)' : 'Broker / Agent (दलाल)'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        </div>

      </div>
    </div>
  );
};
