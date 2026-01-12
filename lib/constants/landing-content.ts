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

export const TESTIMONIALS = [
    {
        text: '"Agora를 도입한 후, 학생들의 토론 참여도가 눈에 띄게 높아졌습니다. AI가 좋은 질문을 던져주니 학생들도 더 깊이 생각하게 되더군요."',
        author: "김상민 교수님",
        affiliation: "홍익대학교 경영학과",
        role: "instructor" as const,
    },
    {
        text: '"AI가 제 논리의 허점을 짚어줘서 더 깊이 생각하게 됐어요. 처음엔 당황했지만, 덕분에 훨씬 탄탄한 주장을 만들 수 있었습니다."',
        author: "이준 학생",
        affiliation: "고려대학교 경영학과",
        role: "student" as const,
    },
    {
        text: '"30명 수업에서 실시간으로 모든 학생의 참여를 파악할 수 있어 효율적입니다. 누가 어려워하는지 바로 알 수 있어요."',
        author: "박정상 교수님",
        affiliation: "고려대학교 사회학과",
        role: "instructor" as const,
    },
];

export const USE_CASES = [
    {
        title: "철학 수업",
        description: "윤리적 딜레마에 대한 토론으로 비판적 사고력을 키웁니다. 학생들이 다양한 관점에서 문제를 바라보게 됩니다.",
        metric: "참여율 180% 증가",
        subject: "Philosophy",
    },
    {
        title: "경영학 케이스 스터디",
        description: "실제 기업 사례를 분석하고 의사결정을 토론합니다. 데이터 기반의 논증 능력을 향상시킵니다.",
        metric: "근거 기반 논증 47% 향상",
        subject: "Business",
    },
    {
        title: "법학 모의재판",
        description: "찬반 입장에서 법적 논리를 전개합니다. 판례와 법조문을 근거로 설득력 있는 주장을 펼칩니다.",
        metric: "학생 만족도 92%",
        subject: "Law",
    },
];

export const PROBLEMS_SOLUTIONS = {
    problems: [
        {
            title: "소수만 참여하는 토론",
            description: "대형 강의에서 발언하는 학생은 항상 같은 몇 명뿐. 나머지 학생들은 수동적으로 듣기만 합니다.",
        },
        {
            title: "피상적인 의견 제시",
            description: "근거 없이 감정적 주장만 오가는 토론. 깊이 있는 분석과 논리적 사고가 부족합니다.",
        },
        {
            title: "실시간 파악의 어려움",
            description: "30명 학생의 사고 과정을 일일이 확인할 수 없습니다. 누가 어려워하는지 알기 어렵습니다.",
        },
    ],
    solutions: [
        {
            title: "전원 동시 참여",
            description: "모든 학생이 자신의 입장과 근거를 실시간으로 공유합니다. 발언 기회를 기다릴 필요가 없습니다.",
        },
        {
            title: "AI 소크라테스 대화",
            description: "AI가 '왜 그렇게 생각하나요?'를 물어 논리적 근거 작성을 유도합니다. 사고의 깊이를 더합니다.",
        },
        {
            title: "대시보드 모니터링",
            description: "입장 분포, AI 대화 현황, 도움 요청을 한눈에 파악합니다. 적재적소에 개입할 수 있습니다.",
        },
    ],
};

