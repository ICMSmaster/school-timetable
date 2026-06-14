// app/api/sheets-data/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // 선생님의 구글시트 웹 게시 CSV 링크 주소
    const GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/NEXT_PUBLIC_SPREADSHEET_ID/pub?output=csv";
    
    const response = await fetch(GOOGLE_SHEET_CSV_URL, { cache: 'no-store' }); // 캐시 없이 실시간으로
    const csvText = await response.text();
    
    // 이후 csvText를 줄바꿈(\n)과 쉼표(,) 기준으로 쪼개어 JSON 구조로 변환 후 리턴
    // (이 부분이 세팅되면 프론트엔드 page.tsx에서 실시간으로 완벽하게 데이터를 받아옵니다.)

    return NextResponse.json({ notices: [] /* 파싱 데이터 */ });
  } catch (error) {
    return NextResponse.json({ error: "Fail to fetch" }, { status: 500 });
  }
}