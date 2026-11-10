import type { SupabaseClient } from "@supabase/supabase-js";

export type CourseAssignment = {
  id: string;
  offering_id: string;
  title: string;
  brief: string;
  due_on: string;
  due_at: string;
};

export type AssignmentDeadline = CourseAssignment & { offering: { course: { name: string } } };

export function assignmentDeadlines(client: SupabaseClient) {
  return client.from("course_assignments")
    .select("id,offering_id,title,brief,due_on,due_at,offering:course_offerings!inner(course:courses!inner(name))")
    .order("due_on").order("due_at").order("id");
}
