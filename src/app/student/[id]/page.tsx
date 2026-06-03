// src/app/student/[id]/page.tsx
import { getCurrentPeriod, getCurrentDay } from "../../utils/time";
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
  
  // 🕒 매 요청마다 서버 갱신 시점의 최신 요일과 교시를 다시 계산합니다.
  const realToday = getCurrentDay(); 
  let currentPeriod = getCurrentPeriod();
  
  if (currentPeriod.includes("시작 전")) {
    currentPeriod = currentPeriod.replace(" 시작 전", "");
  }

  const isWeekend = realToday === "일" || realToday === "토";
  const selectedDay = resolvedSearchParams.day || (isWeekend ? "월" : realToday);

  // 구글 시트 연동 데이터 긁어오기
  const rawData = await getSheetData(sheetName);
  const dayTimeline = parseDayTimeline(rawData || [], selectedDay) || [];
  
  const allNotices = await getNoticeData();
  
  // 알림장 대상 필터링
  const studentNotices: any[] = allNotices.filter(
    (notice: any) => notice.target === "전체" || notice.target === sheetName
  );

  return (
    <TimelineContainer
      studentId={studentId}
      studentName={studentName}
      initialTimeline={dayTimeline}
      realToday={realToday}
      initialPeriod={currentPeriod} // 👈 정확하게 연산된 실시간 교시가 클라이언트로 넘어갑니다.
      selectedDay={selectedDay}
      DAYS={DAYS}
      notices={studentNotices} 
    />
  );
}