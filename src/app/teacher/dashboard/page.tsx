"use client";

import { useState, useEffect, useCallback } from "react";

// --- 데이터 규격 정의 (학생 앱 /api/sheets-data와 완벽 연동) ---
interface TimelineItem {
  period: string;
  subject: string;
  teacher: string;
  location: string;
}

interface Student {
  id: string; // 학번
  name: string;
  homeroom: string;
  gradeClass: string;
}

interface UserAccount {
  id: string;        // 이름+담당학급 (예: 김대홍201) / 관리자(admin, 민석준)
  name: string;      // 교사이름
  role: "특수담임" | "학급담임" | "학년부장" | "관리자";
  targetClass: string; // 담당학급 (예: "2-1", "2-9", "전체")
  password: string;  // 4자리 비밀번호
  subject?: string;  // 담당교과
}

interface BoardPost {
  id: string;
  title: string;
  content: string;
  author: string;
  date: string;
  allowedTeachers: string[]; // 열람/댓글 가능 교사 ID 목록 ("all" 또는 ID 배열)
  comments: BoardComment[];
}

interface BoardComment {
  id: string;
  author: string;
  content: string;
  date: string;
}

interface HandoverItem {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  author: string;
  content: string;
}

interface SystemLog {
  id: string;
  time: string;
  user: string;
  action: string;
}

// --- 초기 마스터 데이터 (Fallback 및 계정 초기값) ---
const INITIAL_STUDENTS: Student[] = [
  { id: "20110", name: "김한얼", homeroom: "김대홍", gradeClass: "2-1" },
  { id: "20121", name: "이정준", homeroom: "김대홍", gradeClass: "2-1" },
  { id: "20306", name: "김현중", homeroom: "김수민", gradeClass: "2-3" },
  { id: "20311", name: "박진현", homeroom: "김수민", gradeClass: "2-3" },
  { id: "20402", name: "강민준", homeroom: "정은영", gradeClass: "2-4" },
  { id: "20406", name: "김세현", homeroom: "정은영", gradeClass: "2-4" },
  { id: "20418", name: "손민찬", homeroom: "정은영", gradeClass: "2-4" },
  { id: "20612", name: "손찬信", homeroom: "서한성", gradeClass: "2-6" },
  { id: "20616", name: "오승철", homeroom: "서한성", gradeClass: "2-6" },
  { id: "20813", name: "박찬석", homeroom: "여지언", gradeClass: "2-8" },
  { id: "20906", name: "김재원", homeroom: "서용환", gradeClass: "2-9" },
  { id: "21026", name: "조연우", homeroom: "강지영", gradeClass: "2-10" },
  { id: "21027", name: "최재범", homeroom: "강지영", gradeClass: "2-10" },
];

const INITIAL_ACCOUNTS: UserAccount[] = [
  { id: "민석준", name: "민석준", role: "관리자", targetClass: "전체", password: "msj2026!!@", subject: "시스템관리" },
  { id: "admin", name: "관리자", role: "관리자", targetClass: "전체", password: "msj2026!!@", subject: "시스템관리" },
  { id: "김대홍201", name: "김대홍", role: "학급담임", targetClass: "2-1", password: "1111", subject: "수학" },
  { id: "김수민203", name: "김수민", role: "학급담임", targetClass: "2-3", password: "1111", subject: "수학" },
  { id: "정은영204", name: "정은영", role: "학급담임", targetClass: "2-4", password: "1111", subject: "미술" },
  { id: "서한성206", name: "서한성", role: "학급담임", targetClass: "2-6", password: "1111", subject: "지구과학" },
  { id: "여지언208", name: "여지언", role: "학급담임", targetClass: "2-8", password: "1111", subject: "생명과학" },
  { id: "서용환209", name: "서용환", role: "학년부장", targetClass: "2-9", password: "1111", subject: "화학" },
  { id: "강지영210", name: "강지영", role: "학급담임", targetClass: "2-10", password: "1111", subject: "국어" },
];

