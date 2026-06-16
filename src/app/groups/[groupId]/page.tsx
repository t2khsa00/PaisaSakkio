import { auth } from "@clerk/nextjs/server";
import { AppShell } from "@/components/app-shell";
import { GroupWorkspace } from "@/components/group-workspace";

type PageProps = {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ tab?: "expenses" | "balances" | "duties" }>;
};

export default async function GroupPage({ params, searchParams }: PageProps) {
  const [{ groupId }, query, { userId }] = await Promise.all([params, searchParams, auth()]);
  const initialTab = query.tab ?? "expenses";

  return (
    <AppShell>
      <GroupWorkspace accountId={userId ?? "signed-out"} groupId={groupId} initialTab={initialTab} />
    </AppShell>
  );
}
