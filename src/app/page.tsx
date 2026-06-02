// src/app/page.tsx
import { getCurrentPeriod, getCurrentDay } from "./utils/time";
import { getSheetData, parseDayTimeline } from "./utils/google"; // 💡 새로 만든 함수로 변경
import Link from "next/link";

interface Props {
  searchParams: Promise<{ day?: string }>; // ⚡ URL 쿼리스트링(?day=화)을 받아오기 위한 설정
}

const DAYS = ["월", "화", "수", "목", "금"];

export default async function Home({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams;
  
  // ⚡ 진짜 오늘 요일과 현재 교시 계산
  const realToday = getCurrentDay(); 
  let currentPeriod = getCurrentPeriod();
  
  // "2교시 시작 전" 과 같은 쉬는 시간 상태 텍스트 보정
  if (currentPeriod.includes("시작 전")) {
    currentPeriod = currentPeriod.replace(" 시작 전", "");
  }

  // ⚡ 사용자가 상단 네비게이션으로 선택한 요일 (기본값은 실제 오늘 요일, 주말이면 월요일)
  const isWeekend = realToday === "일" || realToday === "토";
  const selectedDay = resolvedSearchParams.day || (isWeekend ? "월" : realToday);

  // 1. 구글 시트에서 특정 학생(예: 김한얼) 데이터 가져오기
  const rawData = await getSheetData("20110_김한얼");

  // 2. 💡 새로 만든 함수를 사용해 '선택된 요일'의 1~7교시 시간표 전체를 배열로 가져오기
  const dayTimeline = parseDayTimeline(rawData || [], selectedDay);

  // 좌우 넘기기용 이전/다음 요일 계산
  const currentDayIndex = DAYS.indexOf(selectedDay);
  const prevDay = currentDayIndex > 0 ? DAYS[currentDayIndex - 1] : null;
  const nextDay = currentDayIndex < DAYS.length - 1 ? DAYS[currentDayIndex + 1] : null;

  return (
    <main className="min-h-screen bg-[#F4F6F8] text-black pb-12 flex flex-col items-center font-sans">
      
      {/* 1. 고정 상단바 (학생 이름 및 좌우 요일 네비게이션) */}
      <div className="w-full max-w-md bg-white border-b-2 border-black sticky top-0 z-50 p-4 px-5 shadow-[0_4px_0_0_rgba(0,0,0,0.03)]">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-black tracking-tight">김한얼</h1>
          <div className="bg-gray-100 text-gray-500 text-xs font-bold px-3 py-1 rounded-full">
            대표 대시보드
          </div>
        </div>

        {/* 요일 선택 및 좌우 넘기기 컨트롤러 */}
        <div className="flex items-center justify-between bg-[#F8F9FA] p-1.5 rounded-2xl border-2 border-gray-200">
          {prevDay ? (
            <Link href={`/?day=${prevDay}`} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border-2 border-black font-black text-sm active:bg-gray-100">
              ◀
            </Link>
          ) : (
            <div className="w-10 h-10 flex items-center justify-center text-gray-300 font-black text-sm">◀</div>
          )}

          <div className="flex gap-2 flex-1 justify-center">
            {DAYS.map((day) => {
              const isSelected = day === selectedDay;
              const isActualToday = day === realToday;
              return (
                <Link
                  key={day}
                  href={`/?day=${day}`}
                  className={`px-3 py-1.5 rounded-xl font-black text-sm transition-all ${
                    isSelected
                      ? "bg-black text-white"
                      : isActualToday
                      ? "bg-blue-100 text-blue-600 border border-blue-300"
                      : "text-gray-400 hover:text-black"
                  }`}
                >
                  {day}
                </Link>
              );
            })}
          </div>

          {nextDay ? (
            <Link href={`/?day=${nextDay}`} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border-2 border-black font-black text-sm active:bg-gray-100">
              ▶
            </Link>
          ) : (
            <div className="w-10 h-10 flex items-center justify-center text-gray-300 font-black text-sm">▶</div>
          )}
        </div>
      </div>

      {/* 2. 세로 스크롤 가능한 1~7교시 전체 타임라인 목록 */}
      <div className="w-full max-w-md px-4 mt-6 space-y-4">
        {dayTimeline.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl border-2 border-gray-300 text-center text-gray-400 font-bold">
            시간표 데이터를 가져올 수 없습니다.
          </div>
        ) : (
          dayTimeline.map((item) => {
            // ⚡ [핵심] '실제 오늘 요일'이면서 '루프 도는 해당 교시'일 때만 포커스(초점) 활성화
            const isCurrentFocus = selectedDay === realToday && item.period === currentPeriod;

            return (
              <div
                key={item.period}
                className={`transition-all rounded-[24px] p-5 flex items-center justify-between ${
                  isCurrentFocus
                    ? "bg-white border-[4px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ring-4 ring-blue-100 scale-[1.02]"
                    : "bg-[#FAFAFA] border-2 border-gray-200 opacity-60"
                }`}
              >
                {/* 왼쪽: 교시 및 과목 정보 */}
                <div className="flex flex-col">
                  <span className={`text-xs font-extrabold mb-1 px-2 py-0.5 rounded-md w-fit ${
                    isCurrentFocus ? "bg-black text-white" : "bg-gray-200 text-gray-500"
                  }`}>
                    {item.period}
                  </span>
                  <h3 className={`text-2xl font-black tracking-tight ${
                    isCurrentFocus ? "text-black" : "text-gray-700"
                  }`}>
                    {item.subject}
                  </h3>
                  {item.teacher && (
                    <span className="text-xs text-gray-400 mt-1">{item.teacher} 선생님</span>
                  )}
                </div>

                {/* 오른쪽: 장소 (현재 교시면 파란색 강조) */}
                <div className={`font-black text-base px-4 py-2 rounded-xl border-2 ${
                  isCurrentFocus 
                    ? "bg-blue-600 text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" 
                    : "bg-white text-gray-500 border-gray-300"
                }`}>
                  📍 {item.location}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 3. 하단 상태 바 */}
      <div className="w-full max-w-md px-4 mt-6">
        <div className="bg-white border-2 border-black p-4 rounded-2xl flex justify-between items-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-xs font-bold text-gray-600 font-mono">
              {selectedDay === realToday ? `실시간 오늘 시간표 포커싱 중` : `${selectedDay}요일 시간표 열람 중`}
            </span>
          </div>
          {selectedDay !== realToday && (
            <Link href="/" className="text-xs font-black text-blue-600 underline">
              오늘로 복귀
            </Link>
          )}
        </div>
      </div>

    </main>
  );
}