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

export type Locale = keyof typeof landing;

export function isLocale(value: string | null): value is Locale {
  return value === "hy" || value === "en";
}
