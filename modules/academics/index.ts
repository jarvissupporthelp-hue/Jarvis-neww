import type { ModuleRegistration } from "@/lib/foundation/registry";

export const academics = {
  key: "academics",
  titleKey: "academics.title",
  titles: {
    hy: { "academics.title": "Ուսում" },
    en: { "academics.title": "Academics" },
  },
  routes: ["/academics"],
  navItem: "/academics",
  dashboardWidgets: [{ slot: "myDay", href: "/academics" }],
  permissions: ["student"],
} satisfies ModuleRegistration;
