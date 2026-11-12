"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { getClient } from "@/lib/browser-supabase";

type Role = "student" | "lecturer" | "admin";
type Theme = "dark" | "light" | "system";
type IconName = "dashboard" | "calendar" | "courses" | "tasks" | "chat" | "plans" | "focus" | "users" | "layers" | "shield" | "menu" | "close" | "sun" | "moon" | "monitor" | "arrow";

const paths: Record<IconName, ReactNode> = {
  dashboard: <><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></>,
  courses: <><path d="M3 5.5C6 4 9 4 12 6v15c-3-2-6-2-9-.5zM21 5.5c-3-1.5-6-1.5-9 .5v15c3-2 6-2 9-.5z"/></>,
  tasks: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="m7 12 3 3 6-7"/></>,
  chat: <><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H5l-2 2v-8A8.5 8.5 0 1 1 21 11.5Z"/><path d="M8 11h8M8 15h5"/></>,
  plans: <><path d="M12 3 3 8l9 5 9-5-9-5ZM3 13l9 5 9-5M3 18l9 4 9-4"/></>,
  focus: <><circle cx="12" cy="13" r="8"/><path d="M12 9v5l3 2M9 2h6M12 2v3"/></>,
  users: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5v1"/></>,
  layers: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11"/></>,
  shield: <><path d="M12 2 4 5v6c0 6 4 10 8 11 4-1 8-5 8-11V5z"/><path d="m9 12 2 2 4-4"/></>,
  menu: <path d="M4 6h16M4 12h16M4 18h16"/>,
  close: <path d="M5 5 19 19M19 5 5 19"/>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></>,
  moon: <path d="M20 15A8 8 0 0 1 9 4a8 8 0 1 0 11 11Z"/>,
  monitor: <><rect x="2" y="3" width="20" height="15" rx="2"/><path d="M8 22h8M12 18v4"/></>,
  arrow: <path d="M5 12h14m-6-6 6 6-6 6"/>,
};

