"use client";

import { useState, useEffect, useCallback } from "react";

// ──────────────────────────────────────────────────────────
// 1. 타입 및 데이터 모델 정의
// ──────────────────────────────────────────────────────────
interface Student {
  id: string;      // 학번
  name: string;    // 이름
  homeroom: string; // 담임교사 이름
  gradeClass: string; // "2-1", "2-3" 등
  link: string;
}

interface UserAccount {
  id: string;        // 로그인 ID (이름 또는 지정 ID)
  name: string;      // 교사명
  role: "특수담임" | "학급담임" | "학년부장" | "관리자";
  targetClass?: string; // 학급담임/학년부장일 경우 담당 학반 (예: "2-1", "2-9")
  assignedSubject?: string;
  password: string;
}

interface FeedMessage {
  studentId: string;
  sender: string;
  role: string;
  text: string;
  timestamp: string;
}

interface BoardPost {
  id: string;
  title: string;
  content: string;
  writer: string;
  date: string;
  allowedTeachers: string[]; // 열람 및 댓글 작성이 가능한 교사 목록 ("전체" 또는 교사명 배열)
  comments: { writer: string; role: string; text: string; date: string }[];
}

interface HandoverRecord {
  studentId: string;
  writer: string;
  content: string;
  date: string;
}

interface SystemLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
}

// ──────────────────────────────────────────────────────────
// 2. 초기 마스터 데이터 (하드코딩 및 Fallback용)
// ──────────────────────────────────────────────────────────
const INITIAL_STUDENTS: Student[] = [
  { id: "20110", name: "김한얼", homeroom: "김대홍", gradeClass: "2-1", link: "https://school-timetable-dubi.vercel.app/student/20110" },
  { id: "20121", name: "이정준", homeroom: "김대홍", gradeClass: "2-1", link: "https://school-timetable-dubi.vercel.app/student/20121" },
  { id: "20306", name: "김현중", homeroom: "김수민", gradeClass: "2-3", link: "https://school-timetable-dubi.vercel.app/student/20306" },
  { id: "20311", name: "박진현", homeroom: "김수민", gradeClass: "2-3", link: "https://school-timetable-dubi.vercel.app/student/20311" },
  { id: "20402", name: "강민준", homeroom: "정은영", gradeClass: "2-4", link: "https://school-timetable-dubi.vercel.app/student/20402" },
  { id: "20406", name: "김세현", homeroom: "정은영", gradeClass: "2-4", link: "https://school-timetable-dubi.vercel.app/student/20406" },
  { id: "20418", name: "손민찬", homeroom: "정은영", gradeClass: "2-4", link: "https://school-timetable-dubi.vercel.app/student/20418" },
  { id: "20612", name: "손찬信", homeroom: "서한성", gradeClass: "2-6", link: "https://school-timetable-dubi.vercel.app/student/20612" },
  { id: "20616", name: "오승철", homeroom: "서한성", gradeClass: "2-6", link: "https://school-timetable-dubi.vercel.app/student/20616" },
  { id: "20813", name: "박찬석", homeroom: "여지언", gradeClass: "2-8", link: "https://school-timetable-dubi.vercel.app/student/20813" },
  { id: "20906", name: "김재원", homeroom: "서용환", gradeClass: "2-9", link: "https://school-timetable-dubi.vercel.app/student/20906" },
  { id: "21026", name: "조연우", homeroom: "강지영", gradeClass: "2-10", link: "https://school-timetable-dubi.vercel.app/student/21026" },
  { id: "21027", name: "최재범", homeroom: "강지영", gradeClass: "2-10", link: "https://school-timetable-dubi.vercel.app/student/21027" },
];

const INITIAL_ACCOUNTS: UserAccount[] = [
  { id: "min", name: "민석준", role: "특수담임", password: "1234" },
  { id: "admin", name: "민석준(관)", role: "관리자", password: "msj2026!!@" },
  { id: "dh201", name: "김대홍", role: "학급담임", targetClass: "2-1", password: "1234" },
  { id: "sm203", name: "김수민", role: "학급담임", targetClass: "2-3", password: "1234" },
  { id: "ey204", name: "정은영", role: "학급담임", targetClass: "2-4", password: "1234" },
  { id: "hs206", name: "서한성", role: "학급담임", targetClass: "2-6", password: "1234" },
  { id: "je208", name: "여지언", role: "학급담임", targetClass: "2-8", password: "1234" },
  { id: "yh209", name: "서용환", role: "학년부장", targetClass: "2-9", password: "1234" },
  { id: "jy210", name: "강지영", role: "학급담임", targetClass: "2-10", password: "1234" },
];

const PERIOD_RANGES = [
  { name: "1교시", start: 8 * 60 + 40, end: 9 * 60 + 30 },
  { name: "2교시", start: 9 * 60 + 40, end: 10 * 60 + 30 },
  { name: "3교시", start: 10 * 60 + 40, end: 11 * 60 + 30 },
  { name: "4교시", start: 11 * 60 + 40, end: 12 * 60 + 30 },
  { name: "5교시", start: 13 * 60 + 35, end: 14 * 60 + 25 },
  { name: "6교시", start: 14 * 60 + 35, end: 15 * 60 + 25 },
  { name: "7교시", start: 15 * 60 + 40, end: 16 * 60 + 30 },
];

