import { authorize } from "@/lib/authorization";
import { quizQuestions, gradeQuiz } from "@/lib/course-quizzes";
import { createStudyClient } from "@/lib/study-context";

type Course = { id: string; code: string; name: string; semester: string };

function reply(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

async function loadCourses(request: Request) {
  const caller = await authorize(request, ["student"]);
  if (!caller.ok) return reply({ error: "Active student access required." }, caller.status);

  const authorization = request.headers.get("authorization");
  const client = authorization && createStudyClient(authorization);
  if (!client) return reply({ error: "Course quizzes are unavailable." }, 503);
  const { data, error } = await client.rpc("student_dashboard");
  if (error?.code === "42501") return reply({ error: "Active student access required." }, 403);
  if (error || !Array.isArray(data?.courses)) return reply({ error: "Course quizzes are unavailable." }, 503);
  return data.courses as Course[];
}

export async function GET(request: Request) {
  const courses = await loadCourses(request);
  if (courses instanceof Response) return courses;
  return reply({
    quizzes: courses.flatMap(({ id, code, name, semester }) => {
      const questions = quizQuestions(code);
      return questions ? [{ id, name, semester, questions }] : [];
    }),
  });
}

export async function POST(request: Request) {
  const courses = await loadCourses(request);
  if (courses instanceof Response) return courses;
  const input = await request.json().catch(() => null);
  const course = courses.find((item) => item.id === input?.offeringId);
  if (!course) return reply({ error: "Quiz not available for this course." }, 404);
  const result = gradeQuiz(course.code, input.answers);
  if (!result) return reply({ error: "Choose one answer for each question and submit again." }, 400);
  return reply(result);
}
