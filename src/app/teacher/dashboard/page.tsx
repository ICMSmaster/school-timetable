"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image"; // 🖼️ Next.js 최적화 이미지 컴포넌트 로드

// 🧑‍🏫 초기 교직원 기본 명부 세팅 (보안 등급 분류)
const INITIAL_TEACHERS_REGISTRY = [
  { name: "고장선", type: "특수담임", targetClass: "all" },
  { name: "김다해", type: "특수담임", targetClass: "all" },
  { name: "임선곤", type: "특수담임", targetClass: "all" },
  { name: "서용환", type: "학년부장", targetClass: "all" },
  { name: "김대홍", type: "원반담임", targetClass: "2-1" },
  { name: "김수민", type: "원반담임", targetClass: "2-3" },
  { name: "정은영", type: "원반담임", targetClass: "2-4" },
  { name: "서한성", type: "원반담임", targetClass: "2-6" },
  { name: "여지언", type: "원반담임", targetClass: "2-8" },
  { name: "강지영", type: "원반담임", targetClass: "2-10" }
];

// 🎓 진해고등학교 2학년 특수학급 대상자 13명 정밀 데이터베이스
const INITIAL_STUDENTS_DB = [
  { id: "20110", classCode: "2-1", name: "김한얼", period: "2교시", subject: "국어 (특수)", location: "도움반", status: "수업중", attendance: "출석" },
  { id: "20121", classCode: "2-1", name: "이정준", period: "2교시", subject: "진로와 직업", location: "컴퓨터실", status: "수업중", attendance: "출석" },
  { id: "20306", classCode: "2-3", name: "김현중", period: "2교시", subject: "수학 (통합)", location: "2학년 3반", status: "수업중", attendance: "출석" },
  { id: "20311", classCode: "2-3", name: "박진현", period: "2교시", subject: "영어1 (통합)", location: "2학년 3반", status: "이동중", attendance: "출석" },
  { id: "20402", classCode: "2-4", name: "강민준", period: "2교시", subject: "국어 (특수)", location: "도움반", status: "수업중", attendance: "출석" },
  { id: "20406", classCode: "2-4", name: "김세현", period: "2교시", subject: "체육 (통합)", location: "체육관", status: "수업중", attendance: "출석" },
  { id: "20418", classCode: "2-4", name: "손민찬", period: "2교시", subject: "음악 (통합)", location: "음악실", status: "수업중", attendance: "조퇴" },
  { id: "20612", classCode: "2-6", name: "손찬민", period: "2교시", subject: "진로와 직업", location: "컴퓨터실", status: "수업중", attendance: "출석" },
  { id: "20616", classCode: "2-6", name: "오승철", period: "2교시", subject: "미술 (통합)", location: "미술실", status: "집중돌봄", attendance: "출석" },
  { id: "20813", classCode: "2-8", name: "박찬석", period: "2교시", subject: "수학 (통합)", location: "2학년 8반", status: "수업중", attendance: "출석" },
  { id: "20906", classCode: "2-9", name: "김재원", period: "2교시", subject: "국어 (특수)", location: "도움반", status: "수업중", attendance: "결석" },
  { id: "21026", classCode: "2-10", name: "조연우", period: "2교시", subject: "영어1 (통합)", location: "2학년 10반", status: "수업중", attendance: "출석" },
  { id: "21027", classCode: "2-10", name: "최재범", period: "2교시", subject: "체육 (통합)", location: "체육관", status: "수업중", attendance: "출석" },
];

