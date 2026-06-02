// src/app/utils/time.ts

export function getCurrentPeriod() {
  const now = new Date();
  
  // ⚡ [실시간 반영] 하드코딩 제거! 실제 현재 시간 사용
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;

  // 학교 종소리 시간표 데이터
  const periods = [
    { name: "1교시", start: 8 * 60 + 40, end: 9 * 60 + 30 },
    { name: "2교시", start: 9 * 60 + 40, end: 10 * 60 + 30 },
    { name: "3교시", start: 10 * 60 + 40, end: 11 * 60 + 30 },
    { name: "4교시", start: 11 * 60 + 40, end: 12 * 60 + 30 },
    { name: "5교시", start: 13 * 60 + 35, end: 14 * 60 + 25 },
    { name: "6교시", start: 14 * 60 + 35, end: 15 * 60 + 25 },
    { name: "7교시", start: 15 * 60 + 40, end: 16 * 60 + 30 },
  ];

  // 점심시간 체크 (12:30 ~ 13:35)
  if (currentTime > 12 * 60 + 30 && currentTime < 13 * 60 + 35) {
    return "점심시간";
  }

  for (const period of periods) {
    if (currentTime >= period.start && currentTime <= period.end) {
      return period.name;
    }
  }

  // 쉬는 시간 자동 계산 (예: 1교시 끝났는데 2교시 시작 전일 때 -> 다음 교시 안내를 위해 "2교시" 미리 리턴)
  for (let i = 0; i < periods.length - 1; i++) {
    if (currentTime > periods[i].end && currentTime < periods[i + 1].start) {
      return `${i + 2}교시 시작 전`;
    }
  }

  return "수업 없음";
}

export function getCurrentDay() {
  const now = new Date();
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return days[now.getDay()];
}

export function getNextPeriod(currentPeriod: string) {
  // 쉬는시간일 경우 ("2교시 시작 전" -> 다음 교시는 "3교시")
  if (currentPeriod.includes("시작 전")) {
    const nextNum = parseInt(currentPeriod) + 1;
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