export default function IntegratedTeacherPortal() {
  // --- 핵심 상태 관리 ---
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [currentMenu, setCurrentMenu] = useState<"dashboard" | "studentSearch" | "board" | "handover" | "settings" | "accountMgmt" | "logMgmt">("dashboard");
  
  // 구글 시트 연동 시간표 데이터 저장용
  const [sheetSchedules, setSheetSchedules] = useState<Record<string, { currentSubject: string; currentRoom: string; timeline: TimelineItem[] }>>({});
  const [isSyncing, setIsSyncing] = useState(false);

  // 로컬 보존 게시판, 인계록, 로그 상태
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [handovers, setHandovers] = useState<HandoverItem[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);

  // 로그인 폼 입력값
  const [inputIdx, setInputIdx] = useState("");
  const [inputPw, setInputPw] = useState("");

  // 상세 모달 상태
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // 입력용 임시 서브 상태들
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostTargets, setNewPostTargets] = useState<string[]>(["all"]);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [handoverInputs, setHandoverInputs] = useState<Record<string, string>>({});

  // 설정 페이지 비밀번호 및 교과목 변경
  const [changePw, setChangePw] = useState("");
  const [changeSubj, setChangeSubj] = useState("");
  const [reqText, setReqText] = useState("");

  // 계정관리 (신규 등록 임시값)
  const [newAccId, setNewAccId] = useState("");
  const [newAccName, setNewAccName] = useState("");
  const [newAccRole, setNewAccRole] = useState<"특수담임" | "학급담임" | "학년부장" | "관리자">("학급담임");
  const [newAccClass, setNewAccClass] = useState("2-1");
  const [newAccPw, setNewAccPw] = useState("1111");
  const [newAccSubj, setNewAccSubj] = useState("");

  // --- 1. 최초 로드 시 LocalStorage 로직 (창을 이동하거나 새로고침해도 무조건 보존) ---
  useEffect(() => {
    const savedAcc = localStorage.getItem("zh_accounts");
    if (savedAcc) setAccounts(JSON.parse(savedAcc));
    else {
      setAccounts(INITIAL_ACCOUNTS);
      localStorage.setItem("zh_accounts", JSON.stringify(INITIAL_ACCOUNTS));
    }

    const savedPosts = localStorage.getItem("zh_posts");
    if (savedPosts) setPosts(JSON.parse(savedPosts));

    const savedHandovers = localStorage.getItem("zh_handovers");
    if (savedHandovers) setHandovers(JSON.parse(savedHandovers));

    const savedLogs = localStorage.getItem("zh_logs");
    if (savedLogs) setLogs(JSON.parse(savedLogs));

    const savedSession = localStorage.getItem("zh_current_user");
    if (savedSession) setCurrentUser(JSON.parse(savedSession));
  }, []);

  // --- 2. 구글 스프레드시트 실시간 동기화 연동 ---
  const fetchGoogleSheetData = useCallback(async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/sheets-data", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.schedules) {
          setSheetSchedules(data.schedules);
        }
      }
    } catch (error) {
      console.error("구글 시트 실시간 바인딩 실패 - 템플릿 모드로 유지됩니다.", error);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // 로그인 성공 시 실시간 시트 주기적 갱신 트리거
  useEffect(() => {
    if (currentUser) {
      fetchGoogleSheetData();
      const syncInterval = setInterval(fetchGoogleSheetData, 30000); // 30초 간격 자동 동기화
      return () => clearInterval(syncInterval);
    }
  }, [currentUser, fetchGoogleSheetData]);

  // --- 3. 시스템 로그 기록 함수 ---
  const writeLog = (user: string, action: string) => {
    const newLog: SystemLog = {
      id: String(Date.now()),
      time: new Date().toLocaleString("ko-KR"),
      user,
      action,
    };
    setLogs((prev) => {
      const updated = [newLog, ...prev];
      localStorage.setItem("zh_logs", JSON.stringify(updated));
      return updated;
    });
  };

  // --- 4. 로그인 / 로그아웃 제어 ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const found = accounts.find((a) => a.id === inputIdx && a.password === inputPw);
    if (found) {
      setCurrentUser(found);
      localStorage.setItem("zh_current_user", JSON.stringify(found));
      writeLog(found.name, "시스템 로그인 성공");
      setInputIdx("");
      setInputPw("");
      setCurrentMenu("dashboard");
    } else {
      alert("아이디 또는 비밀번호를 다시 확인해 주세요.");
    }
  };

  const handleLogout = () => {
    if (currentUser) {
      writeLog(currentUser.name, "시스템 로그아웃 실행");
    }
    setCurrentUser(null);
    localStorage.removeItem("zh_current_user");
  };

  // --- 5. 게시판 기능 (글쓰기 / 지정교사 타겟팅 / 댓글달기) ---
  const handleCreatePost = () => {
    if (!newPostTitle.trim() || !newPostContent.trim() || !currentUser) return;
    
    // 특수교사(특수담임) 및 관리자만 공지 권한 부여
    if (currentUser.role !== "특수담임" && currentUser.role !== "관리자") {
      alert("게시판 공지글 작성 권한이 없습니다. (담임 교사는 댓글만 참여 가능)");
      return;
    }

    const newPost: BoardPost = {
      id: String(Date.now()),
      title: newPostTitle,
      content: newPostContent,
      author: currentUser.name,
      date: new Date().toLocaleDateString("ko-KR"),
      allowedTeachers: newPostTargets,
      comments: [],
    };

    setPosts((prev) => {
      const updated = [newPost, ...prev];
      localStorage.setItem("zh_posts", JSON.stringify(updated));
      return updated;
    });

    writeLog(currentUser.name, `공지사항 게시글 등록: ${newPostTitle}`);
    setNewPostTitle("");
    setNewPostContent("");
    setNewPostTargets(["all"]);
    alert("공지글이 정상 등록되었습니다.");
  };

  const handleAddComment = (postId: string) => {
    const text = commentInputs[postId];
    if (!text || !text.trim() || !currentUser) return;

    setPosts((prev) => {
      const updated = prev.map((p) => {
        if (p.id === postId) {
          const newComment: BoardComment = {
            id: String(Date.now()),
            author: currentUser.name,
            content: text,
            date: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
          };
          return { ...p, comments: [...p.comments, newComment] };
        }
        return p;
      });
      localStorage.setItem("zh_posts", JSON.stringify(updated));
      return updated;
    });

    writeLog(currentUser.name, "공지글 피드백 댓글 작성");
    setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
  };

  // --- 6. 인계록 기능 (학생별 작성 및 누적 보존) ---
  const handleSaveHandover = (studentId: string, studentName: string) => {
    const content = handoverInputs[studentId];
    if (!content || !content.trim() || !currentUser) return;

    // 학년부장의 타 학급 제한조건 체크
    if (currentUser.role === "학년부장" && currentUser.targetClass !== INITIAL_STUDENTS.find(s=>s.id === studentId)?.gradeClass) {
      alert("학년부장 권한: 본인 담당 학급 외의 타 학급 학생 인계록은 조회만 가능합니다.");
      return;
    }
    // 학급담임의 타 학급 제한조건 체크
    if (currentUser.role === "학급담임" && currentUser.targetClass !== INITIAL_STUDENTS.find(s=>s.id === studentId)?.gradeClass) {
      alert("학급담임 권한: 본인 반 학생의 인계록만 편집할 수 있습니다.");
      return;
    }

    const newItem: HandoverItem = {
      id: String(Date.now()),
      studentId,
      studentName,
      date: new Date().toLocaleString("ko-KR"),
      author: `${currentUser.name} (${currentUser.role})`,
      content: content,
    };

    setHandovers((prev) => {
      const updated = [newItem, ...prev];
      localStorage.setItem("zh_handovers", JSON.stringify(updated));
      return updated;
    });

    writeLog(currentUser.name, `${studentName} 학생 연계 인계록 작성`);
    setHandoverInputs((prev) => ({ ...prev, [studentId]: "" }));
    alert("인계 내역이 기록 및 영구 저장되었습니다.");
  };

  // --- 7. 설정 변경 (자신의 암호 / 과목 변경 및 기능 요청) ---
  const handleUpdateProfile = () => {
    if (!currentUser) return;
    let updatedPw = currentUser.password;
    let updatedSubj = currentUser.subject || "";

    if (changePw.trim()) {
      if (changePw.length < 4) {
        alert("비밀번호는 최소 4자리 이상이어야 합니다.");
        return;
      }
      updatedPw = changePw;
    }
    if (changeSubj.trim()) {
      updatedSubj = changeSubj;
    }

    const updatedAccounts = accounts.map((a) => {
      if (a.id === currentUser.id) {
        return { ...a, password: updatedPw, subject: updatedSubj };
      }
      return a;
    });

    setAccounts(updatedAccounts);
    localStorage.setItem("zh_accounts", JSON.stringify(updatedAccounts));

    const nextUser = { ...currentUser, password: updatedPw, subject: updatedSubj };
    setCurrentUser(nextUser);
    localStorage.setItem("zh_current_user", JSON.stringify(nextUser));

    writeLog(currentUser.name, "교사 본인 계정 정보 및 패스워드 변경");
    setChangePw("");
    setChangeSubj("");
    alert("개인 정보가 안전하게 수정되었습니다.");
  };

  const handleSendRequest = () => {
    if (!reqText.trim() || !currentUser) return;
    writeLog(currentUser.name, `[기능개선요청 제출]: ${reqText}`);
    setReqText("");
    alert("관리자에게 기능 업그레이드 요청이 전달되었습니다.");
  };

  // --- 8. 최고 관리자 전용 계정 제어 포털 (계정 생성/삭제/권한 강제변조) ---
  const handleCreateAccountAdmin = () => {
    if (!newAccId.trim() || !newAccName.trim()) {
      alert("아이디와 교사명을 모두 기입해주세요.");
      return;
    }
    if (accounts.some((a) => a.id === newAccId)) {
      alert("이미 사용중인 교직원 계정 ID입니다.");
      return;
    }

    const newAcc: UserAccount = {
      id: newAccId,
      name: newAccName,
      role: newAccRole,
      targetClass: newAccClass,
      password: newAccPw,
      subject: newAccSubj || "미지정",
    };

    const updated = [...accounts, newAcc];
    setAccounts(updated);
    localStorage.setItem("zh_accounts", JSON.stringify(updated));
    writeLog("최고관리자", `새 교직원 계정 생성 완료: ${newAccName} (${newAccId})`);
    
    setNewAccId("");
    setNewAccName("");
    setNewAccSubj("");
    alert("새로운 교직원 마스터 계정이 등록되었습니다.");
  };

  const handleDeleteAccountAdmin = (id: string, name: string) => {
    if (id === "민석준" || id === "admin") {
      alert("시스템 핵심 마스터 관리자 계정은 파기할 수 없습니다.");
      return;
    }
    if (!confirm(`${name} 교사의 마스터 권한 및 계정을 즉시 파기하시겠습니까?`)) return;

    const updated = accounts.filter((a) => a.id !== id);
    setAccounts(updated);
    localStorage.setItem("zh_accounts", JSON.stringify(updated));
    writeLog("최고관리자", `교직원 계정 긴급 영구 파기: ${name}`);
  };

  // --- 9. 권한별 조회 필터링 핵심 비즈니스 로직 ---
  const getVisibleStudents = () => {
    if (!currentUser) return [];
    // 특수담임 및 최고관리자는 전체 학생 통제 및 관제 가능
    if (currentUser.role === "특수담임" || currentUser.role === "관리자") {
      return INITIAL_STUDENTS;
    }
    // 학급담임과 학년부장은 본인 해당 학반 학생 카드만 가시적으로 필터 배치
    return INITIAL_STUDENTS.filter((s) => s.gradeClass === currentUser.targetClass);
  };

  // --- 외부 로그인 레이아웃 (인증 인프라 비로그인 시 강제 바인딩) ---
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center p-4 font-sans selection:bg-blue-200">
        <div className="bg-white max-w-lg w-full rounded-3xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all">
          <div className="bg-gradient-to-r from-[#1E40AF] to-[#2563EB] p-8 text-center text-white relative">
            <div className="text-5xl mb-3 drop-shadow-md">🏫</div>
            <h1 className="text-2xl font-black tracking-tight">진해고등학교 통합교육지원</h1>
            <p className="text-xs opacity-90 mt-1.5 font-medium tracking-wide">교직원 업무포털 및 실시간 데이터 관제 시스템</p>
          </div>
          
          <form onSubmit={handleLogin} className="p-8 space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">교직원 사용자 ID</label>
              <input 
                type="text" 
                placeholder="예: 김대홍201 또는 민석준" 
                value={inputIdx} 
                onChange={(e) => setInputIdx(e.target.value)} 
                required 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-sm font-semibold placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-[#2563EB] transition-all" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">비밀번호 (초기값: 1111)</label>
              <input 
                type="password" 
                placeholder="지정된 암호 입력" 
                value={inputPw} 
                onChange={(e) => setInputPw(e.target.value)} 
                required 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-sm font-semibold placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-[#2563EB] transition-all" 
              />
            </div>
            
            <button type="submit" className="w-full bg-[#2563EB] hover:bg-[#1E40AF] text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-200 transition-all text-sm tracking-wide mt-2">
              교사 안전 인증 및 시스템 입장
            </button>
            <div className="text-center text-[11px] text-slate-400 font-medium">
              본 시스템은 진해고 학생용 모바일 화면과 실시간 파이프라인으로 연동됩니다.
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7FA] flex flex-col md:flex-row text-slate-800 antialiased font-sans">
      
      {/* =========================================================
          좌측 마스터 메인 행정 사이드바 (사용자 친화형 큰 아이콘 구조)
         ========================================================= */}
      <aside className="w-full md:w-72 bg-white border-r border-slate-200/80 flex flex-col justify-between shrink-0 shadow-sm relative z-10">
        <div>
          {/* 학교 마크 및 대형 타이틀 헤더 */}
          <div className="p-6 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100 text-center">
            <div className="text-4xl mb-2 drop-shadow-sm">🦅</div>
            <h2 className="font-black text-lg tracking-tight text-slate-900">진해고등학교</h2>
            <div className="inline-block mt-2 bg-blue-50 text-[#2563EB] text-[11px] font-extrabold px-3 py-1 rounded-full border border-blue-100">
              {currentUser.name} [{currentUser.role}]
            </div>
            {currentUser.role !== "관리자" && currentUser.role !== "특수담임" && (
              <div className="text-[11px] text-slate-500 font-bold mt-1.5">담당 반: {currentUser.targetClass}</div>
            )}
          </div>

          {/* 간결하고 명확한 대형 직관 메뉴 리스트 */}
          <nav className="p-4 space-y-1">
            <button 
              onClick={() => setCurrentMenu("dashboard")} 
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-black transition-all ${currentMenu === "dashboard" ? "bg-[#2563EB] text-white shadow-md shadow-blue-100" : "text-slate-600 hover:bg-slate-100"}`}
            >
              <span className="text-xl">🏠</span> 대시보드
            </button>

            <button 
              onClick={() => setCurrentMenu("studentSearch")} 
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-black transition-all ${currentMenu === "studentSearch" ? "bg-[#2563EB] text-white shadow-md shadow-blue-100" : "text-slate-600 hover:bg-slate-100"}`}
            >
              <span className="text-xl">👨‍🎓</span> 학생조회
            </button>

            <button 
              onClick={() => setCurrentMenu("board")} 
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-black transition-all ${currentMenu === "board" ? "bg-[#2563EB] text-white shadow-md shadow-blue-100" : "text-slate-600 hover:bg-slate-100"}`}
            >
              <span className="text-xl">📢</span> 게시판 공지
            </button>

            <button 
              onClick={() => setCurrentMenu("handover")} 
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-black transition-all ${currentMenu === "handover" ? "bg-[#2563EB] text-white shadow-md shadow-blue-100" : "text-slate-600 hover:bg-slate-100"}`}
            >
              <span className="text-xl">📝</span> 인계록 작성
            </button>

            <button 
              onClick={() => setCurrentMenu("settings")} 
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-black transition-all ${currentMenu === "settings" ? "bg-[#2563EB] text-white shadow-md shadow-blue-100" : "text-slate-600 hover:bg-slate-100"}`}
            >
              <span className="text-xl">⚙️</span> 포털 설정
            </button>

            {/* 최고 권한 행정 관리 기능 블록 (관리자 권한 진입 시 자동 확장) */}
            {(currentUser.role === "관리자" || currentUser.id === "민석준") && (
              <div className="pt-4 mt-4 border-t border-slate-100 space-y-1">
                <div className="px-4 text-[10px] font-black text-slate-400 tracking-wider uppercase mb-1">시스템 총괄 모드</div>
                <button 
                  onClick={() => setCurrentMenu("accountMgmt")} 
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-black transition-all ${currentMenu === "accountMgmt" ? "bg-purple-600 text-white" : "text-purple-600 hover:bg-purple-50"}`}
                >
                  <span>🔒</span> 계정 관리 마스터
                </button>
                <button 
                  onClick={() => setCurrentMenu("logMgmt")} 
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-black transition-all ${currentMenu === "logMgmt" ? "bg-purple-600 text-white" : "text-purple-600 hover:bg-purple-50"}`}
                >
                  <span>📋</span> 시스템 로그 관제
                </button>
              </div>
            )}
          </nav>
        </div>

        {/* 하단 시스템 종료 버튼 */}
        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <button 
            onClick={handleLogout} 
            className="w-full flex items-center justify-center gap-2 bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold py-3 rounded-xl text-xs transition-all border border-rose-200/50"
          >
            🚪 안전 로그아웃 종료
          </button>
        </div>
      </aside>

      {/* =========================================================
          우측 메인 메인 작업 워크스페이스 공간
         ========================================================= */}
      <main className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto">
        
        {/* 상단 툴바 관제 헤더 (구글 시트 연동 버튼 배치) */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-xs gap-4">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              {currentMenu === "dashboard" && "🏠 실시간 통합교육 대시보드"}
              {currentMenu === "studentSearch" && "👨‍🎓 우리반 통합학생 실시간 조회"}
              {currentMenu === "board" && "📢 교직원 상호 소통 알림장 게시판"}
              {currentMenu === "handover" && "📝 일별/학생별 특수학급 인계록 업무포털"}
              {currentMenu === "settings" && "⚙️ 개인 권한 정보 설정 변경"}
              {currentMenu === "accountMgmt" && "👑 [관리자 전용] 전 교사 마스터 계정 제어"}
              {currentMenu === "logMgmt" && "📋 [관리자 전용] 실시간 서버 프로세스 감사 로그"}
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {isSyncing ? "⏳ 구글 스프레드시트 최신 정보 동기화 처리 중..." : "✅ 구글 실시간 파이프라인 엔진 정상 작동 중"}
            </p>
          </div>
          
          <button 
            onClick={fetchGoogleSheetData} 
            disabled={isSyncing}
            className="w-full sm:w-auto bg-[#2563EB] hover:bg-[#1E40AF] text-white text-xs font-black px-4 py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
          >
            {isSyncing ? "동기화 진행 중..." : "🔄 구글 시트 실시간 강제 새로고침"}
          </button>
        </div>

        {/* ---------------------------------------------------------
            메뉴 1: 대시보드 (전체 카드 형식으로 직관적 레이아웃 완비)
           --------------------------------------------------------- */}
        {currentMenu === "dashboard" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getVisibleStudents().map((s) => {
                // 구글 시트 가공 API 데이터 우선 할당, 매핑 데이터 부재시 세이프티 가드 발동
                const scheduleInfo = sheetSchedules[s.id] || { currentSubject: "일과 외", currentRoom: "도움실/원반" };
                return (
                  <div 
                    key={s.id} 
                    onClick={() => setSelectedStudent(s)}
                    className="bg-white border-2 border-slate-200 hover:border-[#2563EB] p-6 rounded-2xl shadow-xs cursor-pointer transition-all hover:shadow-md flex flex-col justify-between group relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-2 h-full bg-slate-300 group-hover:bg-[#2563EB] transition-all" />
                    <div>
                      <div className="flex justify-between items-center text-xs font-bold text-slate-400 mb-3 pl-2">
                        <span>학번 {s.id}</span>
                        <span className="bg-slate-100 group-hover:bg-blue-50 text-slate-600 group-hover:text-[#2563EB] px-2.5 py-0.5 rounded-full text-[11px] font-black transition-all">
                          {s.gradeClass}
                        </span>
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 mb-4 pl-2">{s.name}</h3>
                      
                      <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-2 font-bold text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-400">현재 교과목</span>
                          <span className="text-[#2563EB]">{scheduleInfo.currentSubject}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-slate-200/50">
                          <span className="text-slate-400">수업 위치</span>
                          <span className="text-purple-600">{scheduleInfo.currentRoom}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-[11px] font-extrabold text-[#2563EB] mt-4 pt-2 border-t border-slate-50 tracking-tight">
                      전체 일과운영 시간표 조회 🔍
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------
            메뉴 2: 학생조회 (담당 학급 상세 정보 고도화 모드)
           --------------------------------------------------------- */}
        {currentMenu === "studentSearch" && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-black text-base text-slate-900">우리반 학생 현황판</h2>
              <p className="text-xs text-slate-400 font-medium mt-1">현재 실시간 위치 및 교과목, 담당원반 교사 매핑 리스트입니다.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-black text-slate-500 uppercase tracking-wider">
                    <th className="p-4 pl-6">학반</th>
                    <th className="p-4">학번</th>
                    <th className="p-4">성명</th>
                    <th className="p-4">원반 담임</th>
                    <th className="p-4">현재 교과목</th>
                    <th className="p-4">실시간 학습장소</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                  {getVisibleStudents().map((s) => {
                    const info = sheetSchedules[s.id] || { currentSubject: "일과 외", currentRoom: "원반/도움실" };
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-all">
                        <td className="p-4 pl-6 text-[#2563EB] font-black">{s.gradeClass}</td>
                        <td className="p-4 text-slate-400">{s.id}</td>
                        <td className="p-4 text-slate-900 text-sm font-black">{s.name}</td>
                        <td className="p-4 text-slate-500">{s.homeroom}</td>
                        <td className="p-4 text-[#2563EB]">{info.currentSubject}</td>
                        <td className="p-4">
                          <span className="bg-purple-50 text-purple-700 font-extrabold px-2.5 py-1 rounded-md border border-purple-100">
                            {info.currentRoom}
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

        {/* ---------------------------------------------------------
            메뉴 3: 게시판 (특수교사 공지등록 및 일반교사 전용 피드백 댓글 창)
           --------------------------------------------------------- */}
        {currentMenu === "board" && (
          <div className="space-y-6">
            {/* 글쓰기 영역: 특수담임 혹은 최고 관리자 직책만 개방 */}
            {(currentUser.role === "특수담임" || currentUser.role === "관리자") && (
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-4">
                <h3 className="font-black text-sm text-slate-900 flex items-center gap-1">
                  📝 공지글 작성 센터 <span className="text-xs font-bold text-[#2563EB]">(특수학급 마스터 전용)</span>
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  <input 
                    type="text" 
                    placeholder="공지 사항 및 긴급 전달 제목 입력" 
                    value={newPostTitle} 
                    onChange={(e) => setNewPostTitle(e.target.value)}
                    className="px-4 py-3 border border-slate-300 rounded-xl text-xs font-bold focus:outline-none focus:border-blue-500"
                  />
                  <textarea 
                    placeholder="수업 협의 및 학생 지도 지침 상세 기재..." 
                    rows={3}
                    value={newPostContent} 
                    onChange={(e) => setNewPostContent(e.target.value)}
                    className="p-4 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>
                
                {/* 권한 세분화 전용 지정교사 타겟팅 셀렉터 */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="text-xs font-bold text-slate-500">
                    🔒 열람 및 댓글 피드백 참여 허용 대상 지정:
                  </div>
                  <select 
                    multiple={false}
                    onChange={(e) => {
                      if (e.target.value === "all") setNewPostTargets(["all"]);
                      else setNewPostTargets([e.target.value]);
                    }}
                    className="text-xs font-bold bg-white border p-2 rounded-lg"
                  >
                    <option value="all">전체 교직원 공용 개방</option>
                    {accounts.filter(a=>a.role!=="관리자").map(a=>(
                      <option key={a.id} value={a.id}>{a.name} 교사 ({a.targetClass} 담임)</option>
                    ))}
                  </select>
                  <button 
                    onClick={handleCreatePost}
                    className="w-full sm:w-auto bg-[#2563EB] hover:bg-[#1E40AF] text-white text-xs font-black px-5 py-2.5 rounded-xl shadow-xs"
                  >
                    확인 및 공지 발령
                  </button>
                </div>
              </div>
            )}

            {/* 깔끔하게 정돈된 업무 포털 게시글 피드 스트림 */}
            <div className="space-y-4">
              {posts.filter(p => p.allowedTeachers.includes("all") || p.allowedTeachers.includes(currentUser.id) || p.author === currentUser.name || currentUser.role === "관리자").length === 0 ? (
                <div className="text-center py-16 bg-white border rounded-2xl text-slate-400 font-bold text-xs">
                  현재 조회 가능한 교직원 소통 공지사항이 없습니다.
                </div>
              ) : (
                posts.filter(p => p.allowedTeachers.includes("all") || p.allowedTeachers.includes(currentUser.id) || p.author === currentUser.name || currentUser.role === "관리자").map((post) => (
                  <div key={post.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
                    <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                      <div>
                        <span className="bg-blue-50 text-[#2563EB] text-[10px] font-black px-2 py-0.5 rounded-md border border-blue-100 mr-2">공지</span>
                        <h4 className="text-base font-black text-slate-900 inline-block">{post.title}</h4>
                        <div className="text-[11px] text-slate-400 font-bold mt-1">발신처: {post.author} 교사 | 등록일자: {post.date}</div>
                      </div>
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded font-bold">
                        {post.allowedTeachers.includes("all") ? "전체공개" : "지정 대상 교사 한정"}
                      </span>
                    </div>

                    <p className="text-xs font-medium text-slate-700 bg-slate-50/70 border p-4 rounded-xl whitespace-pre-wrap leading-relaxed">
                      {post.content}
                    </p>

                    {/* 댓글 및 협의 피드백 영역 */}
                    <div className="space-y-2 pt-2">
                      <div className="text-xs font-bold text-slate-400">💬 교직원 피드백 및 업무 협의 ({post.comments.length})</div>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {post.comments.map((c) => (
                          <div key={c.id} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100/60 flex justify-between text-xs font-semibold">
                            <div>
                              <span className="text-[#2563EB] font-black mr-2">[{c.author}]</span>
                              <span className="text-slate-700 font-medium">{c.content}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium">{c.date}</span>
                          </div>
                        ))}
                      </div>

                      {/* 댓글 쓰기 입력 */}
                      <div className="flex gap-2 pt-1">
                        <input 
                          type="text" 
                          placeholder="댓글 및 확인 여부를 입력하세요..." 
                          value={commentInputs[post.id] || ""}
                          onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                          onKeyDown={(e) => { if(e.key === "Enter") handleAddComment(post.id); }}
                          className="flex-1 bg-slate-50 border px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500"
                        />
                        <button 
                          onClick={() => handleAddComment(post.id)}
                          className="bg-slate-800 hover:bg-slate-900 text-white font-black text-xs px-4 py-2 rounded-xl"
                        >
                          등록
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------
            메뉴 4: 인계록 (학생 맞춤형 일대일 서술 기록 센터)
           --------------------------------------------------------- */}
        {currentMenu === "handover" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* 왼쪽 셀렉터 단 */}
            <div className="bg-white border p-4 rounded-2xl space-y-2 shadow-2xs">
              <h3 className="text-xs font-black text-slate-400 uppercase mb-3 pl-1">조회 및 기록 대상 선택</h3>
              <div className="space-y-1 max-h-[500px] overflow-y-auto">
                {getVisibleStudents().map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      // 임시 학년부장/담임 타반 검증 인터셉터 안내
                      if ((currentUser.role === "학급담임" || currentUser.role === "학년부장") && currentUser.targetClass !== s.gradeClass) {
                        alert("학년부장/학급담임 조회 정책: 타 학급 학생의 인계 이력은 우측 히스토리 보드에서 조회만 가능합니다.");
                      }
                      setSelectedStudent(s);
                    }}
                    className={`w-full text-left p-3.5 rounded-xl text-xs font-bold border transition-all flex justify-between items-center ${selectedStudent?.id === s.id ? "bg-purple-50 text-purple-700 border-purple-300 shadow-2xs" : "bg-slate-50 text-slate-700 hover:bg-white"}`}
                  >
                    <span>{s.name} ({s.id})</span>
                    <span className="text-[10px] bg-white border px-2 py-0.5 rounded text-slate-400">{s.gradeClass}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 오른쪽 인계록 작성 및 로그 히스토리 스트림 */}
            <div className="lg:col-span-2 space-y-4">
              {selectedStudent ? (
                <>
                  <div className="bg-white border p-6 rounded-2xl shadow-xs space-y-4">
                    <div className="border-b pb-2">
                      <h3 className="text-base font-black text-slate-900">{selectedStudent.name} 학생 인계서 기재</h3>
                      <p className="text-xs text-slate-400 font-medium">특수교사 및 일반 원반 교직원 공용 통합 관리 폼</p>
                    </div>

                    <textarea 
                      placeholder="학습 태도, 건강 상태, 하교 지도 특이사항 등 전달할 내용을 기록하세요..." 
                      rows={4}
                      value={handoverInputs[selectedStudent.id] || ""}
                      onChange={(e) => setHandoverInputs({ ...handoverInputs, [selectedStudent.id]: e.target.value })}
                      className="w-full p-4 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-purple-500"
                    />

                    <div className="text-right">
                      <button 
                        onClick={() => handleSaveHandover(selectedStudent.id, selectedStudent.name)}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-black px-6 py-3 rounded-xl shadow-xs"
                      >
                        {selectedStudent.name} 학생 인계사항 저장하기
                      </button>
                    </div>
                  </div>

                  {/* 타겟 학생 전용 인계 히스토리 보존 내역 */}
                  <div className="bg-white border p-6 rounded-2xl shadow-xs space-y-3">
                    <h4 className="text-xs font-black text-slate-400">📌 기존 보존 누적 인계 히스토리</h4>
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                      {handovers.filter(h => h.studentId === selectedStudent.id).length === 0 ? (
                        <div className="text-center py-8 text-xs text-slate-400 font-bold">기록 보존된 인계 내역이 없습니다.</div>
                      ) : (
                        handovers.filter(h => h.studentId === selectedStudent.id).map((item) => (
                          <div key={item.id} className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl space-y-2 text-xs">
                            <div className="flex justify-between font-bold text-[11px] text-slate-400">
                              <span>작성교사: {item.author}</span>
                              <span>{item.date}</span>
                            </div>
                            <p className="font-semibold text-slate-800 whitespace-pre-wrap leading-relaxed">{item.content}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-white border rounded-2xl p-16 text-center text-slate-400 font-bold text-xs shadow-2xs">
                  ← 좌측 학생 리스트에서 인계록을 기록/조회할 대상을 지정해 주십시오.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------
            메뉴 5: 설정 (개인정보 수정 및 직관적인 기능 개선 요청 폼)
           --------------------------------------------------------- */}
        {currentMenu === "settings" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border p-6 rounded-2xl shadow-xs space-y-4">
              <h3 className="font-black text-sm text-slate-900 border-b pb-2">🔒 교직원 보안 암호 및 담당정보 수정</h3>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-500 mb-1">교사 ID (변경 불가)</label>
                  <input type="text" disabled value={currentUser.id} className="w-full px-3 py-2 bg-slate-100 text-slate-400 border rounded-xl font-bold" />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">비밀번호 변경 (4자리 이상)</label>
                  <input type="password" placeholder="새로운 비밀번호 입력" value={changePw} onChange={(e) => setChangePw(e.target.value)} className="w-full px-3 py-2 border rounded-xl font-bold focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">담당 교과목 수정</label>
                  <input type="text" placeholder={currentUser.subject || "과목 미등록"} value={changeSubj} onChange={(e) => setChangeSubj(e.target.value)} className="w-full px-3 py-2 border rounded-xl font-bold focus:outline-none focus:border-blue-500" />
                </div>
                <button onClick={handleUpdateProfile} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-black py-3 rounded-xl text-xs shadow-xs transition-all">
                  개인 마스터 레코드 업데이트 수정
                </button>
              </div>
            </div>

            <div className="bg-white border p-6 rounded-2xl shadow-xs space-y-4">
              <h3 className="font-black text-sm text-slate-900 border-b pb-2">🚀 기능 고도화 및 업그레이드 요청 건의</h3>
              <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                관리자 및 개발자(민석준 선생님)에게 시스템 개선 요청 사항을 다이렉트로 상신합니다. 제출 시 실시간 프로세스 감사 로그에 기록됩니다.
              </p>
              <textarea 
                placeholder="예시: 알림장 출력 컴포넌트 추가 요청, 인계록 인쇄 기능 필요합니다..."
                rows={4}
                value={reqText}
                onChange={(e) => setReqText(e.target.value)}
                className="w-full p-4 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500"
              />
              <button onClick={handleSendRequest} className="w-full bg-[#2563EB] hover:bg-[#1E40AF] text-white font-black py-3 rounded-xl text-xs shadow-xs transition-all">
                개선 기능 건의 요청서 제출
              </button>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------
            메뉴 6: 계정 관리 마스터 (최고 관리자 민석준 전용 커맨드 센터)
           --------------------------------------------------------- */}
        {currentMenu === "accountMgmt" && (currentUser.role === "관리자" || currentUser.id === "민석준") && (
          <div className="space-y-6">
            {/* 계정 추가 생성 오퍼레이션 보드 */}
            <div className="bg-white border p-6 rounded-2xl shadow-xs space-y-4">
              <h3 className="font-black text-sm text-purple-700">🔐 통합 신규 교직원 마스터 권한 계정 생성</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs font-bold">
                <div>
                  <label className="block text-slate-500 mb-1">사용자 로그인 ID (예: 김대홍201)</label>
                  <input type="text" placeholder="아이디 입력" value={newAccId} onChange={(e) => setNewAccId(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">교직원 성명</label>
                  <input type="text" placeholder="이름 입력" value={newAccName} onChange={(e) => setNewAccName(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">직책 및 마스터 권한 등급</label>
                  <select value={newAccRole} onChange={(e) => setNewAccRole(e.target.value as any)} className="w-full px-3 py-2 border bg-white rounded-xl">
                    <option value="학급담임">학급담임 (본인 반 가시성 제한)</option>
                    <option value="학년부장">학년부장 (타 반 조회/본인 반 관리)</option>
                    <option value="특수담임">특수담임 (마스터 전 권한 부여)</option>
                    <option value="관리자">최고 관리자 포털 권한</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">배정 담당 학급 (예: 2-1)</label>
                  <input type="text" placeholder="2-1" value={newAccClass} onChange={(e) => setNewAccClass(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">초기 패스워드 설정</label>
                  <input type="text" value={newAccPw} onChange={(e) => setNewAccPw(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">배정 담당 교과목</label>
                  <input type="text" placeholder="원반과목" value={newAccSubj} onChange={(e) => setNewAccSubj(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
                </div>
              </div>
              <div className="text-right">
                <button onClick={handleCreateAccountAdmin} className="bg-purple-600 hover:bg-purple-700 text-white font-black text-xs px-5 py-3 rounded-xl shadow-xs">
                  + 새 교사 마스터 원격 계정 발급 승인
                </button>
              </div>
            </div>

            {/* 현재 등록 교직원 계정 파기 및 실시간 제어 리스트 */}
            <div className="bg-white border rounded-2xl shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50 border-b font-black text-xs text-slate-500">
                🏫 현재 발급 완료된 등록 교직원 마스터 명단 관리
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-bold">
                  <thead>
                    <tr className="bg-slate-100 border-b text-slate-500">
                      <th className="p-3 pl-6">ID</th>
                      <th className="p-3">성명</th>
                      <th className="p-3">직책(권한)</th>
                      <th className="p-3">담당 학급</th>
                      <th className="p-3">비밀번호</th>
                      <th className="p-3">담당 교과</th>
                      <th className="p-3 text-center">동작</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {accounts.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className="p-3 pl-6 text-[#2563EB] font-mono">{a.id}</td>
                        <td className="p-3 text-slate-900 font-black">{a.name}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${a.role === '관리자' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
                            {a.role}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500">{a.targetClass}</td>
                        <td className="p-3 font-mono text-slate-400">{a.password}</td>
                        <td className="p-3 text-slate-500">{a.subject || "-"}</td>
                        <td className="p-3 text-center">
                          <button 
                            onClick={() => handleDeleteAccountAdmin(a.id, a.name)}
                            className="bg-rose-50 text-rose-600 px-2 py-1 rounded text-[11px] hover:bg-rose-100 transition-all"
                          >
                            영구 파기
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------
            메뉴 7: 시스템 로그 관제 (서버 내 감사 추적 포털)
           --------------------------------------------------------- */}
        {currentMenu === "logMgmt" && (currentUser.role === "관리자" || currentUser.id === "민석준") && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-black text-sm text-slate-900">📑 행정 프로세스 및 접속 기록 추적 로그 감사</h3>
              <button 
                onClick={() => { if(confirm("감사 로그 전체를 초기화합니까?")){ setLogs([]); localStorage.removeItem("zh_logs"); } }}
                className="text-xs bg-slate-100 text-slate-500 px-3 py-1.5 rounded-xl font-bold hover:bg-slate-200"
              >
                로그 아카이브 전체 삭제
              </button>
            </div>
            <div className="bg-slate-900 text-emerald-400 p-4 rounded-xl h-96 overflow-y-auto font-mono text-[11px] space-y-1.5 shadow-inner">
              {logs.length === 0 ? (
                <div className="text-slate-500 text-center py-12 font-bold">기록된 감사 추적 이벤트가 존재하지 않습니다.</div>
              ) : (
                logs.map((l) => (
                  <div key={l.id} className="hover:bg-slate-800 py-0.5 px-1 rounded transition-all">
                    <span className="text-slate-500">[{l.time}]</span>{" "}
                    <span className="text-amber-300 font-bold">{l.user}</span>:{" "}
                    <span className="text-emerald-300">{l.action}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* =========================================================
          💡 하이라이트 전용 모달: 학생 선택 시 팝업 (학생 앱 타임라인 로직 완벽 100% 미러링)
         ========================================================= */}
      {selectedStudent && currentMenu === "dashboard" && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden transform transition-all flex flex-col max-h-[90vh]">
            
            {/* 모달 팝업 헤더 */}
            <div className="bg-gradient-to-r from-[#2563EB] to-[#1E40AF] p-6 text-white flex justify-between items-center shrink-0">
              <div>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-black tracking-wider uppercase">STUDENT PROFILE</span>
                <h3 className="text-xl font-black mt-1">{selectedStudent.name} ({selectedStudent.id}) 전체 일과</h3>
              </div>
              <button 
                onClick={() => setSelectedStudent(null)}
                className="bg-white/10 hover:bg-white/20 text-white font-bold w-9 h-9 flex items-center justify-center rounded-full text-sm transition-all"
              >
                ✕
              </button>
            </div>

            {/* 모달 본문 (스크롤 대응 및 학생 시간표 로직 이식 완료) */}
            <div className="p-6 overflow-y-auto space-y-6">
              
              {/* 타임라인 가공 테이블 */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">📅 오늘 자 일과 시간표 운영 현황</h4>
                  <span className="text-[11px] text-[#2563EB] font-bold">학생용 화면과 동일한 원격 싱크</span>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b font-black text-slate-500">
                        <th className="p-3 pl-4">교시</th>
                        <th className="p-3">교과목명</th>
                        <th className="p-3">담당교사</th>
                        <th className="p-3">학습이동장소</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                      {(sheetSchedules[selectedStudent.id]?.timeline || [
                        { period: "1교시 (08:40)", subject: "지정 시간표 없음", teacher: "-", location: "원반 대기" },
                        { period: "2교시 (09:40)", subject: "지정 시간표 없음", teacher: "-", location: "원반 대기" },
                        { period: "3교시 (10:40)", subject: "지정 시간표 없음", teacher: "-", location: "원반 대기" },
                        { period: "4교시 (11:40)", subject: "지정 시간표 없음", teacher: "-", location: "원반 대기" },
                        { period: "5교시 (13:10)", subject: "지정 시간표 없음", teacher: "-", location: "원반 대기" },
                        { period: "6교시 (14:10)", subject: "지정 시간표 없음", teacher: "-", location: "원반 대기" },
                        { period: "7교시 (15:10)", subject: "지정 시간표 없음", teacher: "-", location: "원반 대기" },
                      ]).map((t, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="p-3 pl-4"><span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px]">{t.period}</span></td>
                          <td className="p-3 text-slate-900 text-sm font-black">{t.subject}</td>
                          <td className="p-3 text-slate-500">{t.teacher || "-"}</td>
                          <td className="p-3">
                            <span className="bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded border border-purple-100 text-[11px]">
                              {t.location}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* 모달 하단 닫기 툴바 */}
            <div className="p-4 bg-slate-50 border-t flex justify-end shrink-0">
              <button 
                onClick={() => setSelectedStudent(null)}
                className="bg-slate-800 hover:bg-slate-900 text-white font-black text-xs px-5 py-2.5 rounded-xl transition-all"
              >
                모달 대화상자 닫기
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}