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
  receipt_path: string | null;
  receipt_name: string | null;
  receipt_type: string | null;
};

const TX_COLUMNS =
  "id, type, title, note, amount, currency, category, occurred_on, receipt_path, receipt_name, receipt_type";

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

function mapTransaction(row: TxRow, url?: string): PersonalTransaction {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    note: row.note ?? undefined,
    amount: Number(row.amount),
    currency: row.currency,
    category: row.category,
    date: row.occurred_on,
    receipt: url ?? row.receipt_path ?? undefined,
    receiptPath: row.receipt_path ?? undefined,
    receiptName: row.receipt_name ?? undefined,
    receiptType: row.receipt_type ?? undefined,
  };
}

async function signReceipt(db: SupabaseClient, path: string | null) {
  if (!path) return undefined;
  const { data } = await db.storage.from("receipts").createSignedUrl(path, 60 * 60);
  return data?.signedUrl;
}

export type PersonalTransactionInput = {
  type: "expense" | "income";
  title: string;
  note?: string;
  amount: number;
  currency: string;
  category: string;
  date: string;
  receipt?: string;
  receiptName?: string;
  receiptType?: string;
};

export async function listPersonalData(db: SupabaseClient, profileId: string) {
  const [txResult, budgetResult] = await Promise.all([
    check(
      db
        .from("personal_transactions")
        .select(TX_COLUMNS)
        .eq("profile_id", profileId)
        .order("occurred_on", { ascending: false })
        .order("created_at", { ascending: false }),
    ),
    check(db.from("personal_budgets").select("category, amount, currency").eq("profile_id", profileId)),
  ]);

  const txRows = (txResult.data as TxRow[] | null) ?? [];
  const paths = txRows.map((row) => row.receipt_path).filter((path): path is string => Boolean(path));
  const urlByPath = new Map<string, string>();
  if (paths.length > 0) {
    const { data: signed } = await db.storage.from("receipts").createSignedUrls(paths, 60 * 60);
    signed?.forEach((item) => {
      if (item.path && item.signedUrl) urlByPath.set(item.path, item.signedUrl);
    });
  }

  const transactions = txRows.map((row) => mapTransaction(row, row.receipt_path ? urlByPath.get(row.receipt_path) : undefined));
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
        receipt_path: input.receipt || null,
        receipt_name: input.receiptName || null,
        receipt_type: input.receiptType || null,
      })
      .select(TX_COLUMNS)
      .single(),
  );
  const row = data as TxRow;
  return mapTransaction(row, await signReceipt(db, row.receipt_path));
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
        receipt_path: input.receipt || null,
        receipt_name: input.receiptName || null,
        receipt_type: input.receiptType || null,
      })
      .eq("id", id)
      .eq("profile_id", profileId)
      .select(TX_COLUMNS)
      .single(),
  );
  if (!data) throw new ApiError(404, "Transaction not found.");
  const row = data as TxRow;
  return mapTransaction(row, await signReceipt(db, row.receipt_path));
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
