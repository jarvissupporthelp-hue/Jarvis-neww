"use client";

import { UiText } from "@/app/components/interface-language";
import { field } from "./storage";
import { learningCourses } from "./seed";

export function CoursePicker({ course, onChange }: { course: string; onChange: (value: string) => void }) {
  return <label><UiText value="Course"/> <select className={field} value={course} onChange={(event) => onChange(event.target.value)}>
    {learningCourses.map(({ code, title }) => <option key={code} value={code}>{title}</option>)}
  </select></label>;
}
