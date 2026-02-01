// Extended mock data for instructor demo view

export interface MockStudentConversation {
  studentId: string
  messages: Array<{
    role: 'user' | 'ai'
    content: string
    time: string
  }>
}

export const MOCK_CONVERSATIONS: MockStudentConversation[] = [
  {
    studentId: '1',
    messages: [
      { role: 'user', content: 'AI의 창작물도 인간에게 감동을 줄 수 있다면, 그것도 창의성이라 할 수 있지 않을까요?', time: '14:28' },
      { role: 'ai', content: '그렇다면 감동의 본질은 창작자의 의도인가요, 수용자의 해석인가요?', time: '14:28' },
      { role: 'user', content: '수용자의 해석이 더 중요하다고 생각해요. 예술의 가치는 결국 감상자가 부여하는 것이니까요.', time: '14:30' },
      { role: 'ai', content: '흥미로운 관점이네요. 그렇다면 의도 없이 우연히 만들어진 자연 현상도 예술이 될 수 있을까요?', time: '14:30' },
      { role: 'user', content: '음... 자연은 예술의 영감이 될 수는 있지만, 예술 그 자체는 아니라고 생각해요. 창작의 의도가 없으니까요.', time: '14:32' },
    ]
  },
  {
    studentId: '2',
    messages: [
      { role: 'user', content: '창의성의 핵심은 의도와 맥락의 이해입니다. AI는 이것이 불가능합니다.', time: '14:30' },
      { role: 'ai', content: '의도와 맥락의 이해가 핵심이라면, AI가 학습 데이터의 맥락을 파악하고 적절히 응용하는 것은 어떻게 보시나요?', time: '14:30' },
      { role: 'user', content: '패턴 매칭일 뿐이에요. 진정한 이해와는 다릅니다.', time: '14:32' },
    ]
  },
  {
    studentId: '3',
    messages: [
      { role: 'user', content: 'AI와 인간의 창의성은 다른 종류라고 생각해요. 비교 자체가 적절하지 않을 수도 있어요.', time: '14:29' },
      { role: 'ai', content: '다른 종류의 창의성이라면, 각각의 특징과 가치는 무엇이라고 생각하시나요?', time: '14:29' },
    ]
  },
  {
    studentId: '5',
    messages: [
      { role: 'user', content: 'AI는 기존 데이터를 조합할 뿐, 진정으로 새로운 것을 만들어내지 못해요.', time: '14:26' },
      { role: 'ai', content: '그렇다면 인간의 창의성도 기존 경험과 지식의 조합이 아닐까요? 둘 사이의 본질적 차이는 무엇일까요?', time: '14:26' },
      { role: 'user', content: '인간은 경험에 감정과 의미를 부여해요. AI는 그럴 수 없죠.', time: '14:27' },
      { role: 'ai', content: '감정과 의미 부여가 창의성의 필수 조건이라면, 감정 없이도 객관적으로 뛰어난 작품을 만들 수는 없을까요?', time: '14:27' },
      { role: 'user', content: '기술적으로 뛰어난 것과 창의적인 것은 다르다고 생각해요.', time: '14:29' },
      { role: 'ai', content: '그 차이를 구체적으로 설명해주실 수 있나요? 기술적 완성도와 창의성을 구분하는 기준은 무엇일까요?', time: '14:29' },
    ]
  },
  {
    studentId: '6',
    messages: [
      { role: 'user', content: '저는 아직 이 주제에 대해 확실한 입장이 없어요.', time: '14:31' },
    ]
  },
]

export const ADDITIONAL_MOCK_MESSAGES = [
  {
    studentId: '2',
    content: 'AI가 만든 그림이 미술상을 받았다고 해서 그것이 창의성의 증거는 아니에요. 심사위원들이 AI 작품인지 몰랐을 뿐이죠.',
    stance: 'con' as const,
  },
  {
    studentId: '3',
    content: '인간의 창의성은 실수와 우연에서 오기도 해요. AI도 랜덤성을 가질 수 있으니, 그것도 일종의 창의성 아닐까요?',
    stance: 'neutral' as const,
  },
  {
    studentId: '1',
    content: 'AI 음악이 사람들을 감동시키고 있어요. 감동을 주는 것이 예술의 본질이라면, AI도 예술가라고 할 수 있지 않을까요?',
    stance: 'pro' as const,
  },
  {
    studentId: '6',
    content: '두 입장 모두 일리가 있어 보여요. 창의성의 정의 자체를 다시 생각해봐야 할 것 같아요.',
    stance: 'neutral' as const,
  },
  {
    studentId: '5',
    content: 'AI는 도구일 뿐이에요. 붓이 화가를 대체할 수 없듯이, AI도 인간 창작자를 대체할 수 없어요.',
    stance: 'con' as const,
  },
]

export const PINNED_QUOTES = [
  {
    content: '진정한 창의성은 의도와 의미의 부여에서 시작됩니다',
    author: '이준혁',
    stance: 'con' as const,
  },
  {
    content: '감동을 주는 것이 예술의 본질이라면, AI도 예술가라고 할 수 있지 않을까요?',
    author: '김민지',
    stance: 'pro' as const,
  },
  {
    content: '창의성의 정의 자체를 다시 생각해봐야 할 것 같아요',
    author: '한소희',
    stance: 'neutral' as const,
  },
]
