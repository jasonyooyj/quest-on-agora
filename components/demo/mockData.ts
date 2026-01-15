// Mock data for interactive demo components

export const DEMO_MOCK = {
  topic: {
    title: "인공지능이 인간의 창의성을 대체할 수 있는가?",
    description: "AI 예술, 음악, 글쓰기의 발전과 한계에 대해 토론합니다. 창의성의 본질과 기계의 역할을 탐구하세요."
  },

  aiModes: [
    {
      value: 'socratic',
      label: '소크라테스',
      desc: '산파술 기반 깊은 탐구',
      color: 'emerald',
      preview: "흥미로운 관점이군요. 그렇다면 '창의성'의 본질은 무엇이라고 생각하시나요? 인간만이 가질 수 있는 특별한 것인가요?"
    },
    {
      value: 'balanced',
      label: '균형잡힌',
      desc: '다각도 관점의 조화',
      color: 'blue',
      preview: "AI 창의성에 대한 여러 관점이 있습니다. 찬성 측은 새로운 패턴 생성을, 반대 측은 진정한 의도의 부재를 주장합니다."
    },
    {
      value: 'debate',
      label: '디베이트',
      desc: '도전적이고 예리한 반론',
      color: 'rose',
      preview: "그 주장은 논리적 허점이 있습니다. AI가 이미 인간을 능가하는 예술 작품을 만들었다는 점을 어떻게 설명하시겠습니까?"
    },
    {
      value: 'minimal',
      label: '최소 개입',
      desc: '자율적인 토론 환경',
      color: 'zinc',
      preview: "자유롭게 토론을 진행해주세요. 필요할 때 질문드리겠습니다."
    },
  ],

  stances: {
    pro: { label: '찬성', color: 'emerald', icon: 'thumbs-up' },
    con: { label: '반대', color: 'rose', icon: 'thumbs-down' },
    neutral: { label: '중립', color: 'zinc', icon: 'minus' }
  },

  conversation: [
    {
      role: 'user' as const,
      content: "AI는 결국 프로그래밍된 패턴을 따르기 때문에 진정한 창의성은 불가능합니다. 창의성은 의식과 감정에서 비롯되는 것입니다.",
      time: "14:32"
    },
    {
      role: 'ai' as const,
      content: "흥미로운 관점이군요. 그렇다면 인간의 창의성은 어디에서 비롯된다고 생각하시나요? 인간 역시 경험과 학습의 패턴에서 영감을 얻지 않나요? 만약 그렇다면, AI와 인간의 창의적 과정은 어떤 본질적 차이가 있을까요?",
      time: "14:32"
    }
  ],

  dashboard: {
    stats: {
      total: 6,
      online: 5,
      submitted: 3,
      needsHelp: 1
    },
    distribution: {
      pro: 2,
      con: 2,
      neutral: 2
    },
    participants: [
      { id: '1', name: '김민지', stance: 'pro', isOnline: true, messageCount: 5, isSubmitted: true, turn: 4 },
      { id: '2', name: '이준혁', stance: 'con', isOnline: true, messageCount: 3, isSubmitted: false, needsHelp: true, turn: 2 },
      { id: '3', name: '박서연', stance: 'neutral', isOnline: true, messageCount: 2, isSubmitted: false, turn: 3 },
      { id: '4', name: '최다은', stance: 'pro', isOnline: false, messageCount: 4, isSubmitted: true, turn: 5 },
      { id: '5', name: '정우진', stance: 'con', isOnline: true, messageCount: 6, isSubmitted: true, turn: 6 },
      { id: '6', name: '한소희', stance: 'neutral', isOnline: true, messageCount: 1, isSubmitted: false, turn: 1 }
    ],
    messages: [
      { role: 'user' as const, participant: '김민지', stance: 'pro', content: 'AI의 창작물도 인간에게 감동을 줄 수 있다면, 그것도 창의성이라 할 수 있지 않을까요?', time: '14:28' },
      { role: 'ai' as const, content: '그렇다면 감동의 본질은 창작자의 의도인가요, 수용자의 해석인가요?', time: '14:28' },
      { role: 'user' as const, participant: '이준혁', stance: 'con', content: '창의성의 핵심은 의도와 맥락의 이해입니다. AI는 이것이 불가능합니다.', time: '14:30' }
    ],
    pinnedQuote: {
      content: "진정한 창의성은 의도와 의미의 부여에서 시작됩니다",
      author: '이준혁',
      stance: 'con'
    }
  }
}

export type DemoAiMode = typeof DEMO_MOCK.aiModes[number]
export type DemoParticipant = typeof DEMO_MOCK.dashboard.participants[number]
export type DemoMessage = typeof DEMO_MOCK.dashboard.messages[number]
