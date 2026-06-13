"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";

// 명부 연동 (읽기 권한 지정 타깃 추출용)
const TEACHERS_LIST = [
  { name: "고장선", type: "특수담임" },
  { name: "김다해", type: "특수담임" },
  { name: "임선곤", type: "특수담임" },
  { name: "서용환", type: "학년부장" },
  { name: "김대홍", type: "원반담임", targetClass: "2-1" },
  { name: "김수민", type: "원반담임", targetClass: "2-3" },
  { name: "정은영", type: "원반담임", targetClass: "2-4" },
  { name: "서한성", type: "원반담임", targetClass: "2-6" },
  { name: "여지언", type: "원반담임", targetClass: "2-8" },
  { name: "강지영", type: "원반담임", targetClass: "2-10" }
];

export default function TeacherNoticePage() {
  const [currentTeacher, setCurrentTeacher] = useState<any | null>(null);
  const [notices, setNotices] = useState<Array<any>>([]);
  const [activeBoard, setActiveBoard] = useState<string>("지원지침"); 

  const [isWriteOpen, setIsWriteOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newTag, setNewTag] = useState("일반공지");
  
  const [selectedTargets, setSelectedTargets] = useState<string[]>(["all"]);
  const [selectedNotice, setSelectedNotice] = useState<any | null>(null);

  useEffect(() => {
    // 🔐 대시보드 로그인 계정과 100% 동기화 유도
    const savedSession = localStorage.getItem("zh_current_teacher_session");
    if (savedSession) {
      setCurrentTeacher(JSON.parse(savedSession));
    } else {
      // 대시보드 미인가 진입 대비 기본 테스트용 배치
      setCurrentTeacher({ name: "고장선", type: "특수담임", targetClass: "all" });
    }

    const savedNotices = localStorage.getItem("zh_advanced_notices");
    if (savedNotices) {
      setNotices(JSON.parse(savedNotices));
    } else {
      const defaultNotices = [
        { 
          id: 1, 
          boardType: "지원지침",
          tag: "🚨 긴급지침", 
          title: "[보안] 2-1반 김한얼 학생 돌발 오버로드 제어 행동 바이블", 
          author: "고장선", 
          date: "2026-06-14", 
          content: "본 지침은 2-1반 담임교사 및 담당 특수교사 연계 기밀 사안입니다. 김한얼 학생이 소음을 내며 과부하 증상을 보일 시 임의 훈육을 절대 엄금하며, 즉시 가방 내 소음 완화 장치를 장착한 후 도움반으로 인계 협조 바랍니다.",
          visibleTo: ["김대홍"], // 🔒 김대홍 선생님 스코프 지정
          hits: 15
        },
        { 
          id: 2, 
          boardType: "지원지침",
          tag: "업무지원", 
          title: "통합학급 수업 보조용 특수교육 실무원실 배정 타임라인 (전체)", 
          author: "김다해", 
          date: "2026-06-13", 
          content: "2학년 각 교실 분산 배치 시간표 및 이동수업 수행 순회 일지표를 공람하오니 확인 바랍니다.",
          visibleTo: ["all"], 
          hits: 38
        },
        { 
          id: 3, 
          boardType: "협의게시판",
          tag: "💡 협의안건", 
          title: "2-3반 박진현 학생 다음 주 미술 순회 리프트 리허설 요청의 건", 
          author: "김수민", 
          date: "2026-06-12", 
          content: "안녕하세요 2-3반 담임 김수민입니다. 리프트 노후화로 마찰 위험이 있어 이동 동선에 맞춰 특수교사 조력을 미리 검토 부탁드립니다.",
          visibleTo: ["all"],
          hits: 24
        }
      ];
      setNotices(defaultNotices);
      localStorage.setItem("zh_advanced_notices", JSON.stringify(defaultNotices));
    }
  }, []);

  // 🔐 [핵심] 수신 교사 등급 기반 정밀 필터 연산 레이어
  const filteredNotices = useMemo(() => {
    if (!currentTeacher) return [];
    const boardTypeFiltered = notices.filter(n => n.boardType === activeBoard);

    // 마스터 권한 (특수 및 개발자)는 무조건 프리패스 전체 열람
    if (currentTeacher.type === "특수담임" || currentTeacher.type === "개발자") {
      return boardTypeFiltered;
    }

    // 일반교사는 '전체공개(all)'이거나 수신인 명단에 본인 이름이 정확히 들어있어야만 목록에 노출 (기밀 보호)
    return boardTypeFiltered.filter(n => 
      n.visibleTo.includes("all") || n.visibleTo.includes(currentTeacher.name) || n.author === currentTeacher.name
    );
  }, [notices, activeBoard, currentTeacher]);

  const toggleTarget = (name: string) => {
    if (name === "all") {
      setSelectedTargets(["all"]);
    } else {
      let updated = selectedTargets.filter(t => t !== "all");
      if (updated.includes(name)) {
        updated = updated.filter(t => t !== name);
        if (updated.length === 0) updated = ["all"];
      } else {
        updated.push(name);
      }
      setSelectedTargets(updated);
    }
  };

  const handleCreateNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim() || !currentTeacher) return;

    const newNotice = {
      id: Date.now(),
      boardType: activeBoard,
      tag: newTag,
      title: newTitle.trim(),
      author: currentTeacher.name,
      date: new Date().toISOString().split("T")[0],
      content: newContent.trim(),
      visibleTo: selectedTargets, 
      hits: 1
    };

    const updated = [newNotice, ...notices];
    setNotices(updated);
    localStorage.setItem("zh_advanced_notices", JSON.stringify(updated));

    setNewTitle("");
    setNewContent("");
    setSelectedTargets(["all"]);
    setIsWriteOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#0A0C14] text-slate-300 flex flex-col font-sans antialiased">
      <header className="w-full bg-[#111422] border-b border-slate-800/80 px-8 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Image src="/build_logo.png" alt="진해고등학교" width={32} height={32} className="object-contain" />
          <h1 className="text-sm font-bold text-white tracking-tight">진해고등학교 특수행정 업무지원포털</h1>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <Link href="/teacher/dashboard" className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1 rounded-xl text-slate-300 transition-all">
            ◀ 실시간 관제 대시보드 복귀
          </Link>
          <span className="bg-slate-900 border border-slate-800 px-3 py-1 rounded text-slate-400 font-bold">
            🔒 {currentTeacher?.name || "미인증"} 선생님 등급 활성중
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 space-y-4">
        <div className="flex gap-2 border-b border-slate-800 pb-2">
          <button onClick={() => { setActiveBoard("지원지침"); setIsWriteOpen(false); }} className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${activeBoard === "지원지침" ? "bg-blue-600 text-white shadow-md" : "bg-[#111422] text-slate-400 border border-slate-800/60"}`}>
            📋 호송 및 특수교육 실무지원 지침함
          </button>
          <button onClick={() => { setActiveBoard("협의게시판"); setIsWriteOpen(false); }} className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${activeBoard === "협의게시판" ? "bg-purple-600 text-white shadow-md" : "bg-[#111422] text-slate-400 border border-slate-800/60"}`}>
            🤝 통합학급 교직원 상호 소통·협의회
          </button>
        </div>

        <div className="bg-[#111422] border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-sm font-bold text-white">{activeBoard === "지원지침" ? "🔒 호송 및 특수교육 실무지원 지침함" : "🤝 통합학급 교직원 상호 소통·협의회"}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{activeBoard === "지원지침" ? "특수교사가 일반교사를 선택 인가하여 비공개 전파하는 연계 통제창입니다." : "직원 간 자유로운 일과 조율 포럼입니다."}</p>
            </div>
            {(activeBoard === "협의게시판" || currentTeacher?.type === "특수담임") && (
              <button onClick={() => setIsWriteOpen(!isWriteOpen)} className="bg-slate-800 border border-slate-700 text-white text-xs font-bold px-4 py-2 rounded-xl">
                {isWriteOpen ? "안건 목차 보기" : "✍️ 신규 안건 작성"}
              </button>
            )}
          </div>

          {isWriteOpen ? (
            <form onSubmit={handleCreateNotice} className="bg-[#0B0D16] border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">태그 분류</label>
                  <select value={newTag} onChange={(e) => setNewTag(e.target.value)} className="w-full px-3 py-2 bg-[#111422] border border-slate-800 rounded-xl text-xs text-white">
                    <option value="일반공지">일반공지</option>
                    <option value="🚨 긴급지침">🚨 긴급지침</option>
                    <option value="업무지원">업무지원</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">의결 및 안건 제목</label>
                  <input type="text" required placeholder="제목 기입..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="w-full px-3 py-2 bg-[#111422] border border-slate-800 rounded-xl text-xs text-white focus:outline-none" />
                </div>
              </div>

              <div className="bg-[#111422] p-4 rounded-xl border border-slate-800">
                <label className="block text-[11px] font-black text-blue-400 mb-2">👁️ 읽기 인가 교사 지정 (미지정 교사에게는 글이 투명하게 숨겨집니다)</label>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => toggleTarget("all")} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold ${selectedTargets.includes("all") ? "bg-blue-600 text-white" : "bg-slate-900 text-slate-400"}`}>
                    🌎 전체공개
                  </button>
                  {TEACHERS_LIST.filter(t => t.type === "원반담임" || t.type === "학년부장").map(t => (
                    <button key={t.name} type="button" onClick={() => toggleTarget(t.name)} className={`px-3 py-1.5 rounded-lg text-[11px] ${selectedTargets.includes(t.name) ? "bg-purple-600 text-white font-bold" : "bg-slate-900 text-slate-500"}`}>
                      {t.name} 선생님
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <textarea rows={5} required placeholder="상세 업무 내용을 기재하십시오..." value={newContent} onChange={(e) => setNewContent(e.target.value)} className="w-full px-4 py-3 bg-[#111422] border border-slate-800 rounded-xl text-xs text-white resize-none" />
              </div>
              <div className="text-right">
                <button type="submit" className="bg-blue-600 text-white font-bold text-xs px-6 py-2.5 rounded-xl">작성 완료</button>
              </div>
            </form>
          ) : (
            <div className="overflow-hidden border border-slate-800/60 rounded-xl bg-[#0B0D16]">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#171A2E] border-b border-slate-800 text-[11px] text-slate-400 font-bold">
                  <tr>
                    <th className="p-3.5 w-24 text-center">분류</th>
                    <th className="p-3.5">안건 요약 목록 (권한 부여 검증 완료)</th>
                    <th className="p-3.5 w-24">발행자</th>
                    <th className="p-3.5 w-32">읽기 인가 등급</th>
                    <th className="p-3.5 w-16 text-center">조회</th>
                  </tr>
                </thead>
                <tbody className="text-xs font-semibold text-slate-300 divide-y divide-slate-800/40">
                  {filteredNotices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-10 text-center text-slate-500 font-bold">본인 권한으로 열람 가능한 내부 지침 데이터가 배치되지 않았습니다.</td>
                    </tr>
                  ) : (
                    filteredNotices.map(notice => (
                      <tr key={notice.id} onClick={() => { const updated = notices.map(n => n.id === notice.id ? { ...n, hits: n.hits + 1 } : n); setNotices(updated); localStorage.setItem("zh_advanced_notices", JSON.stringify(updated)); setSelectedNotice({ ...notice, hits: notice.hits + 1 }); }} className="hover:bg-slate-800/30 cursor-pointer transition-colors group">
                        <td className="p-3.5 text-center"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${notice.tag.includes("🚨") ? "bg-red-950 text-red-400" : "bg-slate-800 text-slate-400"}`}>{notice.tag}</span></td>
                        <td className="p-3.5 text-white font-bold group-hover:text-blue-400">{notice.title}</td>
                        <td className="p-3.5 text-slate-400">{notice.author}</td>
                        <td className="p-3.5"><span className="text-[10px] font-mono font-bold bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-800">{notice.visibleTo.includes("all") ? "🔓 전체공개" : `🔒 권한제한`}</span></td>
                        <td className="p-3.5 text-center font-mono text-slate-500">{notice.hits}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* 🔮 모달 팝업 */}
      {selectedNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111422] border border-slate-800 w-full max-w-2xl rounded-3xl p-6 shadow-2xl relative flex flex-col">
            <button onClick={() => setSelectedNotice(null)} className="absolute top-5 right-5 text-slate-400 hover:text-white">✕</button>
            <div className="border-b border-slate-800 pb-4 mb-4">
              <span className="text-[10px] font-mono bg-blue-950 text-blue-400 px-2 py-0.5 rounded">{selectedNotice.tag}</span>
              <h3 className="text-base font-black text-white mt-2">{selectedNotice.title}</h3>
              <div className="flex flex-wrap gap-4 text-[11px] text-slate-500 mt-2">
                <span>발행: {selectedNotice.author} 교사</span>
                <span>일자: {selectedNotice.date}</span>
                <span className="text-purple-400">수신권한: [{selectedNotice.visibleTo.join(", ")}]</span>
              </div>
            </div>
            <div className="bg-[#0B0D16] border border-slate-800 rounded-2xl p-4 text-xs leading-relaxed text-slate-300 font-medium whitespace-pre-wrap min-h-[150px] overflow-y-auto">
              {selectedNotice.content}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}