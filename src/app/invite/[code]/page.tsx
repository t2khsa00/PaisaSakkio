import { auth } from "@clerk/nextjs/server";
import { AcceptInviteClient } from "@/components/accept-invite-client";

type PageProps = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ email?: string }>;
};

export default async function InvitePage({ params, searchParams }: PageProps) {
  const [{ code }, query, authState] = await Promise.all([params, searchParams, auth()]);

  if (!authState.userId) {
    return authState.redirectToSignIn();
  }

  return <AcceptInviteClient accountId={authState.userId} code={code} email={query.email ?? null} />;
}
