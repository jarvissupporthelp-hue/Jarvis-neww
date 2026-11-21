export const lessonMinutes = 80;
const clock = (minutes: number) =>
  [Math.floor(minutes / 60), minutes % 60].map(value => String(value).padStart(2, "0")).join(":");

export const lessonPeriods = [540, 630, 720, 840, 930, 1020].map(minutes => ({
  start: clock(minutes),
  label: clock(minutes) + "–" + clock(minutes + lessonMinutes),
}));

const yerevanClock = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Yerevan", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

export function isLessonStart(date: Date) {
  return Number.isFinite(+date) && date.getUTCSeconds() === 0 && date.getUTCMilliseconds() === 0
    && lessonPeriods.some(period => period.start === yerevanClock.format(date));
}
