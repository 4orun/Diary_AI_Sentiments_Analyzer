import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Diary AI Sentiments Analyzer",
  description: "당신의 소중한 감정을 안전하게 기록하고 AI로 섬세하게 분석하는 마음일기",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={`${plusJakarta.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#FDF8FD] text-[#1C1B1F] font-sans">
        {children}
      </body>
    </html>
  );
}
