import "server-only";

import { currentUser } from "@clerk/nextjs/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Duty, Expense, Group, GroupSummary, Invitation, Member, Settlement } from "@/lib/types";
import { buildEqualShares, calculateMemberBalances, initials, roundMoney } from "@/lib/group-model";

type Profile = {
  id: string;
  clerk_user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

type GroupRow = {
  id: string;
  name: string;
  currency: string;
  invite_code: string;
  owner_profile_id: string;
  created_at: string;
};

type MemberRow = {
  group_id: string;
  profile_id: string;
  role: "owner" | "member";
  joined_at: string;
};

type ExpenseRow = {
  id: string;
  group_id: string;
  paid_by_profile_id: string;
  title: string;
  description?: string | null;
  amount: number | string;
  currency: string;
  split_type: "equal" | "custom";
  receipt_path: string | null;
  receipt_name?: string | null;
  receipt_type?: string | null;
  created_at: string;
};

type SplitRow = {
  expense_id: string;
  profile_id: string;
  share_amount: number | string;
};

type SettlementRow = {
  id: string;
  group_id: string;
  from_profile_id: string;
  to_profile_id: string;
  amount: number | string;
  currency: string;
  note: string | null;
  settled_at: string;
};

type DutyRow = {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  assignee_profile_id: string | null;
  due_date: string | null;
  status: "pending" | "in_progress" | "done" | "cancelled";
  linked_expense_id: string | null;
  created_at: string;
};

type InvitationRow = {
  id: string;
  group_id: string;
  email: string;
  status: "Pending" | "Accepted";
  sent_at: string;
};

type ExpenseMetadata = {
  description?: string;
  receiptName?: string;
  receiptType?: string;
};

type DutyMetadata = {
  assignees?: string[];
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function requireCurrentProfile() {
  const user = await currentUser();
  if (!user) {
    throw new ApiError(401, "Sign in first.");
  }

  const email = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null;
  const fullName = user.fullName || user.firstName || user.username || email || "Me";
  const avatarUrl = user.imageUrl || null;
  const db = createAdminSupabaseClient();

  const { data: existingProfile, error: readError } = await db
    .from("profiles")
    .select("id, clerk_user_id, email, full_name, avatar_url")
    .eq("clerk_user_id", user.id)
    .maybeSingle();

  if (readError) {
    throw new ApiError(500, friendlySupabaseError(readError.message));
  }

  if (existingProfile) {
    const profile = existingProfile as Profile;
    const needsUpdate =
      profile.email !== email ||
      profile.full_name !== fullName ||
      profile.avatar_url !== avatarUrl;

    if (!needsUpdate) {
      return { db, profile };
    }

    const { data, error } = await db
      .from("profiles")
      .update({
        email,
        full_name: fullName,
        avatar_url: avatarUrl,
      })
      .eq("id", profile.id)
      .select("id, clerk_user_id, email, full_name, avatar_url")
      .single();

    if (error || !data) {
      throw new ApiError(500, friendlySupabaseError(error?.message || "Could not sync your profile."));
    }

    return { db, profile: data as Profile };
  }

  const { data, error } = await db
    .from("profiles")
    .insert({
      clerk_user_id: user.id,
      email,
      full_name: fullName,
      avatar_url: avatarUrl,
    })
    .select("id, clerk_user_id, email, full_name, avatar_url")
    .single();

  if (error || !data) {
    throw new ApiError(500, friendlySupabaseError(error?.message || "Could not sync your profile."));
  }

  return { db, profile: data as Profile };
}

export async function listGroupsForProfile(db: SupabaseClient, profileId: string) {
  const { data: memberships, error } = await db
    .from("group_members")
    .select("group_id")
    .eq("profile_id", profileId)
    .order("joined_at", { ascending: false });

  if (error) throw new ApiError(500, error.message);
  const groupIds = Array.from(new Set((memberships ?? []).map((row) => row.group_id as string)));
  return hydrateGroups(db, groupIds);
}

export async function listGroupSummariesForProfile(db: SupabaseClient, profileId: string) {
  const { data: memberships, error } = await db
    .from("group_members")
    .select("group_id")
    .eq("profile_id", profileId)
    .order("joined_at", { ascending: false });

  if (error) throw new ApiError(500, error.message);

  const groupIds = Array.from(new Set((memberships ?? []).map((row) => row.group_id as string)));
  if (groupIds.length === 0) return [] as GroupSummary[];

  const [
    groupsResult,
    membersResult,
    expensesResult,
    settlementsResult,
    dutiesResult,
  ] = await Promise.all([
    db.from("groups").select("id, name, currency, invite_code, owner_profile_id").in("id", groupIds),
    db.from("group_members").select("group_id, profile_id").in("group_id", groupIds),
    db
      .from("expenses")
      .select("id, group_id, paid_by_profile_id, amount, receipt_path")
      .in("group_id", groupIds),
    db
      .from("settlements")
      .select("group_id, from_profile_id, to_profile_id, amount")
      .in("group_id", groupIds),
    db
      .from("duties")
      .select("group_id, status")
      .in("group_id", groupIds),
  ]);

  for (const result of [groupsResult, membersResult, expensesResult, settlementsResult, dutiesResult]) {
    if (result.error) throw new ApiError(500, result.error.message);
  }

  const groupRows = (groupsResult.data ?? []) as Pick<GroupRow, "id" | "name" | "currency" | "invite_code" | "owner_profile_id">[];
  const memberRows = (membersResult.data ?? []) as Pick<MemberRow, "group_id" | "profile_id">[];
  const expenseRows = (expensesResult.data ?? []) as Pick<ExpenseRow, "id" | "group_id" | "paid_by_profile_id" | "amount" | "receipt_path">[];
  const settlementRows = (settlementsResult.data ?? []) as Pick<SettlementRow, "group_id" | "from_profile_id" | "to_profile_id" | "amount">[];
  const dutyRows = (dutiesResult.data ?? []) as Pick<DutyRow, "group_id" | "status">[];
  const ownerProfileIds = Array.from(new Set(groupRows.map((group) => group.owner_profile_id)));
  const ownerProfiles = await readProfiles(db, ownerProfileIds);
  const expenseIds = expenseRows.map((expense) => expense.id);
  const splitRows = await readSplitsForExpenses(db, expenseIds);
  const orderedGroups = groupRows.sort((a, b) => groupIds.indexOf(a.id) - groupIds.indexOf(b.id));

  return orderedGroups.map((group): GroupSummary => {
    const groupMembers = memberRows.filter((member) => member.group_id === group.id);
    const memberIds = groupMembers.map((member) => member.profile_id);
    const groupExpenses = expenseRows.filter((expense) => expense.group_id === group.id);
    const groupExpenseIds = new Set(groupExpenses.map((expense) => expense.id));
    const groupSettlements = settlementRows.filter((settlement) => settlement.group_id === group.id);
    const groupDuties = dutyRows.filter((duty) => duty.group_id === group.id);

    return {
      id: group.id,
      ownerId: ownerProfiles.get(group.owner_profile_id)?.clerk_user_id ?? group.owner_profile_id,
      name: group.name,
      inviteCode: group.invite_code,
      currency: group.currency,
      memberCount: groupMembers.length,
      expenseCount: groupExpenses.length,
      totalSpend: roundMoney(groupExpenses.reduce((sum, expense) => sum + toNumber(expense.amount), 0)),
      receiptCount: groupExpenses.filter((expense) => Boolean(expense.receipt_path)).length,
      openDutyCount: groupDuties.filter((duty) => duty.status !== "done").length,
      settlementCount: calculateSummarySettlementCount({
        currency: group.currency,
        memberIds,
        expenses: groupExpenses,
        splits: splitRows.filter((split) => groupExpenseIds.has(split.expense_id)),
        settlements: groupSettlements,
      }),
    };
  });
}

export async function getGroupForMember(db: SupabaseClient, groupId: string, profileId: string) {
  await requireMember(db, groupId, profileId);
  const groups = await hydrateGroups(db, [groupId]);
  const group = groups[0];
  if (!group) throw new ApiError(404, "Group not found.");
  return group;
}

export async function createGroupForProfile(db: SupabaseClient, profile: Profile, name: string, currency: string) {
  const cleanName = name.trim();
  if (!cleanName) throw new ApiError(400, "Group name is required.");

  let groupRow: GroupRow | null = null;
  let lastError: string | null = null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data, error } = await db
      .from("groups")
      .insert({
        name: cleanName,
        currency: currency || "EUR",
        invite_code: makeInviteCode(),
        owner_profile_id: profile.id,
      })
      .select("id, name, currency, invite_code, owner_profile_id, created_at")
      .single();

    if (!error && data) {
      groupRow = data as GroupRow;
      break;
    }

    lastError = error?.message ?? "Could not create group.";
  }

  if (!groupRow) {
    throw new ApiError(500, lastError || "Could not create group.");
  }

  const { error: memberError } = await db.from("group_members").insert({
    group_id: groupRow.id,
    profile_id: profile.id,
    role: "owner",
  });

  if (memberError) throw new ApiError(500, memberError.message);

  const groups = await hydrateGroups(db, [groupRow.id]);
  return groups[0];
}

