import assert from "node:assert/strict";
import test from "node:test";
import { studySearchQuery } from "../lib/study-follow-up.ts";
import { profileUpdate } from "../lib/student-profile.ts";
import { courseSearchTerms } from "../lib/course-pdf-search.ts";

const first = { prompt: "What does Aram Yesayan teach in year 1?" };
for (const question of ["And in second year?", "Et en deuxième année ?", "А на втором курсе?", "Իսկ երկրորդ կուրսում՞"]) {
  test(question, () => {
    assert.equal(studySearchQuery(question, [first]), first.prompt + "\n" + question);
    assert.equal(studySearchQuery("Tell me more", [{ prompt: question }, first]), first.prompt + "\n" + question);
    assert.equal(studySearchQuery("Explain Unix", [first]), "Explain Unix");
  });
}
for (const prompt of ["I prefer examples in French", "Je préfère des exemples", "Я предпочитаю примеры", "Ես նախընտրում եմ օրինակներ"]) {
  test(prompt, () => assert.equal(profileUpdate(prompt)?.profile_field, "learningPreference"));
}
test("mixed-language course searches preserve subject names and drop PDF boilerplate", () => {
  assert.deepEqual(courseSearchTerms("Explique le Unix kernel from my lecture PDF"), ["unix","kernel"]);
});

import { examDateClarification } from "../lib/study-context.ts";
for (const [question, expected] of [
  ["Quand est mon examen de systèmes ?", /pas de date confirmée/],
  ["Когда наш экзамен по алгебре?", /нет подтверждённой даты/],
  ["Ե՞րբ է իմ քննությունը։", /հաստատված ամսաթիվը չունեմ/],
]) test(question, () => assert.match(examDateClarification(question, { officialExamDatesAvailable: false }), expected));
