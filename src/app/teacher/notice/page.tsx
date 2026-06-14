"use client";

import { useState, useEffect } from "react";

interface NoticeItem {
  target: string;
  teacher: string;
  content: string;
}

export default function TeacherNoticeMonitor() {
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNotices = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/sheets-data", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setNotices(data.notices || []);
      }
    } catch (e) {
      console.error("알림장 동기화 실패", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border shadow-xs">
        <div>
          <h1 className="text-xl font-black">📢 학생 알림장 실시간 싱크 모니터</h1>
          <p className="text-xs text-slate-500 mt-1">구글 스프레드시트의 [알림장] 탭에 작성된 내용이 실시간 학생 앱과 동기화됩니다.</p>
        </div>
        <button onClick={fetchNotices} disabled={isLoading} className="bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-xl">
          {isLoading ? "동기화 중..." : "🔄 새로고침"}
        </button>
      </div>

      <div className="space-y-4">
        {notices.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border text-slate-400 font-bold">
            현재 활성화되어 반영된 학생 알림장이 없습니다.
          </div>
        ) : (
          notices.map((notice, idx) => (
            <div key={idx} className="bg-white border p-5 rounded-2xl shadow-xs space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className={`px-2.5 py-1 rounded-md font-black ${notice.target === "전체" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}`}>
                  대상: {notice.target === "전체" ? "전체공지" : `개인전달 (${notice.target})`}
                </span>
                <span className="font-bold text-slate-400">발송교사: {notice.teacher} 선생님</span>
              </div>
              <p className="text-sm font-semibold text-slate-800 bg-slate-50 p-4 rounded-xl whitespace-pre-wrap leading-relaxed border">
                {notice.content}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}