export async function deleteGroupForOwner(db: SupabaseClient, groupId: string, profileId: string) {
  await requireOwner(db, groupId, profileId);
  const { error } = await db.from("groups").delete().eq("id", groupId);
  if (error) throw new ApiError(500, error.message);
}

export async function removeMemberForOwner(db: SupabaseClient, groupId: string, targetProfileId: string, actorProfileId: string) {
  await requireOwner(db, groupId, actorProfileId);
  const group = await getGroupForMember(db, groupId, actorProfileId);
  const target = group.members.find((member) => member.id === targetProfileId);

  if (!target) throw new ApiError(404, "Member not found.");
  if (target.role === "owner") throw new ApiError(403, "The owner cannot be removed.");

  const expenseIds = group.expenses.map((expense) => expense.id);
  if (expenseIds.length > 0) {
    await assertDb(db.from("expense_splits").delete().in("expense_id", expenseIds).eq("profile_id", targetProfileId));
  }

  await assertDb(db.from("expenses").delete().eq("group_id", groupId).eq("paid_by_profile_id", targetProfileId));
  await assertDb(db.from("duties").delete().eq("group_id", groupId).eq("assignee_profile_id", targetProfileId));
  await assertDb(db.from("settlements").delete().eq("group_id", groupId).eq("from_profile_id", targetProfileId));
  await assertDb(db.from("settlements").delete().eq("group_id", groupId).eq("to_profile_id", targetProfileId));
  await assertDb(db.from("group_members").delete().eq("group_id", groupId).eq("profile_id", targetProfileId));

  return getGroupForMember(db, groupId, actorProfileId);
}

