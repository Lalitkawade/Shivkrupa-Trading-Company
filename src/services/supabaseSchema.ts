// ==============================================================================
// SHIVKRUPA TRADING COMPANY - SUPABASE SCHEMA DEFINITION SCRIPT
// Single Source of Truth • Optimized for Supabase Free Tier (Zero Double-Entry)
// Clean Slate Version: 0 Static Seed Rows • Synced with Supabase Auth
// ==============================================================================

export const SUPABASE_SQL_SCHEMA = `-- ==============================================================================
-- SHIVKRUPA TRADING COMPANY - APMC MULTI-YARD LEDGER SCHEMA (SUPABASE FREE TIER)
-- Designed for: 100% Normalized Architecture • Zero Double-Entry • Minimal Storage Footprint
-- Free Tier Optimization: Lean Data Types • Indexed Foreign Keys • Zero Stored Duplication
-- Clean Slate Version: 0 Static Seed Rows • Synced with Supabase Auth
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. MASTER ENTITIES (STRICTLY NORMALIZED, DEDUPLICATED)
-- ==============================================================================

-- 2.1 USER PROFILES & TEAM (SYNCED WITH SUPABASE AUTH)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id VARCHAR(60) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email VARCHAR(255) UNIQUE,
    name VARCHAR(150) NOT NULL DEFAULT 'Trader',
    role VARCHAR(100) NOT NULL DEFAULT 'Operator / संचालक',
    avatar_initials VARCHAR(10) DEFAULT 'OP',
    color VARCHAR(50) DEFAULT '#059669',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Automatic Profile Creation Trigger on Supabase Auth (auth.users)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, name, role, avatar_initials, color)
    VALUES (
        NEW.id::text,
        NEW.email,
        COALESCE(
            NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
            NULLIF(NEW.raw_user_meta_data->>'name', ''),
            split_part(NEW.email, '@', 1)
        ),
        COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'Operator / संचालक'),
        UPPER(SUBSTRING(COALESCE(
            NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
            NULLIF(NEW.raw_user_meta_data->>'name', ''),
            split_part(NEW.email, '@', 1)
        ), 1, 2)),
        '#059669'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, public.user_profiles.name),
        updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger whenever a user is created in Supabase Auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2.2 STORAGE YARDS & APMC SHEDS
CREATE TABLE IF NOT EXISTS public.yards (
    id VARCHAR(60) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('apmc_shed', 'personal_yard')),
    location VARCHAR(255) NOT NULL,
    capacity_quintals NUMERIC(12, 2) DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.3 COMMODITIES / AGRICULTURAL PRODUCE
CREATE TABLE IF NOT EXISTS public.materials (
    id VARCHAR(60) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name VARCHAR(150) NOT NULL,
    local_name VARCHAR(150),
    grade VARCHAR(50) DEFAULT 'Standard FAQ',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.4 PARTIES DIRECTORY (APMC Sellers, Buyer Companies & Commission Brokers)
CREATE TABLE IF NOT EXISTS public.parties (
    id VARCHAR(60) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name VARCHAR(200) NOT NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('apmc_seller', 'buyer_company', 'broker_agent', 'hamal')),
    phone VARCHAR(30),
    city VARCHAR(100),
    gst_or_license VARCHAR(60),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 3. CORE TRANSACTIONS (SINGLE SOURCE OF TRUTH)
-- ==============================================================================

-- 3.1 PURCHASES (STOCK INWARD FROM APMC MARKET)
-- Inward handling charges (Hamali, Tolai, Freight) are stored ONCE in operating_expenses(purchase_id)
CREATE TABLE IF NOT EXISTS public.purchases (
    id VARCHAR(60) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    material_id VARCHAR(60) NOT NULL REFERENCES public.materials(id) ON DELETE RESTRICT,
    yard_id VARCHAR(60) NOT NULL REFERENCES public.yards(id) ON DELETE RESTRICT,
    party_id VARCHAR(60) NOT NULL REFERENCES public.parties(id) ON DELETE RESTRICT,
    qty_quintals NUMERIC(12, 2) NOT NULL CHECK (qty_quintals > 0),
    rate_per_quintal NUMERIC(10, 2) NOT NULL CHECK (rate_per_quintal >= 0),
    material_amount NUMERIC(14, 2),
    charges_amount NUMERIC(12, 2) DEFAULT 0,
    total_amount NUMERIC(14, 2) NOT NULL,
    market_category VARCHAR(20) NOT NULL DEFAULT 'government' CHECK (market_category IN ('government', 'private')),
    market_location VARCHAR(150),
    market_fee_percent NUMERIC(5, 4) NOT NULL DEFAULT 0.85,
    market_fee_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    market_fee_paid BOOLEAN NOT NULL DEFAULT false,
    market_fee_paid_amount NUMERIC(12, 2) DEFAULT 0,
    market_fee_payment_ref VARCHAR(100),
    market_fee_payment_date DATE,
    lot_number VARCHAR(60),
    vehicle_no VARCHAR(50),
    notes TEXT,
    created_by_name VARCHAR(100) NOT NULL DEFAULT 'Admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.2 SALES (STOCK OUTWARD DISPATCH TO BUYERS)
-- Outward charges (Hamali, Freight, Brokerage) are stored ONCE in operating_expenses(sale_id)
CREATE TABLE IF NOT EXISTS public.sales (
    id VARCHAR(60) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
    material_id VARCHAR(60) NOT NULL REFERENCES public.materials(id) ON DELETE RESTRICT,
    yard_id VARCHAR(60) NOT NULL REFERENCES public.yards(id) ON DELETE RESTRICT,
    party_id VARCHAR(60) NOT NULL REFERENCES public.parties(id) ON DELETE RESTRICT,
    broker_id VARCHAR(60) REFERENCES public.parties(id) ON DELETE SET NULL,
    broker_name VARCHAR(150),
    brokerage_rate_per_qtl NUMERIC(10, 2),
    brokerage_total_amount NUMERIC(12, 2),
    qty_quintals NUMERIC(12, 2) NOT NULL CHECK (qty_quintals > 0),
    rate_per_quintal NUMERIC(10, 2) NOT NULL CHECK (rate_per_quintal >= 0),
    material_amount NUMERIC(14, 2),
    charges_amount NUMERIC(12, 2) DEFAULT 0,
    total_amount NUMERIC(14, 2) NOT NULL,
    bardana_bags_used INTEGER DEFAULT 0,
    bardana_type VARCHAR(100),
    bardana_deducted BOOLEAN DEFAULT false,
    bardana_yard_id VARCHAR(60) REFERENCES public.yards(id) ON DELETE SET NULL,
    invoice_no VARCHAR(60),
    transporter_name VARCHAR(150),
    dispatch_challan_no VARCHAR(60),
    vehicle_no VARCHAR(50),
    notes TEXT,
    created_by_name VARCHAR(100) NOT NULL DEFAULT 'Admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.3 YARD TRANSFERS (INTERNAL STOCK SHIFTING)
CREATE TABLE IF NOT EXISTS public.yard_transfers (
    id VARCHAR(60) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
    material_id VARCHAR(60) NOT NULL REFERENCES public.materials(id) ON DELETE RESTRICT,
    from_yard_id VARCHAR(60) NOT NULL REFERENCES public.yards(id) ON DELETE RESTRICT,
    to_yard_id VARCHAR(60) NOT NULL REFERENCES public.yards(id) ON DELETE RESTRICT,
    qty_quintals NUMERIC(12, 2) NOT NULL CHECK (qty_quintals > 0),
    vehicle_no VARCHAR(50),
    transport_cost NUMERIC(10, 2) DEFAULT 0,
    notes TEXT,
    created_by_name VARCHAR(100) NOT NULL DEFAULT 'Admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT diff_yards CHECK (from_yard_id <> to_yard_id)
);

-- 3.4 BARDANA (PACKAGING & GUNNY BAGS MOVEMENT LEDGER)
CREATE TABLE IF NOT EXISTS public.bardana_records (
    id VARCHAR(60) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    type VARCHAR(30) NOT NULL CHECK (type IN ('purchase', 'sale_usage', 'return', 'adjustment')),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    bardana_type VARCHAR(150) NOT NULL,
    bag_condition VARCHAR(20) DEFAULT 'new',
    qty_bags INTEGER NOT NULL CHECK (qty_bags > 0),
    rate_per_bag NUMERIC(10, 2) DEFAULT 0,
    total_amount NUMERIC(12, 2) DEFAULT 0,
    yard_id VARCHAR(60) NOT NULL REFERENCES public.yards(id) ON DELETE RESTRICT,
    party_id VARCHAR(60) REFERENCES public.parties(id) ON DELETE SET NULL,
    party_name VARCHAR(200),
    sale_id VARCHAR(60) REFERENCES public.sales(id) ON DELETE SET NULL,
    reference_no VARCHAR(100),
    notes TEXT,
    created_by_name VARCHAR(100) NOT NULL DEFAULT 'Admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 4. SETTLEMENT VOUCHERS & CASH OUTFLOWS (ZERO DOUBLE-ENTRY)
-- ==============================================================================

-- 4.1 WEEKLY HAMALI SETTLEMENTS (आठवडी हमाली हिशोब व चुकती पावती)
CREATE TABLE IF NOT EXISTS public.weekly_hamali_settlements (
    id VARCHAR(60) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    settlement_date DATE NOT NULL DEFAULT CURRENT_DATE,
    week_key VARCHAR(30) NOT NULL,
    week_label VARCHAR(100) NOT NULL,
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    gang_name VARCHAR(150) NOT NULL,
    total_days INTEGER DEFAULT 1,
    total_bags INTEGER DEFAULT 0,
    gross_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    advance_deduction NUMERIC(12, 2) NOT NULL DEFAULT 0,
    net_paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    payment_mode VARCHAR(30) NOT NULL DEFAULT 'Cash',
    receipt_no VARCHAR(60) NOT NULL,
    paid_to VARCHAR(150) NOT NULL,
    notes TEXT,
    settled_by_name VARCHAR(100) NOT NULL DEFAULT 'Admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4.2 APMC STATUTORY MANDI CESS SETTLEMENTS (बाजार समिती उपकर भरणा पावती)
-- Dedicated SSOT for statutory market committee settlements; NEVER duplicated into operating_expenses!
CREATE TABLE IF NOT EXISTS public.apmc_settlements (
    id VARCHAR(60) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    financial_year VARCHAR(30) NOT NULL,
    month VARCHAR(20) DEFAULT 'all',
    market_category VARCHAR(20) NOT NULL DEFAULT 'all' CHECK (market_category IN ('all', 'government', 'private')),
    settlement_type VARCHAR(20) NOT NULL DEFAULT 'full' CHECK (settlement_type IN ('full', 'partial')),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_mode VARCHAR(30) NOT NULL DEFAULT 'Bank Transfer / NEFT',
    receipt_no VARCHAR(60) NOT NULL,
    paid_to VARCHAR(150) NOT NULL,
    notes TEXT,
    created_by_name VARCHAR(100) NOT NULL DEFAULT 'Admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4.3 OPERATING EXPENSES (UNIVERSAL SINGLE SOURCE OF TRUTH FOR ALL CASH OUTFLOWS)
-- Includes: Daily Hamali payouts, Yard Overheads, Inward Lot charges, Outward Dispatch charges.
-- Zero double-entry: deleting a purchase/sale automatically cascades and cleans its charges!
CREATE TABLE IF NOT EXISTS public.operating_expenses (
    id VARCHAR(60) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    category VARCHAR(40) NOT NULL CHECK (category IN (
        'transport_freight', 
        'hamali_loading', 
        'weighbridge', 
        'storage_maintenance', 
        'fumigation_testing',
        'commission_brokerage',
        'other'
    )),
    title VARCHAR(255) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    yard_id VARCHAR(60) REFERENCES public.yards(id) ON DELETE SET NULL,
    party_id VARCHAR(60) REFERENCES public.parties(id) ON DELETE SET NULL,
    party_name VARCHAR(200),
    purchase_id VARCHAR(60) REFERENCES public.purchases(id) ON DELETE CASCADE,
    sale_id VARCHAR(60) REFERENCES public.sales(id) ON DELETE CASCADE,
    bardana_record_id VARCHAR(60) REFERENCES public.bardana_records(id) ON DELETE CASCADE,
    paid_to VARCHAR(150) NOT NULL DEFAULT 'Vendor',
    payment_mode VARCHAR(30) NOT NULL DEFAULT 'Cash',
    payment_status VARCHAR(30) NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid', 'accrued_payable')),
    hamali_gang_name VARCHAR(150),
    hamali_work_type VARCHAR(30),
    hamali_bag_count INTEGER,
    hamali_rate_per_bag NUMERIC(10, 2),
    hamali_vehicle_no VARCHAR(50),
    weekly_settlement_id VARCHAR(60) REFERENCES public.weekly_hamali_settlements(id) ON DELETE SET NULL,
    weekly_settlement_date DATE,
    client_billing_status VARCHAR(40) CHECK (client_billing_status IN ('billable_to_client', 'non_billable', 'recovered_from_client')),
    notes TEXT,
    created_by_name VARCHAR(100) NOT NULL DEFAULT 'Admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 5. PERFORMANCE INDEXES (OPTIMIZED FOR SUPABASE FREE TIER MEMORY & CPU)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_purchases_date ON public.purchases(purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_yard_mat ON public.purchases(yard_id, material_id);
CREATE INDEX IF NOT EXISTS idx_purchases_party ON public.purchases(party_id);
CREATE INDEX IF NOT EXISTS idx_purchases_mkt_cat ON public.purchases(market_category, market_fee_paid);

CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales(sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_yard_mat ON public.sales(yard_id, material_id);
CREATE INDEX IF NOT EXISTS idx_sales_party ON public.sales(party_id);
CREATE INDEX IF NOT EXISTS idx_sales_broker ON public.sales(broker_id);

CREATE INDEX IF NOT EXISTS idx_transfers_mat ON public.yard_transfers(material_id);
CREATE INDEX IF NOT EXISTS idx_transfers_from_to ON public.yard_transfers(from_yard_id, to_yard_id);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.operating_expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.operating_expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_purchase ON public.operating_expenses(purchase_id);
CREATE INDEX IF NOT EXISTS idx_expenses_sale ON public.operating_expenses(sale_id);
CREATE INDEX IF NOT EXISTS idx_expenses_settlement ON public.operating_expenses(weekly_settlement_id);

CREATE INDEX IF NOT EXISTS idx_bardana_yard ON public.bardana_records(yard_id);
CREATE INDEX IF NOT EXISTS idx_bardana_sale ON public.bardana_records(sale_id);

-- ==============================================================================
-- 6. DYNAMIC COMPUTED VIEWS (ZERO-STORAGE COMPUTATION • REAL-TIME ACCURACY)
-- ==============================================================================

-- 6.1 LIVE STOCK MATRIX VIEW (थेट माल साठा व मूल्यांकन दृश्य)
CREATE OR REPLACE VIEW public.live_stock_matrix_view AS
WITH inward AS (
    SELECT yard_id, material_id, SUM(qty_quintals) AS total_inward_qty, SUM(total_amount) AS total_inward_val
    FROM public.purchases
    GROUP BY yard_id, material_id
),
outward AS (
    SELECT yard_id, material_id, SUM(qty_quintals) AS total_outward_qty, SUM(total_amount) AS total_outward_val
    FROM public.sales
    GROUP BY yard_id, material_id
),
transfers_in AS (
    SELECT to_yard_id AS yard_id, material_id, SUM(qty_quintals) AS total_transfer_in_qty
    FROM public.yard_transfers
    GROUP BY to_yard_id, material_id
),
transfers_out AS (
    SELECT from_yard_id AS yard_id, material_id, SUM(qty_quintals) AS total_transfer_out_qty
    FROM public.yard_transfers
    GROUP BY from_yard_id, material_id
),
combinations AS (
    SELECT yard_id, material_id FROM inward
    UNION
    SELECT yard_id, material_id FROM outward
    UNION
    SELECT yard_id, material_id FROM transfers_in
    UNION
    SELECT yard_id, material_id FROM transfers_out
)
SELECT 
    c.yard_id,
    y.name AS yard_name,
    y.type AS yard_type,
    y.location AS yard_location,
    c.material_id,
    m.name AS material_name,
    m.local_name AS material_local_name,
    m.grade AS material_grade,
    COALESCE(i.total_inward_qty, 0) AS total_purchased_qty,
    COALESCE(o.total_outward_qty, 0) AS total_sold_qty,
    COALESCE(ti.total_transfer_in_qty, 0) AS total_transferred_in_qty,
    COALESCE(to_out.total_transfer_out_qty, 0) AS total_transferred_out_qty,
    (
        COALESCE(i.total_inward_qty, 0) 
        + COALESCE(ti.total_transfer_in_qty, 0) 
        - COALESCE(o.total_outward_qty, 0) 
        - COALESCE(to_out.total_transfer_out_qty, 0)
    ) AS current_stock_quintals,
    CASE 
        WHEN COALESCE(i.total_inward_qty, 0) > 0 
        THEN ROUND(COALESCE(i.total_inward_val, 0) / i.total_inward_qty, 2)
        ELSE 0 
    END AS avg_purchase_rate
FROM combinations c
JOIN public.yards y ON y.id = c.yard_id
JOIN public.materials m ON m.id = c.material_id
LEFT JOIN inward i ON i.yard_id = c.yard_id AND i.material_id = c.material_id
LEFT JOIN outward o ON o.yard_id = c.yard_id AND o.material_id = c.material_id
LEFT JOIN transfers_in ti ON ti.yard_id = c.yard_id AND ti.material_id = c.material_id
LEFT JOIN transfers_out to_out ON to_out.yard_id = c.yard_id AND to_out.material_id = c.material_id;

-- 6.2 LIVE BARDANA (PACKAGING BAGS) STOCK VIEW (बारदान साठा दृश्य)
CREATE OR REPLACE VIEW public.bardana_yard_stock_view AS
SELECT 
    y.id AS yard_id,
    y.name AS yard_name,
    y.type AS yard_type,
    COALESCE(SUM(CASE WHEN b.type = 'purchase' THEN b.qty_bags ELSE 0 END), 0) AS bags_purchased,
    COALESCE(SUM(CASE WHEN b.type = 'sale_usage' THEN b.qty_bags ELSE 0 END), 0) AS bags_used,
    GREATEST(0, COALESCE(SUM(CASE 
        WHEN b.type IN ('purchase', 'return') THEN b.qty_bags 
        WHEN b.type IN ('sale_usage', 'adjustment') THEN -b.qty_bags 
        ELSE 0 
    END), 0)) AS bags_in_stock
FROM public.yards y
LEFT JOIN public.bardana_records b ON b.yard_id = y.id
GROUP BY y.id, y.name, y.type;

-- 6.3 APMC CESS AUDIT & COMPLIANCE VIEW (बाजार समिती उपकर विश्लेषण)
CREATE OR REPLACE VIEW public.apmc_cess_summary_view AS
SELECT 
    p.market_category,
    COUNT(p.id) AS total_lots,
    SUM(p.qty_quintals) AS total_qty_quintals,
    SUM(p.total_amount) AS total_gross_value,
    SUM(p.market_fee_amount) AS total_cess_accrued,
    SUM(CASE WHEN p.market_fee_paid THEN p.market_fee_amount ELSE COALESCE(p.market_fee_paid_amount, 0) END) AS total_cess_settled,
    SUM(p.market_fee_amount) - SUM(CASE WHEN p.market_fee_paid THEN p.market_fee_amount ELSE COALESCE(p.market_fee_paid_amount, 0) END) AS total_cess_pending
FROM public.purchases p
GROUP BY p.market_category;

-- ==============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES (SUPABASE ANON & AUTH READY)
-- ==============================================================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yard_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bardana_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_hamali_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apmc_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operating_expenses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow all for anon on user_profiles" ON public.user_profiles;
    DROP POLICY IF EXISTS "Allow all for anon on yards" ON public.yards;
    DROP POLICY IF EXISTS "Allow all for anon on materials" ON public.materials;
    DROP POLICY IF EXISTS "Allow all for anon on parties" ON public.parties;
    DROP POLICY IF EXISTS "Allow all for anon on purchases" ON public.purchases;
    DROP POLICY IF EXISTS "Allow all for anon on sales" ON public.sales;
    DROP POLICY IF EXISTS "Allow all for anon on yard_transfers" ON public.yard_transfers;
    DROP POLICY IF EXISTS "Allow all for anon on bardana_records" ON public.bardana_records;
    DROP POLICY IF EXISTS "Allow all for anon on weekly_hamali_settlements" ON public.weekly_hamali_settlements;
    DROP POLICY IF EXISTS "Allow all for anon on apmc_settlements" ON public.apmc_settlements;
    DROP POLICY IF EXISTS "Allow all for anon on operating_expenses" ON public.operating_expenses;

    CREATE POLICY "Allow all for anon on user_profiles" ON public.user_profiles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    CREATE POLICY "Allow all for anon on yards" ON public.yards FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    CREATE POLICY "Allow all for anon on materials" ON public.materials FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    CREATE POLICY "Allow all for anon on parties" ON public.parties FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    CREATE POLICY "Allow all for anon on purchases" ON public.purchases FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    CREATE POLICY "Allow all for anon on sales" ON public.sales FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    CREATE POLICY "Allow all for anon on yard_transfers" ON public.yard_transfers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    CREATE POLICY "Allow all for anon on bardana_records" ON public.bardana_records FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    CREATE POLICY "Allow all for anon on weekly_hamali_settlements" ON public.weekly_hamali_settlements FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    CREATE POLICY "Allow all for anon on apmc_settlements" ON public.apmc_settlements FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    CREATE POLICY "Allow all for anon on operating_expenses" ON public.operating_expenses FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
END $$;

-- ==============================================================================
-- 8. CLEAN SLATE FOR TESTING (0 MOCK DATA ROWS)
-- ==============================================================================
-- No seed rows inserted. Tables are created 100% clean and empty.
-- Users added in Supabase Authentication (Authentication -> Users)
-- will automatically populate public.user_profiles via the trigger above.
`;
