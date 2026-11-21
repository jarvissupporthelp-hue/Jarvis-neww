"use client";
import {UiText} from "@/app/components/interface-language";


import { InterfaceLanguage } from "./interface-language";
import { ChevronDown, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, useRef, type ReactNode } from "react";
import { Avatar, avatars } from "@/modules/campus/library-personal";
import { workspaceText, type WorkspaceLanguage } from "@/lib/workspace-language";
import { getClient } from "@/lib/browser-supabase";

type Role = "student" | "lecturer" | "admin";
type Theme = "dark" | "light" | "system";
type IconName = "dashboard" | "calendar" | "courses" | "tasks" | "chat" | "plans" | "focus" | "users" | "layers" | "shield" | "math" | "arena" | "menu" | "close" | "sun" | "moon" | "monitor" | "arrow";

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
  math: <><path d="M4 19h16M4 4h16M8 4l7 15M18 7l-6 10"/></>,
  arena: <path d="M7 8h10a4 4 0 0 1 4 3.1l1 4.2a2.5 2.5 0 0 1-4.1 2.4L15 15H9l-2.9 2.7A2.5 2.5 0 0 1 2 15.3l1-4.2A4 4 0 0 1 7 8Zm0 2v4m-2-2h4m6 0h.01m3 0h.01"/>,
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

type NavItem = { href: string; label: string; icon: IconName; children?: NavItem[] };

const prefetchedRoutes = new Set(["/account", "/account/calendar", "/chat", "/lecturer"]);
const libraryNav: NavItem = { href: "/library", label: "Library", icon: "courses", children: [
    { href: "/library/digital", label: "Digital Library", icon: "courses" },
    { href: "/library/physical", label: "Physical Library", icon: "courses" },
    { href: "/library/loans", label: "My loans", icon: "courses" },
  ] };

const studentNav: NavItem[] = [
  { href: "/account", label: "My day", icon: "dashboard" },
  { href: "/dashboard", label: "University hub", icon: "layers" },
  { href: "/academics", label: "Academics", icon: "courses", children: [
    { href: "/academics", label: "Overview", icon: "courses" },
    { href: "/academics/courses", label: "Courses", icon: "courses" },
    { href: "/academics/assignments", label: "Assignments", icon: "tasks" },
  ] },
  { href: "/learning", label: "Learning tools", icon: "plans", children: [
    { href: "/learning", label: "Overview", icon: "plans" },
    { href: "/study-plans", label: "Study plans", icon: "plans" },
    { href: "/focus", label: "Focus timer", icon: "focus" },
  ] },
  { href: "/quizzes", label: "Practice quizzes", icon: "tasks" },
  { href: "/arena", label: "Arena", icon: "arena", children: [
    { href: "/arena", label: "Games", icon: "arena" },
    { href: "/arena/leaderboard", label: "Leaderboard", icon: "layers" },
  ] },
  { href: "/campus", label: "Campus resources", icon: "layers" },
  libraryNav,
  { href: "/career", label: "Career", icon: "users" },
  { href: "/account/calendar", label: "Calendar", icon: "calendar" },
  { href: "/account/tasks", label: "My tasks", icon: "tasks" },
  { href: "/chat", label: "AI Agent", icon: "chat", children: [
    { href: "/chat", label: "AI chat", icon: "chat" },
    { href: "/chat/math-visualization", label: "Math visualizations", icon: "math" },
  ] },
];

const lecturerNav: NavItem[] = [
  { href: "/dashboard", label: "University hub", icon: "dashboard" },
  { href: "/academics", label: "Academics", icon: "layers", children: [
    { href: "/academics", label: "Overview", icon: "layers" },
    { href: "/academics/courses", label: "Courses", icon: "courses" },
    { href: "/academics/assignments", label: "Assignments", icon: "tasks" },
    { href: "/lecturer", label: "My courses", icon: "courses" },
    { href: "/resources", label: "Course resources", icon: "layers" },
  ] },
  { href: "/arena", label: "Arena", icon: "arena", children: [
    { href: "/arena", label: "Games", icon: "arena" },
    { href: "/arena/leaderboard", label: "Leaderboard", icon: "layers" },
  ] },
  { href: "/campus", label: "Campus resources", icon: "layers" },
  libraryNav,
  { href: "/career", label: "Career", icon: "users" },
  { href: "/account/calendar", label: "Timetable", icon: "calendar" },
  { href: "/chat/math-visualization", label: "Math visualizations", icon: "math" },
];