export async function leaveGroupForMember(db: SupabaseClient, groupId: string, profileId: string) {
  const group = await getGroupForMember(db, groupId, profileId);
  const me = group.members.find((member) => member.id === profileId);

  if (!me) throw new ApiError(404, "You are not a member of this group.");
  if (me.role === "owner") {
    throw new ApiError(403, "The owner cannot leave. Delete the group instead.");
  }

  const balance = calculateMemberBalances(group).find((entry) => entry.member.id === profileId)?.balance ?? 0;
  if (Math.abs(balance) > 0.01) {
    throw new ApiError(400, "Settle up your balance before leaving this group.");
  }

  const expenseIds = group.expenses.map((expense) => expense.id);
  if (expenseIds.length > 0) {
    await assertDb(db.from("expense_splits").delete().in("expense_id", expenseIds).eq("profile_id", profileId));
  }

  await assertDb(db.from("expenses").delete().eq("group_id", groupId).eq("paid_by_profile_id", profileId));
  await assertDb(db.from("duties").delete().eq("group_id", groupId).eq("assignee_profile_id", profileId));
  await assertDb(db.from("settlements").delete().eq("group_id", groupId).eq("from_profile_id", profileId));
  await assertDb(db.from("settlements").delete().eq("group_id", groupId).eq("to_profile_id", profileId));
  await assertDb(db.from("group_members").delete().eq("group_id", groupId).eq("profile_id", profileId));
}

export async function addInvitationForOwner(db: SupabaseClient, groupId: string, actorProfileId: string, email: string) {
  await requireOwner(db, groupId, actorProfileId);
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) throw new ApiError(400, "Email is required.");

  await assertDb(
    db.from("group_invitations").upsert(
      {
        group_id: groupId,
        email: cleanEmail,
        status: "Pending",
      },
      { onConflict: "group_id,email" },
    ),
  );

  return getGroupForMember(db, groupId, actorProfileId);
}

export async function deleteInvitationForOwner(db: SupabaseClient, groupId: string, actorProfileId: string, invitationId: string) {
  await requireOwner(db, groupId, actorProfileId);
  await assertDb(db.from("group_invitations").delete().eq("group_id", groupId).eq("id", invitationId));
  return getGroupForMember(db, groupId, actorProfileId);
}

export async function getInviteGroup(db: SupabaseClient, inviteCode: string) {
  const { data, error } = await db
    .from("groups")
    .select("id")
    .eq("invite_code", inviteCode)
    .maybeSingle();

  if (error) throw new ApiError(500, error.message);
  if (!data) throw new ApiError(404, "Invite not found.");

  const groups = await hydrateGroups(db, [data.id as string]);
  const group = groups[0];
  if (!group) throw new ApiError(404, "Invite not found.");
  return group;
}

export async function acceptInvite(db: SupabaseClient, profile: Profile, inviteCode: string, displayName: string, email: string | null) {
  const group = await getInviteGroup(db, inviteCode);
  const alreadyMember = group.members.some((member) => member.id === profile.id);

  if (!alreadyMember) {
    const { error } = await db.from("group_members").insert({
      group_id: group.id,
      profile_id: profile.id,
      role: "member",
    });

    if (error && error.code !== "23505") {
      throw new ApiError(500, error.message);
    }
  }

  if (displayName.trim()) {
    await assertDb(db.from("profiles").update({ full_name: displayName.trim() }).eq("id", profile.id));
  }

  if (email) {
    await db
      .from("group_invitations")
      .update({ status: "Accepted" })
      .eq("group_id", group.id)
      .eq("email", email.trim().toLowerCase());
  }

  return getGroupForMember(db, group.id, profile.id);
}

