"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  CheckSquare,
  ChevronRight,
  Plus,
  ReceiptText,
  Scale,
  UsersRound,
} from "lucide-react";
import { useGroupSummaries } from "@/lib/use-group-summaries";

const AVATAR_COLORS = ["", "b", "c", "d"];

export function DashboardClient() {
  const { groups, error, loading } = useGroupSummaries();

  const stats = useMemo(() => {
    const totalSpend = groups.reduce((sum, group) => sum + group.totalSpend, 0);
    return {
      groupCount: groups.length,
      totalSpend,
      expenseCount: groups.reduce((sum, group) => sum + group.expenseCount, 0),
      openDuties: groups.reduce((sum, group) => sum + group.openDutyCount, 0),
      settlementCount: groups.reduce((sum, group) => sum + group.settlementCount, 0),
      receiptCount: groups.reduce((sum, group) => sum + group.receiptCount, 0),
    };
  }, [groups]);

  const recentGroups = groups.slice(0, 5);

  if (loading && groups.length === 0) {
    return <DashboardSummarySkeleton />;
  }

  return (
    <div className="dashboard-stack">
      <div className="balance-card">
        <p className="balance-eyebrow">Total tracked</p>
        <p className="balance-amount">
          {stats.totalSpend.toLocaleString("en", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
          <span className="cur">EUR</span>
        </p>
        <div className="balance-pills">
          <span className="balance-pill">
            <span className="balance-pill-dot" />
            {stats.expenseCount} expense{stats.expenseCount !== 1 ? "s" : ""}
          </span>
          <span className="balance-pill">
            <span className="balance-pill-dot" />
            {stats.groupCount} group{stats.groupCount !== 1 ? "s" : ""}
          </span>
          {stats.settlementCount > 0 && (
            <span className="balance-pill">
              <span className="balance-pill-dot" />
              {stats.settlementCount} to settle
            </span>
          )}
        </div>
      </div>

      {error && <p className="notice error">{error}</p>}

      <div className="quick-actions">
        <Link href="/groups" className="quick-action-btn">
          <span className="quick-action-icon-wrap teal">
            <UsersRound size={22} />
          </span>
          Groups
        </Link>
        <Link href="/groups/create" className="quick-action-btn">
          <span className="quick-action-icon-wrap violet">
            <Plus size={22} />
          </span>
          New group
        </Link>
        <Link href="/groups" className="quick-action-btn">
          <span className="quick-action-icon-wrap tomato">
            <Scale size={22} />
          </span>
          Settle up
        </Link>
      </div>

      <div className="mobile-section">
        <div className="mobile-section-head">
          <h3 className="mobile-section-title">Overview</h3>
        </div>
        <div className="mobile-stat-row dashboard-stat-row">
          <StatCard
            icon={<UsersRound size={19} />}
            tone="teal"
            value={stats.groupCount}
            label="Active groups"
          />
          <StatCard
            icon={<Scale size={19} />}
            tone="tomato"
            value={stats.settlementCount}
            label="Pending settlements"
          />
          <StatCard
            icon={<ReceiptText size={19} />}
            tone="blue"
            value={stats.receiptCount}
            label="Receipts noted"
          />
          <StatCard
            icon={<CheckSquare size={19} />}
            tone="violet"
            value={stats.openDuties}
            label="Open duties"
          />
        </div>
      </div>

      <div className="mobile-section">
        <div className="mobile-section-head">
          <h3 className="mobile-section-title">Recent groups</h3>
          {recentGroups.length > 0 && (
            <Link href="/groups" className="mobile-section-link">
              See all
            </Link>
          )}
        </div>

        {recentGroups.length === 0 ? (
          <Link href="/groups/create" className="dashboard-empty-link">
            <div className="mobile-empty">
              <span className="empty-action-icon">
                <Plus size={26} />
              </span>
              <p>Create your first group to start splitting expenses together.</p>
              <span className="button teal empty-action-button">
                <Plus size={17} /> Create group
              </span>
            </div>
          </Link>
        ) : (
          <div className="dashboard-group-list">
            {recentGroups.map((group, i) => {
              const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
              return (
                <Link
                  key={group.id}
                  href={`/groups/${group.id}`}
                  className="mobile-group-item"
                >
                  <span className={`mobile-group-avatar ${color}`}>
                    {group.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="mobile-group-copy">
                    <span className="mobile-group-name">
                      {group.name}
                    </span>
                    <span className="mobile-group-meta">
                      {group.memberCount} member
                      {group.memberCount !== 1 ? "s" : ""} ·{" "}
                      {group.expenseCount} expense
                      {group.expenseCount !== 1 ? "s" : ""}
                    </span>
                  </span>
                  <ChevronRight size={18} color="var(--muted)" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function DashboardSummarySkeleton() {
  return (
    <div className="dashboard-stack">
      <div className="balance-card loading-card" />
      <div className="quick-actions">
        <span className="quick-action-btn loading-tile" />
        <span className="quick-action-btn loading-tile" />
        <span className="quick-action-btn loading-tile" />
      </div>
      <div className="mobile-stat-row dashboard-stat-row">
        <span className="mobile-stat-card loading-tile" />
        <span className="mobile-stat-card loading-tile" />
        <span className="mobile-stat-card loading-tile" />
        <span className="mobile-stat-card loading-tile" />
      </div>
    </div>
  );
}

function StatCard({
  icon,
  tone,
  value,
  label,
}: {
  icon: React.ReactNode;
  tone: "teal" | "tomato" | "blue" | "violet";
  value: number;
  label: string;
}) {
  return (
    <div className="mobile-stat-card">
      <span className={`mobile-stat-icon ${tone}`}>
        {icon}
      </span>
      <span className="mobile-stat-value">{value}</span>
      <span className="mobile-stat-label">{label}</span>
    </div>
  );
}
