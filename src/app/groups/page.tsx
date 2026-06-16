import { AppShell } from "@/components/app-shell";
import { GroupsListClient } from "@/components/groups-list-client";

export default function GroupsPage() {
  return (
    <AppShell>
      <GroupsListClient />
    </AppShell>
  );
}
