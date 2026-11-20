import React, { useState, useMemo } from 'react';
import { 
  Receipt, 
  Landmark, 
  Building2, 
  DollarSign, 
  Calendar, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  FileText, 
  Truck, 
  Layers, 
  TrendingDown, 
  ArrowDownLeft, 
  ArrowUpRight,
  ChevronRight, 
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  CalendarDays,
  CalendarRange,
  Scale, 
  X,
  MapPin,
  Eye,
  ShieldAlert,
  Users,
  HardHat,
  BarChart3,
  Sparkles,
  Package,
  TrendingUp,
  Trash2,
  CreditCard,
  Check,
  ExternalLink,
  History,
  Coins,
  ShieldCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { 
  Purchase, 
  Sale, 
  Yard, 
  Material, 
  Party, 
  OperatingExpense, 
  ExpenseCategory, 
  UserProfile,
  ClientBillingStatus,
  HamaliDetail,
  APMCSettlement,
  WeeklyHamaliSettlement,
  SettleWeeklyHamaliParams
} from '../types';
import { storage, getWeekDetails } from '../services/storage';
import type { WeekInfo } from '../services/storage';
import type { AddChargeTarget } from './AddChargeModal';

interface ExpensesViewProps {
  purchases: Purchase[];
  yards: Yard[];
  materials: Material[];
  parties: Party[];
  activeUser: UserProfile;
  sales?: Sale[];
  onOpenAddCharge?: (target: AddChargeTarget) => void;
  onRefresh?: () => void;
}

type ExpenseMainTab = 'daily_hamali' | 'market_fees' | 'operating_expenses' | 'monthly_monitor';

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  purchases,
  yards,
  materials,
  parties,
  activeUser,
  sales = [],
  onOpenAddCharge,
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<ExpenseMainTab>('daily_hamali');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Expenses & Purchases data state
  const [expenses, setExpenses] = useState<OperatingExpense[]>(() => storage.getExpenses());
  const [purchaseList, setPurchaseList] = useState<Purchase[]>(purchases);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [addExpenseType, setAddExpenseType] = useState<'hamali' | 'general'>('hamali');
  const [selectedFeeVoucher, setSelectedFeeVoucher] = useState<Purchase | null>(null);

  // Daily Hamali sub-filters & Weekly Ledger States
  const [selectedHamaliWorkType, setSelectedHamaliWorkType] = useState<string>('all');
  const [hamaliSubTab, setHamaliSubTab] = useState<'weekly_ledger' | 'daily_entries' | 'settlement_receipts'>('weekly_ledger');
  const [weeklySettlements, setWeeklySettlements] = useState<WeeklyHamaliSettlement[]>(() => storage.getWeeklyHamaliSettlements());
  const [expandedGangs, setExpandedGangs] = useState<Set<string>>(new Set());

  // Weekly Hamali Settle Modal States
  const [isHamaliSettleModalOpen, setIsHamaliSettleModalOpen] = useState(false);
  const [hamaliSettleTarget, setHamaliSettleTarget] = useState<{
    weekKey: string;
    weekLabel: string;
    weekStartDate: string;
    weekEndDate: string;
    gangName: string;
    totalDays: number;
    totalBags: number;
    grossAmount: number;
    expenseIds: string[];
    defaultPaidTo: string;
  } | null>(null);
  const [hamaliAdvanceDeduction, setHamaliAdvanceDeduction] = useState<string>('0');
  const [hamaliPaymentMode, setHamaliPaymentMode] = useState<'Cash' | 'Bank Transfer / NEFT' | 'RTGS' | 'UPI' | 'Cheque'>('Cash');
  const [hamaliReceiptNo, setHamaliReceiptNo] = useState<string>('');
  const [hamaliPaidTo, setHamaliPaidTo] = useState<string>('');
  const [hamaliSettlementDate, setHamaliSettlementDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [hamaliNotes, setHamaliNotes] = useState<string>('');
  const [hamaliSettleError, setHamaliSettleError] = useState<string | null>(null);

  // Viewing Weekly Hamali Printable Voucher Modal
  const [viewingHamaliVoucher, setViewingHamaliVoucher] = useState<WeeklyHamaliSettlement | null>(null);

  // APMC Mandi Fees & Settlement States (Supports Year-on-Year & Month-Wise)
  const financialPeriods = useMemo(() => storage.getAvailableFinancialPeriods().filter(p => p.type === 'financial_year' || p.type === 'all'), []);
  const currentFyPeriod = useMemo(() => financialPeriods.find(p => p.isCurrent)?.id || 'fy_2026_27', [financialPeriods]);

  const [cessFinancialYear, setCessFinancialYear] = useState<string>(currentFyPeriod);
  const [cessMonth, setCessMonth] = useState<string>('all');
  const [marketFilter, setMarketFilter] = useState<'all' | 'government' | 'private'>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'all' | 'unpaid' | 'paid' | 'partial'>('all');
  const [apmcSubTab, setApmcSubTab] = useState<'lots' | 'receipts'>('lots');
  const [showMonthBreakdown, setShowMonthBreakdown] = useState<boolean>(true);

  // Settlement Modal States
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [settleType, setSettleType] = useState<'full' | 'partial'>('full');
  const [settleAmount, setSettleAmount] = useState<string>('');
  const [settleCategory, setSettleCategory] = useState<'all' | 'government' | 'private'>('all');
  const [settlePaymentMode, setSettlePaymentMode] = useState<'RTGS' | 'Bank Transfer / NEFT' | 'Cheque' | 'Cash' | 'UPI'>('RTGS');
  const [settleReceiptNo, setSettleReceiptNo] = useState<string>('');
  const [settlePaidTo, setSettlePaidTo] = useState<string>('Kalamna APMC Market Committee, Nagpur');
  const [settleDate, setSettleDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [settleNotes, setSettleNotes] = useState<string>('');
  const [settleMonthScope, setSettleMonthScope] = useState<string>('all');
  const [settleError, setSettleError] = useState<string | null>(null);

  // Settlement Receipts List & Voucher View
  const [settlements, setSettlements] = useState<APMCSettlement[]>(() => storage.getAPMCSettlements());
  const [viewingSettlement, setViewingSettlement] = useState<APMCSettlement | null>(null);

  // Form State for Adding Expense
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('hamali_loading');
  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expYardId, setExpYardId] = useState(yards[0]?.id || '');
  const [expPaidTo, setExpPaidTo] = useState('');
  const [expHamaliGang, setExpHamaliGang] = useState('Nagpur Mathadi Union Gang #4');
  const [expHamaliWorkType, setExpHamaliWorkType] = useState<'unloading' | 'loading' | 'stacking' | 'weighment' | 'rebagging' | 'general'>('loading');
  const [expHamaliBags, setExpHamaliBags] = useState('300');
  const [expHamaliRate, setExpHamaliRate] = useState('7.50');
  const [expMode, setExpMode] = useState<'Cash' | 'Bank Transfer / NEFT' | 'UPI' | 'Cheque'>('Cash');
  const [expStatus, setExpStatus] = useState<'paid' | 'accrued_payable'>('paid');
  const [expNotes, setExpNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Helper resolvers
  const getYardName = (id?: string) => yards.find(y => y.id === id)?.name || id || '—';
  const getMatName = (id?: string) => materials.find(m => m.id === id)?.name || id || 'Produce';
  const getPartyName = (id?: string) => parties.find(p => p.id === id)?.name || id || 'Mandi Seller';

  React.useEffect(() => {
    setPurchaseList(purchases);
  }, [purchases]);

  // Toggle Fee Paid
  const handleToggleFeePaid = (purchaseId: string) => {
    const updated = storage.togglePurchaseFeePaid(purchaseId);
    setPurchaseList(updated);
    onRefresh?.();
  };

  // Toggle Operating Expense Paid
  const handleToggleExpensePaid = (expenseId: string) => {
    const updated = storage.toggleExpensePaid(expenseId);
    setExpenses(updated);
    onRefresh?.();
  };

  // Delete Expense
  const handleDeleteExpense = (expenseId: string) => {
    if (window.confirm('Are you sure you want to delete this expense record?')) {
      storage.deleteExpense(expenseId);
      setExpenses(storage.getExpenses());
      onRefresh?.();
    }
  };

  // Extract unique available months from all expenses & purchases
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    expenses.forEach(e => {
      if (e.expense_date) monthSet.add(e.expense_date.slice(0, 7));
    });
    purchaseList.forEach(p => {
      if (p.purchase_date) monthSet.add(p.purchase_date.slice(0, 7));
    });
    
    // Sort descending (latest month first)
    const sorted = Array.from(monthSet).sort().reverse();
    return sorted.map(mKey => {
      const [year, month] = mKey.split('-');
      const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
      const label = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      const expCount = expenses.filter(e => e.expense_date.startsWith(mKey)).length;
      return { key: mKey, label, count: expCount };
    });
  }, [expenses, purchaseList]);

  // Filter expenses by selected month
  const monthFilteredExpenses = useMemo(() => {
    if (selectedMonth === 'all') return expenses;
    return expenses.filter(e => e.expense_date.startsWith(selectedMonth));
  }, [expenses, selectedMonth]);

  // Filter purchases (cess) by selected month
  const monthFilteredPurchases = useMemo(() => {
    if (selectedMonth === 'all') return purchaseList;
    return purchaseList.filter(p => p.purchase_date.startsWith(selectedMonth));
  }, [purchaseList, selectedMonth]);

  // --- SUB-DATA: 1. DAILY HAMALI REGISTER ---
  const hamaliExpenses = useMemo(() => {
    return monthFilteredExpenses.filter(e => {
      if (e.category !== 'hamali_loading') return false;
      if (selectedHamaliWorkType !== 'all' && e.hamali_details?.work_type !== selectedHamaliWorkType) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = e.title.toLowerCase().includes(q);
        const matchPaidTo = e.paid_to.toLowerCase().includes(q);
        const matchGang = (e.hamali_details?.gang_name || '').toLowerCase().includes(q);
        if (!matchTitle && !matchPaidTo && !matchGang) return false;
      }

      return true;
    });
  }, [monthFilteredExpenses, selectedHamaliWorkType, searchQuery]);

  // Group hamali expenses by day (descending)
  const dailyHamaliGroups = useMemo(() => {
    const groups: Record<string, { date: string; totalAmount: number; totalBags: number; items: OperatingExpense[] }> = {};

    hamaliExpenses.forEach(exp => {
      const d = exp.expense_date;
      if (!groups[d]) {
        groups[d] = { date: d, totalAmount: 0, totalBags: 0, items: [] };
      }
      groups[d].totalAmount += exp.amount;
      groups[d].totalBags += (exp.hamali_details?.bag_count || 0);
      groups[d].items.push(exp);
    });

    return Object.values(groups).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [hamaliExpenses]);

  const totalHamaliOutlay = hamaliExpenses.reduce((acc, e) => acc + e.amount, 0);
  const totalHamaliBags = hamaliExpenses.reduce((acc, e) => acc + (e.hamali_details?.bag_count || 0), 0);
  const avgHamaliRatePerBag = totalHamaliBags > 0 ? (totalHamaliOutlay / totalHamaliBags) : 7.25;

  // --- SUB-DATA: 1B. WEEKLY HAMALI GROUPING (आठवडी हिशोब व चुकती) ---
  const weeklyHamaliGroups = useMemo(() => {
    const map: Record<string, {
      weekKey: string;
      weekLabel: string;
      weekStartDate: string;
      weekEndDate: string;
      totalLaborAmount: number;
      totalBags: number;
      totalPendingAmount: number;
      pendingGangsCount: number;
      gangs: {
        gangKey: string;
        weekKey: string;
        weekLabel: string;
        weekStartDate: string;
        weekEndDate: string;
        gangName: string;
        totalDays: number;
        datesWorked: string[];
        totalBags: number;
        grossAmount: number;
        pendingAmount: number;
        paidAmount: number;
        isSettled: boolean;
        settlement?: WeeklyHamaliSettlement;
        items: OperatingExpense[];
      }[];
    }> = {};

    hamaliExpenses.forEach(exp => {
      const weekInfo = getWeekDetails(exp.expense_date);
      const gangName = exp.hamali_details?.gang_name || exp.paid_to || 'Nagpur Mathadi Union Gang #4';
      const gangKey = `${weekInfo.weekKey}__${gangName}`;

      if (!map[weekInfo.weekKey]) {
        map[weekInfo.weekKey] = {
          weekKey: weekInfo.weekKey,
          weekLabel: weekInfo.label,
          weekStartDate: weekInfo.startDate,
          weekEndDate: weekInfo.endDate,
          totalLaborAmount: 0,
          totalBags: 0,
          totalPendingAmount: 0,
          pendingGangsCount: 0,
          gangs: []
        };
      }

      const week = map[weekInfo.weekKey];
      week.totalLaborAmount += exp.amount;
      week.totalBags += (exp.hamali_details?.bag_count || 0);

      let gangGroup = week.gangs.find(g => g.gangName.toLowerCase() === gangName.toLowerCase());
      if (!gangGroup) {
        const existingSettlement = weeklySettlements.find(
          s => s.week_key === weekInfo.weekKey && s.gang_name.toLowerCase() === gangName.toLowerCase()
        );

        gangGroup = {
          gangKey,
          weekKey: weekInfo.weekKey,
          weekLabel: weekInfo.label,
          weekStartDate: weekInfo.startDate,
          weekEndDate: weekInfo.endDate,
          gangName,
          totalDays: 0,
          datesWorked: [],
          totalBags: 0,
          grossAmount: 0,
          pendingAmount: 0,
          paidAmount: 0,
          isSettled: Boolean(existingSettlement),
          settlement: existingSettlement,
          items: []
        };
        week.gangs.push(gangGroup);
      }

      gangGroup.items.push(exp);
      gangGroup.grossAmount += exp.amount;
      gangGroup.totalBags += (exp.hamali_details?.bag_count || 0);

      if (!gangGroup.datesWorked.includes(exp.expense_date)) {
        gangGroup.datesWorked.push(exp.expense_date);
      }
      gangGroup.totalDays = gangGroup.datesWorked.length;

      if (exp.payment_status === 'paid') {
        gangGroup.paidAmount += exp.amount;
      } else {
        gangGroup.pendingAmount += exp.amount;
      }
    });

    // Compute settled status & pending sums for each week
    Object.values(map).forEach(week => {
      let pendingGangs = 0;
      week.gangs.forEach(g => {
        if (g.pendingAmount > 0) {
          g.isSettled = false;
          pendingGangs++;
          week.totalPendingAmount += g.pendingAmount;
        } else {
          g.isSettled = true;
        }
        g.items.sort((a, b) => b.expense_date.localeCompare(a.expense_date));
      });
      week.pendingGangsCount = pendingGangs;
    });

    // Also include weeks from historical weeklySettlements that might not have raw items in this view
    weeklySettlements.forEach(settlement => {
      if (selectedMonth !== 'all' && !settlement.settlement_date.startsWith(selectedMonth)) {
        return;
      }

      if (!map[settlement.week_key]) {
        map[settlement.week_key] = {
          weekKey: settlement.week_key,
          weekLabel: settlement.week_label,
          weekStartDate: settlement.week_start_date,
          weekEndDate: settlement.week_end_date,
          totalLaborAmount: settlement.gross_amount,
          totalBags: settlement.total_bags,
          totalPendingAmount: 0,
          pendingGangsCount: 0,
          gangs: [
            {
              gangKey: `${settlement.week_key}__${settlement.gang_name}`,
              weekKey: settlement.week_key,
              weekLabel: settlement.week_label,
              weekStartDate: settlement.week_start_date,
              weekEndDate: settlement.week_end_date,
              gangName: settlement.gang_name,
              totalDays: settlement.total_days,
              datesWorked: [settlement.settlement_date],
              totalBags: settlement.total_bags,
              grossAmount: settlement.gross_amount,
              pendingAmount: 0,
              paidAmount: settlement.gross_amount,
              isSettled: true,
              settlement: settlement,
              items: []
            }
          ]
        };
      }
    });

    return Object.values(map).sort((a, b) => b.weekKey.localeCompare(a.weekKey));
  }, [hamaliExpenses, weeklySettlements, selectedMonth]);

  const totalPendingWeeklyPayoutsCount = useMemo(() => {
    return weeklyHamaliGroups.reduce((acc, w) => acc + w.pendingGangsCount, 0);
  }, [weeklyHamaliGroups]);

  const totalPendingWeeklyAmount = useMemo(() => {
    return weeklyHamaliGroups.reduce((acc, w) => acc + w.totalPendingAmount, 0);
  }, [weeklyHamaliGroups]);

  const toggleGangExpanded = (gangKey: string) => {
    setExpandedGangs(prev => {
      const next = new Set(prev);
      if (next.has(gangKey)) next.delete(gangKey);
      else next.add(gangKey);
      return next;
    });
  };

  const handleOpenHamaliSettleModal = (gang: any) => {
    const rawWeek = gang.weekKey.replace('W', 'WK');
    const autoReceipt = `HAM-${rawWeek}-${Math.floor(10 + Math.random() * 89)}`;
    const pendingItems = gang.items.filter((i: OperatingExpense) => i.payment_status === 'accrued_payable');
    const expenseIds = pendingItems.length > 0 ? pendingItems.map((i: OperatingExpense) => i.id) : gang.items.map((i: OperatingExpense) => i.id);
    const amountToSettle = gang.pendingAmount > 0 ? gang.pendingAmount : gang.grossAmount;

    setHamaliSettleTarget({
      weekKey: gang.weekKey,
      weekLabel: gang.weekLabel,
      weekStartDate: gang.weekStartDate,
      weekEndDate: gang.weekEndDate,
      gangName: gang.gangName,
      totalDays: gang.totalDays,
      totalBags: gang.totalBags,
      grossAmount: amountToSettle,
      expenseIds,
      defaultPaidTo: gang.gangName
    });

    setHamaliAdvanceDeduction('0');
    setHamaliPaymentMode('Cash');
    setHamaliReceiptNo(autoReceipt);
    setHamaliPaidTo(gang.gangName);
    setHamaliSettlementDate(new Date().toISOString().split('T')[0]);
    setHamaliNotes(`Weekly Hamali settlement for ${gang.weekLabel}. Completed.`);
    setHamaliSettleError(null);
    setIsHamaliSettleModalOpen(true);
  };

  const handleConfirmHamaliSettlement = () => {
    if (!hamaliSettleTarget) return;

    const advance = parseFloat(hamaliAdvanceDeduction) || 0;
    if (advance < 0) {
      setHamaliSettleError('Advance deduction cannot be negative.');
      return;
    }

    const netPaid = hamaliSettleTarget.grossAmount - advance;
    if (netPaid < 0) {
      setHamaliSettleError('Advance deduction cannot exceed gross hamali earned.');
      return;
    }

    if (!hamaliReceiptNo.trim()) {
      setHamaliSettleError('Please enter a receipt / voucher number.');
      return;
    }

    if (!hamaliPaidTo.trim()) {
      setHamaliSettleError('Please enter payee / mukadam name.');
      return;
    }

    try {
      const { settlement, updatedExpenses } = storage.settleWeeklyHamali({
        week_key: hamaliSettleTarget.weekKey,
        week_label: hamaliSettleTarget.weekLabel,
        week_start_date: hamaliSettleTarget.weekStartDate,
        week_end_date: hamaliSettleTarget.weekEndDate,
        gang_name: hamaliSettleTarget.gangName,
        total_days: hamaliSettleTarget.totalDays,
        total_bags: hamaliSettleTarget.totalBags,
        gross_amount: hamaliSettleTarget.grossAmount,
        advance_deduction: advance,
        net_paid_amount: netPaid,
        settlement_date: hamaliSettlementDate,
        payment_mode: hamaliPaymentMode,
        receipt_no: hamaliReceiptNo.trim(),
        paid_to: hamaliPaidTo.trim(),
        notes: hamaliNotes.trim() || undefined,
        expense_ids: hamaliSettleTarget.expenseIds,
        settled_by_name: activeUser.name
      });

      setExpenses(updatedExpenses);
      setWeeklySettlements(storage.getWeeklyHamaliSettlements());
      setIsHamaliSettleModalOpen(false);

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });

      setViewingHamaliVoucher(settlement);
      onRefresh?.();
    } catch (err: any) {
      setHamaliSettleError(err?.message || 'Error recording weekly settlement.');
    }
  };

  const handleDeleteWeeklySettlement = (id: string) => {
    if (window.confirm('Are you sure you want to delete/revert this weekly settlement receipt? All linked hamali lots will be returned to payable status.')) {
      storage.deleteWeeklyHamaliSettlement(id);
      setWeeklySettlements(storage.getWeeklyHamaliSettlements());
      setExpenses(storage.getExpenses());
      onRefresh?.();
    }
  };

  const voucherItems = useMemo(() => {
    if (!viewingHamaliVoucher) return [];
    return expenses.filter(e => {
      if (e.weekly_settlement_id === viewingHamaliVoucher.id) return true;
      if (viewingHamaliVoucher.expense_ids?.includes(e.id)) return true;
      const week = getWeekDetails(e.expense_date);
      const gang = e.hamali_details?.gang_name || e.paid_to;
      return week.weekKey === viewingHamaliVoucher.week_key && gang.toLowerCase() === viewingHamaliVoucher.gang_name.toLowerCase();
    }).sort((a, b) => a.expense_date.localeCompare(b.expense_date));
  }, [viewingHamaliVoucher, expenses]);

  // --- SUB-DATA: 2. MONTH-WISE COMPARATIVE SUMMARY ---
  const monthlySummaries = useMemo(() => {
    const map: Record<string, {
      monthKey: string;
      monthLabel: string;
      totalExpenses: number;
      hamaliTotal: number;
      cessTotal: number;
      overheadsTotal: number;
      paidTotal: number;
      accruedTotal: number;
      count: number;
    }> = {};

    // Process all expenses across all months
    expenses.forEach(e => {
      const mKey = e.expense_date.slice(0, 7);
      if (!map[mKey]) {
        const [year, month] = mKey.split('-');
        const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
        map[mKey] = {
          monthKey: mKey,
          monthLabel: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
          totalExpenses: 0,
          hamaliTotal: 0,
          cessTotal: 0,
          overheadsTotal: 0,
          paidTotal: 0,
          accruedTotal: 0,
          count: 0
        };
      }

      map[mKey].totalExpenses += e.amount;
      map[mKey].count += 1;

      if (e.payment_status === 'paid') map[mKey].paidTotal += e.amount;
      else map[mKey].accruedTotal += e.amount;

      if (e.category === 'hamali_loading') {
        map[mKey].hamaliTotal += e.amount;
      } else {
        map[mKey].overheadsTotal += e.amount;
      }
    });

    // Add Mandi Cess for each month
    purchaseList.forEach(p => {
      const mKey = p.purchase_date.slice(0, 7);
      const feeRate = p.market_category === 'private' ? 0.55 : 0.85;
      const cessAmt = p.market_fee_amount ?? Number((p.total_amount * (feeRate / 100)).toFixed(2));

      if (!map[mKey]) {
        const [year, month] = mKey.split('-');
        const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
        map[mKey] = {
          monthKey: mKey,
          monthLabel: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
          totalExpenses: 0,
          hamaliTotal: 0,
          cessTotal: 0,
          overheadsTotal: 0,
          paidTotal: 0,
          accruedTotal: 0,
          count: 0
        };
      }

      map[mKey].cessTotal += cessAmt;
      map[mKey].totalExpenses += cessAmt;
      if (p.market_fee_paid) map[mKey].paidTotal += cessAmt;
      else map[mKey].accruedTotal += cessAmt;
    });

    return Object.values(map).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [expenses, purchaseList]);

  // --- SUB-DATA: 4. APMC MANDI FEES (SUPPORTS YEAR-ON-YEAR & MONTH-WISE AUDIT) ---
  const cessFinancialYearLabel = useMemo(() => {
    return financialPeriods.find(p => p.id === cessFinancialYear)?.label || cessFinancialYear;
  }, [financialPeriods, cessFinancialYear]);

  // Purchases matching selected Financial Year for APMC Cess
  const cessFyPurchases = useMemo(() => {
    if (cessFinancialYear === 'all') return purchaseList;
    return purchaseList.filter(p => storage.matchesPeriod(p.purchase_date, cessFinancialYear));
  }, [purchaseList, cessFinancialYear]);

  // Month-Wise Breakdown summary for all months in this FY
  const apmcMonthBreakdown = useMemo(() => {
    const map: Record<string, {
      monthKey: string;
      monthLabel: string;
      dealsCount: number;
      grossTurnover: number;
      govtTurnover: number;
      privateTurnover: number;
      govtCess: number;
      privateCess: number;
      totalCess: number;
      totalPaid: number;
      netDue: number;
      status: 'paid' | 'partial' | 'due';
    }> = {};

    cessFyPurchases.forEach(p => {
      const mKey = (p.purchase_date || '').slice(0, 7);
      if (!mKey) return;

      if (!map[mKey]) {
        let label = mKey;
        try {
          const [y, m] = mKey.split('-');
          const d = new Date(parseInt(y), parseInt(m) - 1, 1);
          label = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
        } catch {}

        map[mKey] = {
          monthKey: mKey,
          monthLabel: label,
          dealsCount: 0,
          grossTurnover: 0,
          govtTurnover: 0,
          privateTurnover: 0,
          govtCess: 0,
          privateCess: 0,
          totalCess: 0,
          totalPaid: 0,
          netDue: 0,
          status: 'due'
        };
      }

      const isPvt = p.market_category === 'private';
      const rate = isPvt ? 0.0055 : 0.0085;
      const lotFee = p.market_fee_amount ?? Number(((p.total_amount || 0) * rate).toFixed(2));
      const lotPaid = p.market_fee_paid ? lotFee : (p.market_fee_paid_amount || 0);

      map[mKey].dealsCount += 1;
      map[mKey].grossTurnover += p.total_amount || 0;
      if (isPvt) {
        map[mKey].privateTurnover += p.total_amount || 0;
        map[mKey].privateCess += lotFee;
      } else {
        map[mKey].govtTurnover += p.total_amount || 0;
        map[mKey].govtCess += lotFee;
      }
      map[mKey].totalCess += lotFee;
      map[mKey].totalPaid += lotPaid;
    });

    Object.values(map).forEach(item => {
      item.netDue = Math.max(0, Number((item.totalCess - item.totalPaid).toFixed(2)));
      if (item.netDue <= 0.01) {
        item.status = 'paid';
      } else if (item.totalPaid > 0) {
        item.status = 'partial';
      } else {
        item.status = 'due';
      }
    });

    return Object.values(map).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [cessFyPurchases]);

  // Purchases matching both FY and month filter (if month !== 'all')
  const apmcScopePurchases = useMemo(() => {
    return cessFyPurchases.filter(p => {
      if (cessMonth !== 'all' && !p.purchase_date.startsWith(cessMonth)) return false;
      return true;
    });
  }, [cessFyPurchases, cessMonth]);

  const apmcGovtPurchases = apmcScopePurchases.filter(p => (p.market_category || 'government') === 'government');
  const apmcPrivatePurchases = apmcScopePurchases.filter(p => p.market_category === 'private');

  const apmcGovtTurnover = apmcGovtPurchases.reduce((acc, p) => acc + (p.total_amount || 0), 0);
  const apmcGovtFeesAccrued = apmcGovtPurchases.reduce((acc, p) => {
    return acc + (p.market_fee_amount ?? Number(((p.total_amount || 0) * 0.0085).toFixed(2)));
  }, 0);

  const apmcPrivateTurnover = apmcPrivatePurchases.reduce((acc, p) => acc + (p.total_amount || 0), 0);
  const apmcPrivateFeesAccrued = apmcPrivatePurchases.reduce((acc, p) => {
    return acc + (p.market_fee_amount ?? Number(((p.total_amount || 0) * 0.0055).toFixed(2)));
  }, 0);

  const totalMarketFeesAccrued = apmcGovtFeesAccrued + apmcPrivateFeesAccrued;
  const totalMarketFeesPaid = apmcScopePurchases.reduce((acc, p) => {
    const rate = p.market_category === 'private' ? 0.0055 : 0.0085;
    const lotFee = p.market_fee_amount ?? Number(((p.total_amount || 0) * rate).toFixed(2));
    const paid = p.market_fee_paid ? lotFee : (p.market_fee_paid_amount || 0);
    return acc + paid;
  }, 0);
  const totalMarketFeesDue = Math.max(0, totalMarketFeesAccrued - totalMarketFeesPaid);

  const filteredFeesPurchases = apmcScopePurchases.filter(p => {
    const category = p.market_category || 'government';
    if (marketFilter !== 'all' && category !== marketFilter) return false;

    const rate = category === 'private' ? 0.0055 : 0.0085;
    const lotFee = p.market_fee_amount ?? Number(((p.total_amount || 0) * rate).toFixed(2));
    const paidAmt = p.market_fee_paid ? lotFee : (p.market_fee_paid_amount || 0);
    const lotDue = Math.max(0, lotFee - paidAmt);

    if (paymentStatusFilter === 'paid' && (!p.market_fee_paid && lotDue > 0.01)) return false;
    if (paymentStatusFilter === 'unpaid' && (p.market_fee_paid || paidAmt > 0)) return false;
    if (paymentStatusFilter === 'partial' && (p.market_fee_paid || paidAmt === 0 || lotDue <= 0.01)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const mat = getMatName(p.material_id).toLowerCase();
      const party = getPartyName(p.party_id).toLowerCase();
      const lot = (p.lot_number || '').toLowerCase();
      const loc = (p.market_location || '').toLowerCase();
      const ref = (p.market_fee_payment_ref || '').toLowerCase();
      if (!mat.includes(q) && !party.includes(q) && !lot.includes(q) && !loc.includes(q) && !ref.includes(q)) {
        return false;
      }
    }
    return true;
  });

  // Filtered APMC Settlements History
  const filteredSettlements = useMemo(() => {
    return settlements.filter(s => {
      if (cessFinancialYear !== 'all' && s.financial_year && s.financial_year !== cessFinancialYear) return false;
      if (cessMonth !== 'all' && s.month && s.month !== 'all' && s.month !== cessMonth) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const ref = (s.receipt_no || '').toLowerCase();
        const paidTo = (s.paid_to || '').toLowerCase();
        const notes = (s.notes || '').toLowerCase();
        if (!ref.includes(q) && !paidTo.includes(q) && !notes.includes(q)) return false;
      }
      return true;
    });
  }, [settlements, cessFinancialYear, cessMonth, searchQuery]);

  // APMC Settle Handlers
  const handleOpenSettleModal = (scopeMonthTarget: string = cessMonth) => {
    setSettleMonthScope(scopeMonthTarget);
    const targetPurchases = cessFyPurchases.filter(p => {
      if (scopeMonthTarget !== 'all' && !p.purchase_date.startsWith(scopeMonthTarget)) return false;
      if (marketFilter !== 'all' && (p.market_category || 'government') !== marketFilter) return false;
      return true;
    });

    const dueForScope = targetPurchases.reduce((acc, p) => {
      const rate = p.market_category === 'private' ? 0.0055 : 0.0085;
      const lotFee = p.market_fee_amount ?? Number(((p.total_amount || 0) * rate).toFixed(2));
      const paid = p.market_fee_paid ? lotFee : (p.market_fee_paid_amount || 0);
      return acc + Math.max(0, lotFee - paid);
    }, 0);

    const roundedDue = Number(dueForScope.toFixed(2));
    setSettleAmount(roundedDue > 0 ? roundedDue.toString() : '0');
    setSettleType('full');
    setSettleCategory(marketFilter);
    setSettleReceiptNo(`APMC-REC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
    setSettlePaidTo('Kalamna APMC Market Committee, Nagpur');
    setSettleDate(new Date().toISOString().split('T')[0]);
    setSettlePaymentMode('RTGS');
    const fyLabel = financialPeriods.find(p => p.id === cessFinancialYear)?.label || cessFinancialYear;
    setSettleNotes(`APMC Mandi Cess settlement for ${fyLabel}${scopeMonthTarget !== 'all' ? ` (${scopeMonthTarget})` : ' (Year-End / Consolidated)'}`);
    setSettleError(null);
    setIsSettleModalOpen(true);
  };

  const handleConfirmSettlement = () => {
    const amt = parseFloat(settleAmount);
    if (isNaN(amt) || amt <= 0) {
      setSettleError('कृपया वैध भरणा रक्कम टाका (Please enter a valid payment amount)');
      return;
    }
    if (!settleReceiptNo.trim()) {
      setSettleError('कृपया बाजार समिती पावती क्र. / चलन क्र. टाका (Receipt / Challan No is required)');
      return;
    }

    try {
      storage.settleAPMCFees({
        amount: amt,
        settlement_type: settleType,
        date: settleDate,
        financial_year: cessFinancialYear,
        month: settleMonthScope,
        market_category: settleCategory,
        payment_mode: settlePaymentMode,
        receipt_no: settleReceiptNo.trim(),
        paid_to: settlePaidTo.trim() || 'Kalamna APMC Market Committee, Nagpur',
        notes: settleNotes.trim()
      });

      setPurchaseList(storage.getPurchases());
      setExpenses(storage.getExpenses());
      setSettlements(storage.getAPMCSettlements());
      setIsSettleModalOpen(false);
      onRefresh?.();

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (err: any) {
      setSettleError(err?.message || 'भरणा नोंदवताना त्रुटी आली');
    }
  };

  const handleDeleteSettlement = (id: string) => {
    if (window.confirm('Are you sure you want to delete this APMC settlement receipt?')) {
      storage.deleteAPMCSettlement(id);
      setSettlements(storage.getAPMCSettlements());
      onRefresh?.();
    }
  };

  // --- SUB-DATA: 5. OPERATING OVERHEADS ---
  const operatingOverheads = useMemo(() => {
    return monthFilteredExpenses.filter(e => {
      // General expenses not directly categorized as client dispatch or hamali
      if (e.category === 'hamali_loading') return false;
      if (e.party_id || e.client_billing_status === 'billable_to_client') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const title = e.title.toLowerCase();
        const paidTo = e.paid_to.toLowerCase();
        const cat = e.category.toLowerCase();
        if (!title.includes(q) && !paidTo.includes(q) && !cat.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [monthFilteredExpenses, searchQuery]);

  // --- ACTIVE SELECTED MONTH LABEL ---
  const selectedMonthLabel = useMemo(() => {
    if (selectedMonth === 'all') return 'All Months';
    const [year, month] = selectedMonth.split('-');
    const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  }, [selectedMonth]);

  // Handle Submit New Expense
  const handleAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const amt = parseFloat(expAmount);

    if (!expTitle.trim()) {
      setFormError('Please enter a descriptive expense title.');
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      setFormError('Amount must be greater than zero.');
      return;
    }
    if (!expPaidTo.trim()) {
      setFormError('Please enter payee / labor gang name.');
      return;
    }

    const newExp = storage.addExpense({
      expense_date: expDate,
      category: expCategory,
      title: expTitle.trim(),
      amount: amt,
      yard_id: expYardId || undefined,
      paid_to: expPaidTo.trim(),
      payment_mode: expMode,
      payment_status: expStatus,
      hamali_details: addExpenseType === 'hamali' ? {
        gang_name: expHamaliGang.trim(),
        work_type: expHamaliWorkType,
        bag_count: parseInt(expHamaliBags, 10) || undefined,
        rate_per_bag: parseFloat(expHamaliRate) || undefined
      } : undefined,
      notes: expNotes.trim() || undefined,
      created_by_name: activeUser.name
    });

    confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });

    setExpenses([newExp, ...expenses.filter(item => item.id !== newExp.id)]);
    
    // If expense was recorded for a specific month, ensure the user stays or switches to that month
    const expenseMonthKey = newExp.expense_date.slice(0, 7);
    if (selectedMonth !== 'all' && selectedMonth !== expenseMonthKey) {
      setSelectedMonth(expenseMonthKey);
    }

    setIsAddExpenseOpen(false);
    setExpTitle('');
    setExpAmount('');
    setExpPaidTo('');
    setExpNotes('');
  };

  // Open Add Expense modal pre-configured
  const handleOpenAdd = (type: 'general' | 'hamali') => {
    setAddExpenseType(type);

    // Default the date to the selected month if a specific month is active
    if (selectedMonth !== 'all' && selectedMonth.includes('-')) {
      const todayIso = new Date().toISOString().split('T')[0];
      if (todayIso.startsWith(selectedMonth)) {
        setExpDate(todayIso);
      } else {
        setExpDate(`${selectedMonth}-01`);
      }
    } else {
      setExpDate(new Date().toISOString().split('T')[0]);
    }

    if (type === 'hamali') {
      setExpCategory('hamali_loading');
      setExpTitle('Daily Hamali Work Entry');
      setExpPaidTo(expHamaliGang);
      setExpStatus('accrued_payable'); // Default to weekly accrued payable
      const bags = parseInt(expHamaliBags, 10) || 300;
      const rate = parseFloat(expHamaliRate) || 7.5;
      setExpAmount((bags * rate).toString());
    } else {
      setExpCategory('storage_maintenance');
      setExpTitle('Godown Maintenance & Overheads');
      setExpPaidTo('');
      setExpAmount('');
      setExpStatus('paid');
    }
    setIsAddExpenseOpen(true);
  };

  // CSV Export for APMC Market Fees
  const exportCessCsv = () => {
    const headers = [
      'Purchase Date',
      'Market Division',
      'Fee Rate (%)',
      'Mandi Location',
      'APMC Seller',
      'Commodity',
      'Quantity (Qtl)',
      'Gross Purchase Value (Rs)',
      'Accrued Market Fee (Rs)',
      'Paid Amount (Rs)',
      'Payment Status',
      'Receipt / Challan No',
      'Payment Date',
      'Lot / Bill No',
      'Recorded By'
    ];

    const rows = filteredFeesPurchases.map(p => {
      const isPvt = p.market_category === 'private';
      const feeRate = isPvt ? 0.55 : 0.85;
      const feeAmt = p.market_fee_amount ?? Number((p.total_amount * (feeRate / 100)).toFixed(2));
      const paidAmt = p.market_fee_paid ? feeAmt : (p.market_fee_paid_amount || 0);
      let statusStr = 'Pending Due';
      if (p.market_fee_paid || feeAmt - paidAmt <= 0.01) statusStr = 'Fully Paid';
      else if (paidAmt > 0) statusStr = 'Partially Paid';

      return [
        p.purchase_date,
        isPvt ? 'Private APMC (0.55%)' : 'Government APMC (0.85%)',
        feeRate,
        `"${p.market_location || 'Nagpur'}"`,
        `"${getPartyName(p.party_id)}"`,
        `"${getMatName(p.material_id)}"`,
        p.qty_quintals,
        p.total_amount,
        feeAmt,
        paidAmt,
        statusStr,
        `"${p.market_fee_payment_ref || ''}"`,
        `"${p.market_fee_payment_date || ''}"`,
        `"${p.lot_number || ''}"`,
        `"${p.created_by_name}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `nagpur_apmc_cess_register_${cessFinancialYear}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">

      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/90 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Receipt className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Expenses & Labor Hub (खर्च व हमाली)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Hamali & Loading • APMC Mandi Cess • Yard & Godown Overheads
          </p>
        </div>

        {/* Compact Integrated Controls: Month Filter + Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Integrated Month Selector Dropdown */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-amber-500" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent border-none text-xs font-bold focus:outline-none cursor-pointer text-slate-800 dark:text-slate-200 pr-1"
            >
              <option value="all">All Months ({expenses.length})</option>
              {availableMonths.map(m => (
                <option key={m.key} value={m.key}>{m.label} ({m.count})</option>
              ))}
            </select>
            {selectedMonth !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedMonth('all')}
                className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title="Reset to All Months"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => handleOpenAdd('hamali')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 shadow-xs transition active:scale-95"
            title="Record Daily Hamali"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Hamali</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenAdd('general')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 shadow-xs transition active:scale-95"
            title="Record Yard Expense"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Overhead</span>
          </button>

          <button
            type="button"
            onClick={exportCessCsv}
            className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            title="Print"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3. Section Navigation Tabs Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-sm space-y-4">
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          
          <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 overflow-x-auto">
            
            {/* Tab 1: Daily Hamali Register */}
            <button
              onClick={() => setActiveTab('daily_hamali')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'daily_hamali'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <HardHat className="w-3.5 h-3.5" />
              <span>Hamali Ledger (हमाली)</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300">
                {hamaliExpenses.length}
              </span>
            </button>

            {/* Tab 2: APMC Market Fees */}
            <button
              onClick={() => setActiveTab('market_fees')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'market_fees'
                  ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>APMC Cess (बाजार फी)</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-500/15 text-purple-700 dark:text-purple-300">
                {filteredFeesPurchases.length}
              </span>
            </button>

            {/* Tab 3: Overheads */}
            <button
              onClick={() => setActiveTab('operating_expenses')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'operating_expenses'
                  ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-sm font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Yard Overheads (गोडाऊन खर्च)</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                {operatingOverheads.length}
              </span>
            </button>

            {/* Tab 4: Month-wise Monitor */}
            <button
              onClick={() => setActiveTab('monthly_monitor')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'monthly_monitor'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Monthly Audit (मासिक अहवाल)</span>
            </button>

          </div>

          {/* Quick Search in Active Tab */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search title, party, gang..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input text-xs pl-8 py-1.5 w-full"
            />
          </div>

        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* VIEW: DAILY HAMALI REGISTER                                      */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'daily_hamali' && (
          <div className="space-y-4">
            
            {/* Clean 3-Metric Hamali KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total Hamali (एकूण हमाली)
                </span>
                <div className="text-xl sm:text-2xl font-black num-metric text-slate-900 dark:text-white mt-0.5">
                  ₹{totalHamaliOutlay.toLocaleString('en-IN')}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total Bags Handled (एकूण पोती)
                </span>
                <div className="text-xl sm:text-2xl font-black num-metric text-slate-900 dark:text-white mt-0.5">
                  {totalHamaliBags.toLocaleString('en-IN')} Bags
                </div>
              </div>

              <div className={`p-3.5 rounded-2xl border ${
                totalPendingWeeklyAmount > 0 
                  ? 'bg-amber-500/10 border-amber-500/30' 
                  : 'bg-emerald-500/10 border-emerald-500/30'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${
                    totalPendingWeeklyAmount > 0 ? 'text-amber-800 dark:text-amber-300' : 'text-emerald-800 dark:text-emerald-300'
                  }`}>
                    Weekly Payout Due (देय बाकी)
                  </span>
                  {totalPendingWeeklyPayoutsCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950">
                      {totalPendingWeeklyPayoutsCount} Week Due
                    </span>
                  )}
                </div>
                <div className={`text-xl sm:text-2xl font-black num-metric mt-0.5 ${
                  totalPendingWeeklyAmount > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'
                }`}>
                  {totalPendingWeeklyAmount > 0 ? `₹${totalPendingWeeklyAmount.toLocaleString('en-IN')}` : '₹0 (All Settled ✓)'}
                </div>
              </div>
            </div>

            {/* Sub-Tabs: Weekly Ledger vs Daily Entries vs Settlement Receipts */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
              <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setHamaliSubTab('weekly_ledger')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    hamaliSubTab === 'weekly_ledger'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <CalendarRange className="w-3.5 h-3.5" />
                  <span>Weekly Ledger (आठवडी हिशोब)</span>
                  {totalPendingWeeklyPayoutsCount > 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-800 dark:text-amber-300 animate-pulse">
                      {totalPendingWeeklyPayoutsCount} Due
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                      ✓ Settled
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setHamaliSubTab('daily_entries')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    hamaliSubTab === 'daily_entries'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Daily Entries (दैनंदिन नोंदी)</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    {hamaliExpenses.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setHamaliSubTab('settlement_receipts')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    hamaliSubTab === 'settlement_receipts'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Settlement Receipts (पावती नोंदवही)</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    {weeklySettlements.length}
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={selectedHamaliWorkType}
                  onChange={(e) => setSelectedHamaliWorkType(e.target.value)}
                  className="form-input text-xs py-1.5 font-bold"
                >
                  <option value="all">👷 All Work Types (उतराई, चढाई, थप्पी, शिलाई)</option>
                  <option value="unloading">📥 Unloading (उतराई)</option>
                  <option value="loading">📤 Loading (चढाई)</option>
                  <option value="stacking">📦 Stacking (थप्पी)</option>
                  <option value="rebagging">🧵 Stitching (शिलाई)</option>
                  <option value="weighment">⚖️ Weighbridge (काटा)</option>
                </select>

                <button
                  type="button"
                  onClick={() => handleOpenAdd('hamali')}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition active:scale-95 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Record Hamali</span>
                </button>
              </div>
            </div>

            {/* ───────────────────────────────────────────────────────────── */}
            {/* SUB-TAB 1: WEEKLY HAMALI LEDGER (आठवडी हिशोब व चुकती)        */}
            {/* ───────────────────────────────────────────────────────────── */}
            {hamaliSubTab === 'weekly_ledger' && (
              <div className="space-y-4 pt-1">
                {weeklyHamaliGroups.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
                    <p className="font-semibold text-slate-600 dark:text-slate-300">
                      No weekly hamali records found for {selectedMonthLabel}.
                    </p>
                    <button
                      onClick={() => handleOpenAdd('hamali')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 transition shadow-sm active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Record First Daily Hamali Entry</span>
                    </button>
                  </div>
                ) : (
                  weeklyHamaliGroups.map(week => (
                    <div 
                      key={week.weekKey}
                      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs space-y-0"
                    >
                      {/* Clean Minimal Week Header */}
                      <div className="p-3.5 px-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className="font-black text-slate-900 dark:text-white">
                            📅 {week.weekLabel}
                          </span>
                          {week.pendingGangsCount > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/25">
                              ⏳ Due: ₹{week.totalPendingAmount.toLocaleString('en-IN')}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                              ✓ All Settled
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-[11px] text-slate-500 font-semibold">
                            {week.totalBags.toLocaleString('en-IN')} Bags Handled
                          </span>
                          <span className="font-black num-metric text-slate-900 dark:text-white text-sm">
                            ₹{week.totalLaborAmount.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      {/* Gang Cards in this Week */}
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {week.gangs.map(gang => {
                          const isExpanded = expandedGangs.has(gang.gangKey);
                          const workTypesList = Array.from(new Set(gang.items.map(i => i.hamali_details?.work_type || 'hamali')));

                          return (
                            <div key={gang.gangKey} className="p-4 sm:p-5 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition space-y-3">
                              
                              {/* Gang Row Primary Summary */}
                              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-black text-slate-900 dark:text-white">
                                      {gang.gangName}
                                    </span>

                                    {workTypesList.map(wt => (
                                      <span 
                                        key={wt} 
                                        className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 uppercase"
                                      >
                                        {wt}
                                      </span>
                                    ))}

                                    {gang.isSettled ? (
                                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" />
                                        <span>Week Settled (चुकती झाली)</span>
                                      </span>
                                    ) : (
                                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        <span>Weekly Payout Due (आठवडी देय बाकी)</span>
                                      </span>
                                    )}
                                  </div>

                                  {/* Metric Chips */}
                                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap pt-0.5">
                                    <span className="flex items-center gap-1 font-medium">
                                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                      <strong className="text-slate-700 dark:text-slate-200">{gang.totalDays} Days Worked</strong>
                                      <span className="text-[11px] text-slate-400">
                                        ({gang.datesWorked.map(d => new Date(d).toLocaleDateString('en-IN', { weekday: 'short' })).join(', ')})
                                      </span>
                                    </span>

                                    <span>•</span>

                                    <span className="flex items-center gap-1 font-medium">
                                      <Package className="w-3.5 h-3.5 text-slate-400" />
                                      <strong className="text-slate-700 dark:text-slate-200">{gang.totalBags.toLocaleString('en-IN')} Bags Handled</strong>
                                    </span>

                                    {gang.settlement && (
                                      <>
                                        <span>•</span>
                                        <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                                          Receipt: {gang.settlement.receipt_no}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* Financial Amounts & Action Buttons */}
                                <div className="flex items-center justify-between md:justify-end gap-3.5 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                                  <div className="text-left md:text-right">
                                    <span className="text-lg font-black num-metric text-slate-900 dark:text-white">
                                      ₹{gang.grossAmount.toLocaleString('en-IN')}
                                    </span>
                                    {gang.isSettled ? (
                                      <span className="block text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                        ✓ Net Paid: ₹{(gang.settlement?.net_paid_amount || gang.grossAmount).toLocaleString('en-IN')}
                                      </span>
                                    ) : (
                                      <span className="block text-[11px] font-bold text-amber-600 dark:text-amber-400">
                                        ⏳ Due: ₹{gang.pendingAmount.toLocaleString('en-IN')}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {/* Action Button: Settle Week's Hamali vs View Voucher */}
                                    {gang.pendingAmount > 0 ? (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenHamaliSettleModal(gang)}
                                        className="px-3.5 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition active:scale-95 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                        <span>Settle Week's Hamali (चुकती करा)</span>
                                      </button>
                                    ) : (
                                      gang.settlement && (
                                        <button
                                          type="button"
                                          onClick={() => setViewingHamaliVoucher(gang.settlement!)}
                                          className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition flex items-center gap-1.5 cursor-pointer"
                                        >
                                          <Printer className="w-3.5 h-3.5 text-slate-500" />
                                          <span>Print Voucher</span>
                                        </button>
                                      )
                                    )}

                                    {/* Toggle Breakdown Expand */}
                                    <button
                                      type="button"
                                      onClick={() => toggleGangExpanded(gang.gangKey)}
                                      className={`p-2 rounded-xl border transition ${
                                        isExpanded
                                          ? 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white'
                                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800'
                                      }`}
                                      title={isExpanded ? 'Hide itemized lots' : 'Show day-by-day itemized lots'}
                                    >
                                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Expandable Itemized Work Breakdown */}
                              {isExpanded && (
                                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-3.5 space-y-2.5">
                                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                                    <span className="flex items-center gap-1.5">
                                      <FileText className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Day-by-Day Work Breakdown for {week.weekLabel}</span>
                                    </span>
                                    <span className="text-[11px] text-slate-400 font-normal">
                                      {gang.items.length} lots recorded across {gang.totalDays} working days
                                    </span>
                                  </div>

                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-xs">
                                      <thead>
                                        <tr className="border-b border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                          <th className="py-2 px-2.5">Work Date</th>
                                          <th className="py-2 px-2.5">Operation</th>
                                          <th className="py-2 px-2.5">Vehicle / Lot</th>
                                          <th className="py-2 px-2.5">Yard / Shed</th>
                                          <th className="py-2 px-2.5 text-right">Bags</th>
                                          <th className="py-2 px-2.5 text-right">Rate / Bag</th>
                                          <th className="py-2 px-2.5 text-right font-bold">Total (₹)</th>
                                          <th className="py-2 px-2.5 text-center">Status</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-200/70 dark:divide-slate-700/60">
                                        {gang.items.map(item => (
                                          <tr key={item.id} className="hover:bg-white dark:hover:bg-slate-800/60 transition">
                                            <td className="py-2 px-2.5 font-bold text-slate-900 dark:text-white">
                                              {new Date(item.expense_date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}
                                            </td>
                                            <td className="py-2 px-2.5 capitalize font-medium text-slate-700 dark:text-slate-300">
                                              {item.hamali_details?.work_type || 'Hamali'}
                                            </td>
                                            <td className="py-2 px-2.5 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                                              {item.hamali_details?.vehicle_no || item.title || '—'}
                                            </td>
                                            <td className="py-2 px-2.5 text-slate-500">
                                              {getYardName(item.yard_id)}
                                            </td>
                                            <td className="py-2 px-2.5 text-right font-bold text-slate-800 dark:text-slate-200">
                                              {item.hamali_details?.bag_count || '—'}
                                            </td>
                                            <td className="py-2 px-2.5 text-right text-slate-600 dark:text-slate-400">
                                              ₹{item.hamali_details?.rate_per_bag?.toFixed(2) || '7.50'}
                                            </td>
                                            <td className="py-2 px-2.5 text-right font-black num-metric text-emerald-600 dark:text-emerald-400">
                                              ₹{item.amount.toLocaleString('en-IN')}
                                            </td>
                                            <td className="py-2 px-2.5 text-center">
                                              {item.payment_status === 'paid' ? (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                                                  Paid
                                                </span>
                                              ) : (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300">
                                                  Accrued
                                                </span>
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                            </div>
                          );
                        })}
                      </div>

                    </div>
                  ))
                )}
              </div>
            )}

            {/* ───────────────────────────────────────────────────────────── */}
            {/* SUB-TAB 2: DAILY HAMALI ENTRIES (दैनंदिन नोंदी)              */}
            {/* ───────────────────────────────────────────────────────────── */}
            {hamaliSubTab === 'daily_entries' && (
              <div className="space-y-4 pt-1">
                {dailyHamaliGroups.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
                    <p className="font-semibold text-slate-600 dark:text-slate-300">
                      No daily Hamali labor records found for {selectedMonthLabel}.
                    </p>
                    <button
                      onClick={() => handleOpenAdd('hamali')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 transition shadow-sm active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Store Daily Hamali into {selectedMonthLabel}</span>
                    </button>
                  </div>
                ) : (
                  dailyHamaliGroups.map(group => {
                    const groupDate = new Date(group.date);
                    const isToday = group.date === new Date().toISOString().split('T')[0];
                    const dateTitle = isToday 
                      ? `📅 Today • ${groupDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
                      : `📅 ${groupDate.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}`;

                    return (
                      <div 
                        key={group.date}
                        className="rounded-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-xs"
                      >
                        {/* Day Group Header */}
                        <div className="p-3 sm:px-4 bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900 dark:text-white">
                              {dateTitle}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300">
                              {group.items.length} {group.items.length === 1 ? 'Record' : 'Records'}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            {group.totalBags > 0 && (
                              <span className="text-[11px] font-semibold text-slate-500">
                                {group.totalBags} Bags Handled
                              </span>
                            )}
                            <span className="font-black num-metric text-emerald-600 dark:text-emerald-400 text-sm">
                              Day Total: ₹{group.totalAmount.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>

                        {/* Day's Itemized Payouts */}
                        <div className="divide-y divide-slate-100 dark:divide-slate-800/60 p-1">
                          {group.items.map(item => (
                            <div
                              key={item.id}
                              className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                            >
                              <div className="min-w-0 pr-2">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <span className="font-black text-slate-900 dark:text-white">
                                    {item.hamali_details?.gang_name || item.paid_to}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 uppercase tracking-wider">
                                    {item.hamali_details?.work_type || 'Hamali'}
                                  </span>
                                  {item.hamali_details?.bag_count && (
                                    <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
                                      {item.hamali_details.bag_count} Bags @ ₹{item.hamali_details.rate_per_bag || 7.5}/bag
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                                  <span>{item.title}</span>
                                  {item.yard_id && (
                                    <>
                                      <span>•</span>
                                      <span>📍 {getYardName(item.yard_id)}</span>
                                    </>
                                  )}
                                  <span>•</span>
                                  <span>Mode: {item.payment_mode}</span>
                                </div>

                                {item.notes && (
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 italic">
                                    "{item.notes}"
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                                <div className="text-left sm:text-right">
                                  <span className="text-base font-black num-metric text-emerald-600 dark:text-emerald-400">
                                    ₹{item.amount.toLocaleString('en-IN')}
                                  </span>
                                  <span className={`block text-[10px] font-bold ${item.payment_status === 'paid' ? 'text-slate-400' : 'text-amber-600'}`}>
                                    {item.payment_status === 'paid' ? 'Paid (चुकती)' : 'Accrued (आठवडी बाकी)'}
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteExpense(item.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                                  title="Delete entry"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ───────────────────────────────────────────────────────────── */}
            {/* SUB-TAB 3: SETTLEMENT RECEIPTS REGISTER (पावती नोंदवही)       */}
            {/* ───────────────────────────────────────────────────────────── */}
            {hamaliSubTab === 'settlement_receipts' && (
              <div className="space-y-4 pt-1">
                {weeklySettlements.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
                    <Receipt className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="font-semibold text-slate-600 dark:text-slate-300">
                      No weekly hamali settlement receipts issued yet.
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Go to "Weekly Ledger" and click "Settle Week's Hamali" once a work week completes.
                    </p>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                          Weekly Hamali Payment Vouchers & Settlement Register (आठवडी हमाली पावती नोंदवही)
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          {weeklySettlements.length} settlement vouchers logged with labor unions and mukadams
                        </p>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <th className="py-3 px-4">Receipt No</th>
                            <th className="py-3 px-4">Settlement Date</th>
                            <th className="py-3 px-4">Week Period</th>
                            <th className="py-3 px-4">Hamal / Gang</th>
                            <th className="py-3 px-4 text-center">Days</th>
                            <th className="py-3 px-4 text-right">Bags</th>
                            <th className="py-3 px-4 text-right">Gross (₹)</th>
                            <th className="py-3 px-4 text-right">Advance (₹)</th>
                            <th className="py-3 px-4 text-right font-black">Net Paid (₹)</th>
                            <th className="py-3 px-4">Mode</th>
                            <th className="py-3 px-4 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {weeklySettlements.map(s => (
                            <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                              <td className="py-3 px-4 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                                {s.receipt_no}
                              </td>
                              <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                                {s.settlement_date}
                              </td>
                              <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                                {s.week_label}
                              </td>
                              <td className="py-3 px-4 font-black text-slate-900 dark:text-white">
                                {s.gang_name}
                              </td>
                              <td className="py-3 px-4 text-center font-bold text-slate-700 dark:text-slate-300">
                                {s.total_days}
                              </td>
                              <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">
                                {s.total_bags.toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300 font-semibold">
                                ₹{s.gross_amount.toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-4 text-right text-rose-600 font-medium">
                                {s.advance_deduction > 0 ? `(-) ₹${s.advance_deduction.toLocaleString('en-IN')}` : '₹0'}
                              </td>
                              <td className="py-3 px-4 text-right font-black num-metric text-emerald-600 dark:text-emerald-400 text-sm">
                                ₹{s.net_paid_amount.toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                                {s.payment_mode}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setViewingHamaliVoucher(s)}
                                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white transition flex items-center gap-1"
                                    title="View & print voucher slip"
                                  >
                                    <Printer className="w-3 h-3 text-slate-500" />
                                    <span>Voucher</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteWeeklySettlement(s.id)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                                    title="Revert settlement"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* VIEW 3: MONTH-WISE EXPENSE MONITOR & AUDIT                       */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'monthly_monitor' && (
          <div className="space-y-5">
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-500" />
                  <span>Month-by-Month Expenditure Comparative Audit</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Compare Hamali, Client Expenses, APMC Mandi Cess, and Yard Overheads across months
                </p>
              </div>

              <div className="text-xs font-bold text-slate-500">
                Auditing {monthlySummaries.length} Recorded Months
              </div>
            </div>

            {/* Monthly Comparison Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {monthlySummaries.map(m => {
                const hamaliPercent = m.totalExpenses > 0 ? Math.round((m.hamaliTotal / m.totalExpenses) * 100) : 0;
                const cessPercent = m.totalExpenses > 0 ? Math.round((m.cessTotal / m.totalExpenses) * 100) : 0;
                const overheadsPercent = Math.max(0, 100 - hamaliPercent - cessPercent);

                return (
                  <div 
                    key={m.monthKey}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-indigo-400 transition"
                  >
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div>
                          <h4 className="text-sm font-black text-slate-900 dark:text-white">
                            {m.monthLabel}
                          </h4>
                          <span className="text-[11px] text-slate-400">{m.count} Expense Vouchers</span>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-black num-metric text-indigo-600 dark:text-indigo-400">
                            ₹{m.totalExpenses.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </span>
                          <span className="block text-[10px] font-bold text-slate-400 uppercase">Total Outlay</span>
                        </div>
                      </div>

                      {/* Visual Stacked Bar */}
                      <div className="my-3.5 space-y-1.5">
                        <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                          <div style={{ width: `${hamaliPercent}%` }} className="bg-emerald-500" title={`Hamali: ${hamaliPercent}%`}></div>
                          <div style={{ width: `${cessPercent}%` }} className="bg-purple-500" title={`Mandi Cess: ${cessPercent}%`}></div>
                          <div style={{ width: `${overheadsPercent}%` }} className="bg-slate-400" title="Overheads"></div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                          <span>🟢 Hamali ({hamaliPercent}%)</span>
                          <span>🟣 Cess ({cessPercent}%)</span>
                          <span>⚪ Overheads ({overheadsPercent}%)</span>
                        </div>
                      </div>

                      {/* Category Breakdown */}
                      <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span>Daily Hamali:</span>
                          </span>
                          <span className="font-bold num-metric text-slate-900 dark:text-white">
                            ₹{m.hamaliTotal.toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                            <span>APMC Mandi Cess:</span>
                          </span>
                          <span className="font-bold num-metric text-slate-900 dark:text-white">
                            ₹{m.cessTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                            <span>Yard Overheads:</span>
                          </span>
                          <span className="font-bold num-metric text-slate-900 dark:text-white">
                            ₹{m.overheadsTotal.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-400">
                        Paid: ₹{m.paidTotal.toLocaleString('en-IN')}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedMonth(m.monthKey);
                          setActiveTab('daily_hamali');
                        }}
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        <span>Inspect Month</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Complete Comparative Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Monthly Financial Summary Ledger
                </h4>
                <span className="text-xs text-slate-400">Values in INR (₹)</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Period Month</th>
                      <th className="py-3 px-4 text-right">Daily Hamali</th>
                      <th className="py-3 px-4 text-right">APMC Mandi Cess</th>
                      <th className="py-3 px-4 text-right">Godown Overheads</th>
                      <th className="py-3 px-4 text-right font-black">Total Monthly Outlay</th>
                      <th className="py-3 px-4 text-right">Paid Settled</th>
                      <th className="py-3 px-4 text-right">Year-End Due</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {monthlySummaries.map(m => (
                      <tr key={m.monthKey} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          {m.monthLabel}
                        </td>
                        <td className="py-3 px-4 text-right num-metric text-emerald-600 dark:text-emerald-400 font-semibold">
                          ₹{m.hamaliTotal.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right num-metric text-purple-600 dark:text-purple-400 font-semibold">
                          ₹{m.cessTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </td>
                        <td className="py-3 px-4 text-right num-metric text-slate-600 dark:text-slate-400 font-semibold">
                          ₹{m.overheadsTotal.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right num-metric font-black text-slate-900 dark:text-white text-sm">
                          ₹{m.totalExpenses.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </td>
                        <td className="py-3 px-4 text-right num-metric text-emerald-600 font-medium">
                          ₹{m.paidTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </td>
                        <td className="py-3 px-4 text-right num-metric text-amber-600 font-medium">
                          ₹{m.accruedTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedMonth(m.monthKey);
                              setActiveTab('daily_hamali');
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                          >
                            Filter Month
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* VIEW 4: APMC MARKET FEES REGISTER (Govt 0.85% / Pvt 0.55%)        */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'market_fees' && (
          <div className="space-y-4">
            
            {/* Header & Quick Action */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent p-4 rounded-2xl border border-emerald-500/20">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    APMC Mandi Cess & Statutory Fees (बाजार समिती फी नोंदवही)
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Statutory market fees on inward auction purchases • Govt APMC (0.85%) & Private APMC (0.55%) • Pay year-on-year or month-by-month
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleOpenSettleModal(cessMonth)}
                  className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Pay / Settle Fees (बाजार फी भरणा)</span>
                </button>
                <button
                  type="button"
                  onClick={exportCessCsv}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center gap-1.5"
                  title="Download APMC Cess CSV report"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
              </div>
            </div>

            {/* KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Total APMC Fees Accrued
                </span>
                <div className="text-xl sm:text-2xl font-black num-metric text-slate-900 dark:text-white mt-1">
                  ₹{totalMarketFeesAccrued.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Govt (0.85%): ₹{apmcGovtFeesAccrued.toLocaleString('en-IN', { maximumFractionDigits: 0 })} • Private APMC (0.55%): ₹{apmcPrivateFeesAccrued.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                  Year-End / Pending Payable Due
                </span>
                <div className="text-xl sm:text-2xl font-black num-metric text-rose-900 dark:text-rose-300 mt-1">
                  ₹{totalMarketFeesDue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Pending settlement with Market Committee
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
                  Settled / Paid Amount
                </span>
                <div className="text-xl sm:text-2xl font-black num-metric text-purple-900 dark:text-purple-300 mt-1">
                  ₹{totalMarketFeesPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {settlements.length} Official payment receipts logged
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Active Settlement Scope
                  </span>
                  <div className="text-xs font-black text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                    {cessFinancialYearLabel} {cessMonth !== 'all' ? `• ${cessMonth}` : '• Year-End (All Months)'}
                  </div>
                </div>
                {totalMarketFeesDue > 0 ? (
                  <button
                    type="button"
                    onClick={() => handleOpenSettleModal(cessMonth)}
                    className="mt-2 w-full py-1.5 px-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Clear Balance (₹{totalMarketFeesDue.toLocaleString('en-IN', { maximumFractionDigits: 0 })})</span>
                  </button>
                ) : (
                  <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span>All Mandi Cess Cleared ✓</span>
                  </div>
                )}
              </div>
            </div>

            {/* Month-Wise Audit Breakdown Accordion / Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <CalendarRange className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                      Month-Wise APMC Cess Summary (महिनानिहाय बाजार फी तपशील)
                    </span>
                    <span className="ml-2 text-[11px] text-slate-500 dark:text-slate-400">
                      {cessFinancialYearLabel}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {cessMonth !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setCessMonth('all')}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      <span>Showing {cessMonth} • Reset to All Months</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowMonthBreakdown(prev => !prev)}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1"
                  >
                    <span>{showMonthBreakdown ? 'Hide Breakdown' : 'Show Breakdown'}</span>
                    {showMonthBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {showMonthBreakdown && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100/60 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-2.5 px-4">Month (महिना)</th>
                        <th className="py-2.5 px-4">Inward Purchases</th>
                        <th className="py-2.5 px-4 text-right">Govt Cess (0.85%)</th>
                        <th className="py-2.5 px-4 text-right">Private APMC (0.55%)</th>
                        <th className="py-2.5 px-4 text-right font-black">Total Cess Accrued</th>
                        <th className="py-2.5 px-4 text-right">Paid Amount</th>
                        <th className="py-2.5 px-4 text-right font-black">Net Due</th>
                        <th className="py-2.5 px-4 text-center">Status</th>
                        <th className="py-2.5 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {apmcMonthBreakdown.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="text-center py-6 text-slate-400 italic">
                            No inward purchase lots recorded for {cessFinancialYearLabel}.
                          </td>
                        </tr>
                      ) : (
                        apmcMonthBreakdown.map(item => {
                          const isSelected = cessMonth === item.monthKey;
                          return (
                            <tr 
                              key={item.monthKey} 
                              className={`transition ${isSelected ? 'bg-emerald-50/50 dark:bg-emerald-950/20 font-semibold' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}
                            >
                              <td className="py-2.5 px-4">
                                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                  <span>{item.monthLabel}</span>
                                  {isSelected && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500 text-white font-black">
                                      ACTIVE
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400">{item.monthKey}</span>
                              </td>
                              <td className="py-2.5 px-4">
                                <div className="font-semibold text-slate-700 dark:text-slate-300">
                                  {item.dealsCount} Lots
                                </div>
                                <div className="text-[10px] text-slate-400 num-metric">
                                  ₹{item.grossTurnover.toLocaleString('en-IN')}
                                </div>
                              </td>
                              <td className="py-2.5 px-4 text-right num-metric text-slate-600 dark:text-slate-400">
                                ₹{item.govtCess.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 px-4 text-right num-metric text-slate-600 dark:text-slate-400">
                                ₹{item.privateCess.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 px-4 text-right num-metric font-black text-slate-900 dark:text-white">
                                ₹{item.totalCess.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 px-4 text-right num-metric font-semibold text-emerald-600 dark:text-emerald-400">
                                ₹{item.totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 px-4 text-right num-metric font-black text-rose-600 dark:text-rose-400">
                                ₹{item.netDue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 px-4 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  item.status === 'paid'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : item.status === 'partial'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                }`}>
                                  {item.status === 'paid' ? 'Fully Paid' : item.status === 'partial' ? 'Partially Paid' : 'Pending Due'}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setCessMonth(item.monthKey)}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                                      isSelected
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                                    }`}
                                  >
                                    {isSelected ? 'Viewing' : 'Filter Lots'}
                                  </button>
                                  {item.netDue > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenSettleModal(item.monthKey)}
                                      className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 transition flex items-center gap-1"
                                      title={`Pay remaining ₹${item.netDue} for ${item.monthLabel}`}
                                    >
                                      <CreditCard className="w-3 h-3" />
                                      <span>Pay Month</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Filter & View Navigation Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
              {/* Left: Filters */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Financial Year Selector */}
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-bold text-slate-500">FY:</span>
                  <select
                    value={cessFinancialYear}
                    onChange={(e) => {
                      setCessFinancialYear(e.target.value);
                      setCessMonth('all');
                    }}
                    className="form-input text-xs py-1.5 font-bold"
                  >
                    {financialPeriods.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Month Selector */}
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-bold text-slate-500">Month:</span>
                  <select
                    value={cessMonth}
                    onChange={(e) => setCessMonth(e.target.value)}
                    className="form-input text-xs py-1.5"
                  >
                    <option value="all">All Months (Year-End Full)</option>
                    {apmcMonthBreakdown.map(m => (
                      <option key={m.monthKey} value={m.monthKey}>
                        {m.monthLabel} ({m.dealsCount} lots)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Market Division */}
                <select
                  value={marketFilter}
                  onChange={(e) => setMarketFilter(e.target.value as any)}
                  className="form-input text-xs py-1.5"
                >
                  <option value="all">All Market Divisions</option>
                  <option value="government">Govt APMC Mandi (0.85%)</option>
                  <option value="private">Private APMC (0.55%)</option>
                </select>

                {/* Settlement Status */}
                <select
                  value={paymentStatusFilter}
                  onChange={(e) => setPaymentStatusFilter(e.target.value as any)}
                  className="form-input text-xs py-1.5"
                >
                  <option value="all">All Settlement Status</option>
                  <option value="unpaid">Pending Due Only</option>
                  <option value="partial">Partially Paid</option>
                  <option value="paid">Fully Settled / Paid</option>
                </select>
              </div>

              {/* Right: Sub-tab switcher */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setApmcSubTab('lots')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    apmcSubTab === 'lots'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Purchase Lots ({filteredFeesPurchases.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setApmcSubTab('receipts')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    apmcSubTab === 'receipts'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Settlement Receipts ({filteredSettlements.length})</span>
                </button>
              </div>
            </div>

            {/* TAB CONTENT 1: PURCHASE LOTS & CESS REGISTER */}
            {apmcSubTab === 'lots' && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Purchase Date</th>
                        <th className="py-3 px-4">Market Division</th>
                        <th className="py-3 px-4">Commodity</th>
                        <th className="py-3 px-4">APMC Seller</th>
                        <th className="py-3 px-4 text-right">Quantity</th>
                        <th className="py-3 px-4 text-right">Gross Value</th>
                        <th className="py-3 px-4 text-right font-black">Mandi Cess</th>
                        <th className="py-3 px-4 text-right">Paid Amount</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-center">Receipt Ref</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredFeesPurchases.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="text-center py-8 text-slate-400 italic">
                            No market fee entries found for the selected filters.
                          </td>
                        </tr>
                      ) : (
                        filteredFeesPurchases.map(p => {
                          const isPvt = p.market_category === 'private';
                          const feeRate = isPvt ? 0.55 : 0.85;
                          const feeAmt = p.market_fee_amount ?? Number((p.total_amount * (feeRate / 100)).toFixed(2));
                          const paidAmt = p.market_fee_paid ? feeAmt : (p.market_fee_paid_amount || 0);
                          const dueAmt = Math.max(0, feeAmt - paidAmt);
                          const isFullyPaid = p.market_fee_paid || dueAmt <= 0.01;
                          const isPartial = !isFullyPaid && paidAmt > 0;

                          return (
                            <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                              <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                {p.purchase_date}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${
                                  isPvt 
                                    ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20' 
                                    : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                                }`}>
                                  {isPvt ? 'Private APMC (0.55%)' : 'Govt APMC (0.85%)'}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                                {getMatName(p.material_id)}
                              </td>
                              <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                                {getPartyName(p.party_id)}
                              </td>
                              <td className="py-3 px-4 text-right num-metric">
                                {p.qty_quintals.toFixed(2)} Qtl
                              </td>
                              <td className="py-3 px-4 text-right num-metric font-semibold">
                                ₹{p.total_amount.toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-4 text-right num-metric font-black text-slate-900 dark:text-white">
                                ₹{feeAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-3 px-4 text-right num-metric font-bold text-emerald-600 dark:text-emerald-400">
                                ₹{paidAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${
                                  isFullyPaid
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                                    : isPartial
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                }`}>
                                  {isFullyPaid ? 'Paid' : isPartial ? 'Partially Paid' : 'Year-End Due'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                {p.market_fee_payment_ref ? (
                                  <span className="font-mono text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                                    {p.market_fee_payment_ref}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleFeePaid(p.id)}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition"
                                >
                                  {isFullyPaid ? 'Mark Due' : 'Mark Paid'}
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: SETTLEMENT RECEIPTS HISTORY */}
            {apmcSubTab === 'receipts' && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                      Official APMC Market Cess Payment Receipts & Challans (बाजार समिती भरणा पावत्या)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenSettleModal(cessMonth)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Settlement Payment</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Payment Date</th>
                        <th className="py-3 px-4">Receipt / Challan No</th>
                        <th className="py-3 px-4">Market Committee</th>
                        <th className="py-3 px-4">Period / Scope</th>
                        <th className="py-3 px-4">Payment Mode</th>
                        <th className="py-3 px-4 text-center">Settlement Type</th>
                        <th className="py-3 px-4 text-right font-black">Amount Paid (₹)</th>
                        <th className="py-3 px-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredSettlements.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-8 text-slate-400 italic">
                            No settlement receipts recorded for this period. Click "+ New Settlement Payment" to record a payment.
                          </td>
                        </tr>
                      ) : (
                        filteredSettlements.map(s => (
                          <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                            <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                              {s.date}
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                {s.receipt_no}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                              {s.paid_to}
                            </td>
                            <td className="py-3 px-4 text-slate-500">
                              <span className="font-medium text-slate-700 dark:text-slate-300">
                                {s.financial_year || 'FY 2026-27'}
                              </span>
                              {s.month && s.month !== 'all' && (
                                <span className="ml-1 text-[10px] text-slate-400">({s.month})</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {s.payment_mode}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                s.settlement_type === 'full'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              }`}>
                                {s.settlement_type === 'full' ? 'Full Clearance (100%)' : 'Partial Instalment'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right num-metric font-black text-slate-900 dark:text-white">
                              ₹{s.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setViewingSettlement(s)}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition flex items-center gap-1"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>Voucher</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSettlement(s.id)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition"
                                  title="Delete Receipt"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* VIEW 5: YARD & OFFICE OVERHEADS                                  */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'operating_expenses' && (
          <div className="space-y-4">
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Yard Maintenance, Storage & Administrative Overheads
                </h4>
                <p className="text-[11px] text-slate-500">
                  Rent, electricity, fumigation, insurance, and recurring godown operational expenses
                </p>
              </div>

              <button
                onClick={() => handleOpenAdd('general')}
                className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm transition active:scale-95 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Record Overhead</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {operatingOverheads.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
                  <p className="font-semibold text-slate-600 dark:text-slate-300">
                    No yard overhead records found for {selectedMonthLabel}.
                  </p>
                  <button
                    onClick={() => handleOpenAdd('general')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 transition shadow-sm active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Store Overhead into {selectedMonthLabel}</span>
                  </button>
                </div>
              ) : (
                operatingOverheads.map(exp => (
                  <div
                    key={exp.id}
                    className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {exp.title}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 uppercase">
                          {exp.category}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                        <span>📅 {exp.expense_date}</span>
                        <span>•</span>
                        <span>Paid To: {exp.paid_to}</span>
                        {exp.yard_id && (
                          <>
                            <span>•</span>
                            <span>Yard: {getYardName(exp.yard_id)}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>Mode: {exp.payment_mode}</span>
                      </div>

                      {exp.notes && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 italic">
                          "{exp.notes}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-800">
                      <div className="text-left sm:text-right">
                        <span className="text-base font-black num-metric text-slate-900 dark:text-white">
                          ₹{exp.amount.toLocaleString('en-IN')}
                        </span>
                        <button
                          onClick={() => handleToggleExpensePaid(exp.id)}
                          className={`block text-[10px] font-bold mt-0.5 ${
                            exp.payment_status === 'paid' ? 'text-emerald-600' : 'text-amber-600'
                          }`}
                        >
                          {exp.payment_status === 'paid' ? '✅ Paid' : '⏳ Payable'}
                        </button>
                      </div>

                      <button
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        )}

      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* MODAL: ADD EXPENSE (CLIENT / HAMALI / GENERAL OVERHEAD)           */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {isAddExpenseOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-hidden">
          <div 
            className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl relative max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex-shrink-0 flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  {addExpenseType === 'hamali' ? <HardHat className="w-5 h-5 text-emerald-600" /> : <Layers className="w-5 h-5 text-slate-700 dark:text-slate-200" />}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {addExpenseType === 'hamali' ? 'Record Daily Hamali (दैनिक हमाली)' : 'Record Yard & Godown Overhead'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Add voucher to financial ledger with automatic month tracking
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsAddExpenseOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddExpenseSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4 text-xs">
                {/* Type Switcher in Modal */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl mb-4 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setAddExpenseType('hamali');
                  setExpCategory('hamali_loading');
                  if (!expTitle || expTitle === 'Godown Maintenance & Overheads') {
                    setExpTitle('Daily Hamali Roster Payment');
                  }
                  if (!expPaidTo) setExpPaidTo(expHamaliGang);
                  const b = parseInt(expHamaliBags, 10) || 300;
                  const r = parseFloat(expHamaliRate) || 7.5;
                  setExpAmount((b * r).toString());
                }}
                className={`py-2 rounded-xl transition ${addExpenseType === 'hamali' ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-sm' : 'text-slate-500'}`}
              >
                👷 Daily Hamali
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddExpenseType('general');
                  if (expCategory === 'hamali_loading') {
                    setExpCategory('storage_maintenance');
                  }
                  if (expTitle === 'Daily Hamali Roster Payment') {
                    setExpTitle('Godown Maintenance & Overheads');
                  }
                }}
                className={`py-2 rounded-xl transition ${addExpenseType === 'general' ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-sm' : 'text-slate-500'}`}
              >
                🏢 Yard & Godown Overhead
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Target Month Storage Indicator Banner */}
            <div className="mb-4 p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-indigo-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold flex-shrink-0">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Month-Wise Ledger Target:
                  </span>
                  <div className="font-extrabold text-amber-800 dark:text-amber-300 text-xs flex items-center gap-1.5">
                    <span>
                      {expDate ? new Date(expDate + 'T00:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : 'Select Date'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      ({expDate ? expDate.slice(0, 7) : ''})
                    </span>
                  </div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-500/30">
                💾 Auto-Filed under {expDate ? expDate.slice(0, 7) : 'this month'}
              </span>
            </div>

            <div className="space-y-4 text-xs">
              
              {/* Date & Storage Yard */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Expense Date (तारीख) *
                  </label>
                  <input
                    type="date"
                    required
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="form-input text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Location / Yard (जागा)
                  </label>
                  <select
                    value={expYardId}
                    onChange={(e) => setExpYardId(e.target.value)}
                    className="form-input text-xs"
                  >
                    {yards.map(y => (
                      <option key={y.id} value={y.id}>{y.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Hamali Details (If Hamali) */}
              {addExpenseType === 'hamali' && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Mathadi Union / Hamal Gang *
                      </label>
                      <input
                        type="text"
                        value={expHamaliGang}
                        onChange={(e) => {
                          setExpHamaliGang(e.target.value);
                          setExpPaidTo(e.target.value);
                        }}
                        placeholder="e.g. Nagpur Mathadi Gang #4"
                        className="form-input text-xs"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Work Type (हमाली प्रकार)
                      </label>
                      <select
                        value={expHamaliWorkType}
                        onChange={(e) => setExpHamaliWorkType(e.target.value as any)}
                        className="form-input text-xs font-bold"
                      >
                        <option value="unloading">📥 Unloading (उतराई हमाली)</option>
                        <option value="loading">📤 Truck Loading (चढाई हमाली)</option>
                        <option value="stacking">📦 Godown Stacking (थप्पी लावणे)</option>
                        <option value="rebagging">🧵 Rebagging / Stitching (शिलाई)</option>
                        <option value="weighment">⚖️ Weighbridge Hamali (काटा तोलाई)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Bags Count (नग / पोती)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={expHamaliBags}
                        onChange={(e) => {
                          setExpHamaliBags(e.target.value);
                          const b = parseInt(e.target.value, 10) || 0;
                          const r = parseFloat(expHamaliRate) || 0;
                          setExpAmount((b * r).toString());
                        }}
                        className="form-input text-xs font-bold num-metric"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Rate per Bag (₹ / नग)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={expHamaliRate}
                        onChange={(e) => {
                          setExpHamaliRate(e.target.value);
                          const b = parseInt(expHamaliBags, 10) || 0;
                          const r = parseFloat(e.target.value) || 0;
                          setExpAmount((b * r).toString());
                        }}
                        className="form-input text-xs font-bold num-metric"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Title & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Expense Title (तपशील) *
                  </label>
                  <input
                    type="text"
                    required
                    value={expTitle}
                    onChange={(e) => setExpTitle(e.target.value)}
                    placeholder="e.g. Loading Hamali for truck MH-20-AA"
                    className="form-input text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Category (प्रवर्ग)
                  </label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value as any)}
                    className="form-input text-xs"
                  >
                    <option value="hamali_loading">👷 Hamali & Loading (हमाली व चढाई)</option>
                    <option value="transport_freight">🚛 Transport & Freight (भाडे/वाहतूक)</option>
                    <option value="weighbridge">⚖️ Weighbridge (काटा तोलाई)</option>
                    <option value="storage_maintenance">🏢 Storage & Maintenance (गोडाऊन देखभाल)</option>
                    <option value="fumigation_testing">🔬 Testing & Fumigation (प्रयोगशाळा व औषधोपचार)</option>
                    <option value="other">📋 Other General Expense</option>
                  </select>
                </div>
              </div>

              {/* Amount & Paid To */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Amount (रक्कम ₹) *
                  </label>
                  <div className="input-group">
                    <span className="input-prefix">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      required
                      value={expAmount}
                      onChange={(e) => setExpAmount(e.target.value)}
                      placeholder="2500"
                      className="text-xs font-black num-metric"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Paid To / Recipient (कोणाला दिले) *
                  </label>
                  <input
                    type="text"
                    required
                    value={expPaidTo}
                    onChange={(e) => setExpPaidTo(e.target.value)}
                    placeholder="e.g. Mathadi Gang / Transporter"
                    className="form-input text-xs"
                  />
                </div>
              </div>

              {/* Mode & Payment Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={expMode}
                    onChange={(e) => setExpMode(e.target.value as any)}
                    className="form-input text-xs"
                  >
                    <option value="Cash">Cash (रोख)</option>
                    <option value="UPI">UPI / PhonePe / GPay</option>
                    <option value="Bank Transfer / NEFT">Bank Transfer / NEFT</option>
                    <option value="Cheque">Cheque (धनादेश)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Payment Status (देयक स्थिती)
                  </label>
                  <select
                    value={expStatus}
                    onChange={(e) => setExpStatus(e.target.value as any)}
                    className="form-input text-xs font-bold"
                  >
                    <option value="accrued_payable">⏳ Accrued / Payable (आठवडी हिशोबासाठी देय बाकी)</option>
                    <option value="paid">✅ Paid / Spot Cash (रोख चुकती)</option>
                  </select>
                  {addExpenseType === 'hamali' && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 font-medium">
                      💡 आठवडा पूर्ण झाल्यावर Weekly Ledger मधून एकत्रित हिशोब व चुकती करा.
                    </p>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Notes / शेरा
                </label>
                <input
                  type="text"
                  value={expNotes}
                  onChange={(e) => setExpNotes(e.target.value)}
                  placeholder="e.g. Bilty slip attached; settled via UPI"
                  className="form-input text-xs"
                />
              </div>

              </div>
              </div>

              {/* Modal Actions Footer (Fixed at bottom) */}
              <div className="flex-shrink-0 p-4 sm:p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-900/95 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddExpenseOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/25 transition active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Save Expense Voucher</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* MODAL: SETTLE / PAY APMC MANDI FEES (FULL OR PARTIAL PAYMENT)      */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {isSettleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-hidden">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xl w-full max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100">
            
            {/* Modal Header */}
            <div className="flex-shrink-0 flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Pay / Settle APMC Mandi Fees (बाजार समिती फी भरणा)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Settle statutory mandi cess with Market Committee • Year-End Full or Partial Payment
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSettleModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scope & Outstanding Due Highlight */}
            {(() => {
              const modalTargetPurchases = cessFyPurchases.filter(p => {
                if (settleMonthScope !== 'all' && !p.purchase_date.startsWith(settleMonthScope)) return false;
                if (settleCategory !== 'all' && (p.market_category || 'government') !== settleCategory) return false;
                return true;
              });

              const modalTotalDue = modalTargetPurchases.reduce((acc, p) => {
                const rate = p.market_category === 'private' ? 0.0055 : 0.0085;
                const lotFee = p.market_fee_amount ?? Number(((p.total_amount || 0) * rate).toFixed(2));
                const paid = p.market_fee_paid ? lotFee : (p.market_fee_paid_amount || 0);
                return acc + Math.max(0, lotFee - paid);
              }, 0);

              const payingAmount = parseFloat(settleAmount) || 0;
              const remainingDue = Math.max(0, modalTotalDue - payingAmount);

              return (
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                  <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
                  {/* Period Context Badge */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                    <div>
                      <span className="text-slate-500 font-medium">Target Period: </span>
                      <span className="font-black text-slate-800 dark:text-slate-200">{cessFinancialYearLabel}</span>
                      {settleMonthScope !== 'all' ? (
                        <span className="ml-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-500/20">
                          Month: {settleMonthScope}
                        </span>
                      ) : (
                        <span className="ml-1 px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-400 font-bold border border-purple-500/20">
                          Year-End (All Months)
                        </span>
                      )}
                    </div>
                    <div className="font-semibold text-slate-600 dark:text-slate-400">
                      {modalTargetPurchases.length} Inward Lots
                    </div>
                  </div>

                  {/* Outstanding Payable Card */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                        Current Outstanding Mandi Due
                      </span>
                      <div className="text-2xl font-black num-metric text-slate-900 dark:text-white mt-0.5">
                        ₹{modalTotalDue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    {settleType === 'full' ? (
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-600 text-white shadow-sm">
                        100% Full Payment
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500 text-slate-950 shadow-sm">
                        Partial Payment (भागशः भरणा)
                      </span>
                    )}
                  </div>

                  {/* Payment Type Toggle (Full vs Partial) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                      Settlement Option (भरणा प्रकार निवडा) *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSettleType('full');
                          setSettleAmount(modalTotalDue > 0 ? Number(modalTotalDue.toFixed(2)).toString() : '0');
                        }}
                        className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                          settleType === 'full'
                            ? 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/30'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Full Payment (पूर्ण भरणा)</span>
                          </span>
                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            Clear 100%
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-snug">
                          Pay total balance of ₹{modalTotalDue.toLocaleString('en-IN', { maximumFractionDigits: 0 })} and mark all lots settled.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSettleType('partial');
                          if (payingAmount === modalTotalDue && modalTotalDue > 0) {
                            setSettleAmount(Math.round(modalTotalDue * 0.5).toString());
                          }
                        }}
                        className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                          settleType === 'partial'
                            ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/30'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Coins className="w-4 h-4 text-amber-600" />
                            <span>Partial Payment (भागशः भरणा)</span>
                          </span>
                          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                            Custom Amount
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-snug">
                          Pay any custom instalment. Auto-allocates to oldest unpaid lots first (FIFO).
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Payment Amount Field */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Payment Amount (भरणा रक्कम - ₹) *
                    </label>
                    <div className="relative">
                      {!settleAmount && (
                        <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-400 pointer-events-none">₹</span>
                      )}
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        required
                        value={settleAmount}
                        onChange={(e) => setSettleAmount(e.target.value)}
                        placeholder="e.g. 20000"
                        className={`form-input text-sm font-black ${!settleAmount ? 'pl-8' : 'pl-3'}`}
                      />
                    </div>

                    {/* Live Balance Summary */}
                    {settleType === 'partial' && (
                      <div className="mt-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-slate-500">Paying Now: </span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 num-metric">
                            ₹{payingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Remaining Balance: </span>
                          <span className="font-black text-rose-600 dark:text-rose-400 num-metric">
                            ₹{remainingDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Market Category & Payment Mode */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Market Division (बाजार प्रकार)
                      </label>
                      <select
                        value={settleCategory}
                        onChange={(e) => setSettleCategory(e.target.value as any)}
                        className="form-input text-xs"
                      >
                        <option value="all">All Divisions (Govt 0.85% + Private APMC 0.55%)</option>
                        <option value="government">Government APMC Only (0.85%)</option>
                        <option value="private">Private APMC Only (0.55%)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Payment Mode (भरणा प्रकार) *
                      </label>
                      <select
                        value={settlePaymentMode}
                        onChange={(e) => setSettlePaymentMode(e.target.value as any)}
                        className="form-input text-xs font-bold"
                      >
                        <option value="RTGS">RTGS (बँक ट्रान्सफर)</option>
                        <option value="Bank Transfer / NEFT">Bank Transfer / NEFT</option>
                        <option value="Cheque">Cheque (धनादेश)</option>
                        <option value="Cash">Cash (रोख)</option>
                        <option value="UPI">UPI / Net Banking</option>
                      </select>
                    </div>
                  </div>

                  {/* Paid To & Presets */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Paid To (बाजार समिती / कार्यालय) *
                    </label>
                    <input
                      type="text"
                      required
                      value={settlePaidTo}
                      onChange={(e) => setSettlePaidTo(e.target.value)}
                      placeholder="e.g. Kalamna APMC Market Committee, Nagpur"
                      className="form-input text-xs"
                    />
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="text-[10px] text-slate-400">Presets:</span>
                      <button
                        type="button"
                        onClick={() => setSettlePaidTo('Kalamna APMC Market Committee, Nagpur')}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                      >
                        Kalamna APMC, Nagpur
                      </button>
                      <button
                        type="button"
                        onClick={() => setSettlePaidTo('Nagpur Private APMC Committee')}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                      >
                        Private APMC Committee
                      </button>
                    </div>
                  </div>

                  {/* Receipt / Challan No & Payment Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        APMC Receipt / Challan No (पावती / चलन क्र.) *
                      </label>
                      <input
                        type="text"
                        required
                        value={settleReceiptNo}
                        onChange={(e) => setSettleReceiptNo(e.target.value)}
                        placeholder="e.g. APMC-REC-2026-891 or CH-1044"
                        className="form-input text-xs font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Payment Date (भरणा तारीख) *
                      </label>
                      <input
                        type="date"
                        required
                        value={settleDate}
                        onChange={(e) => setSettleDate(e.target.value)}
                        className="form-input text-xs"
                      />
                    </div>
                  </div>

                  {/* Remarks */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Notes / Remarks (नोंद)
                    </label>
                    <input
                      type="text"
                      value={settleNotes}
                      onChange={(e) => setSettleNotes(e.target.value)}
                      placeholder="e.g. Fortnightly mandi cess cleared against bank challan"
                      className="form-input text-xs"
                    />
                  </div>

                  {/* Error Alert */}
                  {settleError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{settleError}</span>
                    </div>
                  )}
                  </div>

                  {/* Modal Footer (Fixed at bottom) */}
                  <div className="flex-shrink-0 p-4 sm:p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-900/95 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIsSettleModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-center"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmSettlement}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/25 transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>Confirm Settlement & Clear Lots (भरणा नोंदवा)</span>
                    </button>
                  </div>
                </div>
              );
            })()}

          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* MODAL: OFFICIAL APMC SETTLEMENT RECEIPT / VOUCHER SLIP             */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {viewingSettlement && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-hidden">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100">
            
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  APMC Mandi Cess Settlement Voucher
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingSettlement(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-500 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
            {/* Printable Voucher Paper */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
              
              <div className="text-center pb-3 border-b border-dashed border-slate-300 dark:border-slate-700">
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  SHIVKRUPA TRADING COMPANY
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Agri Produce Traders & Commission Agents • Nagpur APMC Mandi Hub
                </p>
                <span className="inline-block mt-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  STATUTORY APMC CESS PAYMENT RECEIPT
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Challan / Receipt No</span>
                  <span className="font-mono font-black text-emerald-700 dark:text-emerald-400 text-sm">
                    {viewingSettlement.receipt_no}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Payment Date</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {viewingSettlement.date}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Paid To</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {viewingSettlement.paid_to}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Payment Mode</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {viewingSettlement.payment_mode}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Financial Period</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {viewingSettlement.financial_year || 'FY 2026-27'} {viewingSettlement.month && viewingSettlement.month !== 'all' ? `(${viewingSettlement.month})` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Settlement Type</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {viewingSettlement.settlement_type === 'full' ? 'Full Settlement (100%)' : 'Partial Instalment'}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Total Cess Paid</span>
                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 num-metric">
                  ₹{viewingSettlement.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {viewingSettlement.notes && (
                <div className="text-xs text-slate-500 italic">
                  Note: {viewingSettlement.notes}
                </div>
              )}

              <div className="pt-4 border-t border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-between text-[11px] text-slate-400">
                <span>Recorded By: {viewingSettlement.created_by_name}</span>
                <span className="font-bold text-slate-600 dark:text-slate-400">Authorized Signatory ✓</span>
              </div>

            </div>
            </div>

            {/* Actions Footer (Fixed at bottom) */}
            <div className="flex-shrink-0 p-3.5 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-900/95 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setViewingSettlement(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-center"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 shadow-sm transition flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Voucher</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* MODAL: SETTLE WEEK'S HAMALI (आठवडी हमाली चुकती व हिशोब)            */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {isHamaliSettleModalOpen && hamaliSettleTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-hidden">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xl w-full max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100">
            
            {/* Modal Header */}
            <div className="flex-shrink-0 flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Settle Week's Hamali (आठवडी हमाली हिशोब व चुकती)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Aggregate total days & bags for the week, deduct advance, and issue official payout
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsHamaliSettleModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">

            {/* Target Labor Gang & Week Overview */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Labor Gang / Mukadam</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    {hamaliSettleTarget.gangName}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Settlement Week</span>
                  <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    {hamaliSettleTarget.weekLabel}
                  </span>
                </div>
              </div>

              {/* Weekly Work Aggregates */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Total Days Worked</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{hamaliSettleTarget.totalDays} Days</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Total Bags Handled</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{hamaliSettleTarget.totalBags.toLocaleString('en-IN')} Bags</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Gross Hamali Earned</span>
                  <span className="font-black text-slate-900 dark:text-white num-metric">₹{hamaliSettleTarget.grossAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Advance Deduction & Net Payable Calculation */}
            {(() => {
              const advance = parseFloat(hamaliAdvanceDeduction) || 0;
              const netPayable = Math.max(0, hamaliSettleTarget.grossAmount - advance);

              return (
                <div className="space-y-4">
                  
                  {/* Financial Reconciliation Box */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-500/25 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-600 dark:text-slate-400">Gross Hamali for the Week:</span>
                      <span className="font-bold text-slate-900 dark:text-white num-metric">
                        ₹{hamaliSettleTarget.grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-rose-600 dark:text-rose-400 font-medium">Less: Mid-Week Cash Advance (उचल / खर्च वजावट):</span>
                      <span className="font-bold text-rose-600 num-metric">
                        (-) ₹{advance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-emerald-500/20 flex justify-between items-center">
                      <div>
                        <span className="text-xs font-black uppercase text-emerald-800 dark:text-emerald-300 block">
                          Net Amount Payable (निव्वळ अदा रक्कम)
                        </span>
                        <span className="text-[10px] text-slate-500">Payable to mukadam on weekly close</span>
                      </div>
                      <div className="text-2xl font-black num-metric text-emerald-600 dark:text-emerald-400">
                        ₹{netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  {/* Cash Advance Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Cash Advance / Kharcha Deducted (उचल / खर्च वजावट - ₹)
                    </label>
                    <div className="relative">
                      {!hamaliAdvanceDeduction && (
                        <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-400 pointer-events-none">₹</span>
                      )}
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={hamaliAdvanceDeduction}
                        onChange={(e) => setHamaliAdvanceDeduction(e.target.value)}
                        placeholder="e.g. 500 (Enter 0 if no advance was taken)"
                        className={`form-input text-sm font-black ${!hamaliAdvanceDeduction ? 'pl-8' : 'pl-3'}`}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Any small cash advance given to the hamal during the week will be automatically subtracted.
                    </p>
                  </div>

                  {/* Payment Mode & Settlement Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Payment Mode (देयक प्रकार) *
                      </label>
                      <select
                        value={hamaliPaymentMode}
                        onChange={(e) => setHamaliPaymentMode(e.target.value as any)}
                        className="form-input text-xs font-bold"
                      >
                        <option value="Cash">Cash (रोख रक्कम)</option>
                        <option value="UPI">UPI / PhonePe / GPay</option>
                        <option value="Bank Transfer / NEFT">Bank Transfer / NEFT</option>
                        <option value="RTGS">RTGS</option>
                        <option value="Cheque">Cheque (धनादेश)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Settlement Date (चुकती तारीख) *
                      </label>
                      <input
                        type="date"
                        required
                        value={hamaliSettlementDate}
                        onChange={(e) => setHamaliSettlementDate(e.target.value)}
                        className="form-input text-xs"
                      />
                    </div>
                  </div>

                  {/* Paid To & Receipt No */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Paid To (मुकादम / हमाल नाव) *
                      </label>
                      <input
                        type="text"
                        required
                        value={hamaliPaidTo}
                        onChange={(e) => setHamaliPaidTo(e.target.value)}
                        placeholder="e.g. Baburao Mukadam / Hamal Name"
                        className="form-input text-xs font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Settlement Voucher No (पावती क्र.) *
                      </label>
                      <input
                        type="text"
                        required
                        value={hamaliReceiptNo}
                        onChange={(e) => setHamaliReceiptNo(e.target.value)}
                        placeholder="e.g. HAM-WK46-01"
                        className="form-input text-xs font-mono font-bold"
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Notes / Remarks (नोंद)
                    </label>
                    <input
                      type="text"
                      value={hamaliNotes}
                      onChange={(e) => setHamaliNotes(e.target.value)}
                      placeholder="e.g. Full weekly settlement cleared after Sunday mandi close"
                      className="form-input text-xs"
                    />
                  </div>

                  {/* Error Alert */}
                  {hamaliSettleError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{hamaliSettleError}</span>
                    </div>
                  )}

                </div>
              );
            })()}

            </div>

            {/* Modal Footer (Fixed at bottom) */}
            <div className="flex-shrink-0 p-4 sm:p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-900/95 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsHamaliSettleModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmHamaliSettlement}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/25 transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Confirm & Issue Payout (आठवडी चुकती नोंदवा)</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* MODAL: OFFICIAL PRINTABLE WEEKLY HAMALI PAYMENT VOUCHER SLIP       */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {viewingHamaliVoucher && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-hidden">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100">
            
            {/* Modal Header */}
            <div className="flex-shrink-0 flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Weekly Hamali Payment Voucher (आठवडी हमाली हिशोब पावती)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingHamaliVoucher(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-500 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
            {/* Printable Voucher Slip Box */}
            <div className="p-6 rounded-2xl bg-white border border-slate-300 text-slate-900 space-y-4 shadow-xs">
              
              {/* Slip Header */}
              <div className="text-center pb-3 border-b-2 border-slate-900">
                <h2 className="text-lg font-black tracking-tight text-slate-950">
                  SHIVKRUPA TRADING COMPANY (शिवकृपा ट्रेडिंग कंपनी)
                </h2>
                <p className="text-xs text-slate-600">
                  Grain & Oilseeds Merchants • Kalamna APMC Market & Hingna MIDC Godown, Nagpur
                </p>
                <div className="inline-block mt-1.5 px-3 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-[11px] font-black uppercase tracking-wider">
                  WEEKLY HAMALI & MATHADI LABOR PAYMENT VOUCHER
                </div>
              </div>

              {/* Voucher Meta Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Voucher No</span>
                  <span className="font-mono font-black text-emerald-700 text-sm">
                    {viewingHamaliVoucher.receipt_no}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Settlement Date</span>
                  <span className="font-bold text-slate-900">
                    {viewingHamaliVoucher.settlement_date}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Payment Mode</span>
                  <span className="font-bold text-slate-900">
                    {viewingHamaliVoucher.payment_mode}
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Hamal Union / Gang</span>
                  <span className="font-black text-slate-900 text-sm">
                    {viewingHamaliVoucher.gang_name}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Settled Week</span>
                  <span className="font-bold text-slate-900">
                    {viewingHamaliVoucher.week_label}
                  </span>
                </div>
              </div>

              {/* Itemized Day-by-Day Lots Statement Table */}
              {voucherItems.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                    Itemized Daily Work Statement:
                  </span>
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase">
                          <th className="py-1.5 px-2.5">Date</th>
                          <th className="py-1.5 px-2.5">Operation</th>
                          <th className="py-1.5 px-2.5">Vehicle / Lot</th>
                          <th className="py-1.5 px-2.5 text-right">Bags</th>
                          <th className="py-1.5 px-2.5 text-right">Rate</th>
                          <th className="py-1.5 px-2.5 text-right font-bold">Total (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {voucherItems.map(item => (
                          <tr key={item.id}>
                            <td className="py-1 px-2.5 font-medium">{item.expense_date}</td>
                            <td className="py-1 px-2.5 capitalize">{item.hamali_details?.work_type || 'Hamali'}</td>
                            <td className="py-1 px-2.5 font-mono text-[11px] text-slate-600">{item.hamali_details?.vehicle_no || item.title}</td>
                            <td className="py-1 px-2.5 text-right font-bold">{item.hamali_details?.bag_count || '—'}</td>
                            <td className="py-1 px-2.5 text-right">₹{item.hamali_details?.rate_per_bag?.toFixed(2) || '7.50'}</td>
                            <td className="py-1 px-2.5 text-right font-black num-metric">₹{item.amount.toLocaleString('en-IN')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Financial Calculation Box */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Total Work Days & Bags:</span>
                  <span className="font-bold text-slate-900">
                    {viewingHamaliVoucher.total_days} Working Days • {viewingHamaliVoucher.total_bags.toLocaleString('en-IN')} Bags Handled
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Gross Hamali Earned (एकूण हमाली):</span>
                  <span className="font-bold text-slate-900 num-metric">
                    ₹{viewingHamaliVoucher.gross_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {viewingHamaliVoucher.advance_deduction > 0 && (
                  <div className="flex justify-between items-center text-rose-600">
                    <span>Less: Cash Advance Deducted (उचल / खर्च वजावट):</span>
                    <span className="font-bold num-metric">
                      (-) ₹{viewingHamaliVoucher.advance_deduction.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                <div className="pt-2 border-t-2 border-slate-900 flex justify-between items-center text-sm">
                  <span className="font-black text-slate-950 uppercase tracking-tight">
                    NET AMOUNT PAID (निव्वळ अदा केलेली रक्कम):
                  </span>
                  <span className="text-lg font-black text-emerald-700 num-metric">
                    ₹{viewingHamaliVoucher.net_paid_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {viewingHamaliVoucher.notes && (
                <p className="text-[11px] text-slate-500 italic">
                  Note: "{viewingHamaliVoucher.notes}"
                </p>
              )}

              {/* Dual Signature Section */}
              <div className="pt-8 grid grid-cols-2 gap-8 text-xs border-t border-slate-300">
                <div className="text-center space-y-1">
                  <div className="border-b border-dashed border-slate-400 w-44 mx-auto pb-6" />
                  <span className="font-bold block text-slate-900">
                    Hamal / Mukadam Signature
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    (हमाल / मुकादम स्वाक्षरी: {viewingHamaliVoucher.paid_to})
                  </span>
                </div>

                <div className="text-center space-y-1">
                  <div className="border-b border-dashed border-slate-400 w-44 mx-auto pb-6" />
                  <span className="font-bold block text-slate-900">
                    For Shivkrupa Trading Co.
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    (Authorized Signatory • {viewingHamaliVoucher.settled_by_name})
                  </span>
                </div>
              </div>

            </div>
            </div>

            {/* Modal Actions Footer (Fixed at bottom) */}
            <div className="flex-shrink-0 p-3.5 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-900/95 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setViewingHamaliVoucher(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-center"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Voucher Slip (पावती छापा)</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
