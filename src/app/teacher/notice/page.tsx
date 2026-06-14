"use client";

import { useState, useEffect } from "react";

// 1. 타입 규격 명확히 선언 (TypeScript 엄격 모드 완비)
interface NoticeItem {
  id: string;
  target: string;
  writer: string;
  content: string;
  date: string;
}

export default function NoticePage() {
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 2. 외부 API 호출 비동기 함수 정의
  const refreshNotices = async () => {
    setIsLoading(true);
    try {
      // /api/sheets-data 엔드포인트를 호출하여 캐시 없이 실시간 데이터를 가져옵니다.
      const res = await fetch("/api/sheets-data", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setNotices(data.notices || []);
      }
    } catch (e) {
      console.error("실시간 구글 시트 동기화 중 오류가 발생했습니다.", e);
    } finally {
      setIsLoading(false);
    }
  };

  // 3. 컴포넌트 마운트 시 최초 1회 자동으로 데이터 로드
  useEffect(() => {
    refreshNotices();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-6" style={{ fontFamily: "Pretendard, system-ui, sans-serif" }}>
      {/* K-에듀파인 테마의 직관적인 상단 안내 바 */}
      <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 p-6 mb-6 flex justify-between items-center shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="text-4xl">📢</div>
          <div>
            <h1 className="text-xl font-black text-slate-950">실시간 구글 시트 알림장</h1>
            <p className="text-xs text-slate-400 font-bold mt-0.5">
              스프레드시트에 기재된 알림장 내용이 실시간으로 동기화되어 통합 조회됩니다.
            </p>
          </div>
        </div>
        
        <button 
          onClick={() => { refreshNotices(); }} 
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all shadow-sm disabled:opacity-50"
        >
          {isLoading ? "동기화 중..." : "🔄 실시간 새로고침"}
        </button>
      </div>

      {/* 알림장 대형 피드 카드 리스트 */}
      <div className="max-w-4xl mx-auto space-y-4">
        {isLoading ? (
          <div className="text-center py-20 text-slate-400 font-bold bg-white rounded-2xl border border-slate-200 shadow-xs">
            구글 스프레드시트 서버와 통신하며 실시간 데이터를 읽어오는 중입니다...
          </div>
        ) : notices.length === 0 ? (
          <div className="text-center py-20 text-slate-400 font-bold bg-white rounded-2xl border border-slate-200 shadow-xs">
            현재 등록되거나 동기화된 알림장 공지 사항이 존재하지 않습니다.
          </div>
        ) : (
          notices.map((n) => (
            <div key={n.id} className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm hover:border-blue-500 transition-all">
              <div className="flex justify-between items-center mb-3">
                <span className="bg-blue-50 text-blue-700 font-black text-xs px-3 py-1 rounded-md">
                  🎯 대상: {n.target}
                </span>
                <span className="text-xs font-bold text-slate-400">{n.date}</span>
              </div>
              
              {/* 본문 텍스트 공간 */}
              <p className="text-base font-semibold text-slate-800 bg-slate-50 p-4 rounded-xl border border-slate-100 whitespace-pre-wrap leading-relaxed">
                {n.content}
              </p>
              
              <div className="mt-3 text-right text-xs font-bold text-slate-500">
                작성교사: <span className="text-slate-800">{n.writer} 선생님</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}