import type { CourseAssignment } from "@/lib/course-assignments";

export const offeringIdPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export type PortalOffering = {
  id: string;
  course: { code: string; name: string };
  semester: { name: string };
  group: { name: string } | null;
};

export type PortalSnapshot = {
  role: "student" | "lecturer" | "admin";
  courses: PortalOffering[];
  assignments: CourseAssignment[] | null;
};
