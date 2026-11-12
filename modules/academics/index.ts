import type { ModuleRegistration } from "@/lib/foundation/registry";

export const academics = {
  key: "academics",
  titleKey: "academics.title",
  titles: {
    hy: { "academics.title": "Ուսում" },
    en: { "academics.title": "Academics" },
  },
  routes: ["/account"],
  navItem: "/account",
  dashboardWidgets: [{ slot: "myDay", href: "/account#student-timetable" }],
  permissions: ["student"],
} satisfies ModuleRegistration;
