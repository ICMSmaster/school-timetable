"use client";

import { useEffect, useState, useCallback } from "react";

// ──────────────────────────────────────────────────────────
// 타입 정의
// ──────────────────────────────────────────────────────────
interface Student {
  id: string;   // 학번
  name: string; // 이름
  homeroom: string; // 담임
  status: string;   // 제작완료 / 시간표 데이터 없음
  link: string;
}

interface ScheduleCell {
  subject: string;
  teacher: string;
  room: string;
}

type DaySchedule = Record<string, ScheduleCell>; // "1교시" → cell
type WeekSchedule = Record<string, DaySchedule>; // "월" → DaySchedule

interface NoticeRow {
  seq: string;
  target: string; // 학번_이름 or 전체
  writer: string;
  content: string;
}

// ──────────────────────────────────────────────────────────
// 상수
// ──────────────────────────────────────────────────────────
const STUDENTS: Student[] = [
  { id: "20110", name: "김한얼",  homeroom: "김대홍", status: "제작완료",          link: "https://school-timetable-dubi.vercel.app/student/20110" },
  { id: "20121", name: "이정준",  homeroom: "김대홍", status: "시간표 데이터 없음", link: "https://school-timetable-dubi.vercel.app/student/20121" },
  { id: "20306", name: "김현중",  homeroom: "김수민", status: "제작완료",          link: "https://school-timetable-dubi.vercel.app/student/20306" },
  { id: "20311", name: "박진현",  homeroom: "김수민", status: "제작완료",          link: "https://school-timetable-dubi.vercel.app/student/20311" },
  { id: "20402", name: "강민준",  homeroom: "정은영", status: "시간표 데이터 없음", link: "https://school-timetable-dubi.vercel.app/student/20402" },
  { id: "20406", name: "김세현",  homeroom: "정은영", status: "시간표 데이터 없음", link: "https://school-timetable-dubi.vercel.app/student/20406" },
  { id: "20418", name: "손민찬",  homeroom: "정은영", status: "제작완료",          link: "https://school-timetable-dubi.vercel.app/student/20418" },
  { id: "20612", name: "손찬민",  homeroom: "서한성", status: "제작완료",          link: "https://school-timetable-dubi.vercel.app/student/20612" },
  { id: "20616", name: "오승철",  homeroom: "서한성", status: "제작완료",          link: "https://school-timetable-dubi.vercel.app/student/20616" },
  { id: "20813", name: "박찬석",  homeroom: "여지언", status: "제작완료",          link: "https://school-timetable-dubi.vercel.app/student/20813" },
  { id: "20906", name: "김재원",  homeroom: "서용환", status: "제작완료",          link: "https://school-timetable-dubi.vercel.app/student/20906" },
  { id: "21026", name: "조연우",  homeroom: "강지영", status: "제작완료",          link: "https://school-timetable-dubi.vercel.app/student/21026" },
  { id: "21027", name: "최재범",  homeroom: "강지영", status: "제작완료",          link: "https://school-timetable-dubi.vercel.app/student/21027" },
];

const PERIODS = ["1교시", "2교시", "3교시", "4교시", "5교시", "6교시", "7교시"];
const PERIOD_TIMES: Record<string, string> = {
  "1교시": "08:40", "2교시": "09:40", "3교시": "10:40",
  "4교시": "11:40", "5교시": "13:35", "6교시": "14:35", "7교시": "15:40",
};
const DAYS = ["월", "화", "수", "목", "금"];

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
// Google Sheets 파싱 유틸
// (기존 google.ts의 getSheetData() 활용)
// ──────────────────────────────────────────────────────────
async function getSheetData(sheetName: string): Promise<string[][] | null> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  const spreadsheetId = process.env.NEXT_PUBLIC_SPREADSHEET_ID;
  if (!apiKey || !spreadsheetId) return null;
  const range = `${sheetName}!A1:H35`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    return data.values ?? null;
  } catch {
    return null;
  }
}

function parseStudentSchedule(rows: string[][]): WeekSchedule {
  // 행 구조: 교시, 월, 화, 수, 목, 금  (3줄 세트: 과목/교사/교실)
  const schedule: WeekSchedule = {};
  DAYS.forEach((d) => (schedule[d] = {}));

  let periodIdx = 0;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    const first = (row[0] ?? "").trim();
    if (first.endsWith("교시")) {
      periodIdx = 0;
      const period = first;
      const subjectRow = row;
      const teacherRow = rows[i + 1] ?? [];
      const roomRow = rows[i + 2] ?? [];
      DAYS.forEach((day, di) => {
        schedule[day][period] = {
          subject: (subjectRow[di + 1] ?? "").trim(),
          teacher: (teacherRow[di + 1] ?? "").trim(),
          room: (roomRow[di + 1] ?? "").replace(/🎈/g, "").trim(),
        };
      });
      i += 2; // skip teacher & room rows
      periodIdx++;
    }
  }
  return schedule;
}

