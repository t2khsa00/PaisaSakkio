import type { PersonalBudget, PersonalTransaction } from "./types";
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

/** Last `count` months including the current one, oldest first. */
export function monthlyTrend(transactions: PersonalTransaction[], count = 6): { key: string; label: string; expense: number; income: number }[] {
  const now = new Date();
  const months: { key: string; label: string; expense: number; income: number }[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const totals = totalsForMonth(transactions, key);
    months.push({ key, label: monthShortLabel(key), expense: totals.expense, income: totals.income });
  }
  return months;
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
