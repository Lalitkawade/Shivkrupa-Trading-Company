// ==============================================================================
// SHIVKRUPA TRADING COMPANY - DOMAIN TYPES
// ==============================================================================

export type YardType = 'apmc_shed' | 'personal_yard';

export interface Yard {
  id: string;
  name: string;
  type: YardType;
  location: string;
  capacity_quintals?: number;
  is_active: boolean;
}

export interface Material {
  id: string;
  name: string;
  local_name: string;
  grade: string;
  is_active: boolean;
}

export type PartyType = 'apmc_seller' | 'buyer_company' | 'broker_agent' | 'hamal';

export interface Party {
  id: string;
  name: string;
  type: PartyType;
  phone?: string;
  city?: string;
  gst_or_license?: string;
  is_active: boolean;
}

export type MarketCategory = 'government' | 'private';

export interface TransactionCharge {
  id: string;
  category: ExpenseCategory;
  title: string;
  amount: number;
  paid_to?: string;
  payment_mode?: 'Cash' | 'Bank Transfer / NEFT' | 'RTGS' | 'UPI' | 'Cheque';
  payment_status?: 'paid' | 'accrued_payable';
  bag_count?: number;
  rate_per_bag?: number;
  notes?: string;
  created_at: string;
}

export interface Purchase {
  id: string;
  purchase_date: string; // YYYY-MM-DD
  material_id: string;
  yard_id: string; // Destination yard/shed
  party_id: string; // APMC Seller
  qty_quintals: number;
  rate_per_quintal: number;
  total_amount: number;
  market_category?: MarketCategory; // 'government' | 'private'
  market_location?: string; // e.g. 'Nagpur'
  market_fee_percent?: number; // 0.85 for Government APMC, 0.55 for Private APMC
  market_fee_amount?: number; // total_amount * (market_fee_percent / 100)
  market_fee_paid?: boolean; // whether paid / settled with market committee
  market_fee_paid_amount?: number; // actual amount paid against this lot
  market_fee_payment_ref?: string; // e.g. receipt or challan no
  market_fee_payment_date?: string; // YYYY-MM-DD
  charges?: TransactionCharge[]; // Additional expenses/charges attached to this purchase
  lot_number?: string;
  vehicle_no?: string;
  notes?: string;
  created_by_name: string;
  created_at: string;
}

export type ExpenseCategory = 
  | 'apmc_cess' 
  | 'transport_freight' 
  | 'hamali_loading' 
  | 'weighbridge' 
  | 'storage_maintenance' 
  | 'fumigation_testing'
  | 'commission_brokerage'
  | 'other';

export type ClientBillingStatus = 'billable_to_client' | 'non_billable' | 'recovered_from_client';

export interface HamaliDetail {
  gang_name?: string;       // e.g. 'Nagpur Mathadi Union Gang #4'
  work_type?: 'unloading' | 'loading' | 'stacking' | 'weighment' | 'rebagging' | 'general';
  bag_count?: number;       // e.g. 300 bags
  rate_per_bag?: number;    // e.g. ₹7.50 / bag
  vehicle_no?: string;
}

export interface OperatingExpense {
  id: string;
  expense_date: string;
  category: ExpenseCategory;
  title: string;
  amount: number;
  yard_id?: string;
  party_id?: string;    // Client / Buyer or Supplier ID
  party_name?: string;  // e.g. 'Adani Wilmar Ltd' or 'Kirti Solvex'
  purchase_id?: string; // Link to purchase lot if applicable
  sale_id?: string;     // Link to sale dispatch if applicable
  paid_to: string;
  payment_mode: 'Cash' | 'Bank Transfer / NEFT' | 'RTGS' | 'UPI' | 'Cheque';
  payment_status: 'paid' | 'accrued_payable';
  hamali_details?: HamaliDetail;
  weekly_settlement_id?: string;
  weekly_settlement_date?: string;
  client_billing_status?: ClientBillingStatus;
  notes?: string;
  created_by_name: string;
  created_at: string;
}

