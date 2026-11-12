export const landing = {
  hy: {
    brand: "JARVIS",
    pilot: "ՀՖՀՀ փորձնական ծրագիր",
    description: "Ուսումնական հարթակ՝ դասընթացների, դասացուցակի և քննություններին պատրաստվելու համար։",
    invitation: "Փորձնական հարթակը հասանելի է հրավերով։",
    signIn: "Մուտք գործել JARVIS",
    language: "Լեզու",
  },
  en: {
    brand: "JARVIS",
    pilot: "UFAR pilot",
    description: "An academic workspace for your courses, timetable, and exam preparation.",
    invitation: "Pilot access is by invitation.",
    signIn: "Sign in to JARVIS",
    language: "Language",
  },
};

export const mathVisualization = {
  hy: {
    eyebrow: "JARVIS · AI AGENT",
    title: "Մաթեմատիկայի պատկերացում",
    description: "Ընտրիր թեմա, փոխիր պարամետրերը և տես, թե ինչպես են աշխատում բանաձևերը։ Գործիքը բացվում է հենց JARVIS-ում։",
    topics: "Ընտրիր թեմա",
    all: "Բոլոր թեմաները",
    back: "Վերադառնալ AI Agent բաժին",
    language: "Լեզու",
    note: "Ինտերակտիվ լաբորատորիայի միջերեսը ներկայումս անգլերեն է։",
    frame: "Ինտերակտիվ մաթեմատիկական լաբորատորիա",
  },
  en: {
    eyebrow: "JARVIS · AI AGENT",
    title: "Math visualizations",
    description: "Choose a topic, adjust the controls, and see the mathematics change in real time. Explore the lab right inside JARVIS.",
    topics: "Choose a topic",
    all: "All topics",
    back: "Back to AI Agent",
    language: "Language",
    note: "The interactive lab is currently in English.",
    frame: "Interactive mathematics laboratory",
  },
} as const;

export type Locale = keyof typeof landing;

export function isLocale(value: string | null): value is Locale {
  return value === "hy" || value === "en";
}
