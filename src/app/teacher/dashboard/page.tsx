"use client";

import { useState, useEffect, useCallback } from "react";

// --- 데이터 규격 정의 ---
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
  name: string;      // 교사 이름
  role: "특수담임" | "학급담임" | "학년부장" | "관리자";
  targetClass: string; // 담당학급 (예: "2-1", "2-9", "전체")
  password: string;  // 비밀번호
  subject?: string;   // 담당교과
}

interface BoardPost {
  id: string;
  title: string;
  content: string;
  authorId: string;   // 작성자 계정 ID (삭제 권한 검증용)
  authorName: string; // 작성자 이름
  date: string;
  allowedTargets: string[]; // "all"(전체), "특수담임", "학년부장" 또는 개별 교사 ID 배열
  comments: BoardComment[];
}

interface BoardComment {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  date: string;
}

interface HandoverItem {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  content: string;
}

interface SystemLog {
  id: string;
  time: string;
  user: string;
  action: string;
}

// --- 마스터 데이터 (초기 복구용) ---
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
  { id: "민석준", name: "민석준", role: "관리자", targetClass: "전체", password: "msj2026!!@", subject: "특수교육" },
  { id: "admin", name: "관리자", role: "관리자", targetClass: "전체", password: "1111", subject: "시스템" },
  { id: "김대홍201", name: "김대홍", role: "학급담임", targetClass: "2-1", password: "1111", subject: "원반과목" },
  { id: "김수민203", name: "김수민", role: "학급담임", targetClass: "2-3", password: "1111", subject: "원반과목" },
  { id: "정은영204", name: "정은영", role: "학급담임", targetClass: "2-4", password: "1111", subject: "원반과목" },
  { id: "서한성206", name: "서한성", role: "학급담임", targetClass: "2-6", password: "1111", subject: "원반과목" },
  { id: "여지언208", name: "여지언", role: "학급담임", targetClass: "2-8", password: "1111", subject: "원반과목" },
  { id: "서용환209", name: "서용환", role: "학년부장", targetClass: "2-9", password: "1111", subject: "원반과목" },
  { id: "강지영210", name: "강지영", role: "학급담임", targetClass: "2-10", password: "1111", subject: "원반과목" },
];

