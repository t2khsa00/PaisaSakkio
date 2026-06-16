export type Member = {
  id: string;
  accountId?: string;
  name: string;
  avatar: string;
  role: "owner" | "member";
};

export type Invitation = {
  id: string;
  email: string;
  status: "Pending" | "Accepted";
  sentAt: string;
};

export type Expense = {
  id: string;
  title: string;
  description?: string;
  amount: number;
  currency: string;
  paidBy: string;
  date: string;
  participants: string[];
  splitType: "equal" | "custom";
  shares: Record<string, number>;
  receipt?: string;
  receiptPath?: string;
  receiptName?: string;
  receiptType?: string;
};

export type Duty = {
  id: string;
  title: string;
  assignee: string;
  assignees: string[];
  due: string;
  status: "Assigned" | "Done";
  linkedExpense?: string;
};

export type Settlement = {
  id?: string;
  from: string;
  to: string;
  amount: number;
  currency: string;
  date?: string;
  note?: string;
};

export type Group = {
  id: string;
  ownerId: string;
  name: string;
  inviteCode: string;
  currency: string;
  members: Member[];
  invitations: Invitation[];
  expenses: Expense[];
  duties: Duty[];
  settlements: Settlement[];
};

export type GroupSummary = {
  id: string;
  ownerId: string;
  name: string;
  inviteCode: string;
  currency: string;
  memberCount: number;
  expenseCount: number;
  totalSpend: number;
  receiptCount: number;
  openDutyCount: number;
  settlementCount: number;
};
