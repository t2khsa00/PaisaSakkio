"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Briefcase,
  CalendarDays,
  Car,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Gift,
  HeartPulse,
  Home,
  Paperclip,
  PiggyBank,
  Plane,
  Plus,
  Receipt,
  ReceiptText,
  ShoppingBag,
  ShoppingCart,
  Target,
  TrendingDown,
  TrendingUp,
  Trash2,
  Utensils,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import type { PersonalBill, PersonalBudget, PersonalGoal, PersonalTransaction } from "@/lib/types";
import {
  addPersonalBill,
  addPersonalTransaction,
  deletePersonalBill,
  deletePersonalBudget,
  deletePersonalTransaction,
  getPersonal,
  setPersonalBudget,
  setPersonalGoal,
  updatePersonalTransaction,
  uploadPersonalReceipt,
  type PersonalTransactionPayload,
} from "@/lib/api-client";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  type BudgetStatus,
  budgetStatuses,
  categoryBreakdown,
  categoryColor,
  currentMonthKey,
  dailyTrend,
  lastDaysRange,
  monthKey,
  monthlyTrend,
  nextUpcomingBill,
  netVsPreviousMonth,
  savingsRate,
  totalsForMonth,
  totalsForRange,
} from "@/lib/personal-model";

const RECENT_LIMIT = 6;
const BUDGET_LIMIT = 3;

function fmt(value: number) {
  return value.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function shiftMonth(key: string, delta: number) {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en", { month: "long", year: "numeric" });
}

function tint(color: string) {
  return `${color}1f`;
}

const CURRENCY_SYMBOL: Record<string, string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
  JPY: "¥",
  INR: "₹",
  CHF: "₣",
  AUD: "$",
  CAD: "$",
};

/** "€1,200.00" when the currency has a known symbol, else "1,200.00 EUR". */
function money(amount: number, currency: string) {
  const symbol = CURRENCY_SYMBOL[currency];
  const value = fmt(amount);
  return symbol ? `${symbol}${value}` : `${value} ${currency}`;
}

const CATEGORY_ICON: Record<string, LucideIcon> = {
  "Food & Drink": Utensils,
  Groceries: ShoppingCart,
  Rent: Home,
  Transport: Car,
  Bills: Receipt,
  Shopping: ShoppingBag,
  Health: HeartPulse,
  Entertainment: Clapperboard,
  Travel: Plane,
  Salary: Banknote,
  Freelance: Briefcase,
  Gift: Gift,
};

function categoryIcon(category: string): LucideIcon {
  return CATEGORY_ICON[category] ?? Wallet;
}

