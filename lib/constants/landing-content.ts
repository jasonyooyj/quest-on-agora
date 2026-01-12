import { Users, Brain, BarChart3, Sparkles } from "lucide-react";

export const HERO_CONTENT = {
    tag: "대학 토론 플랫폼",
    titlePrefix: "토론의",
    titleSuffix: "새로운 장",
    description:
        "AI 소크라테스 대화로 학생의 비판적 사고를 이끌어내고, 실시간으로 토론을 모니터링하세요.",
    ctaPrimary: "무료로 시작",
    ctaSecondary: "데모 보기",
};

export const MARQUEE_ITEMS = [
    "비판적 사고",
    "논리적 근거",
    "실시간 피드백",
    "AI 대화",
];

export const FEATURES_CONTENT = {
    tag: "기능",
    title: "토론을 혁신하는 도구",
    description: "교수와 학생 모두를 위한 스마트한 토론 환경을 제공합니다.",
    items: [
        {
            number: "01",
            title: "실시간 모니터링",
            description:
                "학생들의 입장 변화, AI 대화 현황, 근거 작성을 한눈에 파악하세요. 누가 도움이 필요한지 즉시 알 수 있습니다.",
            icon: Users,
        },
        {
            number: "02",
            title: "AI 소크라테스",
            description:
                'AI가 학생에게 "왜?"라고 묻습니다. 단순한 주장을 논리적 근거로 발전시키는 대화를 이끌어냅니다.',
            icon: Brain,
        },
        {
            number: "03",
            title: "입장 분석",
            description:
                "찬성·반대·중립의 분포와 각 입장의 핵심 근거를 시각화합니다. 토론의 흐름을 읽으세요.",
            icon: BarChart3,
        },
        {
            number: "04",
            title: "교수 개입",
            description:
                "적재적소에 힌트, 반례, 격려를 보내세요. 학생별 맞춤 피드백으로 토론의 깊이를 더합니다.",
            icon: Sparkles,
        },
    ],
};

export const STATS_CONTENT = [
    { value: "47%", label: "비판적 사고력 향상" },
    { value: "2.3x", label: "참여율 증가" },
    { value: "89%", label: "교수 만족도" },
];

export const QUOTE_CONTENT = {
    text: '"Agora를 도입한 후, 학생들의 토론 참여도가 눈에 띄게 높아졌습니다. AI가 좋은 질문을 던져주니 학생들도 더 깊이 생각하게 되더군요."',
    author: "김교수",
    affiliation: "서울대학교 철학과",
};

export const CTA_CONTENT = {
    title: "더 나은 토론 수업을 시작하세요",
    description:
        "지금 바로 Agora를 무료로 체험하고, AI와 함께하는 새로운 토론 경험을 만나보세요.",
    buttonText: "무료로 시작하기",
};