const adminNav: NavItem[] = [
  { href: "/account", label: "Administration", icon: "dashboard", children: [
    { href: "/account", label: "Overview", icon: "dashboard" },
    { href: "/account/admin/users", label: "Users & access", icon: "users" },
    { href: "/account/admin/group", label: "Student groups", icon: "layers" },
    { href: "/account/admin/semester", label: "Semesters", icon: "calendar" },
    { href: "/account/admin/course", label: "Courses", icon: "courses" },
    { href: "/account/admin/offering", label: "Course offerings", icon: "plans" },
    { href: "/account/admin/timetable", label: "Timetable", icon: "calendar" },
    { href: "/account/admin/audit", label: "Audit history", icon: "shield" },
  ] },
  { href: "/dashboard", label: "University hub", icon: "layers" },
  { href: "/academics", label: "Academic tools", icon: "courses", children: [
    { href: "/academics", label: "Overview", icon: "courses" },
    { href: "/academics/courses", label: "Courses", icon: "courses" },
    { href: "/academics/assignments", label: "Assignments", icon: "tasks" },
  ] },
  { href: "/arena", label: "Arena", icon: "arena", children: [
    { href: "/arena", label: "Games", icon: "arena" },
    { href: "/arena/leaderboard", label: "Leaderboard", icon: "layers" },
  ] },
  { href: "/campus", label: "Campus resources", icon: "layers" },
  libraryNav,
  { href: "/career", label: "Career", icon: "users" },
  { href: "/chat/math-visualization", label: "Math visualizations", icon: "math" },
];

