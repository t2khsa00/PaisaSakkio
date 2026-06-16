import { currentUser } from "@clerk/nextjs/server";
import { AppShell } from "@/components/app-shell";
import { CreateGroupClient } from "@/components/create-group-client";

export default async function CreateGroupPage() {
  const user = await currentUser();
  const accountId = user?.id ?? "signed-out";
  const ownerName = user?.firstName || user?.username || user?.primaryEmailAddress?.emailAddress || "Me";

  return (
    <AppShell>
      <CreateGroupClient accountId={accountId} ownerName={ownerName} />
    </AppShell>
  );
}
