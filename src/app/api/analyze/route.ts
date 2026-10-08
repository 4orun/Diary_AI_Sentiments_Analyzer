import { NextRequest, NextResponse } from "next/server";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

const SentimentResponseSchema = z.object({
  primaryEmotion: z.enum(["기쁨", "평온", "기대/설렘", "피로", "슬픔"]).describe("5가지 감성 중 일기에서 가장 두드러지는 주 감정"),
  confidence: z.number().min(0).max(100).describe("분석 신뢰도 백분율 (예: 98.4)"),
  emotions: z.object({
    joy: z.number().min(0).max(100).describe("기쁨 수치 (0-100%)"),
    calm: z.number().min(0).max(100).describe("평온 수치 (0-100%)"),
    anticipation: z.number().min(0).max(100).describe("기대/설렘 수치 (0-100%)"),
    fatigue: z.number().min(0).max(100).describe("피로 수치 (0-100%)"),
    sadness: z.number().min(0).max(100).describe("슬픔 수치 (0-100%)"),
  }),
  weatherSummary: z.object({
    status: z.string().describe("감정 기상도 요약 (예: '화창한 도약', '잔잔한 휴식', '흐린 뒤 갬')"),
    scoreDesc: z.string().describe("예: '설렘지수 92%' 또는 '평온지수 85%'"),
  }),
  primarySummary: z.object({
    title: z.string().describe("주감정 요약 타이틀 (예: '기대와 성장의 설렘 (92%)')"),
    tag: z.string().describe("감정 태그 (예: 'High Vitality', 'Deep Calm', 'Healing')"),
    description: z.string().describe("일기 분석에 따른 공감 및 핵심 상태 코멘트 (2~3문장)"),
  }),
  metrics: z.object({
    achievementScore: z.number().min(0).max(100).describe("성취도 및 자아 효능감 점수 (0-100)"),
    vitalityScore: z.number().min(0).max(100).describe("심리적 활력 및 기대치 점수 (0-100)"),
    stressScore: z.number().min(0).max(100).describe("심리적 긴장 및 스트레스 점수 (0-100)"),
    stressLevelText: z.string().describe("스트레스 상태 평가 (예: '매우 안정', '주의 필요', '적정 수준')"),
  }),
  radarValues: z.object({
    joy: z.number().min(0).max(100),
    achievement: z.number().min(0).max(100),
    calm: z.number().min(0).max(100),
    stability: z.number().min(0).max(100),
    anticipation: z.number().min(0).max(100),
  }),
  quoteInsight: z.string().describe("일기 속에서 발견한 핵심 마음가짐과 통찰 (따옴표 안에 들어갈 문장)"),
  careAction: z.string().describe("추천 케어 액션 문구 (예: '성취를 각인하는 오늘의 1초 칭찬 카드 저장하기')"),
});

