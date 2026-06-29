"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import {
  X,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Circle,
  Copy,
  LogOut,
  Pencil,
  Mail,
  Paperclip,
  Plus,
  ReceiptText,
  Scale,
  Search,
  Send,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import type { Duty, Expense, Group, Settlement } from "@/lib/types";
import {
  addDuty as addDutyRequest,
  addExpense as addExpenseRequest,
  deleteDuty as deleteDutyRequest,
  deleteExpense as deleteExpenseRequest,
  deleteInvitation as deleteInvitationRequest,
  deleteSettlement as deleteSettlementRequest,
  getGroup,
  leaveGroup,
  recordSettlement as recordSettlementRequest,
  removeMember,
  renameGroup,
  updateDuty,
  updateDutyStatus,
  updateExpense as updateExpenseRequest,
  uploadReceipt,
} from "@/lib/api-client";
import {
  buildEqualShares,
  calculateMemberBalances,
  calculateSettlements,
  isAccountMember,
  isGroupOwner,
  memberName,
  parseAmount,
  roundMoney,
} from "@/lib/group-model";

type Tab = "expenses" | "balances" | "duties";
type ConfirmAction = {
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
};

export function GroupWorkspace({ accountId, groupId, initialTab }: { accountId: string; groupId: string; initialTab: Tab }) {
  const router = useRouter();
  const [group, setGroup] = useState<Group | null>(null);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getGroup(groupId)
      .then((nextGroup) => {
        setGroup(nextGroup);
        setError(null);
      })
      .catch((caught: Error) => {
        setGroup(null);
        setError(caught.message);
      })
      .finally(() => setLoading(false));
  }, [groupId]);

  function updateGroup(next: Group) {
    setGroup(next);
  }

  if (loading) {
    return <GroupWorkspaceSkeleton />;
  }

  if (!group) {
    return (
      <section className="panel panel-pad">
        <p className="eyebrow">Group not found</p>
        <h1>No access or missing group</h1>
        <p className="lead">{error ?? "Groups you create from the Create page will appear here."}</p>
        <Link className="button primary block-action" href="/groups/create">
          Create group
        </Link>
      </section>
    );
  }

  const settlements = calculateSettlements(group);
  const totalSpend = group.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const canManageGroup = isGroupOwner(group, accountId);

  if (!isAccountMember(group, accountId)) {
    return (
      <section className="panel panel-pad">
        <p className="eyebrow">No access</p>
        <h1>You are not in this group</h1>
        <p className="lead">Use a valid invite link to join this group with the current account.</p>
        <Link className="button primary block-action" href="/groups">
          View groups
        </Link>
      </section>
    );
  }

  return (
    <div className="grid">
      <section className="balance-card group-hero">
        <div className="group-hero-title-row">
          <h1 className="group-hero-name">{group.name}</h1>
          {canManageGroup && (
            <button className="group-hero-edit" onClick={() => setRenameOpen(true)} type="button" aria-label="Rename group">
              <Pencil size={16} />
            </button>
          )}
        </div>

        <p className="group-hero-label">Total spend · {group.currency}</p>
        <p className="group-hero-amount">
          {totalSpend.toFixed(2)}
          <span className="cur">{group.currency}</span>
        </p>

        <div className="group-hero-foot">
          <button className="group-hero-members" onClick={() => setMembersOpen(true)} type="button">
            <span className="avatar-row light">
              {group.members.slice(0, 3).map((member) => (
                <span className="avatar" key={member.id}>
                  {member.avatar}
                </span>
              ))}
            </span>
            <span>
              {group.members.length} member{group.members.length !== 1 ? "s" : ""}
            </span>
            <ChevronRight size={15} />
          </button>
          {canManageGroup && (
            <button className="group-hero-chip" onClick={() => setInviteOpen(true)} type="button">
              <Mail size={15} /> Invite
            </button>
          )}
        </div>
      </section>

      <div className="tabs group-tabs" role="tablist" aria-label="Group tabs">
        {(["expenses", "balances", "duties"] as Tab[]).map((item) => (
          <button
            className={`tab ${tab === item ? "active" : ""}`}
            key={item}
            onClick={() => setTab(item)}
            role="tab"
            type="button"
          >
            {item}
          </button>
        ))}
      </div>

      <section className="mobile-stat-row group-stats">
        <div className="mobile-stat-card">
          <span className="mobile-stat-icon teal">
            <ReceiptText size={19} />
          </span>
          <span className="mobile-stat-value">{group.expenses.length}</span>
          <span className="mobile-stat-label">Expenses</span>
        </div>
        <div className="mobile-stat-card">
          <span className="mobile-stat-icon tomato">
            <Scale size={19} />
          </span>
          <span className="mobile-stat-value">{settlements.length}</span>
          <span className="mobile-stat-label">To settle</span>
        </div>
        <div className="mobile-stat-card">
          <span className="mobile-stat-icon blue">
            <Paperclip size={19} />
          </span>
          <span className="mobile-stat-value">{group.expenses.filter((expense) => expense.receipt).length}</span>
          <span className="mobile-stat-label">Receipts</span>
        </div>
      </section>

      {tab === "expenses" && <ExpensesPanel accountId={accountId} group={group} onUpdate={updateGroup} requestConfirm={setConfirmAction} />}
      {tab === "balances" && (
        <BalancesPanel
          group={group}
          onUpdate={updateGroup}
          requestConfirm={setConfirmAction}
          settlements={settlements}
        />
      )}
      {tab === "duties" && <DutiesPanel group={group} onUpdate={updateGroup} requestConfirm={setConfirmAction} />}

      {membersOpen && (
        <MembersDialog
          accountId={accountId}
          group={group}
          onClose={() => setMembersOpen(false)}
          onOpenInvite={() => {
            setMembersOpen(false);
            setInviteOpen(true);
          }}
          onLeave={() => {
            setMembersOpen(false);
            setLeaveOpen(true);
          }}
          onUpdate={updateGroup}
          requestConfirm={setConfirmAction}
        />
      )}
      {leaveOpen && (
        <LeaveGroupDialog
          accountId={accountId}
          group={group}
          onClose={() => setLeaveOpen(false)}
          onViewBalances={() => {
            setLeaveOpen(false);
            setTab("balances");
          }}
          onLeft={() => router.push("/groups")}
        />
      )}
      {inviteOpen && canManageGroup && <InviteDialog group={group} onClose={() => setInviteOpen(false)} onUpdate={updateGroup} />}
      {renameOpen && canManageGroup && (
        <RenameGroupDialog
          group={group}
          onClose={() => setRenameOpen(false)}
          onSaved={(nextGroup) => {
            updateGroup(nextGroup);
            setRenameOpen(false);
          }}
        />
      )}
      {confirmAction && (
        <ConfirmDialog
          action={confirmAction}
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => {
            confirmAction.onConfirm();
            setConfirmAction(null);
          }}
        />
      )}
    </div>
  );
}

function GroupWorkspaceSkeleton() {
  return (
    <div className="grid">
      <section className="balance-card group-hero group-loading-hero">
        <div className="loading-line title light" />
        <div className="loading-line short light" />
        <div className="loading-line amount light" />
        <div className="group-hero-foot">
          <span className="loading-pill light" />
          <span className="loading-pill light" />
        </div>
      </section>

      <div className="tabs group-tabs loading-tabs" aria-hidden="true">
        <span className="tab active" />
        <span className="tab" />
        <span className="tab" />
      </div>

      <section className="mobile-stat-row group-stats">
        <span className="mobile-stat-card loading-tile" />
        <span className="mobile-stat-card loading-tile" />
        <span className="mobile-stat-card loading-tile" />
      </section>

      <section className="panel panel-pad">
        <div className="section-head">
          <div>
            <div className="loading-line short" />
            <div className="loading-line title" />
          </div>
          <span className="button loading-button" />
        </div>
        <div className="expense-list group-loading-list">
          <div className="expense-row loading-row" />
          <div className="expense-row loading-row" />
          <div className="expense-row loading-row" />
        </div>
      </section>
    </div>
  );
}

