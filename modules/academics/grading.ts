const scale = 1_000_000n;

export function decimal(value: string) {
  if (!/^\d+(?:\.\d{1,6})?$/.test(value)) throw new Error("Invalid decimal");
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * scale + BigInt(fraction.padEnd(6, "0"));
}

export function formatGrade(numerator: bigint, denominator: bigint, places = 4) {
  const power = 10n ** BigInt(places);
  const rounded = (numerator * power * 2n + denominator) / (denominator * 2n);
  const fraction = (rounded % power).toString().padStart(places, "0").replace(/0+$/, "");
  return `${rounded / power}${fraction ? "." + fraction : ""}`;
}

export type GradeComponent = { name: string; weight: string; score: string | null; attempts?: string[] };
export type GradeCourse = { code: string; title: string; ects: string; components: GradeComponent[] };
export type GradeModule = { name: string; courses: GradeCourse[] };
export type MissingMode = "official" | "zero" | "ignore";
export type RetakePolicy = "latest" | "best";

export function selectedScore(component: GradeComponent, policy: RetakePolicy) {
  const attempts = [component.score, ...(component.attempts ?? [])].filter((entry): entry is string => entry !== null);
  const values = attempts.map(decimal);
  if (values.some((value) => value > 20n * scale)) throw new Error("Scores must be between 0 and 20.");
  if (!values.length) return null;
  return policy === "best" ? values.reduce((best, value) => value > best ? value : best) : values.at(-1)!;
}

function courseGrade(course: GradeCourse, policy: RetakePolicy) {
  const weights = course.components.map((component) => decimal(component.weight));
  if (weights.reduce((sum, weight) => sum + weight, 0n) !== scale) throw new Error("Weights must sum to 1.");
  const scores = course.components.map((component) => selectedScore(component, policy));
  const points = weights.reduce((sum, weight, index) => sum + weight * (scores[index] ?? 0n), 0n);
  return { points, missing: scores.includes(null), ects: decimal(course.ects) };
}

export function gradeModule(module: GradeModule, policy: RetakePolicy = "latest") {
  const courses = module.courses.map((course) => courseGrade(course, policy));
  const coefficient = courses.reduce((sum, course) => sum + course.ects, 0n);
  if (coefficient === 0n) throw new Error("Module must have ECTS credits.");
  const points = courses.reduce((sum, course) => sum + course.points * course.ects, 0n);
  const missing = courses.some((course) => course.missing);
  return { coefficient, points, courses, missing, validated: points >= 10n * coefficient * scale ** 2n,
    grade: formatGrade(points, coefficient * scale ** 2n) };
}

export function semesterGrade(modules: GradeModule[], mode: MissingMode = "official", policy: RetakePolicy = "latest") {
  const results = modules.map((module) => gradeModule(module, policy));
  const eligible = mode === "ignore" ? results.filter((result) => !result.missing) : results;
  const denominator = (mode === "ignore" ? eligible.reduce((sum, result) => sum + result.coefficient, 0n) : 30n * scale) * scale ** 2n;
  const points = eligible.reduce((sum, result) => sum + result.points, 0n);
  const complete = denominator !== 0n && (mode !== "official" || (results.length > 0 && !results.some((result) => result.missing)));
  const earned = eligible.reduce((sum, result) => sum + (result.validated && (!result.missing || mode === "zero") ? result.coefficient : 0n), 0n);
  return { results, points, denominator, complete, gpa: complete ? formatGrade(points, denominator) : null,
    conversion: complete ? formatGrade(points, denominator * 5n, 2) : null, earned: formatGrade(earned, scale) };
}

export function annualGrade(first: ReturnType<typeof semesterGrade>, second: ReturnType<typeof semesterGrade>) {
  if (!first.complete || !second.complete) return null;
  return formatGrade(first.points * second.denominator + second.points * first.denominator, 2n * first.denominator * second.denominator);
}

export function requiredScore(module: GradeModule, courseIndex: number, componentIndex: number, policy: RetakePolicy = "latest") {
  const result = gradeModule(module, policy);
  const course = module.courses[courseIndex];
  const factor = decimal(course.ects) * decimal(course.components[componentIndex].weight) * scale;
  const needed = 10n * result.coefficient * scale ** 2n - result.points;
  if (needed <= 0n) return "0";
  if (factor === 0n || needed > 20n * factor) return null;
  const hundredths = (needed * 100n + factor - 1n) / factor;
  return formatGrade(hundredths, 100n, 2);
}

export function displayCourseGrade(points: bigint) {
  return formatGrade(points, scale ** 2n);
}
