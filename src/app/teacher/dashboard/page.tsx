"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";

// 🎓 진해고등학교 2학년 특수학급 대상자 정밀 데이터베이스
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
  // --- 🔒 [핵심 동적 레지스트리 스페이스] ---
  const [teachers, setTeachers] = useState<Array<any>>([]);
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [systemLogs, setSystemLogs] = useState<Array<{ id: number, time: string, msg: string, level: string }>>([]);
  const [notices, setNotices] = useState<Array<any>>([]);

  const [currentTeacher, setCurrentTeacher] = useState<any | null>(null);
  const [loginId, setLoginId] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [loginError, setLoginError] = useState("");

  // 일반 교사용 초기 비밀번호 변경 트리거
  const [isPasswordSetupMode, setIsPasswordSetupMode] = useState(false);
  const [pendingTeacher, setPendingTeacher] = useState<any>(null);
  const [newPasswordInput, setNewPasswordInput] = useState("");

  // 개발자 계정(민석준) 전용 신규 계정 생성 Form 상태
  const [createTeacherName, setCreateTeacherName] = useState("");
  const [createTeacherType, setCreateTeacherType] = useState("원반담임");
  const [createTargetClass, setCreateTargetClass] = useState("2-1");

  // 일과 관제 컨트롤 스페이스
  const [statusFilter, setStatusFilter] = useState<string>("전체");
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [studentFeeds, setStudentFeeds] = useState<Record<string, any>>({});
  const [newFeedText, setNewFeedText] = useState("");
  const [sharedMemo, setSharedMemo] = useState("📋 [특수학급 내부 기밀 인계사항]\n- 오승철 학생 소음 완화용 헤드셋 소지 필수.");
  const [currentTime, setCurrentTime] = useState("");

  // 마운트 시 브라우저 내부 스토리지 데이터 무결성 검증 및 로드
  useEffect(() => {
    // 1. 교사 명부 복구 또는 초기화
    const savedTeachers = localStorage.getItem("zh_teachers_registry");
    let currentTeachersList = [];
    if (savedTeachers) {
      currentTeachersList = JSON.parse(savedTeachers);
      setTeachers(currentTeachersList);
    } else {
      const defaultTeachers = [
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
      currentTeachersList = defaultTeachers;
      setTeachers(defaultTeachers);
      localStorage.setItem("zh_teachers_registry", JSON.stringify(defaultTeachers));
    }

    // 2. 패스워드 테이블 복구 또는 초기화
    const savedPws = localStorage.getItem("zh_secured_pws");
    if (savedPws) {
      setPasswords(JSON.parse(savedPws));
    } else {
      const initialMap: Record<string, string> = {};
      currentTeachersList.forEach((t: any) => { initialMap[t.name] = "1111"; });
      initialMap["민석준"] = "msj2026!!@"; // 🔒 최고 개발자 고정 키 탑재
      setPasswords(initialMap);
      localStorage.setItem("zh_secured_pws", JSON.stringify(initialMap));
    }

    // 3. 시스템 보안 코어 로그 복구
    const savedLogs = localStorage.getItem("zh_secured_logs");
    if (savedLogs) {
      setSystemLogs(JSON.parse(savedLogs));
    } else {
      const initLog = [{ id: 1, time: "08:30:00", msg: "민석준 개발자 인프라 보안 커널 기동 완료.", level: "SYSTEM" }];
      setSystemLogs(initLog);
      localStorage.setItem("zh_secured_logs", JSON.stringify(initLog));
    }

    // 4. 공지사항 데이터 연동 복구
    const savedNotices = localStorage.getItem("zh_advanced_notices");
    if (savedNotices) {
      setNotices(JSON.parse(savedNotices));
    }

    // 5. 로그인 기록 세션 유지 체크
    const savedSession = localStorage.getItem("zh_current_teacher_session");
    if (savedSession) {
      setCurrentTeacher(JSON.parse(savedSession));
    }
  }, []);

  // 실시간 시스템 디지털 타이머 크론
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }));
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

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

  // 🔐 [보안 관문 라우팅 알고리즘]
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const idInput = loginId.trim();
    const pwInput = loginPw.trim();

    // 💻 최고 개발자 '민석준' 계정 특수 문자 매핑 우선 필터링
    if (idInput === "민석준") {
      const masterPassword = passwords["민석준"] || "msj2026!!@";
      if (pwInput === masterPassword) {
        const devSession = { name: "민석준", type: "개발자", targetClass: "all" };
        setCurrentTeacher(devSession);
        localStorage.setItem("zh_current_teacher_session", JSON.stringify(devSession));
        writeLog("최고 개발자 민석준(Root) 하이패스 보안 서버 연동 승인 완료", "SECURE");
        setLoginError("");
      } else {
        setLoginError("민석준 최고 개발자 고유 보안 액세스 키코드가 불일치합니다.");
        writeLog("무단 침입 경고: 외부 단말기로부터 민석준 계정 침입 시도 차단", "WARN");
      }
      return;
    }

    const foundTeacher = teachers.find(t => t.name === idInput);
    if (!foundTeacher) {
      setLoginError("교직원 인사 기록 명부에 등재되지 않은 성명입니다.");
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
        localStorage.setItem("zh_current_teacher_session", JSON.stringify(foundTeacher));
        writeLog(`[인증 성공] ${foundTeacher.type} - ${foundTeacher.name} 교사 포털 접속`, "AUTH");
        setLoginError("");
      }
    } else {
      setLoginError("비밀번호가 오치되었습니다. 전산실에 문의하십시오.");
      writeLog(`[인증 실패] ${idInput} 교사 계정 비밀번호 오기 입력 발생`, "WARN");
    }
  };

  // 일반 교사 전용 패스워드 최초 셋업
  const handleRegisterNewPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(newPasswordInput)) {
      alert("규격 경고: 일반 교직원 패스워드는 숫자 4자리여야 합니다.");
      return;
    }
    const updatedPws = { ...passwords, [pendingTeacher.name]: newPasswordInput };
    setPasswords(updatedPws);
    localStorage.setItem("zh_secured_pws", JSON.stringify(updatedPws));
    writeLog(`[보안 승정] ${pendingTeacher.name} 교사 고유 패스워드 암호화 키 변환`, "SECURE");
    
    setCurrentTeacher(pendingTeacher);
    localStorage.setItem("zh_current_teacher_session", JSON.stringify(pendingTeacher));
    setIsPasswordSetupMode(false);
    setNewPasswordInput("");
    setLoginId("");
    setLoginPw("");
  };

  const handleLogout = () => {
    setCurrentTeacher(null);
    localStorage.removeItem("zh_current_teacher_session");
  };

  // --- 💻 [민석준 마스터 권한 전용 핵심 제어 메커니즘 펑션군] ---
  
  // 1. [계정 생성 권한] 신규 교사 백본 인프라에 추가
  const handleMasterCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTeacherName.trim()) return;
    const name = createTeacherName.trim();
    
    if (teachers.some(t => t.name === name) || name === "민석준") {
      alert("중복 오류: 전산망에 동일한 성명의 교직원이 이미 등록되어 있습니다.");
      return;
    }

    const newTeacher = {
      name,
      type: createTeacherType,
      targetClass: createTeacherType === "원반담임" ? createTargetClass : "all"
    };

    const updatedList = [...teachers, newTeacher];
    const updatedPws = { ...passwords, [name]: "1111" }; // 초기 비밀번호 자동 인가

    setTeachers(updatedList);
    setPasswords(updatedPws);
    localStorage.setItem("zh_teachers_registry", JSON.stringify(updatedList));
    localStorage.setItem("zh_secured_pws", JSON.stringify(updatedPws));

    writeLog(`[민석준 마스터 조치] 신규 교직원 [${name}] 계정 전산망 발급 성공 (초기비밀번호: 1111)`, "SECURE");
    setCreateTeacherName("");
  };

  // 2. [계정 삭제 권한] 인사 전산망 영구 제명
  const handleMasterDeleteAccount = (name: string) => {
    if (name === "고장선") {
      alert("통제 거부: 고장선 특수 마스터 교사는 시스템 보호 정책에 따라 임의 파기가 불가능합니다.");
      return;
    }
    if (!confirm(`[경고] 정말로 ${name} 교사의 계정 및 보안 패스워드 노드를 파기하시겠습니까?`)) return;

    const updatedList = teachers.filter(t => t.name !== name);
    const updatedPws = { ...passwords };
    delete updatedPws[name];

    setTeachers(updatedList);
    setPasswords(updatedPws);
    localStorage.setItem("zh_teachers_registry", JSON.stringify(updatedList));
    localStorage.setItem("zh_secured_pws", JSON.stringify(updatedPws));

    writeLog(`[민석준 마스터 조치] [${name}] 교사 전산망에서 영구 제명 및 세션 메모리 파기`, "SECURE");
  };

  // 3. [등급 관리 및 권한 부여] 실시간 권한 동적 스위칭 트랜잭션
  const handleMasterChangeRole = (name: string, newType: string, newClass: string) => {
    const updatedList = teachers.map(t => {
      if (t.name === name) {
        return { ...t, type: newType, targetClass: newType === "원반담임" ? newClass : "all" };
      }
      return t;
    });
    setTeachers(updatedList);
    localStorage.setItem("zh_teachers_registry", JSON.stringify(updatedList));
    writeLog(`[민석준 마스터 조치] ${name} 교사 권한 등급 -> [${newType} (${newType === "원반담임" ? newClass : "all"})] 강제 재배정 완료`, "SECURE");
  };

  // 4. [ID/PW 관리 및 마스터 직접 수정] 비밀번호 즉시 변경
  const handleMasterChangePassword = (name: string, targetPw: string) => {
    if (!targetPw.trim()) return;
    const updatedPws = { ...passwords, [name]: targetPw.trim() };
    setPasswords(updatedPws);
    localStorage.setItem("zh_secured_pws", JSON.stringify(updatedPws));
    writeLog(`[민석준 마스터 조치] ${name} 교사의 인증 비밀번호를 [${targetPw.trim()}]으로 강제 변조 마스터 승인`, "SECURE");
  };

  // 5. [게시판 추가 및 삭제] 공지사항 인프라 강제 오버라이딩 원천 삭제
  const handleMasterDeleteNotice = (id: number, title: string) => {
    if (!confirm(`[포럼 인프라 통제] 해당 공지 글을 데이터베이스에서 원천 삭제하시겠습니까?\n글 제목: ${title}`)) return;
    const updatedNotices = notices.filter(n => n.id !== id);
    setNotices(updatedNotices);
    localStorage.setItem("zh_advanced_notices", JSON.stringify(updatedNotices));
    writeLog(`[민석준 마스터 조치] 공지사항 포럼 내 안건 고유 ID [${id}] 데이터 강제 파쇄 완료`, "SECURE");
  };

  // 권한 스코프별 데이터 매핑 연산 레이어
  const authorizedStudentsRaw = useMemo(() => {
    if (!currentTeacher) return [];
    if (currentTeacher.targetClass === "all") return INITIAL_STUDENTS_DB;
    return INITIAL_STUDENTS_DB.filter(s => s.classCode === currentTeacher.targetClass);
  }, [currentTeacher]);

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
    writeLog(`[패킷 피드] ${currentTeacher.name} 교사 -> 학생 고유 노드 [${studentId}] 연계 지침 하향`, "COMM");
    setNewFeedText("");
  };

  // --- 🔒 [게이트 UI 인터페이스] ---
  if (!currentTeacher) {
    return (
      <div className="min-h-screen bg-[#070913] flex items-center justify-center p-4 antialiased">
        {!isPasswordSetupMode ? (
          <div className="w-full max-w-md bg-[#0F1322]/90 backdrop-blur-3xl rounded-[32px] border border-slate-800/80 p-8 shadow-[0_30px_60px_rgba(0,0,0,0.6)]">
            <div className="flex flex-col items-center mb-6">
              <div className="mb-4 bg-slate-900/40 p-3 rounded-2xl border border-slate-800">
                <Image src="/build_logo.png" alt="진해고등학교 로고" width={60} height={60} priority className="object-contain" />
              </div>
              <span className="text-[10px] tracking-widest bg-blue-500/10 text-blue-400 font-mono px-3 py-1 rounded-md border border-blue-500/20 mb-2">
                HIGH SECURE INTRANET PROTOCOL V5
              </span>
              <h1 className="text-base font-bold text-white tracking-tight">진해고 특수학급 관제포털</h1>
              <p className="text-xs text-slate-500 mt-1">인가된 계정 명칭과 기밀 패스워드를 입력하십시오.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="교직원 성함 또는 개발자 ID 입력"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  className="w-full px-4 py-3.5 bg-[#080A12] border border-slate-800 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-blue-600 transition-all"
                />
              </div>
              <div>
                <input
                  type="password"
                  placeholder="비밀번호 기입"
                  value={loginPw}
                  onChange={(e) => setLoginPw(e.target.value)}
                  className="w-full px-4 py-3.5 bg-[#080A12] border border-slate-800 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-blue-600 transition-all"
                />
              </div>
              {loginError && <p className="text-xs font-semibold text-red-400 pl-1">✕ {loginError}</p>}
              
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm py-3.5 rounded-xl transition-all shadow-md">
                보안 서버 통합 인증
              </button>
            </form>
          </div>
        ) : (
          <div className="w-full max-w-md bg-[#16120B] border border-amber-900/60 rounded-[32px] p-8 shadow-2xl">
            <div className="text-center mb-6">
              <span className="text-[10px] font-mono bg-amber-500/10 text-amber-400 px-3 py-1 rounded border border-amber-500/20">SECURITY PROTOCOL VERIFICATION</span>
              <h2 className="text-base font-bold text-white mt-3">[{pendingTeacher?.name}] 교사 암호화 갱신 조치</h2>
              <p className="text-xs text-amber-200/60 mt-1">현재 일회용 기본 보안 코드 상태입니다.<br />앞으로 사용할 **독립 숫자 4자리**를 신규 할당해 주세요.</p>
            </div>
            <form onSubmit={handleRegisterNewPassword} className="space-y-4">
              <input
                type="password"
                maxLength={4}
                placeholder="지정용 숫자 4자리"
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value.replace(/[^0-9]/g, ""))}
                className="w-full px-4 py-3.5 bg-[#080A12] border border-amber-900/40 rounded-xl text-center text-lg font-mono font-bold tracking-widest text-amber-300 focus:outline-none focus:border-amber-500"
              />
              <button type="submit" className="w-full bg-amber-600 hover:bg-amber-500 text-black font-black text-xs py-3.5 rounded-xl transition-colors">
                보안 코드 할당 승인
              </button>
            </form>
          </div>
        )}
      </div>
    );
  }

  // --- 💻 1. [최고 개발자 민석준 전용 하이 테크니컬 마스터 커맨드 인프라] ---
  if (currentTeacher.type === "개발자") {
    return (
      <div className="min-h-screen bg-[#04060A] text-slate-300 font-mono p-6 flex flex-col gap-6">
        <header className="border-b border-slate-800 pb-4 flex justify-between items-center bg-[#0B0F19] p-4 rounded-2xl border border-slate-800/60 shadow-xl">
          <div className="flex items-center gap-4">
            <Image src="/build_logo.png" alt="Logo" width={40} height={40} className="object-contain" />
            <div>
              <h1 className="text-base font-black text-white tracking-wider flex items-center gap-2">
                <span>ZH-INTRANET BACKBONE FULL CONTROL CENTER</span>
                <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] px-2 py-0.5 rounded font-bold animate-pulse">ROOT PRIVILEGE</span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">최고 시스템 아키텍트 : <span className="text-emerald-400 font-bold">민석준 (MSJ-2026)</span></p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400 font-bold font-mono bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">{currentTime}</span>
            <Link href="/teacher/notice" className="bg-purple-900/50 hover:bg-purple-900 text-purple-300 border border-purple-800 px-4 py-1.5 rounded-xl text-xs font-bold transition-all">
              📢 공지사항 전사 포럼 강제 진입
            </Link>
            <button onClick={handleLogout} className="bg-red-950/60 border border-red-900 text-red-400 font-bold px-4 py-1.5 rounded-xl text-xs hover:bg-red-900 transition-all">
              커널 보안 로그아웃
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1">
          {/* 좌측: 전산망 교직원 계정 생성 및 전반 제어 마스터 랙 */}
          <div className="xl:col-span-2 flex flex-col gap-6">
            {/* 계정 생성 모듈 */}
            <div className="bg-[#0B101D] border border-slate-800/80 rounded-2xl p-5 shadow-lg">
              <h2 className="text-xs font-black text-white mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                ➕ 신규 교직원 데이터 권한 계정 강제 생성 (USER PROVISIONING)
              </h2>
              <form onSubmit={handleMasterCreateAccount} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1 font-bold">교직원 성명</label>
                  <input type="text" required placeholder="예: 박민석" value={createTeacherName} onChange={(e) => setCreateTeacherName(e.target.value)} className="w-full px-3 py-2 bg-[#060913] border border-slate-800 rounded-xl text-xs text-white font-bold focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1 font-bold">교사 등급(권한)</label>
                  <select value={createTeacherType} onChange={(e) => setCreateTeacherType(e.target.value)} className="w-full px-3 py-2 bg-[#060913] border border-slate-800 rounded-xl text-xs text-white font-bold">
                    <option value="원반담임">원반담임 (일반통합)</option>
                    <option value="특수담임">특수담임 (도움반마스터)</option>
                    <option value="학년부장">학년부장 (통합관람)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1 font-bold">배정 학급 (원반 해당)</label>
                  <select value={createTargetClass} onChange={(e) => setCreateTargetClass(e.target.value)} disabled={createTeacherType !== "원반담임"} className="w-full px-3 py-2 bg-[#060913] border border-slate-800 rounded-xl text-xs text-white font-bold disabled:opacity-30">
                    <option value="2-1">2학년 1반</option>
                    <option value="2-3">2학년 3반</option>
                    <option value="2-4">2학년 4반</option>
                    <option value="2-6">2학년 6반</option>
                    <option value="2-8">2학년 8반</option>
                    <option value="2-10">2학년 10반</option>
                  </select>
                </div>
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-black font-black text-xs py-2.5 rounded-xl transition-all">
                  전산망 원격 원장 주입
                </button>
              </form>
            </div>

            {/* 교직원 데이터 매트릭스 (수정/삭제/권한 스위칭 일체화) */}
            <div className="bg-[#0B101D] border border-slate-800/80 rounded-2xl p-5 shadow-lg flex-1">
              <h2 className="text-xs font-black text-white mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                🔒 교직원 등급 관리 및 ID/PW 실시간 변조 인프라 (CREDENTIALS ENGINE)
              </h2>
              <div className="overflow-x-auto border border-slate-800 rounded-xl bg-[#060A13]">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#111728] border-b border-slate-800 text-[10px] text-slate-400 font-bold">
                    <tr>
                      <th className="p-3">식별성명</th>
                      <th className="p-3">인가 권한 등급 변환</th>
                      <th className="p-3">배정 클래스 스코프</th>
                      <th className="p-3">실시간 패스워드 직접 변조</th>
                      <th className="p-3 text-center">원천 제명</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs text-slate-300 divide-y divide-slate-800/40">
                    {teachers.map((t) => (
                      <tr key={t.name} className="hover:bg-slate-900/40 transition-colors">
                        <td className="p-3 font-bold text-white flex items-center gap-1">
                          👤 {t.name}
                        </td>
                        <td className="p-3">
                          <select value={t.type} onChange={(e) => handleMasterChangeRole(t.name, e.target.value, t.targetClass)} className="bg-[#0A0E1A] border border-slate-800 rounded px-2 py-1 text-[11px] font-bold text-slate-300">
                            <option value="원반담임">원반담임</option>
                            <option value="특수담임">특수담임</option>
                            <option value="학년부장">학년부장</option>
                          </select>
                        </td>
                        <td className="p-3">
                          <select value={t.targetClass} disabled={t.type !== "원반담임"} onChange={(e) => handleMasterChangeRole(t.name, t.type, e.target.value)} className="bg-[#0A0E1A] border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-400 disabled:opacity-20">
                            <option value="all">all (전체개방)</option>
                            <option value="2-1">2-1반 고정</option>
                            <option value="2-3">2-3반 고정</option>
                            <option value="2-4">2-4반 고정</option>
                            <option value="2-6">2-6반 고정</option>
                            <option value="2-8">2-8반 고정</option>
                            <option value="2-10">2-10반 고정</option>
                          </select>
                        </td>
                        <td className="p-3">
                          <input type="text" placeholder={passwords[t.name] || "1111"} onChange={(e) => handleMasterChangePassword(t.name, e.target.value)} className="bg-[#05070D] border border-slate-800 rounded px-3 py-1 text-xs text-emerald-400 font-mono w-28 focus:border-emerald-500" />
                        </td>
                        <td className="p-3 text-center">
                          <button onClick={() => handleMasterDeleteAccount(t.name)} className="text-red-500 hover:bg-red-950/40 px-2 py-1 rounded text-[11px] font-bold border border-transparent hover:border-red-900 transition-all">
                            파기
                          </button>
                        </td>
                      </tr>
                    ))}
                    {/* 민석준 본인 계정 데이터 아웃라인 표시 */}
                    <tr className="bg-purple-950/10">
                      <td className="p-3 font-bold text-purple-400">👑 민석준 (본인)</td>
                      <td className="p-3 text-slate-500 text-[11px]">최고 개발자 (SYSTEM)</td>
                      <td className="p-3 text-slate-500 text-[11px]">all (전체 제어)</td>
                      <td className="p-3 text-purple-300 font-mono text-[11px] pl-3">msj2026!!@ (암호화가드)</td>
                      <td className="p-3 text-center text-slate-600 text-[10px]">파기불가</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 우측: 실시간 백본 로그 스트림 및 게시판 데이터 원천 조율 파쇄 랙 */}
          <div className="flex flex-col gap-6">
            {/* 게시판 인프라 파쇄 통제 모듈 */}
            <div className="bg-[#0B101D] border border-slate-800/80 rounded-2xl p-5 shadow-lg flex flex-col h-[260px]">
              <h2 className="text-xs font-black text-white mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                💥 공지 협의 포럼 안건 원천 파쇄 통제 (BULLETIN TRASH)
              </h2>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-[11px]">
                {notices.length === 0 ? (
                  <p className="text-slate-600 font-bold text-center py-12">포럼 서버에 데이터가 분출되지 않았습니다.</p>
                ) : (
                  notices.map(n => (
                    <div key={n.id} className="bg-[#060913] p-2 rounded-xl border border-slate-800/80 flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <p className="text-slate-400 font-bold truncate">{n.title}</p>
                        <p className="text-[10px] text-slate-600 mt-0.5">발행자: {n.author} 교사 | 타깃: [{n.visibleTo.join(", ")}]</p>
                      </div>
                      <button onClick={() => handleMasterDeleteNotice(n.id, n.title)} className="bg-red-950/40 border border-red-900/60 text-red-400 text-[10px] px-1.5 py-0.5 rounded hover:bg-red-900 transition-colors">
                        파쇄
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 실시간 백본 로그 스트림 */}
            <div className="bg-[#0B101D] border border-slate-800/80 rounded-2xl p-5 shadow-lg flex-1 flex flex-col h-[300px]">
              <h2 className="text-xs font-black text-white mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                🖥️ 실시간 인트라넷 전산 백본 코어 로그 스트림
              </h2>
              <div className="flex-1 bg-[#04060B] p-4 rounded-xl font-mono text-[10px] leading-relaxed overflow-y-auto space-y-1.5 text-slate-400 border border-slate-900">
                {systemLogs.map((log) => (
                  <div key={log.id} className="hover:bg-slate-900/40 py-0.5 rounded px-1 transition-colors">
                    <span className="text-slate-600 mr-2">[{log.time}]</span>
                    <span className={`font-bold mr-1 ${log.level === "SECURE" ? "text-blue-400" : log.level === "WARN" ? "text-red-400" : "text-emerald-500"}`}>[{log.level}]</span>
                    <span>{log.msg}</span>
                  </div>
                ))}
              </div>
            </div>
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
            <Image src="/build_logo.png" alt="진해고등학교" width={34} height={34} className="object-contain" />
            <h1 className="text-sm font-black text-white tracking-tight">진해고등학교 특수학급 통합행정관제시스템</h1>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="text-blue-400 font-mono bg-blue-950/50 px-3 py-1 rounded border border-blue-900/40">{currentTime}</span>
            <Link href="/teacher/notice" className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-xl transition-all">
              📢 공지 및 업무협의 포럼 이동
            </Link>
            <span className="bg-slate-800/60 border border-slate-700/50 px-3 py-1 rounded-xl text-slate-300">🌟 특수교사: <span className="text-white font-extrabold">{currentTeacher.name}</span></span>
            <button onClick={handleLogout} className="text-slate-500 hover:text-red-400 transition-colors">시스템 로그아웃</button>
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
              <h2 className="text-sm font-bold text-white mb-4">🕹️ 실시간 특수학급 대상자 다차원 트래킹 매트릭스</h2>
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
          </div>

          <section className="bg-[#1A140E] border border-amber-950 rounded-[24px] p-6 flex flex-col min-h-[400px]">
            <h2 className="text-sm font-bold text-amber-300 mb-2 flex items-center gap-2"><span>✍--- 교사 일간 정밀 인계록</span></h2>
            <textarea value={sharedMemo} onChange={(e) => setSharedMemo(e.target.value)} className="flex-1 w-full bg-[#0A0806] border border-amber-950/60 rounded-2xl p-4 text-xs text-amber-100 font-medium resize-none focus:outline-none" />
          </section>
        </main>
      </div>
    );
  }

  // --- 📋 3. [일반 통합 원반담임 및 학년부장 전용 뷰] ---
  return (
    <div className="min-h-screen bg-[#0A0C14] text-slate-300 flex flex-col font-sans antialiased">
      <header className="w-full bg-[#111422] border-b border-slate-800/80 px-8 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Image src="/build_logo.png" alt="진해고등학교" width={32} height={32} className="object-contain" />
          <h1 className="text-sm font-bold text-white">
            {currentTeacher.type === "원반담임" ? `진해고등학교 [${currentTeacher.targetClass} 학급 지원 포털]` : "진해고등학교 [학년부장 통합 관제 포털]"}
          </h1>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <Link href="/teacher/notice" className="bg-[#1D2235] hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-xl text-slate-300 transition-all">
            📢 업무 협의·공지사항 포럼
          </Link>
          <span className="bg-slate-900 border border-slate-800 px-3 py-1 rounded text-slate-400">{currentTeacher.name} 선생님 접속중</span>
          <button onClick={handleLogout} className="text-slate-500 hover:text-red-400">안전 로그아웃</button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 space-y-6">
        <div className="bg-[#111422] border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-white">📋 실시간 배정 특수학급 대상자 현황</h2>
            <p className="text-xs text-slate-500 mt-0.5">학생 행을 클릭하면 도움반 교직원 간의 **[1:1 소통 협조 소통 다이어리]** 피드가 기동됩니다.</p>
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
      </main>

      {/* 🔮 [상호 소통 대화창 모달 컴포넌트] */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111422] border border-slate-800 w-full max-w-xl rounded-3xl p-6 shadow-2xl relative flex flex-col max-h-[85vh]">
            <button onClick={() => setSelectedStudent(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white">✕</button>
            <div className="mb-3">
              <span className="text-[10px] uppercase font-mono bg-blue-900/40 text-blue-400 px-2.5 py-0.5 rounded border border-blue-900/30">{selectedStudent.classCode}반 관제</span>
              <h3 className="text-base font-bold text-white mt-1">{selectedStudent.name} 학생 연계 소통 피드</h3>
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
                placeholder={currentTeacher.type === "학년부장" ? "학년부장교사는 조회 전용 모드로 제한됩니다." : "도움반/담임 교사에게 실시간 전달할 지침 기입..."} 
                disabled={currentTeacher.type === "학년부장"}
                value={newFeedText}
                onChange={(e) => setNewFeedText(e.target.value)}
                onKeyDown={(e) => { if(e.key === 'Enter') handleAddFeed(selectedStudent.id); }}
                className="flex-1 px-4 py-2.5 bg-[#0B0D16] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 disabled:opacity-40" 
              />
              <button onClick={() => handleAddFeed(selectedStudent.id)} disabled={currentTeacher.type === "학년부장"} className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl disabled:bg-slate-800">
                전달
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}