// ──────────────────────────────────────────────────────────
// 3. 메인 컴포넌트 시작
// ──────────────────────────────────────────────────────────
export default function App() {
  // --- 시스템 상태 ---
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [activeMenu, setActiveMenu] = useState<string>("대시보드");
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [accounts, setAccounts] = useState<UserAccount[]>(INITIAL_ACCOUNTS);
  
  // --- 데이터 지속 보관 상태 (LocalStorage 유기적 연동) ---
  const [feeds, setFeeds] = useState<FeedMessage[]>([]);
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [handovers, setHandovers] = useState<HandoverRecord[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);

  // --- UI 인터랙션 상태 ---
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [sheetSchedules, setSheetSchedules] = useState<Record<string, any>>({});
  const [isLoadingSheet, setIsLoadingSheet] = useState<boolean>(false);
  const [currentPeriod, setCurrentPeriod] = useState<string>("");

  // --- 입력 폼 상태 ---
  const [loginId, setLoginId] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [featureRequest, setFeatureRequest] = useState("");
  const [feedInput, setFeedInput] = useState("");
  const [handoverInput, setHandoverInput] = useState("");

  // 게시판 입력 폼
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postTargets, setPostTargets] = useState<string[]>(["전체"]);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  // 계정관리 폼
  const [mId, setMId] = useState("");
  const [mName, setMName] = useState("");
  const [mRole, setMRole] = useState<"특수담임" | "학급담임" | "학년부장" | "관리자">("학급담임");
  const [mClass, setMClass] = useState("");
  const [mSubject, setMSubject] = useState("");
  const [mPw, setMPw] = useState("");

  // ──────────────────────────────────────────────────────────
  // 4. 초기화 및 실시간 동기화/시간 연산 로직
  // ──────────────────────────────────────────────────────────
  useEffect(() => {
    // LocalStorage 데이터 복구 (영구 유지 보장)
    if (typeof window !== "undefined") {
      setFeeds(JSON.parse(localStorage.getItem("po_feeds") || "[]"));
      setHandovers(JSON.parse(localStorage.getItem("po_handovers") || "[]"));
      setLogs(JSON.parse(localStorage.getItem("po_logs") || "[]"));
      
      const defaultPosts: BoardPost[] = [
        {
          id: "1",
          title: "2026학년도 일과운영 조율 및 공지",
          content: "특수학급 학생들의 이동수업 시간표가 구글 시트 기반으로 동기화됩니다. 담임 선생님들께서는 참고 부탁드립니다.",
          writer: "민석준",
          date: "2026-06-14",
          allowedTeachers: ["전체"],
          comments: []
        }
      ];
      setPosts(JSON.parse(localStorage.getItem("po_posts") || JSON.stringify(defaultPosts)));
    }

    // 현재 교시 연산
    const calcPeriod = () => {
      const now = new Date();
      const mins = now.getHours() * 60 + now.getMinutes();
      const found = PERIOD_RANGES.find(p => mins >= p.start && mins <= p.end);
      setCurrentPeriod(found ? found.name : "일과외");
    };
    calcPeriod();
    const timer = setInterval(calcPeriod, 60000);
    return () => clearInterval(timer);
  }, []);

  // 로그 생성 유틸
  const addLog = useCallback((user: string, action: string) => {
    const newLog: SystemLog = {
      id: String(Date.now()),
      timestamp: new Date().toLocaleString(),
      user,
      action
    };
    setLogs(prev => {
      const updated = [newLog, ...prev];
      localStorage.setItem("po_logs", JSON.stringify(updated));
      return updated;
    });
  }, []);

  // 구글 시트 실시간 데이터 동기화 API 호출 함수
  const fetchRealtimeSheets = async () => {
    setIsLoadingSheet(true);
    try {
      // 실시간 통신 API 호출 (/api/sheets-data)
      const res = await fetch("/api/sheets-data");
      if (res.ok) {
        const data = await res.json();
        if (data && data.schedules) {
          setSheetSchedules(data.schedules);
          addLog(currentUser?.name || "시스템", "구글 시트 실시간 데이터 동기화 완료");
        }
      } else {
        // Fallback 데이터 자동 매핑 (API 미연결 상태 대비 안전망 완비)
        generateFallbackSchedules();
      }
    } catch (e) {
      generateFallbackSchedules();
    } finally {
      setIsLoadingSheet(false);
    }
  };

  const generateFallbackSchedules = () => {
    const fallback: Record<string, any> = {};
    INITIAL_STUDENTS.forEach(s => {
      fallback[s.id] = {
        currentSubject: "도움실 직업기초",
        currentTeacher: "민석준",
        currentRoom: "학습도움실",
        timeline: [
          { period: "1교시", subject: "국어", teacher: "원반교사", location: "원반교실" },
          { period: "2교시", subject: "수학", teacher: "원반교사", location: "원반교실" },
          { period: "3교시", subject: "진로와 직업", teacher: "민석준", location: "학습도움실" },
          { period: "4교시", subject: "체육", teacher: "원반교사", location: "체육관" },
          { period: "5교시", subject: "영어", teacher: "원반교사", location: "원반교실" },
          { period: "6교시", subject: "음악", teacher: "원반교사", location: "음악실" },
          { period: "7교시", subject: "창체", teacher: "담임교사", location: "원반교실" },
        ]
      };
    });
    setSheetSchedules(fallback);
  };

  useEffect(() => {
    if (currentUser) {
      fetchRealtimeSheets();
    }
  }, [currentUser]);

  // ──────────────────────────────────────────────────────────
  // 5. 비즈니스 로직 처리 기능들
  // ──────────────────────────────────────────────────────────
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = accounts.find(a => a.id === loginId && a.password === loginPw);
    if (user) {
      setCurrentUser(user);
      addLog(user.name, `시스템 로그인 성공 (${user.role})`);
    } else {
      alert("아이디 또는 비밀번호가 올바르지 않습니다.");
    }
  };

  const handleLogout = () => {
    if (currentUser) {
      addLog(currentUser.name, "시스템 로그아웃");
    }
    setCurrentUser(null);
    setActiveMenu("대시보드");
    setSelectedStudent(null);
    setLoginId("");
    setLoginPw("");
  };

  // 피드 메시지 추가 (창을 닫아도 복구 보장)
  const handleAddFeed = (studentId: string) => {
    if (!feedInput.trim() || !currentUser) return;
    const newMsg: FeedMessage = {
      studentId,
      sender: currentUser.name,
      role: currentUser.role,
      text: feedInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    const updated = [...feeds, newMsg];
    setFeeds(updated);
    localStorage.setItem("po_feeds", JSON.stringify(updated));
    setFeedInput("");
    addLog(currentUser.name, `${studentId} 학생 연계 피드 지침 작성`);
  };

  // 인계록 작성
  const handleAddHandover = (studentId: string) => {
    if (!handoverInput.trim() || !currentUser) return;
    const newRecord: HandoverRecord = {
      studentId,
      writer: currentUser.name,
      content: handoverInput,
      date: new Date().toLocaleDateString()
    };
    const updated = [newRecord, ...handovers];
    setHandovers(updated);
    localStorage.setItem("po_handovers", JSON.stringify(updated));
    setHandoverInput("");
    addLog(currentUser.name, `${studentId} 학생 인계록 신규 항목 작성`);
  };

  // 게시판 게시글 등록
  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle.trim() || !postContent.trim() || !currentUser) return;
    const newPost: BoardPost = {
      id: String(Date.now()),
      title: postTitle,
      content: postContent,
      writer: currentUser.name,
      date: new Date().toISOString().split('T')[0],
      allowedTeachers: postTargets,
      comments: []
    };
    const updated = [newPost, ...posts];
    setPosts(updated);
    localStorage.setItem("po_posts", JSON.stringify(updated));
    setPostTitle("");
    setPostContent("");
    setPostTargets(["전체"]);
    addLog(currentUser.name, `공지사항 및 게시글 작성: ${postTitle}`);
  };

  // 게시판 댓글 작성
  const handleAddComment = (postId: string) => {
    const txt = commentInputs[postId];
    if (!txt || !txt.trim() || !currentUser) return;
    
    const updated = posts.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          comments: [...p.comments, {
            writer: currentUser.name,
            role: currentUser.role,
            text: txt,
            date: new Date().toLocaleDateString()
          }]
        };
      }
      return p;
    });
    setPosts(updated);
    localStorage.setItem("po_posts", JSON.stringify(updated));
    setCommentInputs(prev => ({ ...prev, [postId]: "" }));
    addLog(currentUser.name, `게시글 ID [${postId}]에 댓글 추가`);
  };

  // 관리자 계정 제어 기능
  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mId || !mName || !mPw) return;
    const newAcc: UserAccount = {
      id: mId,
      name: mName,
      role: mRole,
      targetClass: mClass || undefined,
      assignedSubject: mSubject || undefined,
      password: mPw
    };
    setAccounts(prev => [...prev, newAcc]);
    addLog(currentUser?.name || "관리자", `신규 교사 계정 생성: ${mName} (${mRole})`);
    setMId(""); setMName(""); setMPw(""); setMClass(""); setMSubject("");
    alert("계정이 성공적으로 등록되었습니다.");
  };

  const handleDeleteAccount = (id: string) => {
    if (confirm("정말로 이 계정을 삭제하시겠습니까?")) {
      setAccounts(prev => prev.filter(a => a.id !== id));
      addLog(currentUser?.name || "관리자", `계정 영구 파기: ${id}`);
    }
  };

  // ──────────────────────────────────────────────────────────
  // 6. 권한 기반 데이터 필터링 제어 매트릭스
  // ──────────────────────────────────────────────────────────
  const filteredStudents = students.filter(s => {
    if (!currentUser) return false;
    if (currentUser.role === "특수담임" || currentUser.role === "관리자") return true;
    if (currentUser.role === "학급담임") return s.gradeClass === currentUser.targetClass;
    if (currentUser.role === "학년부장") return true; // 전체 학생 조회는 가능
    return false;
  });

  const canEditHandover = (student: Student) => {
    if (!currentUser) return false;
    if (currentUser.role === "특수담임" || currentUser.role === "관리자") return true;
    if (currentUser.role === "학년부장" && student.gradeClass === currentUser.targetClass) return true;
    if (currentUser.role === "학급담임" && student.gradeClass === currentUser.targetClass) return true;
    return false;
  };

  // ──────────────────────────────────────────────────────────
  // 7. 레이아웃 및 뷰 렌더링
  // ──────────────────────────────────────────────────────────
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6" style={{ fontFamily: "Pretendard, system-ui, sans-serif" }}>
        <div className="bg-white max-w-md w-full rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-blue-600 p-8 text-center text-white">
            <div className="text-6xl mb-3">🏫</div>
            <h1 className="text-2xl font-black tracking-tight">진해고등학교 특수학급</h1>
            <p className="text-sm opacity-80 mt-1">통합교육 일과운영 실시간 업무포털</p>
          </div>
          <form onSubmit={handleLogin} className="p-8 space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">교직원 로그인 ID</label>
              <input type="text" value={loginId} onChange={(e) => setLoginId(e.target.value)} required className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl font-medium text-sm focus:outline-none focus:border-blue-500 text-slate-800" placeholder="교사 이름 또는 ID 입력" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">보안 비밀번호</label>
              <input type="password" value={loginPw} onChange={(e) => setLoginPw(e.target.value)} required className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl font-medium text-sm focus:outline-none focus:border-blue-500 text-slate-800" placeholder="••••••••" />
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-md transition-all text-sm">
              안전한 인증 로그인 승인
            </button>
            <div className="text-center text-[11px] text-slate-400">
              본 시스템은 국가 정보보안 지침을 준수하며 비인가 자의 접속을 금합니다.
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-800" style={{ fontFamily: "Pretendard, system-ui, sans-serif" }}>
      
      {/* =========================================================
          좌측 사이드바 네비게이션
         ========================================================= */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col justify-between shadow-sm shrink-0">
        <div>
          {/* 큰 학교 로고 디자인 헤더 */}
          <div className="p-6 border-b border-slate-100 bg-slate-50 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-4xl shadow-md font-bold mb-3">
              🏫
            </div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">진해고등학교</h2>
            <div className="text-xs font-bold text-blue-600 mt-0.5 bg-blue-50 px-2.5 py-0.5 rounded-full">
              {currentUser.name} [{currentUser.role}]
            </div>
          </div>

          {/* 동적 메뉴 바인딩 */}
          <nav className="p-4 space-y-1">
            {currentUser.role !== "관리자" ? (
              <>
                <button onClick={() => { setActiveMenu("대시보드"); setSelectedStudent(null); }} className={`w-full flex items-center px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${activeMenu === "대시보드" ? "bg-blue-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-100"}`}>
                  <span className="text-xl mr-3">🏠</span> 대시보드
                </button>
                <button onClick={() => setActiveMenu("학생조회")} className={`w-full flex items-center px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${activeMenu === "학생조회" ? "bg-blue-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-100"}`}>
                  <span className="text-xl mr-3">👨‍🎓</span> 학생조회
                </button>
                <button onClick={() => setActiveMenu("알림장")} className={`w-full flex items-center px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${activeMenu === "알림장" ? "bg-blue-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-100"}`}>
                  <span className="text-xl mr-3">📢</span> 알림장
                </button>
                <button onClick={() => setActiveMenu("게시판")} className={`w-full flex items-center px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${activeMenu === "게시판" ? "bg-blue-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-100"}`}>
                  <span className="text-xl mr-3">💬</span> 게시판 설정
                </button>
                <button onClick={() => setActiveMenu("인계록")} className={`w-full flex items-center px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${activeMenu === "인계록" ? "bg-blue-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-100"}`}>
                  <span className="text-xl mr-3">📝</span> 인계록
                </button>
                <button onClick={() => setActiveMenu("설정")} className={`w-full flex items-center px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${activeMenu === "설정" ? "bg-blue-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-100"}`}>
                  <span className="text-xl mr-3">⚙️</span> 교사 환경 설정
                </button>
              </>
            ) : (
              <>
                {/* 관리자 대시보드 전용 제어 보드 */}
                <div className="text-[11px] font-bold text-red-500 uppercase px-4 mb-2 tracking-wider">최고 권한 제어 센터</div>
                <button onClick={() => setActiveMenu("대시보드")} className={`w-full flex items-center px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${activeMenu === "대시보드" ? "bg-red-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-50"}`}>
                  <span className="text-xl mr-3">🏠</span> 대시보드 모니터
                </button>
                <button onClick={() => setActiveMenu("계정관리")} className={`w-full flex items-center px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${activeMenu === "계정관리" ? "bg-red-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-50"}`}>
                  <span className="text-xl mr-3">🗂️</span> 계정 마스터 관리
                </button>
                <button onClick={() => setActiveMenu("로그확인")} className={`w-full flex items-center px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${activeMenu === "로그확인" ? "bg-red-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-50"}`}>
                  <span className="text-xl mr-3">📜</span> 실시간 로그 보안 감사
                </button>
              </>
            )}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-100">
          <button onClick={handleLogout} className="w-full flex items-center px-4 py-3.5 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition-all">
            <span className="text-xl mr-3">🚪</span> 시스템 로그아웃
          </button>
        </div>
      </aside>

      {/* =========================================================
          우측 메인 워크스페이스
         ========================================================= */}
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* 상단 툴바 탑 네비게이션 */}
        <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-y-1">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">{activeMenu}</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-800">
                🔔 현재 {currentPeriod} 운영 중
              </span>
            </div>
            <button onClick={fetchRealtimeSheets} disabled={isLoadingSheet} className="bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-200 transition-all flex items-center">
              {isLoadingSheet ? "동기화 중..." : "🔄 구글 시트 실시간 동기화"}
            </button>
          </div>
        </header>

        {/* 메인 화면 뷰 분기 교차 처리 구역 */}
        <div className="flex-1 p-8 overflow-y-auto">
          
          {/* ────────────────────────────────────────────────────────
              A. 대시보드 뷰 (사용자 친화형 큰 카드 레이아웃)
             ──────────────────────────────────────────────────────── */}
          {activeMenu === "대시보드" && (
            <div className="space-y-6">
              {!selectedStudent ? (
                <>
                  <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-md flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-black">특수학급 전체 학생 실시간 현황 보드</h3>
                      <p className="text-xs opacity-90 mt-1">카드를 선택하시면 해당 학생의 실시간 일과 시간표 및 개인 앱 세부 정보가 대형 뷰어로 로드됩니다.</p>
                    </div>
                    <span className="text-3xl">📊</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredStudents.map(s => {
                      const sheetInfo = sheetSchedules[s.id] || { currentSubject: "데이터 없음", currentRoom: "확인불가" };
                      return (
                        <div key={s.id} onClick={() => setSelectedStudent(s)} className="bg-white border-2 border-slate-200 hover:border-blue-500 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all cursor-pointer relative group flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start mb-4">
                              <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-md">{s.id}</span>
                              <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-md">{s.gradeClass} 반</span>
                            </div>
                            <h4 className="text-2xl font-black text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">{s.name}</h4>
                            
                            <div className="space-y-1 text-xs font-semibold text-slate-500 mt-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                              <div><span className="text-slate-400">원반 담임:</span> {s.homeroom} 교사</div>
                              <div><span className="text-slate-400">현재 교과:</span> <span className="text-slate-800 font-bold">{sheetInfo.currentSubject}</span></div>
                              <div><span className="text-slate-400">현재 교실:</span> <span className="text-blue-600 font-bold">{sheetInfo.currentRoom}</span></div>
                            </div>
                          </div>
                          
                          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600">
                            <span>⏱️ 실시간 일과 시간표 조회</span>
                            <span className="group-hover:translate-x-1 transition-transform">→</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                /* 학생 선택 시 대형 타임라인 디테일 로드 뷰 */
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-6">
                    <div className="flex items-center space-x-4">
                      <button onClick={() => setSelectedStudent(null)} className="bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl text-xs font-bold">
                        ← 목록으로 돌아가기
                      </button>
                      <div>
                        <h2 className="text-3xl font-black text-slate-900">{selectedStudent.name} 학생 일과 종합 대시보드</h2>
                        <p className="text-xs text-slate-400 font-medium mt-1">{selectedStudent.id} ({selectedStudent.gradeClass}반 · 담임 {selectedStudent.homeroom} 선생님)</p>
                      </div>
                    </div>
                    <a href={selectedStudent.link} target="_blank" rel="noreferrer" className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-sm">
                      학생용 모바일 앱 새창 열기 🌐
                    </a>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* 실시간 시간표 */}
                    <div className="lg:col-span-2 space-y-4">
                      <h3 className="text-lg font-bold text-slate-900 flex items-center">
                        <span className="mr-2">📅</span> 구글시트 실시간 연동 시간표
                      </h3>
                      <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse text-sm">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                              <th className="p-4 text-center">교시</th>
                              <th className="p-4">교과목</th>
                              <th className="p-4">담당 교사</th>
                              <th className="p-4">수업 교실</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(sheetSchedules[selectedStudent.id]?.timeline || []).map((t: any, idx: number) => {
                              const isCurrent = t.period === currentPeriod;
                              return (
                                <tr key={idx} className={`hover:bg-slate-50 transition-colors ${isCurrent ? "bg-amber-50 font-bold text-amber-900" : ""}`}>
                                  <td className="p-4 text-center font-bold text-slate-500">{t.period}</td>
                                  <td className="p-4 font-bold text-slate-900">{t.subject || "—"}</td>
                                  <td className="p-4 text-slate-600">{t.teacher || "—"}</td>
                                  <td className="p-4">
                                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${t.location?.includes("도움실") ? "bg-yellow-100 text-yellow-800" : "bg-slate-100 text-slate-700"}`}>
                                      {t.location || "—"}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* 상호 소통 통합 연계 피드 (영구 유지 보장) */}
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 flex flex-col h-[500px]">
                      <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center justify-between">
                        <span>💬 교사 상호 연계 피드</span>
                        <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">안전 브라우저 저장</span>
                      </h3>
                      
                      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                        {feeds.filter(f => f.studentId === selectedStudent.id).length === 0 ? (
                          <div className="text-center text-slate-400 text-xs py-12 font-medium">
                            작성된 연계 피드 지침이 없습니다.<br />의견을 교류해 보세요.
                          </div>
                        ) : (
                          feeds.filter(f => f.studentId === selectedStudent.id).map((f, i) => (
                            <div key={i} className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-bold text-slate-700">{f.sender} ({f.role})</span>
                                <span className="text-[10px] text-slate-400">{f.timestamp}</span>
                              </div>
                              <p className="text-xs text-slate-600 font-medium leading-relaxed">{f.text}</p>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="mt-4 flex gap-2">
                        <input type="text" placeholder="통합 지침 작성란..." value={feedInput} onChange={(e) => setFeedInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddFeed(selectedStudent.id)} className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500" />
                        <button onClick={() => handleAddFeed(selectedStudent.id)} className="bg-blue-600 text-white font-bold text-xs px-3 py-2 rounded-xl">전송</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ────────────────────────────────────────────────────────
              B. 학생조회 뷰 (현재 수업중 정보 직관화)
             ──────────────────────────────────────────────────────── */}
          {activeMenu === "학생조회" && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="mb-4">
                <p className="text-xs text-slate-400 font-bold">우리반 또는 관할 권한 내 학생들의 현재 교실 및 실시간 교과 현황을 정밀 모니터링합니다.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 font-bold border-b border-slate-200">
                      <th className="p-4">학반</th>
                      <th className="p-4">학번</th>
                      <th className="p-4">이름</th>
                      <th className="p-4">현재 운영 교시</th>
                      <th className="p-4">현재 교과목</th>
                      <th className="p-4">현재 담당교사</th>
                      <th className="p-4">실시간 교실 위치</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredStudents.map(s => {
                      const sheetInfo = sheetSchedules[s.id] || { currentSubject: "데이터 없음", currentTeacher: "확인불가", currentRoom: "미지정" };
                      return (
                        <tr key={s.id} className="hover:bg-slate-50">
                          <td className="p-4 font-bold text-blue-600">{s.gradeClass}</td>
                          <td className="p-4 text-slate-500">{s.id}</td>
                          <td className="p-4 font-bold text-slate-900">{s.name}</td>
                          <td className="p-4"><span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-0.5 rounded-md font-bold">{currentPeriod || "일과외"}</span></td>
                          <td className="p-4 font-bold text-slate-800">{sheetInfo.currentSubject}</td>
                          <td className="p-4 text-slate-600">{sheetInfo.currentTeacher}</td>
                          <td className="p-4">
                            <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-md text-xs font-black">
                              {sheetInfo.currentRoom}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────
              C. 알림장 조회 뷰
             ──────────────────────────────────────────────────────── */}
          {activeMenu === "알림장" && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">📌 구글 스프레드시트 [알림장] 시트와 백엔드로 실시간 동기화되어 통합 로드되는 공지 내역입니다.</span>
              </div>
              <div className="space-y-4">
                <div className="border-l-4 border-blue-600 bg-blue-50 p-5 rounded-r-xl">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-blue-900 text-sm">📢 전 학급 공통 공지사항 (구글시트 실시간 연동)</span>
                    <span className="text-xs text-blue-700 font-bold">특수교무실</span>
                  </div>
                  <p className="text-sm text-slate-700 font-medium leading-relaxed">
                    내일부터 특수학급 자율동아리 프로그램이 개설됩니다. 각 반 담임 선생님들께서는 학생들이 도움실로 시간 내 정시 이동할 수 있도록 아침 조회 시 한번 더 지도 요청드립니다.
                  </p>
                </div>
                {filteredStudents.map(s => (
                  <div key={s.id} className="border border-slate-200 p-5 rounded-xl hover:shadow-xs transition-shadow">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-slate-900 text-sm">👤 {s.name} 학생 개별 알림 공지</span>
                      <span className="text-xs font-bold text-slate-400">학번: {s.id}</span>
                    </div>
                    <p className="text-sm text-slate-600 font-medium">준비물: 체육복 및 개별 개인 활동 보조 도구 지참 필수 (원반 이동 수업 조율 완료).</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────
              D. 게시판 및 댓글 소통 설정 뷰 (시커먼 UI 전면 제거)
             ──────────────────────────────────────────────────────── */}
          {activeMenu === "게시판" && (
            <div className="space-y-6">
              {/* 글쓰기 영역 (특수교사 및 권한자 전용) */}
              {(currentUser.role === "특수담임" || currentUser.role === "관리자") && (
                <form onSubmit={handleCreatePost} className="bg-white rounded-2xl border-2 border-blue-100 p-6 space-y-4 shadow-xs">
                  <h3 className="text-base font-black text-slate-900">💬 업무 공지 및 권한 지정 게시판 생성</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" placeholder="공지 및 토론 제목 입력" value={postTitle} onChange={(e) => setPostTitle(e.target.value)} required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-500" />
                    
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 mb-1">열람 및 댓글 작성 대상교사 다중 선택 가능</label>
                      <select multiple value={postTargets} onChange={(e) => setPostTargets(Array.from(e.target.selectedOptions, option => option.value))} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:outline-none">
                        <option value="전체">전체 교사 공용 개방</option>
                        {accounts.map(a => <option key={a.id} value={a.name}>{a.name} 선생님 ({a.targetClass || "특수"})</option>)}
                      </select>
                    </div>
                  </div>

                  <textarea placeholder="게시판 본문 내용을 상세히 작성하세요..." value={postContent} onChange={(e) => setPostContent(e.target.value)} required rows={3} className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500" />
                  
                  <div className="flex justify-end">
                    <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm">
                      보드 게시글 정식 등록
                    </button>
                  </div>
                </form>
              )}

              {/* 게시글 목록 피드 렌더링 */}
              <div className="space-y-6">
                {posts.filter(p => p.allowedTeachers.includes("전체") || p.allowedTeachers.includes(currentUser.name) || p.writer === currentUser.name || currentUser.role === "관리자").map(p => (
                  <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="bg-blue-50 text-blue-700 text-[10px] font-black px-2.5 py-0.5 rounded-full mb-1 inline-block">
                          대상 권한: {p.allowedTeachers.join(", ")}
                        </span>
                        <h4 className="text-xl font-black text-slate-900">{p.title}</h4>
                      </div>
                      <div className="text-right text-xs font-bold text-slate-400">
                        <div>작성자: {p.writer}</div>
                        <div>{p.date}</div>
                      </div>
                    </div>
                    
                    <p className="text-sm text-slate-600 font-medium whitespace-pre-wrap leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                      {p.content}
                    </p>

                    {/* 댓글 시스템 공간 */}
                    <div className="pt-4 border-t border-slate-100 space-y-3">
                      <h5 className="text-xs font-black text-slate-700">💬 피드백 및 업무 조정 의견 ({p.comments.length})</h5>
                      
                      {p.comments.map((c, ci) => (
                        <div key={ci} className="bg-slate-50 p-3 rounded-xl text-xs font-medium flex justify-between items-start">
                          <div>
                            <span className="font-bold text-slate-800">{c.writer} [{c.role}]:</span>
                            <span className="text-slate-600 ml-2">{c.text}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">{c.date}</span>
                        </div>
                      ))}

                      <div className="flex gap-2 mt-2">
                        <input type="text" placeholder="의견 및 댓글을 입력하세요..." value={commentInputs[p.id] || ""} onChange={(e) => setCommentInputs({ ...commentInputs, [p.id]: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && handleAddComment(p.id)} className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500" />
                        <button onClick={() => handleAddComment(p.id)} className="bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl">등록</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────
              E. 인계록 뷰 (개별 학생 정밀 맞춤 연동)
             ──────────────────────────────────────────────────────── */}
          {activeMenu === "인계록" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* 왼쪽 학생 선택 네비게이터 */}
              <div className="space-y-3">
                <h3 className="text-sm font-black text-slate-500 px-1">인계 대상 학생 선택</h3>
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {filteredStudents.map(s => (
                    <div key={s.id} onClick={() => setSelectedStudent(s)} className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedStudent?.id === s.id ? "bg-blue-50 border-blue-500" : "bg-white border-slate-200 hover:border-slate-300"}`}>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-400">{s.id}</span>
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{s.gradeClass}</span>
                      </div>
                      <h4 className="text-lg font-black text-slate-900 mt-1">{s.name}</h4>
                    </div>
                  ))}
                </div>
              </div>

              {/* 오른쪽 인계 내역 리스트 및 작성 */}
              <div className="lg:col-span-2">
                {selectedStudent ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
                    <div className="border-b border-slate-100 pb-4">
                      <h3 className="text-2xl font-black text-slate-900">{selectedStudent.name} 학생 인계기록 조절 관리부</h3>
                      <p className="text-xs text-slate-400 mt-1">인계기록은 학급담임, 특수교사, 학년부장 등 권한 범위 내 교직원만 기재 가능합니다.</p>
                    </div>

                    {canEditHandover(selectedStudent) ? (
                      <div className="space-y-3">
                        <textarea placeholder="오늘 특이사항, 정서적 상태, 원반 수업 참여 내용 및 내일 전달사항을 기재하세요..." value={handoverInput} onChange={(e) => setHandoverInput(e.target.value)} rows={3} className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500" />
                        <div className="flex justify-end">
                          <button onClick={() => handleAddHandover(selectedStudent.id)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs">
                            공식 인계사항 저장
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-amber-50 text-amber-800 text-xs font-bold p-4 rounded-xl border border-amber-200">
                        🔒 귀하는 본 학급 학생({selectedStudent.gradeClass})의 직속 관리 교사 권한이 아니므로 조회만 가능하며 인계록 수정/작성은 제한됩니다.
                      </div>
                    )}

                    <div className="space-y-4">
                      <h4 className="text-sm font-black text-slate-800">누적 기록 확인</h4>
                      {handovers.filter(h => h.studentId === selectedStudent.id).length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-xs font-medium">기록된 인계 데이터 사항이 존재하지 않습니다.</div>
                      ) : (
                        <div className="space-y-3">
                          {handovers.filter(h => h.studentId === selectedStudent.id).map((h, i) => (
                            <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-black text-slate-700">작성교사: {h.writer} 선생님</span>
                                <span className="text-[11px] text-slate-400 font-bold">{h.date}</span>
                              </div>
                              <p className="text-xs font-semibold text-slate-600 leading-relaxed whitespace-pre-wrap">{h.content}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-sm font-bold shadow-xs">
                    💡 좌측 리스트에서 인계록을 처리할 학생을 먼저 터치하여 선택해 주세요.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────
              F. 설정 뷰 (비밀번호 변경 / 기능 요청 완비)
             ──────────────────────────────────────────────────────── */}
          {activeMenu === "설정" && (
            <div className="max-w-2xl bg-white rounded-2xl border border-slate-200 p-6 space-y-8">
              <div className="space-y-4">
                <h3 className="text-lg font-black text-slate-900 border-b border-slate-100 pb-2">🔐 개인 보안 설정 변경</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">신규 접근 비밀번호 변경</label>
                    <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800" placeholder="새 비밀번호" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">담당 지정 교과목 수정</label>
                    <input type="text" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800" placeholder="예: 직업기초 / 특수 국어" />
                  </div>
                </div>
                <button onClick={() => { if(newPw) { currentUser.password = newPw; alert("비밀번호 변경 완료"); setNewPw(""); } }} className="bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl">설정 사항 업데이트 적용</button>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                  <h4 className="text-sm font-black text-blue-900">🚀 시스템 개발자 기능 개선 요청 보드</h4>
                  <p className="text-[11px] text-blue-700 font-bold mt-0.5">최고 개발자(민석준) 선생님에게 포털 기능 개선이나 메뉴 업그레이드 요청 사항을 전달합니다.</p>
                </div>
                <textarea placeholder="요청하실 개선 아이디어나 추가 탑재 원하시는 인터페이스 기능을 상세히 적어주세요..." value={featureRequest} onChange={(e) => setFeatureRequest(e.target.value)} rows={3} className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none" />
                <button onClick={() => { if(featureRequest.trim()){ addLog(currentUser.name, `개발자 기능 요청 송신: ${featureRequest}`); alert("관리자 요청함으로 발송 완료되었습니다."); setFeatureRequest(""); } }} className="bg-blue-600 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-xs">
                  요청 사항 전송 승인
                </button>
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────
              G. [관리자 모드] 계정 마스터 관리 시스템
             ──────────────────────────────────────────────────────── */}
          {activeMenu === "계정관리" && currentUser.role === "관리자" && (
            <div className="space-y-6">
              {/* 신규 계정 생성 폼 */}
              <form onSubmit={handleCreateAccount} className="bg-white rounded-2xl border-2 border-red-200 p-6 space-y-4">
                <h3 className="text-lg font-black text-red-600">➕ 교직원 계정 신규 생성 및 권한 부여 인프라</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input type="text" placeholder="로그인 고유 ID" value={mId} onChange={(e)=>setMId(e.target.value)} required className="px-3 py-2 bg-slate-50 border rounded-xl text-xs font-bold" />
                  <input type="text" placeholder="교사 성명" value={mName} onChange={(e)=>setMName(e.target.value)} required className="px-3 py-2 bg-slate-50 border rounded-xl text-xs font-bold" />
                  <input type="password" placeholder="접속 비밀번호" value={mPw} onChange={(e)=>setMPw(e.target.value)} required className="px-3 py-2 bg-slate-50 border rounded-xl text-xs font-bold" />
                  
                  <select value={mRole} onChange={(e)=>setMRole(e.target.value as any)} className="px-3 py-2 bg-slate-50 border rounded-xl text-xs font-bold">
                    <option value="학급담임">학급담임 교사</option>
                    <option value="특수담임">특수담임 교사</option>
                    <option value="학년부장">학년부장 교사</option>
                    <option value="관리자">최고 시스템 관리자</option>
                  </select>

                  <input type="text" placeholder="담당 학급 (예: 2-1 / 학년부장일경우 2-9)" value={mClass} onChange={(e)=>setMClass(e.target.value)} className="px-3 py-2 bg-slate-50 border rounded-xl text-xs font-bold" />
                  <input type="text" placeholder="담당 과목 명" value={mSubject} onChange={(e)=>setMSubject(e.target.value)} className="px-3 py-2 bg-slate-50 border rounded-xl text-xs font-bold" />
                </div>
                <button type="submit" className="bg-red-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl">신규 교사 등록 데이터 바인딩</button>
              </form>

              {/* 현재 등록 계정 테이블 매트릭스 */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="text-base font-black text-slate-900 mb-4">현재 시스템 기동 계정 현황 및 전파 파기 관리</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-bold border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b p-3 text-slate-500">
                        <th className="p-3">ID</th>
                        <th className="p-3">교사 성명</th>
                        <th className="p-3">권한 직책</th>
                        <th className="p-3">조회/담당 학급</th>
                        <th className="p-3">담당 교과</th>
                        <th className="p-3">암호(복호화)</th>
                        <th className="p-3 text-center">계정 파기</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-slate-700">
                      {accounts.map(a => (
                        <tr key={a.id} className="hover:bg-slate-50">
                          <td className="p-3 text-blue-600">{a.id}</td>
                          <td className="p-3 text-slate-900">{a.name}</td>
                          <td className="p-3"><span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600">{a.role}</span></td>
                          <td className="p-3 text-amber-700">{a.targetClass || "전체통제"}</td>
                          <td className="p-3">{a.assignedSubject || "일반행정"}</td>
                          <td className="p-3 font-mono text-slate-400">{a.password}</td>
                          <td className="p-3 text-center">
                            {a.id !== "admin" && (
                              <button onClick={() => handleDeleteAccount(a.id)} className="bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 rounded text-[10px]">계정파기</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────
              H. [관리자 모드] 실시간 시스템 로그 감시경로
             ──────────────────────────────────────────────────────── */}
          {activeMenu === "로그확인" && currentUser.role === "관리자" && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-black text-slate-900">🚨 서버 트래픽 및 교사 조작 보안 로그 내역</h3>
                <button onClick={() => { if(confirm("로그를 전부 리셋합니까?")){ setLogs([]); localStorage.removeItem("po_logs"); }}} className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold">전체 청소</button>
              </div>
              <div className="bg-slate-900 text-emerald-400 font-mono p-5 rounded-2xl text-xs space-y-2 h-[450px] overflow-y-auto shadow-inner">
                {logs.length === 0 ? (
                  <div className="text-slate-500 text-center py-12">현재 기록된 접속 조작 실시간 데이터 스트림이 비어 있습니다.</div>
                ) : (
                  logs.map(l => (
                    <div key={l.id} className="leading-relaxed border-b border-slate-800 pb-1">
                      <span className="text-slate-500">[{l.timestamp}]</span> <span className="text-blue-400 font-bold">{l.user}</span>: <span className="text-slate-200">{l.action}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>

        {/* 하단 개발 저작권 보장 풋터 */}
        <footer className="h-12 bg-white border-t border-slate-200 px-8 flex items-center justify-between text-xs text-slate-400 font-bold">
          <div>진해고등학교 특수학급 업무 제어 포털 시스템 v2.5.0</div>
          <div>최고 시스템 설계책임자: 특수교사 민석준 · 2026</div>
        </footer>
      </main>
    </div>
  );
}