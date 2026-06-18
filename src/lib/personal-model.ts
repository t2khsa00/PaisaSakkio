import type { PersonalBill, PersonalBudget, PersonalTransaction } from "./types";
import { roundMoney } from "./group-model";

export type CategoryMeta = { name: string; color: string };

export const EXPENSE_CATEGORIES: CategoryMeta[] = [
  { name: "Food & Drink", color: "#c2410c" },
  { name: "Groceries", color: "#15803d" },
  { name: "Rent", color: "#2563eb" },
  { name: "Transport", color: "#0f766e" },
  { name: "Bills", color: "#6d28d9" },
  { name: "Shopping", color: "#db2777" },
  { name: "Health", color: "#0891b2" },
  { name: "Entertainment", color: "#ca8a04" },
  { name: "Travel", color: "#4f46e5" },
  { name: "Other", color: "#78716c" },
];

export const INCOME_CATEGORIES: CategoryMeta[] = [
  { name: "Salary", color: "#15803d" },
  { name: "Freelance", color: "#0f766e" },
  { name: "Gift", color: "#6d28d9" },
  { name: "Other", color: "#78716c" },
];

export function categoryColor(name: string): string {
  return (
    EXPENSE_CATEGORIES.find((category) => category.name === name)?.color ??
    INCOME_CATEGORIES.find((category) => category.name === name)?.color ??
    "#78716c"
  );
}

/** "2026-06-17" -> "2026-06" */
export function monthKey(dateIso: string): string {
  return dateIso.slice(0, 7);
}

export function monthShortLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  if (!year || !month) return key;
  return new Date(year, month - 1, 1).toLocaleDateString("en", { month: "short" });
}

export function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

export type MonthTotals = { income: number; expense: number; net: number };

export function totalsForMonth(transactions: PersonalTransaction[], key: string): MonthTotals {
  let income = 0;
  let expense = 0;
  for (const tx of transactions) {
    if (monthKey(tx.date) !== key) continue;
    if (tx.type === "income") income += tx.amount;
    else expense += tx.amount;
  }
  return { income: roundMoney(income), expense: roundMoney(expense), net: roundMoney(income - expense) };
}

export type CategorySlice = { category: string; amount: number; color: string; pct: number };

