"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Target,
  TrendingDown,
  TrendingUp,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import type { PersonalBudget, PersonalTransaction } from "@/lib/types";
import {
  addPersonalTransaction,
  deletePersonalBudget,
  deletePersonalTransaction,
  getPersonal,
  setPersonalBudget,
  updatePersonalTransaction,
  type PersonalTransactionPayload,
} from "@/lib/api-client";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  budgetStatuses,
  categoryBreakdown,
  categoryColor,
  currentMonthKey,
  monthKey,
  monthlyTrend,
  totalsForMonth,
} from "@/lib/personal-model";

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

function shortDate(iso: string) {
  const date = new Date(`${iso}T00:00:00`);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString("en", { day: "numeric", month: "short" });
}

function tint(color: string) {
  return `${color}1f`;
}

export function PersonalClient() {
  const [transactions, setTransactions] = useState<PersonalTransaction[]>([]);
  const [budgets, setBudgets] = useState<PersonalBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState(currentMonthKey());
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<PersonalTransaction | null>(null);
  const [budgetOpen, setBudgetOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getPersonal();
      setTransactions(data.transactions);
      setBudgets(data.budgets);
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

  const currency = transactions[0]?.currency ?? "EUR";
  const totals = useMemo(() => totalsForMonth(transactions, month), [transactions, month]);
  const breakdown = useMemo(() => categoryBreakdown(transactions, month), [transactions, month]);
  const trend = useMemo(() => monthlyTrend(transactions, 6), [transactions]);
  const budgetView = useMemo(() => budgetStatuses(transactions, budgets, month), [transactions, budgets, month]);
  const monthTransactions = useMemo(
    () => transactions.filter((tx) => monthKey(tx.date) === month),
    [transactions, month],
  );
  const maxTrend = Math.max(1, ...trend.map((entry) => Math.max(entry.expense, entry.income)));
  const isCurrent = month === currentMonthKey();

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
    <div className="grid">
      {/* Net hero with month nav */}
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
          {fmt(Math.abs(totals.net))}
          <span className="cur">{currency}</span>
        </p>
        <div className="balance-pills">
          <span className="balance-pill">
            <TrendingUp size={14} /> Income {fmt(totals.income)}
          </span>
          <span className="balance-pill">
            <TrendingDown size={14} /> Spent {fmt(totals.expense)}
          </span>
        </div>
      </section>

      {error && <p className="notice error">{error}</p>}

      {/* Add */}
      <button className="button teal" onClick={() => setAddOpen(true)} type="button" style={{ width: "100%", minHeight: 52 }}>
        <Plus size={18} /> Add transaction
      </button>

      {/* Trend chart */}
      <section className="panel panel-pad">
        <div className="mobile-section-head" style={{ marginBottom: 14 }}>
          <h3 className="mobile-section-title">Last 6 months</h3>
        </div>
        <div className="trend-chart">
          {trend.map((entry) => (
            <button
              key={entry.key}
              className={`trend-col ${entry.key === month ? "active" : ""}`}
              onClick={() => setMonth(entry.key)}
              type="button"
              title={`${entry.label}: spent ${fmt(entry.expense)} ${currency}`}
            >
              <span className="trend-bar-track">
                <span
                  className="trend-bar"
                  style={{ height: `${Math.round((entry.expense / maxTrend) * 100)}%` }}
                />
              </span>
              <span className="trend-label">{entry.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Category breakdown */}
      <section className="panel panel-pad">
        <div className="mobile-section-head" style={{ marginBottom: 14 }}>
          <h3 className="mobile-section-title">Spending by category</h3>
        </div>
        {breakdown.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>No spending recorded this month.</p>
        ) : (
          <div className="cat-list">
            {breakdown.map((slice) => (
              <div className="cat-row" key={slice.category}>
                <span className="cat-dot" style={{ background: slice.color }} />
                <div className="cat-main">
                  <div className="cat-top">
                    <strong>{slice.category}</strong>
                    <span>
                      {fmt(slice.amount)} {currency}
                    </span>
                  </div>
                  <span className="cat-bar-track">
                    <span className="cat-bar" style={{ width: `${Math.round(slice.pct * 100)}%`, background: slice.color }} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Budgets */}
      <section className="panel panel-pad">
        <div className="mobile-section-head" style={{ marginBottom: 14 }}>
          <h3 className="mobile-section-title">Budgets</h3>
          <button className="button" onClick={() => setBudgetOpen(true)} type="button" style={{ minHeight: 38, padding: "0 13px" }}>
            <Target size={15} /> Set budget
          </button>
        </div>
        {budgetView.length === 0 ? (
          <div className="mobile-empty" style={{ padding: "28px 20px" }}>
            <Target size={26} color="var(--muted)" />
            <p>Set a monthly limit per category and we&apos;ll warn you when you go over.</p>
          </div>
        ) : (
          <div className="budget-list">
            {budgetView.map((status) => (
              <div className="budget-row" key={status.category}>
                <div className="budget-top">
                  <span className="budget-name">
                    <span className="cat-dot" style={{ background: status.color }} />
                    <strong>{status.category}</strong>
                  </span>
                  <span className={status.over ? "budget-over" : "muted"}>
                    {fmt(status.spent)} / {fmt(status.limit)} {currency}
                  </span>
                </div>
                <span className="budget-bar-track">
                  <span
                    className="budget-bar"
                    style={{
                      width: `${Math.round(status.pct * 100)}%`,
                      background: status.over ? "var(--danger)" : status.color,
                    }}
                  />
                </span>
                {status.over && (
                  <span className="budget-warn">⚠ Over by {fmt(status.spent - status.limit)} {currency}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Transactions */}
      <section className="panel panel-pad">
        <div className="mobile-section-head" style={{ marginBottom: 14 }}>
          <h3 className="mobile-section-title">Transactions</h3>
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
          <div className="expense-list" style={{ marginTop: 0 }}>
            {monthTransactions.map((tx) => {
              const color = categoryColor(tx.category);
              return (
                <button className="expense-row" key={tx.id} onClick={() => setEditing(tx)} type="button">
                  <span className="expense-row-thumb" style={{ background: tint(color), color }}>
                    {tx.type === "income" ? <TrendingUp size={18} /> : <Wallet size={18} />}
                  </span>
                  <span className="expense-row-text">
                    <strong>{tx.title}</strong>
                    <span className="muted">
                      {tx.category} · {shortDate(tx.date)}
                    </span>
                  </span>
                  <span className="expense-row-amt">
                    <strong style={{ color: tx.type === "income" ? "var(--green)" : "var(--ink)" }}>
                      {tx.type === "income" ? "+" : "−"}
                      {fmt(tx.amount)} {tx.currency}
                    </strong>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
