import type { Expense, Group, Member, Settlement } from "./types";

export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "PS";
}

export function memberName(group: Group, memberId: string) {
  return group.members.find((member) => member.id === memberId)?.name ?? "Unknown";
}

export function isGroupOwner(group: Group, accountId?: string | null) {
  return Boolean(accountId && group.ownerId === accountId);
}

export function isAccountMember(group: Group, accountId?: string | null) {
  return Boolean(accountId && group.members.some((member) => member.accountId === accountId));
}

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

// Accepts amounts typed with either a comma or a dot as the decimal separator
// (e.g. Finnish "12,50" or "12.50"). Returns NaN for anything not numeric.
export function parseAmount(value: string | number | null | undefined) {
  if (typeof value === "number") return value;
  if (value == null) return NaN;
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  if (normalized === "") return NaN;
  return Number(normalized);
}

export function buildEqualShares(amount: number, participants: string[]) {
  if (participants.length === 0) return {};

  const baseShare = roundMoney(amount / participants.length);
  const shares = Object.fromEntries(participants.map((participant) => [participant, baseShare]));
  const assigned = participants.reduce((sum, participant) => sum + (shares[participant] ?? 0), 0);
  const lastParticipant = participants[participants.length - 1];
  shares[lastParticipant] = roundMoney((shares[lastParticipant] ?? 0) + amount - assigned);

  return shares;
}

function expenseShares(expense: Expense) {
  if (expense.splitType === "custom" && expense.shares && Object.keys(expense.shares).length > 0) {
    return expense.shares;
  }

  return buildEqualShares(expense.amount, expense.participants);
}

export function calculateBalanceMap(group: Group) {
  const balances = new Map(group.members.map((member) => [member.id, 0]));

  for (const expense of group.expenses) {
    const participants = expense.participants.length ? expense.participants : group.members.map((member) => member.id);
    const shares = expenseShares({ ...expense, participants });
    balances.set(expense.paidBy, (balances.get(expense.paidBy) ?? 0) + expense.amount);

    for (const [participant, share] of Object.entries(shares)) {
      balances.set(participant, (balances.get(participant) ?? 0) - share);
    }
  }

  for (const settlement of group.settlements ?? []) {
    balances.set(settlement.from, (balances.get(settlement.from) ?? 0) + settlement.amount);
    balances.set(settlement.to, (balances.get(settlement.to) ?? 0) - settlement.amount);
  }

  return new Map(Array.from(balances).map(([memberId, balance]) => [memberId, roundMoney(balance)]));
}

export function calculateMemberBalances(group: Group) {
  const balances = calculateBalanceMap(group);

  return group.members.map((member: Member) => ({
    member,
    balance: balances.get(member.id) ?? 0,
  }));
}

export function calculateSettlements(group: Group): Settlement[] {
  const balances = calculateBalanceMap(group);
  const debtors = Array.from(balances)
    .filter(([, balance]) => balance < -0.01)
    .map(([id, balance]) => ({ id, amount: Math.abs(balance) }));
  const creditors = Array.from(balances)
    .filter(([, balance]) => balance > 0.01)
    .map(([id, balance]) => ({ id, amount: balance }));
  const settlements: Settlement[] = [];

  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtors[debtorIndex] && creditors[creditorIndex]) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = Math.min(debtor.amount, creditor.amount);

    settlements.push({
      from: debtor.id,
      to: creditor.id,
      amount: roundMoney(amount),
      currency: group.currency,
    });

    debtor.amount -= amount;
    creditor.amount -= amount;

    if (debtor.amount < 0.01) debtorIndex += 1;
    if (creditor.amount < 0.01) creditorIndex += 1;
  }

  return settlements;
}
