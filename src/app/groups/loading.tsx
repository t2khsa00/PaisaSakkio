import { AppShell } from "@/components/app-shell";

export default function GroupsLoading() {
  return (
    <AppShell>
      <section className="panel panel-pad">
        <div className="loading-line short" />
        <div className="loading-line title" />
        <div className="loading-line" />
      </section>
      <section className="panel panel-pad section-offset">
        <div className="list">
          <div className="list-row group-list-row loading-row" />
          <div className="list-row group-list-row loading-row" />
          <div className="list-row group-list-row loading-row" />
        </div>
      </section>
    </AppShell>
  );
}
