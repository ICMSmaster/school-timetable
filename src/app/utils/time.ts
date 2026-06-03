// src/app/utils/time.ts

export function getCurrentPeriod() {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;

  // 🎯 알려주신 정확한 종소리 시간표 데이터 (분 단위 환산 완료)
  const periods = [
    { name: "1교시", start: 8 * 60 + 40, end: 9 * 60 + 30 },  // 08:40 ~ 09:30 (520 ~ 570)
    { name: "2교시", start: 9 * 60 + 40, end: 10 * 60 + 30 }, // 09:40 ~ 10:30 (580 ~ 630)
    { name: "3교시", start: 10 * 60 + 40, end: 11 * 60 + 30 },// 10:40 ~ 11:30 (640 ~ 690)
    { name: "4교시", start: 11 * 60 + 40, end: 12 * 60 + 30 },// 11:40 ~ 12:30 (700 ~ 750)
    { name: "5교시", start: 13 * 60 + 35, end: 14 * 60 + 25 },// 13:35 ~ 14:25 (815 ~ 865)
    { name: "6교시", start: 14 * 60 + 35, end: 15 * 60 + 25 },// 14:35 ~ 15:25 (875 ~ 925)
    { name: "7교시", start: 15 * 60 + 40, end: 16 * 60 + 30 },// 15:40 ~ 16:30 (940 ~ 990)
  ];

  // 1. 점심시간 예외 처리 (4교시 끝 ~ 5교시 시작 전: 12:30 ~ 13:35)
  if (currentTime > 12 * 60 + 30 && currentTime < 13 * 60 + 35) {
    return "점심시간";
  }

  // 2. 현재 정규 수업 시간 중인지 체크 (가장 먼저 확실하게 체크)
  for (const period of periods) {
    if (currentTime >= period.start && currentTime <= period.end) {
      return period.name;
    }
  }

  // 3. 수업 시간은 아닌데 정규 일과 중일 때 -> 쉬는 시간 계산
  for (let i = 0; i < periods.length - 1; i++) {
    if (currentTime > periods[i].end && currentTime < periods[i + 1].start) {
      return `${i + 2}교시 시작 전`;
    }
  }

  // 4. 등교 전 아침 시간 (08:40 전)
  if (currentTime < 8 * 60 + 40) {
    return "1교시 시작 전";
  }

  // 5. 방과 후 (16:30 이후 및 밤/새벽)
  return "수업 없음";
}

export function getCurrentDay() {
  const now = new Date();
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return days[now.getDay()];
}

export function getNextPeriod(currentPeriod: string) {
  if (currentPeriod.includes("시작 전")) {
    const nextNum = parseInt(currentPeriod);
    return nextNum <= 7 ? `${nextNum}교시` : null;
  }
  
  if (currentPeriod === "점심시간") return "5교시";
  if (currentPeriod === "수업 없음") return null;

  const periods = ["1교시", "2교시", "3교시", "4교시", "5교시", "6교시", "7교시"];
  const currentIndex = periods.indexOf(currentPeriod);

  if (currentIndex === -1 || currentIndex === periods.length - 1) {
    return null;
  }
  return periods[currentIndex + 1];
}