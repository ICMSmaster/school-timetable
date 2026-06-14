// app/api/sheets-data/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // 💡 선생님의 구글 시트 웹 게시(CSV) 링크를 여기에 넣으세요!
    const GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/NEXT_PUBLIC_SPREADSHEET_ID/pub?output=csv";
    
    // 캐시를 절대 쓰지 않고 실시간으로 구글에서 긁어옵니다.
    const response = await fetch(GOOGLE_SHEET_CSV_URL, { cache: 'no-store' });
    const csvText = await response.text();
    
    // CSV 한 줄씩 쪼개기
    const rows = csvText.split("\n").map(row => row.split(","));
    
    // 첫 번째 줄(헤더)을 제외한 데이터 파싱 (순서: 대상, 작성자, 내용, 날짜)
    const notices = rows.slice(1).map((row, index) => ({
      id: String(index + 1),
      target: row[0]?.trim() || "전체",
      writer: row[1]?.trim() || "특수교사",
      content: row[2]?.trim() || "",
      date: row[3]?.trim() || new Date().toLocaleDateString(),
    })).filter(item => item.content !== ""); // 내용이 비어있는 행은 제외

    return NextResponse.json({ notices });
  } catch (error) {
    return NextResponse.json({ error: "시트 데이터를 가져오는데 실패했습니다." }, { status: 500 });
  }
}