function WorkspaceNavigation({ items, pathname, language, onNavigate }: {
  items: NavItem[]; pathname: string; language: WorkspaceLanguage; onNavigate: () => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const links = items.flatMap(item => item.children ?? [item]);
  const current = links.filter(link => pathname === link.href || pathname.startsWith(link.href + "/"))
    .sort((a,b) => b.href.length - a.href.length)[0];
  const renderLink = (item: NavItem, nested = false) => <Link key={item.href} href={item.href}
    prefetch={current === item ? false : prefetchedRoutes.has(item.href) || undefined}
    aria-current={current === item ? "page" : undefined}
    className={"jarvis-side-link" + (current === item ? " is-active" : "") + (nested ? " is-nested" : "")}
    onClick={onNavigate}><Icon name={item.icon}/><span>{workspaceText(language,item.label)}</span></Link>;
  return <nav aria-label={workspaceText(language,"Workspace")} className="jarvis-side-links">{items.map(item => {
    if (!item.children) return renderLink(item);
    const active = item.children.some(child => child === current);
    const open = expanded[item.href] ?? active;
    const id = "subnav-" + item.href.slice(1);
    return <div key={item.href}>
      <button type="button" className={"jarvis-side-link nav-group" + (active ? " active-group" : "")}
        aria-expanded={open} aria-controls={id} onClick={() => setExpanded({...expanded,[item.href]:!open})}>
        <Icon name={item.icon}/><span>{workspaceText(language,item.label)}</span><ChevronDown size={15} className="nav-chevron"/>
      </button>
      <div className="nav-disclosure" data-open={open} inert={!open} id={id}><div>
        {item.children.map(child => renderLink(child,true))}
      </div></div>
    </div>;
  })}</nav>;
}

function mobileSnapshot() { return window.matchMedia("(max-width:740px)").matches; }
function subscribeMobile(change: () => void) {
  const query = window.matchMedia("(max-width:740px)");
  query.addEventListener("change",change);
  return () => query.removeEventListener("change",change);
}
function sidebarSnapshot() {
  try { return localStorage.getItem("jarvis-sidebar-hidden") === "true"; } catch { return false; }
}
function subscribeSidebar(change: () => void) {
  window.addEventListener("jarvis-sidebar",change);
  window.addEventListener("storage",change);
  return () => { window.removeEventListener("jarvis-sidebar",change); window.removeEventListener("storage",change); };
}
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

export function WorkspaceShell({ children, initialLanguage="en" }: { children: ReactNode; initialLanguage?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [preferences, setPreferences] = useState<{ language: WorkspaceLanguage; avatar: string }>({language:"en",avatar:""});
  const tr = (label: string) => workspaceText(preferences.language,label);
  const [role, setRole] = useState<Role | null>(null);
  const [drawerPath, setDrawerPath] = useState<string | null>(null);
  const drawerOpen = drawerPath === pathname;
  const menuButton = useRef<HTMLButtonElement>(null);
  const mobile = useSyncExternalStore(subscribeMobile,mobileSnapshot,() => false);
  const savedHidden = useSyncExternalStore(subscribeSidebar,sidebarSnapshot,() => false);
  const [fallbackHidden,setFallbackHidden] = useState(false);
  const hidden = savedHidden || fallbackHidden;
  const sidebarOpen = mobile ? drawerOpen : !hidden;
  const sidebar = useRef<HTMLElement>(null);
  function toggleSidebar() {
    if (mobile) setDrawerPath(drawerOpen ? null : pathname);
    else {
      try {
        localStorage.setItem("jarvis-sidebar-hidden", String(!hidden));
        window.dispatchEvent(new Event("jarvis-sidebar"));
      } catch { setFallbackHidden(!hidden); }
    }
    if (sidebarOpen) menuButton.current?.focus();
  }
  useEffect(() => {
    if (mobile && drawerOpen) sidebar.current?.querySelector<HTMLElement>("nav .jarvis-side-link")?.focus();
  }, [mobile, drawerOpen]);
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
    async function inspect(token: string | undefined, id?: string) {
      const current = ++revision;
      if (!token) {
        if (active) { document.cookie="jarvis-language=; Path=/; Max-Age=0; SameSite=Lax"; setRole(null); setPreferences({language:"en",avatar:""}); }
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
      if (!active || current !== revision) return;
      setRole(next);
      if (next && id) {
        const result = await getClient().from("library_profiles").select("language,avatar").eq("user_id",id).maybeSingle();
        if (!active || current !== revision) return;
        if (result.error) return;
        const language = result.data?.language ?? "en";
        const avatar = result.data?.avatar ?? avatars[parseInt(id.slice(0,8),16)%avatars.length];
        setPreferences({language,avatar});
        document.documentElement.lang = language;
        if (!document.cookie.split("; ").includes("jarvis-language="+language)) {
          document.cookie = "jarvis-language="+language+"; Path=/; Max-Age=31536000; SameSite=Lax";
          router.refresh();
        }
      }
    }
    try {
      const client = getClient();
      // INITIAL_SESSION supplies the starting session through the same subscription.
      const { data } = client.auth.onAuthStateChange((_event, session) => { void inspect(session?.access_token, session?.user.id); });
      const refresh = () => { void client.auth.getSession().then(({data})=>inspect(data.session?.access_token,data.session?.user.id)); };
      window.addEventListener("jarvis-profile-saved",refresh);
      return () => { active = false; data.subscription.unsubscribe(); window.removeEventListener("jarvis-profile-saved",refresh); };
    } catch { return () => { active = false; }; }
  }, [router]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDrawerPath(null);
        menuButton.current?.focus();
      }
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [drawerOpen]);

  function changeTheme(next: Theme) {
    try { window.localStorage.setItem("jarvis-theme", next); } catch { /* Storage may be disabled. */ }
    window.dispatchEvent(new Event("jarvis-theme-changed"));
  }

  const isLanding = pathname === "/";
  const items = role === "admin" ? adminNav : role === "lecturer" ? lecturerNav : studentNav;
  const workspace = !isLanding && role !== null;
  const roleName = role === "admin" ? "Administration" : role === "lecturer" ? "Lecturer workspace" : "Student workspace";
  return (
    <InterfaceLanguage.Provider value={role ? preferences.language : initialLanguage}>
    <div className="jarvis-app">
      <a className="jarvis-skip-link" href="#jarvis-main-content"><UiText value={"Skip to main content"}/></a>
      <header className="jarvis-topbar">
        <div className="jarvis-topbar-start">
          {workspace && <button ref={menuButton} className="jarvis-nav-control" aria-label={tr(sidebarOpen ? "Close navigation" : "Open navigation")}
            title={tr(sidebarOpen ? "Close navigation" : "Open navigation")} aria-controls="jarvis-workspace-navigation" aria-expanded={sidebarOpen} type="button"
            onClick={toggleSidebar}><Menu size={20} aria-hidden="true"/></button>}
          <Link href="/" className="jarvis-brand" aria-label="JARVIS home">
            <span className="jarvis-brand-symbol"><span>J</span></span>
            <span className="jarvis-brand-text">JARVIS<small>ACADEMIC WORKSPACE</small></span>
          </Link>
          <span className="jarvis-topbar-divider"/>
          <span className="jarvis-topbar-context">{workspace ? tr(roleName) : "University platform"}</span>
        </div>
        <div className="jarvis-topbar-actions">
          <span className="jarvis-university-chip">UFAR · Pilot</span>
          <ThemeSelector theme={theme} onChange={changeTheme}/>
          {!role && <Link className="jarvis-header-signin" href="/account"><UiText value="Sign in"/> <Icon name="arrow" size={15}/></Link>}
          {role && <Link href="/account/profile" className="inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full" aria-label={tr("Profile")} title={tr("Profile")}><Avatar value={preferences.avatar || "👤"}/></Link>}
        </div>
      </header>
      <div className="jarvis-shell-body" data-collapsed={hidden}>
        {workspace && <>
          <div className="jarvis-drawer-overlay" data-open={drawerOpen} aria-hidden="true" onPointerDown={toggleSidebar}/>
          <aside ref={sidebar} inert={!sidebarOpen} id="jarvis-workspace-navigation" className={"jarvis-sidebar" + (drawerOpen ? " is-open" : "")} aria-label={roleName + " navigation"}>
            <div className="jarvis-sidebar-content">
              <div className="nav-sidebar-heading">{tr(roleName)}</div>
              <WorkspaceNavigation key={role + pathname} items={items} pathname={pathname} language={preferences.language} onNavigate={() => setDrawerPath(null)}/>
            </div>
          </aside>
        </>}
        <div id="jarvis-main-content" inert={workspace && mobile && drawerOpen} tabIndex={-1} className={"jarvis-main-area" + (workspace ? " has-sidebar" : "") + (isLanding ? " is-landing" : "")}>{children}</div>
      </div>
    </div>
    </InterfaceLanguage.Provider>
  );
}

