import type { ComponentType } from "react";
import type { Locale } from "@/lib/locales";
import type { FoundationRole } from "./roles";

export type DashboardSlot = "myDay" | "search" | "notifications" | "saved" | "requests" | "quick";

export type ModuleRegistration = {
  key: string;
  titleKey: string;
  titles: Record<Locale, Record<string, string>>;
  routes: readonly string[];
  navItem: string;
  dashboardWidgets: readonly { slot: DashboardSlot; href: string }[];
  permissions: readonly FoundationRole[];
  Page?: ComponentType<{ locale: Locale }>;
};

export { academics } from "@/modules/academics";
