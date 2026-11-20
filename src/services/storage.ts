// ==============================================================================
// SHIVKRUPA TRADING COMPANY - DATA & LEDGER ENGINE
// Supports local persistent storage + seamless Supabase sync
// ==============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { 
  Yard, 
  Material, 
  Party, 
  Purchase, 
  Sale, 
  YardTransfer, 
  CurrentYardStock, 
  UserProfile,
  SupabaseConfig,
  OperatingExpense,
  TransactionCharge,
  FinancialSummary,
  FinancialPeriodOption,
  BardanaRecord,
  BardanaSummary,
  BardanaYardStock,
  ClientBillingStatus,
  APMCSettlement,
  SettleAPMCFeesParams,
  WeeklyHamaliSettlement,
  SettleWeeklyHamaliParams,
  AuthSession
} from '../types';

// The 3 Authorized Users with equal administrative access (Default testing password: password123)
export const AUTHORIZED_USERS: (UserProfile & { email: string; password?: string })[] = [
  { 
    id: 'user-1', 
    name: 'Sambhaji Shinde (Owner)', 
    role: 'Managing Director / Owner', 
    email: 'sambhaji@shivkrupa.com',
    password: 'password123',
    avatar_initials: 'SS', 
    color: '#d97706' 
  },
  { 
    id: 'user-2', 
    name: 'Rahul Gadekar (Manager)', 
    role: 'Trading Manager', 
    email: 'rahul@shivkrupa.com',
    password: 'password123',
    avatar_initials: 'RG', 
    color: '#059669' 
  },
  { 
    id: 'user-3', 
    name: 'Sachin Patil (Yard Incharge)', 
    role: 'Yard Supervisor', 
    email: 'sachin@shivkrupa.com',
    password: 'password123',
    avatar_initials: 'SP', 
    color: '#2563eb' 
  }
];

// Initial Master Entities (Empty for fresh testing from scratch)
const DEFAULT_YARDS: Yard[] = [];
const DEFAULT_MATERIALS: Material[] = [];
const DEFAULT_PARTIES: Party[] = [];

const DEFAULT_PURCHASES: Purchase[] = [];

const DEFAULT_EXPENSES: OperatingExpense[] = [];

const DEFAULT_TRANSFERS: YardTransfer[] = [];

const DEFAULT_SALES: Sale[] = [];

// Initial Seed Data for Bardana (Packaging & Gunny Bags)
const DEFAULT_BARDANA_RECORDS: BardanaRecord[] = [];

// Initial APMC Mandi Settlements
const DEFAULT_APMC_SETTLEMENTS: APMCSettlement[] = [];

// Initial Weekly Hamali Settlements
const DEFAULT_WEEKLY_HAMALI_SETTLEMENTS: WeeklyHamaliSettlement[] = [];

export interface WeekInfo {
  weekKey: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
  label: string;
}

export function getWeekDetails(dateInput: string | Date): WeekInfo {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    const today = new Date();
    return getWeekDetails(today);
  }
  
  const year = d.getFullYear();
  const month = d.getMonth();
  const date = d.getDate();
  const localDate = new Date(year, month, date);

  // Day of week: 0 is Sunday, 1 is Monday ... 6 is Saturday
  const day = localDate.getDay();
  // Monday is 1st day of working week in APMC / Mandi trade
  const diffToMonday = day === 0 ? -6 : 1 - day;
  
  const monday = new Date(year, month, date + diffToMonday);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);

  // Calculate ISO week number from Monday
  const tempDate = new Date(monday.valueOf());
  tempDate.setDate(tempDate.getDate() + 3);
  const firstThursday = tempDate.valueOf();
  tempDate.setMonth(0, 1);
  if (tempDate.getDay() !== 4) {
    tempDate.setMonth(0, 1 + ((4 - tempDate.getDay() + 7) % 7));
  }
  const weekNumber = 1 + Math.ceil((firstThursday - tempDate.valueOf()) / 604800000);
  const weekYear = monday.getFullYear();

  const pad = (n: number) => n.toString().padStart(2, '0');
  const formatDate = (dt: Date) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const formatDisplay = (dt: Date) => `${pad(dt.getDate())} ${months[dt.getMonth()]}`;

  const startDate = formatDate(monday);
  const endDate = formatDate(sunday);
  const weekKey = `${weekYear}-W${pad(weekNumber)}`;
  const label = `Week ${weekNumber} (${formatDisplay(monday)} – ${formatDisplay(sunday)} ${weekYear})`;

  return {
    weekKey,
    weekNumber,
    startDate,
    endDate,
    label
  };
}

// Normalizes any project ref or URL into a proper https://<ref>.supabase.co URL
function normalizeSupabaseUrl(rawUrl: string): string {
  let url = (rawUrl || '').trim();
  if (!url) return '';
  url = url.replace(/\/+$/, '');
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    if (!url.includes('.')) {
      url = `https://${url}.supabase.co`;
    } else {
      url = `https://${url}`;
    }
  }
  return url;
}

// LocalStorage Keys
const KEYS = {
  YARDS: 'shivkrupa_yards',
  MATERIALS: 'shivkrupa_materials',
  PARTIES: 'shivkrupa_parties',
  PURCHASES: 'shivkrupa_purchases',
  SALES: 'shivkrupa_sales',
  TRANSFERS: 'shivkrupa_transfers',
  EXPENSES: 'shivkrupa_expenses',
  BARDANA: 'shivkrupa_bardana',
  APMC_SETTLEMENTS: 'shivkrupa_apmc_settlements',
  WEEKLY_HAMALI_SETTLEMENTS: 'shivkrupa_weekly_hamali_settlements',
  ACTIVE_USER: 'shivkrupa_active_user',
  AUTH_SESSION: 'shivkrupa_auth_session',
  SUPABASE_CONFIG: 'shivkrupa_supabase_config'
};

// --- BARDANA (PACKAGING & GUNNY BAGS) CONSTANTS & HELPERS ---
export function normalizeBardanaType(typeStr?: string): '🌾 Jute Gunny (ताग)' | '⚪ Plastic / HDPE (प्लास्टिक)' {
  if (!typeStr) return '🌾 Jute Gunny (ताग)';
  const s = typeStr.toLowerCase();
  if (s.includes('plastic') || s.includes('hdpe') || s.includes('प्लास्टिक')) {
    return '⚪ Plastic / HDPE (प्लास्टिक)';
  }
  return '🌾 Jute Gunny (ताग)';
}

export const CANONICAL_BARDANA_TYPES = [
  { id: '🌾 Jute Gunny (ताग)', name: '🌾 Jute Gunny Bag (ताग बारदान)', shortLabel: 'Jute Gunny (ताग)' },
  { id: '⚪ Plastic / HDPE (प्लास्टिक)', name: '⚪ Plastic / HDPE Bag (प्लास्टिक बारदान)', shortLabel: 'Plastic / HDPE (प्लास्टिक)' }
] as const;

class StorageService {
  private supabase: SupabaseClient | null = null;

  constructor() {
    this.cleanStaticDataForTesting();
    this.initSupabaseFromStorage();
  }

  // Wipes all sample data (Master entities & Transactions) so user tests 100% from scratch
  public cleanStaticDataForTesting(force: boolean = false): void {
    const MIGRATION_KEY = 'shivkrupa_clean_all_v7_empty_for_db_test';
    if (force || !localStorage.getItem(MIGRATION_KEY)) {
      this.clearAllData();
      localStorage.setItem(MIGRATION_KEY, 'true');
    }
  }

  // Resets ALL storage registers to empty [] (Yards, Commodities, Parties, and all transactions)
  public clearAllData(): void {
    localStorage.setItem(KEYS.YARDS, JSON.stringify([]));
    localStorage.setItem(KEYS.MATERIALS, JSON.stringify([]));
    localStorage.setItem(KEYS.PARTIES, JSON.stringify([]));
    localStorage.setItem(KEYS.PURCHASES, JSON.stringify([]));
    localStorage.setItem(KEYS.SALES, JSON.stringify([]));
    localStorage.setItem(KEYS.EXPENSES, JSON.stringify([]));
    localStorage.setItem(KEYS.TRANSFERS, JSON.stringify([]));
    localStorage.setItem(KEYS.BARDANA, JSON.stringify([]));
    localStorage.setItem(KEYS.APMC_SETTLEMENTS, JSON.stringify([]));
    localStorage.setItem(KEYS.WEEKLY_HAMALI_SETTLEMENTS, JSON.stringify([]));
  }

  public clearAllTransactions(): void {
    this.clearAllData();
  }

  // --- AUTHENTICATION & SESSION MANAGEMENT ---
  public getAuthSession(): AuthSession | null {
    const raw = localStorage.getItem(KEYS.AUTH_SESSION);
    if (!raw) return null;
    try {
      const session: AuthSession = JSON.parse(raw);
      return session;
    } catch {
      return null;
    }
  }

  public isAuthenticated(): boolean {
    return Boolean(this.getAuthSession());
  }

