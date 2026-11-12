import { AccountForm, type AccountView } from "./account-form";
import type { AdminSection } from "./admin-workspace";

export function AccountScreen({ view = "dashboard", adminSection }: {
  view?: AccountView;
  adminSection?: AdminSection;
}) {
  const name = adminSection ? "Administration" : view === "calendar" ? "Calendar" : view === "tasks" ? "My tasks" : "Your workspace";
  const subtitle = adminSection
    ? "Manage academic records and user access in one place."
    : view === "calendar" ? "Your university schedule and personal events."
    : view === "tasks" ? "Stay organized and make progress one task at a time."
    : "Your academic tools, lessons and university information.";

  return <main className="w-full">
    <div className="jarvis-account-page-heading">
      <span className="jarvis-eyebrow">JARVIS · ACADEMIC WORKSPACE</span>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{name}</h1>
      <p className="mt-2 text-sm" style={{color:"var(--muted)"}}>{subtitle}</p>
    </div>
    <AccountForm view={view} adminSection={adminSection} />
  </main>;
}
