"use client";

import { useState, useEffect, useCallback } from "react";

interface TimelineItem {
  period: string;
  subject: string;
  teacher: string;
  location: string;
}

interface Student {
  id: string;
  name: string;
  homeroom: string;
  gradeClass: string;
  link: string;
}

interface UserAccount {
  id: string;
  name: string;
  role: "특수담임" | "학급담임" | "학년부장" | "관리자";
  targetClass?: string;
  password: string;
}

const INITIAL_STUDENTS: Student[] = [
  { id: "20110", name: "김한얼", homeroom: "김대홍", gradeClass: "2-1", link: "/student/20110" },
  { id: "20121", name: "이정준", homeroom: "김대홍", gradeClass: "2-1", link: "/student/20121" },
  { id: "20306", name: "김현중", homeroom: "김수민", gradeClass: "2-3", link: "/student/20306" },
  { id: "20311", name: "박진현", homeroom: "김수민", gradeClass: "2-3", link: "/student/20311" },
  { id: "20402", name: "강민준", homeroom: "정은영", gradeClass: "2-4", link: "/student/20402" },
  { id: "20406", name: "김세현", homeroom: "정은영", gradeClass: "2-4", link: "/student/20406" },
  { id: "20418", name: "손민찬", homeroom: "정은영", gradeClass: "2-4", link: "/student/20418" },
  { id: "20612", name: "손찬信", homeroom: "서한성", gradeClass: "2-6", link: "/student/20612" },
  { id: "20616", name: "오승철", homeroom: "서한성", gradeClass: "2-6", link: "/student/20616" },
  { id: "20813", name: "박찬석", homeroom: "여지언", gradeClass: "2-8", link: "/student/20813" },
  { id: "20906", name: "김재원", homeroom: "서용환", gradeClass: "2-9", link: "/student/20906" },
  { id: "21026", name: "조연우", homeroom: "강지영", gradeClass: "2-10", link: "/student/21026" },
  { id: "21027", name: "최재범", homeroom: "강지영", gradeClass: "2-10", link: "/student/21027" },
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

export default function TeacherDashboard() {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [sheetSchedules, setSheetSchedules] = useState<Record<string, { currentSubject: string; currentRoom: string; timeline: TimelineItem[] }>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const [loginId, setLoginId] = useState("");
  const [loginPw, setLoginPw] = useState("");

  const fetchRealtimeSchedules = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/sheets-data", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setSheetSchedules(data.schedules || {});
      }
    } catch (e) {
      console.error("학생 시간표 데이터 로드 실패", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchRealtimeSchedules();
      const interval = setInterval(fetchRealtimeSchedules, 60000); // 1분마다 동기화
      return () => clearInterval(interval);
    }
  }, [currentUser, fetchRealtimeSchedules]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = INITIAL_ACCOUNTS.find(a => a.id === loginId && a.password === loginPw);
    if (user) setCurrentUser(user);
    else alert("아이디 또는 비밀번호가 올바르지 않습니다.");
  };

  const filteredStudents = INITIAL_STUDENTS.filter(s => {
    if (!currentUser) return false;
    if (currentUser.role === "특수담임" || currentUser.role === "관리자" || currentUser.role === "학년부장") return true;
    if (currentUser.role === "학급담임") return s.gradeClass === currentUser.targetClass;
    return false;
  });

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full space-y-4">
          <h2 className="text-xl font-bold text-center text-blue-600">진해고 교사 인증 (대시보드)</h2>
          <input type="text" placeholder="ID" value={loginId} onChange={e => setLoginId(e.target.value)} required className="w-full px-4 py-2 border rounded-xl" />
          <input type="password" placeholder="Password" value={loginPw} onChange={e => setLoginPw(e.target.value)} required className="w-full px-4 py-2 border rounded-xl" />
          <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold">인증 및 입장</button>
        </form>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border shadow-xs">
        <div>
          <h1 className="text-xl font-black">👨‍🏫 학생 실시간 위치 및 일과 관제</h1>
          <p className="text-xs text-slate-500 mt-1">{currentUser.name} 선생님 [{currentUser.role}] 로그인 중</p>
        </div>
        <button onClick={fetchRealtimeSchedules} disabled={isLoading} className="bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-xl">
          {isLoading ? "동기화 중..." : "🔄 실시간 수동 갱신"}
        </button>
      </div>

      {!selectedStudent ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudents.map(s => {
            const info = sheetSchedules[s.id] || { currentSubject: "시간표 외", currentRoom: "도움실/원반" };
            return (
              <div key={s.id} onClick={() => setSelectedStudent(s)} className="bg-white border-2 border-slate-200 hover:border-blue-500 p-6 rounded-2xl shadow-xs cursor-pointer transition-all">
                <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
                  <span>{s.id}</span>
                  <span className="text-blue-600">{s.gradeClass}</span>
                </div>
                <h3 className="text-xl font-bold mb-3">{s.name}</h3>
                <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1 font-medium">
                  <div>현재 교과: <span className="text-blue-600 font-bold">{info.currentSubject}</span></div>
                  <div>이동 장소: <span className="text-purple-600 font-bold">{info.currentRoom}</span></div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border p-6 rounded-2xl space-y-4">
          <div className="flex justify-between items-center border-b pb-4">
            <button onClick={() => setSelectedStudent(null)} className="text-xs bg-slate-100 px-3 py-1.5 rounded-lg">← 목록으로</button>
            <h2 className="text-lg font-bold">{selectedStudent.name} 학생 전체 일과표 데이터</h2>
            <a href={`/student/${selectedStudent.id}`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">학생 화면 보기 🌐</a>
          </div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 border-b text-xs font-bold text-slate-500">
                <th className="p-3">교시</th>
                <th className="p-3">교과목</th>
                <th className="p-3">담당교사</th>
                <th className="p-3">학습장소</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(sheetSchedules[selectedStudent.id]?.timeline || []).map((t, idx) => (
                <tr key={idx} className="text-slate-700">
                  <td className="p-3"><span className="bg-slate-100 px-2 py-0.5 rounded text-xs">{t.period}</span></td>
                  <td className="p-3 font-bold">{t.subject}</td>
                  <td className="p-3">{t.teacher || "-"}</td>
                  <td className="p-3"><span className="bg-purple-50 text-purple-700 font-bold text-xs px-2 py-0.5 rounded">{t.location}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}