export const FAQ_CONTENT = {
    tag: "자주 묻는 질문",
    title: "궁금하신 점이 있으신가요?",
    items: [
        {
            question: "Agora는 무료인가요?",
            answer: "네, 기본 기능은 무료로 사용하실 수 있습니다. 대규모 수업이나 고급 분석 기능이 필요하신 경우 프로 플랜을 고려해보세요.",
        },
        {
            question: "AI가 학생 대신 답을 작성해주나요?",
            answer: "아니요. Agora의 AI는 소크라테스처럼 질문을 통해 학생 스스로 생각을 발전시키도록 유도합니다. 답을 제시하지 않고 '왜 그렇게 생각하나요?', '어떤 근거가 있나요?'와 같은 질문으로 비판적 사고를 촉진합니다.",
        },
        {
            question: "몇 명까지 동시 참여가 가능한가요?",
            answer: "한 토론당 최대 100명까지 동시 참여가 가능합니다. 대규모 수업의 경우 분반을 나누어 진행하시는 것을 권장드립니다.",
        },
        {
            question: "학생 데이터는 어떻게 보호되나요?",
            answer: "모든 데이터는 암호화되어 저장되며, 개인정보처리방침에 따라 엄격하게 관리됩니다. 교수님만 본인 수업의 데이터에 접근할 수 있습니다.",
        },
        {
            question: "기존 LMS와 연동이 가능한가요?",
            answer: "현재 Moodle, Canvas 등 주요 LMS와의 연동을 준비 중입니다. 연동이 필요하신 경우 문의해주시면 우선 지원해드리겠습니다.",
        },
    ],
};

export const AI_MODES_CONTENT = {
    tag: "4가지 AI 모드",
    title: "수업 목표에 맞는 AI를 선택하세요",
    description:
        "학생의 사고를 이끄는 방식을 교수님이 직접 설정할 수 있습니다.",
};

export const AI_MODES = [
    {
        id: "socratic",
        label: "소크라테스 산파술",
        title: "무의식을 깨우는 질문",
        description:
            "AI가 '산파'가 되어 학생의 내면에 숨겨진 무의식적 전제와 신념을 끄집어냅니다. 표면적인 논리가 아닌, 근본적인 가치관을 탐구하도록 집요하게 질문합니다.",
        example: {
            student: "정의로운 사회를 위해 법은 엄격해야 합니다.",
            ai: "엄격함이 정의를 보장한다고 믿으시는군요. 그렇다면 선생님이 생각하는 '정의'의 본질은 무엇인가요? 처벌인가요, 아니면 교화인가요?",
        },
        color: "sage" as const,
    },
    {
        id: "balanced",
        label: "균형 잡힌",
        title: "양측 관점을 균형있게",
        description:
            "학생의 의견에 공감하면서도 부드럽게 다른 관점을 소개합니다. 한쪽으로 치우치지 않고 다양한 시각을 탐색하도록 돕습니다.",
        example: {
            student: "재택근무가 업무 효율을 높인다고 생각합니다.",
            ai: "집중력 향상과 통근 시간 절약이라는 장점이 있죠. 동시에 팀 협업이나 신입 사원 온보딩에서의 어려움은 어떻게 생각하시나요?",
        },
        color: "gold" as const,
    },
    {
        id: "debate",
        label: "토론",
        title: "날카로운 반론으로 논쟁",
        description:
            "AI가 '악마의 변호인' 역할을 맡아 학생의 주장에 적극적으로 반론합니다. 논리적 허점을 파고들어 더 탄탄한 논증을 만들도록 자극합니다.",
        example: {
            student: "인공지능이 많은 일자리를 대체할 것입니다.",
            ai: "하지만 산업혁명 때도 같은 우려가 있었지만 오히려 새로운 직업군이 생겨났습니다. AI가 대체하기 어려운 영역은 무엇이며, 역사적 선례를 어떻게 설명하시겠습니까?",
        },
        color: "coral" as const,
    },
    {
        id: "minimal",
        label: "최소 개입",
        title: "자율적 사고 촉진",
        description:
            "AI가 학생의 발언을 요약하고 확인하는 역할만 합니다. 학생 스스로 생각을 정리하고 발전시킬 수 있도록 최소한의 개입만 제공합니다.",
        example: {
            student: "소셜 미디어가 청소년에게 부정적 영향을 미친다고 생각합니다.",
            ai: "소셜 미디어의 부정적 영향에 대해 의견을 주셨네요. 이 주장을 뒷받침할 구체적인 근거가 있으신가요?",
        },
        color: "muted" as const,
    },
];

export const CTA_CONTENT = {
    title: "더 나은 토론 수업을 시작하세요",
    description:
        "지금 바로 Agora를 무료로 체험하고, AI와 함께하는 새로운 토론 경험을 만나보세요.",
    buttonText: "무료로 시작하기",
};
