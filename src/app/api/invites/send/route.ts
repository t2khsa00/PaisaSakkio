import { NextResponse } from "next/server";

type InvitePayload = {
  email?: string;
  groupName?: string;
  inviteLink?: string;
  inviteCode?: string;
};

export async function POST(request: Request) {
  const payload = (await request.json()) as InvitePayload;
  const email = payload.email?.trim().toLowerCase();
  const groupName = payload.groupName?.trim();
  const inviteLink = payload.inviteLink?.trim();
  const inviteCode = payload.inviteCode?.trim();
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Email invites are not configured. Use the invite link instead." },
      { status: 503 },
    );
  }

  if (!email || !groupName || !inviteLink || !inviteCode) {
    return NextResponse.json({ error: "Email, group name, invite link, and invite code are required." }, { status: 400 });
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || "pasia sakkio <onboarding@resend.dev>",
      to: [email],
      subject: `Join ${groupName} on pasia sakkio`,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;line-height:1.55;color:#201d19">
          <h1 style="font-size:24px;margin:0 0 12px">You are invited to ${escapeHtml(groupName)}</h1>
          <p>Join the group on <strong>pasia sakkio</strong> to track shared expenses, balances, receipts, and duties.</p>
          <p style="margin:22px 0">
            <a href="${escapeHtml(inviteLink)}" style="background:#201d19;color:#fff8ec;padding:12px 16px;border-radius:8px;text-decoration:none;font-weight:700">Accept invite</a>
          </p>
          <p>Invite code: <strong>${escapeHtml(inviteCode)}</strong></p>
          <p style="color:#736b61;font-size:13px">If the button does not work, paste this link into your browser:<br>${escapeHtml(inviteLink)}</p>
        </div>
      `,
      text: `Join ${groupName} on pasia sakkio.\n\nAccept invite: ${inviteLink}\nInvite code: ${inviteCode}`,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data?.message || "Resend could not send the invite.";
    const isTestMode =
      response.status === 403 ||
      /domain|verify|testing|own email|recipient|onboarding@resend.dev/i.test(message);

    return NextResponse.json(
      {
        error: isTestMode
          ? "Email invites are in Resend test mode. Copy the invite link and send it manually."
          : message,
      },
      { status: response.status },
    );
  }

  return NextResponse.json({ ok: true, id: data?.id ?? null });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
