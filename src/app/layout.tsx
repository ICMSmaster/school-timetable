import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ⚡ 메타데이터 타입을 명시하고 하나로 합쳤습니다.
export const metadata: Metadata = {
  title: "인터랙션 학교 시간표",
  description: "실시간 구글 시트 연동 타임라인",
  manifest: "/manifest.json", // PWA(앱 다운로드) 연결줄
};

// ⚡ 중복되던 함수를 지우고 기존 스타일과 완벽히 통합했습니다.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko" // 한국어 환경에 맞게 ko로 변경
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#F8F9FA] dark:bg-[#1C1C1E]">
        {children}
      </body>
    </html>
  );
}