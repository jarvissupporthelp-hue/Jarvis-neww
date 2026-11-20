import { practiceQuestionCount, practiceQuizzes, type PracticeSubject } from "./practice-quiz-catalog.ts";
import type { Question } from "./course-quizzes.ts";

type Exercise = {
  prompt: string;
  value: number;
  reasoning: string;
  unit?: string;
};
type ExerciseBuilder = (n: number, a: number, b: number) => Exercise;

const exercises: Record<PracticeSubject, readonly ExerciseBuilder[]> = {
  Mathematics: [
    (n, a, b) => ({ prompt: `Solve for x: ${a}x + ${b} = ${a * n + b}.`, value: n, reasoning: `Subtract ${b} from both sides, then divide by ${a}.` }),
    (n, a, b) => ({ prompt: `Find the area of a triangle with a base of ${n + b} cm and a perpendicular height of ${2 * a} cm.`, value: (n + b) * a, reasoning: `Area = base × height ÷ 2 = ${n + b} × ${2 * a} ÷ 2.`, unit: "cm²" }),
    (n, a, b) => ({ prompt: `An arithmetic sequence starts at ${n} and increases by ${a} each term. What is term ${b + 2}?`, value: n + (b + 1) * a, reasoning: `Term ${b + 2} is ${b + 1} steps after the first term, so add ${b + 1} × ${a}.` }),
    (n, a, b) => ({ prompt: `A price of ${n * 100} AMD rises by ${a * b}%. What is the new price?`, value: n * (100 + a * b), reasoning: `The price increases by ${n * a * b} AMD. Add this to the original price.`, unit: "AMD" }),
  ],
  Physics: [
    (n, a, b) => ({ prompt: `A cyclist maintains a speed of ${a + b} m/s for ${n} seconds. How far does the cyclist travel?`, value: (a + b) * n, reasoning: "Multiply the constant speed by the elapsed time.", unit: "m" }),
    (n, a, b) => ({ prompt: `A cart of mass ${n} kg accelerates at ${a + b} m/s². What is the magnitude of the net force?`, value: n * (a + b), reasoning: "Newton’s second law gives net force = mass × acceleration.", unit: "N" }),
    (n, a, b) => ({ prompt: `What is the kinetic energy of an object of mass ${2 * n} kg moving at ${a + b} m/s?`, value: n * (a + b) ** 2, reasoning: "Use kinetic energy = ½ × mass × speed².", unit: "J" }),
    (n, a, b) => ({ prompt: `A current of ${a + b} A passes through a ${n} Ω resistor. What voltage is across it?`, value: n * (a + b), reasoning: "Ohm’s law gives voltage = current × resistance.", unit: "V" }),
  ],
  Chemistry: [
    (n, a, b) => ({ prompt: `Use C = 12 and H = 1 g/mol. What is the molar mass of the alkane C${n + a}H${2 * (n + a) + 2}?`, value: 14 * (n + a) + 2, reasoning: `Add ${n + a} carbon contributions and ${2 * (n + a) + 2} hydrogen contributions.`, unit: "g/mol" }),
    (n, a, b) => ({ prompt: `A solution contains ${n * (a + b)} mmol of solute in ${a + b} L of solution. Calculate its concentration.`, value: n, reasoning: "Divide the solute amount in mmol by the final volume in litres.", unit: "mmol/L" }),
    (n) => ({ prompt: `For 2H₂ + O₂ → 2H₂O, how many moles of water form when ${n} mol of oxygen reacts completely with excess hydrogen?`, value: 2 * n, reasoning: "Each mole of oxygen produces two moles of water.", unit: "mol" }),
    (n, a, b) => ({ prompt: `A ${n * (a + b)} mmol/L solution is diluted to ${a + b} times its initial volume. What is the final concentration?`, value: n, reasoning: "The amount of solute stays fixed, so divide the initial concentration by the dilution factor.", unit: "mmol/L" }),
  ],
  Computing: [
    (n, a, b) => ({ prompt: `Convert the unsigned binary integer ${(n * 2 + 1).toString(2)} to decimal.`, value: n * 2 + 1, reasoning: "Sum the powers of two at positions with a 1 bit, starting at 2⁰ on the right." }),
    (n, a, b) => ({ prompt: `Convert 0x${(n * 16 + a).toString(16).toUpperCase()} from hexadecimal to decimal.`, value: n * 16 + a, reasoning: "Each hexadecimal position is a power of 16. The rightmost digit is the units position." }),
    (n, a, b) => ({ prompt: `An uncompressed array stores ${n * a} values, each occupying exactly ${b} bytes. How many bytes are used by the values alone?`, value: n * a * b, reasoning: "Multiply the number of values by the number of bytes per value.", unit: "bytes" }),
    (n) => ({ prompt: `A zero-based array contains ${3 * n + 1} elements. What is the index of the last element?`, value: 3 * n, reasoning: "The first element has index 0, so the final index is the length minus 1." }),
  ],
  Statistics: [
    (n, a, b) => ({ prompt: `Find the arithmetic mean of ${n - b}, ${n - a}, ${n + a} and ${n + b}.`, value: n, reasoning: `The two pairs each sum to ${2 * n}. Divide the total by four.` }),
    (n, a, b) => ({ prompt: `Find the range of this data set: ${2 * n + b}, ${n}, ${n + a}, ${2 * n + a + b}.`, value: n + a + b, reasoning: `Subtract the minimum, ${n}, from the maximum, ${2 * n + a + b}.` }),
    (n) => ({ prompt: `A bag contains ${n} blue and ${200 - n} red counters. What is the probability of drawing a blue counter, expressed as a percentage?`, value: n / 2, reasoning: "Divide the number of blue counters by the total of 200 and multiply by 100.", unit: "%" }),
    (n, a, b) => ({ prompt: `A grade is weighted 25% for a score of ${n + 3 * a} and 75% for a score of ${n - a}. What is the weighted mean?`, value: n, reasoning: "Multiply the scores by 0.25 and 0.75 respectively, then add the products." }),
  ],
};

export function practiceQuestions(id: string): Question[] | undefined {
  const quiz = practiceQuizzes.find(item => item.id === id);
  if (!quiz) return undefined;
  const build = exercises[quiz.subject][quiz.topicIndex];
  return Array.from({ length: practiceQuestionCount }, (_, index) => {
    const n = (quiz.set - 1) * practiceQuestionCount + index + 1;
    const a = n % 7 + 2;
    const b = n % 5 + a + 1;
    const exercise = build(n, a, b);
    const correct = Math.imul(n + 151 * (quiz.topicIndex + 1), 0x9e3779b9) >>> 30;
    const format = (value: number) => exercise.unit ? `${value} ${exercise.unit}` : String(value);
    const step = exercise.unit === "%" ? 0.5 : 1;
    const options = [exercise.value + step, exercise.value - step, exercise.value + a * step].map(format);
    options.splice(correct, 0, format(exercise.value));
    return {
      id: `${id}-${index + 1}`, topic: quiz.topic, prompt: exercise.prompt,
      options, answer: correct, explanation: exercise.reasoning,
    };
  });
}
