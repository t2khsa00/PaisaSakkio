"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Sparkles, UsersRound } from "lucide-react";
import { createGroup } from "@/lib/api-client";

export function CreateGroupClient({ accountId, ownerName }: { accountId: string; ownerName: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleCreateGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || saving) return;

    setSaving(true);
    setError(null);
    try {
      const group = await createGroup(name, currency);
      router.push(`/groups/${group.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create group.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="setup-page">
      <div className="balance-card setup-hero">
        <p className="eyebrow">Create</p>
        <h1>New group</h1>
        <p className="lead">Creating as {ownerName}. Name the group, choose currency, then invite members and add expenses inside the group workspace.</p>
        <div className="balance-pills">
          <span className="balance-pill">
            <span className="balance-pill-dot" />
            Expenses
          </span>
          <span className="balance-pill">
            <span className="balance-pill-dot" />
            Duties
          </span>
          <span className="balance-pill">
            <span className="balance-pill-dot" />
            Balances
          </span>
        </div>
      </div>

      <div className="panel panel-pad setup-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Group setup</p>
            <h2>Start clean</h2>
          </div>
          <span className="setup-card-icon">
            <UsersRound size={22} />
          </span>
        </div>
        <form className="form-grid form-offset" onSubmit={handleCreateGroup}>
          <label className="field">
            <span>Group name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Flatmates, trip, project" />
          </label>
          <label className="field">
            <span>Currency</span>
            <select value={currency} onChange={(event) => setCurrency(event.target.value)}>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="NPR">NPR</option>
              <option value="GBP">GBP</option>
            </select>
          </label>
          <button className="button teal" type="submit">
            {saving ? <Sparkles size={17} /> : <Plus size={17} />} {saving ? "Creating..." : "Create group"}
          </button>
          {error && <p className="notice error">{error}</p>}
        </form>
      </div>
    </section>
  );
}
