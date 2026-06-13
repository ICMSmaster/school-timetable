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

interface NoticeItem {
  target: string;
  teacher: string;
  content: string;
}

interface ContainerProps {
  studentId: string;
  studentName: string;
  initialTimeline: TimelineItem[];
  realToday: string; // 예: "월" 또는 "월요일"
  initialPeriod: string;
  selectedDay: string; // 예: "월" 또는 "월요일"
  DAYS: string[];
  notices: NoticeItem[];
}

export default function TimelineContainer({
  studentId,
  studentName,
  initialTimeline,
  realToday,
  initialPeriod,
  selectedDay,
  DAYS,
  notices,
}: ContainerProps) {
  const router = useRouter();
  
  const [currentPeriod, setCurrentPeriod] = useState(initialPeriod);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);

  // 팝업 메시지 상태 관리
  const [popupMessage, setPopupMessage] = useState<string>("");
  
  // 💡 [버그 해결] 최초 접속 시에만 딱 한 번 팝업을 띄우기 위한 flag 상태
  const [hasOpenedPopup, setHasOpenedPopup] = useState<boolean>(false);
  const [showPopup, setShowPopup] = useState<boolean>(false);

  // 스와이프 조례용 터치 위치 추적 Ref
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const currentCardRef = useRef<HTMLDivElement | null>(null);

  // 💡 [버그 해결] 글자 수 불일치("월" vs "월요일") 우려를 완전히 없애기 위해 첫 글자만 따서 비교합니다.
  const isTodayActive = selectedDay?.charAt(0) === realToday?.charAt(0);

  // 🕒 1. 실시간 시간 및 일과 진행률(%) 계산 (주말/조례 예외 처리 포함)
  useEffect(() => {
    const updateTimeAndProgress = () => {
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0: 일요일, 6: 토요일
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const totalMinutes = hours * 60 + minutes;

      // 🚨 [주말 예외 처리] 토요일(6) 또는 일요일(0)인 경우 즉시 주말 모드
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        setProgress(0);
        setCurrentPeriod("주말");
        setPopupMessage("🌿 오늘은 즐거운 주말입니다! 일주일 동안 쌓인 피로를 풀고 편안한 휴식을 취하세요. 충전 완료! 💪");
        setTimeLeft("");
        
        // 오늘이 진짜 주말이고 아직 팝업을 보여준 적이 없다면 최초 1회만 오픈
        if (!hasOpenedPopup) {
          setShowPopup(true);
          setHasOpenedPopup(true);
        }
        return; 
      }

      // 평일 학교 전체 일과 시간 기준 진행률 (08:40 ~ 16:30)
      const startDay = 520; // 08:40
      const endDay = 990;   // 16:30

      if (totalMinutes < startDay) setProgress(0);
      else if (totalMinutes > endDay) setProgress(100);
      else {
        const pct = ((totalMinutes - startDay) / (endDay - startDay)) * 100;
        setProgress(Math.round(pct));
      }

      // 🎯 [학교 시간표 기준 교시 및 팝업 메시지 정밀 추적]
      let detectedPeriod = initialPeriod;
      let message = "";
      
      if (totalMinutes >= 510 && totalMinutes < 520) {
        detectedPeriod = "담임조례";
        message = "📋 지금은 담임 조례 시간입니다. 오늘 하루 일정을 체크하고 힘차게 시작해 봐요! ✨";
      } else if (totalMinutes >= 520 && totalMinutes < 570) {
        detectedPeriod = "1교시";
        message = "지금은 📝 1교시 수업 시간입니다.";
      } else if (totalMinutes >= 570 && totalMinutes < 580) {
        detectedPeriod = "쉬는시간";
        message = "지금은 ☕ 1교시 쉬는 시간입니다. 다음 수업을 준비하세요!";
      } else if (totalMinutes >= 580 && totalMinutes < 630) {
        detectedPeriod = "2교시";
        message = "지금은 📝 2교시 수업 시간입니다.";
      } else if (totalMinutes >= 630 && totalMinutes < 640) {
        detectedPeriod = "쉬는시간";
        message = "지금은 ☕ 2교시 쉬는 시간입니다. 다음 수업을 준비하세요!";
      } else if (totalMinutes >= 640 && totalMinutes < 690) {
        detectedPeriod = "3교시";
        message = "지금은 📝 3교시 수업 시간입니다.";
      } else if (totalMinutes >= 690 && totalMinutes < 700) {
        detectedPeriod = "쉬는시간";
        message = "지금은 ☕ 3교시 쉬는 시간입니다. 다음 수업을 준비하세요!";
      } else if (totalMinutes >= 700 && totalMinutes < 750) {
        detectedPeriod = "4교시";
        message = "지금은 📝 4교시 수업 시간입니다.";
      } else if (totalMinutes >= 750 && totalMinutes < 815) {
        detectedPeriod = "점심시간";
        message = "지금은 🍱 신나는 점심시간입니다! 맛있는 점심 먹으러 가요 🎉";
      } else if (totalMinutes >= 815 && totalMinutes < 865) {
        detectedPeriod = "5교시";
        message = "지금은 📝 5교시 수업 시간입니다.";
      } else if (totalMinutes >= 865 && totalMinutes < 875) {
        detectedPeriod = "쉬는시간";
        message = "지금은 ☕ 5교시 쉬는 시간입니다. 다음 수업을 준비하세요!";
      } else if (totalMinutes >= 875 && totalMinutes < 925) {
        detectedPeriod = "6교시";
        message = "지금은 📝 6교시 수업 시간입니다.";
      } else if (totalMinutes >= 925 && totalMinutes < 940) {
        detectedPeriod = "쉬는시간";
        message = "지금은 ☕ 6교시 쉬는 시간입니다. 다음 수업을 준비하세요!";
      } else if (totalMinutes >= 940 && totalMinutes < 990) {
        detectedPeriod = "7교시";
        message = "지금은 📝 7교시 수업 시간입니다.";
      } else if (totalMinutes >= 990) {
        detectedPeriod = "하교";
        message = "🏠 오늘 모든 일과가 끝났습니다! 조심히 하교하세요 🚌";
      } else {
        detectedPeriod = "등교 전";
        message = "☀️ 오늘도 화이팅 넘치는 하루 보내요! 💪";
      }

      setCurrentPeriod(detectedPeriod);
      setPopupMessage(message);

      // 💡 [버그 해결] 앱 로딩 후 안내 메시지가 생성되면 최초 1회만 팝업 노출
      if (!hasOpenedPopup && message !== "") {
        setShowPopup(true);
        setHasOpenedPopup(true);
      }

      // 진짜 학교 시간표 기준 종료 타이머 계산
      let periodEndMinutes = 0;
      if (detectedPeriod === "담임조례") periodEndMinutes = 520;
      else if (detectedPeriod === "1교시") periodEndMinutes = 570;
      else if (detectedPeriod === "2교시") periodEndMinutes = 630;
      else if (detectedPeriod === "3교시") periodEndMinutes = 690;
      else if (detectedPeriod === "4교시") periodEndMinutes = 750;
      else if (detectedPeriod === "점심시간") periodEndMinutes = 815;
      else if (detectedPeriod === "5교시") periodEndMinutes = 865;
      else if (detectedPeriod === "6교시") periodEndMinutes = 925;
      else if (detectedPeriod === "7교시") periodEndMinutes = 990;

      if (periodEndMinutes > 0) {
        const remainingMin = periodEndMinutes - totalMinutes;
        if (remainingMin > 0) {
          setTimeLeft(`종료까지 ${remainingMin}분`);
        } else {
          setTimeLeft("");
        }
      } else {
        setTimeLeft("");
      }
    };

    updateTimeAndProgress();
    const interval = setInterval(updateTimeAndProgress, 1000);
    return () => clearInterval(interval);
  }, [initialPeriod, hasOpenedPopup]);

  // 🔄 1분 주기 백그라운드 데이터 리프레시
  useEffect(() => {
    const timer = setInterval(() => { router.refresh(); }, 60000);
    return () => clearInterval(timer);
  }, [router]);

  // 스크롤 감지
  useEffect(() => {
    const handleScroll = () => { setShowScrollTop(window.scrollY > 120); };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 오늘 요일일 때만 정밀 스크롤 하도록 연동 수정
  const scrollToCurrentFocus = () => {
    if (!isTodayActive) {
      router.push(`/student/${studentId}`);
    } else if (currentCardRef.current) {
      currentCardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // 💡 [터치 민감도 및 Y축 간섭 방지 개선]
  const handleTouchStart = (e: React.TouchEvent) => { 
    touchStartX.current = e.touches[0].clientX; 
    touchStartY.current = e.touches[0].clientY; 
  };
  
  const handleTouchMove = (e: React.TouchEvent) => { 
    touchEndX.current = e.touches[0].clientX; 
  };
  
  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current || !touchStartY.current) return;

    // 터치 종류 시점의 Y축 위치 파악 (안전한 크로스 브라우징 처리)
    const touchEndY = window.event && 'changedTouches' in window.event 
      ? (window.event.changedTouches as any)[0].clientY 
      : touchStartY.current; 

    const diffX = touchStartX.current - touchEndX.current;
    const diffY = touchStartY.current - touchEndY;
    const currentDayIndex = DAYS.indexOf(selectedDay);

    // 수직 스크롤(위아래 움직임)이 수평 스크롤보다 크다면 요일 스와이프를 무시하고 종료합니다.
    if (Math.abs(diffY) > Math.abs(diffX)) {
      touchStartX.current = null; touchEndX.current = null; touchStartY.current = null;
      return;
    }

    // 민감도 임계값을 180px로 상향하여 의도적인 스와이프만 인식하게 합니다.
    const SWIPE_THRESHOLD = 180; 

    if (diffX > SWIPE_THRESHOLD && currentDayIndex < DAYS.length - 1) {
      router.push(`/student/${studentId}?day=${DAYS[currentDayIndex + 1]}`);
    } else if (diffX < -SWIPE_THRESHOLD && currentDayIndex > 0) {
      router.push(`/student/${studentId}?day=${DAYS[currentDayIndex - 1]}`);
    }

    touchStartX.current = null; touchEndX.current = null; touchStartY.current = null;
  };

  const currentDayIndex = DAYS.indexOf(selectedDay);
  const prevDay = currentDayIndex > 0 ? DAYS[currentDayIndex - 1] : null;
  const nextDay = currentDayIndex < DAYS.length - 1 ? DAYS[currentDayIndex + 1] : null;

  // 상황별 인지 하단 바 메시지 노출 순서 개편
  const getStatusMessage = () => {
    if (isTodayActive) {
      if (currentPeriod === "주말") return "🏠 즐거운 주말이에요! 집에서 푹 쉬고 다음주에 만나요!";
      if (currentPeriod === "담임조례") return "📋 지금은 담임 조례 시간입니다 🔔";
      if (currentPeriod === "등교 전") return "☀️ 지금은 등교 전이에요! 오늘도 화이팅 넘치는 하루 보내요! 💪";
      if (currentPeriod === "점심시간") return "🍱 지금은 맛있는 점심시간입니다! 맛있게 먹어요! 🎉";
      if (currentPeriod === "하교") return "🏠 오늘 일과가 끝났습니다. 내일 또 봐요! 🚌";
      return `✨ 현재 ${currentPeriod} 진행 중`;
    } 
    return `${selectedDay}요일 시간표 조회 중`;
  };

  return (
    <>
      <main 
        className={`min-h-screen w-full bg-[#F8F9FA] dark:bg-[#1C1C1E] text-[#1C1C1E] dark:text-[#F5F5F7] pb-24 flex flex-col items-center font-sans antialiased transition-all duration-500 touch-pan-y relative ${
          showPopup ? "blur-sm pointer-events-none select-none" : ""
        }`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* 프로그레스 바 */}
        {isTodayActive && (
          <div className="w-full fixed top-0 left-0 z-50 h-1 bg-neutral-100 dark:bg-neutral-800">
            <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 transition-all duration-1000 ease-out" style={{ width: `${progress}%` }} />
          </div>
        )}

        {/* 1. 상단 헤더 영역 */}
        <div className="w-full max-w-md bg-white/80 dark:bg-[#2C2C2E]/80 backdrop-blur-xl sticky top-0 z-40 p-6 rounded-b-[40px] border-b border-black/[0.02] dark:border-white/[0.03] shadow-[0_4px_30px_rgba(0,0,0,0.01)]">
          <div className="flex justify-between items-end mb-5">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[11px] font-bold tracking-tight text-neutral-400">진해고등학교 학습도움실 지원서비스</span>
                {isTodayActive && (
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

          {/* 요일 내비게이션 */}
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
                const isSelected = day?.charAt(0) === selectedDay?.charAt(0);
                const isActualToday = day?.charAt(0) === realToday?.charAt(0);
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
              const isCurrentFocus = isTodayActive && item.period === currentPeriod;

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

        {/* 3. 오늘의 알림장 UI 영역 */}
        <div className="w-full max-w-md px-5 mt-4">
          <div className="bg-white dark:bg-[#2C2C2E] p-6 rounded-[28px] border border-neutral-100 dark:border-neutral-800 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">📢</span>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">오늘의 알림장</h3>
            </div>

            {notices && notices.length > 0 ? (
              <div className="space-y-3.5">
                {notices.map((notice, index) => (
                  <div key={index} className="p-3.5 bg-neutral-50 dark:bg-[#3A3A3C] rounded-2xl border border-neutral-100/50 dark:border-neutral-800">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        notice.target === "전체" 
                          ? "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400" 
                          : "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400"
                      }`}>
                        {notice.target === "전체" ? "전체공지" : "개인전달"}
                      </span>
                      <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
                        발송: {notice.teacher} 선생님
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap font-normal">
                      {notice.content}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-neutral-400 dark:text-neutral-500 font-medium">
                ✨ 등록된 알림장이 없습니다. 즐거운 하루!
              </div>
            )}
          </div>
        </div>

        {/* 4. 상황별 인지 하단 바 */}
        <div className="w-full max-w-md px-5 mt-4">
          <div className="bg-white dark:bg-[#2C2C2E] border border-neutral-100 dark:border-neutral-800 p-4 rounded-2xl flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full ${isTodayActive ? "bg-green-500 animate-pulse" : "bg-neutral-300"}`}></span>
              <span className="text-xs font-semibold tracking-tight text-neutral-500 dark:text-neutral-400">
                {getStatusMessage()}
              </span>
            </div>
            {!isTodayActive && (
              <Link href={`/student/${studentId}`} className="text-[11px] font-bold text-neutral-800 dark:text-neutral-200 hover:underline tracking-tight">
                오늘로 돌아가기
              </Link>
            )}
          </div>
        </div>

        {/* 플로팅 버튼 */}
        {(showScrollTop || !isTodayActive) && (
          <button
            onClick={scrollToCurrentFocus}
            className="fixed bottom-6 right-6 z-50 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold text-xs px-4 py-3 rounded-full shadow-2xl flex items-center gap-1.5"
          >
            <span>🎯</span>
            {!isTodayActive ? "오늘로 이동" : "현재 교시"}
          </button>
        )}
      </main>

      {/* 🎯 5. 실시간 알림 팝업창 모달 UI */}
      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/10 backdrop-blur-[2px] transition-all duration-300">
          <div className="bg-white/90 dark:bg-[#2C2C2E]/90 backdrop-blur-2xl w-full max-w-sm rounded-[32px] p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] border border-neutral-100/30 dark:border-neutral-800/30 text-center relative">
            
            {/* 닫기 (X) 버튼 */}
            <button 
              onClick={() => setShowPopup(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:scale-105 active:scale-95 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* 팝업 내용 헤더 아이콘 */}
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-xl mx-auto mb-4 animate-bounce">
              {currentPeriod === "주말" ? "🌿" : "⏰"}
            </div>

            <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100 tracking-tight mb-2">
              실시간 일과 안내
            </h2>

            {/* 실시간 감지 결과 텍스트 */}
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300 leading-relaxed bg-neutral-50 dark:bg-neutral-800/40 py-3.5 px-4 rounded-2xl border border-neutral-100/50 dark:border-neutral-800/50">
              {popupMessage}
            </p>

            {/* 확인 닫기 버튼 */}
            <button
              onClick={() => setShowPopup(false)}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm py-3 px-4 rounded-2xl mt-5 shadow-md shadow-blue-500/10 active:scale-[0.98] transition-all"
            >
              시간표 확인하기
            </button>
          </div>
        </div>
      )}
    </>
  );
}