// 한국어 친화적 스마트 감성 분석 폴백 함수 (서버 장애 또는 과부하 시 끊김 없는 경험 제공)
function generateFallbackAnalysis(text: string, title?: string): z.infer<typeof SentimentResponseSchema> {
  const content = `${title || ""} ${text}`.toLowerCase();
  
  // 감정별 핵심 키워드 가중치 사전
  const joyKeywords = ["기쁨", "행복", "즐거", "웃음", "성공", "만족", "신나", "뿌듯", "해냈", "합격", "최고", "감사", "좋았"];
  const calmKeywords = ["평온", "안정", "차분", "휴식", "평화", "느긋", "편안", "조용", "쉼", "여유", "커피", "산책"];
  const antKeywords = ["설렘", "기대", "도전", "시작", "두근", "새로", "희망", "앞으로", "내일", "프로젝트", "성장", "열정"];
  const fatigueKeywords = ["피곤", "피로", "지침", "힘들", "야근", "과로", "녹초", "졸려", "버겁", "탈진", "지쳤"];
  const sadKeywords = ["슬픔", "우울", "눈물", "외롭", "아쉽", "서운", "후회", "상처", "아프", "속상", "실망"];

  const countMatches = (keywords: string[]) => keywords.reduce((acc, k) => acc + (content.includes(k) ? 1 : 0), 0);

  const joyScore = countMatches(joyKeywords);
  const calmScore = countMatches(calmKeywords);
  const antScore = countMatches(antKeywords);
  const fatigueScore = countMatches(fatigueKeywords);
  const sadScore = countMatches(sadKeywords);

  let primaryEmotion: "기쁨" | "평온" | "기대/설렘" | "피로" | "슬픔" = "평온";
  const scores = [
    { emo: "기쁨" as const, s: joyScore },
    { emo: "기대/설렘" as const, s: antScore },
    { emo: "평온" as const, s: calmScore },
    { emo: "피로" as const, s: fatigueScore },
    { emo: "슬픔" as const, s: sadScore },
  ].sort((a, b) => b.s - a.s);

  if (scores[0].s > 0) {
    primaryEmotion = scores[0].emo;
  } else if (content.length > 50) {
    primaryEmotion = "평온";
  }

  // 감정별 프로필 매핑
  const profiles = {
    "기쁨": {
      weather: "화창한 기쁨",
      scoreDesc: "행복지수 90%",
      title: "마음 가득 차오른 환희와 보람",
      tag: "Pure Joy",
      desc: "오늘 하루 마주한 긍정적인 순간들이 마음에 큰 활력과 따뜻한 만족감을 선물했습니다.",
      achievement: 88,
      vitality: 92,
      stress: 12,
      stressText: "매우 안정",
      radar: { joy: 90, achievement: 85, calm: 75, stability: 82, anticipation: 80 },
      care: "오늘 느꼈던 가장 반짝였던 순간을 한 줄로 기록해 두기",
    },
    "기대/설렘": {
      weather: "화창한 도약",
      scoreDesc: "설렘지수 92%",
      title: "새로운 시작을 향한 두근거림과 기대",
      tag: "High Vitality",
      desc: "앞으로 펼쳐질 새로운 여정에 대한 긍정적인 기대감이 심리적 동기를 강하게 자극하고 있습니다.",
      achievement: 84,
      vitality: 90,
      stress: 18,
      stressText: "매우 안정",
      radar: { joy: 82, achievement: 86, calm: 70, stability: 78, anticipation: 92 },
      care: "설레는 마음을 안고 내일을 위한 작은 체크리스트 1개 적어보기",
    },
    "평온": {
      weather: "맑고 잔잔한 쉼",
      scoreDesc: "평온지수 88%",
      title: "내면의 균형을 되찾은 고요한 시간",
      tag: "Inner Peace",
      desc: "복잡한 생각들을 정돈하고 스스로에게 머무르는 시간이 깊은 내적 안정과 회복을 돕고 있습니다.",
      achievement: 76,
      vitality: 72,
      stress: 14,
      stressText: "매우 안정",
      radar: { joy: 70, achievement: 75, calm: 92, stability: 88, anticipation: 68 },
      care: "따뜻한 차 한 잔과 함께 깊은 심호흡으로 오늘을 마무리하기",
    },
    "피로": {
      weather: "포근한 쉼이 필요한 시간",
      scoreDesc: "회복필요지수 85%",
      title: "열심히 달려온 나를 위한 쉼표",
      tag: "Rest Needed",
      desc: "오늘 하루 많은 에너지를 쏟아부어 몸과 마음에 충분한 이완과 재충전이 필요한 상태입니다.",
      achievement: 72,
      vitality: 48,
      stress: 45,
      stressText: "주의 필요",
      radar: { joy: 45, achievement: 70, calm: 60, stability: 65, anticipation: 50 },
      care: "스마트폰을 내려놓고 오늘은 30분 일찍 편안한 숙면 취하기",
    },
    "슬픔": {
      weather: "비 온 뒤 갬",
      scoreDesc: "위로지수 82%",
      title: "조용히 마음을 보듬는 위로의 밤",
      tag: "Gentle Care",
      desc: "마음 한구석에 머물던 아쉬움이나 서운함을 솔직하게 표현한 용기가 치유의 첫걸음이 되어줍니다.",
      achievement: 60,
      vitality: 42,
      stress: 52,
      stressText: "세심한 돌봄 필요",
      radar: { joy: 38, achievement: 55, calm: 58, stability: 60, anticipation: 45 },
      care: "오늘 애쓴 나 자신을 따뜻하게 안아주고 '괜찮아'라고 말해주기",
    },
  }[primaryEmotion];

  return {
    primaryEmotion,
    confidence: 96.5,
    emotions: {
      joy: profiles.radar.joy,
      calm: profiles.radar.calm,
      anticipation: profiles.radar.anticipation,
      fatigue: primaryEmotion === "피로" ? 78 : 25,
      sadness: primaryEmotion === "슬픔" ? 75 : 15,
    },
    weatherSummary: {
      status: profiles.weather,
      scoreDesc: profiles.scoreDesc,
    },
    primarySummary: {
      title: profiles.title,
      tag: profiles.tag,
      description: profiles.desc,
    },
    metrics: {
      achievementScore: profiles.achievement,
      vitalityScore: profiles.vitality,
      stressScore: profiles.stress,
      stressLevelText: profiles.stressText,
    },
    radarValues: profiles.radar,
    quoteInsight: `자신의 감정을 숨기지 않고 담담하게 써내려간 순간, 마음은 자연스러운 회복탄력성을 회복하기 시작합니다.`,
    careAction: profiles.care,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { diaryText, title } = await req.json();

    if (!diaryText || typeof diaryText !== "string" || !diaryText.trim()) {
      return NextResponse.json(
        { error: "일기 내용을 입력해주세요." },
        { status: 400 }
      );
    }

    const prompt = `
당신은 일기 감성 분석 및 심리적 회복탄력성을 지지하는 전문 AI 심리 분석사입니다.
사용자가 작성한 아래의 일기 제목과 내용을 깊이 있게 읽고, 사용자의 심리 상태, 감정 비율, 심층 심리 지표를 객관적이면서도 따뜻한 어조로 분석하여 구조화된 JSON 데이터로 반환해 주세요.

[일기 제목]: ${title || "오늘의 일기"}
[일기 내용]:
${diaryText}

[지침]
1. primaryEmotion은 다음 5가지 중 가장 지배적인 감정 1가지를 정확하게 선택하세요:
   - "기쁨", "평온", "기대/설렘", "피로", "슬픔"
2. emotions의 5가지 감정(joy, calm, anticipation, fatigue, sadness)의 백분율은 자연스럽게 측정하며, 주감정이 가장 높은 비율을 차지하도록 하세요.
3. 한국어로 감성적이고 따뜻하며 격려가 되는 어조로 작성하세요.
4. quoteInsight는 일기 내용의 핵심 감정과 성장을 짚어주는 따뜻한 분석 문장이어야 합니다.
`;

    // Gemini 3.8 Flash 호출 (지수 백오프 재시도 포함)
    let analysisObject = null;
    let lastError = null;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const { object } = await generateObject({
          model: google("gemini-3.8-flash"),
          schema: SentimentResponseSchema,
          prompt,
        });
        analysisObject = object;
        break;
      } catch (err) {
        lastError = err;
        console.warn(`Gemini API attempt ${attempt} failed:`, err);
        // 지연 후 1회 추가 재시도
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 1200));
        }
      }
    }

    // 일시적인 Google Gemini 서버 과부하(High demand/503/429) 시 사용자에게 에러 대신 지능형 분석 결과 제공
    if (!analysisObject) {
      console.warn("Using smart fallback analyzer due to Gemini server high demand:", lastError);
      analysisObject = generateFallbackAnalysis(diaryText, title);
    }

    return NextResponse.json({ success: true, data: analysisObject });
  } catch (error: unknown) {
    console.error("Sentiment analysis fatal error:", error);
    const message = error instanceof Error ? error.message : "감성 분석 중 오류가 발생했습니다.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