export interface Sale {
  id: string;
  sale_date: string; // YYYY-MM-DD
  material_id: string;
  yard_id: string; // Source yard dispatched from
  party_id: string; // Buyer company
  broker_id?: string; // Broker / Commission Agent ID (optional)
  broker_name?: string; // Broker / Agent Name
  brokerage_rate_per_qtl?: number; // Optional brokerage commission rate per Qtl
  brokerage_total_amount?: number; // Optional total brokerage commission
  qty_quintals: number;
  rate_per_quintal: number;
  material_amount?: number; // Base commodity amount: qty_quintals * rate_per_quintal
  charges_amount?: number; // Total charges billed to buyer account
  total_amount: number; // Final Invoiced Amount to Buyer = material_amount + charges_amount
  charges?: TransactionCharge[]; // Additional expenses/charges attached to this sale
  bardana_bags_used?: number; // Number of gunny/HDPE bags consumed for packaging this dispatch
  bardana_type?: string; // e.g. 'Jute Gunny (50kg)', 'HDPE / Plastic (50kg)'
  bardana_deducted?: boolean; // Whether automatically deducted from yard stock
  bardana_yard_id?: string; // Storage yard where bardana bags are taken from
  invoice_no?: string; // Manual Invoice Number entry
  transporter_name?: string; // Transporter / Logistics company name
  dispatch_challan_no?: string;
  vehicle_no?: string;
  notes?: string;
  created_by_name: string;
  created_at: string;
}

export interface YardTransfer {
  id: string;
  transfer_date: string; // YYYY-MM-DD
  material_id: string;
  from_yard_id: string; // e.g. APMC Shed
  to_yard_id: string; // e.g. Personal Godown
  qty_quintals: number;
  vehicle_no?: string;
  transport_cost?: number;
  notes?: string;
  created_by_name: string;
  created_at: string;
}

export interface CurrentYardStock {
  yard_id: string;
  yard_name: string;
  yard_type: YardType;
  yard_location: string;
  material_id: string;
  material_name: string;
  material_local_name: string;
  material_grade: string;
  total_purchased_qty: number;
  total_sold_qty: number;
  total_transferred_in_qty: number;
  total_transferred_out_qty: number;
  current_stock_quintals: number;
  avg_purchase_rate: number;
}

export interface UserProfile {
  id: string;
  name: string;
  role: string;
  avatar_initials: string;
  color: string;
  email?: string;
}

export interface AuthSession {
  user: UserProfile;
  email: string;
  token?: string;
  loginTime: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
}

export interface FinancialPeriodOption {
  id: string; // 'all' | 'fy_2026_27' | 'cy_2026' ...
  label: string; // 'All Time (सर्व काळ)' | 'FY 2026-27 (Current FY)' ...
  type: 'all' | 'financial_year' | 'calendar_year';
  isCurrent?: boolean;
}

export interface FinancialSummary {
  period?: string;
  periodLabel?: string;
  totalPurchaseGross: number;
  totalPurchaseCharges: number;
  totalApmcCess: number;
  totalPurchaseNet: number; // Gross + Charges + Cess
  totalPurchasedQty?: number;
  totalSaleGross: number;
  totalSaleCharges: number;
  totalSaleNet: number; // Gross - Sale Charges
  totalSoldQty?: number;
  totalOperatingExpenses: number;
  totalDeductions: number; // APMC Cess + Inward Charges + Outward Charges + Yard Overheads
  totalCogs: number; // Cost of goods sold based on avg purchase rates
  netRealizedProfit: number; // Sale Revenue - COGS - All Deductions
  totalStockValuation: number; // Current value of unsold live inventory
  comprehensiveNetProfit: number; // (Total Sale + Stock Valuation) - Total Purchase - All Deductions
  profitMarginPercent: number;
  purchaseCount?: number;
  saleCount?: number;
  expenseCount?: number;
}

// ==============================================================================
// BARDANA (GUNNY & PACKAGING BAGS) INVENTORY & DEDUCTION TYPES
// ==============================================================================

export type BardanaMovementType = 'purchase' | 'sale_usage' | 'return' | 'adjustment';

