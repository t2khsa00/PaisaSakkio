"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, ChevronRight, Copy, Plus, ReceiptText, Trash2 } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { deleteGroup as deleteGroupRequest } from "@/lib/api-client";
import { useGroupSummaries } from "@/lib/use-group-summaries";

export function GroupsListClient() {
  const router = useRouter();
  const { user } = useUser();
  const accountId = user?.id ?? null;
  const { groups, error: loadError, loading, setGroups } = useGroupSummaries();
  const [deleteTarget, setDeleteTarget] = useState<(typeof groups)[number] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function deleteGroup() {
    if (!deleteTarget) return;
    if (!accountId || deleteTarget.ownerId !== accountId) {
      setDeleteTarget(null);
      return;
    }

    setBusy(true);
    try {
      await deleteGroupRequest(deleteTarget.id);
      setGroups((current) => current.filter((group) => group.id !== deleteTarget.id));
      setDeleteTarget(null);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete group.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="panel panel-pad">
        <div className="section-head">
          <div>
            <p className="eyebrow">Groups</p>
            <h1>Your groups</h1>
            <p className="lead">Open a group to manage members, expenses, balances, and duties.</p>
          </div>
          <Link className="button teal" href="/groups/create">
            <Plus size={17} /> New group
          </Link>
        </div>
      </section>

      <section className="panel panel-pad section-offset">
        {(error || loadError) && <p className="notice error">{error ?? loadError}</p>}
        <div className="list">
          {loading && groups.length === 0 ? (
            <>
              <div className="list-row group-list-row loading-row" />
              <div className="list-row group-list-row loading-row" />
              <div className="list-row group-list-row loading-row" />
            </>
          ) : groups.length === 0 ? (
            <Link className="list-row" href="/groups/create">
              <span>
                <strong>No groups yet</strong>
                <br />
                <span className="muted">Create a group first. No fake starter group is added.</span>
              </span>
              <ArrowRight size={18} />
            </Link>
          ) : (
            groups.map((group) => {
              const canDeleteGroup = group.ownerId === accountId;
              const groupHref = `/groups/${group.id}`;
              return (
                <div
                  aria-label={`Open ${group.name}`}
                  className="list-row group-list-row"
                  key={group.id}
                  onClick={() => router.push(groupHref)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      router.push(groupHref);
                    }
                  }}
                  role="link"
                  tabIndex={0}
                >
                  <span className="group-list-avatar">{group.name.charAt(0).toUpperCase()}</span>
                  <span className="group-list-main">
                    <strong>{group.name}</strong>
                    <span>
                      {group.memberCount} member{group.memberCount !== 1 ? "s" : ""} · {group.expenseCount} expense{group.expenseCount !== 1 ? "s" : ""} · {group.settlementCount} settlement move{group.settlementCount !== 1 ? "s" : ""}
                    </span>
                  </span>
                  <span className="group-list-meta">
                    <span className="pill violet">
                      <Copy size={13} /> {group.inviteCode}
                    </span>
                    <span className="pill blue">
                      <ReceiptText size={13} /> {group.currency}
                    </span>
                  </span>
                  {canDeleteGroup ? (
                    <button
                      className="icon-button danger"
                      onClick={(event) => {
                        event.stopPropagation();
                        setDeleteTarget(group);
                      }}
                      type="button"
                      aria-label={`Delete ${group.name}`}
                    >
                      <Trash2 size={18} />
                    </button>
                  ) : (
                    <span className="pill green">Joined</span>
                  )}
                  <ChevronRight className="group-list-chev" size={18} />
                </div>
              );
            })
          )}
        </div>
      </section>

      {deleteTarget && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal small-modal" role="dialog" aria-modal="true" aria-labelledby="delete-group-title">
            <p className="eyebrow">Confirm</p>
            <h2 id="delete-group-title">Delete group?</h2>
            <p className="muted">This removes "{deleteTarget.name}" and all of its members, expenses, duties, and invites.</p>
            <div className="toolbar confirm-actions">
              <button className="button" onClick={() => setDeleteTarget(null)} type="button">
                Cancel
              </button>
              <button className="button danger-solid" disabled={busy} onClick={deleteGroup} type="button">
                {busy ? "Deleting..." : "Delete group"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