export async function addExpenseForMember(
  db: SupabaseClient,
  groupId: string,
  profileId: string,
  payload: {
    title: string;
    description?: string;
    amount: number;
    paidBy: string;
    participants: string[];
    splitType: "equal" | "custom";
    shares: Record<string, number>;
    receipt?: string;
    receiptName?: string;
    receiptType?: string;
  },
) {
  const group = await getGroupForMember(db, groupId, profileId);
  const memberIds = new Set(group.members.map((member) => member.id));
  const participants = payload.participants.filter((id) => memberIds.has(id));

  if (!payload.title.trim()) throw new ApiError(400, "Expense title is required.");
  if (!Number.isFinite(payload.amount) || payload.amount <= 0) throw new ApiError(400, "Expense amount must be greater than zero.");
  if (!memberIds.has(payload.paidBy)) throw new ApiError(400, "Payer must be a group member.");
  if (participants.length === 0) throw new ApiError(400, "Select at least one participant.");

  const shares =
    payload.splitType === "custom"
      ? Object.fromEntries(participants.map((id) => [id, roundMoney(Number(payload.shares[id] ?? 0))]))
      : buildEqualShares(payload.amount, participants);

  const expenseInsert = {
    group_id: groupId,
    paid_by_profile_id: payload.paidBy,
    title: payload.title.trim(),
    description: payload.description?.trim() || null,
    amount: roundMoney(payload.amount),
    currency: group.currency,
    split_type: payload.splitType,
    receipt_path: payload.receipt || null,
    receipt_name: payload.receiptName || null,
    receipt_type: payload.receiptType || null,
    created_by_profile_id: profileId,
  };
  let { data, error } = await db
    .from("expenses")
    .insert(expenseInsert)
    .select("id")
    .single();

  if (error && /description|receipt_name|receipt_type|column/i.test(error.message)) {
    const { description: _description, receipt_name: _receiptName, receipt_type: _receiptType, ...baseExpenseInsert } = expenseInsert;
    const retry = await db.from("expenses").insert(baseExpenseInsert).select("id").single();
    data = retry.data;
    error = retry.error;
  }

  if (error || !data) throw new ApiError(500, error?.message || "Could not save expense.");

  await saveExpenseMetadata(db, groupId, data.id as string, {
    description: payload.description?.trim() ?? "",
    receiptName: payload.receiptName,
    receiptType: payload.receiptType,
  });

  await assertDb(
    db.from("expense_splits").insert(
      Object.entries(shares).map(([participantId, shareAmount]) => ({
        expense_id: data.id as string,
        profile_id: participantId,
        share_amount: shareAmount,
      })),
    ),
  );

  const nextGroup = await getGroupForMember(db, groupId, profileId);
  const createdExpense = nextGroup.expenses.find((expense) => expense.id === data.id);
  if (createdExpense) {
    createdExpense.description = createdExpense.description ?? (payload.description?.trim() || undefined);
    createdExpense.receiptName = createdExpense.receiptName ?? payload.receiptName;
    createdExpense.receiptType = createdExpense.receiptType ?? payload.receiptType;
    createdExpense.receiptPath = createdExpense.receiptPath ?? payload.receipt;
  }

  return nextGroup;
}

export async function deleteExpenseForMember(db: SupabaseClient, groupId: string, profileId: string, expenseId: string) {
  await requireMember(db, groupId, profileId);
  await assertDb(db.from("expenses").delete().eq("group_id", groupId).eq("id", expenseId));
  return getGroupForMember(db, groupId, profileId);
}

export async function updateExpenseForMember(
  db: SupabaseClient,
  groupId: string,
  profileId: string,
  expenseId: string,
  payload: {
    title: string;
    description?: string;
    amount: number;
    paidBy: string;
    participants: string[];
    splitType: "equal" | "custom";
    shares: Record<string, number>;
    receipt?: string;
    receiptName?: string;
    receiptType?: string;
  },
) {
  const group = await getGroupForMember(db, groupId, profileId);
  const memberIds = new Set(group.members.map((member) => member.id));
  const participants = payload.participants.filter((id) => memberIds.has(id));

  if (!payload.title.trim()) throw new ApiError(400, "Expense title is required.");
  if (!Number.isFinite(payload.amount) || payload.amount <= 0) throw new ApiError(400, "Expense amount must be greater than zero.");
  if (!memberIds.has(payload.paidBy)) throw new ApiError(400, "Payer must be a group member.");
  if (participants.length === 0) throw new ApiError(400, "Select at least one participant.");

  const shares =
    payload.splitType === "custom"
      ? Object.fromEntries(participants.map((id) => [id, roundMoney(Number(payload.shares[id] ?? 0))]))
      : buildEqualShares(payload.amount, participants);

  const expenseUpdate = {
    paid_by_profile_id: payload.paidBy,
    title: payload.title.trim(),
    description: payload.description?.trim() || null,
    amount: roundMoney(payload.amount),
    split_type: payload.splitType,
    receipt_path: payload.receipt || null,
    receipt_name: payload.receiptName || null,
    receipt_type: payload.receiptType || null,
  };

  let { error } = await db
    .from("expenses")
    .update(expenseUpdate)
    .eq("group_id", groupId)
    .eq("id", expenseId);

  if (error && /description|receipt_name|receipt_type|column/i.test(error.message)) {
    const { description: _description, receipt_name: _receiptName, receipt_type: _receiptType, ...baseExpenseUpdate } = expenseUpdate;
    const retry = await db.from("expenses").update(baseExpenseUpdate).eq("group_id", groupId).eq("id", expenseId);
    error = retry.error;
  }

  if (error) throw new ApiError(500, error.message);

  await saveExpenseMetadata(db, groupId, expenseId, {
    description: payload.description?.trim() ?? "",
    receiptName: payload.receiptName,
    receiptType: payload.receiptType,
  });

  await assertDb(db.from("expense_splits").delete().eq("expense_id", expenseId));
  await assertDb(
    db.from("expense_splits").insert(
      Object.entries(shares).map(([participantId, shareAmount]) => ({
        expense_id: expenseId,
        profile_id: participantId,
        share_amount: shareAmount,
      })),
    ),
  );

  const nextGroup = await getGroupForMember(db, groupId, profileId);
  const updatedExpense = nextGroup.expenses.find((expense) => expense.id === expenseId);
  if (updatedExpense) {
    updatedExpense.description = updatedExpense.description ?? (payload.description?.trim() || undefined);
    updatedExpense.receiptName = updatedExpense.receiptName ?? payload.receiptName;
    updatedExpense.receiptType = updatedExpense.receiptType ?? payload.receiptType;
    updatedExpense.receiptPath = updatedExpense.receiptPath ?? payload.receipt;
  }

  return nextGroup;
}