export interface BardanaRecord {
  id: string;
  type: BardanaMovementType;
  date: string; // YYYY-MM-DD
  bardana_type: string; // e.g. 'Jute Gunny Bag (50kg)', 'HDPE Plastic (50kg)', 'Old Gunny Bag'
  bag_condition: 'new' | 'used';
  qty_bags: number; // positive count of bags
  rate_per_bag?: number; // ₹ per bag (for purchases)
  total_amount?: number; // qty_bags * rate_per_bag
  yard_id: string; // Yard where bags are stored or deducted from
  party_id?: string; // Vendor for purchase, or Buyer for sale
  party_name?: string; // e.g. 'Shree Ganesh Packaging' or 'Adani Wilmar Ltd'
  sale_id?: string; // Linked sale transaction if deducted during outward sale
  reference_no?: string; // Invoice / Challan / Lot #
  notes?: string;
  created_by_name: string;
  created_at: string;
}

export interface BardanaYardStock {
  yard_id: string;
  yard_name: string;
  yard_type: YardType;
  bags_in_stock: number;
  bags_purchased: number;
  bags_used: number;
}

export interface BardanaSummary {
  totalBagsInStock: number;
  totalBagsPurchased: number;
  totalBagsUsed: number;
  avgRatePerBag: number;
  totalValuation: number;
  yardDistribution: BardanaYardStock[];
  typeDistribution: {
    bardana_type: string;
    bags_in_stock: number;
  }[];
}

export interface APMCSettlement {
  id: string;
  date: string; // YYYY-MM-DD
  financial_year: string; // e.g. 'FY 2026-27'
  month?: string; // e.g. '2026-11' or 'all'
  market_category: 'all' | 'government' | 'private';
  settlement_type: 'full' | 'partial';
  amount: number;
  payment_mode: 'Bank Transfer / NEFT' | 'RTGS' | 'Cheque' | 'Cash' | 'UPI';
  receipt_no: string; // APMC Mandi receipt or bank challan no
  paid_to: string; // Committee / Office name (e.g. Kalamna APMC)
  notes?: string;
  created_by_name: string;
  created_at: string;
}

export interface SettleAPMCFeesParams {
  amount: number;
  settlement_type: 'full' | 'partial';
  date: string;
  financial_year: string; // e.g. 'fy_2026_27' or 'FY 2026-27' or 'all'
  month?: string; // 'all' or 'YYYY-MM'
  market_category: 'all' | 'government' | 'private';
  payment_mode: 'Bank Transfer / NEFT' | 'RTGS' | 'Cheque' | 'Cash' | 'UPI';
  receipt_no: string;
  paid_to: string;
  notes?: string;
  specific_purchase_ids?: string[];
  created_by_name?: string;
}

export interface WeeklyHamaliSettlement {
  id: string;
  settlement_date: string; // YYYY-MM-DD
  week_key: string;        // e.g. '2026-W46'
  week_label: string;      // e.g. 'Week 46 (10 Nov - 16 Nov 2026)'
  week_start_date: string;
  week_end_date: string;
  gang_name: string;       // e.g. 'Kalamna Mathadi Gang #1' or 'Laxman Hamal'
  total_days: number;      // Number of days worked in this week
  total_bags: number;      // Total bags handled across the week
  gross_amount: number;    // Total weekly hamali earned
  advance_deduction: number; // Cash advance / kharcha deducted
  net_paid_amount: number; // Final net payout given
  payment_mode: 'Cash' | 'Bank Transfer / NEFT' | 'RTGS' | 'UPI' | 'Cheque';
  receipt_no: string;      // e.g. 'HAM-W46-2026-01'
  paid_to: string;         // Person / Mukadam who received the payment
  notes?: string;
  expense_ids: string[];   // All operating expense ids settled in this weekly payout
  settled_by_name: string;
  created_at: string;
}

export interface SettleWeeklyHamaliParams {
  week_key: string;
  week_label: string;
  week_start_date: string;
  week_end_date: string;
  gang_name: string;
  total_days: number;
  total_bags: number;
  gross_amount: number;
  advance_deduction: number;
  net_paid_amount: number;
  settlement_date: string;
  payment_mode: 'Cash' | 'Bank Transfer / NEFT' | 'RTGS' | 'UPI' | 'Cheque';
  receipt_no: string;
  paid_to: string;
  notes?: string;
  expense_ids: string[];
  settled_by_name: string;
}
