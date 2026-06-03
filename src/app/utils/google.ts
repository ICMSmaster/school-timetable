// src/app/utils/google.ts

export interface Notice {
  target: string;   // B열: 학번_이름 또는 "전체"
  teacher: string;  // C열: 입력교사
  content: string;  // D열: 내용
}

// 1. 기존 시간표 데이터를 가져오는 함수 (그대로 유지)
export async function getSheetData(sheetName: string) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  const spreadsheetId = process.env.NEXT_PUBLIC_SPREADSHEET_ID;

  if (!apiKey || !spreadsheetId) return null;

  // 📍 기존 구조 유지를 위해 이 범위는 그대로 둡니다.
  const range = `${encodeURIComponent(sheetName)}!A1:F30`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`;

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    const data = await response.json();
    return data.values; 
  } catch (error) {
    return null;
  }
}

// 2. 📢 [새로 추가] 알림장 탭 전용으로 범위를 다르게 긁어오는 안전한 함수
export async function getNoticeData(): Promise<Notice[]> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  const spreadsheetId = process.env.NEXT_PUBLIC_SPREADSHEET_ID;

  if (!apiKey || !spreadsheetId) return [];

  // 🎯 알림장 탭의 A2부터 D500까지 넉넉하게 지정 (제목행 제외)
  const range = `알림장!A2:D500`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`;

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return [];
    
    const data = await response.json();
    const rawData = data.values;

    if (!rawData || rawData.length === 0) return [];

    // 사용자님의 시트 구조 (A:순번, B:이름/전체, C:입력교사, D:내용) 매핑
    return rawData.map((row: any) => {
      const target = row[1] ? String(row[1]).trim() : "";    // B열 (대상)
      const teacher = row[2] ? String(row[2]).trim() : "도움쌤"; // C열 (교사)
      const content = row[3] ? String(row[3]).trim() : "";   // D열 (내용)

      return { target, teacher, content };
    }).filter((notice: any) => notice.content !== "" && notice.target !== ""); // 유효한 데이터만 필터링
  } catch (error) {
    console.error("알림장 긁어오기 에러:", error);
    return [];
  }
}

// 3. 요일 전체(1~7교시) 시간표를 순서대로 파싱하는 핵심 함수 (그대로 유지)
export function parseDayTimeline(rawData: string[][], targetDay: string) {
  if (!rawData || rawData.length === 0) return [];

  const headerRow = rawData.find(row => row.includes("월") && row.includes("화"));
  if (!headerRow) return [];
  const dayIndex = headerRow.indexOf(targetDay);
  if (dayIndex === -1) return [];

  const periods = ["1교시", "2교시", "3교시", "4교시", "5교시", "6교시", "7교시"];
  
  return periods.map(period => {
    let periodRowIndex = -1;
    for (let i = 0; i < rawData.length; i++) {
      if (rawData[i][0] === period) {
        periodRowIndex = i;
        break;
      }
    }

    if (periodRowIndex === -1) {
      return { period, subject: "수업 없음", location: "교실", teacher: "" };
    }

    return {
      period,
      subject: rawData[periodRowIndex]?.[dayIndex] || "수업 없음",
      teacher: rawData[periodRowIndex + 1]?.[dayIndex] || "",
      location: rawData[periodRowIndex + 2]?.[dayIndex] || "교실",
    };
  });
}