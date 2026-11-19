const faculties: Record<string, string> = {
  I: "Faculty of Computer Science and Applied Mathematics (IMA)",
  L: "Faculty of Law",
  M: "Faculty of Marketing",
};

export function studentIdentity(email?: string) {
  const parts = /^([a-z]+)(\d{2})\.([\p{L}'’-]+)\.([\p{L}'’-]+)@etud\.ufar\.am$/iu.exec(email ?? "");
  if (!parts) return undefined;
  const facultyCode = parts[1].toUpperCase();
  return { givenName: parts[4], surname: parts[3], facultyCode, faculty: faculties[facultyCode] };
}

const colors = "red|orange|yellow|green|blue|purple|pink|brown|black|white|gray|grey|teal|cyan|violet|gold|silver|navy";
const colorStatement = new RegExp("^(?:i (?:like|love|prefer)|my favou?rite colou?r is) (" + colors + ")[.!]?$", "i");
const colorQuestion = /^(?:what(?:'s| is) my favou?rite colou?r|what colou?r (?:do i like|do i prefer|is my favou?rite))\s*[?.!]?$/i;

export function colorMemory(prompt: string, saved?: string) {
  const stated = colorStatement.exec(prompt.trim())?.[1].toLowerCase();
  if (stated) return { stated, answer: `I'll remember that you like ${stated}.` };
  if (colorQuestion.test(prompt.trim())) {
    return { answer: saved ? `You told me you like ${saved}.` : "I don’t have a color saved for you yet. What color do you like?" };
  }
  return {};
}

export function profileUpdate(prompt: string) {
  const color = colorMemory(prompt).stated;
  if (color) return { profile_field: "preferredColor", profile_value: color };
  const fields = [
    ["currentGoal", /^my (?:current )?goal is (.+)$/i],
    ["learningPreference", /^i learn best (.+)$/i],
    ["interest", /^i (?:like|love|enjoy) (.+)$/i],
  ] as const;
  for (const [field, pattern] of fields) {
    const value = pattern.exec(prompt.trim())?.[1].replace(/[.!]$/, "").trim();
    if (value && value.length <= 240 && !/[?!\n]/.test(value)) {
      return { profile_field: field, profile_value: value };
    }
  }
}