function Icon({ name, size = 19 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

type NavItem = { href: string; label: string; icon: IconName };

const studentNav: NavItem[] = [
  { href: "/account", label: "Dashboard", icon: "dashboard" },
  { href: "/account#student-timetable", label: "Calendar", icon: "calendar" },
  { href: "/account#student-tasks", label: "My tasks", icon: "tasks" },
  { href: "/resources", label: "Course library", icon: "courses" },
  { href: "/study-plans", label: "Study plans", icon: "plans" },
  { href: "/chat", label: "Ask JARVIS", icon: "chat" },
  { href: "/quizzes", label: "Practice quizzes", icon: "tasks" },
  { href: "/focus", label: "Focus timer", icon: "focus" },
];
const lecturerNav: NavItem[] = [
  { href: "/lecturer", label: "My courses", icon: "courses" },
  { href: "/account", label: "Timetable", icon: "calendar" },
  { href: "/resources", label: "Course resources", icon: "layers" },
];
const adminNav: NavItem[] = [
  { href: "/account", label: "Overview", icon: "dashboard" },
  { href: "/account#admin-users", label: "Users & access", icon: "users" },
  { href: "/account#admin-group", label: "Student groups", icon: "layers" },
  { href: "/account#admin-semester", label: "Semesters", icon: "calendar" },
  { href: "/account#admin-course", label: "Courses", icon: "courses" },
  { href: "/account#admin-offering", label: "Course offerings", icon: "plans" },
  { href: "/account#admin-timetable", label: "Timetable", icon: "calendar" },
  { href: "/account#admin-audit", label: "Audit history", icon: "shield" },
];

function ThemeSelector({ theme, onChange }: { theme: Theme; onChange: (theme: Theme) => void }) {
  const options: { value: Theme; name: string; icon: IconName }[] = [
    { value: "dark", name: "Dark", icon: "moon" },
    { value: "light", name: "Light", icon: "sun" },
    { value: "system", name: "System", icon: "monitor" },
  ];
  return <div className="jarvis-theme-selector" aria-label="Appearance">
    {options.map((option) => <button key={option.value} type="button" title={option.name} aria-label={option.name + " theme"}
      aria-pressed={theme === option.value} onClick={() => onChange(option.value)}><Icon name={option.icon} size={16}/><span>{option.name}</span></button>)}
  </div>;
}

function readTheme(): Theme {
  try {
    const value = window.localStorage.getItem("jarvis-theme");
    return value === "dark" || value === "light" || value === "system" ? value : "dark";
  } catch {
    return "dark";
  }
}

function subscribeTheme(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("jarvis-theme-changed", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("jarvis-theme-changed", callback);
  };
}

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [role, setRole] = useState<Role | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const theme = useSyncExternalStore<Theme>(subscribeTheme, readTheme, () => "dark");

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved = theme === "system" ? (media.matches ? "dark" : "light") : theme;
      document.documentElement.dataset.theme = resolved;
      document.documentElement.style.colorScheme = resolved;
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);

  useEffect(() => {
    let active = true;
    let revision = 0;
    async function inspect(token: string | undefined) {
      const current = ++revision;
      if (!token) {
        if (active) setRole(null);
        return;
      }
      let next: Role | null = null;
      try {
        const response = await fetch("/api/me", { headers: { Authorization: "Bearer " + token }, cache: "no-store" });
        if (response.ok) {
          const result = await response.json();
          if (result.role === "student" || result.role === "lecturer" || result.role === "admin") next = result.role;
        }
      } catch { /* Keep the guest shell on auth errors. */ }
      if (active && current === revision) setRole(next);
    }
    try {
      const client = getClient();
      void client.auth.getSession().then(({ data }) => inspect(data.session?.access_token)).catch(() => inspect(undefined));
      const { data } = client.auth.onAuthStateChange((_event, session) => { void inspect(session?.access_token); });
      return () => { active = false; data.subscription.unsubscribe(); };
    } catch { return () => { active = false; }; }
  }, []);

  function changeTheme(next: Theme) {
    try { window.localStorage.setItem("jarvis-theme", next); } catch { /* Storage may be disabled. */ }
    window.dispatchEvent(new Event("jarvis-theme-changed"));
  }

  const isLanding = pathname === "/";
  const items = role === "admin" ? adminNav : role === "lecturer" ? lecturerNav : studentNav;
  const workspace = !isLanding && role !== null;
  const roleName = role === "admin" ? "Administration" : role === "lecturer" ? "Lecturer workspace" : "Student workspace";
  return (
    <div className="jarvis-app">
      <header className="jarvis-topbar">
        <div className="jarvis-topbar-start">
          {workspace && <button className="jarvis-mobile-menu" aria-label={drawerOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={drawerOpen} type="button" onClick={() => setDrawerOpen((value) => !value)}><Icon name={drawerOpen ? "close" : "menu"}/></button>}
          <Link href="/" className="jarvis-brand" aria-label="JARVIS home">
            <span className="jarvis-brand-symbol"><span>J</span></span>
            <span className="jarvis-brand-text">JARVIS<small>ACADEMIC WORKSPACE</small></span>
          </Link>
          <span className="jarvis-topbar-divider"/>
          <span className="jarvis-topbar-context">{workspace ? roleName : "University platform"}</span>
        </div>
        <div className="jarvis-topbar-actions">
          <span className="jarvis-university-chip">UFAR · Pilot</span>
          <ThemeSelector theme={theme} onChange={changeTheme}/>
          {!workspace && <Link className="jarvis-header-signin" href="/account">Sign in <Icon name="arrow" size={15}/></Link>}
          {workspace && <span className="jarvis-profile-chip" aria-label={roleName}>{role === "admin" ? "AD" : role === "lecturer" ? "LC" : "ST"}</span>}
        </div>
      </header>
      <div className="jarvis-shell-body">
        {workspace && <>
          {drawerOpen && <button className="jarvis-drawer-overlay" type="button" aria-label="Close navigation" onClick={() => setDrawerOpen(false)}/>}
          <aside className={"jarvis-sidebar" + (drawerOpen ? " is-open" : "")} aria-label={roleName + " navigation"}>
            <div className="jarvis-sidebar-content">
              <div className="jarvis-sidebar-eyebrow">WORKSPACE</div>
              <div className="jarvis-sidebar-title">{roleName}</div>
              <nav aria-label="Main navigation" className="jarvis-side-links">
                {items.map((item) => {
                  const current = item.href === "/account" ? pathname === "/account" && !windowHash(item.href) : pathname === item.href.split("#")[0] && !item.href.includes("#");
                  return <Link key={item.href} href={item.href} className={"jarvis-side-link" + (current ? " is-active" : "")} onClick={() => setDrawerOpen(false)}>
                    <Icon name={item.icon}/><span>{item.label}</span>
                  </Link>;
                })}
              </nav>
            </div>
            <div className="jarvis-sidebar-foot">
              <div className="jarvis-sidebar-foot-mark">✦</div>
              <div><strong>Designed for learning</strong><span>One workspace. More clarity.</span></div>
            </div>
          </aside>
        </>}
        <div className={"jarvis-main-area" + (workspace ? " has-sidebar" : "") + (isLanding ? " is-landing" : "")}>{children}</div>
      </div>
    </div>
  );
}

function windowHash(href: string) {
  return href.includes("#");
}
