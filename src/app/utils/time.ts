// src/app/utils/time.ts

// ⏰ 대한민국 표준시(KST)를 정확하게 계산하여 현재 교시를 반환하는 함수
export function getCurrentPeriod() {
  // 📍 세계 표준시(UTC)를 대한민국 표준시(KST, UTC+9)로 강제 변환 (Vercel 서버 시차 해결)
  const utc = new Date().getTime() + (new Date().getTimezoneOffset() * 60 * 1000);
  const kstTimeDiff = 9 * 60 * 60 * 1000;
  const now = new Date(utc + kstTimeDiff);
  
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;

  // 학교 종소리 시간표 데이터 (분 단위 환산)
  const periods = [
    { name: "1교시", start: 8 * 60 + 40, end: 9 * 60 + 30 }, // 08:40 ~ 09:30
    { name: "2교시", start: 9 * 60 + 40, end: 10 * 60 + 30 }, // 09:40 ~ 10:30
    { name: "3교시", start: 10 * 60 + 40, end: 11 * 60 + 30 }, // 10:40 ~ 11:30
    { name: "4교시", start: 11 * 60 + 40, end: 12 * 60 + 30 }, // 11:40 ~ 12:30
    { name: "5교시", start: 13 * 60 + 35, end: 14 * 60 + 25 }, // 13:35 ~ 14:25
    { name: "6교시", start: 14 * 60 + 35, end: 15 * 60 + 25 }, // 14:35 ~ 15:25
    { name: "7교시", start: 15 * 60 + 40, end: 16 * 60 + 30 }, // 15:40 ~ 16:30
  ];

  // 점심시간 체크 (12:30 ~ 13:35)
  if (currentTime > 12 * 60 + 30 && currentTime < 13 * 60 + 35) {
    return "점심시간";
  }

  // 현재 수업 중인 교시 확인
  for (const period of periods) {
    if (currentTime >= period.start && currentTime <= period.end) {
      return period.name;
    }
  }

  // 쉬는 시간 자동 계산 (예: 1교시 끝났는데 2교시 시작 전일 때 -> "2교시 시작 전" 반환)
  for (let i = 0; i < periods.length - 1; i++) {
    if (currentTime > periods[i].end && currentTime < periods[i + 1].start) {
      return `${i + 2}교시 시작 전`;
    }
  }

  // 학교 일과 시간이 아닐 때 (밤, 새벽, 주말 등)
  return "수업 없음";
}

// 📅 현재 요일을 대한민국 표준시 기준으로 반환하는 함수
export function getCurrentDay() {
  const utc = new Date().getTime() + (new Date().getTimezoneOffset() * 60 * 1000);
  const kstTimeDiff = 9 * 60 * 60 * 1000;
  const now = new Date(utc + kstTimeDiff);

  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return days[now.getDay()];
}

// ⏭️ 현재 교시를 바탕으로 다음 교시를 예측하는 함수
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