export async function recordSettlementForMember(
  db: SupabaseClient,
  groupId: string,
  profileId: string,
  payload: { from: string; to: string; amount: number; note?: string },
) {
  const group = await getGroupForMember(db, groupId, profileId);
  const memberIds = new Set(group.members.map((member) => member.id));

  if (!memberIds.has(payload.from) || !memberIds.has(payload.to)) throw new ApiError(400, "Settlement members must be in the group.");
  if (!Number.isFinite(payload.amount) || payload.amount <= 0) throw new ApiError(400, "Settlement amount must be greater than zero.");

  await assertDb(
    db.from("settlements").insert({
      group_id: groupId,
      from_profile_id: payload.from,
      to_profile_id: payload.to,
      amount: roundMoney(payload.amount),
      currency: group.currency,
      note: payload.note || null,
      created_by_profile_id: profileId,
    }),
  );

  return getGroupForMember(db, groupId, profileId);
}

export async function deleteSettlementForMember(db: SupabaseClient, groupId: string, profileId: string, settlementId: string) {
  await requireMember(db, groupId, profileId);
  await assertDb(db.from("settlements").delete().eq("group_id", groupId).eq("id", settlementId));
  return getGroupForMember(db, groupId, profileId);
}

export async function addDutyForMember(
  db: SupabaseClient,
  groupId: string,
  profileId: string,
  payload: { title: string; assignee?: string; assignees?: string[]; due?: string; linkedExpense?: string },
) {
  const group = await getGroupForMember(db, groupId, profileId);
  const memberIds = new Set(group.members.map((member) => member.id));
  const assignees = Array.from(new Set((payload.assignees?.length ? payload.assignees : [payload.assignee]).filter(Boolean) as string[]))
    .filter((memberId) => memberIds.has(memberId));

  if (!payload.title.trim()) throw new ApiError(400, "Duty title is required.");
  if (assignees.length === 0) throw new ApiError(400, "Choose at least one assignee from the group.");

  const { data, error } = await db
    .from("duties")
    .insert({
      group_id: groupId,
      title: payload.title.trim(),
      description: payload.linkedExpense?.trim() || null,
      assignee_profile_id: assignees[0],
      due_date: payload.due && payload.due !== "No due date" ? payload.due : null,
      status: "pending",
      created_by_profile_id: profileId,
    })
    .select("id")
    .single();

  if (error || !data) throw new ApiError(500, error?.message || "Could not save duty.");

  await saveDutyMetadata(db, groupId, data.id as string, { assignees });

  return getGroupForMember(db, groupId, profileId);
}

export async function updateDutyStatusForMember(
  db: SupabaseClient,
  groupId: string,
  profileId: string,
  dutyId: string,
  status: Duty["status"],
) {
  await requireMember(db, groupId, profileId);
  await assertDb(db.from("duties").update({ status: toDbDutyStatus(status) }).eq("group_id", groupId).eq("id", dutyId));
  return getGroupForMember(db, groupId, profileId);
}

export async function updateDutyForMember(
  db: SupabaseClient,
  groupId: string,
  profileId: string,
  dutyId: string,
  payload: {
    title?: string;
    assignee?: string;
    assignees?: string[];
    due?: string;
    linkedExpense?: string;
    status?: Duty["status"];
  },
) {
  const group = await getGroupForMember(db, groupId, profileId);
  const memberIds = new Set(group.members.map((member) => member.id));
  const update: Record<string, string | null> = {};
  let assignees: string[] | null = null;

  if (payload.title !== undefined) {
    const cleanTitle = payload.title.trim();
    if (!cleanTitle) throw new ApiError(400, "Duty title is required.");
    update.title = cleanTitle;
  }

  if (payload.linkedExpense !== undefined) {
    update.description = payload.linkedExpense.trim() || null;
  }

  if (payload.due !== undefined) {
    update.due_date = payload.due && payload.due !== "No due date" ? payload.due : null;
  }

  if (payload.status !== undefined) {
    update.status = toDbDutyStatus(payload.status);
  }

  if (payload.assignees !== undefined || payload.assignee !== undefined) {
    assignees = Array.from(new Set((payload.assignees?.length ? payload.assignees : [payload.assignee]).filter(Boolean) as string[]))
      .filter((memberId) => memberIds.has(memberId));

    if (assignees.length === 0) throw new ApiError(400, "Choose at least one assignee from the group.");
    update.assignee_profile_id = assignees[0];
  }

  if (Object.keys(update).length > 0) {
    await assertDb(db.from("duties").update(update).eq("group_id", groupId).eq("id", dutyId));
  }

  if (assignees) {
    await saveDutyMetadata(db, groupId, dutyId, { assignees });
  }

  return getGroupForMember(db, groupId, profileId);
}

