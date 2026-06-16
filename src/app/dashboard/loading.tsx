import { AppShell } from "@/components/app-shell";

export default function DashboardLoading() {
  return (
    <AppShell>
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
    </AppShell>
  );
}
