"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

// --- 🌐 데이터 인터페이스 규격 ---
interface Student {
  id: string;
  classCode: string;
  name: string;
  location: string;
  status: string;
  subject?: string;
}

interface NoticeItem {
  target: string;
  teacher: string;
  content: string;
  date?: string;
}

// --- 🚀 Fallback Default Data (API 연결 지연 대비용) ---
const DEFAULT_STUDENTS: Student[] = [
  { id: "20110", classCode: "2-1", name: "김한얼", location: "학습도움실", status: "정상", subject: "국어 (특수)" },
  { id: "20121", classCode: "2-1", name: "이정준", location: "컴퓨터실", status: "정상", subject: "진로와 직업" },
  { id: "20306", classCode: "2-3", name: "김현중", location: "2학년 3반", status: "집중요망", subject: "수학 (통합)" },
  { id: "20311", classCode: "2-3", name: "박진현", location: "2학년 3반", status: "정상", subject: "영어1 (통합)" },
  { id: "20402", classCode: "2-4", name: "강민준", location: "학습도움실", status: "정상", subject: "국어 (특수)" },
  { id: "20406", classCode: "2-4", name: "김세현", location: "체육관", status: "특이행동", subject: "체육 (통합)" },
  { id: "20418", classCode: "2-4", name: "손민찬", location: "음악실", status: "조퇴", subject: "음악 (통합)" },
  { id: "20612", classCode: "2-6", name: "손찬민", location: "컴퓨터실", status: "정상", subject: "진로와 직업" },
  { id: "20616", classCode: "2-6", name: "오승철", location: "미술실", status: "돌봄필수", subject: "미술 (통합)" },
  { id: "20813", classCode: "2-8", name: "박찬석", location: "2학년 8반", status: "정상", subject: "수학 (통합)" },
  { id: "20906", classCode: "2-9", name: "김재원", location: "학습도움실", status: "결석", subject: "국어 (특수)" },
  { id: "21026", classCode: "2-10", name: "조연우", location: "2학년 10반", status: "정상", subject: "영어1 (통합)" },
  { id: "21027", classCode: "2-10", name: "최재범", location: "체육관", status: "정상", subject: "체육 (통합)" }
];

