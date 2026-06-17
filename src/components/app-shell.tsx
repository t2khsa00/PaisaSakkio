"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { Home, Plus, UsersRound, Wallet } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/personal", label: "Personal", icon: Wallet },
  { href: "/groups", label: "Groups", icon: UsersRound },
  { href: "/groups/create", label: "Create", icon: Plus },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useUser();
  const displayName =
    user?.firstName ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress ||
    "Account";

  const isActiveHref = (href: string) =>
    href === "/dashboard"
      ? pathname === href
      : href === "/groups"
        ? pathname === href ||
          (pathname.startsWith("/groups/") &&
            !pathname.startsWith("/groups/create"))
        : pathname === href;

  return (
    <div className="shell" suppressHydrationWarning>
      {/* ── Desktop sidebar ───────────────────────────── */}
      <aside className="sidebar">
        <Link className="brand" href="/dashboard">
          <span className="mark">ps</span>
          <span>pasia sakkio</span>
        </Link>

        <nav className="nav" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActiveHref(item.href);
            return (
              <Link
                className={`nav-item ${active ? "active" : ""}`}
                href={item.href}
                key={item.href}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div style={{ marginTop: "auto" }}>
          <div className="account-chip" style={{ width: "100%" }}>
            <UserButton />
            <span>{displayName}</span>
          </div>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────── */}
      <main className="content">
        {/* Mobile greeting header */}
        <header className="mobile-topbar">
          <div style={{ minWidth: 0 }}>
            <p
              suppressHydrationWarning
              style={{ margin: 0, fontSize: 12.5, color: "var(--muted)", fontWeight: 650 }}
            >
              {getGreeting()},
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 21,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {displayName}
            </p>
          </div>
          <UserButton />
        </header>

        {/* Desktop greeting header */}
        <div className="topbar">
          <div>
            <p
              suppressHydrationWarning
              style={{ margin: 0, fontSize: 14, color: "var(--muted)", fontWeight: 650 }}
            >
              {getGreeting()},
            </p>
            <h2 style={{ margin: 0 }}>{displayName}</h2>
          </div>
          <UserButton />
        </div>

        {children}
      </main>

      {/* ── Mobile bottom tab bar ─────────────────────── */}
      <nav className="mobile-bar" aria-label="Mobile navigation">
        {[
          { href: "/dashboard", label: "Home", icon: Home },
          { href: "/personal", label: "Personal", icon: Wallet },
          { href: "/groups", label: "Groups", icon: UsersRound },
          { href: "/groups/create", label: "New", icon: Plus },
        ].map((item) => {
          const Icon = item.icon;
          const active = isActiveHref(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mobile-tab ${active ? "active-tab" : ""}`}
              aria-label={item.label}
            >
              <span className="mobile-tab-icon">
                <Icon size={21} strokeWidth={active ? 2.3 : 1.9} />
              </span>
              <span className="mobile-tab-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