export async function deleteDutyForMember(db: SupabaseClient, groupId: string, profileId: string, dutyId: string) {
  await requireMember(db, groupId, profileId);
  await assertDb(db.from("duties").delete().eq("group_id", groupId).eq("id", dutyId));
  return getGroupForMember(db, groupId, profileId);
}

async function requireMember(db: SupabaseClient, groupId: string, profileId: string) {
  const { data, error } = await db
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) throw new ApiError(500, error.message);
  if (!data) throw new ApiError(403, "You are not a member of this group.");
  return data as { role: "owner" | "member" };
}

async function requireOwner(db: SupabaseClient, groupId: string, profileId: string) {
  const membership = await requireMember(db, groupId, profileId);
  if (membership.role !== "owner") {
    throw new ApiError(403, "Only the group owner can do that.");
  }
}

async function hydrateGroups(db: SupabaseClient, groupIds: string[]) {
  if (groupIds.length === 0) return [];

  const [
    groupsResult,
    membersResult,
    expenseRows,
    settlementsResult,
    dutiesResult,
    invitations,
  ] = await Promise.all([
    db.from("groups").select("id, name, currency, invite_code, owner_profile_id, created_at").in("id", groupIds),
    db.from("group_members").select("group_id, profile_id, role, joined_at").in("group_id", groupIds),
    readExpenses(db, groupIds),
    db
      .from("settlements")
      .select("id, group_id, from_profile_id, to_profile_id, amount, currency, note, settled_at")
      .in("group_id", groupIds)
      .order("settled_at", { ascending: false }),
    db
      .from("duties")
      .select("id, group_id, title, description, assignee_profile_id, due_date, status, linked_expense_id, created_at")
      .in("group_id", groupIds)
      .order("created_at", { ascending: false }),
    readInvitations(db, groupIds),
  ]);

  for (const result of [groupsResult, membersResult, settlementsResult, dutiesResult]) {
    if (result.error) throw new ApiError(500, result.error.message);
  }

  const groupRows = (groupsResult.data ?? []) as GroupRow[];
  const memberRows = (membersResult.data ?? []) as MemberRow[];
  const settlementRows = (settlementsResult.data ?? []) as SettlementRow[];
  const dutyRows = (dutiesResult.data ?? []) as DutyRow[];
  const splitRows = await readSplitsForExpenses(db, expenseRows.map((expense) => expense.id));
  const profileIds = Array.from(new Set(memberRows.map((member) => member.profile_id)));
  const profiles = await readProfiles(db, profileIds);
  const splitExpenseIds = new Set(expenseRows.map((expense) => expense.id));
  const receiptUrls = await readReceiptUrls(
    db,
    expenseRows.map((expense) => expense.receipt_path).filter((path): path is string => Boolean(path)),
  );
  const expenseMetadata = await readExpenseMetadata(db, expenseRows);
  const dutyMetadata = await readDutyMetadata(db, dutyRows);
  const orderedGroups = groupRows.sort((a, b) => groupIds.indexOf(a.id) - groupIds.indexOf(b.id));

  return orderedGroups.map((group): Group => {
    const members = memberRows
      .filter((member) => member.group_id === group.id)
      .map((member): Member => {
        const profile = profiles.get(member.profile_id);
        const name = profile?.full_name || profile?.email || "Member";

        return {
          id: member.profile_id,
          accountId: profile?.clerk_user_id,
          name,
          avatar: initials(name),
          role: member.role,
        };
      });

    const expenses = expenseRows
      .filter((expense) => expense.group_id === group.id)
      .map((expense): Expense => {
        const expenseSplits = splitRows.filter((split) => split.expense_id === expense.id && splitExpenseIds.has(split.expense_id));
        const participants = expenseSplits.map((split) => split.profile_id);
        const shares = Object.fromEntries(expenseSplits.map((split) => [split.profile_id, toNumber(split.share_amount)]));
        const metadata = expenseMetadata.get(expense.id);

        return {
          id: expense.id,
          title: expense.title,
          description: expense.description ?? metadata?.description ?? undefined,
          amount: toNumber(expense.amount),
          currency: expense.currency,
          paidBy: expense.paid_by_profile_id,
          date: formatDate(expense.created_at),
          participants,
          splitType: expense.split_type,
          shares,
          receipt: expense.receipt_path ? receiptUrls.get(expense.receipt_path) ?? expense.receipt_path : undefined,
          receiptPath: expense.receipt_path ?? undefined,
          receiptName: expense.receipt_name ?? metadata?.receiptName ?? filenameFromPath(expense.receipt_path) ?? undefined,
          receiptType: expense.receipt_type ?? metadata?.receiptType ?? inferReceiptType(expense.receipt_path) ?? undefined,
        };
      });

    return {
      id: group.id,
      ownerId: profiles.get(group.owner_profile_id)?.clerk_user_id ?? group.owner_profile_id,
      name: group.name,
      inviteCode: group.invite_code,
      currency: group.currency,
      members,
      invitations: invitations
        .filter((invite) => invite.group_id === group.id)
        .map((invite): Invitation => ({
          id: invite.id,
          email: invite.email,
          status: invite.status,
          sentAt: formatDateTime(invite.sent_at),
        })),
      expenses,
      settlements: settlementRows
        .filter((settlement) => settlement.group_id === group.id)
        .map((settlement): Settlement => ({
          id: settlement.id,
          from: settlement.from_profile_id,
          to: settlement.to_profile_id,
          amount: toNumber(settlement.amount),
          currency: settlement.currency,
          note: settlement.note ?? undefined,
          date: formatDate(settlement.settled_at),
        })),
      duties: dutyRows
        .filter((duty) => duty.group_id === group.id)
        .map((duty): Duty => {
          const savedAssignees = dutyMetadata.get(duty.id)?.assignees;
          const assignees = (savedAssignees?.length ? savedAssignees : [duty.assignee_profile_id].filter(Boolean) as string[])
            .filter((assignee) => members.some((member) => member.id === assignee));

          return {
            id: duty.id,
            title: duty.title,
            assignee: assignees[0] ?? duty.assignee_profile_id ?? "",
            assignees,
            due: duty.due_date ?? "No due date",
            status: fromDbDutyStatus(duty.status),
            linkedExpense: duty.description ?? duty.linked_expense_id ?? undefined,
          };
        }),
    };
  });
}

