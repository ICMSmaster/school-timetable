// src/app/api/sheets-data/route.ts

import { NextResponse } from "next/server";
import {
  getSheetData,
  getNoticeData,
  parseDayTimeline,
} from "@/app/utils/google";

const STUDENTS = [
  { id: "20110", classCode: "2-1", name: "김한얼" },
  { id: "20121", classCode: "2-1", name: "이정준" },
  { id: "20306", classCode: "2-3", name: "김현중" },
  { id: "20311", classCode: "2-3", name: "박진현" },
  { id: "20402", classCode: "2-4", name: "강민준" },
  { id: "20406", classCode: "2-4", name: "김세현" },
  { id: "20418", classCode: "2-4", name: "손민찬" },
  { id: "20612", classCode: "2-6", name: "손찬민" },
  { id: "20616", classCode: "2-6", name: "오승철" },
  { id: "20813", classCode: "2-8", name: "박찬석" },
  { id: "20906", classCode: "2-9", name: "김재원" },
  { id: "21026", classCode: "2-10", name: "조연우" },
  { id: "21027", classCode: "2-10", name: "최재범" },
];

const studentRegistry: Record<string, string> = {
  "20110": "20110_김한얼",
  "20121": "20121_이정준",
  "20306": "20306_김현중",
  "20311": "20311_박진현",
  "20402": "20402_강민준",
  "20406": "20406_김세현",
  "20418": "20418_손민찬",
  "20612": "20612_손찬민",
  "20616": "20616_오승철",
  "20813": "20813_박찬석",
  "20906": "20906_김재원",
  "21026": "21026_조연우",
  "21027": "21027_최재범",
};

const DAYS = ["월", "화", "수", "목", "금"];

export async function GET() {
  try {
    const students = [];
    const timelines: Record<string, any> = {};

    for (const student of STUDENTS) {
      const sheetName = studentRegistry[student.id];

      const rawData = await getSheetData(sheetName);

      if (!rawData) continue;

      const weekData = DAYS.map((day) =>
        parseDayTimeline(rawData, day).map(
          (item: any) => item.subject || ""
        )
      );

      timelines[student.id] = weekData;

      students.push({
        ...student,
        location: "학습도움실",
        status: "정상",
      });
    }

    const noticeRows = await getNoticeData();

    const notices: Record<string, any[]> = {};

    STUDENTS.forEach((student) => {
      const sheetName = studentRegistry[student.id];

      notices[student.id] = noticeRows.filter(
        (notice) =>
          notice.target === "전체" ||
          notice.target === sheetName
      );
    });

    return NextResponse.json({
      students,
      timelines,
      notices,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        students: [],
        timelines: {},
        notices: {},
      },
      { status: 500 }
    );
  }
}