  public async loginWithEmailPassword(
    email: string, 
    password?: string
  ): Promise<{ success: boolean; session?: AuthSession; error?: string }> {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();

    if (!cleanEmail) {
      return { success: false, error: 'Please enter your email address (ईमेल टाका)' };
    }

    if (cleanPassword && cleanPassword.length < 4) {
      return { success: false, error: 'Password must be at least 4 characters (पासवर्ड किमान ४ अक्षरे असावा)' };
    }

    // 1. If Supabase is connected, authenticate directly through Supabase Auth
    if (this.supabase && cleanPassword) {
      try {
        const { data, error } = await this.supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword
        });

        if (error) {
          return { 
            success: false, 
            error: error.message || 'Supabase authentication failed. Please check your credentials.' 
          };
        }

        if (data?.user) {
          const userProfile: UserProfile = {
            id: data.user.id,
            name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Operator',
            role: data.user.user_metadata?.role || 'Authorized Operator',
            email: data.user.email || cleanEmail,
            avatar_initials: (data.user.email || cleanEmail).substring(0, 2).toUpperCase(),
            color: '#4C5C28'
          };

          const session: AuthSession = {
            user: userProfile,
            email: cleanEmail,
            token: data.session?.access_token,
            loginTime: new Date().toISOString()
          };

          localStorage.setItem(KEYS.AUTH_SESSION, JSON.stringify(session));
          this.setActiveUser(userProfile);
          return { success: true, session };
        }
      } catch (err: any) {
        return { success: false, error: err?.message || 'Error connecting to Supabase Auth.' };
      }
    }

    // 2. Standalone Mode (when Supabase URL / API key is not connected yet)
    // Allows testing before Supabase project is configured
    const baseName = cleanEmail.split('@')[0].replace(/[._-]/g, ' ');
    const formattedName = baseName.charAt(0).toUpperCase() + baseName.slice(1);
    const profile: UserProfile = {
      id: `user-${Date.now()}`,
      name: formattedName,
      role: 'Authorized Operator',
      email: cleanEmail,
      avatar_initials: cleanEmail.substring(0, 2).toUpperCase(),
      color: '#4C5C28'
    };

    const session: AuthSession = {
      user: profile,
      email: cleanEmail,
      loginTime: new Date().toISOString()
    };

    localStorage.setItem(KEYS.AUTH_SESSION, JSON.stringify(session));
    this.setActiveUser(profile);
    return { success: true, session };
  }

  public logout(): void {
    localStorage.removeItem(KEYS.AUTH_SESSION);
    if (this.supabase) {
      this.supabase.auth.signOut().catch(() => {});
    }
  }

  // --- SUPABASE CONFIGURATION ---
  public getSupabaseConfig(): SupabaseConfig {
    // 1. Check environment variables from .env first (highest priority)
    const envUrl = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL || '');
    const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
    if (envUrl && envKey) {
      return {
        url: envUrl,
        anonKey: envKey,
        isConnected: true
      };
    }

    // 2. Check saved localStorage settings
    const raw = localStorage.getItem(KEYS.SUPABASE_CONFIG);
    if (raw) {
      try {
        const stored = JSON.parse(raw);
        const storedUrl = normalizeSupabaseUrl(stored.url || '');
        const storedKey = (stored.anonKey || '').trim();
        if (storedUrl && storedKey) {
          return {
            url: storedUrl,
            anonKey: storedKey,
            isConnected: true
          };
        }
      } catch {
        // fallback
      }
    }

    return {
      url: envUrl || '',
      anonKey: envKey || '',
      isConnected: false
    };
  }

  public setSupabaseConfig(rawUrl: string, rawAnonKey: string): boolean {
    try {
      const url = normalizeSupabaseUrl(rawUrl);
      const anonKey = (rawAnonKey || '').trim();
      if (url && anonKey) {
        this.supabase = createClient(url, anonKey);
        const config: SupabaseConfig = { url, anonKey, isConnected: true };
        localStorage.setItem(KEYS.SUPABASE_CONFIG, JSON.stringify(config));
        return true;
      } else {
        this.supabase = null;
        localStorage.removeItem(KEYS.SUPABASE_CONFIG);
        return false;
      }
    } catch (e) {
      console.error('Failed to init Supabase client', e);
      return false;
    }
  }

  private initSupabaseFromStorage() {
    const config = this.getSupabaseConfig();
    if (config.url && config.anonKey) {
      try {
        this.supabase = createClient(config.url, config.anonKey);
      } catch (err) {
        console.error('Error instantiating Supabase', err);
      }
    }
  }

  public isSupabaseConnected(): boolean {
    return Boolean(this.supabase);
  }

  // --- ACTIVE USER SESSION ---
  public getActiveUser(): UserProfile {
    const session = this.getAuthSession();
    if (session?.user) {
      return session.user;
    }
    const raw = localStorage.getItem(KEYS.ACTIVE_USER);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        // fallback
      }
    }
    return AUTHORIZED_USERS[0]; // Default: Sambhaji Shinde (Owner)
  }

  public setActiveUser(user: UserProfile) {
    localStorage.setItem(KEYS.ACTIVE_USER, JSON.stringify(user));
  }

  // --- ENTITY RETRIEVAL (LOCAL FIRST WITH SEEDS) ---
  public getYards(): Yard[] {
    const data = localStorage.getItem(KEYS.YARDS);
    if (!data) {
      localStorage.setItem(KEYS.YARDS, JSON.stringify(DEFAULT_YARDS));
      return DEFAULT_YARDS;
    }
    const yards: Yard[] = JSON.parse(data);
    return yards.map(({ capacity_quintals, ...rest }) => rest);
  }

  public addYard(yard: Omit<Yard, 'id'>): Yard {
    const yards = this.getYards();
    const newYard: Yard = {
      ...yard,
      id: `yard-${Date.now()}`
    };
    yards.push(newYard);
    localStorage.setItem(KEYS.YARDS, JSON.stringify(yards));

    if (this.supabase) {
      this.supabase.from('yards').upsert([{
        id: newYard.id,
        name: newYard.name,
        location: newYard.location || 'APMC Yard',
        yard_type: newYard.type || 'personal_godown',
        is_active: newYard.is_active ?? true
      }]).then(({ error }) => {
        if (error) console.warn('Supabase sync warning for yard:', error.message);
      });
    }

    return newYard;
  }

  public getMaterials(): Material[] {
    const data = localStorage.getItem(KEYS.MATERIALS);
    if (!data) {
      localStorage.setItem(KEYS.MATERIALS, JSON.stringify(DEFAULT_MATERIALS));
      return DEFAULT_MATERIALS;
    }
    return JSON.parse(data);
  }

  public addMaterial(material: Omit<Material, 'id'>): Material {
    const materials = this.getMaterials();
    const newMat: Material = {
      ...material,
      id: `mat-${Date.now()}`
    };
    materials.push(newMat);
    localStorage.setItem(KEYS.MATERIALS, JSON.stringify(materials));

    if (this.supabase) {
      this.supabase.from('materials').upsert([{
        id: newMat.id,
        name: newMat.name,
        local_name: newMat.local_name || newMat.name,
        grade: newMat.grade || 'Standard',
        is_active: newMat.is_active ?? true
      }]).then(({ error }) => {
        if (error) console.warn('Supabase sync warning for material:', error.message);
      });
    }

    return newMat;
  }

  public getParties(): Party[] {
    const data = localStorage.getItem(KEYS.PARTIES);
    let parties: Party[] = [];
    if (!data) {
      localStorage.setItem(KEYS.PARTIES, JSON.stringify(DEFAULT_PARTIES));
      parties = [...DEFAULT_PARTIES];
    } else {
      try {
        parties = JSON.parse(data);
      } catch {
        parties = [...DEFAULT_PARTIES];
      }
    }

    // Auto-discover Hamal names from existing hamali expenses (e.g. Hemat Kumar)
    let partyAdded = false;
    const existingHamalNames = new Set(
      parties.filter(p => p.type === 'hamal').map(p => p.name.trim().toLowerCase())
    );

    const expensesRaw = localStorage.getItem(KEYS.EXPENSES);
    if (expensesRaw) {
      try {
        const expList: OperatingExpense[] = JSON.parse(expensesRaw);
        expList.forEach(e => {
          if (e.category === 'hamali_loading' && e.paid_to) {
            const cleanName = e.paid_to.trim();
            const lower = cleanName.toLowerCase();
            if (
              cleanName && 
              !existingHamalNames.has(lower) && 
              !lower.includes('transporter') && 
              !lower.includes('labour') &&
              !lower.includes('service') &&
              !lower.includes('other')
            ) {
              parties.push({
                id: `party-hamal-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                name: cleanName,
                type: 'hamal',
                city: 'APMC Market Yard',
                is_active: true
              });
              existingHamalNames.add(lower);
              partyAdded = true;
            }
          }
        });
      } catch {}
    }

    if (partyAdded) {
      localStorage.setItem(KEYS.PARTIES, JSON.stringify(parties));
    }

    return parties;
  }

  public addParty(party: Omit<Party, 'id'>): Party {
    const parties = this.getParties();
    const newParty: Party = {
      ...party,
      id: `party-${Date.now()}`
    };
    parties.push(newParty);
    localStorage.setItem(KEYS.PARTIES, JSON.stringify(parties));

    if (this.supabase) {
      this.supabase.from('parties').upsert([{
        id: newParty.id,
        name: newParty.name,
        type: newParty.type,
        phone: newParty.phone || null,
        city: newParty.city || null,
        is_active: newParty.is_active ?? true
      }]).then(({ error }) => {
        if (error) console.warn('Supabase sync warning for party:', error.message);
      });
    }

    return newParty;
  }

  // --- PURCHASES (STOCK INWARD) ---
  public getPurchases(): Purchase[] {
    const data = localStorage.getItem(KEYS.PURCHASES);
    if (!data) {
      localStorage.setItem(KEYS.PURCHASES, JSON.stringify(DEFAULT_PURCHASES));
      return DEFAULT_PURCHASES;
    }
    try {
      const parsed: Purchase[] = JSON.parse(data);
      return parsed.map(p => ({
        ...p,
        charges: p.charges || []
      }));
    } catch {
      return DEFAULT_PURCHASES;
    }
  }

  public addPurchase(entry: Omit<Purchase, 'id' | 'total_amount' | 'created_at'>): Purchase {
    const purchases = this.getPurchases();
    const feePercent = entry.market_fee_percent ?? (entry.market_category === 'private' ? 0.55 : 0.85);
    const totalAmount = Number((entry.qty_quintals * entry.rate_per_quintal).toFixed(2));
    const feeAmount = entry.market_fee_amount ?? Number((totalAmount * (feePercent / 100)).toFixed(2));
    const purchaseId = `pur-${Date.now()}`;

    // Ensure charges have unique IDs
    const formattedCharges: TransactionCharge[] = (entry.charges || []).map((chg, idx) => ({
      ...chg,
      id: chg.id || `chg-p-${Date.now()}-${idx}`,
      created_at: chg.created_at || new Date().toISOString()
    }));

    const newEntry: Purchase = {
      ...entry,
      id: purchaseId,
      total_amount: totalAmount,
      market_fee_percent: feePercent,
      market_fee_amount: feeAmount,
      market_fee_paid: entry.market_fee_paid ?? false,
      charges: formattedCharges,
      created_at: new Date().toISOString()
    };
    purchases.unshift(newEntry); // Latest first
    localStorage.setItem(KEYS.PURCHASES, JSON.stringify(purchases));

    // Automatically record additional charges as operating expenses with unified charge IDs
    formattedCharges.forEach(chg => {
      const isHamali = chg.category === 'hamali_loading';
      this.addExpense({
        expense_date: entry.purchase_date,
        category: chg.category,
        title: `${chg.title} (Inward Lot: ${newEntry.lot_number || newEntry.id})`,
        amount: chg.amount,
        yard_id: newEntry.yard_id,
        purchase_id: newEntry.id,
        paid_to: chg.paid_to || (isHamali ? 'Hamal Gang' : 'Hamal / Transporter'),
        payment_mode: chg.payment_mode || 'Cash',
        payment_status: chg.payment_status || (isHamali ? 'accrued_payable' : 'paid'),
        hamali_details: isHamali ? {
          work_type: 'unloading',
          gang_name: chg.paid_to || 'Hamal Gang',
          bag_count: chg.bag_count,
          rate_per_bag: chg.rate_per_bag,
          vehicle_no: newEntry.vehicle_no
        } : undefined,
        notes: chg.notes || `Charge linked to Purchase Lot ${newEntry.lot_number || newEntry.id}`,
        created_by_name: newEntry.created_by_name
      }, chg.id);
    });

    // Async push to Supabase if connected
    if (this.supabase) {
      this.supabase.from('purchases').insert([{
        id: newEntry.id,
        purchase_date: newEntry.purchase_date,
        material_id: newEntry.material_id,
        yard_id: newEntry.yard_id,
        party_id: newEntry.party_id,
        qty_quintals: newEntry.qty_quintals,
        rate_per_quintal: newEntry.rate_per_quintal,
        total_amount: newEntry.total_amount,
        market_category: newEntry.market_category,
        market_location: newEntry.market_location,
        market_fee_percent: newEntry.market_fee_percent,
        market_fee_amount: newEntry.market_fee_amount,
        market_fee_paid: newEntry.market_fee_paid,
        lot_number: newEntry.lot_number,
        vehicle_no: newEntry.vehicle_no,
        notes: newEntry.notes,
        created_by_name: newEntry.created_by_name
      }]).then(({ error }) => {
        if (error) console.warn('Supabase sync warning for purchase:', error.message);
      });
    }

    return newEntry;
  }

  public addChargeToPurchase(
    purchaseId: string, 
    charge: Omit<TransactionCharge, 'id' | 'created_at'>
  ): Purchase | null {
    const purchases = this.getPurchases();
    const purchase = purchases.find(p => p.id === purchaseId);
    if (!purchase) return null;

    const chargeId = `chg-p-${Date.now()}`;
    const newCharge: TransactionCharge = {
      ...charge,
      id: chargeId,
      created_at: new Date().toISOString()
    };

    if (!purchase.charges) purchase.charges = [];
    purchase.charges.push(newCharge);

    localStorage.setItem(KEYS.PURCHASES, JSON.stringify(purchases));

    // Also record in operating expenses with unified charge ID
    const isHamali = newCharge.category === 'hamali_loading';
    this.addExpense({
      expense_date: new Date().toISOString().split('T')[0],
      category: newCharge.category,
      title: `${newCharge.title} (Inward Lot: ${purchase.lot_number || purchase.id})`,
      amount: newCharge.amount,
      yard_id: purchase.yard_id,
      purchase_id: purchase.id,
      paid_to: newCharge.paid_to || (isHamali ? 'Hamal Gang' : 'Service Vendor'),
      payment_mode: newCharge.payment_mode || 'Cash',
      payment_status: newCharge.payment_status || (isHamali ? 'accrued_payable' : 'paid'),
      hamali_details: isHamali ? {
        work_type: 'unloading',
        gang_name: newCharge.paid_to || 'Hamal Gang',
        bag_count: newCharge.bag_count,
        rate_per_bag: newCharge.rate_per_bag,
        vehicle_no: purchase.vehicle_no
      } : undefined,
      notes: newCharge.notes || `Additional charge on purchase lot ${purchase.lot_number || ''}`,
      created_by_name: this.getActiveUser().name
    }, chargeId);

    return purchase;
  }

  public removeChargeFromPurchase(purchaseId: string, chargeId: string): Purchase | null {
    const purchases = this.getPurchases();
    const purchase = purchases.find(p => p.id === purchaseId);
    if (!purchase) return null;

    purchase.charges = (purchase.charges || []).filter(c => c.id !== chargeId);
    localStorage.setItem(KEYS.PURCHASES, JSON.stringify(purchases));

    // Also remove from operating expenses to prevent orphaned duplicate records!
    const expenses = this.getExpenses();
    const filteredExpenses = expenses.filter(e => e.id !== chargeId);
    if (filteredExpenses.length !== expenses.length) {
      localStorage.setItem(KEYS.EXPENSES, JSON.stringify(filteredExpenses));
    }

    return purchase;
  }

  public togglePurchaseFeePaid(purchaseId: string): Purchase[] {
    const purchases = this.getPurchases();
    const updated = purchases.map(p => {
      if (p.id === purchaseId) {
        const isPaid = !p.market_fee_paid;
        const feeRate = p.market_category === 'private' ? 0.0055 : 0.0085;
        const lotFee = p.market_fee_amount ?? Number(((p.total_amount || 0) * feeRate).toFixed(2));
        return {
          ...p,
          market_fee_paid: isPaid,
          market_fee_paid_amount: isPaid ? lotFee : 0,
          market_fee_payment_date: isPaid ? new Date().toISOString().split('T')[0] : undefined
        };
      }
      return p;
    });
    localStorage.setItem(KEYS.PURCHASES, JSON.stringify(updated));
    return updated;
  }

  // --- APMC MANDI FEES & SETTLEMENTS ---
  public getAPMCSettlements(): APMCSettlement[] {
    const data = localStorage.getItem(KEYS.APMC_SETTLEMENTS);
    if (!data) {
      localStorage.setItem(KEYS.APMC_SETTLEMENTS, JSON.stringify(DEFAULT_APMC_SETTLEMENTS));
      return DEFAULT_APMC_SETTLEMENTS;
    }
    try {
      return JSON.parse(data);
    } catch {
      return DEFAULT_APMC_SETTLEMENTS;
    }
  }

  public addAPMCSettlement(settlement: APMCSettlement): APMCSettlement {
    const list = this.getAPMCSettlements();
    list.unshift(settlement);
    localStorage.setItem(KEYS.APMC_SETTLEMENTS, JSON.stringify(list));

    if (this.supabase) {
      this.supabase.from('apmc_settlements').insert([{
        id: settlement.id,
        settlement_date: settlement.date,
        market_category: settlement.market_category,
        market_location: settlement.paid_to || 'Nagpur APMC',
        amount_paid: settlement.amount,
        payment_mode: settlement.payment_mode || 'Bank Transfer',
        reference_no: settlement.receipt_no,
        settlement_type: settlement.settlement_type || 'full',
        notes: settlement.notes || null,
        created_by_name: settlement.created_by_name || 'Admin'
      }]).then(({ error }) => {
        if (error) console.warn('Supabase sync warning for apmc_settlement:', error.message);
      });
    }

    return settlement;
  }

  public deleteAPMCSettlement(settlementId: string): void {
    const list = this.getAPMCSettlements();
    const settlement = list.find(s => s.id === settlementId);
    const filtered = list.filter(s => s.id !== settlementId);
    localStorage.setItem(KEYS.APMC_SETTLEMENTS, JSON.stringify(filtered));

    // Also clean up any legacy double-entry expense that matched this receipt
    if (settlement) {
      const expenses = this.getExpenses();
      const cleaned = expenses.filter(e => !(e.category === 'apmc_cess' && (e.title.includes(settlement.receipt_no) || e.notes?.includes(settlement.receipt_no))));
      if (cleaned.length !== expenses.length) {
        localStorage.setItem(KEYS.EXPENSES, JSON.stringify(cleaned));
      }
    }
  }

  public settleAPMCFees(params: SettleAPMCFeesParams): { settlement: APMCSettlement; updatedPurchases: Purchase[] } {
    const purchases = this.getPurchases();

    // 1. Identify candidate lots
    const candidateLots = purchases.filter(p => {
      // Market division filter
      const cat = p.market_category || 'government';
      if (params.market_category !== 'all' && cat !== params.market_category) return false;

      // Specific lots filter if provided
      if (params.specific_purchase_ids && params.specific_purchase_ids.length > 0) {
        return params.specific_purchase_ids.includes(p.id);
      }

      // Financial year period filter
      if (params.financial_year && params.financial_year !== 'all') {
        if (!this.matchesPeriod(p.purchase_date, params.financial_year)) return false;
      }

      // Month filter
      if (params.month && params.month !== 'all') {
        if (!p.purchase_date.startsWith(params.month)) return false;
      }

      return true;
    });

    // Sort chronologically (earliest purchase first for FIFO clearance)
    candidateLots.sort((a, b) => a.purchase_date.localeCompare(b.purchase_date));

    // Calculate total due across candidate lots
    const candidateLotsWithDue = candidateLots.map(p => {
      const rate = p.market_category === 'private' ? 0.0055 : 0.0085;
      const totalFee = p.market_fee_amount ?? Number(((p.total_amount || 0) * rate).toFixed(2));
      const alreadyPaid = p.market_fee_paid ? totalFee : (p.market_fee_paid_amount || 0);
      const due = Math.max(0, Number((totalFee - alreadyPaid).toFixed(2)));
      return { p, totalFee, alreadyPaid, due };
    });

    const lotsToUpdateMap = new Map<string, { isPaid: boolean; paidAmt: number }>();

    if (params.settlement_type === 'full') {
      // Clear 100% of candidate lots
      candidateLotsWithDue.forEach(({ p, totalFee }) => {
        lotsToUpdateMap.set(p.id, { isPaid: true, paidAmt: totalFee });
      });
    } else {
      // Partial payment: Allocate sequentially (FIFO)
      let remainingToAllocate = Math.max(0, params.amount);
      for (const item of candidateLotsWithDue) {
        if (item.due <= 0) continue;
        if (remainingToAllocate >= item.due) {
          lotsToUpdateMap.set(item.p.id, { isPaid: true, paidAmt: item.totalFee });
          remainingToAllocate = Number((remainingToAllocate - item.due).toFixed(2));
        } else if (remainingToAllocate > 0) {
          lotsToUpdateMap.set(item.p.id, { 
            isPaid: false, 
            paidAmt: Number((item.alreadyPaid + remainingToAllocate).toFixed(2)) 
          });
          remainingToAllocate = 0;
          break;
        }
      }
    }

    // Apply updates to main purchases list
    const updatedPurchases = purchases.map(p => {
      const update = lotsToUpdateMap.get(p.id);
      if (update) {
        return {
          ...p,
          market_fee_paid: update.isPaid,
          market_fee_paid_amount: update.paidAmt,
          market_fee_payment_ref: params.receipt_no,
          market_fee_payment_date: params.date
        };
      }
      return p;
    });

    localStorage.setItem(KEYS.PURCHASES, JSON.stringify(updatedPurchases));

    // 2. Create and store APMCSettlement receipt
    const settlement: APMCSettlement = {
      id: `apmc-set-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      date: params.date,
      financial_year: params.financial_year,
      month: params.month || 'all',
      market_category: params.market_category,
      settlement_type: params.settlement_type,
      amount: Number(params.amount.toFixed(2)),
      payment_mode: params.payment_mode,
      receipt_no: params.receipt_no,
      paid_to: params.paid_to,
      notes: params.notes,
      created_by_name: this.getActiveUser().name,
      created_at: new Date().toISOString()
    };
    this.addAPMCSettlement(settlement);

    // Single source of truth: APMC settlements are tracked in apmc_settlements ledger.
    // No duplicate entry is injected into general operating_expenses.

    return { settlement, updatedPurchases };
  }

  // --- OPERATING & YARD EXPENSES ---
  public getExpenses(): OperatingExpense[] {
    const data = localStorage.getItem(KEYS.EXPENSES);
    if (!data) {
      localStorage.setItem(KEYS.EXPENSES, JSON.stringify(DEFAULT_EXPENSES));
      return DEFAULT_EXPENSES;
    }
    try {
      const expenses: OperatingExpense[] = JSON.parse(data);
      let hasFix = false;
      const healed = expenses.map(e => {
        // Hamali expenses must be settled via weekly payout. If an expense lacks weekly_settlement_id
        // but was recorded as 'paid', revert it to 'accrued_payable' (Weekly Payout Due).
        if (e.category === 'hamali_loading' && !e.weekly_settlement_id && e.payment_status === 'paid') {
          hasFix = true;
          const amt = Number(e.amount) || 0;
          let hamali = e.hamali_details ? { ...e.hamali_details } : undefined;
          const defaultRate = 7.50;
          if (!hamali) {
            const derivedBags = amt > 0 ? Math.round(amt / defaultRate) : 0;
            hamali = {
              work_type: 'loading',
              gang_name: e.paid_to || 'Hamal Gang',
              rate_per_bag: defaultRate,
              bag_count: derivedBags
            };
          } else {
            if (!hamali.rate_per_bag || hamali.rate_per_bag <= 0) {
              hamali.rate_per_bag = defaultRate;
            }
            if (!hamali.bag_count || hamali.bag_count <= 0) {
              hamali.bag_count = Math.round(amt / hamali.rate_per_bag);
            }
            if (!hamali.gang_name && e.paid_to) {
              hamali.gang_name = e.paid_to;
            }
          }
          return {
            ...e,
            payment_status: 'accrued_payable' as const,
            hamali_details: hamali
          };
        }
        return e;
      });

      if (hasFix) {
        localStorage.setItem(KEYS.EXPENSES, JSON.stringify(healed));
      }
      return healed;
    } catch {
      return DEFAULT_EXPENSES;
    }
  }

  public addExpense(entry: Omit<OperatingExpense, 'id' | 'created_at'>, customId?: string): OperatingExpense {
    const expenses = this.getExpenses();
    const newEntry: OperatingExpense = {
      ...entry,
      id: customId || `exp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      created_at: new Date().toISOString()
    };
    expenses.unshift(newEntry);
    localStorage.setItem(KEYS.EXPENSES, JSON.stringify(expenses));

    if (this.supabase) {
      this.supabase.from('operating_expenses').insert([{
        id: newEntry.id,
        expense_date: newEntry.expense_date,
        category: newEntry.category,
        title: newEntry.title,
        amount: newEntry.amount,
        yard_id: newEntry.yard_id || null,
        party_id: newEntry.party_id || null,
        party_name: newEntry.party_name || null,
        purchase_id: newEntry.purchase_id || null,
        sale_id: newEntry.sale_id || null,
        paid_to: newEntry.paid_to || 'Vendor',
        payment_mode: newEntry.payment_mode || 'Cash',
        payment_status: newEntry.payment_status || 'paid',
        hamali_gang_name: newEntry.hamali_details?.gang_name || null,
        hamali_work_type: newEntry.hamali_details?.work_type || null,
        hamali_bag_count: newEntry.hamali_details?.bag_count ? parseInt(String(newEntry.hamali_details.bag_count)) : null,
        hamali_rate_per_bag: newEntry.hamali_details?.rate_per_bag ? parseFloat(String(newEntry.hamali_details.rate_per_bag)) : null,
        hamali_vehicle_no: newEntry.hamali_details?.vehicle_no || null,
        weekly_settlement_id: newEntry.weekly_settlement_id || null,
        weekly_settlement_date: newEntry.weekly_settlement_date || null,
        client_billing_status: newEntry.client_billing_status || null,
        notes: newEntry.notes || null,
        created_by_name: newEntry.created_by_name || 'Admin'
      }]).then(({ error }) => {
        if (error) console.warn('Supabase sync warning for operating_expense:', error.message);
      });
    }

    return newEntry;
  }

  public toggleExpensePaid(expenseId: string): OperatingExpense[] {
    const expenses = this.getExpenses();
    const updated = expenses.map(e => 
      e.id === expenseId 
        ? { ...e, payment_status: (e.payment_status === 'paid' ? 'accrued_payable' : 'paid') as 'paid' | 'accrued_payable' } 
        : e
    );
    localStorage.setItem(KEYS.EXPENSES, JSON.stringify(updated));
    return updated;
  }

  public updateExpenseClientBillingStatus(expenseId: string, status: ClientBillingStatus): OperatingExpense[] {
    const expenses = this.getExpenses();
    const updated = expenses.map(e => 
      e.id === expenseId ? { ...e, client_billing_status: status } : e
    );
    localStorage.setItem(KEYS.EXPENSES, JSON.stringify(updated));
    return updated;
  }

  public deleteExpense(expenseId: string): boolean {
    const expenses = this.getExpenses();
    const target = expenses.find(e => e.id === expenseId);
    const filtered = expenses.filter(e => e.id !== expenseId);
    if (filtered.length !== expenses.length) {
      localStorage.setItem(KEYS.EXPENSES, JSON.stringify(filtered));

      // Cascade remove from purchase if linked as a charge
      if (target?.purchase_id) {
        const purchases = this.getPurchases();
        const pur = purchases.find(p => p.id === target.purchase_id);
        if (pur && pur.charges) {
          pur.charges = pur.charges.filter(c => c.id !== expenseId);
          localStorage.setItem(KEYS.PURCHASES, JSON.stringify(purchases));
        }
      }

      // Cascade remove from sale if linked as a charge
      if (target?.sale_id) {
        const sales = this.getSales();
        const sal = sales.find(s => s.id === target.sale_id);
        if (sal && sal.charges) {
          sal.charges = sal.charges.filter(c => c.id !== expenseId);
          localStorage.setItem(KEYS.SALES, JSON.stringify(sales));
        }
      }

      return true;
    }
    return false;
  }

  // --- WEEKLY HAMALI SETTLEMENTS (आठवडी हमाली हिशोब व चुकती) ---
  public getWeeklyHamaliSettlements(): WeeklyHamaliSettlement[] {
    const data = localStorage.getItem(KEYS.WEEKLY_HAMALI_SETTLEMENTS);
    if (!data) {
      localStorage.setItem(KEYS.WEEKLY_HAMALI_SETTLEMENTS, JSON.stringify(DEFAULT_WEEKLY_HAMALI_SETTLEMENTS));
      return DEFAULT_WEEKLY_HAMALI_SETTLEMENTS;
    }
    try {
      return JSON.parse(data);
    } catch {
      return DEFAULT_WEEKLY_HAMALI_SETTLEMENTS;
    }
  }

  public addWeeklyHamaliSettlement(settlement: WeeklyHamaliSettlement): WeeklyHamaliSettlement {
    const list = this.getWeeklyHamaliSettlements();
    list.unshift(settlement);
    localStorage.setItem(KEYS.WEEKLY_HAMALI_SETTLEMENTS, JSON.stringify(list));

    if (this.supabase) {
      this.supabase.from('weekly_hamali_settlements').insert([{
        id: settlement.id,
        settlement_date: settlement.settlement_date,
        week_key: settlement.week_key,
        week_label: settlement.week_label,
        total_bags_cleared: settlement.total_bags,
        total_amount_paid: settlement.net_paid_amount,
        paid_to: settlement.paid_to,
        payment_mode: settlement.payment_mode || 'Cash',
        reference_no: settlement.receipt_no || null,
        lot_count: settlement.expense_ids?.length || 1,
        notes: settlement.notes || null,
        created_by_name: settlement.settled_by_name || 'Admin'
      }]).then(({ error }) => {
        if (error) console.warn('Supabase sync warning for weekly_hamali_settlement:', error.message);
      });
    }

    return settlement;
  }

  public deleteWeeklyHamaliSettlement(settlementId: string): void {
    const list = this.getWeeklyHamaliSettlements();
    const settlement = list.find(s => s.id === settlementId);
    const filtered = list.filter(s => s.id !== settlementId);
    localStorage.setItem(KEYS.WEEKLY_HAMALI_SETTLEMENTS, JSON.stringify(filtered));

    // If deleted, revert associated expenses back to accrued_payable
    if (settlement && settlement.expense_ids && settlement.expense_ids.length > 0) {
      const expenses = this.getExpenses();
      const updated = expenses.map(e => {
        if (settlement.expense_ids.includes(e.id)) {
          return {
            ...e,
            payment_status: 'accrued_payable' as 'paid' | 'accrued_payable',
            weekly_settlement_id: undefined,
            weekly_settlement_date: undefined
          };
        }
        return e;
      });
      localStorage.setItem(KEYS.EXPENSES, JSON.stringify(updated));
    }
  }

  public settleWeeklyHamali(params: SettleWeeklyHamaliParams): { settlement: WeeklyHamaliSettlement; updatedExpenses: OperatingExpense[] } {
    const settlementId = `whs-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newSettlement: WeeklyHamaliSettlement = {
      ...params,
      id: settlementId,
      created_at: new Date().toISOString()
    };

    // 1. Store weekly settlement voucher
    this.addWeeklyHamaliSettlement(newSettlement);

    // 2. Mark all linked daily hamali records as paid and attach settlement info
    const expenses = this.getExpenses();
    const updatedExpenses = expenses.map(e => {
      if (params.expense_ids.includes(e.id)) {
        return {
          ...e,
          payment_status: 'paid' as 'paid' | 'accrued_payable',
          weekly_settlement_id: settlementId,
          weekly_settlement_date: params.settlement_date
        };
      }
      return e;
    });

    localStorage.setItem(KEYS.EXPENSES, JSON.stringify(updatedExpenses));
    return { settlement: newSettlement, updatedExpenses };
  }

  // --- SALES (STOCK OUTWARD) ---
  public getSales(): Sale[] {
    const data = localStorage.getItem(KEYS.SALES);
    if (!data) {
      localStorage.setItem(KEYS.SALES, JSON.stringify(DEFAULT_SALES));
      return DEFAULT_SALES;
    }
    try {
      const parsed: Sale[] = JSON.parse(data);
      let updated = false;
      const result = parsed.map(s => {
        const charges = s.charges || [];
        const matAmount = s.material_amount ?? Number((s.qty_quintals * s.rate_per_quintal).toFixed(2));
        const chgAmount = s.charges_amount ?? charges.reduce((acc, c) => acc + (c.amount || 0), 0);
        const expectedTotal = Number((matAmount + chgAmount).toFixed(2));

        // When charges are present, total_amount must include charges billed to buyer
        if (s.total_amount !== expectedTotal || s.material_amount === undefined || s.charges_amount === undefined) {
          updated = true;
          return {
            ...s,
            material_amount: matAmount,
            charges_amount: chgAmount,
            total_amount: expectedTotal,
            charges
          };
        }
        return {
          ...s,
          charges
        };
      });

      if (updated) {
        localStorage.setItem(KEYS.SALES, JSON.stringify(result));
      }
      return result;
    } catch {
      return DEFAULT_SALES;
    }
  }

  public addSale(entry: Omit<Sale, 'id' | 'total_amount' | 'created_at'>): { success: boolean; sale?: Sale; error?: string } {
    // Validate that the Yard actually has enough available stock
    const available = this.getAvailableStockInYard(entry.yard_id, entry.material_id);
    if (entry.qty_quintals > available) {
      return {
        success: false,
        error: `Insufficient stock in this Yard! Available: ${available.toFixed(2)} Quintals, Attempted: ${entry.qty_quintals.toFixed(2)} Quintals.`
      };
    }

    const sales = this.getSales();
    const saleId = `sale-${Date.now()}`;

    // Ensure charges have unique IDs
    const formattedCharges: TransactionCharge[] = (entry.charges || []).map((chg, idx) => ({
      ...chg,
      id: chg.id || `chg-s-${Date.now()}-${idx}`,
      created_at: chg.created_at || new Date().toISOString()
    }));

    const materialAmount = Number((entry.qty_quintals * entry.rate_per_quintal).toFixed(2));
    const chargesAmount = formattedCharges.reduce((acc, c) => acc + (c.amount || 0), 0);
    const finalInvoiceAmount = Number((materialAmount + chargesAmount).toFixed(2));

    const newEntry: Sale = {
      ...entry,
      id: saleId,
      material_amount: materialAmount,
      charges_amount: chargesAmount,
      total_amount: finalInvoiceAmount, // Applied / Invoiced to Buyer!
      charges: formattedCharges,
      created_at: new Date().toISOString()
    };
    sales.unshift(newEntry);
    localStorage.setItem(KEYS.SALES, JSON.stringify(sales));

    const buyerParty = this.getParties().find(p => p.id === newEntry.party_id);

    // Automatically record dispatch charges as operating expenses with unified charge IDs
    formattedCharges.forEach(chg => {
      const isHamali = chg.category === 'hamali_loading';
      this.addExpense({
        expense_date: entry.sale_date,
        category: chg.category,
        title: `${chg.title} (${newEntry.invoice_no ? `Invoice: ${newEntry.invoice_no}` : newEntry.dispatch_challan_no ? `Challan: ${newEntry.dispatch_challan_no}` : newEntry.id})`,
        amount: chg.amount,
        yard_id: newEntry.yard_id,
        sale_id: newEntry.id,
        party_id: newEntry.party_id,
        party_name: buyerParty?.name || 'Buyer Company',
        paid_to: chg.paid_to || (isHamali ? 'Hamal Gang' : 'Labour / Transporter'),
        payment_mode: chg.payment_mode || 'Cash',
        payment_status: chg.payment_status || (isHamali ? 'accrued_payable' : 'paid'),
        client_billing_status: 'billable_to_client',
        hamali_details: isHamali ? {
          work_type: 'loading',
          gang_name: chg.paid_to || 'Hamal Gang',
          bag_count: chg.bag_count,
          rate_per_bag: chg.rate_per_bag,
          vehicle_no: newEntry.vehicle_no
        } : undefined,
        notes: chg.notes || `Dispatch charge billed to buyer ${buyerParty?.name || ''} on sale ${newEntry.invoice_no ? `Invoice: ${newEntry.invoice_no}` : newEntry.dispatch_challan_no ? `Challan: ${newEntry.dispatch_challan_no}` : newEntry.id}`,
        created_by_name: newEntry.created_by_name
      }, chg.id);
    });

    // Automatically record Bardana (packaging bags) deduction from yard stock if used
    if (newEntry.bardana_bags_used && Number(newEntry.bardana_bags_used) > 0) {
      const party = this.getParties().find(p => p.id === newEntry.party_id);
      this.addBardanaSaleUsage({
        sale_id: newEntry.id,
        sale_challan_no: newEntry.invoice_no || newEntry.dispatch_challan_no,
        yard_id: newEntry.bardana_yard_id || newEntry.yard_id,
        bardana_type: normalizeBardanaType(newEntry.bardana_type),
        qty_bags: Number(newEntry.bardana_bags_used),
        party_name: party?.name || 'Buyer Company',
        date: newEntry.sale_date,
        created_by_name: newEntry.created_by_name,
        notes: `Deducted for outward sale of ${newEntry.qty_quintals} Qtl (${newEntry.invoice_no ? `Invoice: ${newEntry.invoice_no}` : newEntry.id})`
      });
    }

    if (this.supabase) {
      this.supabase.from('sales').insert([{
        id: newEntry.id,
        sale_date: newEntry.sale_date,
        material_id: newEntry.material_id,
        yard_id: newEntry.yard_id,
        party_id: newEntry.party_id,
        broker_id: newEntry.broker_id,
        broker_name: newEntry.broker_name,
        brokerage_rate_per_qtl: newEntry.brokerage_rate_per_qtl,
        brokerage_total_amount: newEntry.brokerage_total_amount,
        qty_quintals: newEntry.qty_quintals,
        rate_per_quintal: newEntry.rate_per_quintal,
        material_amount: newEntry.material_amount,
        charges_amount: newEntry.charges_amount,
        total_amount: newEntry.total_amount,
        bardana_bags_used: newEntry.bardana_bags_used,
        bardana_type: newEntry.bardana_type,
        bardana_deducted: newEntry.bardana_deducted,
        bardana_yard_id: newEntry.bardana_yard_id,
        invoice_no: newEntry.invoice_no,
        transporter_name: newEntry.transporter_name,
        dispatch_challan_no: newEntry.dispatch_challan_no,
        vehicle_no: newEntry.vehicle_no,
        notes: newEntry.notes,
        created_by_name: newEntry.created_by_name
      }]).then(({ error }) => {
        if (error) console.warn('Supabase sync warning for sale:', error.message);
      });
    }

    return { success: true, sale: newEntry };
  }

  public addChargeToSale(
    saleId: string, 
    charge: Omit<TransactionCharge, 'id' | 'created_at'>
  ): Sale | null {
    const sales = this.getSales();
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return null;

    const chargeId = `chg-s-${Date.now()}`;
    const newCharge: TransactionCharge = {
      ...charge,
      id: chargeId,
      created_at: new Date().toISOString()
    };

    if (!sale.charges) sale.charges = [];
    sale.charges.push(newCharge);

    // Apply charge to Buyer account
    const matAmount = sale.material_amount ?? Number((sale.qty_quintals * sale.rate_per_quintal).toFixed(2));
    const chgAmount = sale.charges.reduce((acc, c) => acc + (c.amount || 0), 0);
    sale.material_amount = matAmount;
    sale.charges_amount = chgAmount;
    sale.total_amount = Number((matAmount + chgAmount).toFixed(2));

    localStorage.setItem(KEYS.SALES, JSON.stringify(sales));

    const buyerParty = this.getParties().find(p => p.id === sale.party_id);

    // Also record in operating expenses with unified charge ID
    const isHamali = newCharge.category === 'hamali_loading';
    this.addExpense({
      expense_date: new Date().toISOString().split('T')[0],
      category: newCharge.category,
      title: `${newCharge.title} (Dispatch: ${sale.dispatch_challan_no || sale.id})`,
      amount: newCharge.amount,
      yard_id: sale.yard_id,
      sale_id: sale.id,
      party_id: sale.party_id,
      party_name: buyerParty?.name || 'Buyer Company',
      paid_to: newCharge.paid_to || (isHamali ? 'Hamal Gang' : 'Service Vendor'),
      payment_mode: newCharge.payment_mode || 'Cash',
      payment_status: newCharge.payment_status || (isHamali ? 'accrued_payable' : 'paid'),
      client_billing_status: 'billable_to_client',
      hamali_details: isHamali ? {
        work_type: 'loading',
        gang_name: newCharge.paid_to || 'Hamal Gang',
        bag_count: newCharge.bag_count,
        rate_per_bag: newCharge.rate_per_bag,
        vehicle_no: sale.vehicle_no
      } : undefined,
      notes: newCharge.notes || `Additional charge billed to buyer ${buyerParty?.name || ''} on sale challan ${sale.dispatch_challan_no || ''}`,
      created_by_name: this.getActiveUser().name
    }, chargeId);

    return sale;
  }

  public removeChargeFromSale(saleId: string, chargeId: string): Sale | null {
    const sales = this.getSales();
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return null;

    sale.charges = (sale.charges || []).filter(c => c.id !== chargeId);
    const matAmount = sale.material_amount ?? Number((sale.qty_quintals * sale.rate_per_quintal).toFixed(2));
    const chgAmount = sale.charges.reduce((acc, c) => acc + (c.amount || 0), 0);
    sale.material_amount = matAmount;
    sale.charges_amount = chgAmount;
    sale.total_amount = Number((matAmount + chgAmount).toFixed(2));
    localStorage.setItem(KEYS.SALES, JSON.stringify(sales));

    // Also remove from operating expenses to prevent orphaned duplicate records!
    const expenses = this.getExpenses();
    const filteredExpenses = expenses.filter(e => e.id !== chargeId);
    if (filteredExpenses.length !== expenses.length) {
      localStorage.setItem(KEYS.EXPENSES, JSON.stringify(filteredExpenses));
    }

    return sale;
  }

  // --- BARDANA (PACKAGING & GUNNY BAGS) INVENTORY & DEDUCTIONS ---
  public getBardanaRecords(): BardanaRecord[] {
    const data = localStorage.getItem(KEYS.BARDANA);
    if (!data) {
      localStorage.setItem(KEYS.BARDANA, JSON.stringify(DEFAULT_BARDANA_RECORDS));
      return DEFAULT_BARDANA_RECORDS;
    }
    try {
      return JSON.parse(data);
    } catch {
      return DEFAULT_BARDANA_RECORDS;
    }
  }

  public addBardanaPurchase(entry: Omit<BardanaRecord, 'id' | 'type' | 'created_at'> & { record_as_expense?: boolean }): BardanaRecord {
    const records = this.getBardanaRecords();
    const id = `bar-pur-${Date.now()}`;
    const totalAmount = entry.total_amount ?? Number((entry.qty_bags * (entry.rate_per_bag || 0)).toFixed(2));
    const normalizedType = normalizeBardanaType(entry.bardana_type);
    
    const newRecord: BardanaRecord = {
      ...entry,
      id,
      type: 'purchase',
      bardana_type: normalizedType,
      total_amount: totalAmount,
      created_at: new Date().toISOString()
    };
    records.unshift(newRecord);
    localStorage.setItem(KEYS.BARDANA, JSON.stringify(records));

    if (this.supabase) {
      this.supabase.from('bardana_records').insert([{
        id: newRecord.id,
        record_date: newRecord.date,
        transaction_type: 'purchase',
        bag_type: newRecord.bardana_type,
        bag_condition: newRecord.bag_condition || 'new',
        quantity_bags: newRecord.qty_bags,
        rate_per_bag: newRecord.rate_per_bag || null,
        total_amount: newRecord.total_amount,
        yard_id: newRecord.yard_id,
        vendor_party_id: newRecord.party_id || null,
        vendor_party_name: newRecord.party_name || null,
        invoice_no: newRecord.reference_no || null,
        notes: newRecord.notes || null,
        created_by_name: newRecord.created_by_name || 'Admin'
      }]).then(({ error }) => {
        if (error) console.warn('Supabase sync warning for bardana_record:', error.message);
      });
    }

    // Optionally record in Operating Expenses register
    if (entry.record_as_expense) {
      this.addExpense({
        expense_date: entry.date,
        category: 'other',
        title: `Bardana Purchase: ${entry.qty_bags} Bags (${normalizedType})`,
        amount: totalAmount,
        yard_id: entry.yard_id,
        paid_to: entry.party_name || 'Bardana Supplier',
        payment_mode: 'Bank Transfer / NEFT',
        payment_status: 'paid',
        notes: entry.notes || `Purchased ${entry.qty_bags} bags @ ₹${entry.rate_per_bag}/bag`,
        created_by_name: entry.created_by_name
      });
    }

    return newRecord;
  }

  public addBardanaSaleUsage(entry: {
    sale_id?: string;
    sale_challan_no?: string;
    yard_id: string;
    bardana_type: string;
    qty_bags: number;
    party_name?: string;
    date: string;
    created_by_name: string;
    notes?: string;
  }): BardanaRecord {
    const records = this.getBardanaRecords();
    const id = `bar-use-${Date.now()}`;
    const normalizedType = normalizeBardanaType(entry.bardana_type);

    const newRecord: BardanaRecord = {
      id,
      type: 'sale_usage',
      date: entry.date,
      bardana_type: normalizedType,
      bag_condition: 'new',
      qty_bags: entry.qty_bags,
      yard_id: entry.yard_id,
      sale_id: entry.sale_id,
      party_name: entry.party_name,
      reference_no: entry.sale_challan_no,
      notes: entry.notes || `Bags deducted for dispatch ${entry.sale_challan_no || ''}`,
      created_by_name: entry.created_by_name,
      created_at: new Date().toISOString()
    };
    records.unshift(newRecord);
    localStorage.setItem(KEYS.BARDANA, JSON.stringify(records));

    if (this.supabase) {
      this.supabase.from('bardana_records').insert([{
        id: newRecord.id,
        record_date: newRecord.date,
        transaction_type: 'sale_usage',
        bag_type: newRecord.bardana_type,
        bag_condition: 'new',
        quantity_bags: newRecord.qty_bags,
        rate_per_bag: null,
        total_amount: 0,
        yard_id: newRecord.yard_id,
        sale_id: newRecord.sale_id || null,
        notes: newRecord.notes || null,
        created_by_name: newRecord.created_by_name || 'Admin'
      }]).then(({ error }) => {
        if (error) console.warn('Supabase sync warning for bardana_record:', error.message);
      });
    }
    return newRecord;
  }

  public deleteBardanaRecord(recordId: string): boolean {
    const records = this.getBardanaRecords();
    const filtered = records.filter(r => r.id !== recordId);
    if (filtered.length !== records.length) {
      localStorage.setItem(KEYS.BARDANA, JSON.stringify(filtered));
      return true;
    }
    return false;
  }

  public getAvailableBardanaInYard(yardId: string, bardanaType?: string): number {
    const records = this.getBardanaRecords().filter(r => {
      if (r.yard_id !== yardId) return false;
      if (bardanaType && normalizeBardanaType(r.bardana_type) !== normalizeBardanaType(bardanaType)) {
        return false;
      }
      return true;
    });
    const purchased = records.filter(r => r.type === 'purchase').reduce((acc, r) => acc + (r.qty_bags || 0), 0);
    const used = records.filter(r => r.type === 'sale_usage').reduce((acc, r) => acc + (r.qty_bags || 0), 0);
    const returns = records.filter(r => r.type === 'return').reduce((acc, r) => acc + (r.qty_bags || 0), 0);
    const adjustments = records.filter(r => r.type === 'adjustment').reduce((acc, r) => acc + (r.qty_bags || 0), 0);
    return Math.max(0, purchased - used + returns + adjustments);
  }

  public getBardanaSummary(): BardanaSummary {
    const records = this.getBardanaRecords();
    const yards = this.getYards();
    
    let totalBagsPurchased = 0;
    let totalBagsUsed = 0;
    let totalPurchasedValuation = 0;

    records.forEach(r => {
      if (r.type === 'purchase') {
        totalBagsPurchased += (r.qty_bags || 0);
        totalPurchasedValuation += (r.total_amount || ((r.qty_bags || 0) * (r.rate_per_bag || 0)));
      } else if (r.type === 'sale_usage') {
        totalBagsUsed += (r.qty_bags || 0);
      }
    });

    const totalBagsInStock = Math.max(0, totalBagsPurchased - totalBagsUsed);
    const avgRatePerBag = totalBagsPurchased > 0 ? Math.round(totalPurchasedValuation / totalBagsPurchased) : 55;
    const totalValuation = totalBagsInStock * avgRatePerBag;

    const yardDistribution: BardanaYardStock[] = yards.map(yard => {
      const yardRecs = records.filter(r => r.yard_id === yard.id);
      const yPurchased = yardRecs.filter(r => r.type === 'purchase').reduce((acc, r) => acc + (r.qty_bags || 0), 0);
      const yUsed = yardRecs.filter(r => r.type === 'sale_usage').reduce((acc, r) => acc + (r.qty_bags || 0), 0);
      return {
        yard_id: yard.id,
        yard_name: yard.name,
        yard_type: yard.type,
        bags_in_stock: Math.max(0, yPurchased - yUsed),
        bags_purchased: yPurchased,
        bags_used: yUsed
      };
    });

    const typeDistribution = CANONICAL_BARDANA_TYPES.map(ct => {
      const tRecs = records.filter(r => normalizeBardanaType(r.bardana_type) === ct.id);
      const tPurchased = tRecs.filter(r => r.type === 'purchase').reduce((acc, r) => acc + (r.qty_bags || 0), 0);
      const tUsed = tRecs.filter(r => r.type === 'sale_usage').reduce((acc, r) => acc + (r.qty_bags || 0), 0);
      return {
        bardana_type: ct.name,
        bags_in_stock: Math.max(0, tPurchased - tUsed)
      };
    });

    return {
      totalBagsInStock,
      totalBagsPurchased,
      totalBagsUsed,
      avgRatePerBag,
      totalValuation,
      yardDistribution,
      typeDistribution
    };
  }

  // --- YARD TRANSFERS (INTERNAL SHIFTING) ---
  public getYardTransfers(): YardTransfer[] {
    const data = localStorage.getItem(KEYS.TRANSFERS);
    if (!data) {
      localStorage.setItem(KEYS.TRANSFERS, JSON.stringify(DEFAULT_TRANSFERS));
      return DEFAULT_TRANSFERS;
    }
    return JSON.parse(data);
  }

  public addYardTransfer(entry: Omit<YardTransfer, 'id' | 'created_at'>): { success: boolean; transfer?: YardTransfer; error?: string } {
    if (entry.from_yard_id === entry.to_yard_id) {
      return { success: false, error: 'Source and Destination yard cannot be the same!' };
    }

    const available = this.getAvailableStockInYard(entry.from_yard_id, entry.material_id);
    if (entry.qty_quintals > available) {
      return {
        success: false,
        error: `Cannot shift! Only ${available.toFixed(2)} Quintals available in the source yard.`
      };
    }

    const transfers = this.getYardTransfers();
    const newEntry: YardTransfer = {
      ...entry,
      id: `trf-${Date.now()}`,
      created_at: new Date().toISOString()
    };
    transfers.unshift(newEntry);
    localStorage.setItem(KEYS.TRANSFERS, JSON.stringify(transfers));

    if (this.supabase) {
      this.supabase.from('yard_transfers').insert([{
        id: newEntry.id,
        transfer_date: newEntry.transfer_date,
        material_id: newEntry.material_id,
        from_yard_id: newEntry.from_yard_id,
        to_yard_id: newEntry.to_yard_id,
        qty_quintals: newEntry.qty_quintals,
        vehicle_no: newEntry.vehicle_no,
        transport_cost: newEntry.transport_cost,
        notes: newEntry.notes,
        created_by_name: newEntry.created_by_name
      }]).then(({ error }) => {
        if (error) console.warn('Supabase sync warning for transfer:', error.message);
      });
    }

    return { success: true, transfer: newEntry };
  }

  // --- ATOMIC LIVE STOCK BALANCE CALCULATION ---
  public getAvailableStockInYard(yardId: string, materialId: string): number {
    const purchases = this.getPurchases().filter(p => p.yard_id === yardId && p.material_id === materialId);
    const sales = this.getSales().filter(s => s.yard_id === yardId && s.material_id === materialId);
    const transfersOut = this.getYardTransfers().filter(t => t.from_yard_id === yardId && t.material_id === materialId);
    const transfersIn = this.getYardTransfers().filter(t => t.to_yard_id === yardId && t.material_id === materialId);

    const totalPurchased = purchases.reduce((acc, p) => acc + Number(p.qty_quintals), 0);
    const totalSold = sales.reduce((acc, s) => acc + Number(s.qty_quintals), 0);
    const totalOut = transfersOut.reduce((acc, t) => acc + Number(t.qty_quintals), 0);
    const totalIn = transfersIn.reduce((acc, t) => acc + Number(t.qty_quintals), 0);

    return Number((totalPurchased + totalIn - totalSold - totalOut).toFixed(2));
  }

  public getLiveStockMatrix(): CurrentYardStock[] {
    const yards = this.getYards();
    const materials = this.getMaterials();
    const purchases = this.getPurchases();
    const sales = this.getSales();
    const transfers = this.getYardTransfers();

    const result: CurrentYardStock[] = [];

    yards.forEach(yard => {
      materials.forEach(material => {
        const yardPurchases = purchases.filter(p => p.yard_id === yard.id && p.material_id === material.id);
        const yardSales = sales.filter(s => s.yard_id === yard.id && s.material_id === material.id);
        const yardTransfersOut = transfers.filter(t => t.from_yard_id === yard.id && t.material_id === material.id);
        const yardTransfersIn = transfers.filter(t => t.to_yard_id === yard.id && t.material_id === material.id);

        const totalPurchasedQty = yardPurchases.reduce((acc, p) => acc + Number(p.qty_quintals), 0);
        const totalPurchasedVal = yardPurchases.reduce((acc, p) => acc + Number(p.total_amount), 0);
        const totalSoldQty = yardSales.reduce((acc, s) => acc + Number(s.qty_quintals), 0);
        const totalTransferredInQty = yardTransfersIn.reduce((acc, t) => acc + Number(t.qty_quintals), 0);
        const totalTransferredOutQty = yardTransfersOut.reduce((acc, t) => acc + Number(t.qty_quintals), 0);

        const netStock = totalPurchasedQty + totalTransferredInQty - totalSoldQty - totalTransferredOutQty;
        const avgRate = totalPurchasedQty > 0 ? Math.round(totalPurchasedVal / totalPurchasedQty) : 0;

        // Include entry if there is stock or transaction history
        if (totalPurchasedQty > 0 || totalSoldQty > 0 || totalTransferredInQty > 0 || totalTransferredOutQty > 0 || netStock > 0) {
          result.push({
            yard_id: yard.id,
            yard_name: yard.name,
            yard_type: yard.type,
            yard_location: yard.location,
            material_id: material.id,
            material_name: material.name,
            material_local_name: material.local_name,
            material_grade: material.grade,
            total_purchased_qty: Number(totalPurchasedQty.toFixed(2)),
            total_sold_qty: Number(totalSoldQty.toFixed(2)),
            total_transferred_in_qty: Number(totalTransferredInQty.toFixed(2)),
            total_transferred_out_qty: Number(totalTransferredOutQty.toFixed(2)),
            current_stock_quintals: Number(netStock.toFixed(2)),
            avg_purchase_rate: avgRate
          });
        }
      });
    });

    return result;
  }

  // --- FINANCIAL PERIODS & YEAR-WISE AUDIT SELECTOR ---
  public getDashboardYearPeriods(): FinancialPeriodOption[] {
    const purchases = this.getPurchases();
    const sales = this.getSales();
    const expenses = this.getExpenses();

    const dates: string[] = [];
    purchases.forEach(p => { if (p.purchase_date) dates.push(p.purchase_date); });
    sales.forEach(s => { if (s.sale_date) dates.push(s.sale_date); });
    expenses.forEach(e => { if (e.expense_date) dates.push(e.expense_date); });

    const now = new Date();
    const currentYear = now.getFullYear();

    const yearSet = new Set<number>();
    yearSet.add(currentYear);

    // Seed passed years (all prior years going back)
    for (let yr = currentYear - 1; yr >= currentYear - 6; yr--) {
      yearSet.add(yr);
    }

    // Dynamic years from recorded transactions
    dates.forEach(d => {
      const yr = parseInt(d.slice(0, 4), 10);
      if (!isNaN(yr) && yr > 2000) {
        yearSet.add(yr);
      }
    });

    const options: FinancialPeriodOption[] = [
      { id: 'all', label: 'All Time (सर्व नोंदी)', type: 'all' }
    ];

    // Sorted descending
    const sortedYears = Array.from(yearSet).sort((a, b) => b - a);
    sortedYears.forEach(yr => {
      const isCurrent = yr === currentYear;
      options.push({
        id: String(yr),
        label: isCurrent ? `${yr} (चालू वर्ष)` : `${yr}`,
        type: 'calendar_year',
        isCurrent
      });
    });

    return options;
  }

  public getAvailableFinancialPeriods(): FinancialPeriodOption[] {
    const purchases = this.getPurchases();
    const sales = this.getSales();
    const expenses = this.getExpenses();

    const dates: string[] = [];
    purchases.forEach(p => { if (p.purchase_date) dates.push(p.purchase_date); });
    sales.forEach(s => { if (s.sale_date) dates.push(s.sale_date); });
    expenses.forEach(e => { if (e.expense_date) dates.push(e.expense_date); });

    // Current date reference for Indian FY (April - March)
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentFyStart = currentMonth >= 4 ? currentYear : currentYear - 1;

    const fySet = new Set<string>();
    const cySet = new Set<number>();

    // Seed current and prior year / FY
    fySet.add(`fy_${currentFyStart}_${String(currentFyStart + 1).slice(-2)}`);
    fySet.add(`fy_${currentFyStart - 1}_${String(currentFyStart).slice(-2)}`);
    cySet.add(currentYear);
    cySet.add(currentYear - 1);

    // Extract dynamic years and financial years from all recorded data
    dates.forEach(d => {
      const yr = parseInt(d.slice(0, 4), 10);
      const mo = parseInt(d.slice(5, 7), 10);
      if (!isNaN(yr)) {
        cySet.add(yr);
        if (!isNaN(mo)) {
          const fStart = mo >= 4 ? yr : yr - 1;
          fySet.add(`fy_${fStart}_${String(fStart + 1).slice(-2)}`);
        }
      }
    });

    const options: FinancialPeriodOption[] = [
      { id: 'all', label: 'All Time (सर्व काळ - सर्व नोंदी)', type: 'all' }
    ];

    // Sorted FY options (descending)
    const sortedFys = Array.from(fySet).sort().reverse();
    sortedFys.forEach(fy => {
      const parts = fy.split('_');
      const startYear = parseInt(parts[1], 10);
      const endYear = startYear + 1;
      const isCurrent = startYear === currentFyStart;
      options.push({
        id: fy,
        label: `FY ${startYear}-${String(endYear).slice(-2)}${isCurrent ? ' (चालू आर्थिक वर्ष)' : ''}`,
        type: 'financial_year',
        isCurrent
      });
    });

    // Sorted Calendar Year options (descending)
    const sortedCys = Array.from(cySet).sort((a, b) => b - a);
    sortedCys.forEach(yr => {
      const isCurrent = yr === currentYear;
      options.push({
        id: `cy_${yr}`,
        label: `${yr} (कॅलेंडर वर्ष)${isCurrent ? ' - चालू वर्ष' : ''}`,
        type: 'calendar_year',
        isCurrent
      });
    });

    return options;
  }

  public matchesPeriod(dateStr?: string, periodId: string = 'all'): boolean {
    if (!periodId || periodId === 'all') return true;
    if (!dateStr) return false;

    if (periodId.startsWith('cy_')) {
      const year = periodId.replace('cy_', '');
      return dateStr.startsWith(year);
    }

    if (periodId.startsWith('fy_')) {
      const parts = periodId.split('_');
      if (parts.length >= 2) {
        const startYear = parseInt(parts[1], 10);
        const startDate = `${startYear}-04-01`;
        const endDate = `${startYear + 1}-03-31`;
        return dateStr >= startDate && dateStr <= endDate;
      }
    }

    if (/^\d{4}$/.test(periodId)) {
      return dateStr.startsWith(periodId);
    }

    return true;
  }

  // --- FINANCIAL & PROFIT SUMMARY (AFTER ALL DEDUCTIONS - SUPPORTS YEAR-WISE & ALL TIME) ---
  public getFinancialSummary(periodId: string = 'all'): FinancialSummary {
    const allPurchases = this.getPurchases();
    const allSales = this.getSales();
    const allExpenses = this.getExpenses();
    const matrix = this.getLiveStockMatrix();

    // Filter datasets by selected period
    const purchases = allPurchases.filter(p => this.matchesPeriod(p.purchase_date, periodId));
    const sales = allSales.filter(s => this.matchesPeriod(s.sale_date, periodId));
    const expenses = allExpenses.filter(e => this.matchesPeriod(e.expense_date, periodId));

    // Resolve period human label
    const periods = this.getAvailableFinancialPeriods();
    const dashboardPeriods = this.getDashboardYearPeriods();
    const currentPeriodObj = dashboardPeriods.find(p => p.id === periodId) || periods.find(p => p.id === periodId);
    const periodLabel = currentPeriodObj ? currentPeriodObj.label : (/^\d{4}$/.test(periodId) ? `Year ${periodId}` : 'All Time');

    // 1. Purchases
    const totalPurchaseGross = purchases.reduce((acc, p) => acc + (p.total_amount || 0), 0);
    const totalPurchasedQty = purchases.reduce((acc, p) => acc + (p.qty_quintals || 0), 0);
    const totalPurchaseCharges = purchases.reduce((acc, p) => {
      const chargeSum = (p.charges || []).reduce((cAcc, c) => cAcc + (c.amount || 0), 0);
      return acc + chargeSum;
    }, 0);
    const totalApmcCess = purchases.reduce((acc, p) => {
      const feeRate = p.market_category === 'private' ? 0.0055 : 0.0085;
      const feeAmt = p.market_fee_amount ?? Number(((p.total_amount || 0) * feeRate).toFixed(2));
      return acc + feeAmt;
    }, 0);
    const totalPurchaseNet = totalPurchaseGross + totalPurchaseCharges + totalApmcCess;

    // 2. Sales
    const totalSaleGross = sales.reduce((acc, s) => acc + (s.total_amount || 0), 0);
    const totalSoldQty = sales.reduce((acc, s) => acc + (s.qty_quintals || 0), 0);
    const totalSaleCharges = sales.reduce((acc, s) => {
      const chargeSum = (s.charges || []).reduce((cAcc, c) => cAcc + (c.amount || 0), 0);
      return acc + chargeSum;
    }, 0);
    const totalSaleNet = Math.max(0, totalSaleGross - totalSaleCharges);

    // 3. Operating Overheads not directly attached as transaction charges (exclude apmc_cess to prevent double counting with totalApmcCess above)
    const directChargeIds = new Set<string>();
    allPurchases.forEach(p => (p.charges || []).forEach(c => directChargeIds.add(c.id)));
    allSales.forEach(s => (s.charges || []).forEach(c => directChargeIds.add(c.id)));

    const generalOperatingExpenses = expenses
      .filter(e => !e.purchase_id && !e.sale_id && !directChargeIds.has(e.id) && e.category !== 'apmc_cess')
      .reduce((acc, e) => acc + (e.amount || 0), 0);

    // Total deductions = APMC Mandi Cess + Purchase Inward Charges + Sale Outward Charges + General Operating Expenses
    const totalDeductions = totalApmcCess + totalPurchaseCharges + totalSaleCharges + generalOperatingExpenses;

    // 4. Cost of Goods Sold (COGS)
    const materials = this.getMaterials();
    const matAvgCostMap: Record<string, number> = {};
    materials.forEach(mat => {
      const matPurchases = (purchases.length > 0 ? purchases : allPurchases).filter(p => p.material_id === mat.id);
      const totalQty = matPurchases.reduce((acc, p) => acc + (p.qty_quintals || 0), 0);
      const totalVal = matPurchases.reduce((acc, p) => acc + (p.total_amount || 0), 0);
      matAvgCostMap[mat.id] = totalQty > 0 ? (totalVal / totalQty) : 0;
    });

    const totalCogs = sales.reduce((acc, s) => {
      const avgRate = matAvgCostMap[s.material_id] || s.rate_per_quintal || 0;
      return acc + (s.qty_quintals * avgRate);
    }, 0);

    // Live Unsold Inventory Valuation (applies to 'all' or active current fiscal period)
    const totalStockValuation = matrix.reduce((acc, item) => acc + (item.current_stock_quintals * item.avg_purchase_rate), 0);
    const isCurrentPeriod = periodId === 'all' || periodId === 'fy_2026_27' || periodId === 'cy_2026';
    const effectiveStockValuation = isCurrentPeriod ? totalStockValuation : 0;

    // Realized Trading Profit on Sold Goods: (Sales - COGS) - Deductions
    const grossMargin = totalSaleGross - totalCogs;
    const netRealizedProfit = grossMargin - totalDeductions;

    // Comprehensive Net Profit (Sales + Live Inventory Valuation - Purchases - All Deductions)
    const comprehensiveNetProfit = (totalSaleGross + effectiveStockValuation) - totalPurchaseGross - totalDeductions;

    const profitMarginPercent = totalSaleGross > 0 ? Number(((netRealizedProfit / totalSaleGross) * 100).toFixed(2)) : 0;

    return {
      period: periodId,
      periodLabel,
      totalPurchaseGross: Number(totalPurchaseGross.toFixed(2)),
      totalPurchaseCharges: Number(totalPurchaseCharges.toFixed(2)),
      totalApmcCess: Number(totalApmcCess.toFixed(2)),
      totalPurchaseNet: Number(totalPurchaseNet.toFixed(2)),
      totalPurchasedQty: Number(totalPurchasedQty.toFixed(2)),
      totalSaleGross: Number(totalSaleGross.toFixed(2)),
      totalSaleCharges: Number(totalSaleCharges.toFixed(2)),
      totalSaleNet: Number(totalSaleNet.toFixed(2)),
      totalSoldQty: Number(totalSoldQty.toFixed(2)),
      totalOperatingExpenses: Number(generalOperatingExpenses.toFixed(2)),
      totalDeductions: Number(totalDeductions.toFixed(2)),
      totalCogs: Number(totalCogs.toFixed(2)),
      netRealizedProfit: Number(netRealizedProfit.toFixed(2)),
      totalStockValuation: Number(effectiveStockValuation.toFixed(2)),
      comprehensiveNetProfit: Number(comprehensiveNetProfit.toFixed(2)),
      profitMarginPercent,
      purchaseCount: purchases.length,
      saleCount: sales.length,
      expenseCount: expenses.length
    };
  }

  // --- WHATSAPP DAILY CLOSING SUMMARY GENERATOR ---
  public generateWhatsAppDailyReport(): string {
    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const matrix = this.getLiveStockMatrix();
    const yards = this.getYards();
    const materials = this.getMaterials();

    let apmcTotal = 0;
    let personalTotal = 0;

    matrix.forEach(row => {
      if (row.yard_type === 'apmc_shed') {
        apmcTotal += row.current_stock_quintals;
      } else {
        personalTotal += row.current_stock_quintals;
      }
    });

    let msg = `*🌾 SHIVKRUPA TRADING COMPANY - DAILY STOCK REPORT*\n`;
    msg += `📅 Date: ${today}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `*🏢 APMC Sheds:* ${apmcTotal.toFixed(2)} Quintals\n`;
    msg += `*🏭 Personal Godowns:* ${personalTotal.toFixed(2)} Quintals\n`;
    msg += `*📦 TOTAL CONSOLIDATED:* ${(apmcTotal + personalTotal).toFixed(2)} Quintals\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    msg += `*COMMODITY BREAKDOWN:*\n`;
    materials.forEach(mat => {
      const matRows = matrix.filter(r => r.material_id === mat.id && r.current_stock_quintals > 0);
      if (matRows.length > 0) {
        const matTotal = matRows.reduce((acc, r) => acc + r.current_stock_quintals, 0);
        msg += `\n*• ${mat.name} (${mat.local_name})*: *${matTotal.toFixed(2)} Qtl*\n`;
        matRows.forEach(r => {
          msg += `  ▫ ${r.yard_name}: ${r.current_stock_quintals.toFixed(2)} Qtl\n`;
        });
      }
    });

    const bardana = this.getBardanaSummary();
    msg += `\n*🎒 BARDANA (PACKAGING BAGS):*\n`;
    msg += `*• Total Available:* *${bardana.totalBagsInStock.toLocaleString('en-IN')} Bags (नग)*\n`;
    bardana.yardDistribution.forEach(yd => {
      if (yd.bags_in_stock > 0) {
        msg += `  ▫ ${yd.yard_name}: ${yd.bags_in_stock.toLocaleString('en-IN')} Bags\n`;
      }
    });

    msg += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `_Generated via Shivkrupa Multi-Yard Stock Portal_`;
    return msg;
  }
}

export const storage = new StorageService();