function RenameGroupDialog({
  group,
  onClose,
  onSaved,
}: {
  group: Group;
  onClose: () => void;
  onSaved: (group: Group) => void;
}) {
  const [name, setName] = useState(group.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cleanName = name.trim();
  const canSave = cleanName.length > 0 && cleanName !== group.name && !saving;

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;

    setSaving(true);
    setError(null);

    try {
      onSaved(await renameGroup(group.id, cleanName));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not rename group.");
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="modal small-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rename-group-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="section-head">
          <div>
            <p className="eyebrow">Group settings</p>
            <h2 id="rename-group-title">Rename group</h2>
          </div>
          <button className="icon-button" onClick={onClose} type="button" aria-label="Close rename dialog">
            <X size={18} />
          </button>
        </div>

        <form className="form-grid form-offset" onSubmit={handleSave}>
          <label className="field">
            <span>Group name</span>
            <input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="202 Flat" />
          </label>
          {error && <p className="notice error">{error}</p>}
          <div className="modal-actions">
            <button className="button teal" disabled={!canSave} type="submit">
              {saving ? "Saving..." : "Save name"}
            </button>
            <button className="button ghost" onClick={onClose} type="button">
              Cancel
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function MembersDialog({
  accountId,
  group,
  onClose,
  onOpenInvite,
  onLeave,
  onUpdate,
  requestConfirm,
}: {
  accountId: string;
  group: Group;
  onClose: () => void;
  onOpenInvite: () => void;
  onLeave: () => void;
  onUpdate: (group: Group) => void;
  requestConfirm: (action: ConfirmAction) => void;
}) {
  const canManageGroup = isGroupOwner(group, accountId);
  const isMemberNotOwner = !canManageGroup && group.members.some((member) => member.accountId === accountId);

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="modal members-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="members-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
      <div className="section-head">
        <div>
          <p className="eyebrow">People</p>
          <h2 id="members-dialog-title">Members</h2>
        </div>
        <span className="pill blue">{group.members.length}</span>
        <button className="icon-button" onClick={onClose} type="button" aria-label="Close members dialog">
          <X size={18} />
        </button>
      </div>

      <div className="member-summary-card">
        <div className="avatar-row">
          {group.members.slice(0, 5).map((member) => (
            <span className="avatar" key={member.id}>
              {member.avatar}
            </span>
          ))}
        </div>
        <span>{canManageGroup ? "Manage access and invite new people." : "Group members and roles."}</span>
      </div>

      <div className="list compact-list modal-list">
        {group.members.map((member) => (
          <div className="list-row member-row" key={member.id}>
            <span className="member-row-main">
              <span className="avatar avatar-solo">
                {member.avatar}
              </span>
              <span>
                <strong>{member.name}</strong>
                <br />
                <span className="muted">{member.role === "owner" ? "Owner" : "Member"}</span>
              </span>
            </span>
            {member.role === "owner" ? (
              <span className="pill green">Protected</span>
            ) : canManageGroup ? (
              <button
                className="icon-button danger"
                disabled={group.members.length <= 1}
                onClick={() =>
                  requestConfirm({
                    title: "Delete member?",
                    body: `Remove ${member.name}. Related expenses and duties assigned to this member will also be removed.`,
                    confirmLabel: "Delete member",
                    onConfirm: async () => onUpdate(await removeMember(group.id, member.id)),
                  })
                }
                type="button"
                aria-label={`Delete ${member.name}`}
              >
                <Trash2 size={17} />
              </button>
            ) : (
              <span className="pill blue">Member</span>
            )}
          </div>
        ))}
      </div>

      {canManageGroup && (
        <button className="button teal full-width-action" onClick={onOpenInvite} type="button">
          <Mail size={16} /> Invite people
        </button>
      )}
      {isMemberNotOwner && (
        <button className="button leave-action" onClick={onLeave} type="button">
          <LogOut size={16} /> Leave group
        </button>
      )}
      </section>
    </div>
  );
}

function LeaveGroupDialog({
  accountId,
  group,
  onClose,
  onViewBalances,
  onLeft,
}: {
  accountId: string;
  group: Group;
  onClose: () => void;
  onViewBalances: () => void;
  onLeft: () => void;
}) {
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const myBalance =
    calculateMemberBalances(group).find((entry) => entry.member.accountId === accountId)?.balance ?? 0;
  const settled = Math.abs(myBalance) <= 0.01;

  async function handleLeave() {
    if (!settled || leaving) return;
    setLeaving(true);
    setError(null);
    try {
      await leaveGroup(group.id);
      onLeft();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not leave the group.");
      setLeaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="modal small-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="leave-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="section-head">
          <div>
            <p className="eyebrow">{settled ? "Leave" : "Not settled"}</p>
            <h2 id="leave-dialog-title">Leave {group.name}?</h2>
          </div>
          <button className="icon-button" onClick={onClose} type="button" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {settled ? (
          <>
            <p className="muted" style={{ marginTop: 4 }}>
              You&apos;re all settled up. Leaving removes you from this group and you&apos;ll lose access to its
              expenses, balances, and duties.
            </p>
            {error && <p className="notice error">{error}</p>}
            <div className="modal-actions">
              <button className="button danger-solid" disabled={leaving} onClick={handleLeave} type="button">
                <LogOut size={16} /> {leaving ? "Leaving..." : "Leave group"}
              </button>
              <button className="button ghost" onClick={onClose} type="button">
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="leave-blocked">
              <span className="leave-blocked-icon">
                <Scale size={20} />
              </span>
              <div>
                <strong>
                  {myBalance < 0
                    ? `You still owe ${Math.abs(myBalance).toFixed(2)} ${group.currency}`
                    : `You're still owed ${myBalance.toFixed(2)} ${group.currency}`}
                </strong>
                <p className="muted" style={{ margin: "2px 0 0" }}>
                  Settle up so the group stays balanced, then you can leave.
                </p>
              </div>
            </div>
            <div className="modal-actions">
              <button className="button teal" onClick={onViewBalances} type="button">
                <Scale size={16} /> Go to balances
              </button>
              <button className="button ghost" onClick={onClose} type="button">
                Cancel
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function ExpensesPanel({
  accountId,
  group,
  onUpdate,
  requestConfirm,
}: {
  accountId: string;
  group: Group;
  onUpdate: (group: Group) => void;
  requestConfirm: (action: ConfirmAction) => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState(group.members[0]?.id ?? "");
  const [splitType, setSplitType] = useState<"equal" | "custom">("equal");
  const [participantIds, setParticipantIds] = useState<string[]>(group.members.map((member) => member.id));
  const [customShares, setCustomShares] = useState<Record<string, string>>({});
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const [localExpenseDetails, setLocalExpenseDetails] = useState<Record<string, Partial<Expense>>>({});
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [selectedExpenseEditing, setSelectedExpenseEditing] = useState(false);
  const [expenseQuery, setExpenseQuery] = useState("");
  const [expenseFilter, setExpenseFilter] = useState<"all" | "unpaid" | "paidByMe" | "hasReceipt">("all");
  const [expenseFilterOpen, setExpenseFilterOpen] = useState(false);
  const [expenseDateFrom, setExpenseDateFrom] = useState("");
  const [expenseDateTo, setExpenseDateTo] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const displayedExpenses = group.expenses.map((expense) => ({
    ...expense,
    ...(localExpenseDetails[expense.id] ?? {}),
  }));
  const currentMemberId = group.members.find((member) => member.accountId === accountId)?.id;
  const filteredExpenses = displayedExpenses.filter((expense) =>
    expenseMatchesFilters(group, expense, {
      query: expenseQuery,
      filter: expenseFilter,
      currentMemberId,
      dateFrom: expenseDateFrom,
      dateTo: expenseDateTo,
    }),
  );
  const numericAmount = parseAmount(amount);
  const selectedMembers = group.members.filter((member) => participantIds.includes(member.id));
  const equalShares = Number.isFinite(numericAmount) && numericAmount > 0 ? buildEqualShares(numericAmount, participantIds) : {};
  const customTotal = selectedMembers.reduce((sum, member) => sum + (parseAmount(customShares[member.id]) || 0), 0);
  const customDifference = Number.isFinite(numericAmount) ? roundMoney(numericAmount - customTotal) : 0;
  const expenseFilterOptions = [
    { value: "all", label: "All" },
    { value: "unpaid", label: "Unpaid" },
    { value: "paidByMe", label: "Paid by me" },
    { value: "hasReceipt", label: "Has receipt" },
  ] as const;
  const expenseFilterLabel = expenseFilterOptions.find((option) => option.value === expenseFilter)?.label ?? "All";
  const canSave =
    title.trim().length > 0 &&
    paidBy.length > 0 &&
    selectedMembers.length > 0 &&
    Number.isFinite(numericAmount) &&
    numericAmount > 0 &&
    (splitType === "equal" || Math.abs(customDifference) < 0.01);

  useEffect(() => {
    if (!receiptFile || !receiptFile.type.startsWith("image/")) {
      setReceiptPreview(null);
      return;
    }

    const url = URL.createObjectURL(receiptFile);
    setReceiptPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [receiptFile]);

  useEffect(() => {
    if (!group.members.some((member) => member.id === paidBy)) {
      setPaidBy(group.members[0]?.id ?? "");
    }
  }, [group.members, paidBy]);

  useEffect(() => {
    setParticipantIds(group.members.map((member) => member.id));
  }, [group.members]);

  function toggleParticipant(memberId: string) {
    setParticipantIds((current) =>
      current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId],
    );
  }

  async function handleSaveExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave || saving) return;

    setSaving(true);
    setError(null);

    try {
      const shares =
        splitType === "custom"
          ? Object.fromEntries(selectedMembers.map((member) => [member.id, roundMoney(parseAmount(customShares[member.id]) || 0)]))
          : buildEqualShares(numericAmount, participantIds);
      const uploadedReceipt = receiptFile ? await uploadReceipt(group.id, receiptFile) : null;
      const localPatch = cleanExpensePatch({
        description: description.trim(),
        receipt: uploadedReceipt?.url,
        receiptPath: uploadedReceipt?.path,
        receiptName: uploadedReceipt?.name,
        receiptType: uploadedReceipt?.type,
      });

      const next = await addExpenseRequest(group.id, {
        title: title.trim(),
        description: description.trim(),
        amount: roundMoney(numericAmount),
        paidBy,
        participants: participantIds,
        splitType,
        shares,
        receipt: uploadedReceipt?.path,
        receiptName: uploadedReceipt?.name,
        receiptType: uploadedReceipt?.type,
      });
      const createdExpense = next.expenses.find((expense) => !group.expenses.some((current) => current.id === expense.id)) ?? next.expenses[0];

      if (createdExpense) {
        setLocalExpenseDetails((current) => ({
          ...current,
          [createdExpense.id]: {
            ...(current[createdExpense.id] ?? {}),
            ...localPatch,
          },
        }));
      }

      onUpdate(next);
      setTitle("");
      setDescription("");
      setAmount("");
      setSplitType("equal");
      setParticipantIds(group.members.map((member) => member.id));
      setCustomShares({});
      setReceiptFile(null);
      setReceiptPreview(null);
      setAddOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save expense.");
    } finally {
      setSaving(false);
    }
  }

  return (
      <section className="grid">
      <div className="panel panel-pad">
        <div className="section-head">
          <div>
            <p className="eyebrow">Expenses</p>
            <h2>Recent activity</h2>
          </div>
          <button className="button teal" onClick={() => setAddOpen(true)} type="button">
            <Plus size={17} /> Add expense
          </button>
        </div>
        <div className="filter-bar">
          <span className="search-field">
            <Search size={16} />
            <input value={expenseQuery} onChange={(event) => setExpenseQuery(event.target.value)} placeholder="Search expenses" />
          </span>
          <div
            className="filter-menu"
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setExpenseFilterOpen(false);
            }}
          >
            <button
              aria-expanded={expenseFilterOpen}
              aria-haspopup="listbox"
              className="filter-select"
              onClick={() => setExpenseFilterOpen((open) => !open)}
              type="button"
            >
              <span>{expenseFilterLabel}</span>
            </button>
            {expenseFilterOpen && (
              <div className="filter-menu-list" role="listbox" aria-label="Filter expenses">
                {expenseFilterOptions.map((option) => (
                  <button
                    aria-selected={expenseFilter === option.value}
                    className={expenseFilter === option.value ? "selected" : ""}
                    key={option.value}
                    onClick={() => {
                      setExpenseFilter(option.value);
                      setExpenseFilterOpen(false);
                    }}
                    role="option"
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <details className="advanced-box filter-dates">
          <summary>
            <SlidersHorizontal size={14} /> Date range
          </summary>
          <div className="grid grid-2 mt-12">
            <label className="field">
              <span>From</span>
              <input type="date" value={expenseDateFrom} onChange={(event) => setExpenseDateFrom(event.target.value)} />
            </label>
            <label className="field">
              <span>To</span>
              <input type="date" value={expenseDateTo} onChange={(event) => setExpenseDateTo(event.target.value)} />
            </label>
          </div>
        </details>
        <div className="expense-list">
          {filteredExpenses.length === 0 ? (
            <div className="expense-empty">
              <strong>{displayedExpenses.length === 0 ? "No expenses yet" : "No matching expenses"}</strong>
              <span className="muted">{displayedExpenses.length === 0 ? "Add the first split from the form below." : "Try a different filter."}</span>
            </div>
          ) : (
            filteredExpenses.map((expense) => (
              <button
                className="expense-row"
                key={expense.id}
                onClick={() => {
                  setSelectedExpense(expense);
                  setSelectedExpenseEditing(false);
                }}
                type="button"
              >
                <span className="expense-row-thumb">
                  {expense.receipt && expense.receiptType?.startsWith("image/") ? (
                    <img src={expense.receipt} alt="" />
                  ) : (
                    <ReceiptText size={18} />
                  )}
                </span>
                <span className="expense-row-text">
                  <strong>{expense.title}</strong>
                  <span className="expense-row-meta">
                    <span>Paid by {memberName(group, expense.paidBy)}</span>
                    <span>{expense.date}</span>
                  </span>
                </span>
                <span className="expense-row-amt">
                  <strong>
                    {expense.amount.toFixed(2)} {expense.currency}
                  </strong>
                  <span className="expense-row-tags">
                    <span>{expense.participants.length} {expense.participants.length === 1 ? "person" : "people"}</span>
                  </span>
                </span>
                <ChevronRight className="expense-row-chev" size={18} />
              </button>
            ))
          )}
        </div>
      </div>

      {addOpen && (
      <div className="modal-backdrop" role="presentation" onClick={() => setAddOpen(false)}>
      <div className="modal expense-modal" role="dialog" aria-modal="true" aria-labelledby="add-expense-title" onClick={(event) => event.stopPropagation()}>
        <div className="section-head">
          <div>
            <p className="eyebrow">New expense</p>
            <h2 id="add-expense-title">Add split</h2>
          </div>
          <button className="icon-button" onClick={() => setAddOpen(false)} type="button" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <form className="form-grid" onSubmit={handleSaveExpense}>
          <label className="field">
            <span>Title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Groceries, rent, dinner" />
          </label>
          <label className="field">
            <span>Description</span>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Short note, shop name, who it was for" />
          </label>
          <div className="grid grid-2">
            <label className="field">
              <span>Amount</span>
              <input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" />
            </label>
            <label className="field">
              <span>Paid by</span>
              <select value={paidBy} onChange={(event) => setPaidBy(event.target.value)}>
                {group.members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="split-card">
            <div className="section-head">
              <div>
                <p className="eyebrow">Split</p>
                <h3>Who shares this?</h3>
              </div>
              <div className="tabs" aria-label="Split type">
                <button className={`tab ${splitType === "equal" ? "active" : ""}`} onClick={() => setSplitType("equal")} type="button">
                  Equal
                </button>
                <button className={`tab ${splitType === "custom" ? "active" : ""}`} onClick={() => setSplitType("custom")} type="button">
                  Custom
                </button>
              </div>
            </div>

            <div className="split-list">
              {group.members.map((member) => {
                const selected = participantIds.includes(member.id);
                const shareValue = splitType === "custom" ? customShares[member.id] ?? "" : equalShares[member.id]?.toFixed(2) ?? "0.00";

                return (
                  <label className={`split-row ${selected ? "selected" : ""}`} key={member.id}>
                    <span className="split-member">
                      <input checked={selected} onChange={() => toggleParticipant(member.id)} type="checkbox" />
                      <span className="avatar avatar-solo">
                        {member.avatar}
                      </span>
                      <strong>{member.name}</strong>
                    </span>
                    <input
                      aria-label={`${member.name} share`}
                      disabled={!selected || splitType === "equal"}
                      inputMode="decimal"
                      onChange={(event) => setCustomShares((current) => ({ ...current, [member.id]: event.target.value }))}
                      placeholder="0.00"
                      value={selected ? shareValue : ""}
                    />
                  </label>
                );
              })}
            </div>

            <div className="split-summary">
              <span>{selectedMembers.length} selected</span>
              {splitType === "custom" ? (
                <span className={Math.abs(customDifference) < 0.01 ? "amount-good" : "amount-bad"}>
                  {Math.abs(customDifference) < 0.01
                    ? "Custom split matches"
                    : `${customDifference.toFixed(2)} ${group.currency} left`}
                </span>
              ) : (
                <span>Equal shares update from the amount.</span>
              )}
            </div>
          </div>
          <div className="field">
            <span>Receipt</span>
            <div className="receipt-actions">
              <button className="button" onClick={() => cameraInputRef.current?.click()} type="button">
                <ReceiptText size={17} /> Take photo
              </button>
              <button className="button" onClick={() => uploadInputRef.current?.click()} type="button">
                <Paperclip size={17} /> Upload receipt
              </button>
            </div>
            <input
              ref={cameraInputRef}
              className="hidden-file-input"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) => setReceiptFile(event.target.files?.[0] ?? null)}
            />
            <input
              ref={uploadInputRef}
              className="hidden-file-input"
              type="file"
              accept="image/*,.pdf"
              onChange={(event) => setReceiptFile(event.target.files?.[0] ?? null)}
            />
          </div>
          {receiptFile && (
            <div className="receipt-preview">
              {receiptPreview ? (
                <img src={receiptPreview} alt="Receipt preview" />
              ) : (
                <div className="file-preview">
                  <Paperclip size={18} />
                  <span>{receiptFile.name}</span>
                </div>
              )}
              <button className="button" onClick={() => setReceiptFile(null)} type="button">
                Remove
              </button>
            </div>
          )}
          {error && <p className="notice error">{error}</p>}
          <div className="modal-actions">
            <button className="button teal" disabled={!canSave || saving} type="submit">
              <Plus size={17} /> {saving ? "Saving..." : "Save expense"}
            </button>
            <button className="button ghost" onClick={() => setAddOpen(false)} type="button">
              Cancel
            </button>
          </div>
        </form>
      </div>
      </div>
      )}
      {selectedExpense && (
        <ExpenseDetailDialog
          expense={selectedExpense}
          group={group}
          initialEditing={selectedExpenseEditing}
          requestConfirm={requestConfirm}
          onClose={() => {
            setSelectedExpense(null);
            setSelectedExpenseEditing(false);
          }}
          onLocalPatch={(expenseId, patch) => {
            setLocalExpenseDetails((current) => ({
              ...current,
              [expenseId]: {
                ...(current[expenseId] ?? {}),
                ...patch,
              },
            }));
            setSelectedExpense((current) => (current?.id === expenseId ? { ...current, ...patch } : current));
          }}
          onUpdate={(nextGroup, patch) => {
            onUpdate(nextGroup);
            const nextExpense = nextGroup.expenses.find((expense) => expense.id === selectedExpense.id) ?? null;
            setSelectedExpense(nextExpense ? { ...nextExpense, ...(localExpenseDetails[nextExpense.id] ?? {}), ...(patch ?? {}) } : null);
            setSelectedExpenseEditing(false);
          }}
        />
      )}
    </section>
  );
}

function cleanExpensePatch(patch: Partial<Expense>) {
  return Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)) as Partial<Expense>;
}

function expenseMatchesFilters(
  group: Group,
  expense: Expense,
  filters: {
    query: string;
    filter: "all" | "unpaid" | "paidByMe" | "hasReceipt";
    currentMemberId?: string;
    dateFrom: string;
    dateTo: string;
  },
) {
  const query = filters.query.trim().toLowerCase();

  if (query) {
    const haystack = [
      expense.title,
      expense.description ?? "",
      memberName(group, expense.paidBy),
      expense.date,
    ]
      .join(" ")
      .toLowerCase();

    if (!haystack.includes(query)) return false;
  }

  if (filters.filter === "paidByMe" && expense.paidBy !== filters.currentMemberId) return false;
  if (filters.filter === "hasReceipt" && !expense.receipt) return false;
  if (filters.filter === "unpaid" && expenseRemainingAmount(group, expense) <= 0.009) return false;

  const expenseDate = parseExpenseDisplayDate(expense.date);
  if (filters.dateFrom && expenseDate && expenseDate < new Date(`${filters.dateFrom}T00:00:00`)) return false;
  if (filters.dateTo && expenseDate && expenseDate > new Date(`${filters.dateTo}T23:59:59`)) return false;

  return true;
}

function parseExpenseDisplayDate(value: string) {
  const parsed = new Date(`${value} ${new Date().getFullYear()}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function expenseRemainingAmount(group: Group, expense: Expense) {
  const owedByOthers = expense.participants
    .filter((participantId) => participantId !== expense.paidBy)
    .reduce((sum, participantId) => sum + expenseShareForMember(expense, participantId), 0);
  const paid = paidAmountForExpense(group, expense);

  return roundMoney(owedByOthers - paid);
}

function paidAmountForExpense(group: Group, expense: Expense) {
  const title = expense.title.trim();
  let paid = 0;

  for (const settlement of group.settlements) {
    if (settlement.to !== expense.paidBy) continue;
    const parsedItems = parsePaymentNote(settlement.note ?? "", settlement.currency);
    const item = parsedItems.find((parsed) => parsed.title === title);

    if (item) {
      paid += item.amount;
    } else if ((settlement.note ?? "").includes(title)) {
      paid += settlement.amount;
    }
  }

  return roundMoney(paid);
}

function parsePaymentNote(note: string, currency: string) {
  const cleanNote = note.replace(/^For\s+/i, "");
  const itemPattern = /([^,()]+)\s+\((\d+(?:\.\d+)?)\s+([A-Z]{3})\)/g;
  const items: { title: string; amount: number; currency: string }[] = [];
  let match = itemPattern.exec(cleanNote);

  while (match) {
    items.push({
      title: match[1].trim(),
      amount: roundMoney(Number(match[2])),
      currency: match[3] || currency,
    });
    match = itemPattern.exec(cleanNote);
  }

  return items;
}

function ExpenseDetailDialog({
  expense,
  group,
  initialEditing,
  requestConfirm,
  onClose,
  onLocalPatch,
  onUpdate,
}: {
  expense: Expense;
  group: Group;
  initialEditing: boolean;
  requestConfirm: (action: ConfirmAction) => void;
  onClose: () => void;
  onLocalPatch: (expenseId: string, patch: Partial<Expense>) => void;
  onUpdate: (group: Group, patch?: Partial<Expense>) => void;
}) {
  const [editing, setEditing] = useState(initialEditing);
  const [title, setTitle] = useState(expense.title);
  const [description, setDescription] = useState(expense.description ?? "");
  const [amount, setAmount] = useState(expense.amount.toString());
  const [paidBy, setPaidBy] = useState(expense.paidBy);
  const [splitType, setSplitType] = useState<"equal" | "custom">(expense.splitType);
  const [participantIds, setParticipantIds] = useState<string[]>(expense.participants.length ? expense.participants : group.members.map((member) => member.id));
  const [customShares, setCustomShares] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(expense.shares ?? {}).map(([memberId, share]) => [memberId, share.toString()])),
  );
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const payer = memberName(group, expense.paidBy);
  const numericAmount = parseAmount(amount);
  const selectedMembers = group.members.filter((member) => participantIds.includes(member.id));
  const equalShares = Number.isFinite(numericAmount) && numericAmount > 0 ? buildEqualShares(numericAmount, participantIds) : {};
  const customTotal = selectedMembers.reduce((sum, member) => sum + (parseAmount(customShares[member.id]) || 0), 0);
  const customDifference = Number.isFinite(numericAmount) ? roundMoney(numericAmount - customTotal) : 0;
  const canSave =
    title.trim().length > 0 &&
    paidBy.length > 0 &&
    selectedMembers.length > 0 &&
    Number.isFinite(numericAmount) &&
    numericAmount > 0 &&
    (splitType === "equal" || Math.abs(customDifference) < 0.01);
  const paymentLines = expense.participants
    .map((participantId) => ({
      memberId: participantId,
      memberName: memberName(group, participantId),
      amount: roundMoney(expense.shares[participantId] ?? 0),
    }))
    .filter((line) => line.amount > 0.009);

  useEffect(() => {
    setEditing(initialEditing);
  }, [initialEditing, expense.id]);

  useEffect(() => {
    setTitle(expense.title);
    setDescription(expense.description ?? "");
    setAmount(expense.amount.toString());
    setPaidBy(expense.paidBy);
    setSplitType(expense.splitType);
    setParticipantIds(expense.participants.length ? expense.participants : group.members.map((member) => member.id));
    setCustomShares(Object.fromEntries(Object.entries(expense.shares ?? {}).map(([memberId, share]) => [memberId, share.toString()])));
    setReceiptFile(null);
    setReceiptPreview(null);
    setError(null);
  }, [expense, group.members]);

  useEffect(() => {
    if (!receiptFile || !receiptFile.type.startsWith("image/")) {
      setReceiptPreview(null);
      return;
    }

    const url = URL.createObjectURL(receiptFile);
    setReceiptPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [receiptFile]);

  function toggleParticipant(memberId: string) {
    setParticipantIds((current) =>
      current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId],
    );
  }

  async function handleSaveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave || saving) return;

    setSaving(true);
    setError(null);

    try {
      const shares =
        splitType === "custom"
          ? Object.fromEntries(selectedMembers.map((member) => [member.id, roundMoney(parseAmount(customShares[member.id]) || 0)]))
          : buildEqualShares(numericAmount, participantIds);
      const uploadedReceipt = receiptFile ? await uploadReceipt(group.id, receiptFile) : null;
      const existingReceiptPath = expense.receiptPath ?? (expense.receipt?.startsWith("http") ? undefined : expense.receipt);
      const localPatch = cleanExpensePatch({
        description: description.trim(),
        receipt: uploadedReceipt?.url ?? expense.receipt,
        receiptPath: uploadedReceipt?.path ?? existingReceiptPath,
        receiptName: uploadedReceipt?.name ?? expense.receiptName,
        receiptType: uploadedReceipt?.type ?? expense.receiptType,
      });
      const nextGroup = await updateExpenseRequest(group.id, expense.id, {
        title: title.trim(),
        description: description.trim(),
        amount: roundMoney(numericAmount),
        paidBy,
        participants: participantIds,
        splitType,
        shares,
        receipt: uploadedReceipt?.path ?? existingReceiptPath,
        receiptName: uploadedReceipt?.name ?? expense.receiptName,
        receiptType: uploadedReceipt?.type ?? expense.receiptType,
      });

      onLocalPatch(expense.id, localPatch);
      onUpdate(nextGroup, localPatch);
      setEditing(false);
      setReceiptFile(null);
      setReceiptPreview(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update expense.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal expense-modal" role="dialog" aria-modal="true" aria-labelledby="expense-detail-title">
        <div className="section-head">
          <div>
            <p className="eyebrow">Expense details</p>
            <h2 id="expense-detail-title">{expense.title}</h2>
          </div>
          <div className="toolbar">
            <button className="button" onClick={() => setEditing((current) => !current)} type="button">
              <Pencil size={16} /> {editing ? "View" : "Edit"}
            </button>
            {!editing && (
              <button
                className="icon-button danger"
                onClick={() =>
                  requestConfirm({
                    title: "Delete expense?",
                    body: `Remove "${expense.title}" from this group.`,
                    confirmLabel: "Delete expense",
                    onConfirm: async () => {
                      onUpdate(await deleteExpenseRequest(group.id, expense.id));
                      onClose();
                    },
                  })
                }
                type="button"
                aria-label="Delete expense"
              >
                <Trash2 size={17} />
              </button>
            )}
            <button className="icon-button" onClick={onClose} type="button" aria-label="Close expense details">
              <X size={18} />
            </button>
          </div>
        </div>

        {editing ? (
          <form className="form-grid expense-edit-form" onSubmit={handleSaveEdit}>
            <label className="field">
              <span>Title</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <label className="field">
              <span>Description</span>
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Short note, shop name, who it was for" />
            </label>
            <div className="grid grid-2">
              <label className="field">
                <span>Amount</span>
                <input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} />
              </label>
              <label className="field">
                <span>Paid by</span>
                <select value={paidBy} onChange={(event) => setPaidBy(event.target.value)}>
                  {group.members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="split-card">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Split</p>
                  <h3>Who shares this?</h3>
                </div>
                <div className="tabs" aria-label="Split type">
                  <button className={`tab ${splitType === "equal" ? "active" : ""}`} onClick={() => setSplitType("equal")} type="button">
                    Equal
                  </button>
                  <button className={`tab ${splitType === "custom" ? "active" : ""}`} onClick={() => setSplitType("custom")} type="button">
                    Custom
                  </button>
                </div>
              </div>
              <div className="split-list">
                {group.members.map((member) => {
                  const selected = participantIds.includes(member.id);
                  const shareValue = splitType === "custom" ? customShares[member.id] ?? "" : equalShares[member.id]?.toFixed(2) ?? "0.00";

                  return (
                    <label className={`split-row ${selected ? "selected" : ""}`} key={member.id}>
                      <span className="split-member">
                        <input checked={selected} onChange={() => toggleParticipant(member.id)} type="checkbox" />
                        <span className="avatar avatar-solo">
                          {member.avatar}
                        </span>
                        <strong>{member.name}</strong>
                      </span>
                      <input
                        aria-label={`${member.name} share`}
                        disabled={!selected || splitType === "equal"}
                        inputMode="decimal"
                        onChange={(event) => setCustomShares((current) => ({ ...current, [member.id]: event.target.value }))}
                        placeholder="0.00"
                        value={selected ? shareValue : ""}
                      />
                    </label>
                  );
                })}
              </div>
              <div className="split-summary">
                <span>{selectedMembers.length} selected</span>
                {splitType === "custom" ? (
                  <span className={Math.abs(customDifference) < 0.01 ? "amount-good" : "amount-bad"}>
                    {Math.abs(customDifference) < 0.01
                      ? "Custom split matches"
                      : `${customDifference.toFixed(2)} ${group.currency} left`}
                  </span>
                ) : (
                  <span>Equal shares update from the amount.</span>
                )}
              </div>
            </div>
            <div className="field">
              <span>Replace receipt</span>
              <div className="receipt-actions">
                <button className="button" onClick={() => cameraInputRef.current?.click()} type="button">
                  <ReceiptText size={17} /> Take photo
                </button>
                <button className="button" onClick={() => uploadInputRef.current?.click()} type="button">
                  <Paperclip size={17} /> Upload receipt
                </button>
              </div>
              <input
                ref={cameraInputRef}
                className="hidden-file-input"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(event) => setReceiptFile(event.target.files?.[0] ?? null)}
              />
              <input
                ref={uploadInputRef}
                className="hidden-file-input"
                type="file"
                accept="image/*,.pdf"
                onChange={(event) => setReceiptFile(event.target.files?.[0] ?? null)}
              />
            </div>
            {(receiptPreview || receiptFile || expense.receipt) && (
              <div className="receipt-preview">
                {receiptPreview ? (
                  <img src={receiptPreview} alt="New receipt preview" />
                ) : expense.receipt && expense.receiptType?.startsWith("image/") ? (
                  <img src={expense.receipt} alt={`Receipt for ${expense.title}`} />
                ) : (
                  <div className="file-preview">
                    <Paperclip size={18} />
                    <span>{receiptFile?.name ?? expense.receiptName ?? "Receipt attached"}</span>
                  </div>
                )}
              </div>
            )}
            {error && <p className="notice error">{error}</p>}
            <div className="modal-actions">
              <button className="button teal" disabled={!canSave || saving} type="submit">
                {saving ? "Saving..." : "Save changes"}
              </button>
              <button className="button ghost" onClick={() => setEditing(false)} type="button">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="expense-detail-grid">
          <div className="expense-detail-main">
            <div className="detail-stat-row">
              <div>
                <p className="eyebrow">Paid by</p>
                <strong>{payer}</strong>
              </div>
              <div>
                <p className="eyebrow">Total</p>
                <strong>
                  {expense.amount.toFixed(2)} {expense.currency}
                </strong>
              </div>
              <div>
                <p className="eyebrow">Date</p>
                <strong>{expense.date}</strong>
              </div>
            </div>

            <div className="detail-box">
              <p className="eyebrow">Description</p>
              <p className="detail-text">{expense.description || "No description added."}</p>
            </div>

            <div className="detail-box">
              <p className="eyebrow">Who pays who</p>
              <div className="list compact-list">
                {paymentLines.map((line) => (
                  <div className="list-row" key={line.memberId}>
                    <span>
                      <strong>{line.memberName}</strong>
                      <br />
                      <span className="muted">{line.memberId === expense.paidBy ? "already paid their part" : `pays ${payer}`}</span>
                    </span>
                    <span className={line.memberId === expense.paidBy ? "pill green" : "pill tomato"}>
                      {line.amount.toFixed(2)} {expense.currency}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="expense-receipt-panel">
            <p className="eyebrow">Receipt photo</p>
            {expense.receipt ? (
              expense.receiptType?.startsWith("image/") ? (
                <a href={expense.receipt} rel="noreferrer" target="_blank">
                  <img className="receipt-large" src={expense.receipt} alt={`Receipt for ${expense.title}`} />
                </a>
              ) : (
                <a className="file-preview large-file-preview" href={expense.receipt} rel="noreferrer" target="_blank">
                  <Paperclip size={20} />
                  <span>{expense.receiptName ?? "Open receipt"}</span>
                </a>
              )
            ) : (
              <div className="empty-receipt">No receipt uploaded.</div>
            )}
          </div>
        </div>
        )}
      </section>
    </div>
  );
}

function BalancesPanel({
  group,
  onUpdate,
  requestConfirm,
  settlements,
}: {
  group: Group;
  onUpdate: (group: Group) => void;
  requestConfirm: (action: ConfirmAction) => void;
  settlements: ReturnType<typeof calculateSettlements>;
}) {
  const memberBalances = calculateMemberBalances(group);
  const [payDialogSettlement, setPayDialogSettlement] = useState<Settlement | null>(null);
  const paymentHistory = groupedPaymentHistory(group);
  const paymentCount = paymentHistory.reduce((sum, historyGroup) => sum + historyGroup.payments.length, 0);
  const totalPaid = paymentHistory.reduce(
    (sum, historyGroup) => sum + historyGroup.payments.reduce((groupSum, payment) => groupSum + payment.amount, 0),
    0,
  );

  return (
    <>
    <section className="grid">
      <div className="panel panel-pad">
        <div className="section-head">
          <div>
            <p className="eyebrow">Balances</p>
            <h2>Settle up</h2>
          </div>
          <span className="pill tomato">
            <Scale size={14} /> fewest payments
          </span>
        </div>
        <div className="expense-list">
          {settlements.length === 0 ? (
            <div className="expense-empty">
              <strong>Everyone is even</strong>
              <span className="muted">No one needs to pay anyone right now.</span>
            </div>
          ) : (
            settlements.map((settlement) => (
              <button
                className="settle-row"
                key={`${settlement.from}-${settlement.to}-${settlement.amount}`}
                onClick={() => setPayDialogSettlement(settlement)}
                type="button"
              >
                <span className="settle-icon">
                  <ArrowRight size={20} />
                </span>
                <span className="settle-body">
                  <span className="settle-names">
                    <span className="settle-name">{memberName(group, settlement.from)}</span>
                    <span className="settle-verb">pays</span>
                    <span className="settle-name">{memberName(group, settlement.to)}</span>
                  </span>
                  <span className="settle-reason">{settlementReason(group, settlement)}</span>
                </span>
                <span className="settle-right">
                  <strong className="settle-amt">
                    {settlement.amount.toFixed(2)} {settlement.currency}
                  </strong>
                  <span className="settle-cta">
                    tap to settle <ChevronRight size={13} />
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="panel panel-pad">
        <div className="section-head">
          <div>
            <p className="eyebrow">People</p>
            <h2>Each person&apos;s balance</h2>
          </div>
        </div>
        <div className="list compact-list modal-list">
          {memberBalances.map(({ member, balance }) => (
            <div className="list-row" key={member.id}>
              <span className="member-row-main">
                <span className="avatar avatar-solo">
                  {member.avatar}
                </span>
                <strong>{member.name}</strong>
              </span>
              <span className={balance > 0.01 ? "amount-good" : balance < -0.01 ? "amount-bad" : "muted"}>
                {balance > 0.01
                  ? `gets ${balance.toFixed(2)} ${group.currency}`
                  : balance < -0.01
                    ? `pays ${Math.abs(balance).toFixed(2)} ${group.currency}`
                    : "even"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="panel panel-pad payment-history-panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">History</p>
            <h2>Payment history</h2>
          </div>
          <span className="pill green">
            <CheckCircle2 size={14} /> {paymentCount} recorded
          </span>
        </div>

        <details className="pay-history-box modal-list">
          <summary>
            <span className="pay-history-summary-main">
              <span className="pay-history-summary-icon">
                <CheckCircle2 size={17} />
              </span>
              <span>
                <span className="pay-history-summary-title">Recorded settlements</span>
                <span className="pay-history-summary-meta">
                  {paymentCount === 0
                    ? "No payments recorded"
                    : `${paymentCount} payment${paymentCount !== 1 ? "s" : ""} across ${paymentHistory.length} expense${paymentHistory.length !== 1 ? "s" : ""}`}
                </span>
              </span>
            </span>
            <span className="pay-history-summary-total">
              <strong>{totalPaid.toFixed(2)}</strong>
              <span>{group.currency}</span>
            </span>
          </summary>
          <div className="pay-history">
            {paymentHistory.length === 0 ? (
              <div className="pay-history-empty">
                <CheckCircle2 size={20} />
                <span>No settled payments yet.</span>
              </div>
            ) : (
              paymentHistory.map((historyGroup) => (
                <div className="pay-history-group" key={historyGroup.title}>
                  <div className="pay-history-heading">
                    <span className="pay-history-heading-title">{historyGroup.title}</span>
                    <span className="pay-history-heading-count">
                      {historyGroup.payments.length} payment{historyGroup.payments.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {historyGroup.payments.map((payment) => (
                    <div className="pay-row" key={`${payment.settlementId}-${payment.from}-${payment.to}-${payment.amount}-${payment.date}`}>
                      <span className="pay-icon">
                        <CheckCircle2 size={18} />
                      </span>
                      <span className="pay-text">
                        <span className="pay-names">
                          <strong>{memberName(group, payment.from)}</strong>
                          <span className="pay-verb">paid</span>
                          <strong>{memberName(group, payment.to)}</strong>
                        </span>
                        <span className="pay-date">{payment.date ?? "Recorded payment"}</span>
                      </span>
                      <span className="pay-right">
                        <strong className="pay-amt">{payment.amount.toFixed(2)}</strong>
                        <span>{payment.currency}</span>
                      </span>
                      {payment.settlementId && (
                          <button
                            className="icon-button danger pay-del"
                            onClick={() =>
                              requestConfirm({
                                title: "Delete payment?",
                                body: "This removes the recorded payment and recalculates balances.",
                                confirmLabel: "Delete payment",
                                onConfirm: async () => onUpdate(await deleteSettlementRequest(group.id, payment.settlementId ?? "")),
                              })
                            }
                            type="button"
                            aria-label="Delete payment"
                          >
                            <Trash2 size={16} />
                          </button>
                      )}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </details>
      </div>
      </section>
      {payDialogSettlement && (
        <PaymentPickerDialog
          group={group}
          settlement={payDialogSettlement}
          onClose={() => setPayDialogSettlement(null)}
          onSaved={(nextGroup) => {
            onUpdate(nextGroup);
            setPayDialogSettlement(null);
          }}
        />
      )}
    </>
  );
}

function PaymentPickerDialog({
  group,
  settlement,
  onClose,
  onSaved,
}: {
  group: Group;
  settlement: Settlement;
  onClose: () => void;
  onSaved: (group: Group) => void;
}) {
  const items = payableExpenseItems(group, settlement);
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>(items[0] ? [items[0].expense.id] : []);
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, string>>(
    Object.fromEntries(items.map((item) => [item.expense.id, Math.min(item.amount, settlement.amount).toFixed(2)])),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedItems = items.filter((item) => selectedExpenseIds.includes(item.expense.id));
  const selectedTotal = roundMoney(selectedItems.reduce((sum, item) => sum + paymentAmountForItem(item, paymentAmounts), 0));
  const selectedReason = paymentReasonFromItems(selectedItems, paymentAmounts, settlement.currency);
  const hasInvalidAmount = selectedItems.some((item) => {
    const amount = paymentAmountForItem(item, paymentAmounts);
    return amount <= 0 || amount - item.amount > 0.009;
  });
  const paysTooMuch = selectedTotal - settlement.amount > 0.009;

  function toggleExpense(expenseId: string) {
    setSelectedExpenseIds((current) => {
      if (current.includes(expenseId)) return current.filter((id) => id !== expenseId);
      const item = items.find((candidate) => candidate.expense.id === expenseId);
      if (item) {
        setPaymentAmounts((amounts) => ({
          ...amounts,
          [expenseId]: amounts[expenseId] ?? Math.min(item.amount, Math.max(settlement.amount - selectedTotal, 0)).toFixed(2),
        }));
      }
      return [...current, expenseId];
    });
  }

  async function recordSelectedPayment() {
    if (selectedTotal <= 0 || hasInvalidAmount || paysTooMuch || saving) return;

    setSaving(true);
    setError(null);

    try {
      const nextGroup = await recordSettlementRequest(group.id, {
        from: settlement.from,
        to: settlement.to,
        amount: selectedTotal,
        currency: settlement.currency,
        note: selectedReason,
      });
      onSaved(nextGroup);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not record payment.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal payment-modal" role="dialog" aria-modal="true" aria-labelledby="payment-picker-title">
        <div className="section-head">
          <div>
            <p className="eyebrow">Choose payment</p>
            <h2 id="payment-picker-title">What was paid?</h2>
          </div>
          <button className="icon-button" onClick={onClose} type="button" aria-label="Close payment picker">
            <X size={18} />
          </button>
        </div>

        <p className="muted muted-offset">
          {memberName(group, settlement.from)} pays {memberName(group, settlement.to)} only for the selected expenses.
        </p>

        <div className="payment-picker-list">
          {items.length === 0 ? (
            <div className="list-row">
              <span>
                <strong>No exact expense found</strong>
                <br />
                <span className="muted">This balance comes from mixed payments already recorded.</span>
              </span>
            </div>
          ) : (
            items.map((item) => (
              <label className={`payment-choice ${selectedExpenseIds.includes(item.expense.id) ? "selected" : ""}`} key={item.expense.id}>
                <span className="split-member">
                  <input
                    checked={selectedExpenseIds.includes(item.expense.id)}
                    onChange={() => toggleExpense(item.expense.id)}
                    type="checkbox"
                  />
                  <span>
                    <strong>{item.expense.title}</strong>
                    <br />
                    <span className="muted">Up to {item.amount.toFixed(2)} {settlement.currency} - {item.expense.date}</span>
                  </span>
                </span>
                <span className="payment-amount-field">
                  <input
                    aria-label={`Amount paid for ${item.expense.title}`}
                    disabled={!selectedExpenseIds.includes(item.expense.id)}
                    inputMode="decimal"
                    onChange={(event) =>
                      setPaymentAmounts((current) => ({
                        ...current,
                        [item.expense.id]: event.target.value,
                      }))
                    }
                    onClick={(event) => event.stopPropagation()}
                    value={paymentAmounts[item.expense.id] ?? ""}
                  />
                  <span>{settlement.currency}</span>
                </span>
              </label>
            ))
          )}
        </div>

        <div className="payment-total">
          <span>
            <strong>Total to record</strong>
            <br />
            <span className="muted">{selectedExpenseIds.length} selected, max {settlement.amount.toFixed(2)} {settlement.currency}</span>
          </span>
          <strong>
            {selectedTotal.toFixed(2)} {settlement.currency}
          </strong>
        </div>

        {hasInvalidAmount && <p className="notice error">Enter an amount above 0 and not more than the amount left for that expense.</p>}
        {paysTooMuch && <p className="notice error">Selected payments are more than the total amount owed.</p>}
        {error && <p className="notice error">{error}</p>}
        <div className="toolbar">
          <button className="button teal" disabled={selectedTotal <= 0 || hasInvalidAmount || paysTooMuch || saving} onClick={recordSelectedPayment} type="button">
            {saving ? "Recording..." : "Record selected"}
          </button>
          <button className="button" onClick={onClose} type="button">
            Cancel
          </button>
        </div>
      </section>
    </div>
  );
}

function settlementReason(group: Group, settlement: Settlement) {
  const directTitles = group.expenses
    .filter((expense) => expense.paidBy === settlement.to && expense.participants.includes(settlement.from))
    .map((expense) => expense.title.trim())
    .filter(Boolean);
  const fallbackTitles = group.expenses
    .filter((expense) => expense.participants.includes(settlement.from) && expense.paidBy !== settlement.from)
    .map((expense) => expense.title.trim())
    .filter(Boolean);
  const titles = Array.from(new Set(directTitles.length ? directTitles : fallbackTitles));

  return reasonFromTitles(titles);
}

function payableExpenseItems(group: Group, settlement: Settlement) {
  const paidByTitle = paidAmountsByTitle(group, settlement.from, settlement.to);
  const directExpenses = group.expenses.filter(
    (expense) =>
      expense.paidBy === settlement.to &&
      expense.participants.includes(settlement.from),
  );
  const fallbackExpenses = group.expenses.filter(
    (expense) =>
      expense.paidBy !== settlement.from &&
      expense.participants.includes(settlement.from),
  );
  const expenses = directExpenses.length ? directExpenses : fallbackExpenses;

  return expenses
    .map((expense) => {
      const title = expense.title.trim();
      const paidAmount = paidByTitle.get(title) ?? 0;
      const amount = roundMoney(expenseShareForMember(expense, settlement.from) - paidAmount);
      return { expense, amount };
    })
    .filter((item) => item.amount > 0.009);
}

function paidAmountsByTitle(group: Group, from: string, to: string) {
  const titles = group.expenses.map((expense) => expense.title.trim()).filter(Boolean);
  const paidAmounts = new Map<string, number>();
  const pairSettlements = group.settlements.filter((settlement) => settlement.from === from && settlement.to === to);

  for (const settlement of pairSettlements) {
    const note = settlement.note ?? "";

    for (const title of titles) {
      if (!note.includes(title)) continue;

      const amountMatch = note.match(new RegExp(`${escapeRegExp(title)} \\((\\d+(?:\\.\\d+)?) ${escapeRegExp(settlement.currency)}\\)`));
      const paidAmount = amountMatch ? Number(amountMatch[1]) : expenseShareForTitle(group, title, from);
      paidAmounts.set(title, roundMoney((paidAmounts.get(title) ?? 0) + paidAmount));
    }
  }

  return paidAmounts;
}

function expenseShareForTitle(group: Group, title: string, memberId: string) {
  return group.expenses
    .filter((expense) => expense.title.trim() === title)
    .reduce((sum, expense) => sum + expenseShareForMember(expense, memberId), 0);
}

function expenseShareForMember(expense: Expense, memberId: string) {
  if (expense.shares[memberId] !== undefined) {
    return expense.shares[memberId];
  }

  if (!expense.participants.includes(memberId)) return 0;

  return buildEqualShares(expense.amount, expense.participants)[memberId] ?? 0;
}

function reasonFromTitles(titles: string[]) {
  const cleanTitles = Array.from(new Set(titles.map((title) => title.trim()).filter(Boolean)));

  if (cleanTitles.length === 0) return "For shared expenses";

  const shownTitles = cleanTitles.slice(0, 3).join(", ");
  const moreCount = cleanTitles.length - 3;
  return moreCount > 0 ? `For ${shownTitles} + ${moreCount} more` : `For ${shownTitles}`;
}

function paymentAmountForItem(item: { expense: Expense; amount: number }, paymentAmounts: Record<string, string>) {
  return roundMoney(parseAmount(paymentAmounts[item.expense.id]) || 0);
}

function paymentReasonFromItems(items: { expense: Expense; amount: number }[], paymentAmounts: Record<string, string>, currency: string) {
  const parts = items
    .map((item) => {
      const amount = paymentAmountForItem(item, paymentAmounts);
      if (amount <= 0) return "";
      return `${item.expense.title.trim()} (${amount.toFixed(2)} ${currency})`;
    })
    .filter(Boolean);

  return parts.length ? `For ${parts.join(", ")}` : "For shared expenses";
}

function groupedPaymentHistory(group: Group) {
  const groups = new Map<
    string,
    {
      title: string;
      payments: {
        settlementId?: string;
        from: string;
        to: string;
        amount: number;
        currency: string;
        date?: string;
        kind: "partial" | "full";
      }[];
    }
  >();

  for (const settlement of group.settlements) {
    const parsedItems = parsePaymentNote(settlement.note ?? "", settlement.currency);
    const fallbackItems = parsedItems.length
      ? parsedItems
      : [{ title: settlement.note?.replace(/^For\s+/i, "").trim() || "Shared expenses", amount: settlement.amount, currency: settlement.currency }];

    for (const item of fallbackItems) {
      const title = item.title || "Shared expenses";
      const expense = group.expenses.find((candidate) => candidate.title.trim() === title);
      const expectedAmount = expense ? expenseShareForMember(expense, settlement.from) : settlement.amount;
      const historyGroup = groups.get(title) ?? { title, payments: [] };

      historyGroup.payments.push({
        settlementId: settlement.id,
        from: settlement.from,
        to: settlement.to,
        amount: item.amount,
        currency: item.currency || settlement.currency,
        date: settlement.date,
        kind: item.amount + 0.009 >= expectedAmount ? "full" : "partial",
      });
      groups.set(title, historyGroup);
    }
  }

  return Array.from(groups.values());
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function DutiesPanel({
  group,
  onUpdate,
  requestConfirm,
}: {
  group: Group;
  onUpdate: (group: Group) => void;
  requestConfirm: (action: ConfirmAction) => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>(group.members[0] ? [group.members[0].id] : []);
  const [due, setDue] = useState("");
  const [description, setDescription] = useState("");
  const [editingDuty, setEditingDuty] = useState<Duty | null>(null);

  async function handleSaveDuty(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || assigneeIds.length === 0) return;

    const next = await addDutyRequest(group.id, {
      title: title.trim(),
      assignee: assigneeIds[0],
      assignees: assigneeIds,
      due: due || "No due date",
      status: "Assigned",
      linkedExpense: description.trim() || undefined,
    });

    onUpdate(next);
    setTitle("");
    setAssigneeIds(group.members[0] ? [group.members[0].id] : []);
    setDue("");
    setDescription("");
    setAddOpen(false);
  }

  function toggleAssignee(memberId: string) {
    setAssigneeIds((current) =>
      current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId],
    );
  }

  async function setDutyStatus(dutyId: string, status: Duty["status"]) {
    onUpdate(await updateDutyStatus(group.id, dutyId, status));
  }

  return (
    <section className="grid">
      <div className="panel panel-pad">
        <div className="section-head">
          <div>
            <p className="eyebrow">Duties</p>
            <h2>Assignments</h2>
          </div>
          <button className="button teal" onClick={() => setAddOpen(true)} type="button">
            <Plus size={17} /> Add duty
          </button>
        </div>
        <div className="expense-list">
          {group.duties.length === 0 ? (
            <div className="expense-empty">
              <strong>No duties yet</strong>
              <span className="muted">Add the first task to share around.</span>
            </div>
          ) : (
            group.duties.map((duty) => {
              const done = duty.status === "Done";
              return (
                <div className={`duty-row ${done ? "done" : ""}`} key={duty.id}>
                  <button
                    className="duty-check"
                    onClick={() => setDutyStatus(duty.id, done ? "Assigned" : "Done")}
                    type="button"
                    aria-label={done ? `Reopen ${duty.title}` : `Mark ${duty.title} done`}
                  >
                    {done ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                  </button>
                  <button className="duty-main" onClick={() => setEditingDuty(duty)} type="button">
                    <span className="duty-text">
                      <strong>{duty.title}</strong>
                      <span className="muted">
                        {dutyAssigneeNames(group, duty)} · due {duty.due}
                      </span>
                    </span>
                    <span className={`pill ${done ? "green" : "blue"}`}>{duty.status}</span>
                    <ChevronRight className="expense-row-chev" size={18} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {addOpen && (
      <div className="modal-backdrop" role="presentation" onClick={() => setAddOpen(false)}>
      <div className="modal duty-modal" role="dialog" aria-modal="true" aria-labelledby="add-duty-title" onClick={(event) => event.stopPropagation()}>
        <div className="section-head">
          <div>
            <p className="eyebrow">New duty</p>
            <h2 id="add-duty-title">Assign task</h2>
          </div>
          <button className="icon-button" onClick={() => setAddOpen(false)} type="button" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <form className="form-grid" onSubmit={handleSaveDuty}>
          <label className="field">
            <span>Title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Buy cleaning supplies" />
          </label>
          <div className="field">
            <span>Assigned to</span>
            <div className="assignee-picker">
              {group.members.map((member) => (
                <label className={`assignee-choice ${assigneeIds.includes(member.id) ? "selected" : ""}`} key={member.id}>
                  <input checked={assigneeIds.includes(member.id)} onChange={() => toggleAssignee(member.id)} type="checkbox" />
                  <span className="assignee-check" aria-hidden="true">
                    <CheckCircle2 size={15} />
                  </span>
                  <span className="avatar avatar-solo">
                    {member.avatar}
                  </span>
                  <strong>{member.name}</strong>
                </label>
              ))}
            </div>
          </div>
          <label className="field">
            <span>Due date</span>
            <input type="date" value={due} onChange={(event) => setDue(event.target.value)} />
          </label>
          <label className="field">
            <span>Details</span>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Anything the assignee should know" />
          </label>
          <div className="modal-actions">
            <button className="button teal" disabled={assigneeIds.length === 0 || !title.trim()} type="submit">
              <CalendarClock size={17} /> Save duty
            </button>
            <button className="button ghost" onClick={() => setAddOpen(false)} type="button">
              Cancel
            </button>
          </div>
        </form>
      </div>
      </div>
      )}
      {editingDuty && (
        <DutyEditDialog
          duty={editingDuty}
          group={group}
          onClose={() => setEditingDuty(null)}
          onDelete={() =>
            requestConfirm({
              title: "Delete duty?",
              body: `Remove "${editingDuty.title}" from this group.`,
              confirmLabel: "Delete duty",
              onConfirm: async () => {
                onUpdate(await deleteDutyRequest(group.id, editingDuty.id));
                setEditingDuty(null);
              },
            })
          }
          onSaved={(nextGroup) => {
            onUpdate(nextGroup);
            setEditingDuty(null);
          }}
        />
      )}
    </section>
  );
}

function dutyAssigneeNames(group: Group, duty: Duty) {
  const assignees = duty.assignees?.length ? duty.assignees : [duty.assignee].filter(Boolean);
  return assignees.map((assignee) => memberName(group, assignee)).join(", ") || "Unassigned";
}

function DutyEditDialog({
  duty,
  group,
  onClose,
  onDelete,
  onSaved,
}: {
  duty: Duty;
  group: Group;
  onClose: () => void;
  onDelete: () => void;
  onSaved: (group: Group) => void;
}) {
  const [title, setTitle] = useState(duty.title);
  const [assigneeIds, setAssigneeIds] = useState<string[]>(duty.assignees?.length ? duty.assignees : [duty.assignee].filter(Boolean));
  const [due, setDue] = useState(duty.due === "No due date" ? "" : duty.due);
  const [description, setDescription] = useState(duty.linkedExpense ?? "");
  const [status, setStatus] = useState<Duty["status"]>(duty.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleAssignee(memberId: string) {
    setAssigneeIds((current) =>
      current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId],
    );
  }

  async function saveDuty(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || assigneeIds.length === 0 || saving) return;

    setSaving(true);
    setError(null);

    try {
      const nextGroup = await updateDuty(group.id, duty.id, {
        title: title.trim(),
        assignee: assigneeIds[0],
        assignees: assigneeIds,
        due: due || "No due date",
        linkedExpense: description.trim() || undefined,
        status,
      });
      onSaved(nextGroup);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update duty.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal duty-modal" role="dialog" aria-modal="true" aria-labelledby="duty-edit-title">
        <div className="section-head">
          <div>
            <p className="eyebrow">Edit duty</p>
            <h2 id="duty-edit-title">{duty.title}</h2>
          </div>
          <button className="icon-button" onClick={onClose} type="button" aria-label="Close duty editor">
            <X size={18} />
          </button>
        </div>

        <form className="form-grid form-offset" onSubmit={saveDuty}>
          <label className="field">
            <span>Title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <div className="grid grid-2">
            <div className="field">
              <span>Assigned to</span>
              <div className="assignee-picker">
                {group.members.map((member) => (
                  <label className={`assignee-choice ${assigneeIds.includes(member.id) ? "selected" : ""}`} key={member.id}>
                    <input checked={assigneeIds.includes(member.id)} onChange={() => toggleAssignee(member.id)} type="checkbox" />
                    <span className="assignee-check" aria-hidden="true">
                      <CheckCircle2 size={15} />
                    </span>
                    <span className="avatar avatar-solo">
                      {member.avatar}
                    </span>
                    <strong>{member.name}</strong>
                  </label>
                ))}
              </div>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>Due date</span>
                <input type="date" value={due} onChange={(event) => setDue(event.target.value)} />
              </label>
              <label className="field">
                <span>Stage</span>
                <select value={status} onChange={(event) => setStatus(event.target.value as Duty["status"])}>
                  <option value="Assigned">Assigned</option>
                  <option value="Done">Done</option>
                </select>
              </label>
            </div>
          </div>
          <label className="field">
            <span>Details</span>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          {error && <p className="notice error">{error}</p>}
          <div className="modal-actions">
            <button className="button teal" disabled={!title.trim() || assigneeIds.length === 0 || saving} type="submit">
              {saving ? "Saving..." : "Save changes"}
            </button>
            <button className="button ghost" onClick={onClose} type="button">
              Cancel
            </button>
          </div>
          <button className="button danger-solid danger-full-action" onClick={onDelete} type="button">
            <Trash2 size={16} /> Delete duty
          </button>
        </form>
      </section>
    </div>
  );
}

function InviteDialog({ group, onClose, onUpdate }: { group: Group; onClose: () => void; onUpdate: (group: Group) => void }) {
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const inviteLink = `${origin}/invite/${group.inviteCode}`;
  const baseInviteLink = `${origin}/invite/${group.inviteCode}`;
  const shareText = inviteMessageText(group.name, group.inviteCode, inviteLink);
  const whatsappLink = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  const mailtoLink = `mailto:?subject=${encodeURIComponent(`Join ${group.name} on pasia sakkio`)}&body=${encodeURIComponent(
    shareText,
  )}`;

  async function copyLink() {
    await navigator.clipboard?.writeText(inviteLink);
    setCopied(true);
    setMessage({ tone: "success", text: "Invite link copied. Send it anywhere you want." });
    window.setTimeout(() => setCopied(false), 1200);
  }

  async function copyInviteMessage(text = shareText) {
    await navigator.clipboard?.writeText(text);
    setCopied(true);
    setMessage({ tone: "success", text: "Invite message copied." });
    window.setTimeout(() => setCopied(false), 1200);
  }

  async function shareInvite() {
    if (navigator.share) {
      await navigator.share({
        title: `Join ${group.name}`,
        text: `Join ${group.name} on pasia sakkio.`,
        url: inviteLink,
      });
      setMessage({ tone: "success", text: "Invite link shared." });
      return;
    }

    await copyLink();
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal invite-modal" role="dialog" aria-modal="true" aria-labelledby="invite-title">
        <div className="section-head">
          <div>
            <p className="eyebrow">Invite</p>
            <h2 id="invite-title">Share invite link</h2>
          </div>
          <button className="icon-button" onClick={onClose} type="button" aria-label="Close invite dialog">
            <X size={18} />
          </button>
        </div>

        <div className="invite-code-card">
          <span className="setup-card-icon">
            <Mail size={22} />
          </span>
          <span>
            <strong>{group.inviteCode}</strong>
            <span className="muted">Invite code</span>
          </span>
        </div>

        <div className="form-grid form-offset">
          <label className="field">
            <span>Invite link</span>
            <input readOnly value={inviteLink} />
          </label>
          <div className="toolbar invite-action-grid">
            <button className="button teal" onClick={shareInvite} type="button">
              <Send size={17} /> Share invite
            </button>
            <button className="button" onClick={copyLink} type="button">
              <Copy size={17} /> {copied ? "Copied" : "Copy link"}
            </button>
            <button className="button" onClick={() => copyInviteMessage()} type="button">
              <Copy size={17} /> Copy message
            </button>
            <a className="button" href={whatsappLink} rel="noreferrer" target="_blank">
              WhatsApp
            </a>
            <a className="button" href={mailtoLink}>
              <Mail size={17} /> Email app
            </a>
          </div>
          {message && <p className={`notice ${message.tone}`}>{message.text}</p>}
        </div>

        {group.invitations.length > 0 && (
          <div className="list compact-list modal-list">
            {group.invitations.map((invite) => (
              <div className="list-row invite-row" key={invite.id}>
                <span>
                  <strong>{invite.email}</strong>
                  <br />
                  <span className="muted">{invite.status} - code {group.inviteCode} - {invite.sentAt}</span>
                  <br />
                  <span className="muted">{`${baseInviteLink}?email=${encodeURIComponent(invite.email)}`}</span>
                </span>
                <span className="row-actions">
                  <button
                    className="button"
                    onClick={() =>
                      copyInviteMessage(inviteMessageText(group.name, group.inviteCode, `${baseInviteLink}?email=${encodeURIComponent(invite.email)}`))
                    }
                    type="button"
                  >
                    <Copy size={16} /> Copy
                  </button>
                  <button
                    className="icon-button danger"
                    onClick={async () => onUpdate(await deleteInvitationRequest(group.id, invite.id))}
                    type="button"
                    aria-label={`Delete invite for ${invite.email}`}
                  >
                    <Trash2 size={17} />
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function inviteMessageText(groupName: string, inviteCode: string, inviteLink: string) {
  return `Join ${groupName} on pasia sakkio\n${inviteLink}\nInvite code: ${inviteCode}`;
}

function ConfirmDialog({
  action,
  onCancel,
  onConfirm,
}: {
  action: ConfirmAction;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal small-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <p className="eyebrow">Confirm</p>
        <h2 id="confirm-title">{action.title}</h2>
        <p className="muted">{action.body}</p>
        <div className="toolbar confirm-actions">
          <button className="button" onClick={onCancel} type="button">
            Cancel
          </button>
          <button className="button danger-solid" onClick={onConfirm} type="button">
            {action.confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
