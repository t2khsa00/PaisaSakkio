"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, UserPlus, UsersRound } from "lucide-react";
import type { Group } from "@/lib/types";
import { acceptInvite, getInvite } from "@/lib/api-client";

export function AcceptInviteClient({ accountId, code, email }: { accountId: string | null; code: string; email: string | null }) {
  const [group, setGroup] = useState<Group | null>(null);
  const [alreadyMember, setAlreadyMember] = useState(false);
  const [name, setName] = useState("");
  const [acceptedGroupId, setAcceptedGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getInvite(code)
      .then((data) => {
        setGroup(data.group);
        setAlreadyMember(data.alreadyMember);
        setError(null);
      })
      .catch((caught: Error) => setError(caught.message))
      .finally(() => setLoading(false));
  }, [code]);

  async function accept(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!group || !name.trim() || saving) return;

    setSaving(true);
    setError(null);
    try {
      const next = await acceptInvite(code, name, email);
      setGroup(next);
      setAcceptedGroupId(next.id);
      setAlreadyMember(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not accept invite.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="invite-page">
        <section className="invite-card panel panel-pad">
          <span className="setup-card-icon">
            <Loader2 size={22} />
          </span>
          <p className="eyebrow">Invite</p>
          <h1>Checking invite</h1>
          <p className="lead">Looking up this group in Supabase.</p>
        </section>
      </main>
    );
  }

  if (!group || error) {
    return (
      <main className="invite-page">
        <section className="invite-card panel panel-pad">
          <p className="eyebrow">Invite</p>
          <h1>Invite not found</h1>
          <p className="lead">{error ?? "This invite code does not match a group in the database."}</p>
          <Link className="button primary block-action" href="/groups">
            View groups
          </Link>
        </section>
      </main>
    );
  }

  if (acceptedGroupId) {
    return (
      <main className="invite-page">
        <section className="invite-card panel panel-pad">
          <span className="setup-card-icon success">
            <CheckCircle2 size={22} />
          </span>
          <p className="eyebrow invite-status-eyebrow">Accepted</p>
          <h1>{group.name}</h1>
          <p className="lead">This account is in the group. Open the workspace to continue.</p>
          <Link className="button primary block-action" href={`/groups/${acceptedGroupId}`}>
            Open group <ArrowRight size={17} />
          </Link>
        </section>
      </main>
    );
  }

  if (alreadyMember) {
    return (
      <main className="invite-page">
        <section className="invite-card panel panel-pad">
          <span className="setup-card-icon success">
            <CheckCircle2 size={22} />
          </span>
          <p className="eyebrow invite-status-eyebrow">Already joined</p>
          <h1>{group.name}</h1>
          <p className="lead">This account is already a member of this group.</p>
          <Link className="button primary block-action" href={`/groups/${group.id}`}>
            Open group <ArrowRight size={17} />
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="invite-page">
      <section className="balance-card invite-hero">
        <p className="balance-eyebrow">Invite</p>
        <h1>Join {group.name}</h1>
        <p>{email ? `${email} was invited.` : "You were invited."}</p>
        <div className="balance-pills">
          <span className="balance-pill">
            <span className="balance-pill-dot" />
            {group.members.length} member{group.members.length !== 1 ? "s" : ""}
          </span>
          <span className="balance-pill">
            <span className="balance-pill-dot" />
            {group.currency}
          </span>
        </div>
      </section>
      <section className="invite-card panel panel-pad">
        <span className="setup-card-icon">
          <UsersRound size={22} />
        </span>
        <p className="eyebrow">Profile</p>
        <h2>Your display name</h2>
        <p className="muted">This is the name other members will see in expenses, balances, and duties.</p>
        <form className="form-grid form-offset" onSubmit={accept}>
          <label className="field">
            <span>Your name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your display name" />
          </label>
          <button className="button teal" type="submit">
            <UserPlus size={17} /> {saving ? "Joining..." : "Accept invite"}
          </button>
          {error && <p className="notice error">{error}</p>}
        </form>
      </section>
    </main>
  );
}
