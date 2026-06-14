"use client";

import { useState, useEffect } from "react";

// 알림장 데이터 규격 정의
interface NoticeItem {
  id: string;
  date: string;
  target: string;  // 대상 (전체, 2-1, 특정 학생 이름 등)
  writer: string;  // 작성자 (특수교사, 담임 등)
  content: string; // 알림장 내용
}

export default function NoticePage() {
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTarget, setSearchTarget] = useState<string>("전체");

  // 구글 시트 연동 데이터를 가져오는 함수
  const fetchNoticeData = async () => {
    setIsLoading(true);
    try {
      // 1. 우리가 만든 Next.js API 엔드포인트 호출
      const res = await fetch("/api/sheets-data");
      if (res.ok) {
        const data = await res.json();
        // 구글 시트에서 넘어온 알림장 배열이 있다면 매핑
        if (data && data.notices) {
          setNotices(data.notices);
          return;
        }
      }
      // FailSafe: API가 준비되지 않았거나 실패했을 때 보여줄 안전 덧댐(Fallback) 데이터
      generateFallbackNotices();
    } catch (error) {
      console.error("구글 시트 동기화 실패, Fallback 데이터로 전환합니다.", error);
      generateFallbackNotices();
    } finally {
      setIsLoading(false);
    }
  };

  const generateFallbackNotices = () => {
    setNotices([
      {
        id: "1",
        date: "2026-06-15",
        target: "전체",
        writer: "민석준 (특수)",
        content: "내일 특수학급 현장체험학습이 예정되어 있습니다. 등교 시간 및 준비물(모자, 편한 운동화)을 확인해 주세요."
      },
      {
        id: "2",
        date: "2026-06-15",
        target: "2-1",
        writer: "김대홍 (담임)",
        content: "2-1반 통합학급 안내: 금주 목요일 5교시 창체 시간은 교실 대청소입니다."
      },
      {
        id: "3",
        date: "2026-06-14",
        target: "김한얼",
        writer: "민석준 (특수)",
        content: "한얼이 개별 지침: 이동수업 시 원반 교과서 보조 가방 챙겨서 도움실로 이동하도록 지도 바랍니다."
      }
    ]);
  };

  useEffect(() => {
    fetchNoticeData();
  }, []);

  // 필터링 로직 (전체 공지 또는 내 반/내 학생 공지만 골라보기)
  const filteredNotices = notices.filter(n => {
    if (searchTarget === "전체") return true;
    return n.target.includes(searchTarget) || n.target === "전체";
  });

  return (
    <div className="min-h-screen bg-slate-50 p-8" style={{ fontFamily: "Pretendard, system-ui, sans-serif" }}>
      {/* K-에듀파인 스타일 상단 타이틀 바 */}
      <div className="max-w-5xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">NEIS 라이트 연동</span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">📢 구글 시트 실시간 알림장 원격 연드부</h1>
            <p className="text-xs text-slate-400 font-medium mt-0.5">구글 스프레드시트의 내용이 실시간 반영되어 학교 선생님들과 상호 공유됩니다.</p>
          </div>
          <div className="flex items-center gap-2">
            <select 
              value={searchTarget} 
              onChange={(e) => setSearchTarget(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-xs font-bold px-4 py-2.5 rounded-xl focus:outline-none focus:border-blue-500 text-slate-700"
            >
              <option value="전체">📋 전체 공지 보기</option>
              <option value="2-1">반별: 2-1반 공지</option>
              <option value="2-3">반별: 2-3반 공지</option>
              <option value="2-4">반별: 2-4반 공지</option>
              <option value="김한얼">학생별: 김한얼</option>
            </select>
            <button 
              onClick={fetchNoticeData} 
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-all"
            >
              {isLoading ? "동기화 중..." : "🔄 실시간 새로고침"}
            </button>
          </div>
        </div>
      </div>

      {/* 알림장 카드 보드 리스트 */}
      <div className="max-w-5xl mx-auto space-y-4">
        {isLoading ? (
          <div className="text-center py-20 text-slate-400 font-bold text-sm bg-white rounded-2xl border border-slate-200">
            데이터 전송 통로 개설 중... 구글 시트 정보를 긁어오고 있습니다.
          </div>
        ) : filteredNotices.length === 0 ? (
          <div className="text-center py-20 text-slate-400 font-bold text-sm bg-white rounded-2xl border border-slate-200">
            해당 조건의 알림장 내역이 존재하지 않습니다.
          </div>
        ) : (
          filteredNotices.map((notice) => (
            <div 
              key={notice.id} 
              className={`bg-white border rounded-2xl p-6 shadow-xs transition-all hover:shadow-md ${
                notice.target === "전체" ? "border-l-4 border-l-blue-600 border-slate-200" : "border-slate-200"
              }`}
            >
              <div className="flex justify-between items-start gap-4 mb-3">
                <div className="flex items-center space-x-2">
                  <span className={`text-xs font-black px-2.5 py-1 rounded-md ${
                    notice.target === "전체" 
                      ? "bg-blue-50 text-blue-700" 
                      : "bg-amber-50 text-amber-800"
                  }`}>
                    🎯 대상: {notice.target}
                  </span>
                  <span className="text-xs font-bold text-slate-400">{notice.date}</span>
                </div>
                <div className="text-right text-xs font-bold text-slate-500">
                  발신: <span className="text-slate-800">{notice.writer}</span>
                </div>
              </div>
              <p className="text-sm font-semibold text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-100">
                {notice.content}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}