export default function TeacherDashboardPage() {
  // --- 🔒 [보안 스토리지 컨트롤러] ---
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [systemLogs, setSystemLogs] = useState<Array<{ id: number, time: string, msg: string, level: string }>>([]);

  const [currentTeacher, setCurrentTeacher] = useState<any | null>(null);
  const [loginId, setLoginId] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [loginError, setLoginError] = useState("");

  // 🔑 신규 암호 설정 팝업 상태 트리거
  const [isPasswordSetupMode, setIsPasswordSetupMode] = useState(false);
  const [pendingTeacher, setPendingTeacher] = useState<any>(null);
  const [newPasswordInput, setNewPasswordInput] = useState("");

  // 일과 관리 상태 스페이스
  const [statusFilter, setStatusFilter] = useState<string>("전체");
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [studentFeeds, setStudentFeeds] = useState<Record<string, any>>({});
  const [newFeedText, setNewFeedText] = useState("");
  const [sharedMemo, setSharedMemo] = useState("📋 [특수학급 내부 기밀 인계사항]\n- 오승철 학생 소음 완화용 헤드셋 소지 필수.");
  const [boardList, setBoardList] = useState([
    { id: 1, author: "고장선", title: "2026학년도 상반기 개별화교육지원팀 협의 서식 공유", date: "06-14" }
  ]);
  const [newPostTitle, setNewPostTitle] = useState("");
  const [currentTime, setCurrentTime] = useState("");

  // 로컬 스토리지 보안 장부 불러오기
  useEffect(() => {
    const savedPws = localStorage.getItem("zh_secured_pws");
    if (savedPws) {
      setPasswords(JSON.parse(savedPws));
    } else {
      const initialMap: Record<string, string> = {};
      INITIAL_TEACHERS_REGISTRY.forEach(t => { initialMap[t.name] = "1111"; });
      initialMap["개발자"] = "9999"; // 마스터 개발자 비밀번호 고정
      setPasswords(initialMap);
      localStorage.setItem("zh_secured_pws", JSON.stringify(initialMap));
    }

    const savedLogs = localStorage.getItem("zh_secured_logs");
    if (savedLogs) {
      setSystemLogs(JSON.parse(savedLogs));
    } else {
      const initLog = [{ id: 1, time: "08:30:00", msg: "보안 코어 로깅 관제 모듈 시스템 기동 완료.", level: "SYSTEM" }];
      setSystemLogs(initLog);
      localStorage.setItem("zh_secured_logs", JSON.stringify(initLog));
    }
  }, []);

  // 실시간 하이엔드 디지털 클록
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }));
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // 통합 로그 레코더 함수 (개발자 전용 아카이빙)
  const writeLog = (msg: string, level: string = "INFO") => {
    const now = new Date();
    const timeStr = now.toTimeString().split(" ")[0];
    const newLog = { id: Date.now(), time: timeStr, msg, level };
    setSystemLogs(prev => {
      const updated = [newLog, ...prev];
      localStorage.setItem("zh_secured_logs", JSON.stringify(updated));
      return updated;
    });
  };

  // 🔐 [보안 검증 통제 연산] 교사 로그인 처리
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const idInput = loginId.trim();
    const pwInput = loginPw.trim();

    if (idInput === "개발자") {
      if (pwInput === passwords["개발자"]) {
        setCurrentTeacher({ name: "시스템개발자", type: "개발자", targetClass: "all" });
        writeLog("시스템 개발자(Root) 권한 보안 우회 로그인 성공", "SECURE");
        setLoginError("");
      } else {
        setLoginError("개발자 마스터 키 보안 코드가 일치하지 않습니다.");
      }
      return;
    }

    const foundTeacher = INITIAL_TEACHERS_REGISTRY.find(t => t.name === idInput);
    if (!foundTeacher) {
      setLoginError("교직원 전산망에 등록되지 않은 성명입니다.");
      return;
    }

    const storedPassword = passwords[idInput] || "1111";

    if (pwInput === storedPassword) {
      if (pwInput === "1111") {
        setPendingTeacher(foundTeacher);
        setIsPasswordSetupMode(true);
        setLoginError("");
      } else {
        setCurrentTeacher(foundTeacher);
        writeLog(`[${foundTeacher.type}] ${foundTeacher.name} 교사 로그인 성공`, "AUTH");
        setLoginError("");
      }
    } else {
      setLoginError("비밀번호가 올바르지 않습니다. 다시 입력해 주세요.");
      writeLog(`[경고] ${idInput} 계정 비밀번호 인증 실패 감지`, "WARN");
    }
  };

  // 🔑 [암호 변경 처리 함수] 숫자 4자리 검증 절차
  const handleRegisterNewPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(newPasswordInput)) {
      alert("보안 오류: 비밀번호는 반드시 숫자 4자리여야 합니다.");
      return;
    }

    const updatedPws = { ...passwords, [pendingTeacher.name]: newPasswordInput };
    setPasswords(updatedPws);
    localStorage.setItem("zh_secured_pws", JSON.stringify(updatedPws));

    writeLog(`[보안성장] ${pendingTeacher.name} 교사 초기 비밀번호 변경 완료`, "SECURE");
    
    setCurrentTeacher(pendingTeacher);
    setIsPasswordSetupMode(false);
    setNewPasswordInput("");
    setLoginId("");
    setLoginPw("");
  };

  // 권한 기반 데이터 통제 레이어
  const authorizedStudentsRaw = useMemo(() => {
    if (!currentTeacher) return [];
    if (currentTeacher.targetClass === "all") return INITIAL_STUDENTS_DB;
    return INITIAL_STUDENTS_DB.filter(s => s.classCode === currentTeacher.targetClass);
  }, [currentTeacher]);

  // 📊 특수교사용 스코프 세이프 스탯 연산 (일반교사 뷰에서는 호출되지 않아 에러 없음)
  const specialTeacherStats = useMemo(() => {
    const total = authorizedStudentsRaw.length;
    const inDoum = authorizedStudentsRaw.filter(s => s.location === "도움반").length;
    const outTonghap = authorizedStudentsRaw.filter(s => s.location !== "도움반").length;
    const exception = authorizedStudentsRaw.filter(s => s.attendance !== "출석").length;
    return { total, inDoum, outTonghap, exception };
  }, [authorizedStudentsRaw]);

  const filteredStudents = useMemo(() => {
    if (statusFilter === "전체") return authorizedStudentsRaw;
    if (statusFilter === "도움반") return authorizedStudentsRaw.filter(s => s.location === "도움반");
    if (statusFilter === "통합학급") return authorizedStudentsRaw.filter(s => s.location !== "도움반");
    return authorizedStudentsRaw;
  }, [authorizedStudentsRaw, statusFilter]);

  const handleAddPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostTitle.trim() || !currentTeacher) return;
    setBoardList([{ id: Date.now(), author: currentTeacher.name, title: newPostTitle, date: "오늘" }, ...boardList]);
    writeLog(`[공유사항 등록] ${currentTeacher.name} 교직원 안건 발행`, "INFO");
    setNewPostTitle("");
  };

  const handleAddFeed = (studentId: string) => {
    if (!newFeedText.trim() || !currentTeacher) return;
    const roleString = currentTeacher.type === "원반담임" ? `${currentTeacher.targetClass} 담임` : currentTeacher.type;
    const newMsg = {
      sender: currentTeacher.name,
      role: roleString,
      text: newFeedText.trim(),
      date: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false })
    };
    setStudentFeeds({ ...studentFeeds, [studentId]: [...(studentFeeds[studentId] || []), newMsg] });
    writeLog(`[연계피드 전송] ${currentTeacher.name} -> 학생 ID ${studentId} 메시지 라우팅`, "COMM");
    setNewFeedText("");
  };

  // --- 🔒 [로그인 관문 UI] ---
  if (!currentTeacher) {
    return (
      <div className="min-h-screen bg-[#070913] flex items-center justify-center p-4 antialiased">
        {!isPasswordSetupMode ? (
          <div className="w-full max-w-md bg-[#0F1322]/90 backdrop-blur-3xl rounded-[32px] border border-slate-800/80 p-8 shadow-[0_30px_60px_rgba(0,0,0,0.6)]">
            <div className="flex flex-col items-center mb-6">
              {/* 🏛️ 로그인 창 중앙 상단 학교 로고 배치 */}
              <div className="mb-4 bg-slate-900/40 p-3 rounded-2xl border border-slate-800">
                <Image 
                  src="/build_logo.png" 
                  alt="진해고등학교 로고" 
                  width={60} 
                  height={60} 
                  priority
                  className="object-contain"
                />
              </div>
              <span className="text-[10px] tracking-widest bg-blue-500/10 text-blue-400 font-mono px-3 py-1 rounded-md border border-blue-500/20 mb-2">
                HIGH SECURE INTRANET V5
              </span>
              <h1 className="text-base font-bold text-white tracking-tight">진해고 특수학급 관제포털</h1>
              <p className="text-xs text-slate-500 mt-1">인가된 교직원 성명 및 패스워드를 입력하십시오.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="교직원 성함 입력"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  className="w-full px-4 py-3.5 bg-[#080A12] border border-slate-800 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-blue-600 transition-all"
                />
              </div>
              <div>
                <input
                  type="password"
                  placeholder="비밀번호 입력 (초기 암호: 1111)"
                  value={loginPw}
                  onChange={(e) => loginPw !== undefined ? setLoginPw(e.target.value) : null}
                  className="w-full px-4 py-3.5 bg-[#080A12] border border-slate-800 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-blue-600 transition-all"
                />
              </div>
              {loginError && <p className="text-xs font-semibold text-red-400 pl-1">✕ {loginError}</p>}
              
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm py-3.5 rounded-xl transition-all shadow-md">
                보안 서버 연동 로그인
              </button>
            </form>
          </div>
        ) : (
          <div className="w-full max-w-md bg-[#16120B] border border-amber-900/60 rounded-[32px] p-8 shadow-2xl">
            <div className="text-center mb-6">
              <span className="text-[10px] font-mono bg-amber-500/10 text-amber-400 px-3 py-1 rounded border border-amber-500/20">PASSWORD SAFETY COMPLIANCE</span>
              <h2 className="text-base font-bold text-white mt-3">[{pendingTeacher?.name}] 선생님, 보안 변경 안내</h2>
              <p className="text-xs text-amber-200/60 mt-1">현재 초기 보안코드(1111) 상태입니다.<br />앞으로 사용할 **숫자 4자리**를 고유 등록해 주세요.</p>
            </div>
            <form onSubmit={handleRegisterNewPassword} className="space-y-4">
              <input
                type="password"
                maxLength={4}
                placeholder="새로운 숫자 4자리 입력"
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value.replace(/[^0-9]/g, ""))}
                className="w-full px-4 py-3.5 bg-[#080A12] border border-amber-900/40 rounded-xl text-center text-lg font-mono font-bold tracking-widest text-amber-300 focus:outline-none focus:border-amber-500"
              />
              <button type="submit" className="w-full bg-amber-600 hover:bg-amber-500 text-black font-black text-xs py-3.5 rounded-xl tracking-wider uppercase transition-colors">
                새로운 비밀번호 승인 및 마스터본 등록
              </button>
            </form>
          </div>
        )}
      </div>
    );
  }

  // --- 🛠️ 1. [개발자 관리 콘솔 시스템 뷰] ---
  if (currentTeacher.type === "개발자") {
    return (
      <div className="min-h-screen bg-[#05070B] text-emerald-400 font-mono p-6 selection:bg-emerald-500/20">
        <header className="border-b border-emerald-900/60 pb-4 mb-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Image src="/build_logo.png" alt="Logo" width={32} height={32} className="opacity-80" />
            <div>
              <h1 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                ZH-INTRANET MASTER CONTROL CONSOLE
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">시스템 개발자 전용 DB 실시간 마스터 감사 모듈</p>
            </div>
          </div>
          <button onClick={() => setCurrentTeacher(null)} className="bg-red-950/40 border border-red-900/50 text-red-400 font-bold px-4 py-1.5 rounded text-xs hover:bg-red-900/40 transition-all">
            콘솔 안전 해제
          </button>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="bg-[#090F16] border border-emerald-950 rounded-2xl p-5 shadow-lg">
            <h2 className="text-xs font-black tracking-wider text-white mb-4 border-b border-emerald-950 pb-2">🔑 교직원 계정별 암호 명부 (개발자 암호 복호화 뷰)</h2>
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {Object.entries(passwords).map(([name, pw]) => (
                <div key={name} className="flex justify-between items-center text-xs bg-[#060A10] p-2.5 rounded border border-emerald-950/60">
                  <span className="text-slate-400 font-bold">{name} 교사 계정</span>
                  <span className="bg-emerald-950/60 px-2 py-0.5 rounded text-emerald-300 font-mono font-black border border-emerald-900/30">
                    {pw === "1111" ? "⚠️ 초기 비밀번호" : `🔒 비밀번호: ${pw}`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="xl:col-span-2 bg-[#090F16] border border-emerald-950 rounded-2xl p-5 shadow-lg flex flex-col h-[560px]">
            <h2 className="text-xs font-black tracking-wider text-white mb-3 border-b border-emerald-950 pb-2">🖥️ 실시간 인트라넷 코어 로그 스트림</h2>
            <div className="flex-1 bg-[#04070B] p-4 rounded-xl font-mono text-[11px] leading-relaxed overflow-y-auto space-y-1.5 text-slate-400">
              {systemLogs.map((log) => (
                <div key={log.id} className="hover:bg-slate-900/40 py-0.5 rounded px-1 transition-colors">
                  <span className="text-slate-600 mr-2">[{log.time}]</span>
                  <span className={`font-bold mr-2 ${log.level === "SECURE" ? "text-blue-400" : log.level === "WARN" ? "text-red-400" : "text-emerald-500"}`}>[{log.level}]</span>
                  <span>{log.msg}</span>
                </div>
              ))}
            </div>
            <button onClick={() => { setSystemLogs([]); localStorage.removeItem("zh_secured_logs"); }} className="mt-3 text-right text-[11px] text-slate-500 hover:text-slate-300">로그 버퍼 초기화</button>
          </div>
        </div>
      </div>
    );
  }

  // --- 💎 2. [특수학급 전용 업무지원시스템 (럭셔리 하이엔드 뷰)] ---
  if (currentTeacher.type === "특수담임") {
    return (
      <div className="min-h-screen bg-[#070912] text-slate-200 antialiased flex flex-col font-sans">
        <header className="w-full bg-[#0E1220]/90 backdrop-blur-md px-8 py-3 flex justify-between items-center border-b border-slate-800/80 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            {/* 🏛️ 헤더 좌측에 학교 로고 탑재 */}
            <Image src="/build_logo.png" alt="진해고등학교" width={34} height={34} className="object-contain" />
            <h1 className="text-sm font-black text-white tracking-tight">진해고등학교 특수학급 통합행정관제시스템</h1>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="text-blue-400 font-mono bg-blue-950/50 px-3 py-1 rounded border border-blue-900/40">{currentTime}</span>
            <span className="bg-slate-800/60 border border-slate-700/50 px-3 py-1 rounded-xl text-slate-300">🌟 도움반 마스터 전담교사: <span className="text-white font-extrabold">{currentTeacher.name}</span></span>
            <button onClick={() => setCurrentTeacher(null)} className="text-slate-500 hover:text-red-400 transition-colors">시스템 로그아웃</button>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-[#101426] border border-blue-900/30 p-4 rounded-2xl shadow-lg">
                <span className="text-[11px] font-bold text-slate-400 block">특수 전담 관제 대상</span>
                <span className="text-2xl font-black text-white font-mono mt-1 block">{specialTeacherStats.total}명</span>
              </div>
              <div className="bg-[#101426] border border-blue-900/30 p-4 rounded-2xl shadow-lg">
                <span className="text-[11px] font-bold text-emerald-400 block">학습도움실 내재 수업</span>
                <span className="text-2xl font-black text-emerald-400 font-mono mt-1 block">{specialTeacherStats.inDoum}명</span>
              </div>
              <div className="bg-[#101426] border border-blue-900/30 p-4 rounded-2xl shadow-lg">
                <span className="text-[11px] font-bold text-purple-400 block">통합학급 분산 수업</span>
                <span className="text-2xl font-black text-purple-400 font-mono mt-1 block">{specialTeacherStats.outTonghap}명</span>
              </div>
              <div className="bg-[#101426] border border-blue-900/30 p-4 rounded-2xl shadow-lg">
                <span className="text-[11px] font-bold text-amber-500 block">특이 출결 데이터</span>
                <span className="text-2xl font-black text-amber-500 font-mono mt-1 block">{specialTeacherStats.exception}명</span>
              </div>
            </div>

            <div className="bg-[#101426] border border-slate-800/80 rounded-[24px] p-6 shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-bold text-white">🕹️ 실시간 특수학급 대상자 다차원 트래킹 매트릭스</h2>
              </div>
              <div className="overflow-hidden border border-slate-800/60 rounded-xl bg-[#090C16]">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#151A30] border-b border-slate-800 text-[11px] text-slate-400 font-bold">
                    <tr>
                      <th className="p-3.5">반정보</th>
                      <th className="p-3.5">학번</th>
                      <th className="p-3.5">이름</th>
                      <th className="p-3.5">수강 교과</th>
                      <th className="p-3.5">현재 모바일 핑 위치</th>
                      <th className="p-3.5">안전 동향</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs font-semibold text-slate-300 divide-y divide-slate-800/40">
                    {filteredStudents.map(student => (
                      <tr key={student.id} onClick={() => setSelectedStudent(student)} className="hover:bg-blue-950/20 cursor-pointer transition-colors">
                        <td className="p-3.5"><span className="bg-blue-950/60 text-blue-400 border border-blue-900/40 px-2 py-0.5 rounded text-[10px]">{student.classCode}반</span></td>
                        <td className="p-3.5 text-slate-500 font-mono">{student.id}</td>
                        <td className="p-3.5 font-bold text-white">{student.name}</td>
                        <td className="p-3.5 text-slate-400">{student.period} | {student.subject}</td>
                        <td className="p-3.5 font-bold text-blue-400">📍 {student.location}</td>
                        <td className="p-3.5"><span className="bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded-full text-[10px]">{student.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-[#101426] border border-slate-800/80 rounded-[24px] p-6">
              <h2 className="text-sm font-bold text-white mb-4">📂 특수학급 교무 협의 내부 아카이브</h2>
              <form onSubmit={handleAddPost} className="flex gap-2 mb-4">
                <input type="text" placeholder="공유할 안건 핵심 헤드라인 기입..." value={newPostTitle} onChange={(e) => setNewPostTitle(e.target.value)} className="flex-1 px-4 py-2 bg-[#090C16] border border-slate-800 rounded-xl text-xs" />
                <button type="submit" className="bg-blue-600 text-white font-bold text-xs px-4 py-2 rounded-xl">기록 등록</button>
              </form>
              <div className="divide-y divide-slate-800 rounded-xl overflow-hidden bg-[#090C16]">
                {boardList.map(p => (
                  <div key={p.id} className="p-3 text-xs flex justify-between items-center hover:bg-slate-800/30">
                    <div className="flex gap-3"><span className="text-slate-400 font-bold w-12">{p.author}</span><p className="text-slate-200 font-medium">{p.title}</p></div>
                    <span className="text-[10px] font-mono text-slate-500">{p.date}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <section className="bg-[#1A140E] border border-amber-950 rounded-[24px] p-6 flex flex-col min-h-[500px]">
            <h2 className="text-sm font-bold text-amber-300 mb-2 flex items-center gap-2"><span>✍️</span>학습도움실 교사 일간 정밀 인계록</h2>
            <textarea value={sharedMemo} onChange={(e) => setSharedMemo(e.target.value)} className="flex-1 w-full bg-[#0A0806] border border-amber-950/60 rounded-2xl p-4 text-xs text-amber-100 font-medium resize-none focus:outline-none" />
          </section>
        </main>
      </div>
    );
  }

  // --- 📋 3. [일반 통합 원반담임 및 학년부장 전용 (협업 미니멀리즘 뷰)] ---
  return (
    <div className="min-h-screen bg-[#0A0C14] text-slate-300 flex flex-col font-sans antialiased">
      <header className="w-full bg-[#111422] border-b border-slate-800/80 px-8 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          {/* 🏛️ 일반 교사 헤더 좌측에도 학교 로고 배치 */}
          <Image src="/build_logo.png" alt="진해고등학교" width={32} height={32} className="object-contain" />
          <h1 className="text-sm font-bold text-white">
            {currentTeacher.type === "원반담임" ? `진해고등학교 [${currentTeacher.targetClass} 학급 지원 포털]` : "진해고등학교 [학년부장 통합 관제 포털]"}
          </h1>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="bg-slate-900 border border-slate-800 px-3 py-1 rounded text-slate-400">{currentTeacher.name} 선생님 접속중</span>
          <button onClick={() => setCurrentTeacher(null)} className="text-slate-500 hover:text-red-400">안전 로그아웃</button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 space-y-6">
        <div className="bg-[#111422] border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-white">📋 실시간 배정 특수학급 대상자 현황</h2>
            <p className="text-xs text-slate-500 mt-0.5">학생 행을 마우스로 클릭하면 도움반 교직원 전용 **[1:1 연계 대화 및 협조 소통 다이어리]** 피드가 오픈됩니다.</p>
          </div>

          <div className="overflow-hidden border border-slate-800/60 rounded-xl bg-[#0B0D16]">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#171A2E] border-b border-slate-800 text-[11px] text-slate-400 font-bold">
                <tr>
                  <th className="p-3.5">소속</th>
                  <th className="p-3.5">학번</th>
                  <th className="p-3.5">이름</th>
                  <th className="p-3.5">현재 이수 교과</th>
                  <th className="p-3.5">현재 위치</th>
                  <th className="p-3.5">동향 요약</th>
                </tr>
              </thead>
              <tbody className="text-xs font-semibold text-slate-300 divide-y divide-slate-800/40">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 font-bold">현재 본인 학급에 매핑된 도움반 소속 학생 데이터가 존재하지 않습니다.</td>
                  </tr>
                ) : (
                  filteredStudents.map(student => (
                    <tr key={student.id} onClick={() => setSelectedStudent(student)} className="hover:bg-slate-800/50 cursor-pointer transition-colors">
                      <td className="p-3.5"><span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] font-bold text-slate-400">{student.classCode}반</span></td>
                      <td className="p-3.5 font-mono text-slate-500">{student.id}</td>
                      <td className="p-3.5 text-white font-bold">{student.name}</td>
                      <td className="p-3.5 text-slate-400">{student.period} - {student.subject}</td>
                      <td className="p-3.5 text-blue-400 font-bold">📍 {student.location}</td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${student.status === "집중돌봄" ? "bg-red-950 text-red-400" : "bg-emerald-950 text-emerald-400"}`}>
                          {student.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 🔒 안전한 장막 보안 블러 처리 가동 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-20 pointer-events-none select-none relative">
          <div className="absolute inset-0 z-10 flex items-center justify-center font-bold text-xs bg-[#0A0C14]/80 text-red-400">
            🔒 특수학급 교사 전용 기밀 정보 영역 (원반담임 및 학년부장 보안 격리됨)
          </div>
          <div className="bg-[#111422] border border-slate-800 rounded-2xl p-4">
            <h3 className="text-xs font-bold text-slate-500 mb-2">교무 공유 협의록</h3>
            <div className="w-full h-20 bg-slate-900 rounded-xl" />
          </div>
          <div className="bg-[#111422] border border-slate-800 rounded-2xl p-4">
            <h3 className="text-xs font-bold text-slate-500 mb-2">도움반 내부 인계록</h3>
            <div className="w-full h-20 bg-slate-900 rounded-xl" />
          </div>
        </div>
      </main>

      {/* 🔮 [상호 전달 및 소통 피드 멀티 카드 구조 모달] */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111422] border border-slate-800 w-full max-w-xl rounded-3xl p-6 shadow-2xl relative flex flex-col max-h-[85vh]">
            <button onClick={() => setSelectedStudent(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white">✕</button>
            <div className="mb-3">
              <span className="text-[10px] uppercase font-mono bg-blue-900/40 text-blue-400 px-2.5 py-0.5 rounded border border-blue-900/30">{selectedStudent.classCode}반 통합 관리</span>
              <h3 className="text-base font-bold text-white mt-1">{selectedStudent.name} 학생 통합 전달 연계 대화함</h3>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 bg-[#0B0D16] p-4 rounded-xl border border-slate-800 min-h-[180px] mb-4">
              {(studentFeeds[selectedStudent.id] || []).length === 0 ? (
                <div className="text-center text-slate-600 font-medium py-8 text-xs">협조 대화 기록이 존재하지 않습니다. 첫 전달 사항을 발행하세요.</div>
              ) : (
                (studentFeeds[selectedStudent.id] || []).map((feed: any, idx: number) => {
                  const isMe = feed.sender === currentTeacher.name;
                  return (
                    <div key={idx} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                      <span className="text-[10px] text-slate-500 font-bold mb-0.5">{feed.sender} ({feed.role})</span>
                      <div className={`p-3 rounded-2xl text-xs max-w-xs ${isMe ? "bg-blue-600 text-white rounded-tr-none" : "bg-slate-800 text-slate-200 rounded-tl-none"}`}>
                        {feed.text}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder={currentTeacher.type === "학년부장" ? "학년부장교사는 조회 전용 모드로 입력이 제한됩니다." : "도움반/담임 교사에게 실시간 전달할 협조 사항 기입..."} 
                disabled={currentTeacher.type === "학년부장"}
                value={newFeedText}
                onChange={(e) => setNewFeedText(e.target.value)}
                onKeyDown={(e) => { if(e.key === 'Enter') handleAddFeed(selectedStudent.id); }}
                className="flex-1 px-4 py-2.5 bg-[#0B0D16] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 disabled:opacity-40" 
              />
              <button 
                onClick={() => handleAddFeed(selectedStudent.id)} 
                disabled={currentTeacher.type === "학년부장"}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl disabled:bg-slate-800"
              >
                전달
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}