function parseNotices(rows: string[][]): NoticeRow[] {
  const notices: NoticeRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 4) continue;
    const content = (row[3] ?? "").trim();
    if (!content) continue;
    notices.push({
      seq: row[0] ?? "",
      target: (row[1] ?? "").trim(),
      writer: (row[2] ?? "").trim(),
      content,
    });
  }
  return notices;
}

// ──────────────────────────────────────────────────────────
// 시간 유틸
// ──────────────────────────────────────────────────────────
function getCurrentPeriod(): string {
  const now = new Date();
  const t = now.getHours() * 60 + now.getMinutes();
  for (const p of PERIOD_RANGES) {
    if (t >= p.start && t <= p.end) return p.name;
  }
  return "";
}

function getCurrentDay(): string {
  return DAYS[new Date().getDay() - 1] ?? "";
}

// ──────────────────────────────────────────────────────────
// 메인 컴포넌트
// ──────────────────────────────────────────────────────────
export default function TeacherDashboard() {
  const [tab, setTab] = useState<"overview" | "schedule" | "notice" | "links">("overview");
  const [selectedStudent, setSelectedStudent] = useState<Student>(STUDENTS[0]);
  const [weekSchedule, setWeekSchedule] = useState<WeekSchedule | null>(null);
  const [notices, setNotices] = useState<NoticeRow[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [loadingNotice, setLoadingNotice] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState(getCurrentPeriod());
  const [currentDay, setCurrentDay] = useState(getCurrentDay());
  const [now, setNow] = useState(new Date());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 시계 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
      setCurrentPeriod(getCurrentPeriod());
      setCurrentDay(getCurrentDay());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // 학생 시간표 로드
  const loadSchedule = useCallback(async (student: Student) => {
    setLoadingSchedule(true);
    setWeekSchedule(null);
    const sheetName = `${student.id}_${student.name}`;
    const rows = await getSheetData(sheetName);
    if (rows) setWeekSchedule(parseStudentSchedule(rows));
    setLoadingSchedule(false);
  }, []);

  // 알림장 로드
  const loadNotices = useCallback(async () => {
    setLoadingNotice(true);
    const rows = await getSheetData("알림장");
    if (rows) setNotices(parseNotices(rows));
    setLoadingNotice(false);
  }, []);

  useEffect(() => {
    if (tab === "schedule") loadSchedule(selectedStudent);
  }, [tab, selectedStudent, loadSchedule]);

  useEffect(() => {
    if (tab === "notice") loadNotices();
  }, [tab, loadNotices]);

  const copyLink = (student: Student) => {
    navigator.clipboard.writeText(student.link);
    setCopiedId(student.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const readyCount = STUDENTS.filter((s) => s.status === "제작완료").length;
  const notReadyCount = STUDENTS.length - readyCount;

  // 오늘 학습도움실 오는 학생 목록 (schedule tab이 아니어도 overview에서 보여줄 수 있음)
  // 간단히 상태 표시만

  return (
    <div style={styles.container}>
      {/* ── 헤더 ── */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.badge}>특수학급</div>
          <div>
            <h1 style={styles.title}>교사 업무지원 포털</h1>
            <p style={styles.subtitle}>진해고등학교 특수학급 · 2026학년도</p>
          </div>
        </div>
        <div style={styles.clock}>
          <div style={styles.clockTime}>
            {now.getHours().toString().padStart(2, "0")}:
            {now.getMinutes().toString().padStart(2, "0")}
          </div>
          <div style={styles.clockSub}>
            {currentDay ? `${currentDay}요일` : "주말"}
            {currentPeriod ? ` · ${currentPeriod} 진행중` : " · 수업 외 시간"}
          </div>
        </div>
      </header>

      {/* ── 탭 ── */}
      <nav style={styles.nav}>
        {(
          [
            { key: "overview", label: "📊 현황" },
            { key: "schedule", label: "📅 시간표 조회" },
            { key: "notice",   label: "📝 알림장" },
            { key: "links",    label: "🔗 학생 링크" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            style={{ ...styles.tabBtn, ...(tab === t.key ? styles.tabBtnActive : {}) }}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main style={styles.main}>
        {/* ══════════ 현황 탭 ══════════ */}
        {tab === "overview" && (
          <div>
            {/* 요약 카드 */}
            <div style={styles.cardRow}>
              <div style={{ ...styles.statCard, background: "linear-gradient(135deg,#3b82f6,#6366f1)" }}>
                <div style={styles.statNum}>{STUDENTS.length}</div>
                <div style={styles.statLabel}>전체 학생</div>
              </div>
              <div style={{ ...styles.statCard, background: "linear-gradient(135deg,#10b981,#059669)" }}>
                <div style={styles.statNum}>{readyCount}</div>
                <div style={styles.statLabel}>시간표 등록 완료</div>
              </div>
              <div style={{ ...styles.statCard, background: "linear-gradient(135deg,#f59e0b,#d97706)" }}>
                <div style={styles.statNum}>{notReadyCount}</div>
                <div style={styles.statLabel}>데이터 미등록</div>
              </div>
              <div style={{ ...styles.statCard, background: "linear-gradient(135deg,#8b5cf6,#7c3aed)" }}>
                <div style={styles.statNum}>{Math.round((readyCount / STUDENTS.length) * 100)}%</div>
                <div style={styles.statLabel}>등록률</div>
              </div>
            </div>

            {/* 학생 목록 테이블 */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>학생 명렬</h2>
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.thead}>
                      <th style={styles.th}>학번</th>
                      <th style={styles.th}>이름</th>
                      <th style={styles.th}>담임교사</th>
                      <th style={styles.th}>상태</th>
                      <th style={styles.th}>학생 앱 바로가기</th>
                    </tr>
                  </thead>
                  <tbody>
                    {STUDENTS.map((s, i) => (
                      <tr
                        key={s.id}
                        style={{ ...styles.tr, background: i % 2 === 0 ? "#f9fafb" : "#ffffff" }}
                      >
                        <td style={styles.td}>{s.id}</td>
                        <td style={{ ...styles.td, fontWeight: 600 }}>{s.name}</td>
                        <td style={styles.td}>{s.homeroom}</td>
                        <td style={styles.td}>
                          <span
                            style={{
                              ...styles.pill,
                              background: s.status === "제작완료" ? "#d1fae5" : "#fef3c7",
                              color: s.status === "제작완료" ? "#065f46" : "#92400e",
                            }}
                          >
                            {s.status === "제작완료" ? "✅ 완료" : "⏳ 미등록"}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <a
                            href={s.link}
                            target="_blank"
                            rel="noreferrer"
                            style={styles.linkBtn}
                          >
                            앱 열기 →
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 사용 안내 */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>📌 교사 업무 안내</h2>
              <ol style={styles.guideList}>
                <li>각 학생의 시트명은 <code style={styles.code}>학번_이름</code> 형식을 유지해야 합니다.</li>
                <li>시간표 변경 시 해당 시트를 수정하면 학생 화면에 즉시 반영됩니다.</li>
                <li>창체 수업(자율·동아리·진로)은 매주 수업 교사/교실을 업데이트하세요.</li>
                <li>알림장 시트에서 학생 개별 공지(<code style={styles.code}>학번_이름</code>) 또는 전체 공지(<code style={styles.code}>전체</code>)를 작성할 수 있습니다.</li>
                <li>학생 링크 탭에서 개인 링크를 복사하여 각 학생에게 배부하세요.</li>
              </ol>
            </div>
          </div>
        )}

        {/* ══════════ 시간표 조회 탭 ══════════ */}
        {tab === "schedule" && (
          <div>
            {/* 학생 선택 */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>학생 선택</h2>
              <div style={styles.studentBtnGrid}>
                {STUDENTS.map((s) => (
                  <button
                    key={s.id}
                    style={{
                      ...styles.studentBtn,
                      ...(selectedStudent.id === s.id ? styles.studentBtnActive : {}),
                      opacity: s.status !== "제작완료" ? 0.5 : 1,
                    }}
                    onClick={() => setSelectedStudent(s)}
                  >
                    <span style={styles.studentBtnId}>{s.id}</span>
                    <span style={styles.studentBtnName}>{s.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 시간표 테이블 */}
            <div style={styles.card}>
              <div style={styles.scheduleTitleRow}>
                <h2 style={styles.cardTitle}>
                  {selectedStudent.name} ({selectedStudent.id}) · 주간 시간표
                </h2>
                <button
                  style={styles.reloadBtn}
                  onClick={() => loadSchedule(selectedStudent)}
                  disabled={loadingSchedule}
                >
                  {loadingSchedule ? "불러오는 중…" : "🔄 새로고침"}
                </button>
              </div>

              {selectedStudent.status !== "제작완료" ? (
                <div style={styles.emptyBox}>⚠️ 아직 시간표 데이터가 등록되지 않은 학생입니다.</div>
              ) : loadingSchedule ? (
                <div style={styles.loadingBox}>시간표를 불러오는 중입니다…</div>
              ) : weekSchedule ? (
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.thead}>
                        <th style={{ ...styles.th, width: 80 }}>교시</th>
                        {DAYS.map((d) => (
                          <th
                            key={d}
                            style={{
                              ...styles.th,
                              background:
                                d === currentDay ? "#dbeafe" : "#f3f4f6",
                              color: d === currentDay ? "#1d4ed8" : "#374151",
                            }}
                          >
                            {d}요일{d === currentDay ? " 🔵" : ""}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {PERIODS.map((period, pi) => (
                        <tr
                          key={period}
                          style={{
                            ...styles.tr,
                            background:
                              period === currentPeriod
                                ? "#eff6ff"
                                : pi % 2 === 0
                                ? "#f9fafb"
                                : "#ffffff",
                          }}
                        >
                          <td style={{ ...styles.td, textAlign: "center", fontWeight: 700 }}>
                            <div>{period}</div>
                            <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 400 }}>
                              {PERIOD_TIMES[period]}
                            </div>
                            {period === currentPeriod && (
                              <div style={{ fontSize: 10, color: "#3b82f6" }}>▶ 현재</div>
                            )}
                          </td>
                          {DAYS.map((day) => {
                            const cell = weekSchedule[day]?.[period];
                            const isHelp = cell?.room?.includes("학습도움실");
                            return (
                              <td
                                key={day}
                                style={{
                                  ...styles.td,
                                  background: isHelp ? "#fef9c3" : undefined,
                                  textAlign: "center",
                                  minWidth: 90,
                                }}
                              >
                                {cell?.subject ? (
                                  <>
                                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                                      {cell.subject}
                                    </div>
                                    <div style={{ fontSize: 11, color: "#6b7280" }}>
                                      {cell.teacher}
                                    </div>
                                    <div
                                      style={{
                                        fontSize: 11,
                                        color: isHelp ? "#b45309" : "#9ca3af",
                                        fontWeight: isHelp ? 600 : 400,
                                      }}
                                    >
                                      {isHelp ? "🎈학습도움실" : cell.room}
                                    </div>
                                  </>
                                ) : (
                                  <span style={{ color: "#d1d5db", fontSize: 12 }}>—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={styles.emptyBox}>
                  Google Sheets 연동 정보가 없거나 데이터를 불러오지 못했습니다.
                  <br />
                  <code style={styles.code}>.env.local</code>에{" "}
                  <code style={styles.code}>NEXT_PUBLIC_GOOGLE_API_KEY</code>,{" "}
                  <code style={styles.code}>NEXT_PUBLIC_SPREADSHEET_ID</code>가 설정되어 있는지 확인하세요.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════ 알림장 탭 ══════════ */}
        {tab === "notice" && (
          <div style={styles.card}>
            <div style={styles.scheduleTitleRow}>
              <h2 style={styles.cardTitle}>알림장 전체 조회</h2>
              <button
                style={styles.reloadBtn}
                onClick={loadNotices}
                disabled={loadingNotice}
              >
                {loadingNotice ? "불러오는 중…" : "🔄 새로고침"}
              </button>
            </div>
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
              Google Sheets의 <strong>알림장</strong> 시트 내용을 조회합니다.
              내용 수정은 Google Sheets에서 직접 진행하세요.
            </p>

            {loadingNotice ? (
              <div style={styles.loadingBox}>알림장을 불러오는 중입니다…</div>
            ) : notices.length === 0 ? (
              <div style={styles.emptyBox}>알림장 데이터가 없거나 연동 정보를 확인하세요.</div>
            ) : (
              <div style={styles.noticeList}>
                {/* 전체 공지 먼저 */}
                {notices
                  .filter((n) => n.target === "전체")
                  .map((n, i) => (
                    <div key={`all-${i}`} style={{ ...styles.noticeCard, borderLeft: "4px solid #3b82f6" }}>
                      <div style={styles.noticeHeader}>
                        <span style={{ ...styles.noticePill, background: "#dbeafe", color: "#1d4ed8" }}>
                          📢 전체 공지
                        </span>
                        <span style={styles.noticeWriter}>{n.writer} 선생님</span>
                      </div>
                      <p style={styles.noticeContent}>{n.content}</p>
                    </div>
                  ))}
                {/* 개별 공지 */}
                {notices
                  .filter((n) => n.target !== "전체")
                  .map((n, i) => {
                    const student = STUDENTS.find(
                      (s) => n.target.startsWith(s.id) || n.target.endsWith(s.name)
                    );
                    return (
                      <div key={`ind-${i}`} style={{ ...styles.noticeCard, borderLeft: "4px solid #10b981" }}>
                        <div style={styles.noticeHeader}>
                          <span style={{ ...styles.noticePill, background: "#d1fae5", color: "#065f46" }}>
                            👤 {n.target}
                          </span>
                          {n.writer && (
                            <span style={styles.noticeWriter}>{n.writer} 선생님</span>
                          )}
                        </div>
                        {n.content && <p style={styles.noticeContent}>{n.content}</p>}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* ══════════ 학생 링크 탭 ══════════ */}
        {tab === "links" && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>학생 개별 접속 링크</h2>
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>
              각 학생에게 복사 버튼으로 링크를 전달하세요. 로그인 없이 바로 접속 가능합니다.
            </p>
            <div style={styles.linkGrid}>
              {STUDENTS.map((s) => (
                <div key={s.id} style={styles.linkCard}>
                  <div style={styles.linkCardTop}>
                    <div>
                      <div style={styles.linkStudentName}>{s.name}</div>
                      <div style={styles.linkStudentId}>{s.id} · {s.homeroom} 반</div>
                    </div>
                    <span
                      style={{
                        ...styles.pill,
                        background: s.status === "제작완료" ? "#d1fae5" : "#fef3c7",
                        color: s.status === "제작완료" ? "#065f46" : "#92400e",
                        fontSize: 11,
                      }}
                    >
                      {s.status === "제작완료" ? "✅ 완료" : "⏳ 미등록"}
                    </span>
                  </div>
                  <div style={styles.linkUrl}>{s.link}</div>
                  <div style={styles.linkActions}>
                    <a href={s.link} target="_blank" rel="noreferrer" style={styles.linkOpenBtn}>
                      열기 →
                    </a>
                    <button
                      style={{
                        ...styles.copyBtn,
                        background: copiedId === s.id ? "#059669" : "#3b82f6",
                      }}
                      onClick={() => copyLink(s)}
                    >
                      {copiedId === s.id ? "✓ 복사됨!" : "링크 복사"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer style={styles.footer}>
        진해고등학교 특수학급 일과운영 지원 APP · 제작 민석준 · 2026
      </footer>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// 스타일 (inline — Next.js CSS 모듈 없이도 동작)
// ──────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: "'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
    minHeight: "100vh",
    background: "#f1f5f9",
    color: "#1e293b",
  },
  header: {
    background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)",
    color: "#fff",
    padding: "20px 32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap" as const,
    gap: 16,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 16 },
  badge: {
    background: "rgba(255,255,255,0.2)",
    borderRadius: 8,
    padding: "4px 12px",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.05em",
    border: "1px solid rgba(255,255,255,0.3)",
  },
  title: { margin: 0, fontSize: 22, fontWeight: 800 },
  subtitle: { margin: 0, fontSize: 13, opacity: 0.75, marginTop: 2 },
  clock: { textAlign: "right" as const },
  clockTime: { fontSize: 28, fontWeight: 800, fontVariantNumeric: "tabular-nums" },
  clockSub: { fontSize: 12, opacity: 0.75, marginTop: 2 },
  nav: {
    display: "flex",
    gap: 0,
    background: "#fff",
    borderBottom: "1px solid #e2e8f0",
    padding: "0 24px",
    overflowX: "auto" as const,
  },
  tabBtn: {
    padding: "14px 20px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 500,
    color: "#64748b",
    borderBottom: "3px solid transparent",
    whiteSpace: "nowrap" as const,
    transition: "all 0.15s",
  },
  tabBtnActive: {
    color: "#2563eb",
    borderBottom: "3px solid #2563eb",
    fontWeight: 700,
  },
  main: { padding: "24px", maxWidth: 1200, margin: "0 auto" },
  cardRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    borderRadius: 16,
    padding: "20px 24px",
    color: "#fff",
    boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
  },
  statNum: { fontSize: 36, fontWeight: 900, lineHeight: 1 },
  statLabel: { fontSize: 13, opacity: 0.9, marginTop: 6 },
  card: {
    background: "#fff",
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px #e2e8f0",
  },
  cardTitle: { margin: "0 0 16px 0", fontSize: 17, fontWeight: 700, color: "#0f172a" },
  tableWrap: { overflowX: "auto" as const },
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: 14 },
  thead: { background: "#f3f4f6" },
  th: {
    padding: "10px 14px",
    textAlign: "left" as const,
    fontWeight: 700,
    fontSize: 13,
    color: "#374151",
    borderBottom: "2px solid #e5e7eb",
  },
  tr: { borderBottom: "1px solid #f3f4f6", transition: "background 0.1s" },
  td: { padding: "10px 14px", verticalAlign: "middle" as const },
  pill: {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
  },
  linkBtn: {
    color: "#2563eb",
    textDecoration: "none",
    fontWeight: 600,
    fontSize: 13,
  },
  guideList: { paddingLeft: 20, lineHeight: 2, fontSize: 14, color: "#374151", margin: 0 },
  code: {
    background: "#f1f5f9",
    borderRadius: 4,
    padding: "1px 6px",
    fontSize: 12,
    fontFamily: "monospace",
    color: "#0f172a",
  },
  studentBtnGrid: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 8,
  },
  studentBtn: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    padding: "10px 16px",
    border: "2px solid #e2e8f0",
    borderRadius: 12,
    background: "#f8fafc",
    cursor: "pointer",
    transition: "all 0.15s",
    minWidth: 80,
  },
  studentBtnActive: {
    border: "2px solid #2563eb",
    background: "#eff6ff",
  },
  studentBtnId: { fontSize: 11, color: "#6b7280", fontWeight: 500 },
  studentBtnName: { fontSize: 15, fontWeight: 700, color: "#1e293b", marginTop: 2 },
  scheduleTitleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    flexWrap: "wrap" as const,
    gap: 8,
  },
  reloadBtn: {
    padding: "8px 16px",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    background: "#f8fafc",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    color: "#374151",
  },
  emptyBox: {
    background: "#fef9c3",
    border: "1px solid #fde68a",
    borderRadius: 10,
    padding: "20px 24px",
    color: "#78350f",
    fontSize: 14,
    lineHeight: 1.8,
  },
  loadingBox: {
    padding: "40px",
    textAlign: "center" as const,
    color: "#6b7280",
    fontSize: 14,
  },
  noticeList: { display: "flex", flexDirection: "column" as const, gap: 12 },
  noticeCard: {
    background: "#f8fafc",
    borderRadius: 12,
    padding: "14px 18px",
    border: "1px solid #e2e8f0",
  },
  noticeHeader: { display: "flex", alignItems: "center", gap: 10, marginBottom: 8 },
  noticePill: {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 700,
  },
  noticeWriter: { fontSize: 12, color: "#6b7280" },
  noticeContent: { margin: 0, fontSize: 14, lineHeight: 1.7, color: "#1e293b", whiteSpace: "pre-wrap" as const },
  linkGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: 16,
  },
  linkCard: {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 16,
    background: "#f8fafc",
  },
  linkCardTop: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 },
  linkStudentName: { fontSize: 17, fontWeight: 700, color: "#0f172a" },
  linkStudentId: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  linkUrl: {
    fontSize: 11,
    color: "#6b7280",
    background: "#e2e8f0",
    borderRadius: 6,
    padding: "6px 10px",
    marginBottom: 10,
    wordBreak: "break-all" as const,
  },
  linkActions: { display: "flex", gap: 8 },
  linkOpenBtn: {
    flex: 1,
    textAlign: "center" as const,
    padding: "8px",
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    color: "#374151",
    textDecoration: "none",
    background: "#fff",
  },
  copyBtn: {
    flex: 1,
    padding: "8px",
    border: "none",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 700,
    color: "#fff",
    cursor: "pointer",
    transition: "background 0.2s",
  },
  footer: {
    textAlign: "center" as const,
    padding: "20px",
    fontSize: 12,
    color: "#94a3b8",
    borderTop: "1px solid #e2e8f0",
    background: "#fff",
    marginTop: 8,
  },
};