import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PersonalBudget, PersonalTransaction } from "@/lib/types";
import { ApiError } from "@/lib/supabase/groups";
import { roundMoney } from "@/lib/group-model";

type TxRow = {
  id: string;
  type: "expense" | "income";
  title: string;
  note: string | null;
  amount: number | string;
  currency: string;
  category: string;
  occurred_on: string;
};

type BudgetRow = {
  category: string;
  amount: number | string;
  currency: string;
};

async function check<T extends { error: { message: string } | null }>(promise: PromiseLike<T>) {
  const result = await promise;
  if (result.error) throw new ApiError(500, result.error.message);
  return result;
}

function mapTransaction(row: TxRow): PersonalTransaction {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    note: row.note ?? undefined,
    amount: Number(row.amount),
    currency: row.currency,
    category: row.category,
    date: row.occurred_on,
  };
}

export type PersonalTransactionInput = {
  type: "expense" | "income";
  title: string;
  note?: string;
  amount: number;
  currency: string;
  category: string;
  date: string;
};

export async function listPersonalData(db: SupabaseClient, profileId: string) {
  const [txResult, budgetResult] = await Promise.all([
    check(
      db
        .from("personal_transactions")
        .select("id, type, title, note, amount, currency, category, occurred_on")
        .eq("profile_id", profileId)
        .order("occurred_on", { ascending: false })
        .order("created_at", { ascending: false }),
    ),
    check(db.from("personal_budgets").select("category, amount, currency").eq("profile_id", profileId)),
  ]);

  const transactions = (txResult.data as TxRow[] | null)?.map(mapTransaction) ?? [];
  const budgets: PersonalBudget[] =
    (budgetResult.data as BudgetRow[] | null)?.map((row) => ({
      category: row.category,
      amount: Number(row.amount),
      currency: row.currency,
    })) ?? [];

  return { transactions, budgets };
}

function validate(input: PersonalTransactionInput) {
  const title = input.title.trim();
  const amount = roundMoney(Number(input.amount));
  if (!title) throw new ApiError(400, "Title is required.");
  if (!Number.isFinite(amount) || amount <= 0) throw new ApiError(400, "Enter an amount above 0.");
  if (input.type !== "expense" && input.type !== "income") throw new ApiError(400, "Invalid type.");
  if (!input.date) throw new ApiError(400, "Date is required.");
  return { title, amount };
}

export async function addPersonalTransaction(db: SupabaseClient, profileId: string, input: PersonalTransactionInput) {
  const { title, amount } = validate(input);
  const { data } = await check(
    db
      .from("personal_transactions")
      .insert({
        profile_id: profileId,
        type: input.type,
        title,
        note: input.note?.trim() || null,
        amount,
        currency: input.currency || "EUR",
        category: input.category || "Other",
        occurred_on: input.date,
      })
      .select("id, type, title, note, amount, currency, category, occurred_on")
      .single(),
  );
  return mapTransaction(data as TxRow);
}

export async function updatePersonalTransaction(
  db: SupabaseClient,
  profileId: string,
  id: string,
  input: PersonalTransactionInput,
) {
  const { title, amount } = validate(input);
  const { data } = await check(
    db
      .from("personal_transactions")
      .update({
        type: input.type,
        title,
        note: input.note?.trim() || null,
        amount,
        currency: input.currency || "EUR",
        category: input.category || "Other",
        occurred_on: input.date,
      })
      .eq("id", id)
      .eq("profile_id", profileId)
      .select("id, type, title, note, amount, currency, category, occurred_on")
      .single(),
  );
  if (!data) throw new ApiError(404, "Transaction not found.");
  return mapTransaction(data as TxRow);
}

export async function deletePersonalTransaction(db: SupabaseClient, profileId: string, id: string) {
  await check(db.from("personal_transactions").delete().eq("id", id).eq("profile_id", profileId));
}

export async function setPersonalBudget(
  db: SupabaseClient,
  profileId: string,
  category: string,
  amount: number,
  currency: string,
) {
  const clean = category.trim();
  const value = roundMoney(Number(amount));
  if (!clean) throw new ApiError(400, "Category is required.");
  if (!Number.isFinite(value) || value < 0) throw new ApiError(400, "Enter a budget of 0 or more.");

  await check(
    db.from("personal_budgets").upsert(
      { profile_id: profileId, category: clean, amount: value, currency: currency || "EUR", updated_at: new Date().toISOString() },
      { onConflict: "profile_id,category" },
    ),
  );
}

export async function deletePersonalBudget(db: SupabaseClient, profileId: string, category: string) {
  await check(db.from("personal_budgets").delete().eq("profile_id", profileId).eq("category", category));
}
