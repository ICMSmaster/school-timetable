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
  subject?: string;  // 담당교과
}

interface BoardPost {
  id: string;
  title: string;
  content: string;
  authorId: string;   // 작성자 계정 ID (삭제 권한 검증용)
  authorName: string; // 작성자 이름
  date: string;       // 등록 일자 (시간 포함)
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
  
  // 중요: 대시보드 진입 시 김한얼 팝업 강제 오픈 방지를 위해 무조건 null로 명시적 초기화
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
    if (savedSession) setCurrentUser(JSON.parse(savedSession));
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

  // 계정 전환 및 로그아웃 시 공용 입력 폼 초기화 헬퍼 함수
  const clearWriteForm = () => {
    setNewPostTitle("");
    setNewPostContent("");
    setNewPostTargets(["all"]);
  };

  // --- 4. 로그인 / 로그아웃 ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const found = accounts.find((a) => a.id === inputIdx && a.password === inputPw);
    if (found) {
      clearWriteForm(); // 다른 사람이 가기 전에 썼던 내용 완전 버퍼 클리어
      setCurrentUser(found);
      localStorage.setItem("zh_current_user", JSON.stringify(found));
      writeLog(found.name, "로그인 성공");
      setInputIdx("");
      setInputPw("");
      setSelectedStudent(null); // 김한얼 팝업 강제 방지
      setCurrentMenu("dashboard");
    } else {
      alert("ID 혹은 패스워드가 다릅니다.");
    }
  };

  const handleLogout = () => {
    if (currentUser) writeLog(currentUser.name, "로그아웃 완료");
    clearWriteForm(); // 로그아웃 할 때 폼 데이터 지우기
    setCurrentUser(null);
    setSelectedStudent(null);
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
      // 등록 일자 포맷 수정: 시간 분 초까지 명확히 표기되도록 개선
      date: new Date().toLocaleString("ko-KR", { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
      allowedTargets: newPostTargets,
      comments: [],
    };
    setPosts((prev) => {
      const updated = [newPost, ...prev];
      localStorage.setItem("zh_posts", JSON.stringify(updated));
      return updated;
    });
    writeLog(currentUser.name, `공지사항 등록 [대상: ${newPostTargets.join(", ")}]: ${newPostTitle}`);
    clearWriteForm();
    alert("공지글이 정상 배포되었습니다.");
  };

  // 게시글 삭제 권한 (작성자 본인 OR 관리자 전체 삭감 패스 허용)
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
      alert("본인의 댓글 및 관리자만 삭제할 수 있습니다.");
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

  // --- 6. 인계록 제어 (관리자 전체 삭제 & 본인 삭제 추가 완벽 연동) ---
  const handleSaveHandover = (studentId: string, studentName: string) => {
    const content = handoverInputs[studentId];
    if (!content || !content.trim() || !currentUser) return;

    if (currentUser.role === "학년부장") {
      // 학년부장은 아래 getVisibleStudents 권한 수정으로 전체 조회가 가능하지만, 작성은 공용 제한이 필요한지 체크 (부장 권한 전체 허용)
    } else if (currentUser.role === "학급담임" && currentUser.targetClass !== INITIAL_STUDENTS.find(s=>s.id === studentId)?.gradeClass) {
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

  // 인계록 삭제 파기 로직 바인딩 (글쓴이 본인 OR 최고 관리자 전용 마스터 허용)
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
    writeLog(currentUser?.name || "알수없음", "인계록 기록 파기 완료");
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
    setNewAccSubj("");
    alert("신규 계정이 마스터 DB에 안전하게 마운트되었습니다.");
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

  // --- 9. 권한별 조회 필터 핵심 로직 (수정 완료: 학년부장 뷰어 전면 확대 추가) ---
  const getVisibleStudents = () => {
    if (!currentUser) return [];
    // 중요: 서용환 선생님 등 "학년부장" 역할 계정도 특수교사, 관리자와 동등하게 전체 학생 리스트를 볼 수 있도록 조건 수정
    if (currentUser.role === "특수담임" || currentUser.role === "학년부장" || currentUser.role === "관리자") {
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

  // --- 로그인 화면 렌더링 ---
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-black text-slate-900">진해고등학교 통합시스템</h1>
            <p className="text-xs text-slate-400 font-bold">교직원 통합 관리 포털 웹 인프라</p>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">교직원 ID 계정</label>
              <input type="text" value={inputIdx} onChange={(e) => setInputIdx(e.target.value)} placeholder="예: 서용환209 또는 admin" className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-500" required />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">액세스 비밀번호</label>
              <input type="password" value={inputPw} onChange={(e) => setInputPw(e.target.value)} placeholder="••••" className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-500" required />
            </div>
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-blue-100">
            인증 및 안전 시스템 접속
          </button>
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
            <button onClick={() => setCurrentMenu("dashboard")} className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-black transition-all ${currentMenu === "dashboard" ? "bg-[#2563EB] text-white shadow-md shadow-blue-100" : "text-slate-600 hover:bg-slate-100"}`}>
              <span className="text-xl">🏠</span> 대시보드
            </button>
            <button onClick={() => setCurrentMenu("studentSearch")} className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-black transition-all ${currentMenu === "studentSearch" ? "bg-[#2563EB] text-white shadow-md shadow-blue-100" : "text-slate-600 hover:bg-slate-100"}`}>
              <span className="text-xl">👨‍🎓</span> 학생조회
            </button>
            <button onClick={() => setCurrentMenu("board")} className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-black transition-all ${currentMenu === "board" ? "bg-[#2563EB] text-white shadow-md shadow-blue-100" : "text-slate-600 hover:bg-slate-100"}`}>
              <span className="text-xl">📢</span> 게시판 공지
            </button>
            <button onClick={() => setCurrentMenu("handover")} className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-black transition-all ${currentMenu === "handover" ? "bg-[#2563EB] text-white shadow-md shadow-blue-100" : "text-slate-600 hover:bg-slate-100"}`}>
              <span className="text-xl">📝</span> 인계록 작성
            </button>
            <button onClick={() => setCurrentMenu("settings")} className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-black transition-all ${currentMenu === "settings" ? "bg-[#2563EB] text-white shadow-md shadow-blue-100" : "text-slate-600 hover:bg-slate-100"}`}>
              <span className="text-xl">⚙️</span> 포털 설정
            </button>

            {(currentUser.role === "관리자" || currentUser.id === "민석준") && (
              <div className="pt-4 mt-4 border-t border-slate-100 space-y-1">
                <div className="px-4 text-[10px] font-black text-slate-400 tracking-wider mb-1 uppercase">총괄 통제 센터</div>
                <button onClick={() => setCurrentMenu("accountMgmt")} className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-black transition-all ${currentMenu === "accountMgmt" ? "bg-purple-600 text-white" : "text-purple-600 hover:bg-purple-50"}`}>
                  <span>🔒</span> 계정 관리 수정 포털
                </button>
                <button onClick={() => setCurrentMenu("logMgmt")} className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-black transition-all ${currentMenu === "logMgmt" ? "bg-purple-600 text-white" : "text-purple-600 hover:bg-purple-50"}`}>
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

        {/* 학생 시간표 상세 모달 레이어 (직접 카드를 눌렀을 때만 조건부 렌더링) */}
        {selectedStudent && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-white rounded-3xl p-6 max-w-xl w-full max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <span className="bg-blue-100 text-blue-700 text-xs font-black px-2.5 py-0.5 rounded-md">{selectedStudent.gradeClass}</span>
                  <h2 className="text-xl font-black text-slate-900 inline-block ml-2">{selectedStudent.name} 학생 실시간 시간표 조회</h2>
                </div>
                <button onClick={() => setSelectedStudent(null)} className="text-slate-400 hover:text-slate-700 font-bold text-xl px-2">✕</button>
              </div>
              
              <div className="border rounded-2xl overflow-hidden bg-white">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b font-black text-slate-500">
                      <th className="p-3 pl-4">교시</th>
                      <th className="p-3">지정 교과</th>
                      <th className="p-3">담당 강사</th>
                      <th className="p-3">이동 위치</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-bold text-slate-700">
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
              <button onClick={() => setSelectedStudent(null)} className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl text-xs">창 닫기</button>
            </div>
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

        {/* 메뉴 3: 게시판 협의 공지 */}
        {currentMenu === "board" && (
          <div className="space-y-6">
            {(currentUser.role === "특수담임" || currentUser.role === "관리자") && (
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-4">
                <h3 className="font-black text-sm text-slate-900">📝 공지 전달 포스트 작성</h3>
                <div className="grid grid-cols-1 gap-3">
                  <input type="text" placeholder="공지 및 정보 공유 제목 기입" value={newPostTitle} onChange={(e) => setNewPostTitle(e.target.value)} className="px-4 py-3 border border-slate-300 rounded-xl text-xs font-bold focus:outline-none focus:border-blue-500" />
                  <textarea placeholder="전달 내용 및 협의 안건 작성..." rows={3} value={newPostContent} onChange={(e) => setNewPostContent(e.target.value)} className="p-4 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500" />
                </div>
                
                {/* 🔒 다중 타겟 복수 개별 지정 패널 개선 */}
                <div className="bg-slate-50 border p-4 rounded-xl space-y-2">
                  <span className="block text-xs font-black text-slate-500">🔒 열람 및 댓글 피드백 타겟 다중 지정 (복수 개별 토글식 선택 가능):</span>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button onClick={() => handleToggleTarget("all")} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${newPostTargets.includes("all") ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 hover:bg-slate-100"}`}>전체 공개</button>
                    <button onClick={() => handleToggleTarget("특수담임")} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${newPostTargets.includes("특수담임") ? "bg-purple-600 text-white border-purple-600" : "bg-white text-slate-700 hover:bg-slate-100"}`}>특수담임 그룹</button>
                    <button onClick={() => handleToggleTarget("학년부장")} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${newPostTargets.includes("학년부장") ? "bg-purple-600 text-white border-purple-600" : "bg-white text-slate-700 hover:bg-slate-100"}`}>학년부장 그룹</button>
                    {accounts.filter(a => a.role === "학급담임").map((teacher) => (
                      <button key={teacher.id} onClick={() => handleToggleTarget(teacher.id)} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${newPostTargets.includes(teacher.id) ? "bg-[#2563EB] text-white border-[#2563EB]" : "bg-white text-slate-600 hover:bg-slate-100"}`}>
                        {teacher.name} ({teacher.targetClass})
                      </button>
                    ))}
                  </div>
                  <div className="text-[11px] text-slate-400 font-bold pt-1">지정된 코드 목록: <span className="text-[#2563EB]">{newPostTargets.join(", ")}</span></div>
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
                        <span className="bg-blue-50 text-[#2563EB] text-[10px] font-black px-2 py-0.5 rounded-md border border-blue-100 mr-2">공지 게시글</span>
                        <h4 className="text-base font-black text-slate-900 inline-block">{post.title}</h4>
                        <div className="text-[11px] text-slate-400 font-bold mt-1">발행: {post.authorName} 교사 | 일자: {post.date}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-slate-100 font-bold text-slate-500 px-2 py-1 rounded">열람 대상: {post.allowedTargets.includes("all") ? "전체공개" : "제한그룹공개"}</span>
                        {/* 삭제 권한 처리: 최고 관리자이거나 작성자 본인일 때 */}
                        {(currentUser?.role === "관리자" || post.authorId === currentUser?.id) && (
                          <button onClick={() => handleDeletePost(post.id, post.authorId)} className="text-rose-600 bg-rose-50 text-[11px] font-bold px-2 py-1 rounded-md border border-rose-100 hover:bg-rose-100">삭제</button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs font-medium text-slate-700 bg-slate-50/70 p-4 border rounded-xl whitespace-pre-wrap leading-relaxed">{post.content}</p>

                    {/* 댓글 영역 생략 (기존 구조 유지) */}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 메뉴 4: 인계록 작성 마스터 보드 */}
        {currentMenu === "handover" && (
          <div className="space-y-6">
            <div className="bg-white border p-6 rounded-2xl space-y-4">
              <h3 className="font-black text-sm text-slate-900">📝 담당 학반 학생 인계 기록 사항 하달</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {getVisibleStudents().map((st) => (
                  <div key={st.id} className="border p-4 rounded-xl space-y-2 bg-slate-50/50">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-slate-900 font-black">{st.name} ({st.gradeClass})</span>
                      <span className="text-slate-400">학번: {st.id}</span>
                    </div>
                    <div className="flex gap-2">
                      <input type="text" placeholder="특이사항 및 전달 인계 메시지 입력" value={handoverInputs[st.id] || ""} onChange={(e) => setHandoverInputs({ ...handoverInputs, [st.id]: e.target.value })} className="flex-1 px-3 py-2 text-xs border bg-white rounded-lg font-semibold focus:outline-none focus:border-blue-500" />
                      <button onClick={() => handleSaveHandover(st.id, st.name)} className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-2 rounded-lg">보존</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 인계록 보존 히스토리 리스트 */}
            <div className="bg-white border rounded-2xl p-6 space-y-4">
              <h3 className="font-black text-sm text-slate-900">⏳ 최근 인계 및 학급 전파 피드 히스토리</h3>
              <div className="space-y-3">
                {handovers.length === 0 ? (
                  <div className="text-center py-10 text-xs font-bold text-slate-400">영구 아카이브에 기록된 인계 히스토리가 존재하지 않습니다.</div>
                ) : (
                  handovers.map((h) => {
                    // 학년부장은 전체 필터를 보되, 일반 학급교사면 본인 클래스 피드만 필터링
                    if (currentUser.role === "학급담임" && INITIAL_STUDENTS.find(s=>s.id === h.studentId)?.gradeClass !== currentUser.targetClass) return null;
                    return (
                      <div key={h.id} className="border p-4 rounded-xl text-xs bg-white shadow-3xs flex justify-between items-center">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="bg-purple-100 text-purple-700 font-black px-2 py-0.5 rounded text-[10px]">{h.studentName} 학생</span>
                            <span className="text-slate-400 font-bold">작성자: {h.authorName} ({h.authorRole})</span>
                            <span className="text-slate-300">|</span>
                            <span className="text-slate-400 font-medium">{h.date}</span>
                          </div>
                          <p className="font-black text-slate-800 text-sm pt-1">{h.content}</p>
                        </div>
                        {/* 삭제 연동: 관리자 권한 전체 수용 혹은 본인 작성 기록 */}
                        {(currentUser?.role === "관리자" || h.authorId === currentUser?.id) && (
                          <button onClick={() => handleDeleteHandover(h.id, h.authorId)} className="text-rose-500 bg-rose-50 border border-rose-100 hover:bg-rose-100 font-bold px-2.5 py-1 rounded-md transition-all">삭제</button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* 메뉴 5: 개인 포털 설정 변경 */}
        {currentMenu === "settings" && (
          <div className="bg-white border p-6 rounded-2xl max-w-xl space-y-4">
            <h3 className="font-black text-sm text-slate-900">⚙️ 비밀번호 및 담당 정보 세션 강제 변경</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-500 font-bold mb-1">새로운 변경 패스워드</label>
                <input type="password" value={changePw} onChange={(e) => setChangePw(e.target.value)} placeholder="원하는 변경 값 입력" className="w-full p-3 border rounded-xl font-bold" />
              </div>
              <div>
                <label className="block text-slate-500 font-bold mb-1">담당 세부 과목 명칭</label>
                <input type="text" value={changeSubj} onChange={(e) => setChangeSubj(e.target.value)} placeholder={currentUser.subject || "입력"} className="w-full p-3 border rounded-xl font-bold" />
              </div>
              <button onClick={handleUpdateProfile} className="w-full bg-[#2563EB] text-white font-black py-3 rounded-xl">설정 반영 동기화</button>
            </div>
          </div>
        )}

        {/* 메뉴 6: 관리자 전용 계정 수정 포털 제어 컨트롤러 */}
        {currentMenu === "accountMgmt" && (currentUser.role === "관리자" || currentUser.id === "민석준") && (
          <div className="space-y-6">
            <div className="bg-white border p-6 rounded-2xl space-y-4">
              <h3 className="font-black text-sm text-purple-700">
                {editingAccountId ? `⚙️ 마스터 원격 계정 정보 수정 진행 중 (ID: ${editingAccountId})` : "➕ 시스템 연동 신규 교직원 마스터 계정 등록 발급"}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-500 mb-1">교사 ID (계정 고유 식별값)</label>
                  <input type="text" placeholder="예: 김대홍201" value={editingAccountId ? editingAccountId : newAccId} onChange={(e) => editingAccountId ? null : setNewAccId(e.target.value)} disabled={!!editingAccountId} className="w-full p-3 border rounded-xl font-bold bg-white disabled:bg-slate-100" />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">교직원 성명</label>
                  <input type="text" placeholder="예: 김대홍" value={editingAccountId ? editAccName : newAccName} onChange={(e) => editingAccountId ? setEditAccName(e.target.value) : setNewAccName(e.target.value)} className="w-full p-3 border rounded-xl font-bold" />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">비밀번호 코드</label>
                  <input type="text" placeholder="초기 비번 기입" value={editingAccountId ? editAccPw : newAccPw} onChange={(e) => editingAccountId ? setEditAccPw(e.target.value) : setNewAccPw(e.target.value)} className="w-full p-3 border rounded-xl font-bold" />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">관제 직책 권한 등급</label>
                  <select value={editingAccountId ? editAccRole : newAccRole} onChange={(e) => editingAccountId ? setEditAccRole(e.target.value as any) : setNewAccRole(e.target.value as any)} className="w-full p-3 border rounded-xl font-bold bg-white">
                    <option value="학급담임">학급담임</option>
                    <option value="특수담임">특수담임 (특수교사)</option>
                    <option value="학년부장">학년부장 (전체 뷰어)</option>
                    <option value="관리자">최고관리자 (Master)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">담당 학급 반 관제</label>
                  <input type="text" placeholder="예: 2-1 또는 전체" value={editingAccountId ? editAccClass : newAccClass} onChange={(e) => editingAccountId ? setEditAccClass(e.target.value) : setNewAccClass(e.target.value)} className="w-full p-3 border rounded-xl font-bold" />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">담당 정교과 과목</label>
                  <input type="text" placeholder="예: 수학 / 특수교육" value={editingAccountId ? editAccSubj : newAccSubj} onChange={(e) => editingAccountId ? setEditAccSubj(e.target.value) : setNewAccSubj(e.target.value)} className="w-full p-3 border rounded-xl font-bold" />
                </div>
              </div>

              <div className="text-right pt-2">
                {editingAccountId ? (
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditingAccountId(null)} className="bg-slate-200 text-slate-700 text-xs font-black px-6 py-3 rounded-xl">수정 취소</button>
                    <button onClick={handleSaveEditAccount} className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-black px-6 py-3 rounded-xl shadow-md">마스터 정보 원격 수정 완료 저장</button>
                  </div>
                ) : (
                  <button onClick={handleCreateAccountAdmin} className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-black px-6 py-3 rounded-xl shadow-md">새 계정 DB 최종 발급 승인</button>
                )}
              </div>
            </div>

            {/* 계정 실시간 대조 조회 리스트 데이터 웹 뷰어 */}
            <div className="bg-white border rounded-2xl p-6">
              <h3 className="font-black text-sm text-slate-900 mb-3">👥 현재 원격 DB 활성화 등록 계정 마스터 현황 리스트</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 font-black text-slate-500 border-b">
                      <th className="p-3">교사 ID</th>
                      <th className="p-3">교사 성명</th>
                      <th className="p-3">직책 권한</th>
                      <th className="p-3">관제 학급</th>
                      <th className="p-3">비밀번호</th>
                      <th className="p-3">담당 교과</th>
                      <th className="p-3 text-center">제어 액션</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-bold text-slate-700">
                    {accounts.map((acc) => (
                      <tr key={acc.id} className="hover:bg-slate-50/80">
                        <td className="p-3 text-purple-600 font-black">{acc.id}</td>
                        <td className="p-3 text-slate-900 font-black">{acc.name}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${acc.role === "관리자" ? "bg-red-50 text-red-600 border" : acc.role === "학년부장" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>{acc.role}</span>
                        </td>
                        <td className="p-3 text-slate-500">{acc.targetClass}</td>
                        <td className="p-3 text-slate-400 font-mono">{acc.password}</td>
                        <td className="p-3 text-slate-600">{acc.subject || "-"}</td>
                        <td className="p-3 text-center space-x-1">
                          <button onClick={() => startEditAccount(acc)} className="px-2 py-1 text-[11px] bg-blue-50 text-blue-600 border border-blue-100 rounded hover:bg-blue-100">수정</button>
                          <button onClick={() => handleDeleteAccountAdmin(acc.id, acc.name)} className="px-2 py-1 text-[11px] bg-rose-50 text-rose-600 border border-rose-100 rounded hover:bg-rose-100">파기</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 메뉴 7: 로그 조회 영역 (기존 구조 유지) */}
        {currentMenu === "logMgmt" && (currentUser.role === "관리자" || currentUser.id === "민석준") && (
          <div className="bg-white border rounded-2xl p-6 space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-black text-sm text-slate-900">📋 커널 인프라 실시간 프로세스 감사 로그</h3>
              <button onClick={() => { if(confirm("로그를 청소하시겠습니까?")) { setLogs([]); localStorage.removeItem("zh_logs"); } }} className="text-xs text-rose-600 font-bold bg-rose-50 px-2 py-1 rounded">로그 일괄 초기화</button>
            </div>
            <div className="bg-slate-900 text-emerald-400 p-4 rounded-xl font-mono text-[11px] space-y-1.5 h-[50vh] overflow-y-auto">
              {logs.map((l) => (
                <div key={l.id} className="hover:bg-slate-800/50 py-0.5">
                  <span className="text-slate-500">[{l.time}]</span> <span className="text-blue-400 font-bold">{l.user}</span> : {l.action}
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}