async function readProfiles(db: SupabaseClient, profileIds: string[]) {
  if (profileIds.length === 0) return new Map<string, Profile>();

  const { data, error } = await db
    .from("profiles")
    .select("id, clerk_user_id, email, full_name, avatar_url")
    .in("id", profileIds);

  if (error) throw new ApiError(500, error.message);
  return new Map(((data ?? []) as Profile[]).map((profile) => [profile.id, profile]));
}

async function readSplitsForExpenses(db: SupabaseClient, expenseIds: string[]) {
  if (expenseIds.length === 0) return [] as SplitRow[];

  const { data, error } = await db
    .from("expense_splits")
    .select("expense_id, profile_id, share_amount")
    .in("expense_id", expenseIds);

  if (error) throw new ApiError(500, error.message);
  return (data ?? []) as SplitRow[];
}

function calculateSummarySettlementCount({
  memberIds,
  expenses,
  splits,
  settlements,
}: {
  currency: string;
  memberIds: string[];
  expenses: Pick<ExpenseRow, "id" | "paid_by_profile_id" | "amount">[];
  splits: Pick<SplitRow, "expense_id" | "profile_id" | "share_amount">[];
  settlements: Pick<SettlementRow, "from_profile_id" | "to_profile_id" | "amount">[];
}) {
  const balances = new Map(memberIds.map((memberId) => [memberId, 0]));

  for (const expense of expenses) {
    balances.set(expense.paid_by_profile_id, (balances.get(expense.paid_by_profile_id) ?? 0) + toNumber(expense.amount));

    for (const split of splits.filter((candidate) => candidate.expense_id === expense.id)) {
      balances.set(split.profile_id, (balances.get(split.profile_id) ?? 0) - toNumber(split.share_amount));
    }
  }

  for (const settlement of settlements) {
    balances.set(settlement.from_profile_id, (balances.get(settlement.from_profile_id) ?? 0) + toNumber(settlement.amount));
    balances.set(settlement.to_profile_id, (balances.get(settlement.to_profile_id) ?? 0) - toNumber(settlement.amount));
  }

  const debtors = Array.from(balances.values()).filter((balance) => balance < -0.01).map((balance) => Math.abs(balance));
  const creditors = Array.from(balances.values()).filter((balance) => balance > 0.01);
  let debtorIndex = 0;
  let creditorIndex = 0;
  let count = 0;

  while (debtors[debtorIndex] && creditors[creditorIndex]) {
    const amount = Math.min(debtors[debtorIndex], creditors[creditorIndex]);
    debtors[debtorIndex] = roundMoney(debtors[debtorIndex] - amount);
    creditors[creditorIndex] = roundMoney(creditors[creditorIndex] - amount);
    count += 1;

    if (debtors[debtorIndex] < 0.01) debtorIndex += 1;
    if (creditors[creditorIndex] < 0.01) creditorIndex += 1;
  }

  return count;
}

async function readExpenses(db: SupabaseClient, groupIds: string[]) {
  const fullSelect =
    "id, group_id, paid_by_profile_id, title, description, amount, currency, split_type, receipt_path, receipt_name, receipt_type, created_at";
  const baseSelect = "id, group_id, paid_by_profile_id, title, amount, currency, split_type, receipt_path, created_at";
  const fullResult = await db.from("expenses").select(fullSelect).in("group_id", groupIds).order("created_at", { ascending: false });

  if (!fullResult.error) {
    return (fullResult.data ?? []) as ExpenseRow[];
  }

  if (!/description|receipt_name|receipt_type|column|schema cache/i.test(fullResult.error.message)) {
    throw new ApiError(500, fullResult.error.message);
  }

  const { data, error } = await db.from("expenses").select(baseSelect).in("group_id", groupIds).order("created_at", { ascending: false });
  if (error) throw new ApiError(500, error.message);
  return (data ?? []) as ExpenseRow[];
}