export default function IntegratedTeacherPortal() {
  // --- 핵심 상태 관리 ---
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [currentMenu, setCurrentMenu] = useState<"dashboard" | "studentSearch" | "board" | "handover" | "settings" | "accountMgmt" | "logMgmt">("dashboard");
  
  const [sheetSchedules, setSheetSchedules] = useState<Record<string, { currentSubject: string; currentRoom: string; timeline: TimelineItem[] }>>({});
  const [isSyncing, setIsSyncing] = useState(false);

  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [handovers, setHandovers] = useState<HandoverItem[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);

  // 로그인 관련
  const [inputIdx, setInputIdx] = useState("");
  const [inputPw, setInputPw] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // 게시판 작성 임시 상태
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostTargets, setNewPostTargets] = useState<string[]>(["all"]); // 기본값 전체공개

  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [handoverInputs, setHandoverInputs] = useState<Record<string, string>>({});

  // 내 설정 수정
  const [changePw, setChangePw] = useState("");
  const [changeSubj, setChangeSubj] = useState("");
  const [reqText, setReqText] = useState("");

  // 관리자 전용 - 계정 추가 임시 상태
  const [newAccId, setNewAccId] = useState("");
  const [newAccName, setNewAccName] = useState("");
  const [newAccRole, setNewAccRole] = useState<"특수담임" | "학급담임" | "학년부장" | "관리자">("학급담임");
  const [newAccClass, setNewAccClass] = useState("2-1");
  const [newAccPw, setNewAccPw] = useState("1111");
  const [newAccSubj, setNewAccSubj] = useState("");

  // 관리자 전용 - 계정 수정 선택 상태
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editAccName, setEditAccName] = useState("");
  const [editAccRole, setEditAccRole] = useState<"특수담임" | "학급담임" | "학년부장" | "관리자">("학급담임");
  const [editAccClass, setEditAccClass] = useState("");
  const [editAccPw, setEditAccPw] = useState("");
  const [editAccSubj, setEditAccSubj] = useState("");

  // --- 1. LocalStorage 기반 영구 보존 로직 ---
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
  if (savedSession) {
  const parsedUser = JSON.parse(savedSession);
  // 권한 검증 안전장치 추가
  if (["특수담임", "학급담임", "학년부장", "관리자"].includes(parsedUser?.role)) {
    setCurrentUser(parsedUser);
  } else {
    // 잘못된 데이터 발견 시 초기화
    localStorage.removeItem("zh_current_user");
    setCurrentUser(null);
  }
}
  }, []);

  // --- 2. 구글 스프레드시트 연동 API 호출 ---
  const fetchGoogleSheetData = useCallback(async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/sheets-data", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.schedules) setSheetSchedules(data.schedules);
      }
    } catch (error) {
      console.error("구글 시트 연동 실패 - Fallback 데이터 유지", error);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchGoogleSheetData();
      const syncInterval = setInterval(fetchGoogleSheetData, 30000);
      return () => clearInterval(syncInterval);
    }
  }, [currentUser, fetchGoogleSheetData]);

  // --- 3. 시스템 로그 기록 ---
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

  // --- 4. 로그인 / 로그아웃 ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const found = accounts.find((a) => a.id === inputIdx && a.password === inputPw);
    if (found) {
      setCurrentUser(found);
      localStorage.setItem("zh_current_user", JSON.stringify(found));
      writeLog(found.name, "로그인 성공");
      setInputIdx("");
      setInputPw("");
      setCurrentMenu("dashboard");
    } else {
      alert("ID 혹은 패스워드가 다릅니다.");
    }
  };

  const handleLogout = () => {
    if (currentUser) writeLog(currentUser.name, "로그아웃 완료");
    setCurrentUser(null);
    localStorage.removeItem("zh_current_user");
  };

  // --- 5. 게시판 알림 공지 및 다중 타겟 권한 지정 제어 ---
  const handleToggleTarget = (targetValue: string) => {
    if (targetValue === "all") {
      setNewPostTargets(["all"]);
      return;
    }
    setNewPostTargets((prev) => {
      let filtered = prev.filter((t) => t !== "all");
      if (filtered.includes(targetValue)) {
        filtered = filtered.filter((t) => t !== targetValue);
        return filtered.length === 0 ? ["all"] : filtered;
      } else {
        return [...filtered, targetValue];
      }
    });
  };

  const handleCreatePost = () => {
    if (!newPostTitle.trim() || !newPostContent.trim() || !currentUser) return;
    if (currentUser.role !== "특수담임" && currentUser.role !== "관리자") {
      alert("게시판 작성 권한은 특수교사(특수담임) 및 관리자에게만 제공됩니다.");
      return;
    }

    const newPost: BoardPost = {
      id: String(Date.now()),
      title: newPostTitle,
      content: newPostContent,
      authorId: currentUser.id,
      authorName: currentUser.name,
      date: new Date().toLocaleDateString("ko-KR"),
      allowedTargets: newPostTargets,
      comments: [],
    };
    setPosts((prev) => {
      const updated = [newPost, ...prev];
      localStorage.setItem("zh_posts", JSON.stringify(updated));
      return updated;
    });
    writeLog(currentUser.name, `공지사항 등록 [대상: ${newPostTargets.join(", ")}]: ${newPostTitle}`);
    setNewPostTitle("");
    setNewPostContent("");
    setNewPostTargets(["all"]);
    alert("공지글이 정상 배포되었습니다.");
  };

  const handleDeletePost = (postId: string, authorId: string) => {
    if (currentUser?.role !== "관리자" && currentUser?.id !== authorId) {
      alert("삭제 권한이 없습니다. (본인이 쓴 글이거나 관리자 계정만 삭제할 수 있습니다.)");
      return;
    }
    if (!confirm("해당 공지사항을 정말로 완전히 삭제하시겠습니까?")) return;
    setPosts((prev) => {
      const updated = prev.filter((p) => p.id !== postId);
      localStorage.setItem("zh_posts", JSON.stringify(updated));
      return updated;
    });
    writeLog(currentUser?.name || "알수없음", `게시글 삭제 실행 (ID: ${postId})`);
  };

  const handleAddComment = (postId: string) => {
    const text = commentInputs[postId];
    if (!text || !text.trim() || !currentUser) return;

    setPosts((prev) => {
      const updated = prev.map((p) => {
        if (p.id === postId) {
          const newComment: BoardComment = {
            id: String(Date.now()),
            authorId: currentUser.id,
            authorName: currentUser.name,
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
    setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
  };

  const handleDeleteComment = (postId: string, commentId: string, commentAuthorId: string) => {
    if (currentUser?.role !== "관리자" && currentUser?.id !== commentAuthorId) {
      alert("본인의 댓글만 삭제할 수 있습니다.");
      return;
    }
    setPosts((prev) => {
      const updated = prev.map((p) => {
        if (p.id === postId) {
          return { ...p, comments: p.comments.filter((c) => c.id !== commentId) };
        }
        return p;
      });
      localStorage.setItem("zh_posts", JSON.stringify(updated));
      return updated;
    });
  };

  // --- 6. 인계록 제어 (삭제 포함) ---
  const handleSaveHandover = (studentId: string, studentName: string) => {
    const content = handoverInputs[studentId];
    if (!content || !content.trim() || !currentUser) return;

    if (currentUser.role === "학년부장" && currentUser.targetClass !== INITIAL_STUDENTS.find(s=>s.id === studentId)?.gradeClass) {
      alert("학년부장 권한: 타 학급 학생의 인계록은 수정/작성이 금지됩니다.");
      return;
    }
    if (currentUser.role === "학급담임" && currentUser.targetClass !== INITIAL_STUDENTS.find(s=>s.id === studentId)?.gradeClass) {
      alert("학급담임 권한: 담당 반 학생의 인계록만 기록할 수 있습니다.");
      return;
    }

    const newItem: HandoverItem = {
      id: String(Date.now()),
      studentId,
      studentName,
      date: new Date().toLocaleString("ko-KR"),
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorRole: currentUser.role,
      content,
    };
    setHandovers((prev) => {
      const updated = [newItem, ...prev];
      localStorage.setItem("zh_handovers", JSON.stringify(updated));
      return updated;
    });
    writeLog(currentUser.name, `${studentName} 학생 인계록 작성 보존`);
    setHandoverInputs((prev) => ({ ...prev, [studentId]: "" }));
    alert("인계 내역이 기록되었습니다.");
  };

  const handleDeleteHandover = (handoverId: string, authorId: string) => {
    if (currentUser?.role !== "관리자" && currentUser?.id !== authorId) {
      alert("인계록 삭제 권한이 없습니다. (작성자 본인 및 관리자만 파기할 수 있습니다.)");
      return;
    }
    if (!confirm("해당 기록을 보존 파일에서 영구 삭제하시겠습니까?")) return;
    setHandovers((prev) => {
      const updated = prev.filter((h) => h.id !== handoverId);
      localStorage.setItem("zh_handovers", JSON.stringify(updated));
      return updated;
    });
    writeLog(currentUser?.name || "알수없음", "인계록 기록 파기");
  };

  // --- 7. 포털 개인 설정 정보 수정 ---
  const handleUpdateProfile = () => {
    if (!currentUser) return;
    let uPw = currentUser.password;
    let uSubj = currentUser.subject || "";

    if (changePw.trim()) uPw = changePw;
    if (changeSubj.trim()) uSubj = changeSubj;

    const nextAccounts = accounts.map((a) => {
      if (a.id === currentUser.id) return { ...a, password: uPw, subject: uSubj };
      return a;
    });
    setAccounts(nextAccounts);
    localStorage.setItem("zh_accounts", JSON.stringify(nextAccounts));

    const nextSession = { ...currentUser, password: uPw, subject: uSubj };
    setCurrentUser(nextSession);
    localStorage.setItem("zh_current_user", JSON.stringify(nextSession));
    writeLog(currentUser.name, "본인 비밀번호 및 과목 정보 변경 완료");
    setChangePw("");
    setChangeSubj("");
    alert("정보가 변경되었습니다.");
  };

  const handleSendRequest = () => {
    if (!reqText.trim() || !currentUser) return;
    writeLog(currentUser.name, `[개선 요청 접수]: ${reqText}`);
    setReqText("");
    alert("관리자 및 민석준 선생님에게 긴급 건의가 전달되었습니다.");
  };

  // --- 8. 관리자 모드: 계정 마스터 실시간 조회/추가 및 직접 수정 기능 ---
  const handleCreateAccountAdmin = () => {
    if (!newAccId.trim() || !newAccName.trim()) {
      alert("아이디와 교사명을 기입하세요.");
      return;
    }
    if (accounts.some((a) => a.id === newAccId)) {
      alert("이미 존재하는 교직원 ID 계정입니다.");
      return;
    }

    const newAcc: UserAccount = {
      id: newAccId,
      name: newAccName,
      role: newAccRole,
      targetClass: newAccClass,
      password: newAccPw,
      subject: newAccSubj || "미정",
    };

    const updated = [...accounts, newAcc];
    setAccounts(updated);
    localStorage.setItem("zh_accounts", JSON.stringify(updated));
    writeLog("최고관리자", `새 교사 계정 생성: ${newAccName}(${newAccId})`);
    
    setNewAccId("");
    setNewAccName("");
    alert("신규 계정임 마스터 DB에 안전하게 마운트되었습니다.");
  };

  const startEditAccount = (acc: UserAccount) => {
    setEditingAccountId(acc.id);
    setEditAccName(acc.name);
    setEditAccRole(acc.role);
    setEditAccClass(acc.targetClass);
    setEditAccPw(acc.password);
    setEditAccSubj(acc.subject || "");
  };

  const handleSaveEditAccount = () => {
    if (!editingAccountId) return;
    const updated = accounts.map((a) => {
      if (a.id === editingAccountId) {
        return {
          ...a,
          name: editAccName,
          role: editAccRole,
          targetClass: editAccClass,
          password: editAccPw,
          subject: editAccSubj,
        };
      }
      return a;
    });

    setAccounts(updated);
    localStorage.setItem("zh_accounts", JSON.stringify(updated));
    writeLog("최고관리자", `교직원 계정 정보 원격 강제 변경 수정 (대상: ${editingAccountId})`);
    
    setEditingAccountId(null);
    alert("계정 마스터 정보 수정이 완료되어 영구 동기화되었습니다.");
  };

  const handleDeleteAccountAdmin = (id: string, name: string) => {
    if (id === "민석준" || id === "admin") {
      alert("최고 마스터 루트 계정은 안전 잠금 처리되어 파기할 수 없습니다.");
      return;
    }
    if (!confirm(`${name} 교사의 마스터 접속 권한을 즉시 봉인/파기하십니까?`)) return;
    const updated = accounts.filter((a) => a.id !== id);
    setAccounts(updated);
    localStorage.setItem("zh_accounts", JSON.stringify(updated));
    writeLog("최고관리자", `교직원 계정 파기: ${name}`);
  };

  // --- 9. 권한별 조회 필터 핵심 로직 ---
  const getVisibleStudents = () => {
    if (!currentUser) return [];
    if (currentUser.role === "특수담임" || currentUser.role === "관리자") {
      return INITIAL_STUDENTS;
    }
    return INITIAL_STUDENTS.filter((s) => s.gradeClass === currentUser.targetClass);
  };

  const isPostVisible = (post: BoardPost) => {
    if (currentUser?.role === "관리자" || post.authorId === currentUser?.id) return true;
    if (post.allowedTargets.includes("all")) return true;
    if (post.allowedTargets.includes(currentUser?.role || "")) return true;
    if (post.allowedTargets.includes(currentUser?.id || "")) return true;
    return false;
  };

  // 비로그인 상태일 때 로그인 폼 출력 제어
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#F4F7FA] flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl max-w-sm w-full space-y-4">
          <div className="text-center">
            <span className="text-4xl">🦅</span>
            <h2 className="text-xl font-black text-slate-900 tracking-tight mt-2">진해고등학교 포털 교사 전용관</h2>
            <p className="text-xs text-slate-400 font-medium mt-1">통합 관리 계정 정보를 바르게 입력해 주십시오.</p>
          </div>
          <div className="space-y-3 text-xs font-bold">
            <input type="text" placeholder="교직원 로그인 고유 식별 ID" value={inputIdx} onChange={(e) => setInputIdx(e.target.value)} className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-blue-500" />
            <input type="password" placeholder="접속 비밀번호 패스워드" value={inputPw} onChange={(e) => setInputPw(e.target.value)} className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-blue-500" />
            <button type="submit" className="w-full bg-[#2563EB] text-white font-black py-3.5 rounded-xl transition-all shadow-md shadow-blue-100 text-sm">시스템 보안 마운트 로그인</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7FA] flex flex-col md:flex-row text-slate-800 antialiased font-sans">
      
      {/* 🦅 좌측 마스터 사이드바 */}
      <aside className="w-full md:w-72 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 shadow-xs relative z-10">
        <div>
          <div className="p-6 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100 text-center">
            <div className="text-4xl mb-2">🦅</div>
            <h2 className="font-black text-lg text-slate-900 tracking-tight">진해고등학교</h2>
            <div className="inline-block mt-2 bg-blue-50 text-[#2563EB] text-[11px] font-extrabold px-3 py-1 rounded-full border border-blue-100">
              {currentUser.name} [{currentUser.role}]
            </div>
            {currentUser.role !== "관리자" && currentUser.role !== "특수담임" && (
              <div className="text-[11px] text-slate-500 font-bold mt-1.5">학반 관제: {currentUser.targetClass}</div>
            )}
          </div>

          <nav className="p-4 space-y-1">
            <button onClick={() => { setCurrentMenu("dashboard"); setSelectedStudent(null); }} className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-black transition-all ${currentMenu === "dashboard" ? "bg-[#2563EB] text-white shadow-md shadow-blue-100" : "text-slate-600 hover:bg-slate-100"}`}>
              <span className="text-xl">🏠</span> 대시보드
            </button>
            <button onClick={() => { setCurrentMenu("studentSearch"); setSelectedStudent(null); }} className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-black transition-all ${currentMenu === "studentSearch" ? "bg-[#2563EB] text-white shadow-md shadow-blue-100" : "text-slate-600 hover:bg-slate-100"}`}>
              <span className="text-xl">👨‍🎓</span> 학생조회
            </button>
            <button onClick={() => { setCurrentMenu("board"); setSelectedStudent(null); }} className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-black transition-all ${currentMenu === "board" ? "bg-[#2563EB] text-white shadow-md shadow-blue-100" : "text-slate-600 hover:bg-slate-100"}`}>
              <span className="text-xl">📢</span> 게시판 공지
            </button>
            <button onClick={() => { setCurrentMenu("handover"); setSelectedStudent(null); }} className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-black transition-all ${currentMenu === "handover" ? "bg-[#2563EB] text-white shadow-md shadow-blue-100" : "text-slate-600 hover:bg-slate-100"}`}>
              <span className="text-xl">📝</span> 인계록 작성
            </button>
            <button onClick={() => { setCurrentMenu("settings"); setSelectedStudent(null); }} className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-black transition-all ${currentMenu === "settings" ? "bg-[#2563EB] text-white shadow-md shadow-blue-100" : "text-slate-600 hover:bg-slate-100"}`}>
              <span className="text-xl">⚙️</span> 포털 설정
            </button>

            {(currentUser.role === "관리자" || currentUser.id === "민석준") && (
              <div className="pt-4 mt-4 border-t border-slate-100 space-y-1">
                <div className="px-4 text-[10px] font-black text-slate-400 tracking-wider mb-1 uppercase">총괄 통제 센터</div>
                <button onClick={() => { setCurrentMenu("accountMgmt"); setSelectedStudent(null); }} className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-black transition-all ${currentMenu === "accountMgmt" ? "bg-purple-600 text-white" : "text-purple-600 hover:bg-purple-50"}`}>
                  <span>🔒</span> 계정 관리 수정 포털
                </button>
                <button onClick={() => { setCurrentMenu("logMgmt"); setSelectedStudent(null); }} className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-black transition-all ${currentMenu === "logMgmt" ? "bg-purple-600 text-white" : "text-purple-600 hover:bg-purple-50"}`}>
                  <span>📋</span> 프로세스 감사 로그
                </button>
              </div>
            )}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold py-3 rounded-xl text-xs transition-all border border-rose-200/50">
            🚪 안전 로그아웃 종료
          </button>
        </div>
      </aside>

      {/* 📑 우측 작업 워크스페이스 */}
      <main className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-xs gap-4">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              {currentMenu === "dashboard" && "🏠 통합교육 실시간 대시보드"}
              {currentMenu === "studentSearch" && "👨‍🎓 통합학생 실시간 조회"}
              {currentMenu === "board" && "📢 교직원 협의 알림장 게시판"}
              {currentMenu === "handover" && "📝 특수학급 인계록 마스터 보드"}
              {currentMenu === "settings" && "⚙️ 개인 권한 세팅 정보 변경"}
              {currentMenu === "accountMgmt" && "👑 [관리자 전용] 교직원 계정 통합 수정 관리"}
              {currentMenu === "logMgmt" && "📋 [관리자 전용] 실시간 통합 감사 로그"}
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {isSyncing ? "⏳ 구글 스프레드시트 실시간 동기화 중..." : "✅ 구글 데이터 파이프라인 싱크 연동 중"}
            </p>
          </div>
          <button onClick={fetchGoogleSheetData} disabled={isSyncing} className="bg-[#2563EB] hover:bg-[#1E40AF] text-white text-xs font-black px-4 py-3 rounded-xl transition-all shadow-sm">
            🔄 구글 시트 실시간 수동 동기화
          </button>
        </div>

        {/* 메뉴 1: 대시보드 */}
        {currentMenu === "dashboard" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {getVisibleStudents().map((s) => {
              const scheduleInfo = sheetSchedules[s.id] || { currentSubject: "일과 외", currentRoom: "원반/도움실" };
              return (
                <div key={s.id} onClick={() => setSelectedStudent(s)} className="bg-white border-2 border-slate-200 hover:border-[#2563EB] p-6 rounded-2xl shadow-xs cursor-pointer transition-all hover:shadow-md relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-2 h-full bg-slate-200 group-hover:bg-[#2563EB] transition-all" />
                  <div className="pl-2">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-400 mb-2">
                      <span>학번 {s.id}</span>
                      <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-black text-[11px]">{s.gradeClass}</span>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-4">{s.name}</h3>
                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-2 text-xs font-bold">
                      <div className="flex justify-between">
                        <span className="text-slate-400">현재 교과</span>
                        <span className="text-[#2563EB]">{scheduleInfo.currentSubject}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-slate-200/50">
                        <span className="text-slate-400">학습 위치</span>
                        <span className="text-purple-600">{scheduleInfo.currentRoom}</span>
                      </div>
                    </div>
                    <div className="text-right text-[11px] font-black text-[#2563EB] mt-4 pt-2 border-t border-slate-50">시간표 확인 🔍</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 메뉴 2: 학생조회 */}
        {currentMenu === "studentSearch" && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-black text-slate-500">
                  <th className="p-4 pl-6">학반</th>
                  <th className="p-4">학번</th>
                  <th className="p-4">성명</th>
                  <th className="p-4">원반 담임</th>
                  <th className="p-4">현재 과목</th>
                  <th className="p-4">실시간 위치</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                {getVisibleStudents().map((s) => {
                  const info = sheetSchedules[s.id] || { currentSubject: "일과 외", currentRoom: "원반" };
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80">
                      <td className="p-4 pl-6 text-[#2563EB] font-black">{s.gradeClass}</td>
                      <td className="p-4 text-slate-400">{s.id}</td>
                      <td className="p-4 text-slate-900 text-sm font-black">{s.name}</td>
                      <td className="p-4 text-slate-500">{s.homeroom}</td>
                      <td className="p-4 text-[#2563EB]">{info.currentSubject}</td>
                      <td className="p-4"><span className="bg-purple-50 text-purple-700 px-2.5 py-1 rounded-md border border-purple-100">{info.currentRoom}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 메뉴 3: 게시판 및 다중 복수 권한 제어 */}
        {currentMenu === "board" && (
          <div className="space-y-6">
            {(currentUser.role === "특수담임" || currentUser.role === "관리자") && (
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-4">
                <h3 className="font-black text-sm text-slate-900">📝 공지 전달 포스트 작성</h3>
                <div className="grid grid-cols-1 gap-3">
                  <input type="text" placeholder="공지 및 정보 공유 제목 기입" value={newPostTitle} onChange={(e) => setNewPostTitle(e.target.value)} className="px-4 py-3 border border-slate-300 rounded-xl text-xs font-bold focus:outline-none focus:border-blue-500" />
                  <textarea placeholder="전달 내용 및 협의 안건 작성..." rows={3} value={newPostContent} onChange={(e) => setNewPostContent(e.target.value)} className="p-4 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500" />
                </div>

                <div className="bg-slate-50 border p-4 rounded-xl space-y-2">
                  <span className="block text-xs font-black text-slate-500">🔒 열람 및 댓글 피드백 가능 타겟 다중 지정 (복수 개별 선택 가능):</span>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button onClick={() => handleToggleTarget("all")} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${newPostTargets.includes("all") ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 hover:bg-slate-100"}`}>전체 교사 공개</button>
                    <button onClick={() => handleToggleTarget("특수담임")} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${newPostTargets.includes("특수담임") ? "bg-purple-600 text-white border-purple-600" : "bg-white text-slate-700 hover:bg-slate-100"}`}>특수담임만</button>
                    <button onClick={() => handleToggleTarget("학년부장")} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${newPostTargets.includes("학년부장") ? "bg-purple-600 text-white border-purple-600" : "bg-white text-slate-700 hover:bg-slate-100"}`}>학년부장만</button>
                    
                    {accounts.filter(a => a.role === "학급담임").map((teacher) => (
                      <button key={teacher.id} onClick={() => handleToggleTarget(teacher.id)} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${newPostTargets.includes(teacher.id) ? "bg-[#2563EB] text-white border-[#2563EB]" : "bg-white text-slate-600 hover:bg-slate-100"}`}>
                        {teacher.name} ({teacher.targetClass})
                      </button>
                    ))}
                  </div>
                  <div className="text-[11px] text-slate-400 font-bold pt-1">현재 선택된 열람 타겟 코드: {newPostTargets.join(", ")}</div>
                  <div className="text-right pt-2">
                    <button onClick={handleCreatePost} className="bg-[#2563EB] hover:bg-[#1E40AF] text-white text-xs font-black px-6 py-2.5 rounded-xl shadow-xs">공지사항 즉시 배포</button>
                  </div>
                </div>
              </div>
            )}

            {/* 피드 게시글 리스트 */}
            <div className="space-y-4">
              {posts.filter(isPostVisible).length === 0 ? (
                <div className="text-center py-16 bg-white border rounded-2xl text-slate-400 font-bold text-xs">전달받은 공지 및 접근 권한이 허용된 게시글이 없습니다.</div>
              ) : (
                posts.filter(isPostVisible).map((post) => (
                  <div key={post.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
                    <div className="flex justify-between items-start border-b pb-3 border-slate-100">
                      <div>
                        <span className="bg-blue-50 text-[#2563EB] text-[10px] font-black px-2 py-0.5 rounded-md border border-blue-100 mr-2">공지</span>
                        <h4 className="text-base font-black text-slate-900 inline-block">{post.title}</h4>
                        <div className="text-[11px] text-slate-400 font-bold mt-1">발행: {post.authorName} 교사 | 일자: {post.date}</div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-slate-100 font-bold text-slate-500 px-2 py-1 rounded">
                          타겟: {post.allowedTargets.includes("all") ? "전체공개" : "다중 제한공개"}
                        </span>
                        {(currentUser?.role === "관리자" || post.authorId === currentUser?.id) && (
                          <button onClick={() => handleDeletePost(post.id, post.authorId)} className="text-rose-600 bg-rose-50 text-[11px] font-bold px-2 py-1 rounded-md border border-rose-100 hover:bg-rose-100">
                            삭제
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs font-medium text-slate-700 bg-slate-50/70 p-4 border rounded-xl whitespace-pre-wrap leading-relaxed">{post.content}</p>

                    {/* 댓글 공간 */}
                    <div className="space-y-2 pt-2">
                      <div className="text-xs font-bold text-slate-400">💬 피드백 확인 피드 ({post.comments.length})</div>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {post.comments.map((c) => (
                          <div key={c.id} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100/60 flex justify-between text-xs font-semibold">
                            <div>
                              <span className="text-[#2563EB] font-black mr-2">[{c.authorName}]</span>
                              <span className="text-slate-700">{c.content}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                              <span>{c.date}</span>
                              {(currentUser?.role === "관리자" || c.authorId === currentUser?.id) && (
                                <button onClick={() => handleDeleteComment(post.id, c.id, c.authorId)} className="text-rose-500 font-bold hover:underline">✕</button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input type="text" placeholder="댓글 피드백 및 확인 메시지 기입..." value={commentInputs[post.id] || ""} onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })} onKeyDown={(e) => { if(e.key === "Enter") handleAddComment(post.id); }} className="flex-1 bg-slate-50 border px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500" />
                        <button onClick={() => handleAddComment(post.id)} className="bg-slate-800 text-white font-black text-xs px-4 py-2 rounded-xl">등록</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 메뉴 4: 인계록 */}
        {currentMenu === "handover" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white border p-4 rounded-2xl space-y-2 shadow-2xs">
              <h3 className="text-xs font-black text-slate-400 uppercase mb-3 pl-1">학생 인계 아카이브 목록</h3>
              <div className="space-y-1 max-h-[500px] overflow-y-auto">
                {getVisibleStudents().map((s) => (
                  <button key={s.id} onClick={() => setSelectedStudent(s)} className={`w-full text-left p-3.5 rounded-xl text-xs font-bold border transition-all flex justify-between items-center ${selectedStudent?.id === s.id ? "bg-purple-50 text-purple-700 border-purple-300" : "bg-slate-50 hover:bg-white text-slate-700"}`}>
                    <span>{s.name} ({s.id})</span>
                    <span className="text-[10px] bg-white border px-2 py-0.5 rounded text-slate-400">{s.gradeClass}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              {selectedStudent ? (
                <>
                  <div className="bg-white border p-6 rounded-2xl shadow-xs space-y-4">
                    <div className="border-b pb-2">
                      <h3 className="text-base font-black text-slate-900">{selectedStudent.name} 학생 인계 특이사항 작성</h3>
                    </div>
                    <textarea placeholder="일과 종료 후 전달사항, 특이 행동 기록..." rows={4} value={handoverInputs[selectedStudent.id] || ""} onChange={(e) => setHandoverInputs({ ...handoverInputs, [selectedStudent.id]: e.target.value })} className="w-full p-4 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-purple-500" />
                    <div className="text-right">
                      <button onClick={() => handleSaveHandover(selectedStudent.id, selectedStudent.name)} className="bg-purple-600 text-white text-xs font-black px-6 py-3 rounded-xl shadow-xs">기록 동기화 및 저장</button>
                    </div>
                  </div>

                  <div className="bg-white border p-6 rounded-2xl shadow-xs space-y-3">
                    <h4 className="text-xs font-black text-slate-400">📌 누적 저장된 기존 인계 데이터 피드</h4>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {handovers.filter(h => h.studentId === selectedStudent.id).length === 0 ? (
                        <div className="text-center py-8 text-xs text-slate-400 font-bold">인계 기록 파일이 비어 있습니다.</div>
                      ) : (
                        handovers.filter(h => h.studentId === selectedStudent.id).map((item) => (
                          <div key={item.id} className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2 text-xs">
                            <div className="flex justify-between font-bold text-[11px] text-slate-400">
                              <span>교사: {item.authorName} ({item.authorRole})</span>
                              <div className="flex items-center gap-2">
                                <span>{item.date}</span>
                                {(currentUser?.role === "특수담임" || currentUser?.role === "관리자" || item.authorId === currentUser?.id) && (
                                  <button onClick={() => handleDeleteHandover(item.id, item.authorId)} className="text-rose-600 bg-rose-100/50 px-1.5 py-0.5 rounded font-black hover:bg-rose-100">삭제</button>
                                )}
                              </div>
                            </div>
                            <p className="font-semibold text-slate-800 whitespace-pre-wrap leading-relaxed">{item.content}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-white border rounded-2xl p-16 text-center text-slate-400 font-bold text-xs">← 인계 내역을 로드 및 기록할 학생을 왼쪽 스크롤 바에서 터치해 주십시오.</div>
              )}
            </div>
          </div>
        )}

        {/* 메뉴 5: 포털 설정 */}
        {currentMenu === "settings" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border p-6 rounded-2xl shadow-xs space-y-4">
              <h3 className="font-black text-sm text-slate-900 border-b pb-2">🔒 보안 패스워드 및 정보 변경</h3>
              <div className="space-y-3 text-xs font-bold">
                <div>
                  <label className="block text-slate-500 mb-1">사용자 교사 고유 식별 코드</label>
                  <input type="text" disabled value={currentUser.id} className="w-full px-3 py-2 bg-slate-100 text-slate-400 border rounded-xl" />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">새 비밀번호 입력</label>
                  <input type="password" placeholder="변경할 4자리 암호 입력" value={changePw} onChange={(e) => setChangePw(e.target.value)} className="w-full px-3 py-2 border rounded-xl focus:outline-none" />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">담당 과목 정보 기입</label>
                  <input type="text" placeholder={currentUser.subject || "담당교과 미설정"} value={changeSubj} onChange={(e) => setChangeSubj(e.target.value)} className="w-full px-3 py-2 border rounded-xl focus:outline-none" />
                </div>
                <button onClick={handleUpdateProfile} className="w-full bg-slate-800 text-white font-black py-3 rounded-xl text-xs">마스터 레코드 수정</button>
              </div>
            </div>
            <div className="bg-white border p-6 rounded-2xl shadow-xs space-y-4">
              <h3 className="font-black text-sm text-slate-900 border-b pb-2">🚀 업그레이드 기능 개선안 요청 상신</h3>
              <textarea placeholder="요청 사항 기재..." rows={4} value={reqText} onChange={(e) => setReqText(e.target.value)} className="w-full p-4 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none" />
              <button onClick={handleSendRequest} className="w-full bg-[#2563EB] text-white font-black py-3 rounded-xl text-xs">개선 요구서 송신</button>
            </div>
          </div>
        )}

        {/* 👑 메뉴 6: 계정 관리 및 전용 강제 원격 실시간 수정 (관리자 뷰) */}
        {currentMenu === "accountMgmt" && (currentUser.role === "관리자" || currentUser.id === "민석준") && (
          <div className="space-y-6">
            
            {/* 실시간 정보 강제 원격 수정 오퍼레이션 탑재 */}
            {editingAccountId && (
              <div className="bg-amber-50 border-2 border-amber-300 p-6 rounded-2xl shadow-md space-y-4 animate-fadeIn">
                <h3 className="font-black text-sm text-amber-800 flex items-center gap-2">
                  ⚙️ [원격 실시간 제어] 계정 마스터 레코드 강제 변조 모드 (대상: {editingAccountId})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-bold">
                  <div>
                    <label className="block text-amber-900 mb-1">교사 성명 수정</label>
                    <input type="text" value={editAccName} onChange={(e) => setEditAccName(e.target.value)} className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl" />
                  </div>
                  <div>
                    <label className="block text-amber-900 mb-1">권한 및 등급 수정</label>
                    <select value={editAccRole} onChange={(e) => setEditAccRole(e.target.value as any)} className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl">
                      <option value="학급담임">학급담임</option>
                      <option value="학년부장">학년부장</option>
                      <option value="특수담임">특수담임</option>
                      <option value="관리자">최고 관리자</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-amber-900 mb-1">담당 학급 반 스위칭</label>
                    <input type="text" value={editAccClass} onChange={(e) => setEditAccClass(e.target.value)} className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl" />
                  </div>
                  <div>
                    <label className="block text-amber-900 mb-1">비밀번호 강제 변경</label>
                    <input type="text" value={editAccPw} onChange={(e) => setEditAccPw(e.target.value)} className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl" />
                  </div>
                </div>
                <div className="text-right space-x-2 pt-2">
                  <button onClick={() => setEditingAccountId(null)} className="bg-slate-300 text-slate-700 text-xs font-bold px-4 py-2 rounded-xl">원격 수정 취소</button>
                  <button onClick={handleSaveEditAccount} className="bg-amber-600 text-white text-xs font-black px-5 py-2 rounded-xl shadow-xs">마스터 레코드 원격 강제 저장</button>
                </div>
              </div>
            )}

            {/* 신규 계정 생성 서브 보드 */}
            <div className="bg-white border p-6 rounded-2xl shadow-xs space-y-4">
              <h3 className="font-black text-sm text-purple-700">🔒 신규 교직원 접속 계정 포털 생성 발급</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs font-bold">
                <div>
                  <label className="block text-slate-500 mb-1">로그인용 계정 ID 기입 (이름+학반 권장)</label>
                  <input type="text" placeholder="예: 김대홍201" value={newAccId} onChange={(e) => setNewAccId(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">교사 성함</label>
                  <input type="text" placeholder="홍길동" value={newAccName} onChange={(e) => setNewAccName(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">직책 권한 등급</label>
                  <select value={newAccRole} onChange={(e) => setNewAccRole(e.target.value as any)} className="w-full px-3 py-2 border bg-white rounded-xl">
                    <option value="학급담임">학급담임 (본인 학반만 모니터)</option>
                    <option value="학년부장">학년부장 (전체 조회/본인 반 인계)</option>
                    <option value="특수담임">특수담임 (마스터 운영제어)</option>
                    <option value="관리자">관리자 시스템 루트 권한</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">배정 담당 학급 (예: 2-4)</label>
                  <input type="text" placeholder="2-1" value={newAccClass} onChange={(e) => setNewAccClass(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">초기 패스워드 포맷</label>
                  <input type="text" value={newAccPw} onChange={(e) => setNewAccPw(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">담당 교과</label>
                  <input type="text" placeholder="원반과목" value={newAccSubj} onChange={(e) => setNewAccSubj(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
                </div>
              </div>
              <div className="text-right">
                <button onClick={handleCreateAccountAdmin} className="bg-purple-600 text-white font-black text-xs px-5 py-3 rounded-xl">+ 새 마스터 권한 계정 즉시 발급</button>
              </div>
            </div>

            {/* 계정 관리 종합 테이블 리스트 */}
            <div className="bg-white border rounded-2xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-bold">
                  <thead>
                    <tr className="bg-slate-100 border-b text-slate-500">
                      <th className="p-3 pl-6">계정 ID</th>
                      <th className="p-3">성명</th>
                      <th className="p-3">권한 등급</th>
                      <th className="p-3">담당 학반</th>
                      <th className="p-3">비밀번호</th>
                      <th className="p-3">담당 과목</th>
                      <th className="p-3 text-center">원격 제어</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {accounts.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className="p-3 pl-6 text-[#2563EB] font-mono">{a.id}</td>
                        <td className="p-3 text-slate-900 font-black">{a.name}</td>
                        <td className="p-3"><span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600">{a.role}</span></td>
                        <td className="p-3 text-slate-500">{a.targetClass}</td>
                        <td className="p-3 text-slate-600 font-mono">{a.password}</td>
                        <td className="p-3 text-slate-400">{a.subject || "미정"}</td>
                        <td className="p-3 text-center space-x-2">
                          <button onClick={() => startEditAccount(a)} className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-[11px] hover:bg-amber-200 transition-all">조회/수정</button>
                          <button onClick={() => handleDeleteAccountAdmin(a.id, a.name)} className="bg-rose-50 text-rose-600 px-2 py-1 rounded text-[11px] hover:bg-rose-100 transition-all">파기</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 메뉴 7: 로그 감사 */}
        {currentMenu === "logMgmt" && (currentUser.role === "관리자" || currentUser.id === "민석준") && (
          <div className="bg-white border rounded-2xl p-6 space-y-4 shadow-xs">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-black text-sm text-slate-900">📑 시스템 가동 오퍼레이션 감사 추적 로그</h3>
              <button onClick={() => { if(confirm("로그를 비우십니까?")){ setLogs([]); localStorage.removeItem("zh_logs"); } }} className="text-xs bg-slate-100 px-3 py-1.5 rounded-xl font-bold">전체 포맷 파기</button>
            </div>
            <div className="bg-slate-900 text-emerald-400 p-4 rounded-xl h-96 overflow-y-auto font-mono text-[11px] space-y-1">
              {logs.map((l) => (
                <div key={l.id}>[{l.time}] <span className="text-amber-300 font-bold">{l.user}</span>: {l.action}</div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* 💡 대시보드 카드 클릭 시 활성화되는 일과 타임라인 모달 팝업 */}
      {selectedStudent && currentMenu === "dashboard" && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-[#2563EB] to-[#1E40AF] p-6 text-white flex justify-between items-center">
              <div>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-black">STUDENT TIMELINE</span>
                <h3 className="text-xl font-black mt-1">{selectedStudent.name} ({selectedStudent.id}) 전체 일과표</h3>
              </div>
              <button onClick={() => setSelectedStudent(null)} className="text-white bg-white/10 w-8 h-8 rounded-full font-bold">✕</button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="border rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b font-black text-slate-500">
                      <th className="p-3 pl-4">교시 시간</th>
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
                        <td className="p-3"><span className="bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded border border-purple-100">{t.location}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="p-4 bg-slate-50 text-right border-t">
              <button onClick={() => setSelectedStudent(null)} className="bg-slate-800 text-white font-black text-xs px-5 py-2.5 rounded-xl">대화상자 닫기</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}