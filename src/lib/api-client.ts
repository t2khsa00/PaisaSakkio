import type { Duty, Expense, Group, GroupSummary, PersonalBill, PersonalBudget, PersonalGoal, PersonalTransaction, Settlement } from "./types";

export type PersonalTransactionPayload = {
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

type ExpensePayload = Omit<Expense, "id" | "currency" | "date">;
type DutyPayload = Omit<Duty, "id">;

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error || "Request failed.");
  }

  return data as T;
}

export async function getGroups() {
  const data = await api<{ groups: Group[] }>("/api/groups");
  return data.groups;
}

export async function getGroupSummaries() {
  const data = await api<{ groups: GroupSummary[] }>("/api/groups/summary");
  return data.groups;
}

export async function getGroup(groupId: string) {
  const data = await api<{ group: Group }>(`/api/groups/${groupId}`);
  return data.group;
}

export async function createGroup(name: string, currency: string) {
  const data = await api<{ group: Group }>("/api/groups", {
    method: "POST",
    body: JSON.stringify({ name, currency }),
  });
  return data.group;
}

export async function deleteGroup(groupId: string) {
  await api<{ ok: true }>(`/api/groups/${groupId}`, { method: "DELETE" });
}

export async function renameGroup(groupId: string, name: string) {
  const data = await api<{ group: Group }>(`/api/groups/${groupId}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
  return data.group;
}

export async function removeMember(groupId: string, memberId: string) {
  const data = await api<{ group: Group }>(`/api/groups/${groupId}/members/${memberId}`, { method: "DELETE" });
  return data.group;
}

export async function leaveGroup(groupId: string) {
  await api<{ ok: true }>(`/api/groups/${groupId}/leave`, { method: "POST" });
}

export async function getPersonal() {
  return api<{
    transactions: PersonalTransaction[];
    budgets: PersonalBudget[];
    goal: PersonalGoal | null;
    bills: PersonalBill[];
  }>("/api/personal");
}

export async function addPersonalTransaction(payload: PersonalTransactionPayload) {
  const data = await api<{ transaction: PersonalTransaction }>("/api/personal/transactions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data.transaction;
}

export async function updatePersonalTransaction(id: string, payload: PersonalTransactionPayload) {
  const data = await api<{ transaction: PersonalTransaction }>(`/api/personal/transactions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return data.transaction;
}

export async function deletePersonalTransaction(id: string) {
  await api<{ ok: true }>(`/api/personal/transactions/${id}`, { method: "DELETE" });
}

export async function setPersonalBudget(category: string, amount: number, currency: string) {
  await api<{ ok: true }>("/api/personal/budgets", {
    method: "PUT",
    body: JSON.stringify({ category, amount, currency }),
  });
}

export async function deletePersonalBudget(category: string) {
  await api<{ ok: true }>(`/api/personal/budgets?category=${encodeURIComponent(category)}`, { method: "DELETE" });
}

export async function setPersonalGoal(amount: number, currency: string) {
  await api<{ ok: true }>("/api/personal/goal", {
    method: "PUT",
    body: JSON.stringify({ amount, currency }),
  });
}

export type PersonalBillPayload = {
  name: string;
  amount: number;
  currency: string;
  category: string;
  dueDay: number;
};

export async function addPersonalBill(payload: PersonalBillPayload) {
  const data = await api<{ bill: PersonalBill }>("/api/personal/bills", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data.bill;
}

export async function deletePersonalBill(id: string) {
  await api<{ ok: true }>(`/api/personal/bills?id=${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function uploadPersonalReceipt(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/personal/receipts", { method: "POST", body: formData });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error || "Receipt upload failed.");
  }

  return data.receipt as { path: string; url: string; name: string; type: string };
}

export async function addInvitation(groupId: string, email: string) {
  const data = await api<{ group: Group }>(`/api/groups/${groupId}/invitations`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  return data.group;
}

export async function deleteInvitation(groupId: string, invitationId: string) {
  const data = await api<{ group: Group }>(`/api/groups/${groupId}/invitations/${invitationId}`, { method: "DELETE" });
  return data.group;
}

export async function getInvite(code: string) {
  return api<{ group: Group; alreadyMember: boolean }>(`/api/invites/${code}`);
}

export async function acceptInvite(code: string, name: string, email: string | null) {
  const data = await api<{ group: Group }>(`/api/invites/${code}/accept`, {
    method: "POST",
    body: JSON.stringify({ name, email }),
  });
  return data.group;
}

export async function addExpense(groupId: string, expense: ExpensePayload) {
  const data = await api<{ group: Group }>(`/api/groups/${groupId}/expenses`, {
    method: "POST",
    body: JSON.stringify(expense),
  });
  return data.group;
}

export async function uploadReceipt(groupId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`/api/groups/${groupId}/receipts`, {
    method: "POST",
    body: formData,
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error || "Receipt upload failed.");
  }

  return data.receipt as { path: string; url: string; name: string; type: string };
}

export async function deleteExpense(groupId: string, expenseId: string) {
  const data = await api<{ group: Group }>(`/api/groups/${groupId}/expenses/${expenseId}`, { method: "DELETE" });
  return data.group;
}

export async function updateExpense(groupId: string, expenseId: string, expense: ExpensePayload) {
  const data = await api<{ group: Group }>(`/api/groups/${groupId}/expenses/${expenseId}`, {
    method: "PATCH",
    body: JSON.stringify(expense),
  });
  return data.group;
}

export async function recordSettlement(groupId: string, settlement: Settlement) {
  const data = await api<{ group: Group }>(`/api/groups/${groupId}/settlements`, {
    method: "POST",
    body: JSON.stringify(settlement),
  });
  return data.group;
}

export async function deleteSettlement(groupId: string, settlementId: string) {
  const data = await api<{ group: Group }>(`/api/groups/${groupId}/settlements/${settlementId}`, { method: "DELETE" });
  return data.group;
}

export async function addDuty(groupId: string, duty: DutyPayload) {
  const data = await api<{ group: Group }>(`/api/groups/${groupId}/duties`, {
    method: "POST",
    body: JSON.stringify(duty),
  });
  return data.group;
}

export async function updateDutyStatus(groupId: string, dutyId: string, status: Duty["status"]) {
  const data = await api<{ group: Group }>(`/api/groups/${groupId}/duties/${dutyId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  return data.group;
}

export async function updateDuty(groupId: string, dutyId: string, duty: Partial<DutyPayload>) {
  const data = await api<{ group: Group }>(`/api/groups/${groupId}/duties/${dutyId}`, {
    method: "PATCH",
    body: JSON.stringify(duty),
  });
  return data.group;
}

export async function deleteDuty(groupId: string, dutyId: string) {
  const data = await api<{ group: Group }>(`/api/groups/${groupId}/duties/${dutyId}`, { method: "DELETE" });
  return data.group;
}
