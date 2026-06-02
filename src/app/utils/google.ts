// src/app/utils/google.ts

export async function getSheetData(sheetName: string) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  const spreadsheetId = process.env.NEXT_PUBLIC_SPREADSHEET_ID;

  if (!apiKey || !spreadsheetId) return null;

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

// 💡 요일 전체(1~7교시) 시간표를 순서대로 파싱하는 핵심 함수
export function parseDayTimeline(rawData: string[][], targetDay: string) {
  if (!rawData || rawData.length === 0) return [];

  // 요일에 맞는 열(Column) 인덱스 찾기
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