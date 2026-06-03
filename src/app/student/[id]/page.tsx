// src/app/student/[id]/page.tsx
import { getCurrentPeriod, getCurrentDay } from "../../utils/time";
// 1. getNoticeData를 추가로 import 합니다.
import { getSheetData, parseDayTimeline, getNoticeData } from "../../utils/google";
import TimelineContainer from "./TimelineContainer";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ day?: string }>;
}

const studentRegistry: Record<string, string> = {
  "20110": "20110_김한얼", "20121": "20121_이정준", "20306": "20306_김현중",
  "20311": "20311_박진현", "20402": "20402_강민준", "20406": "20406_김세현",
  "20418": "20418_손민찬", "20612": "20612_손찬민", "20616": "20616_오승철",
  "20813": "20813_박찬석", "20906": "20906_김재원", "21026": "21026_조연우",
  "21027": "21027_최재범",
};

const DAYS = ["월", "화", "수", "목", "금"];

export default async function StudentPage({ params, searchParams }: Props) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  
  const studentId = String(resolvedParams.id || "");
  const sheetName = studentRegistry[studentId];

  if (!sheetName) {
    return (
      <main className="min-h-screen bg-[#F8F9FA] dark:bg-[#1C1C1E] flex items-center justify-center font-sans">
        <div className="bg-white dark:bg-[#2C2C2E] p-8 rounded-3xl text-center max-w-sm border border-neutral-100 dark:border-neutral-800 shadow-sm">
          <p className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1">학생 정보가 없습니다</p>
          <p className="text-xs text-gray-400">ID: {studentId}</p>
        </div>
      </main>
    );
  }

  const studentName = sheetName.split("_")[1] || sheetName;
  const realToday = getCurrentDay(); 
  let currentPeriod = getCurrentPeriod();
  
  if (currentPeriod.includes("시작 전")) {
    currentPeriod = currentPeriod.replace(" 시작 전", "");
  }

  const isWeekend = realToday === "일" || realToday === "토";
  const selectedDay = resolvedSearchParams.day || (isWeekend ? "월" : realToday);

  // 2. 시간표 데이터와 알림장 데이터를 동시에 가져옵니다.
  const rawData = await getSheetData(sheetName);
  const dayTimeline = parseDayTimeline(rawData || [], selectedDay) || [];
  
  const allNotices = await getNoticeData();
  
  // 3. 🎯 암시적 any 에러 방지를 위해 명시적으로 : any[] 처리 후 내 알림장만 필터링합니다.
  const studentNotices: any[] = allNotices.filter(
    (notice: any) => notice.target === "전체" || notice.target === sheetName
  );

  return (
    <TimelineContainer
      studentId={studentId}
      studentName={studentName}
      initialTimeline={dayTimeline}
      realToday={realToday}
      initialPeriod={currentPeriod}
      selectedDay={selectedDay}
      DAYS={DAYS}
      notices={studentNotices} // 👈 4. 드디어 짝을 맞춰 알림장 데이터를 배달합니다!
    />
  );
}