function txDate(iso: string) {
  const date = new Date(`${iso}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" });
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  ariaLabel: string;
}) {
  return (
    <div className="segmented" role="tablist" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          className={`segmented-btn ${value === option.value ? "active" : ""}`}
          onClick={() => onChange(option.value)}
          type="button"
          role="tab"
          aria-selected={value === option.value}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function BudgetProgressList({ items, currency }: { items: BudgetStatus[]; currency: string }) {
  return (
    <div className="budget-list">
      {items.map((status) => {
        const Icon = categoryIcon(status.category);
        const pct = Math.round(status.pct * 100);
        return (
          <div className="budget-row" key={status.category}>
            <div className="budget-top">
              <span className="budget-name">
                <span className="budget-icon" style={{ background: status.color }}>
                  <Icon size={15} />
                </span>
                <strong>{status.category}</strong>
              </span>
              <span className={status.over ? "budget-over" : "budget-amts muted"}>
                {money(status.spent, currency)} / {money(status.limit, currency)}
              </span>
            </div>
            <div className="budget-bottom">
              <span className="budget-bar-track">
                <span
                  className="budget-bar"
                  style={{ width: `${pct}%`, background: status.over ? "var(--danger)" : status.color }}
                />
              </span>
              <span className={`budget-pct ${status.over ? "over" : ""}`}>{pct}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TransactionList({
  items,
  onPick,
}: {
  items: PersonalTransaction[];
  onPick: (tx: PersonalTransaction) => void;
}) {
  return (
    <div className="expense-list" style={{ marginTop: 0 }}>
      {items.map((tx) => {
        const color = categoryColor(tx.category);
        const Icon = categoryIcon(tx.category);
        return (
          <button className="expense-row" key={tx.id} onClick={() => onPick(tx)} type="button">
            <span className="expense-row-thumb" style={{ background: tint(color), color }}>
              {tx.receipt && tx.receiptType?.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={tx.receipt} alt="" />
              ) : (
                <Icon size={18} />
              )}
            </span>
            <span className="expense-row-text">
              <strong>{tx.title}</strong>
              <span className="muted">{tx.category}</span>
              <span className="muted expense-row-date">{txDate(tx.date)}</span>
            </span>
            <span className="expense-row-amt">
              <strong style={{ color: tx.type === "income" ? "var(--green)" : "var(--ink)" }}>
                {tx.type === "income" ? "+" : "−"}
                {money(tx.amount, tx.currency)}
              </strong>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function dueLabel(daysUntil: number) {
  if (daysUntil <= 0) return "Due today";
  if (daysUntil === 1) return "Due tomorrow";
  return `Due in ${daysUntil} days`;
}

function longDate(date: Date) {
  return date.toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" });
}

function ProgressRing({
  pct,
  size = 116,
  stroke = 11,
  color = "var(--teal)",
  children,
}: {
  pct: number;
  size?: number;
  stroke?: number;
  color?: string;
  children: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.max(0, Math.min(1, pct)));
  const center = size / 2;
  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle className="ring-track" cx={center} cy={center} r={r} fill="none" strokeWidth={stroke} />
        <circle
          className="ring-fill"
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  );
}

function Donut({
  slices,
  size = 168,
  stroke = 24,
  children,
}: {
  slices: { category: string; color: string; pct: number }[];
  size?: number;
  stroke?: number;
  children: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const center = size / 2;
  let acc = 0;
  return (
    <div className="donut-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle className="ring-track" cx={center} cy={center} r={r} fill="none" strokeWidth={stroke} />
        {slices.map((slice) => {
          const len = slice.pct * circ;
          const seg = (
            <circle
              key={slice.category}
              cx={center}
              cy={center}
              r={r}
              fill="none"
              stroke={slice.color}
              strokeWidth={stroke}
              strokeDasharray={`${len} ${circ - len}`}
              strokeDashoffset={-acc}
              transform={`rotate(-90 ${center} ${center})`}
            />
          );
          acc += len;
          return seg;
        })}
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  );
}

export function PersonalClient() {
  const [transactions, setTransactions] = useState<PersonalTransaction[]>([]);
  const [budgets, setBudgets] = useState<PersonalBudget[]>([]);
  const [goal, setGoal] = useState<PersonalGoal | null>(null);
  const [bills, setBills] = useState<PersonalBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState(currentMonthKey());
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<PersonalTransaction | null>(null);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [billsOpen, setBillsOpen] = useState(false);
  const [allTxOpen, setAllTxOpen] = useState(false);
  const [allBudgetsOpen, setAllBudgetsOpen] = useState(false);
  const [trendView, setTrendView] = useState<"monthly" | "weekly">("monthly");
  const [flowPeriod, setFlowPeriod] = useState<"week" | "month">("month");

  const load = useCallback(async () => {
    try {
      const data = await getPersonal();
      setTransactions(data.transactions);
      setBudgets(data.budgets);
      setGoal(data.goal);
      setBills(data.bills);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load your data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const currency = goal?.currency ?? transactions[0]?.currency ?? "EUR";
  const totals = useMemo(() => totalsForMonth(transactions, month), [transactions, month]);
  const breakdown = useMemo(() => categoryBreakdown(transactions, month), [transactions, month]);
  const budgetView = useMemo(() => budgetStatuses(transactions, budgets, month), [transactions, budgets, month]);
  const monthTransactions = useMemo(
    () => transactions.filter((tx) => monthKey(tx.date) === month),
    [transactions, month],
  );
  const isCurrent = month === currentMonthKey();

  const trendData = useMemo(
    () => (trendView === "weekly" ? dailyTrend(transactions, 7) : monthlyTrend(transactions, 6)),
    [transactions, trendView],
  );
  const maxTrend = Math.max(1, ...trendData.map((entry) => entry.expense));

  const week = useMemo(() => lastDaysRange(7), []);
  const flowTotals = useMemo(
    () => (flowPeriod === "week" ? totalsForRange(transactions, week.startISO, week.endISO) : totals),
    [flowPeriod, transactions, week, totals],
  );

  const saving = useMemo(() => savingsRate(totals), [totals]);
  const vsPrev = useMemo(() => netVsPreviousMonth(transactions, month), [transactions, month]);
  const upcoming = useMemo(() => nextUpcomingBill(bills), [bills]);
  const goalPct = goal && goal.amount > 0 ? Math.min(saving.saved / goal.amount, 1) : 0;

  if (loading) {
    return (
      <div className="panel panel-pad">
        <p className="eyebrow">Loading</p>
        <h1>Your money</h1>
        <p className="lead">Pulling your transactions.</p>
      </div>
    );
  }

  return (
    <div className="personal-page">
      {/* ── Top band: net hero + three stat cards ───────────── */}
      <div className="personal-top">
        <section className="balance-card personal-hero">
          <div className="personal-month-nav">
            <button onClick={() => setMonth((key) => shiftMonth(key, -1))} type="button" aria-label="Previous month">
              <ChevronLeft size={18} />
            </button>
            <span>{monthLabel(month)}</span>
            <button
              onClick={() => setMonth((key) => shiftMonth(key, 1))}
              type="button"
              aria-label="Next month"
              disabled={isCurrent}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <p className="balance-eyebrow">Net balance</p>
          <p className="balance-amount">
            {totals.net < 0 ? "−" : "+"}
            {money(Math.abs(totals.net), currency)}
          </p>

          {Math.abs(vsPrev.delta) > 0.001 && (
            <span className={`hero-delta ${vsPrev.delta >= 0 ? "up" : "down"}`}>
              vs {vsPrev.prevLabel}: {vsPrev.delta >= 0 ? "+" : "−"}
              {money(Math.abs(vsPrev.delta), currency)}
              {vsPrev.delta >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            </span>
          )}

          <div className="hero-tiles">
            <div className="hero-tile">
              <span className="hero-tile-icon">
                <TrendingUp size={15} />
              </span>
              <span className="hero-tile-text">
                <small>Income</small>
                <strong>{money(totals.income, currency)}</strong>
              </span>
            </div>
            <div className="hero-tile">
              <span className="hero-tile-icon">
                <TrendingDown size={15} />
              </span>
              <span className="hero-tile-text">
                <small>Expenses</small>
                <strong>{money(totals.expense, currency)}</strong>
              </span>
            </div>
          </div>
        </section>

        {/* Savings rate */}
        <section className="panel stat-card stat-card--ring">
          <h3 className="stat-title">Savings rate</h3>
          <ProgressRing pct={saving.rate}>
            <span className="ring-value">{Math.round(saving.rate * 100)}%</span>
          </ProgressRing>
          <p className="stat-foot stat-foot--center muted">
            You saved {money(saving.saved, currency)} of your income.
          </p>
        </section>

        {/* Monthly goal */}
        <button className="panel stat-card stat-card--button" onClick={() => setGoalOpen(true)} type="button">
          <h3 className="stat-title">
            <span>Monthly goal</span>
            <Target size={15} className="stat-title-icon" />
          </h3>
          {goal ? (
            <>
              <span className="stat-icon teal">
                <PiggyBank size={20} />
              </span>
              <p className="stat-big">{money(goal.amount, currency)}</p>
              <span className="stat-bar-track">
                <span className="stat-bar" style={{ width: `${Math.round(goalPct * 100)}%` }} />
              </span>
              <p className="stat-foot">
                <span className="muted">{money(saving.saved, currency)} saved</span>
                <strong>{Math.round(goalPct * 100)}%</strong>
              </p>
            </>
          ) : (
            <div className="stat-empty">
              <PiggyBank size={22} />
              <span>Set a monthly savings goal</span>
            </div>
          )}
        </button>

        {/* Upcoming bill */}
        <button className="panel stat-card stat-card--button" onClick={() => setBillsOpen(true)} type="button">
          <h3 className="stat-title">
            <span>Upcoming bill</span>
            <CalendarDays size={15} className="stat-title-icon" />
          </h3>
          {upcoming ? (
            <>
              <span
                className="stat-icon"
                style={{ background: tint(categoryColor(upcoming.bill.category)), color: categoryColor(upcoming.bill.category) }}
              >
                <CalendarDays size={20} />
              </span>
              <p className="stat-label">{upcoming.bill.name}</p>
              <p className="stat-big">{money(upcoming.bill.amount, upcoming.bill.currency)}</p>
              <p className="stat-foot">
                <strong className={upcoming.daysUntil <= 3 ? "due-soon" : undefined}>{dueLabel(upcoming.daysUntil)}</strong>
                <span className="muted">{longDate(upcoming.dueOn)}</span>
              </p>
            </>
          ) : (
            <div className="stat-empty">
              <CalendarDays size={22} />
              <span>Track your recurring bills</span>
            </div>
          )}
        </button>
      </div>

      {error && <p className="notice error">{error}</p>}

      {/* Add (mobile only — desktop uses the Transactions header button) */}
      <button className="button teal personal-add" onClick={() => setAddOpen(true)} type="button">
        <Plus size={18} /> Add transaction
      </button>

      {/* ── Main grid: rows align across columns ─────────────────── */}
      <div className="personal-main">
          <section className="panel panel-pad pm-trend">
            <div className="mobile-section-head" style={{ marginBottom: 14 }}>
              <h3 className="mobile-section-title">Spending trend</h3>
              <Segmented
                value={trendView}
                onChange={setTrendView}
                ariaLabel="Spending trend period"
                options={[
                  { value: "weekly", label: "Weekly" },
                  { value: "monthly", label: "Monthly" },
                ]}
              />
            </div>
            <div className="trend-chart">
              {trendData.map((entry) => {
                const entryMonth = monthKey(entry.key);
                return (
                  <button
                    key={entry.key}
                    className={`trend-col ${entryMonth === month ? "active" : ""}`}
                    onClick={() => setMonth(entryMonth)}
                    type="button"
                    title={`${entry.label}: spent ${money(entry.expense, currency)}`}
                  >
                    <span className="trend-bar-track">
                      <span
                        className="trend-bar"
                        style={{ height: `${Math.round((entry.expense / maxTrend) * 100)}%` }}
                      />
                    </span>
                    <span className="trend-label">{entry.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="panel panel-pad pm-category">
            <div className="mobile-section-head" style={{ marginBottom: 14 }}>
              <h3 className="mobile-section-title">Spending by category</h3>
            </div>
            {breakdown.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>No spending recorded this month.</p>
            ) : (
              <div className="donut-layout">
                <Donut slices={breakdown} size={122} stroke={18}>
                  <span className="donut-total-val">{money(totals.expense, currency)}</span>
                  <span className="donut-total-label">Total</span>
                </Donut>
                <div className="donut-legend">
                  {breakdown.map((slice) => (
                    <div className="legend-row" key={slice.category}>
                      <span className="cat-dot" style={{ background: slice.color }} />
                      <span className="legend-name">{slice.category}</span>
                      <span className="legend-amt">{money(slice.amount, currency)}</span>
                      <span className="legend-pct muted">{Math.round(slice.pct * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="panel panel-pad pm-budgets">
            <div className="mobile-section-head" style={{ marginBottom: 14 }}>
              <h3 className="mobile-section-title">Budgets</h3>
              {budgetView.length > BUDGET_LIMIT && (
                <button className="card-link" onClick={() => setAllBudgetsOpen(true)} type="button">
                  View all
                </button>
              )}
            </div>
            {budgetView.length === 0 ? (
              <div className="mobile-empty" style={{ padding: "28px 20px" }}>
                <Target size={26} color="var(--muted)" />
                <p>Set a monthly limit per category and we&apos;ll warn you when you go over.</p>
              </div>
            ) : (
              <BudgetProgressList items={budgetView.slice(0, BUDGET_LIMIT)} currency={currency} />
            )}
            <button className="button card-foot-btn" onClick={() => setBudgetOpen(true)} type="button">
              <Target size={15} /> Set budget
            </button>
          </section>

          <section className="panel panel-pad pm-cashflow">
            <div className="mobile-section-head" style={{ marginBottom: 14 }}>
              <h3 className="mobile-section-title">Cash flow</h3>
              <Segmented
                value={flowPeriod}
                onChange={setFlowPeriod}
                ariaLabel="Cash flow period"
                options={[
                  { value: "week", label: "Weekly" },
                  { value: "month", label: "Monthly" },
                ]}
              />
            </div>
            <p className="cashflow-period muted">{flowPeriod === "week" ? "Last 7 days" : monthLabel(month)}</p>
            <div className="cashflow-list">
              <div className="cashflow-row">
                <span>Income</span>
                <strong className="cf-pos">+{money(flowTotals.income, currency)}</strong>
              </div>
              <div className="cashflow-row">
                <span>Expenses</span>
                <strong className="cf-neg">−{money(flowTotals.expense, currency)}</strong>
              </div>
              <div className="cashflow-row cashflow-net">
                <span>Net cash flow</span>
                <strong style={{ color: flowTotals.net >= 0 ? "var(--green)" : "var(--danger)" }}>
                  {flowTotals.net < 0 ? "−" : "+"}
                  {money(Math.abs(flowTotals.net), currency)}
                </strong>
              </div>
            </div>
            <div className="cashflow-hint">
              <TrendingUp size={16} />
              <span>Track your cash flow to reach your goals faster.</span>
            </div>
          </section>

          <section className="panel panel-pad pm-recent">
            <div className="mobile-section-head" style={{ marginBottom: 14 }}>
              <h3 className="mobile-section-title">Recent transactions</h3>
              <button className="button teal" onClick={() => setAddOpen(true)} type="button" style={{ minHeight: 38, padding: "0 14px" }}>
                <Plus size={16} /> Add
              </button>
            </div>
            {monthTransactions.length === 0 ? (
              <div className="expense-empty" style={{ marginTop: 0 }}>
                <strong>Nothing logged this month</strong>
                <span className="muted">Tap “Add” to record an expense or income.</span>
              </div>
            ) : (
              <>
                <TransactionList items={monthTransactions.slice(0, RECENT_LIMIT)} onPick={setEditing} />
                {monthTransactions.length > RECENT_LIMIT && (
                  <button className="button card-foot-btn" onClick={() => setAllTxOpen(true)} type="button">
                    View all transactions
                  </button>
                )}
              </>
            )}
          </section>
      </div>

      {(addOpen || editing) && (
        <TransactionDialog
          transaction={editing}
          currency={currency}
          onClose={() => {
            setAddOpen(false);
            setEditing(null);
          }}
          onSaved={async () => {
            setAddOpen(false);
            setEditing(null);
            await load();
          }}
          onDeleted={async () => {
            setEditing(null);
            await load();
          }}
        />
      )}

      {budgetOpen && (
        <BudgetDialog
          budgets={budgets}
          currency={currency}
          onClose={() => setBudgetOpen(false)}
          onChanged={load}
        />
      )}

      {goalOpen && (
        <GoalDialog
          goal={goal}
          currency={currency}
          onClose={() => setGoalOpen(false)}
          onChanged={async () => {
            setGoalOpen(false);
            await load();
          }}
        />
      )}

      {billsOpen && (
        <BillsDialog
          bills={bills}
          currency={currency}
          onClose={() => setBillsOpen(false)}
          onChanged={load}
        />
      )}

      {allTxOpen && (
        <AllTransactionsDialog
          transactions={monthTransactions}
          monthName={monthLabel(month)}
          onClose={() => setAllTxOpen(false)}
          onPick={(tx) => {
            setAllTxOpen(false);
            setEditing(tx);
          }}
        />
      )}

      {allBudgetsOpen && (
        <AllBudgetsDialog
          items={budgetView}
          currency={currency}
          onClose={() => setAllBudgetsOpen(false)}
        />
      )}
    </div>
  );
}

function AllTransactionsDialog({
  transactions,
  monthName,
  onClose,
  onPick,
}: {
  transactions: PersonalTransaction[];
  monthName: string;
  onClose: () => void;
  onPick: (tx: PersonalTransaction) => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="all-tx-title" onClick={(event) => event.stopPropagation()}>
        <div className="section-head">
          <div>
            <p className="eyebrow">{monthName}</p>
            <h2 id="all-tx-title">All transactions</h2>
          </div>
          <button className="icon-button" onClick={onClose} type="button" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="modal-scroll-list">
          <TransactionList items={transactions} onPick={onPick} />
        </div>
      </div>
    </div>
  );
}

function AllBudgetsDialog({
  items,
  currency,
  onClose,
}: {
  items: BudgetStatus[];
  currency: string;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="all-budgets-title" onClick={(event) => event.stopPropagation()}>
        <div className="section-head">
          <div>
            <p className="eyebrow">This month</p>
            <h2 id="all-budgets-title">All budgets</h2>
          </div>
          <button className="icon-button" onClick={onClose} type="button" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="modal-scroll-list">
          <BudgetProgressList items={items} currency={currency} />
        </div>
      </div>
    </div>
  );
}

function TransactionDialog({
  transaction,
  currency,
  onClose,
  onSaved,
  onDeleted,
}: {
  transaction: PersonalTransaction | null;
  currency: string;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [type, setType] = useState<"expense" | "income">(transaction?.type ?? "expense");
  const [title, setTitle] = useState(transaction?.title ?? "");
  const [amount, setAmount] = useState(transaction ? transaction.amount.toString() : "");
  const [category, setCategory] = useState(transaction?.category ?? "Food & Drink");
  const [date, setDate] = useState(transaction?.date ?? new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState(transaction?.note ?? "");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [keepExisting, setKeepExisting] = useState(Boolean(transaction?.receiptPath));
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const uploadRef = useRef<HTMLInputElement | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!receiptFile || !receiptFile.type.startsWith("image/")) {
      setReceiptPreview(null);
      return;
    }
    const url = URL.createObjectURL(receiptFile);
    setReceiptPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [receiptFile]);

  function pickReceipt(file: File | null) {
    setReceiptFile(file);
    setKeepExisting(false);
  }

  const options = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const numericAmount = Number(amount);
  const canSave = title.trim().length > 0 && Number.isFinite(numericAmount) && numericAmount > 0;

  function switchType(next: "expense" | "income") {
    setType(next);
    const list = next === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    if (!list.some((category2) => category2.name === category)) {
      setCategory(list[0].name);
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave || saving) return;
    setSaving(true);
    setError(null);
    const payload: PersonalTransactionPayload = {
      type,
      title: title.trim(),
      note: note.trim() || undefined,
      amount: numericAmount,
      currency,
      category,
      date,
    };
    try {
      if (receiptFile) {
        const uploaded = await uploadPersonalReceipt(receiptFile);
        payload.receipt = uploaded.path;
        payload.receiptName = uploaded.name;
        payload.receiptType = uploaded.type;
      } else if (keepExisting && transaction?.receiptPath) {
        payload.receipt = transaction.receiptPath;
        payload.receiptName = transaction.receiptName;
        payload.receiptType = transaction.receiptType;
      }

      if (transaction) {
        await updatePersonalTransaction(transaction.id, payload);
      } else {
        await addPersonalTransaction(payload);
      }
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save.");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!transaction || saving) return;
    setSaving(true);
    try {
      await deletePersonalTransaction(transaction.id);
      onDeleted();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete.");
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="tx-title" onClick={(event) => event.stopPropagation()}>
        <div className="section-head">
          <div>
            <p className="eyebrow">{transaction ? "Edit" : "New"}</p>
            <h2 id="tx-title">{transaction ? "Edit transaction" : "Add transaction"}</h2>
          </div>
          <button className="icon-button" onClick={onClose} type="button" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form className="form-grid" onSubmit={handleSave}>
          <div className="tabs" role="tablist" aria-label="Type">
            <button className={`tab ${type === "expense" ? "active" : ""}`} onClick={() => switchType("expense")} type="button">
              Expense
            </button>
            <button className={`tab ${type === "income" ? "active" : ""}`} onClick={() => switchType("income")} type="button">
              Income
            </button>
          </div>

          <label className="field">
            <span>Amount ({currency})</span>
            <input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" />
          </label>
          <label className="field">
            <span>Title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Groceries, salary, coffee" />
          </label>
          <div className="grid grid-2">
            <label className="field">
              <span>Category</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                {options.map((option) => (
                  <option key={option.name} value={option.name}>
                    {option.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Date</span>
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </label>
          </div>
          <label className="field">
            <span>Note</span>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional" />
          </label>

          <div className="field">
            <span>Receipt</span>
            <div className="receipt-actions">
              <button className="button" onClick={() => cameraRef.current?.click()} type="button">
                <ReceiptText size={17} /> Take photo
              </button>
              <button className="button" onClick={() => uploadRef.current?.click()} type="button">
                <Paperclip size={17} /> Upload
              </button>
            </div>
            <input
              ref={cameraRef}
              className="hidden-file-input"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) => pickReceipt(event.target.files?.[0] ?? null)}
            />
            <input
              ref={uploadRef}
              className="hidden-file-input"
              type="file"
              accept="image/*,.pdf"
              onChange={(event) => pickReceipt(event.target.files?.[0] ?? null)}
            />
          </div>
          {(receiptFile || (keepExisting && transaction?.receiptPath)) && (
            <div className="receipt-preview">
              {receiptPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={receiptPreview} alt="Receipt preview" />
              ) : !receiptFile && transaction?.receipt && transaction.receiptType?.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={transaction.receipt} alt="Receipt" />
              ) : (
                <div className="file-preview">
                  <Paperclip size={18} />
                  <span>{receiptFile?.name ?? transaction?.receiptName ?? "Receipt attached"}</span>
                </div>
              )}
              <button className="button" onClick={() => { setReceiptFile(null); setKeepExisting(false); }} type="button">
                Remove
              </button>
            </div>
          )}

          {error && <p className="notice error">{error}</p>}
          <div className="modal-actions">
            <button className="button teal" disabled={!canSave || saving} type="submit">
              {saving ? "Saving..." : transaction ? "Save changes" : "Add transaction"}
            </button>
            <button className="button ghost" onClick={onClose} type="button">
              Cancel
            </button>
          </div>
          {transaction && (
            <button className="button danger-solid" onClick={handleDelete} type="button" style={{ width: "100%" }}>
              <Trash2 size={16} /> Delete transaction
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

function BudgetDialog({
  budgets,
  currency,
  onClose,
  onChanged,
}: {
  budgets: PersonalBudget[];
  currency: string;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
}) {
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0].name);
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0 || saving) return;
    setSaving(true);
    setError(null);
    try {
      await setPersonalBudget(category, value, currency);
      setAmount("");
      await onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save budget.");
    } finally {
      setSaving(false);
    }
  }

  async function removeBudget(name: string) {
    try {
      await deletePersonalBudget(name);
      await onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not remove budget.");
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal small-modal" role="dialog" aria-modal="true" aria-labelledby="budget-title" onClick={(event) => event.stopPropagation()}>
        <div className="section-head">
          <div>
            <p className="eyebrow">Budgets</p>
            <h2 id="budget-title">Monthly limits</h2>
          </div>
          <button className="icon-button" onClick={onClose} type="button" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form className="form-grid" onSubmit={handleSave}>
          <div className="grid grid-2">
            <label className="field">
              <span>Category</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                {EXPENSE_CATEGORIES.map((option) => (
                  <option key={option.name} value={option.name}>
                    {option.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Limit ({currency})</span>
              <input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" />
            </label>
          </div>
          {error && <p className="notice error">{error}</p>}
          <button className="button teal" disabled={saving || !amount} type="submit">
            <Target size={16} /> {saving ? "Saving..." : "Save budget"}
          </button>
        </form>

        {budgets.length > 0 && (
          <div className="list compact-list" style={{ marginTop: 16 }}>
            {budgets.map((budget) => (
              <div className="list-row" key={budget.category}>
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="cat-dot" style={{ background: categoryColor(budget.category) }} />
                  <strong>{budget.category}</strong>
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="muted">
                    {fmt(budget.amount)} {budget.currency}
                  </span>
                  <button
                    className="icon-button danger"
                    onClick={() => removeBudget(budget.category)}
                    type="button"
                    aria-label={`Remove ${budget.category} budget`}
                  >
                    <Trash2 size={16} />
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GoalDialog({
  goal,
  currency,
  onClose,
  onChanged,
}: {
  goal: PersonalGoal | null;
  currency: string;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
}) {
  const [amount, setAmount] = useState(goal ? goal.amount.toString() : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const value = Number(amount);
  const canSave = Number.isFinite(value) && value > 0;

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave || saving) return;
    setSaving(true);
    setError(null);
    try {
      await setPersonalGoal(value, currency);
      await onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save goal.");
      setSaving(false);
    }
  }

  async function handleRemove() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await setPersonalGoal(0, currency);
      await onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not remove goal.");
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal small-modal" role="dialog" aria-modal="true" aria-labelledby="goal-title" onClick={(event) => event.stopPropagation()}>
        <div className="section-head">
          <div>
            <p className="eyebrow">Savings</p>
            <h2 id="goal-title">Monthly goal</h2>
          </div>
          <button className="icon-button" onClick={onClose} type="button" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form className="form-grid" onSubmit={handleSave}>
          <label className="field">
            <span>Target to save each month ({currency})</span>
            <input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" />
          </label>
          {error && <p className="notice error">{error}</p>}
          <button className="button teal" disabled={!canSave || saving} type="submit">
            <Target size={16} /> {saving ? "Saving..." : "Save goal"}
          </button>
          {goal && (
            <button className="button ghost" onClick={handleRemove} type="button" disabled={saving}>
              Remove goal
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

function BillsDialog({
  bills,
  currency,
  onClose,
  onChanged,
}: {
  bills: PersonalBill[];
  currency: string;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Bills");
  const [dueDay, setDueDay] = useState("1");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountValue = Number(amount);
  const dayValue = Number(dueDay);
  const canSave =
    name.trim().length > 0 &&
    Number.isFinite(amountValue) &&
    amountValue > 0 &&
    Number.isFinite(dayValue) &&
    dayValue >= 1 &&
    dayValue <= 31;

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave || saving) return;
    setSaving(true);
    setError(null);
    try {
      await addPersonalBill({ name: name.trim(), amount: amountValue, currency, category, dueDay: dayValue });
      setName("");
      setAmount("");
      setDueDay("1");
      await onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save bill.");
    } finally {
      setSaving(false);
    }
  }

  async function removeBill(id: string) {
    try {
      await deletePersonalBill(id);
      await onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not remove bill.");
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal small-modal" role="dialog" aria-modal="true" aria-labelledby="bills-title" onClick={(event) => event.stopPropagation()}>
        <div className="section-head">
          <div>
            <p className="eyebrow">Recurring</p>
            <h2 id="bills-title">Upcoming bills</h2>
          </div>
          <button className="icon-button" onClick={onClose} type="button" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form className="form-grid" onSubmit={handleSave}>
          <label className="field">
            <span>Name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Rent, Netflix, gym" />
          </label>
          <div className="grid grid-2">
            <label className="field">
              <span>Amount ({currency})</span>
              <input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" />
            </label>
            <label className="field">
              <span>Due day of month</span>
              <input inputMode="numeric" value={dueDay} onChange={(event) => setDueDay(event.target.value)} placeholder="1" />
            </label>
          </div>
          <label className="field">
            <span>Category</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              {EXPENSE_CATEGORIES.map((option) => (
                <option key={option.name} value={option.name}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>
          {error && <p className="notice error">{error}</p>}
          <button className="button teal" disabled={!canSave || saving} type="submit">
            <Plus size={16} /> {saving ? "Saving..." : "Add bill"}
          </button>
        </form>

        {bills.length > 0 && (
          <div className="list compact-list" style={{ marginTop: 16 }}>
            {bills.map((bill) => (
              <div className="list-row" key={bill.id}>
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="cat-dot" style={{ background: categoryColor(bill.category) }} />
                  <span style={{ display: "flex", flexDirection: "column" }}>
                    <strong>{bill.name}</strong>
                    <span className="muted" style={{ fontSize: 12.5 }}>Day {bill.dueDay} · {bill.category}</span>
                  </span>
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="muted">
                    {fmt(bill.amount)} {bill.currency}
                  </span>
                  <button
                    className="icon-button danger"
                    onClick={() => removeBill(bill.id)}
                    type="button"
                    aria-label={`Remove ${bill.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
