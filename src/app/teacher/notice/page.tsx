"use client";

import { useState, useEffect } from "react";

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

  // 위에 만든 /api/sheets-data 통로를 통해 실시간 데이터를 가져오는 함수
  const refreshNotices = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/sheets-data");
      if (res.ok) {
        const data = await res.json();
        setNotices(data.notices || []);
      }
    } catch (e) {
      console.error("실시간 동기화 에러", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshNotices();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      {/* 큰 아이콘과 큰 글씨 중심의 상단 네비게이션 */}
      <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 p-6 mb-6 flex justify-between items-center shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="text-4xl">📢</div>
          <div>
            <h1 className="text-xl font-black text-slate-950">실시간 구글 시트 알림장</h1>
            <p className="text-xs text-slate-400 font-bold mt-0.5">스프레드시트에 적힌 내용이 교사 화면에 즉시 동기화됩니다.</p>
          </div>
        </div>
        
        <button 
          onClick={refreshNotices} 
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all shadow-sm"
        >
          {isLoading ? "동기화 중..." : "🔄 실시간 새로고침"}
        </button>
      </div>

      {/* 직관적인 큰 카드 형태의 게시판 알림장 리스트 */}
      <div className="max-w-4xl mx-auto space-y-4">
        {isLoading ? (
          <div className="text-center py-20 text-slate-400 font-bold bg-white rounded-2xl border border-slate-200">
            구글 스프레드시트에서 실시간 데이터를 읽어오는 중입니다...
          </div>
        ) : notices.length === 0 ? (
          <div className="text-center py-20 text-slate-400 font-bold bg-white rounded-2xl border border-slate-200">
            현재 등록된 알림장 공지 사항이 없습니다.
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
              
              {/* 실제 알림장 내용 (큰 글씨, 직관적) */}
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