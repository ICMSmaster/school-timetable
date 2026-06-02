// src/app/student/[id]/TimelineContainer.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface TimelineItem {
  period: string;
  subject: string;
  teacher: string;
  location: string;
}

interface ContainerProps {
  studentId: string;
  studentName: string;
  initialTimeline: TimelineItem[];
  realToday: string;
  initialPeriod: string;
  selectedDay: string;
  DAYS: string[];
}

export default function TimelineContainer({
  studentId,
  studentName,
  initialTimeline,
  realToday,
  initialPeriod,
  selectedDay,
  DAYS,
}: ContainerProps) {
  const router = useRouter();
  
  const [currentPeriod, setCurrentPeriod] = useState(initialPeriod);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);

  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const currentCardRef = useRef<HTMLDivElement | null>(null);

  // 🕒 1. 실시간 시간 및 일과 진행률(%) 계산 (매 초마다 트래킹)
  useEffect(() => {
    const updateTimeAndProgress = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const totalMinutes = hours * 60 + minutes;

      // 학교 일과 시간 기준 (08:40 ~ 16:30 가정)
      const startDay = 8 * 60 + 40;
      const endDay = 16 * 60 + 30;

      if (totalMinutes < startDay) setProgress(0);
      else if (totalMinutes > endDay) setProgress(100);
      else {
        const pct = ((totalMinutes - startDay) / (endDay - startDay)) * 100;
        setProgress(Math.round(pct));
      }

      // 수업 종료까지 남은 시간 간이 카운트다운
      const remainingMin = 50 - (minutes % 60);
      if (remainingMin > 0 && remainingMin <= 50 && hours >= 9 && hours < 17) {
        setTimeLeft(`종료까지 ${remainingMin}분`);
      } else {
        setTimeLeft("");
      }
    };

    updateTimeAndProgress();
    const interval = setInterval(updateTimeAndProgress, 1000);
    return () => clearInterval(interval);
  }, []);

  // 🔄 2. 1분 주기로 백그라운드 데이터 자동 리프레시 (실시간 교시 이동)
  useEffect(() => {
    const timer = setInterval(() => { 
      router.refresh(); 
    }, 60000);
    return () => clearInterval(timer);
  }, [router]);

  // 스크롤 감지 (우측 하단 플로팅 버튼 노출 제어)
  useEffect(() => {
    const handleScroll = () => { setShowScrollTop(window.scrollY > 120); };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 현재 교시 카드로 부드럽게 스크롤 이동
  const scrollToCurrentFocus = () => {
    if (selectedDay !== realToday) {
      router.push(`/student/${studentId}`);
    } else if (currentCardRef.current) {
      currentCardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // 📱 3. 스마트폰 터치 좌우 스와이프 제어
  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchMove = (e: React.TouchEvent) => { touchEndX.current = e.touches[0].clientX; };
  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const currentDayIndex = DAYS.indexOf(selectedDay);

    if (distance > 70 && currentDayIndex < DAYS.length - 1) {
      router.push(`/student/${studentId}?day=${DAYS[currentDayIndex + 1]}`);
    } else if (distance < -70 && currentDayIndex > 0) {
      router.push(`/student/${studentId}?day=${DAYS[currentDayIndex - 1]}`);
    }
    touchStartX.current = null; touchEndX.current = null;
  };

  const currentDayIndex = DAYS.indexOf(selectedDay);
  const prevDay = currentDayIndex > 0 ? DAYS[currentDayIndex - 1] : null;
  const nextDay = currentDayIndex < DAYS.length - 1 ? DAYS[currentDayIndex + 1] : null;

  // 하단 상태바 일과 외 시간 멘트 정의
  const getStatusMessage = () => {
    if (selectedDay !== realToday) return `${selectedDay}요일 시간표 조회 중`;
    if (currentPeriod === "주말") return "🏠 즐거운 주말이에요!";
    if (currentPeriod === "등교 전") return "☀️ 오늘도 화이팅 넘치는 하루 보내요! 💪";
    if (currentPeriod === "점심시간") return "🍱 지금은 맛있는 점심시간입니다 🎉";
    if (currentPeriod === "하교") return "🏠 오늘 일과가 끝났습니다. 조심히 하교하세요 🚌";
    return `✨ 현재 ${currentPeriod} 진행 중`;
  };

  return (
    <main 
      className="min-h-screen w-full bg-[#F8F9FA] dark:bg-[#1C1C1E] text-[#1C1C1E] dark:text-[#F5F5F7] pb-24 flex flex-col items-center font-sans antialiased transition-colors duration-300 touch-pan-y relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 📊 최상단 일과 진행률 프로그레스 바 */}
      {selectedDay === realToday && (
        <div className="w-full fixed top-0 left-0 z-50 h-1 bg-neutral-100 dark:bg-neutral-800">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 transition-all duration-1000 ease-out" 
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* 1. 프리미엄 상단 헤더 영역 */}
      <div className="w-full max-w-md bg-white/80 dark:bg-[#2C2C2E]/80 backdrop-blur-xl sticky top-0 z-40 p-6 rounded-b-[40px] border-b border-black/[0.02] dark:border-white/[0.03] shadow-[0_4px_30px_rgba(0,0,0,0.01)]">
        <div className="flex justify-between items-end mb-5">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Interactive Timeline</span>
              {selectedDay === realToday && (
                <span className="text-[10px] font-semibold text-blue-500 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded">
                  {progress}% 진행됨
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{studentName}</h1>
          </div>
          <div className="text-[11px] font-mono font-medium tracking-wider text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 rounded-md">
            ID: {studentId}
          </div>
        </div>

        {/* 요일 내비게이션 세그먼트 */}
        <div className="flex items-center justify-between bg-neutral-100 dark:bg-neutral-800 p-1 rounded-2xl">
          {prevDay ? (
            <Link href={`/student/${studentId}?day=${prevDay}`} className="w-9 h-9 flex items-center justify-center rounded-xl text-neutral-400 hover:text-neutral-800 dark:hover:text-white">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
            </Link>
          ) : (
            <div className="w-9 h-9 flex items-center justify-center text-neutral-200 dark:text-neutral-700">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
            </div>
          )}

          <div className="flex gap-0.5 flex-1 justify-center">
            {DAYS.map((day) => {
              const isSelected = day === selectedDay;
              const isActualToday = day === realToday;
              return (
                <Link
                  key={day}
                  href={`/student/${studentId}?day=${day}`}
                  className={`px-3 py-1.5 rounded-xl text-sm transition-all duration-200 text-center font-medium min-w-[44px] ${
                    isSelected
                      ? "bg-white dark:bg-[#3A3A3C] text-neutral-900 dark:text-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] font-semibold"
                      : isActualToday
                      ? "text-blue-500 bg-blue-50 dark:bg-blue-950/30 font-semibold"
                      : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                  }`}
                >
                  {day}
                </Link>
              );
            })}
          </div>

          {nextDay ? (
            <Link href={`/student/${studentId}?day=${nextDay}`} className="w-9 h-9 flex items-center justify-center rounded-xl text-neutral-400 hover:text-neutral-800 dark:hover:text-white">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
            </Link>
          ) : (
            <div className="w-9 h-9 flex items-center justify-center text-neutral-200 dark:text-neutral-700">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
            </div>
          )}
        </div>
      </div>

      {/* 안내 텍스트 힌트 */}
      <div className="w-full max-w-md px-6 mt-4 flex justify-center">
        <p className="text-[11px] text-neutral-300 dark:text-neutral-600 font-medium">💡 좌우로 밀어서 다른 요일의 시간표를 확인할 수 있어요</p>
      </div>

      {/* 2. 타임라인 리스트 메인 */}
      <div className="w-full max-w-md px-5 mt-4 space-y-4">
        {initialTimeline.length === 0 ? (
          <div className="bg-white dark:bg-[#2C2C2E] p-12 rounded-[28px] text-center text-neutral-400 text-sm font-medium border border-neutral-100 dark:border-neutral-800 shadow-sm">
            불러올 시간표 데이터가 없습니다.
          </div>
        ) : (
          initialTimeline.map((item) => {
            const isCurrentFocus = selectedDay === realToday && item.period === currentPeriod;

            return (
              <div
                key={item.period}
                ref={isCurrentFocus ? currentCardRef : null}
                className={`transition-all duration-500 rounded-[28px] p-6 flex items-center justify-between bg-white dark:bg-[#2C2C2E] ${
                  isCurrentFocus
                    ? "shadow-[0_25px_50px_-12px_rgba(0,0,0,0.06)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.3)] border-2 border-blue-500 dark:border-blue-400 scale-[1.01] relative overflow-hidden"
                    : "border border-neutral-100/70 dark:border-neutral-800/50 opacity-35 shadow-sm"
                }`}
              >
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-md ${
                      isCurrentFocus ? "bg-blue-600 text-white" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400"
                    }`}>
                      {item.period}
                    </span>
                    {isCurrentFocus && (
                      <span className="inline-flex items-center text-[10px] font-bold text-blue-500 dark:text-blue-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5 animate-pulse" />
                        {timeLeft || "LIVE"}
                      </span>
                    )}
                  </div>
                  
                  <h3 className={`text-2xl font-bold tracking-tight transition-colors ${
                    isCurrentFocus ? "text-neutral-900 dark:text-white" : "text-neutral-500"
                  }`}>
                    {item.subject}
                  </h3>
                  
                  {item.teacher && (
                    <span className="text-xs text-neutral-400 mt-1 font-medium">{item.teacher} 선생님</span>
                  )}
                </div>

                <div className={`font-semibold text-sm px-4 py-2.5 rounded-xl tracking-tight transition-all ${
                  isCurrentFocus 
                    ? "bg-blue-600 dark:bg-blue-500 text-white shadow-md shadow-blue-500/10" 
                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400"
                }`}>
                  {item.location}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 3. 상황별 인지 하단 바 */}
      <div className="w-full max-w-md px-5 mt-6">
        <div className="bg-white dark:bg-[#2C2C2E] border border-neutral-100 dark:border-neutral-800 p-4 rounded-2xl flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-2">
            <span className={`h-1.5 w-1.5 rounded-full ${selectedDay === realToday ? "bg-green-500 animate-pulse" : "bg-neutral-300"}`}></span>
            <span className="text-xs font-semibold tracking-tight text-neutral-500 dark:text-neutral-400">
              {getStatusMessage()}
            </span>
          </div>
          {selectedDay !== realToday && (
            <Link href={`/student/${studentId}`} className="text-[11px] font-bold text-neutral-800 dark:text-neutral-200 hover:underline tracking-tight">
              오늘로 돌아가기
            </Link>
          )}
        </div>
      </div>

      {/* 🎯 우측 하단 프리미엄 플로팅 액션 버튼 (FAB) */}
      {(showScrollTop || selectedDay !== realToday) && (
        <button
          onClick={scrollToCurrentFocus}
          className="fixed bottom-6 right-6 z-50 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold text-xs px-4 py-3 rounded-full shadow-2xl flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-all duration-300"
        >
          <span>🎯</span>
          {selectedDay !== realToday ? "오늘로 이동" : "현재 교시"}
        </button>
      )}

    </main>
  );
}