export function categoryBreakdown(transactions: PersonalTransaction[], key: string): CategorySlice[] {
  const totals = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.type !== "expense" || monthKey(tx.date) !== key) continue;
    totals.set(tx.category, (totals.get(tx.category) ?? 0) + tx.amount);
  }
  const grand = Array.from(totals.values()).reduce((sum, value) => sum + value, 0);
  return Array.from(totals.entries())
    .map(([category, amount]) => ({
      category,
      amount: roundMoney(amount),
      color: categoryColor(category),
      pct: grand > 0 ? amount / grand : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export type TrendPoint = { key: string; label: string; expense: number; income: number };

/** Last `count` months including the current one, oldest first. */
export function monthlyTrend(transactions: PersonalTransaction[], count = 6): TrendPoint[] {
  const now = new Date();
  const months: TrendPoint[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const totals = totalsForMonth(transactions, key);
    months.push({ key, label: monthShortLabel(key), expense: totals.expense, income: totals.income });
  }
  return months;
}

function isoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Totals for an inclusive [startISO, endISO] date range (dates are "YYYY-MM-DD"). */
export function totalsForRange(transactions: PersonalTransaction[], startISO: string, endISO: string): MonthTotals {
  let income = 0;
  let expense = 0;
  for (const tx of transactions) {
    if (tx.date < startISO || tx.date > endISO) continue;
    if (tx.type === "income") income += tx.amount;
    else expense += tx.amount;
  }
  return { income: roundMoney(income), expense: roundMoney(expense), net: roundMoney(income - expense) };
}

/** The last `count` days ending today, as an inclusive ISO range. */
export function lastDaysRange(count = 7): { startISO: string; endISO: string } {
  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = new Date(end);
  start.setDate(start.getDate() - (count - 1));
  return { startISO: isoDate(start), endISO: isoDate(end) };
}

/** Last `count` days including today, oldest first — one point per day. */
export function dailyTrend(transactions: PersonalTransaction[], count = 7): TrendPoint[] {
  const today = new Date();
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const days: TrendPoint[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date(base);
    date.setDate(date.getDate() - i);
    const iso = isoDate(date);
    const totals = totalsForRange(transactions, iso, iso);
    days.push({
      key: iso,
      label: date.toLocaleDateString("en", { weekday: "short" }),
      expense: totals.expense,
      income: totals.income,
    });
  }
  return days;
}

export type BudgetStatus = { category: string; spent: number; limit: number; color: string; over: boolean; pct: number };

export function budgetStatuses(
  transactions: PersonalTransaction[],
  budgets: PersonalBudget[],
  key: string,
): BudgetStatus[] {
  const spentByCategory = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.type !== "expense" || monthKey(tx.date) !== key) continue;
    spentByCategory.set(tx.category, (spentByCategory.get(tx.category) ?? 0) + tx.amount);
  }
  return budgets
    .map((budget) => {
      const spent = roundMoney(spentByCategory.get(budget.category) ?? 0);
      return {
        category: budget.category,
        spent,
        limit: budget.amount,
        color: categoryColor(budget.category),
        over: budget.amount > 0 && spent > budget.amount + 0.001,
        pct: budget.amount > 0 ? Math.min(spent / budget.amount, 1) : 0,
      };
    })
    .sort((a, b) => b.spent / (b.limit || 1) - a.spent / (a.limit || 1));
}

/** "2026-06" -> "2026-05" */
export function prevMonthKey(key: string): string {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(year, month - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Amount saved this month (never negative) and the rate as a 0..1 fraction of income. */
export function savingsRate(totals: MonthTotals): { saved: number; rate: number } {
  const saved = Math.max(0, totals.net);
  const rate = totals.income > 0 ? Math.min(saved / totals.income, 1) : 0;
  return { saved: roundMoney(saved), rate };
}

/** Net change versus the previous month, with that month's label. */
export function netVsPreviousMonth(
  transactions: PersonalTransaction[],
  key: string,
): { delta: number; prevLabel: string } {
  const prev = prevMonthKey(key);
  const delta = roundMoney(totalsForMonth(transactions, key).net - totalsForMonth(transactions, prev).net);
  return { delta, prevLabel: monthShortLabel(prev) };
}

export type UpcomingBill = { bill: PersonalBill; dueOn: Date; daysUntil: number };

/** The next bill due on/after `from`, by recurring monthly due-day. */
export function nextUpcomingBill(bills: PersonalBill[], from: Date = new Date()): UpcomingBill | null {
  if (bills.length === 0) return null;
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const MS_PER_DAY = 86_400_000;

  const upcoming = bills.map((bill) => {
    // Clamp the due day to the length of the candidate month.
    const dueThisMonth = clampDay(today.getFullYear(), today.getMonth(), bill.dueDay);
    const dueOn =
      dueThisMonth.getTime() >= today.getTime()
        ? dueThisMonth
        : clampDay(today.getFullYear(), today.getMonth() + 1, bill.dueDay);
    const daysUntil = Math.round((dueOn.getTime() - today.getTime()) / MS_PER_DAY);
    return { bill, dueOn, daysUntil };
  });

  upcoming.sort((a, b) => a.dueOn.getTime() - b.dueOn.getTime());
  return upcoming[0];
}

function clampDay(year: number, month: number, day: number): Date {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastDay));
}

/** Build an SVG area + line path for a sparkline across `values` within the given box. */
export function sparkline(
  values: number[],
  width: number,
  height: number,
  pad = 4,
): { line: string; area: string } {
  if (values.length === 0) return { line: "", area: "" };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const step = values.length > 1 ? innerW / (values.length - 1) : 0;

  const points = values.map((value, index) => {
    const x = pad + step * index;
    const y = pad + innerH - ((value - min) / span) * innerH;
    return [x, y] as const;
  });

  const line = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${(pad + innerW).toFixed(1)} ${(height - pad).toFixed(1)} L${pad.toFixed(1)} ${(height - pad).toFixed(1)} Z`;
  return { line, area };
}
