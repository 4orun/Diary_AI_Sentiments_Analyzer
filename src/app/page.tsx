"use client";

import React, { useEffect, useState, useId } from "react";
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  SunMedium,
  RotateCcw,
  Save,
  Smile,
  Leaf,
  Coffee,
  Droplets,
  BookOpen,
  ArrowRight,
  Quote,
  Loader2,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  List,
  Trash2,
  Edit3,
  X,
  ExternalLink,
} from "lucide-react";
import confetti from "canvas-confetti";

export interface AnalysisData {
  primaryEmotion: "기쁨" | "평온" | "기대/설렘" | "피로" | "슬픔";
  confidence: number;
  emotions: {
    joy: number;
    calm: number;
    anticipation: number;
    fatigue: number;
    sadness: number;
  };
  weatherSummary: {
    status: string;
    scoreDesc: string;
  };
  primarySummary: {
    title: string;
    tag: string;
    description: string;
  };
  metrics: {
    achievementScore: number;
    vitalityScore: number;
    stressScore: number;
    stressLevelText: string;
  };
  radarValues: {
    joy: number;
    achievement: number;
    calm: number;
    stability: number;
    anticipation: number;
  };
  quoteInsight: string;
  careAction: string;
}

interface DiaryEntry {
  title: string;
  content: string;
  analysis: AnalysisData | null;
  updatedAt: string;
}

const EMOTION_ITEMS = [
  { key: "joy", label: "기쁨", icon: Smile, emoji: "🥳" },
  { key: "calm", label: "평온", icon: Leaf, emoji: "🌿" },
  { key: "anticipation", label: "기대/설렘", icon: Sparkles, emoji: "✨" },
  { key: "fatigue", label: "피로", icon: Coffee, emoji: "☕" },
  { key: "sadness", label: "슬픔", icon: Droplets, emoji: "💧" },
] as const;

const EMOTION_EMOJIS: Record<string, string> = {
  "기쁨": "🥳",
  "평온": "🌿",
  "기대/설렘": "✨",
  "피로": "☕",
  "슬픔": "💧",
};

function formatIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatKoreanDate(date: Date): string {
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${days[date.getDay()]})`;
}

export default function DiarySentimentPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentTimeStr, setCurrentTimeStr] = useState<string>("");
  const [entries, setEntries] = useState<Record<string, DiaryEntry>>({});
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 구글 시트 연동 상태
  const [isSavingSheet, setIsSavingSheet] = useState<boolean>(false);
  const [isListModalOpen, setIsListModalOpen] = useState<boolean>(false);
  const [sheetDiaries, setSheetDiaries] = useState<
    Array<{ timestamp: string; datetime: string; content: string }>
  >([]);
  const [isLoadingSheet, setIsLoadingSheet] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<{
    timestamp: string;
    datetime: string;
    content: string;
  } | null>(null);

  const selectedKey = formatIsoDate(selectedDate);
  const isToday = selectedKey === formatIsoDate(new Date());

  // 1. LocalStorage에서 저장된 일기 데이터 불러오기
  useEffect(() => {
    try {
      const stored = localStorage.getItem("diary_records_store_v1");
      if (stored) {
        const parsed = JSON.parse(stored);
        setEntries(parsed);
      }
    } catch (e) {
      console.error("Failed to load local storage entries", e);
    }
    setIsLoaded(true);
  }, []);

  // 2. 선택된 날짜 변경 시 해당 날짜의 일기 데이터 연동
  useEffect(() => {
    if (!isLoaded) return;
    const currentEntry = entries[selectedKey];
    if (currentEntry) {
      setTitle(currentEntry.title || "");
      setContent(currentEntry.content || "");
      setAnalysis(currentEntry.analysis || null);
    } else {
      setTitle("");
      setContent("");
      setAnalysis(null);
    }
  }, [selectedKey, isLoaded, entries]);

  // 3. 실시간 시간 갱신
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "오후" : "오전";
      const formattedHours = hours % 12 || 12;
      setCurrentTimeStr(`${ampm} ${formattedHours}:${minutes}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 날짜 이동 핸들러
  const handlePrevDay = () => {
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 1);
      return d;
    });
  };

  const handleNextDay = () => {
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 1);
      return d;
    });
  };

  const handleSelectDateFromPicker = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    const [y, m, d] = e.target.value.split("-").map(Number);
    setSelectedDate(new Date(y, m - 1, d));
  };

  // 임시저장 (LocalStorage)
  const saveCurrentEntry = (updatedAnalysis?: AnalysisData | null) => {
    const newEntry: DiaryEntry = {
      title,
      content,
      analysis: updatedAnalysis !== undefined ? updatedAnalysis : analysis,
      updatedAt: currentTimeStr,
    };
    const updatedEntries = {
      ...entries,
      [selectedKey]: newEntry,
    };
    setEntries(updatedEntries);
    try {
      localStorage.setItem("diary_records_store_v1", JSON.stringify(updatedEntries));
    } catch (e) {
      console.error(e);
    }
  };

  // Google Apps Script URL 가져오기
  const getScriptUrl = () => {
    const url = process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL;
    if (!url || !url.trim()) {
      showToast(".env.local에 NEXT_PUBLIC_GOOGLE_SCRIPT_URL을 설정해주세요.");
      return null;
    }
    return url.trim();
  };

  // 구글 시트에 일기 저장 (Create)
  const handleSaveToGoogleSheet = async () => {
    if (!content.trim()) {
      alert("저장할 일기 내용을 입력해주세요.");
      return;
    }

    const scriptUrl = getScriptUrl();
    if (!scriptUrl) return;

    setIsSavingSheet(true);
    // 로컬에도 먼저 저장
    saveCurrentEntry();

    const timestamp = Date.now().toString();
    const datetime = `${formatKoreanDate(selectedDate)} ${currentTimeStr}`.trim();

    try {
      // Google Apps Script는 CORS 리다이렉션을 거치므로 mode: 'no-cors' 또는 일반 POST를 지원
      // JSON 문자열 payload를 body로 전달
      await fetch(scriptUrl, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify({
          action: "create",
          timestamp,
          datetime,
          content: title ? `[${title}]\n${content}` : content,
        }),
      });

      showToast("구글 시트에 일기가 성공적으로 저장되었습니다!");
    } catch (error) {
      console.error("Failed to save to Google Sheets:", error);
      showToast("구글 시트 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSavingSheet(false);
    }
  };

  // 구글 시트에서 일기 리스트 불러오기 (Read)
  const handleFetchSheetDiaries = async () => {
    const scriptUrl = getScriptUrl();
    if (!scriptUrl) return;

    setIsLoadingSheet(true);
    setIsListModalOpen(true);
    try {
      const res = await fetch(`${scriptUrl}?action=readAll`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        // 최신순으로 정렬
        setSheetDiaries(data.data.reverse());
      } else {
        setSheetDiaries([]);
        showToast(data.message || "일기 목록을 가져오지 못했습니다.");
      }
    } catch (error) {
      console.error("Failed to fetch Google Sheet entries:", error);
      showToast("구글 시트 목록을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setIsLoadingSheet(false);
    }
  };

  // 구글 시트 항목 수정 (Update)
  const handleUpdateSheetDiary = async (timestamp: string, newContent: string) => {
    const scriptUrl = getScriptUrl();
    if (!scriptUrl) return;

    try {
      await fetch(scriptUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "update",
          timestamp,
          content: newContent,
        }),
      });

      setSheetDiaries((prev) =>
        prev.map((item) =>
          item.timestamp === timestamp ? { ...item, content: newContent } : item
        )
      );
      setEditingItem(null);
      showToast("성공적으로 수정되었습니다.");
    } catch (error) {
      console.error("Failed to update Google Sheet entry:", error);
      showToast("수정 중 오류가 발생했습니다.");
    }
  };

  // 구글 시트 항목 삭제 (Delete)
  const handleDeleteSheetDiary = async (timestamp: string) => {
    if (!window.confirm("정말 이 일기를 삭제하시겠습니까?")) return;

    const scriptUrl = getScriptUrl();
    if (!scriptUrl) return;

    try {
      await fetch(scriptUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "delete",
          timestamp,
        }),
      });

      setSheetDiaries((prev) => prev.filter((item) => item.timestamp !== timestamp));
      showToast("일기가 삭제되었습니다.");
    } catch (error) {
      console.error("Failed to delete Google Sheet entry:", error);
      showToast("삭제 중 오류가 발생했습니다.");
    }
  };

  // 재시작 / 초기화 핸들러
  const handleReset = () => {
    if (
      (content.trim().length > 0 || analysis) &&
      !window.confirm("현재 작성 중인 일기와 분석 결과를 초기화하고 새로 시작하시겠습니까?")
    ) {
      return;
    }
    setTitle("");
    setContent("");
    setAnalysis(null);

    const updated = { ...entries };
    delete updated[selectedKey];
    setEntries(updated);
    try {
      localStorage.setItem("diary_records_store_v1", JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    showToast("일기 작성이 깨끗하게 초기화되었습니다.");
  };

  // AI 감성 분석 실행 핸들러
  const handleAnalyze = async () => {
    if (!content.trim()) {
      alert("일기 내용을 입력해주세요.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          diaryText: content,
        }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || "분석에 실패했습니다.");
      }

      const analyzedData: AnalysisData = resData.data;
      setAnalysis(analyzedData);

      // 로컬 스토리지에 자동 저장
      const newEntry: DiaryEntry = {
        title,
        content,
        analysis: analyzedData,
        updatedAt: currentTimeStr,
      };
      const updatedEntries = {
        ...entries,
        [selectedKey]: newEntry,
      };
      setEntries(updatedEntries);
      try {
        localStorage.setItem("diary_records_store_v1", JSON.stringify(updatedEntries));
      } catch (e) {
        console.error(e);
      }

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });
      showToast("감성 분석이 완료되었습니다!");
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "감성 분석 중 일시적인 오류가 발생했습니다.";
      showToast(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // 일주일 날짜 칩 생성 (선택된 날짜 기준 ±3일)
  const weekChips = [-3, -2, -1, 0, 1, 2, 3].map((offset) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    const key = formatIsoDate(d);
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    const dayLabel = `${days[d.getDay()]} ${d.getDate()}`;
    const isSelected = offset === 0;
    const record = entries[key];
    const emoji = record?.analysis?.primaryEmotion
      ? EMOTION_EMOJIS[record.analysis.primaryEmotion]
      : record?.content
      ? "📝"
      : "--";

    return {
      date: d,
      key,
      dayLabel,
      isSelected,
      emoji,
      hasContent: Boolean(record?.content),
    };
  });

  // 작성된 일기 일수 계산
  const recordedDaysCount = Object.keys(entries).filter(
    (k) => entries[k]?.content?.trim()
  ).length;

  const wordCount = content.replace(/\s+/g, "").length;
  const readTimeMin = Math.max(1, Math.ceil(wordCount / 300));

  // 분석 영역 노출 여부 (분석 진행 중이거나 이미 분석 결과가 있는 경우 표시)
  const showAnalysisSection = isLoading || analysis !== null;

  return (
    <div className="min-h-screen bg-[#FDF8FD] flex flex-col justify-between text-[#1C1B1F]">
      {/* 토스트 피드백 알림 */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#1C1B1F] text-white px-5 py-2.5 rounded-full shadow-lg text-sm flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-[#CBC4D2]/40 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#6750A4] to-[#9A82DB] flex items-center justify-center text-white shadow-sm shadow-[#6750A4]/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-bold text-lg text-[#1C1B1F] tracking-tight">
            마음일기<span className="text-[#6750A4] ml-0.5">AI</span>
          </span>
          <span className="text-xs text-[#7A7582] pl-2 border-l border-[#CBC4D2]">
            AI 감정 분석 다이어리
          </span>
        </div>

        <div className="flex items-center gap-2 bg-[#F1ECF2] px-3.5 py-1.5 rounded-full text-xs font-medium text-[#494551]">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>{formatKoreanDate(new Date())}</span>
        </div>
      </header>

      {/* 메인 콘텐츠 영역 */}
      <main className="max-w-[1360px] w-full mx-auto p-4 sm:p-6 lg:p-8 flex-1 space-y-6">
        {/* 상단 캘린더 날짜 탐색 바 & 상태 배너 */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          {/* 주간 날짜 탐색기 */}
          <div className="lg:col-span-8 bg-white border border-[#CBC4D2]/40 rounded-2xl p-2.5 sm:p-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={handlePrevDay}
                aria-label="이전 날짜로 이동"
                className="p-2 rounded-xl hover:bg-[#F1ECF2] text-[#494551] transition active:scale-95 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* 날짜 선택 인풋 (클릭 시 달력 팝업) */}
              <label className="relative flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-[#F7F2F8] cursor-pointer transition">
                <CalendarIcon className="w-4 h-4 text-[#6750A4]" />
                <span className="text-sm sm:text-base font-semibold text-[#1C1B1F]">
                  {formatKoreanDate(selectedDate)}
                </span>
                <input
                  type="date"
                  value={selectedKey}
                  onChange={handleSelectDateFromPicker}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  title="날짜 직접 선택"
                />
              </label>

              <button
                type="button"
                onClick={handleNextDay}
                aria-label="다음 날짜로 이동"
                className="p-2 rounded-xl hover:bg-[#F1ECF2] text-[#494551] transition active:scale-95 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {!isToday && (
                <button
                  type="button"
                  onClick={() => setSelectedDate(new Date())}
                  className="text-xs px-2.5 py-1 rounded-full bg-[#EADDFF] text-[#21005D] font-semibold hover:bg-[#d8c5fa] transition cursor-pointer"
                >
                  오늘로 이동
                </button>
              )}
            </div>

            {/* 주간 기분 칩 (선택 가능) */}
            <div className="hidden sm:flex items-center gap-1.5">
              {weekChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => setSelectedDate(chip.date)}
                  className={`flex flex-col items-center px-2.5 py-1 rounded-xl text-[11px] transition cursor-pointer ${
                    chip.isSelected
                      ? "bg-[#6750A4] text-white shadow-sm font-bold scale-105"
                      : "text-[#494551] hover:bg-[#F1ECF2]"
                  }`}
                >
                  <span className={`text-[10px] ${chip.isSelected ? "text-purple-200" : "text-[#7A7582]"}`}>
                    {chip.dayLabel}
                  </span>
                  <span className="text-base my-0.5">{chip.emoji}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 감정 기상도 요약 배너 */}
          <div className="lg:col-span-4 bg-gradient-to-r from-white to-[#F7F2F8] border border-[#CBC4D2]/40 rounded-2xl p-3 sm:px-4 sm:py-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#E0D2FF]/60 flex items-center justify-center text-[#6750A4]">
                <SunMedium className="w-5 h-5 text-[#6750A4]" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-[#7A7582]">감정 기상도</p>
                <p className="text-sm font-bold text-[#1C1B1F]">
                  {analysis ? (
                    <>
                      {analysis.weatherSummary.status}{" "}
                      <span className="text-xs font-semibold text-[#6750A4]">
                        ({analysis.weatherSummary.scoreDesc})
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-[#7A7582] font-normal">
                      일기 작성 후 분석을 눌러보세요
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="text-right border-l border-[#CBC4D2]/50 pl-3">
              <span className="inline-block text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                {recordedDaysCount > 0
                  ? `총 ${recordedDaysCount}일 기록 중`
                  : "첫 번째 일기 시작"}
              </span>
            </div>
          </div>
        </section>

        {/* 메인 레이아웃: 일기 작성 영역 + (분석 시 우측에 나타나는 대시보드) */}
        <div
          className={`grid grid-cols-1 ${
            showAnalysisSection ? "lg:grid-cols-12" : "max-w-4xl mx-auto"
          } gap-6 transition-all duration-500`}
        >
          {/* ===================== 일기 작성 영역 ===================== */}
          <div className={`${showAnalysisSection ? "lg:col-span-7" : "w-full"} space-y-6`}>
            <div className="bg-white border border-[#CBC4D2]/40 rounded-3xl p-6 sm:p-7 shadow-sm transition hover:shadow-md space-y-5">
              {/* 일기 제목 & 작성 시간 영역 */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1.5 border-b border-[#F1ECF2]">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="일기 제목을 입력하세요..."
                  className="flex-1 text-lg sm:text-xl font-bold text-[#1C1B1F] placeholder-[#CBC4D2] bg-transparent focus:outline-none transition py-1"
                />
                <div className="flex items-center gap-1.5 text-xs text-[#7A7582] flex-shrink-0 bg-[#F7F2F8] px-3 py-1.5 rounded-full">
                  <Clock className="w-3.5 h-3.5 text-[#6750A4]" />
                  <span>
                    {formatKoreanDate(selectedDate)} {currentTimeStr}
                  </span>
                </div>
              </div>

              {/* 일기 본문 텍스트 영역 */}
              <div className="relative">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="오늘 어떤 감정과 순간들이 머물렀나요? 자유롭게 당신의 이야기를 들려주세요..."
                  rows={13}
                  className="w-full p-4 sm:p-5 text-sm sm:text-base leading-relaxed bg-[#F7F2F8]/70 hover:bg-[#F7F2F8] focus:bg-white border border-transparent focus:border-[#6750A4] rounded-2xl resize-none focus:outline-none transition shadow-inner"
                />
              </div>

              {/* 글자수 & 액션 버튼 모음 */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-1">
                {/* 좌측: 글자수/읽는 시간 + 그 밑에 초기화 및 저장 버튼 */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3 text-xs text-[#7A7582]">
                    <span>{wordCount}자 작성됨</span>
                    <span>•</span>
                    <span>예상 읽는 시간 {readTimeMin}분</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* 저장 버튼 */}
                    <button
                      type="button"
                      onClick={handleSaveToGoogleSheet}
                      disabled={isSavingSheet}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#6750A4] bg-[#6750A4]/5 text-[#6750A4] hover:bg-[#6750A4]/15 text-xs font-semibold transition active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      {isSavingSheet ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>{isSavingSheet ? "저장 중..." : "저장"}</span>
                    </button>

                    {/* 일기보기 버튼 */}
                    <button
                      type="button"
                      onClick={handleFetchSheetDiaries}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#CBC4D2] text-[#494551] hover:bg-[#F1ECF2] hover:text-[#1C1B1F] text-xs font-semibold transition active:scale-95 cursor-pointer"
                    >
                      <List className="w-3.5 h-3.5 text-[#6750A4]" />
                      <span>일기보기</span>
                    </button>
                  </div>
                </div>

                {/* 우측: 재시작 버튼 & AI 감성 분석 버튼 */}
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {/* 재시작(초기화) 버튼 */}
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#CBC4D2] text-[#494551] hover:bg-[#F1ECF2] hover:text-[#1C1B1F] text-xs font-semibold transition active:scale-95 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>재시작</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAnalyze}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#6750A4] hover:bg-[#4F378A] active:scale-95 text-white text-xs sm:text-sm font-semibold shadow-md shadow-[#6750A4]/25 transition disabled:opacity-50 cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Gemini 분석 중...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>AI 감성 분석</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* 하단 마음 루틴 팁 */}
            <div className="bg-white border border-[#CBC4D2]/40 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-center gap-4">
              <div className="w-full sm:w-24 h-20 rounded-xl bg-gradient-to-tr from-purple-100 to-rose-100 flex items-center justify-center flex-shrink-0 text-3xl">
                📖
              </div>
              <div className="space-y-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6750A4] bg-[#EADDFF] px-2 py-0.5 rounded-full">
                    마음 루틴 팁
                  </span>
                  <span className="text-xs text-[#7A7582]">잠들기 30분 전</span>
                </div>
                <h4 className="text-sm font-bold text-[#1C1B1F]">
                  감정을 문장으로 적으면 편도체의 긴장이 40% 감소합니다
                </h4>
                <p className="text-xs text-[#494551] leading-relaxed">
                  자신의 감정에 이름을 붙여주는 명명(Affect Labeling) 과정을 통해 뇌는 자연스러운 안정감을 찾습니다.
                </p>
              </div>
            </div>
          </div>

          {/* ===================== 우측: 감성 이모지 및 분석 결과 영역 (초기 숨김, 분석 시작 시 노출) ===================== */}
          {showAnalysisSection && (
            <div className="lg:col-span-5 space-y-6 animate-in fade-in duration-500">
              {isLoading ? (
                /* 로딩 스켈레톤 상태 */
                <div className="bg-white border border-[#CBC4D2]/40 rounded-3xl p-8 shadow-sm text-center space-y-4 flex flex-col items-center justify-center min-h-[420px]">
                  <div className="w-16 h-16 rounded-full bg-[#E0D2FF] flex items-center justify-center text-[#6750A4] animate-pulse">
                    <Sparkles className="w-8 h-8 animate-spin" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-[#1C1B1F]">
                      Gemini 3.8 Flash가 일기를 읽고 있습니다
                    </h3>
                    <p className="text-xs text-[#7A7582]">
                      문장에 깃든 미세한 감정의 결을 분석하고 있습니다...
                    </p>
                  </div>
                  <div className="w-48 h-2 bg-[#F1ECF2] rounded-full overflow-hidden">
                    <div className="h-full bg-[#6750A4] rounded-full animate-pulse w-3/4"></div>
                  </div>
                </div>
              ) : analysis ? (
                <>
                  {/* 1. 감성 분석 대시보드 카드 */}
                  <div className="bg-white border border-[#CBC4D2]/40 rounded-3xl p-6 shadow-sm space-y-5">
                    <div className="flex items-center justify-between pb-2 border-b border-[#F1ECF2]">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-[#E0D2FF] flex items-center justify-center text-[#6750A4]">
                          <Smile className="w-4 h-4" />
                        </div>
                        <h3 className="font-bold text-base text-[#1C1B1F]">감성 분석 대시보드</h3>
                      </div>
                      <span className="text-[11px] font-semibold text-[#6750A4] bg-[#EADDFF]/60 px-2.5 py-0.5 rounded-full">
                        신뢰도 {analysis.confidence.toFixed(1)}%
                      </span>
                    </div>

                    {/* 5개 감성 이모지 영역 (Gemini 선정 주감정 강조) */}
                    <div className="grid grid-cols-5 gap-2">
                      {EMOTION_ITEMS.map((item) => {
                        const isPrimary = analysis.primaryEmotion === item.label;
                        const currentPercent =
                          item.key === "joy"
                            ? analysis.emotions.joy
                            : item.key === "calm"
                            ? analysis.emotions.calm
                            : item.key === "anticipation"
                            ? analysis.emotions.anticipation
                            : item.key === "fatigue"
                            ? analysis.emotions.fatigue
                            : analysis.emotions.sadness;

                        return (
                          <div
                            key={item.key}
                            className={`relative flex flex-col items-center justify-center p-2.5 rounded-2xl transition duration-300 ${
                              isPrimary
                                ? "bg-gradient-to-b from-[#FAF4FF] to-[#F3E8FF] border-2 border-[#6750A4] shadow-md -translate-y-1 scale-105"
                                : "bg-[#F7F2F8] border border-transparent opacity-80 hover:opacity-100"
                            }`}
                          >
                            {/* 주감정 뱃지 강조 */}
                            {isPrimary && (
                              <span className="absolute -top-2.5 px-2 py-0.5 rounded-full bg-[#6750A4] text-white text-[9px] font-bold shadow-sm whitespace-nowrap animate-bounce">
                                주감정
                              </span>
                            )}

                            <span className="text-2xl sm:text-3xl my-1">{item.emoji}</span>
                            <span
                              className={`text-xs font-semibold ${
                                isPrimary ? "text-[#6750A4] font-bold" : "text-[#494551]"
                              }`}
                            >
                              {item.label}
                            </span>
                            <span className="text-[11px] text-[#7A7582] font-medium mt-0.5">
                              {currentPercent}%
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* 주감정 요약 박스 */}
                    <div className="bg-gradient-to-br from-[#FAF5FF] via-[#FFF1F3] to-[#F6F5FF] border border-[#E0D2FF] rounded-2xl p-4 sm:p-5 space-y-2 relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-4 bg-[#6750A4] rounded-full"></span>
                          <h4 className="font-bold text-sm sm:text-base text-[#1C1B1F]">
                            {analysis.primarySummary.title}
                          </h4>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#A33951] bg-[#FFD9DD] px-2 py-0.5 rounded-full">
                          {analysis.primarySummary.tag}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-[#494551] leading-relaxed">
                        {analysis.primarySummary.description}
                      </p>
                    </div>
                  </div>

                  {/* 2. 심층 심리 지표 분석 카드 */}
                  <div className="bg-white border border-[#CBC4D2]/40 rounded-3xl p-6 shadow-sm space-y-5">
                    <div className="flex items-center justify-between pb-2 border-b border-[#F1ECF2]">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-[#E0D2FF] flex items-center justify-center text-[#6750A4]">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <h3 className="font-bold text-base text-[#1C1B1F]">심층 심리 지표 분석</h3>
                      </div>
                      <span className="text-xs text-[#7A7582]">실시간 산출 완료</span>
                    </div>

                    {/* 3가지 선형 게이지 지표 */}
                    <div className="space-y-4">
                      {/* 1. 성취도 */}
                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className="flex items-center gap-1.5 text-[#1C1B1F]">
                            <span className="w-2 h-2 rounded-full bg-[#4F378A]"></span>
                            성취도 및 자아 효능감
                          </span>
                          <span className="text-[#4F378A] font-bold">
                            {analysis.metrics.achievementScore}점
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-[#F1ECF2] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#6750A4] to-[#4F378A] rounded-full transition-all duration-700"
                            style={{ width: `${analysis.metrics.achievementScore}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* 2. 활력도 */}
                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className="flex items-center gap-1.5 text-[#1C1B1F]">
                            <span className="w-2 h-2 rounded-full bg-[#A33951]"></span>
                            심리적 활력 및 기대치
                          </span>
                          <span className="text-[#A33951] font-bold">
                            {analysis.metrics.vitalityScore}점
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-[#F1ECF2] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#FF8199] to-[#A33951] rounded-full transition-all duration-700"
                            style={{ width: `${analysis.metrics.vitalityScore}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* 3. 긴장 & 스트레스 */}
                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className="flex items-center gap-1.5 text-[#1C1B1F]">
                            <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                            심리적 긴장 및 스트레스
                          </span>
                          <span className="text-sky-700 font-bold">
                            {analysis.metrics.stressScore}점 ({analysis.metrics.stressLevelText})
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-[#F1ECF2] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-sky-400 to-indigo-500 rounded-full transition-all duration-700"
                            style={{ width: `${analysis.metrics.stressScore}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* 감정 균형 오각형 레이더 차트 */}
                    <div className="pt-2 flex flex-col items-center">
                      <p className="text-xs font-semibold text-[#7A7582] mb-1">감정 균형 다이어그램</p>
                      <RadarChart values={analysis.radarValues} />
                    </div>

                    {/* AI 코멘트 인용구 박스 */}
                    <div className="bg-[#F7F2F8] rounded-2xl p-4 border border-[#CBC4D2]/40 relative">
                      <Quote className="w-6 h-6 text-[#6750A4]/20 absolute right-3 bottom-3" />
                      <p className="text-xs sm:text-sm text-[#1C1B1F] italic leading-relaxed">
                        &ldquo;{analysis.quoteInsight}&rdquo;
                      </p>
                    </div>

                    {/* 추천 케어 액션 버튼 */}
                    <div className="bg-gradient-to-r from-[#FFF5F7] to-[#FAF5FF] border border-[#FFD9DD] rounded-2xl p-3.5 flex items-center justify-between hover:shadow-sm transition cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#FF8199]/20 flex items-center justify-center text-[#A33951]">
                          ⭐
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-[#A33951] uppercase">
                            추천 케어 액션
                          </span>
                          <p className="text-xs font-bold text-[#1C1B1F]">{analysis.careAction}</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#A33951]" />
                    </div>
                  </div>

                  {/* 3. 기록 현황 배너 */}
                  <div className="bg-white border border-[#CBC4D2]/40 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-xs text-[#7A7582]">나의 감정 기록 현황</p>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-2xl font-bold text-[#1C1B1F]">
                          {recordedDaysCount}일
                        </span>
                        <span className="text-xs font-semibold text-[#6750A4]">
                          {recordedDaysCount === 0 ? "첫 발걸음" : "기록 누적 중"}
                        </span>
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-[#6750A4]">
                      <CheckCircle2 className="w-5 h-5 text-[#6750A4]" />
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          )}
        </div>
      </main>

      {/* 구글 시트 일기 목록 모달 (CRUD) */}
      {isListModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-[#CBC4D2]/50 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#F1ECF2] bg-[#F7F2F8]/50">
              <div className="flex items-center gap-2">
                <List className="w-5 h-5 text-[#6750A4]" />
                <h3 className="font-bold text-[#1C1B1F] text-base">구글 시트 저장 일기 목록</h3>
                <span className="text-xs bg-[#EADDFF] text-[#21005D] px-2 py-0.5 rounded-full font-semibold">
                  {sheetDiaries.length}건
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleFetchSheetDiaries}
                  disabled={isLoadingSheet}
                  className="text-xs text-[#6750A4] hover:underline px-2 py-1"
                >
                  새로고침
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsListModalOpen(false);
                    setEditingItem(null);
                  }}
                  className="p-1.5 rounded-full hover:bg-[#EADDFF]/50 text-[#494551] transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 모달 내용 */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {isLoadingSheet ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-[#7A7582]">
                  <Loader2 className="w-8 h-8 animate-spin text-[#6750A4]" />
                  <p className="text-sm">구글 시트에서 일기를 불러오는 중입니다...</p>
                </div>
              ) : sheetDiaries.length === 0 ? (
                <div className="text-center py-16 text-[#7A7582] space-y-2">
                  <BookOpen className="w-10 h-10 mx-auto text-[#CBC4D2]" />
                  <p className="text-sm font-medium">저장된 일기가 없습니다.</p>
                  <p className="text-xs">일기를 작성하고 [저장] 버튼을 눌러보세요.</p>
                </div>
              ) : (
                sheetDiaries.map((item) => {
                  const isEditing = editingItem?.timestamp === item.timestamp;
                  return (
                    <div
                      key={item.timestamp}
                      className="border border-[#CBC4D2]/40 rounded-2xl p-4 bg-[#FDFBFE] hover:shadow-sm transition space-y-3"
                    >
                      {/* 카드 상단: 날짜시간 및 제어 버튼 */}
                      <div className="flex items-center justify-between text-xs text-[#7A7582] border-b border-[#F1ECF2] pb-2">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Clock className="w-3.5 h-3.5 text-[#6750A4]" />
                          <span>{item.datetime || "일시 미기록"}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {/* 불러오기/채우기 버튼 */}
                          <button
                            type="button"
                            onClick={() => {
                              setContent(item.content);
                              setIsListModalOpen(false);
                              showToast("일기 내용을 에디터로 불러왔습니다.");
                            }}
                            className="text-xs px-2 py-1 text-[#6750A4] hover:bg-[#EADDFF]/50 rounded-lg transition font-medium cursor-pointer"
                            title="에디터로 불러오기"
                          >
                            에디터에 넣기
                          </button>
                          {/* 수정 버튼 */}
                          <button
                            type="button"
                            onClick={() => {
                              if (isEditing) {
                                setEditingItem(null);
                              } else {
                                setEditingItem({ ...item });
                              }
                            }}
                            className="p-1 hover:bg-[#EADDFF]/50 rounded-lg text-[#494551] transition cursor-pointer"
                            title="내용 수정"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {/* 삭제 버튼 */}
                          <button
                            type="button"
                            onClick={() => handleDeleteSheetDiary(item.timestamp)}
                            className="p-1 hover:bg-rose-100 rounded-lg text-rose-500 transition cursor-pointer"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* 내용 영역 */}
                      {isEditing ? (
                        <div className="space-y-2">
                          <textarea
                            value={editingItem.content}
                            onChange={(e) =>
                              setEditingItem({ ...editingItem, content: e.target.value })
                            }
                            rows={4}
                            className="w-full text-xs sm:text-sm p-3 bg-white border border-[#6750A4] rounded-xl focus:outline-none"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingItem(null)}
                              className="px-3 py-1.5 text-xs rounded-full border border-[#CBC4D2] text-[#494551] hover:bg-[#F1ECF2]"
                            >
                              취소
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateSheetDiary(item.timestamp, editingItem.content)
                              }
                              className="px-3 py-1.5 text-xs rounded-full bg-[#6750A4] text-white hover:bg-[#4F378A] font-semibold"
                            >
                              수정 완료
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs sm:text-sm text-[#1C1B1F] whitespace-pre-wrap leading-relaxed">
                          {item.content}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* 모달 푸터 */}
            <div className="px-6 py-3 border-t border-[#F1ECF2] bg-[#F7F2F8]/50 flex justify-end">
              <button
                type="button"
                onClick={() => setIsListModalOpen(false)}
                className="px-4 py-1.5 text-xs font-semibold rounded-full bg-[#1C1B1F] text-white hover:bg-black transition"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 세련된 푸터 영역 */}
      <footer className="mt-16 border-t border-[#E8E0EB] bg-gradient-to-b from-white/60 to-[#F6EFF7]/70 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* 좌측: 로고 및 설명 */}
            <div className="flex items-center gap-3 text-center md:text-left">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#6750A4] to-[#8E78C8] flex items-center justify-center text-white shadow-sm shadow-[#6750A4]/20 flex-shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#1C1B1F] tracking-tight">
                  Diary AI Sentiments Analyzer
                </p>
                <p className="text-xs text-[#7A7582] mt-0.5">
                  AI 기반 마음 일기 감정 분석 및 클라우드 아카이빙 플랫폼
                </p>
              </div>
            </div>

            {/* 우측: 뱃지 및 저작권 정보 */}
            <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-6 text-xs text-[#7A7582]">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 border border-[#E0D7E5] text-[11px] font-medium text-[#6750A4] shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Gemini 3.8 Flash Powered
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#EADDFF]/60 text-[11px] font-medium text-[#21005D]">
                  Google Sheets Synchronized
                </span>
              </div>
            </div>
          </div>

          {/* 하단 구분선 및 저작권 문구 */}
          <div className="mt-6 pt-6 border-t border-[#ECE5EE]/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#8F8A96]">
            <p className="font-medium tracking-wide">
              Copyright INU Diary AI Sentiments Analyzer by kyonam Choo
            </p>
            <p>
              All rights reserved. Designed for mindful journaling.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// 5각 레이더 다이어그램 컴포넌트
function RadarChart({
  values,
}: {
  values: {
    joy: number;
    achievement: number;
    calm: number;
    stability: number;
    anticipation: number;
  };
}) {
  const gradientId = useId();
  const size = 220;
  const center = size / 2;
  const radius = 70;

  const angles = [-90, -18, 54, 126, 198];
  const labels = [
    `설렘 (${values.anticipation}%)`,
    `성취 (${values.achievement}%)`,
    `평온 (${values.calm}%)`,
    `안정 (${values.stability}%)`,
    `기쁨 (${values.joy}%)`,
  ];

  const getCoordinates = (angleDeg: number, valPercent: number) => {
    const angleRad = (angleDeg * Math.PI) / 180;
    const r = (radius * valPercent) / 100;
    const x = center + r * Math.cos(angleRad);
    const y = center + r * Math.sin(angleRad);
    return { x, y };
  };

  const levels = [0.25, 0.5, 0.75, 1];

  const valArray = [
    values.anticipation,
    values.achievement,
    values.calm,
    values.stability,
    values.joy,
  ];

  const polygonPoints = valArray
    .map((v, i) => {
      const { x, y } = getCoordinates(angles[i], v);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={size} height={size} className="overflow-visible select-none">
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6750A4" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#FF8199" stopOpacity="0.25" />
        </linearGradient>
      </defs>

      {levels.map((lvl) => {
        const pts = angles
          .map((ang) => {
            const { x, y } = getCoordinates(ang, lvl * 100);
            return `${x},${y}`;
          })
          .join(" ");
        return (
          <polygon
            key={lvl}
            points={pts}
            fill="none"
            stroke="#CBC4D2"
            strokeDasharray={lvl === 1 ? "none" : "2 2"}
            strokeWidth={lvl === 1 ? "1" : "0.5"}
          />
        );
      })}

      {angles.map((ang, i) => {
        const outer = getCoordinates(ang, 100);
        return (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={outer.x}
            y2={outer.y}
            stroke="#CBC4D2"
            strokeWidth="0.8"
          />
        );
      })}

      <polygon
        points={polygonPoints}
        fill={`url(#${gradientId})`}
        stroke="#6750A4"
        strokeWidth="2"
        className="transition-all duration-500 ease-out"
      />

      {valArray.map((v, i) => {
        const { x, y } = getCoordinates(angles[i], v);
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="3.5"
            className="fill-[#6750A4] stroke-white stroke-[1.5]"
          />
        );
      })}

      {angles.map((ang, i) => {
        const labelCoord = getCoordinates(ang, 122);
        return (
          <text
            key={i}
            x={labelCoord.x}
            y={labelCoord.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-[9px] fill-[#494551] font-semibold"
          >
            {labels[i]}
          </text>
        );
      })}
    </svg>
  );
}