export default function TeacherDashboardPage() {
  const router = useRouter();

  // --- 🏢 핵심 인프라 스페이스 (인사 및 계정) ---
  const [teachers, setTeachers] = useState<Array<any>>([]);
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [systemLogs, setSystemLogs] = useState<Array<any>>([]);
  const [currentTeacher, setCurrentTeacher] = useState<any | null>(null);

  // 로그인 및 암호화 컨트롤러
  const [loginId, setLoginId] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isPasswordSetupMode, setIsPasswordSetupMode] = useState(false);
  const [pendingTeacher, setPendingTeacher] = useState<any>(null);
  const [newPasswordInput, setNewPasswordInput] = useState("");

  // 민석준(개발자) 전용 계정 프로비저닝 상태
  const [createTeacherName, setCreateTeacherName] = useState("");
  const [createTeacherType, setCreateTeacherType] = useState("원반담임");
  const [createTargetClass, setCreateTargetClass] = useState("2-1");

  // --- 📊 구글 시트 연동 데이터 스페이스 ---
  const [isLoading, setIsLoading] = useState(true);
  const [sheetStudents, setSheetStudents] = useState<Student[]>([]);
  const [sheetTimelines, setSheetTimelines] = useState<Record<string, string[][]>>({});
  const [sheetNotices, setSheetNotices] = useState<Record<string, NoticeItem[]>>({});

  // 일과 관제 제어 장치
  const [statusFilter, setStatusFilter] = useState<string>("전체");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentFeeds, setStudentFeeds] = useState<Record<string, any>>({});
  const [newFeedText, setNewFeedText] = useState("");
  const [sharedMemo, setSharedMemo] = useState("- 이동 수업 시 소음 완화용 전용 헤드셋 지참 동행 요망.\n- 학습도움실 전산기기 정기 점검 예정.");

  // 시간 및 교시 상태 엔진
  const [currentTimeStr, setCurrentTimeStr] = useState("");
  const [currentPeriod, setCurrentPeriod] = useState("등교 전");
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [progress, setProgress] = useState(0);

  // --- 🔄 1. 구글 시트 API 동기화 (Data Fetching) ---
  useEffect(() => {
    const fetchSheetData = async () => {
      try {
        const response = await fetch("/api/sheets-data");
        if (!response.ok) throw new Error("API 통신 에러");
        const data = await response.json();
        setSheetStudents(data.students || DEFAULT_STUDENTS);
        setSheetTimelines(data.timelines || {});
        setSheetNotices(data.notices || {});
      } catch (error) {
        console.warn("구글 시트 연동 실패. 로컬 안전 데이터를 로드합니다.", error);
        setSheetStudents(DEFAULT_STUDENTS);
        setSheetTimelines({}); // API 실패 시 빈 시간표
        setSheetNotices({});   // API 실패 시 빈 알림장
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSheetData();
    // 1분마다 백그라운드 데이터 리프레시
    const interval = setInterval(fetchSheetData, 60000);
    return () => clearInterval(interval);
  }, []);

  // --- 🕒 2. 실시간 시간 및 일과 교시 정밀 추적 연산 (선생님 로직 100% 이식) ---
  useEffect(() => {
    const updateTimeAndPeriod = () => {
      const now = new Date();
      setCurrentTimeStr(now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }));
      
      const dayOfWeek = now.getDay(); // 0: 일요일, 6: 토요일
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const totalMinutes = hours * 60 + minutes;

      // 주말 예외 처리
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        setProgress(0);
        setCurrentPeriod("주말");
        setTimeLeft("");
        return;
      }

      // 평일 진행률 (08:40 ~ 16:30)
      const startDay = 520;
      const endDay = 990;
      if (totalMinutes < startDay) setProgress(0);
      else if (totalMinutes > endDay) setProgress(100);
      else setProgress(Math.round(((totalMinutes - startDay) / (endDay - startDay)) * 100));

      // 교시 정밀 추적
      let detectedPeriod = "등교 전";
      let periodEndMinutes = 0;

      if (totalMinutes >= 510 && totalMinutes < 520) { detectedPeriod = "담임조례"; periodEndMinutes = 520; }
      else if (totalMinutes >= 520 && totalMinutes < 570) { detectedPeriod = "1교시"; periodEndMinutes = 570; }
      else if (totalMinutes >= 570 && totalMinutes < 580) { detectedPeriod = "쉬는시간"; periodEndMinutes = 580; }
      else if (totalMinutes >= 580 && totalMinutes < 630) { detectedPeriod = "2교시"; periodEndMinutes = 630; }
      else if (totalMinutes >= 630 && totalMinutes < 640) { detectedPeriod = "쉬는시간"; periodEndMinutes = 640; }
      else if (totalMinutes >= 640 && totalMinutes < 690) { detectedPeriod = "3교시"; periodEndMinutes = 690; }
      else if (totalMinutes >= 690 && totalMinutes < 700) { detectedPeriod = "쉬는시간"; periodEndMinutes = 700; }
      else if (totalMinutes >= 700 && totalMinutes < 750) { detectedPeriod = "4교시"; periodEndMinutes = 750; }
      else if (totalMinutes >= 750 && totalMinutes < 815) { detectedPeriod = "점심시간"; periodEndMinutes = 815; }
      else if (totalMinutes >= 815 && totalMinutes < 865) { detectedPeriod = "5교시"; periodEndMinutes = 865; }
      else if (totalMinutes >= 865 && totalMinutes < 875) { detectedPeriod = "쉬는시간"; periodEndMinutes = 875; }
      else if (totalMinutes >= 875 && totalMinutes < 925) { detectedPeriod = "6교시"; periodEndMinutes = 925; }
      else if (totalMinutes >= 925 && totalMinutes < 940) { detectedPeriod = "쉬는시간"; periodEndMinutes = 940; }
      else if (totalMinutes >= 940 && totalMinutes < 990) { detectedPeriod = "7교시"; periodEndMinutes = 990; }
      else if (totalMinutes >= 990) { detectedPeriod = "하교"; }

      setCurrentPeriod(detectedPeriod);

      if (periodEndMinutes > 0) {
        const remainingMin = periodEndMinutes - totalMinutes;
        setTimeLeft(remainingMin > 0 ? `종료까지 ${remainingMin}분` : "");
      } else {
        setTimeLeft("");
      }
    };

    updateTimeAndPeriod();
    const interval = setInterval(updateTimeAndPeriod, 1000);
    return () => clearInterval(interval);
  }, []);

  // --- 💾 3. 인사정보 시스템 및 로컬 캐시 레지스트리 싱크 ---
  useEffect(() => {
    const savedTeachers = localStorage.getItem("zh_teachers_registry");
    let currentList = [];
    if (savedTeachers) {
      currentList = JSON.parse(savedTeachers);
      setTeachers(currentList);
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
      currentList = defaultTeachers;
      setTeachers(defaultTeachers);
      localStorage.setItem("zh_teachers_registry", JSON.stringify(defaultTeachers));
    }

    const savedPws = localStorage.getItem("zh_secured_pws");
    if (savedPws) {
      setPasswords(JSON.parse(savedPws));
    } else {
      const initialMap: Record<string, string> = {};
      currentList.forEach((t: any) => { initialMap[t.name] = "1111"; });
      // 🔒 최고 개발자 고정 키 탑재
      initialMap["민석준"] = "msj2026!!@";
      setPasswords(initialMap);
      localStorage.setItem("zh_secured_pws", JSON.stringify(initialMap));
    }

    const savedLogs = localStorage.getItem("zh_secured_logs");
    if (savedLogs) setSystemLogs(JSON.parse(savedLogs));

    const savedSession = localStorage.getItem("zh_current_teacher_session");
    if (savedSession) setCurrentTeacher(JSON.parse(savedSession));
  }, []);

  const writeLog = (msg: string, level: string = "INFO") => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString("ko-KR", { hour12: false });
    const newLog = { id: Date.now(), time: timeStr, msg, level };
    setSystemLogs(prev => {
      const updated = [newLog, ...prev];
      localStorage.setItem("zh_secured_logs", JSON.stringify(updated));
      return updated;
    });
  };

  // --- 🔑 4. 통합 로그인 및 암호 강제변경 로직 ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const idInput = loginId.trim();
    const pwInput = loginPw.trim();

    // 💻 최고 개발자 예외 처리
    if (idInput === "민석준") {
      const masterPassword = passwords["민석준"] || "msj2026!!@";
      if (pwInput === masterPassword) {
        const devSession = { name: "민석준", type: "개발자", targetClass: "all" };
        setCurrentTeacher(devSession);
        localStorage.setItem("zh_current_teacher_session", JSON.stringify(devSession));
        writeLog("최고 엔지니어 민석준 마스터 권한 포털 인가 완료", "SECURE");
        setLoginError("");
      } else {
        setLoginError("마스터 보안 인증 코드가 올바르지 않습니다.");
      }
      return;
    }

    // 일반 교사 처리
    const foundTeacher = teachers.find(t => t.name === idInput);
    if (!foundTeacher) {
      setLoginError("인사 정보 시스템에 등록되지 않은 성함입니다.");
      return;
    }

    const storedPassword = passwords[idInput] || "1111";
    if (pwInput === storedPassword) {
      if (pwInput === "1111") {
        setPendingTeacher(foundTeacher);
        setIsPasswordSetupMode(true);
      } else {
        setCurrentTeacher(foundTeacher);
        localStorage.setItem("zh_current_teacher_session", JSON.stringify(foundTeacher));
        writeLog(`${foundTeacher.name} 교사 포털 접속 승인`, "AUTH");
      }
    } else {
      setLoginError("비밀번호 인증에 실패하였습니다.");
    }
  };

  const handleRegisterNewPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(newPasswordInput)) {
      alert("보안 정책에 따라 비밀번호는 숫자 4자리로 구성되어야 합니다.");
      return;
    }
    const updatedPws = { ...passwords, [pendingTeacher.name]: newPasswordInput };
    setPasswords(updatedPws);
    localStorage.setItem("zh_secured_pws", JSON.stringify(updatedPws));
    setCurrentTeacher(pendingTeacher);
    localStorage.setItem("zh_current_teacher_session", JSON.stringify(pendingTeacher));
    setIsPasswordSetupMode(false);
  };

  const handleLogout = () => {
    setCurrentTeacher(null);
    localStorage.removeItem("zh_current_teacher_session");
  };

  // --- ⚙️ 5. 최고 개발자 마스터 권한 제어 모듈 ---
  const handleMasterCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTeacherName.trim()) return;
    const name = createTeacherName.trim();
    if (teachers.some(t => t.name === name)) {
      alert("이미 데이터베이스에 인가된 교직원입니다.");
      return;
    }
    const newTeacher = { name, type: createTeacherType, targetClass: createTeacherType === "원반담임" ? createTargetClass : "all" };
    const updatedList = [...teachers, newTeacher];
    const updatedPws = { ...passwords, [name]: "1111" };

    setTeachers(updatedList);
    setPasswords(updatedPws);
    localStorage.setItem("zh_teachers_registry", JSON.stringify(updatedList));
    localStorage.setItem("zh_secured_pws", JSON.stringify(updatedPws));
    writeLog(`[민석준 마스터] 신규 임용 계정 생성: ${name} (${createTeacherType})`, "SECURE");
    setCreateTeacherName("");
  };

  const handleMasterDeleteAccount = (name: string) => {
    if (!confirm(`${name} 교사를 시스템에서 영구 제명하시겠습니까?`)) return;
    const updatedList = teachers.filter(t => t.name !== name);
    const updatedPws = { ...passwords };
    delete updatedPws[name];
    setTeachers(updatedList);
    setPasswords(updatedPws);
    localStorage.setItem("zh_teachers_registry", JSON.stringify(updatedList));
    localStorage.setItem("zh_secured_pws", JSON.stringify(updatedPws));
    writeLog(`[민석준 마스터] 계정 권한 파기: ${name}`, "SECURE");
  };

  const handleMasterChangeRole = (name: string, newType: string, newClass: string) => {
    const updatedList = teachers.map(t => t.name === name ? { ...t, type: newType, targetClass: newType === "원반담임" ? newClass : "all" } : t);
    setTeachers(updatedList);
    localStorage.setItem("zh_teachers_registry", JSON.stringify(updatedList));
    writeLog(`[민석준 마스터] ${name} 교사 권한 변경 -> ${newType}`, "SECURE");
  };

  const handleMasterChangePassword = (name: string, targetPw: string) => {
    if (!targetPw.trim()) return;
    const updatedPws = { ...passwords, [name]: targetPw.trim() };
    setPasswords(updatedPws);
    localStorage.setItem("zh_secured_pws", JSON.stringify(updatedPws));
    writeLog(`[민석준 마스터] ${name} 교사 패스워드 강제 변조`, "SECURE");
  };

  // --- 📝 6. 실시간 상호 공유 소통 피드 작성 (권한 원천 개방) ---
  const handleAddFeed = (studentId: string) => {
    if (!newFeedText.trim() || !currentTeacher) return;
    const newMsg = {
      sender: currentTeacher.name,
      role: currentTeacher.type === "개발자" ? "시스템총괄" : currentTeacher.type,
      text: newFeedText.trim(),
      time: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false })
    };
    setStudentFeeds(prev => ({ ...prev, [studentId]: [...(prev[studentId] || []), newMsg] }));
    setNewFeedText("");
  };

  // 교사 권한별 학생 필터링
  const authorizedStudents = useMemo(() => {
    if (!currentTeacher) return [];
    if (currentTeacher.targetClass === "all") return sheetStudents;
    return sheetStudents.filter(s => s.classCode === currentTeacher.targetClass);
  }, [currentTeacher, sheetStudents]);

  const filteredStudents = useMemo(() => {
    if (statusFilter === "도움반") return authorizedStudents.filter(s => s.location === "학습도움실" || s.location === "도움반");
    if (statusFilter === "통합학급") return authorizedStudents.filter(s => s.location !== "학습도움실" && s.location !== "도움반");
    return authorizedStudents;
  }, [statusFilter, authorizedStudents]);

  // --- 🚪 7. [뷰 렌더링 1] 업무포털 보안 게이트웨이 화면 ---
  if (!currentTeacher) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-[#EBF2FA] to-[#F5F8FC] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-[#D3E0EA] p-8 shadow-xl">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="mb-3 bg-[#F0F4F8] p-3 rounded-full border border-[#D9E2EC]">
              <Image src="/build_logo.png" alt="진해고" width={55} height={55} className="object-contain" />
            </div>
            <h1 className="text-xl font-extrabold text-[#1F2937] tracking-tight">교육행정 인트라넷 지원시스템</h1>
            <p className="text-xs text-[#6B7280] mt-1 font-medium">진해고등학교 교육정보시스템 업무포털</p>
          </div>

          {!isPasswordSetupMode ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#4B5563] mb-1 pl-1">사용자 성명 / ID</label>
                <input type="text" placeholder="성함 입력 (예: 민석준)" value={loginId} onChange={(e) => setLoginId(e.target.value)} className="w-full px-4 py-3 bg-[#F9FAFB] border border-[#D1D5DB] rounded-xl text-sm font-semibold text-black focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30 focus:border-[#3B82F6]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#4B5563] mb-1 pl-1">비밀번호 인증코드</label>
                <input type="password" placeholder="인증 패스워드 기입" value={loginPw} onChange={(e) => setLoginPw(e.target.value)} className="w-full px-4 py-3 bg-[#F9FAFB] border border-[#D1D5DB] rounded-xl text-sm font-semibold text-black focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30 focus:border-[#3B82F6]" />
              </div>
              {loginError && <p className="text-xs text-red-500 font-bold pl-1">⚠️ {loginError}</p>}
              <button type="submit" className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-sm py-3.5 rounded-xl transition-all shadow-sm">
                보안 인증서 로그인 및 진입
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterNewPassword} className="space-y-4">
              <div className="bg-[#EFF6FF] p-4 rounded-xl border border-[#BFDBFE] text-center mb-2">
                <p className="text-xs font-bold text-[#1E40AF]">최초 로그인 보안 인증 코드 세팅</p>
                <p className="text-[11px] text-[#2563EB] mt-1">로그인에 사용할 단독 **숫자 4자리**를 입력하세요.</p>
              </div>
              <input type="password" maxLength={4} placeholder="숫자 4자리 기입" value={newPasswordInput} onChange={(e) => setNewPasswordInput(e.target.value.replace(/[^0-9]/g, ""))} className="w-full px-4 py-3 bg-white border-2 border-[#3B82F6] rounded-xl text-center text-lg font-mono tracking-widest font-extrabold focus:outline-none" />
              <button type="submit" className="w-full bg-[#10B981] hover:bg-[#059669] text-white font-bold text-sm py-3 rounded-xl transition-colors">
                단독 패스워드 설정 완료
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // --- 👑 8. [뷰 렌더링 2] 최고 개발자 (민석준) 시스템 마스터 인프라 백본 ---
  if (currentTeacher.type === "개발자") {
    return (
      <div className="min-h-screen bg-[#F4F7FC] text-[#333333] font-sans flex flex-col">
        <header className="bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white px-6 py-4 flex justify-between items-center shadow-md">
          <div className="flex items-center gap-3">
            <Image src="/build_logo.png" alt="Logo" width={38} height={38} className="brightness-125 object-contain" />
            <div>
              <h1 className="text-base font-extrabold tracking-tight flex items-center gap-2">
                <span>진해고 교육행정 통합포털 (NEIS 백본 제어국)</span>
                <span className="bg-[#EF4444] text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">ROOT</span>
              </h1>
              <p className="text-xs text-blue-200">중앙 데이터 허브실 | 관리총괄: <span className="font-bold underline text-white">민석준</span></p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="bg-blue-900/50 text-blue-100 border border-blue-700 font-mono text-xs px-3 py-1 rounded-lg">{currentTimeStr}</span>
            <button onClick={handleLogout} className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all">
              🚪 마스터 로그아웃
            </button>
          </div>
        </header>

        <main className="p-6 max-w-7xl w-full mx-auto grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1">
          <div className="xl:col-span-2 space-y-6">
            <div className="bg-white border border-[#DCE4EC] rounded-2xl p-5 shadow-sm">
              <h2 className="text-sm font-black text-[#1E3A8A] border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                👥 신규 교직원 데이터 인가 기동 (User Setup)
              </h2>
              <form onSubmit={handleMasterCreateAccount} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">교직원 성함</label>
                  <input type="text" required value={createTeacherName} onChange={(e) => setCreateTeacherName(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">인사 업무 권한</label>
                  <select value={createTeacherType} onChange={(e) => setCreateTeacherType(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold">
                    <option value="원반담임">원반담임 (일반)</option>
                    <option value="특수담임">특수담임 (도움반)</option>
                    <option value="학년부장">학년부장 (전체)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">관할 담당 학급</label>
                  <select value={createTargetClass} disabled={createTeacherType !== "원반담임"} onChange={(e) => setCreateTargetClass(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold disabled:opacity-30">
                    <option value="2-1">2-1반</option>
                    <option value="2-3">2-3반</option>
                    <option value="2-4">2-4반</option>
                    <option value="2-6">2-6반</option>
                    <option value="2-8">2-8반</option>
                    <option value="2-10">2-10반</option>
                  </select>
                </div>
                <button type="submit" className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs py-2.5 rounded-xl transition-all">
                  원장 서버 강제 등록
                </button>
              </form>
            </div>

            <div className="bg-white border border-[#DCE4EC] rounded-2xl p-5 shadow-sm">
              <h2 className="text-sm font-black text-[#1E3A8A] border-b border-slate-100 pb-2 mb-3">
                🗂️ 실시간 교직원 데이터 마이그레이션 레지스트리
              </h2>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#F8FAFC] border-b border-slate-200 text-xs text-slate-500 font-bold">
                    <tr>
                      <th className="p-3">성명</th>
                      <th className="p-3">직무 권한 스위칭</th>
                      <th className="p-3">관제 학급 코드</th>
                      <th className="p-3">암호 변조</th>
                      <th className="p-3 text-center">계정 파기</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs text-slate-700 divide-y divide-slate-100">
                    {teachers.map((t) => (
                      <tr key={t.name} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-black">👤 {t.name}</td>
                        <td className="p-3">
                          <select value={t.type} onChange={(e) => handleMasterChangeRole(t.name, e.target.value, t.targetClass)} className="border border-slate-300 rounded px-2 py-1">
                            <option value="원반담임">원반담임</option>
                            <option value="특수담임">특수담임</option>
                            <option value="학년부장">학년부장</option>
                          </select>
                        </td>
                        <td className="p-3">
                          <select value={t.targetClass} disabled={t.type !== "원반담임"} onChange={(e) => handleMasterChangeRole(t.name, t.type, e.target.value)} className="border border-slate-300 rounded px-2 py-1 disabled:opacity-30">
                            <option value="all">전체 인가</option>
                            <option value="2-1">2-1반</option><option value="2-3">2-3반</option><option value="2-4">2-4반</option>
                            <option value="2-6">2-6반</option><option value="2-8">2-8반</option><option value="2-10">2-10반</option>
                          </select>
                        </td>
                        <td className="p-3">
                          <input type="text" placeholder={passwords[t.name] || "1111"} onChange={(e) => handleMasterChangePassword(t.name, e.target.value)} className="border border-slate-300 rounded px-2 py-1 font-mono text-xs w-24 text-blue-600 font-bold" />
                        </td>
                        <td className="p-3 text-center">
                          <button onClick={() => handleMasterDeleteAccount(t.name)} className="text-red-500 hover:bg-red-50 font-bold px-2 py-1 rounded">제명</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#DCE4EC] rounded-2xl p-5 shadow-sm flex flex-col h-[480px]">
            <h2 className="text-sm font-black text-[#1E3A8A] border-b border-slate-100 pb-2 mb-3">
              🖥️ 실시간 인트라넷 코어 로그 스트림
            </h2>
            <div className="flex-1 bg-slate-900 text-emerald-400 p-3 rounded-xl font-mono text-[10px] space-y-1 overflow-y-auto shadow-inner">
              {systemLogs.map(log => (
                <div key={log.id} className="opacity-95">
                  <span className="text-slate-500">[{log.time}]</span> <span className="text-blue-400">[{log.level}]</span> {log.msg}
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // --- 🧑‍🏫 9. [뷰 렌더링 3] 일반/특수교사 종합 행정 라이트 블루 포털 메인 뷰 ---
  const isSpecialMaster = currentTeacher.type === "특수담임";

  return (
    <div className="min-h-screen bg-[#F0F4F8] text-[#333333] font-sans flex flex-col antialiased relative">
      {/* 🚀 상단 프로그레스 바 (선생님 로직 연동) */}
      <div className="w-full fixed top-0 left-0 z-50 h-1.5 bg-neutral-200">
        <div className="h-full bg-[#2563EB] transition-all duration-1000 ease-out" style={{ width: `${progress}%` }} />
      </div>

      <header className="w-full bg-white border-b-2 border-[#1E40AF]/10 px-8 py-4 flex justify-between items-center shadow-sm mt-1.5">
        <div className="flex items-center gap-3">
          <Image src="/build_logo.png" alt="진해고" width={36} height={36} className="object-contain" />
          <div>
            <h1 className="text-base font-extrabold text-[#1E3A8A] tracking-tight">진해고등학교 교육행정 통합시스템 업무포털</h1>
            <p className="text-[11px] text-[#4B5563] font-bold flex items-center gap-1.5 mt-0.5">
              <span className={`inline-block w-2 h-2 rounded-full ${isLoading ? 'bg-amber-400' : 'bg-green-500 animate-pulse'}`}></span>
              {isLoading ? "구글 시트 데이터 바인딩 중..." : "구글 시트 실시간 데이터 노드 동기화 완료"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-bold">
          <div className="bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF] px-3 py-1.5 rounded-xl font-mono flex items-center gap-1.5 shadow-sm">
            🕒 실시간 일과: <span className="font-extrabold text-blue-700 underline">{currentPeriod}</span> 
            {timeLeft && <span className="text-xs text-neutral-500 font-normal">({timeLeft})</span>}
          </div>

          <Link href="/teacher/notice" className="bg-[#1E40AF] hover:bg-[#1D4ED8] text-white px-4 py-1.5 rounded-xl flex items-center gap-1 shadow-sm transition-all">
            📢 <span className="underline">업무협의 포럼</span>
          </Link>

          <div className="bg-slate-100 border border-slate-200 px-4 py-1.5 rounded-xl text-slate-700 shadow-sm">
            🔒 {currentTeacher.type} : <span className="text-black font-black">{currentTeacher.name} 선생님</span>
          </div>

          <button onClick={handleLogout} className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-sm transition-all">
            ❌ <span>로그아웃</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto p-6 space-y-6 flex-1 flex flex-col">
        {/* 현황 대시보드 팩 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-[#DCE4EC] rounded-2xl p-4 shadow-sm flex justify-between items-center">
            <div>
              <span className="text-[11px] font-bold text-slate-400 block">총 관제 대상자 명단</span>
              <span className="text-xl font-black text-slate-800 font-mono mt-0.5 block">{authorizedStudents.length}명</span>
            </div>
            <span className="text-2xl opacity-80">📋</span>
          </div>
          <div className="bg-white border border-[#DCE4EC] rounded-2xl p-4 shadow-sm flex justify-between items-center">
            <div>
              <span className="text-[11px] font-bold text-blue-500 block">학습도움실 내재 수업</span>
              <span className="text-xl font-black text-[#2563EB] font-mono mt-0.5 block">{authorizedStudents.filter(s => s.location === "학습도움실" || s.location === "도움반").length}명</span>
            </div>
            <span className="text-2xl opacity-80">🏫</span>
          </div>
          <div className="bg-white border border-[#DCE4EC] rounded-2xl p-4 shadow-sm flex justify-between items-center">
            <div>
              <span className="text-[11px] font-bold text-purple-500 block">원반 이동 수업 대상</span>
              <span className="text-xl font-black text-[#8B5CF6] font-mono mt-0.5 block">{authorizedStudents.filter(s => s.location !== "학습도움실" && s.location !== "도움반").length}명</span>
            </div>
            <span className="text-2xl opacity-80">🏃</span>
          </div>
          <div className="bg-white border border-[#DCE4EC] rounded-2xl p-4 shadow-sm flex justify-between items-center">
            <div>
              <span className="text-[11px] font-bold text-amber-500 block">집중 케어 필요 요망</span>
              <span className="text-xl font-black text-[#D97706] font-mono mt-0.5 block">{authorizedStudents.filter(s => s.status !== "정상").length}명</span>
            </div>
            <span className="text-2xl opacity-80">⚠️</span>
          </div>
        </div>

        {/* 실시간 트래킹 데이터 랙 */}
        <div className="bg-white border border-[#DCE4EC] rounded-2xl p-6 shadow-sm flex-1 flex flex-col">
          <div className="mb-4 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
              <h2 className="text-sm font-extrabold text-[#1E3A8A] flex items-center gap-1.5">
                🔎 실시간 특수학급 분산수업 동향 트래킹 매트릭스
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">구글 시트 연동 데이터를 기반으로 표출됩니다. 학생을 클릭하여 1:1 교차 지침 피드 및 알림장 로그를 관제하십시오.</p>
            </div>
            <div className="flex gap-1.5 text-xs font-bold">
              {["전체", "도움반", "통합학급"].map((filter) => (
                <button key={filter} onClick={() => setStatusFilter(filter)} className={`px-3 py-1.5 rounded-lg border transition-all ${statusFilter === filter ? "bg-[#2563EB] text-white border-[#2563EB]" : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"}`}>
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden border border-slate-200 rounded-xl bg-white flex-1">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#F8FAFC] border-b border-slate-200 text-xs text-slate-500 font-extrabold">
                <tr>
                  <th className="p-3.5">반정보</th>
                  <th className="p-3.5">학번</th>
                  <th className="p-3.5">이름</th>
                  <th className="p-3.5">현재 실시간 물리 위치</th>
                  <th className="p-3.5">행동 안전 동향</th>
                </tr>
              </thead>
              <tbody className="text-xs font-semibold text-slate-700 divide-y divide-slate-100">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 font-bold">현재 인가된 소속 분산 학생 전산 데이터가 없습니다.</td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => (
                    <tr key={student.id} onClick={() => setSelectedStudent(student)} className="hover:bg-blue-50/40 cursor-pointer transition-colors border-l-4 border-transparent hover:border-blue-500">
                      <td className="p-3.5"><span className="bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded font-bold text-[10px]">{student.classCode}반</span></td>
                      <td className="p-3.5 font-mono text-slate-400">{student.id}</td>
                      <td className="p-3.5 font-extrabold text-slate-900">{student.name}</td>
                      <td className="p-3.5 font-bold text-blue-600">📍 {student.location}</td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${student.status === "정상" ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-amber-50 text-amber-600 border border-amber-200"}`}>
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

        {/* 하단 공용 인계록 장치 */}
        <section className="bg-gradient-to-r from-[#FFFBEB] to-[#FEF3C7] border border-[#FDE68A] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">✍️</span>
            <h2 className="text-sm font-extrabold text-[#92400E]">학습도움실 내부 기밀 안건 및 특수교사 인계사항 (교직원 전체 공유 전산망)</h2>
          </div>
          <textarea value={sharedMemo} readOnly={!isSpecialMaster} onChange={(e) => setSharedMemo(e.target.value)} placeholder="특수학급 정담임 교사만 인계 안건 수정 권한이 인가됩니다." className="w-full bg-white/70 border border-[#FCD34D] rounded-xl p-3 text-xs text-[#78350F] font-bold h-20 resize-none focus:outline-none focus:bg-white transition-all shadow-inner" />
          {!isSpecialMaster && <p className="text-[10px] text-[#B45309] font-bold mt-1">※ 원반 담임 및 학년부장 교사는 읽기 전용 모드입니다. 수정은 특수 전담 교사 교무망을 통해서만 활성화됩니다.</p>}
        </section>
      </main>

      {/* 🔮 [구글 시트 연동 기반 주간 시간표/알림장/1:1 피드 연동 종합 관제 모달] */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white border border-slate-300 w-full max-w-5xl rounded-2xl p-6 shadow-2xl relative flex flex-col max-h-[85vh] overflow-hidden">
            <button onClick={() => setSelectedStudent(null)} className="absolute top-4 right-4 text-slate-400 hover:text-black text-lg bg-slate-100 w-8 h-8 rounded-full flex items-center justify-center transition-colors">✕</button>
            
            <div className="border-b border-slate-200 pb-3 mb-4">
              <span className="text-[10px] bg-blue-100 text-blue-700 font-extrabold px-2.5 py-0.5 rounded border border-blue-200 uppercase">{selectedStudent.classCode} 통합 관제</span>
              <h3 className="text-lg font-black text-slate-900 mt-1">
                {selectedStudent.name} 학생 실시간 정보 원장 
                <span className="text-xs text-slate-400 font-mono ml-2">(학번 ID: {selectedStudent.id})</span>
              </h3>
            </div>

            {/* 3단 통합 관제 콘솔 인프라 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-y-auto pb-2">
              
              {/* 1단: 학생용 화면과 100% 동일한 '주간' 구글 시트 시간표 목록 매핑 */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-[#1E3A8A] flex items-center gap-1">📅 주간 전체 시간표 매트릭스</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden text-[11px] bg-white">
                  <div className="grid grid-cols-6 bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-center py-1.5">
                    <div>교시</div><div>월</div><div>화</div><div>수</div><div>목</div><div>금</div>
                  </div>
                  {/* 구글 시트 연동 데이터 (sheetTimelines) 또는 Fallback 빈칸 렌더링 */}
                  {Array.from({ length: 7 }).map((_, periodIdx) => (
                    <div key={periodIdx} className="grid grid-cols-6 border-b border-slate-100 last:border-b-0 text-center py-2 items-center">
                      <div className="font-bold text-blue-500 bg-blue-50/50 h-full flex items-center justify-center">{periodIdx + 1}</div>
                      {Array.from({ length: 5 }).map((_, dayIdx) => {
                        // 선생님의 구글 시트 데이터 구조가 timelines["20110"][dayIndex][periodIdx] 형태일 경우를 가정한 매핑
                        const dayData = sheetTimelines[selectedStudent.id]?.[dayIdx];
                        const subject = dayData ? dayData[periodIdx] : "공통";
                        return <div key={dayIdx} className="text-slate-700 font-medium truncate px-0.5">{subject}</div>;
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* 2단: 전산망에서 주입된 실시간 공통/개인 알림장 출력 컴포넌트 */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-[#1E3A8A] flex items-center gap-1">📢 구글 시트 바인딩 실시간 알림장 로그</h4>
                <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 space-y-2 min-h-[250px] max-h-[350px] overflow-y-auto shadow-inner">
                  {(!sheetNotices[selectedStudent.id] || sheetNotices[selectedStudent.id].length === 0) ? (
                    <p className="text-center text-amber-800/40 font-bold py-12 text-xs">현재 시트에 배포된 해당 학생의 알림장이 없습니다.</p>
                  ) : (
                    sheetNotices[selectedStudent.id].map((notice, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-xl border border-amber-200 shadow-sm text-[11px] leading-relaxed text-amber-950 font-semibold">
                        <div className="flex justify-between items-center text-[9px] mb-1.5 font-bold">
                          <span className={`px-1.5 py-0.5 rounded-full ${notice.target === "전체" ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"}`}>
                            [{notice.target}]
                          </span>
                          <span className="text-slate-400">발송: {notice.teacher} 교사</span>
                        </div>
                        <p className="whitespace-pre-wrap">{notice.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 3단: 1:1 교직원 실시간 소통 다이어리 (모든 권한 프리 피드) */}
              <div className="space-y-2 flex flex-col">
                <h4 className="text-xs font-black text-[#1E3A8A] flex items-center gap-1">💬 교직원 실시간 연계 소통 피드</h4>
                <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-200 overflow-y-auto space-y-2 min-h-[250px] max-h-[350px]">
                  {(studentFeeds[selectedStudent.id] || []).length === 0 ? (
                    <p className="text-center text-slate-400 font-medium py-12 text-[11px]">기록된 피드가 없습니다. 실시간 연계 지침을 작성하세요.</p>
                  ) : (
                    (studentFeeds[selectedStudent.id] || []).map((feed: any, idx: number) => {
                      const isMe = feed.sender === currentTeacher.name;
                      return (
                        <div key={idx} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                          <span className="text-[9px] text-slate-400 font-extrabold mb-0.5">{feed.sender} ({feed.role})</span>
                          <div className={`p-2.5 rounded-xl text-[11px] font-semibold max-w-[220px] leading-tight ${isMe ? "bg-[#2563EB] text-white rounded-tr-none shadow-sm" : "bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-sm"}`}>
                            {feed.text}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="flex gap-1.5 mt-2">
                  <input type="text" placeholder="모든 교사 공용 작성 란..." value={newFeedText} onChange={(e) => setNewFeedText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleAddFeed(selectedStudent.id); }} className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-sm" />
                  <button onClick={() => handleAddFeed(selectedStudent.id)} className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs px-4 rounded-xl transition-colors shadow-sm">
                    입력
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}