async function readReceiptUrls(db: SupabaseClient, paths: string[]) {
  const uniquePaths = Array.from(new Set(paths));
  if (uniquePaths.length === 0) return new Map<string, string>();

  const { data, error } = await db.storage.from("receipts").createSignedUrls(uniquePaths, 60 * 60);
  if (error || !data) return new Map<string, string>();

  return new Map(
    data
      .filter((item) => item.path && item.signedUrl)
      .map((item) => [item.path as string, item.signedUrl as string]),
  );
}

async function saveExpenseMetadata(db: SupabaseClient, groupId: string, expenseId: string, metadata: ExpenseMetadata) {
  const cleanMetadata: ExpenseMetadata = {};

  if ("description" in metadata) {
    cleanMetadata.description = metadata.description?.trim() ?? "";
  }

  if (metadata.receiptName?.trim()) {
    cleanMetadata.receiptName = metadata.receiptName.trim();
  }

  if (metadata.receiptType?.trim()) {
    cleanMetadata.receiptType = metadata.receiptType.trim();
  }

  if (Object.keys(cleanMetadata).length === 0) return;

  await db.storage.from("receipts").upload(expenseMetadataPath(groupId, expenseId), Buffer.from(JSON.stringify(cleanMetadata)), {
    contentType: "application/json",
    upsert: true,
  });
}

async function readExpenseMetadata(db: SupabaseClient, expenseRows: ExpenseRow[]) {
  const entries = await Promise.all(
    expenseRows.map(async (expense) => {
      const { data, error } = await db.storage.from("receipts").download(expenseMetadataPath(expense.group_id, expense.id));
      if (error || !data) return null;

      try {
        const parsed = JSON.parse(await data.text()) as ExpenseMetadata;
        return [expense.id, parsed] as const;
      } catch {
        return null;
      }
    }),
  );

  return new Map(entries.filter((entry): entry is readonly [string, ExpenseMetadata] => Boolean(entry)));
}

function expenseMetadataPath(groupId: string, expenseId: string) {
  return `expense-metadata/${groupId}/${expenseId}.json`;
}

async function saveDutyMetadata(db: SupabaseClient, groupId: string, dutyId: string, metadata: DutyMetadata) {
  const cleanAssignees = Array.from(new Set(metadata.assignees ?? [])).filter(Boolean);
  if (cleanAssignees.length === 0) return;

  await db.storage.from("receipts").upload(dutyMetadataPath(groupId, dutyId), Buffer.from(JSON.stringify({ assignees: cleanAssignees })), {
    contentType: "application/json",
    upsert: true,
  });
}

async function readDutyMetadata(db: SupabaseClient, dutyRows: DutyRow[]) {
  const entries = await Promise.all(
    dutyRows.map(async (duty) => {
      const { data, error } = await db.storage.from("receipts").download(dutyMetadataPath(duty.group_id, duty.id));
      if (error || !data) return null;

      try {
        const parsed = JSON.parse(await data.text()) as DutyMetadata;
        return [duty.id, parsed] as const;
      } catch {
        return null;
      }
    }),
  );

  return new Map(entries.filter((entry): entry is readonly [string, DutyMetadata] => Boolean(entry)));
}

function dutyMetadataPath(groupId: string, dutyId: string) {
  return `duty-metadata/${groupId}/${dutyId}.json`;
}

async function readInvitations(db: SupabaseClient, groupIds: string[]) {
  const { data, error } = await db
    .from("group_invitations")
    .select("id, group_id, email, status, sent_at")
    .in("group_id", groupIds)
    .order("sent_at", { ascending: false });

  if (error) {
    return [] as InvitationRow[];
  }

  return (data ?? []) as InvitationRow[];
}

async function assertDb<T extends { error: { message: string } | null }>(promise: PromiseLike<T>) {
  const result = await promise;
  if (result.error) throw new ApiError(500, friendlySupabaseError(result.error.message));
  return result;
}

function makeInviteCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function toNumber(value: number | string) {
  return typeof value === "number" ? value : Number(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fromDbDutyStatus(status: DutyRow["status"]): Duty["status"] {
  if (status === "done") return "Done";
  return "Assigned";
}

function toDbDutyStatus(status: Duty["status"]) {
  if (status === "Done") return "done";
  return "pending";
}

function filenameFromPath(path?: string | null) {
  if (!path) return null;
  return decodeURIComponent(path.split("/").pop()?.replace(/^\d+-/, "") || "Receipt");
}

function inferReceiptType(path?: string | null) {
  const filename = path?.toLowerCase() ?? "";
  if (/\.(png|jpg|jpeg|gif|webp|avif)$/.test(filename)) return "image/*";
  if (filename.endsWith(".pdf")) return "application/pdf";
  return null;
}

function friendlySupabaseError(message: string) {
  if (/Could not find the table|schema cache|PGRST205/i.test(message)) {
    return "Supabase tables are missing. Run database/schema.sql in your Supabase SQL editor for this project.";
  }

  return message;
}
