'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowRight,
  ArrowUpRight,
  MessageCircle,
  Users,
  Brain,
  BarChart3,
  Sparkles,
  Quote,
  Circle,
  Play
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import InteractiveDemo from '@/components/InteractiveDemo'

const features = [
  {
    number: '01',
    title: '실시간 모니터링',
    description: '학생들의 입장 변화, AI 대화 현황, 근거 작성을 한눈에 파악하세요. 누가 도움이 필요한지 즉시 알 수 있습니다.',
    icon: Users,
  },
  {
    number: '02',
    title: 'AI 소크라테스',
    description: 'AI가 학생에게 "왜?"라고 묻습니다. 단순한 주장을 논리적 근거로 발전시키는 대화를 이끌어냅니다.',
    icon: Brain,
  },
  {
    number: '03',
    title: '입장 분석',
    description: '찬성·반대·중립의 분포와 각 입장의 핵심 근거를 시각화합니다. 토론의 흐름을 읽으세요.',
    icon: BarChart3,
  },
  {
    number: '04',
    title: '교수 개입',
    description: '적재적소에 힌트, 반례, 격려를 보내세요. 학생별 맞춤 피드백으로 토론의 깊이를 더합니다.',
    icon: Sparkles,
  },
]

const stats = [
  { value: '47%', label: '비판적 사고력 향상' },
  { value: '2.3x', label: '참여율 증가' },
  { value: '89%', label: '교수 만족도' },
]

export default function Home() {
  const [isDemoOpen, setIsDemoOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  })

  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0])
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.95])

  return (
    <div ref={containerRef} className="min-h-screen bg-background text-foreground noise-overlay">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-sm border-b-2 border-foreground">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="flex items-center justify-center transition-colors">
                <MessageCircle className="w-8 h-8 text-[hsl(var(--coral))] group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                Agora
              </span>
            </Link>

            <div className="flex items-center gap-6">
              <Link href="/login" className="text-sm font-medium hover:text-[hsl(var(--coral))] transition-colors">
                로그인
              </Link>
              <Link href="/register">
                <button className="btn-brutal-fill text-sm">
                  시작하기
                </button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <motion.section
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative min-h-screen flex items-center pt-16"
      >
        <div className="absolute inset-0 grid-pattern" />

        {/* Decorative Elements */}
        <div className="absolute top-32 right-12 w-24 h-24 border-2 border-foreground opacity-20" />
        <div className="absolute bottom-32 left-12 w-16 h-16 bg-[hsl(var(--coral))] opacity-30" />
        <div className="absolute top-1/2 right-1/4 w-4 h-4 bg-foreground" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="tag mb-8">대학 토론 플랫폼</div>

                <h1 className="mb-6 accent-line">
                  <span className="block">토론의</span>
                  <span className="block text-[hsl(var(--coral))]">새로운 장</span>
                </h1>

                <p className="text-xl lg:text-2xl text-muted-foreground max-w-xl mb-10 leading-relaxed">
                  AI 소크라테스 대화로 학생의 비판적 사고를 이끌어내고,
                  실시간으로 토론을 모니터링하세요.
                </p>

                <div className="flex flex-wrap gap-4">
                  <Link href="/register">
                    <button className="btn-brutal-fill flex items-center gap-2">
                      무료로 시작
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </Link>
                  <button
                    onClick={() => setIsDemoOpen(true)}
                    className="btn-brutal flex items-center gap-2"
                  >
                    데모 보기
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                  <InteractiveDemo
                    isOpen={isDemoOpen}
                    onOpenChange={setIsDemoOpen}
                  />
                </div>
              </motion.div>
            </div>

            {/* Right Content - Preview */}
            <motion.div
              className="lg:col-span-5"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="brutal-box bg-card p-6 relative">
                {/* Decorative corner */}
                <div className="absolute -top-3 -right-3 w-6 h-6 bg-[hsl(var(--coral))]" />

                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                  실시간 입장 분포
                </div>

                <div className="flex gap-3 mb-6">
                  <div className="flex-1">
                    <div className="h-32 bg-[hsl(var(--sage))] relative">
                      <div className="absolute bottom-2 left-2 text-white text-sm font-semibold">찬성 45%</div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="h-24 bg-[hsl(var(--coral))] relative">
                      <div className="absolute bottom-2 left-2 text-white text-sm font-semibold">반대 35%</div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="h-16 bg-foreground/30 relative">
                      <div className="absolute bottom-2 left-2 text-foreground text-sm font-semibold">중립 20%</div>
                    </div>
                  </div>
                </div>

                <div className="border-t-2 border-foreground pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Circle className="w-2 h-2 fill-[hsl(var(--sage))] text-[hsl(var(--sage))]" />
                    <span className="text-sm">학생 12 — 새 근거 추가</span>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <Circle className="w-2 h-2 fill-[hsl(var(--coral))] text-[hsl(var(--coral))]" />
                    <span className="text-sm">학생 7 — AI와 대화 중</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Circle className="w-2 h-2 fill-[hsl(var(--gold))] text-[hsl(var(--gold))]" />
                    <span className="text-sm">학생 3 — 도움 요청</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">Scroll</span>
          <div className="w-px h-12 bg-foreground/30" />
        </div>
      </motion.section>

      {/* Marquee Section */}
      <section className="py-8 border-y-2 border-foreground bg-foreground text-background overflow-hidden">
        <div className="marquee flex whitespace-nowrap">
          {[...Array(4)].map((_, i) => (
            <span key={i} className="flex items-center gap-8 px-8 text-lg font-semibold uppercase tracking-wider">
              <span>비판적 사고</span>
              <span className="w-2 h-2 bg-[hsl(var(--coral))]" />
              <span>논리적 근거</span>
              <span className="w-2 h-2 bg-[hsl(var(--coral))]" />
              <span>실시간 피드백</span>
              <span className="w-2 h-2 bg-[hsl(var(--coral))]" />
              <span>AI 대화</span>
              <span className="w-2 h-2 bg-[hsl(var(--coral))]" />
            </span>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-12 gap-16">
            {/* Section Header */}
            <div className="lg:col-span-4">
              <div className="sticky top-24">
                <div className="tag mb-4">기능</div>
                <h2 className="mb-6" style={{ fontFamily: 'var(--font-display)' }}>
                  토론을 혁신하는 도구
                </h2>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  교수와 학생 모두를 위한 스마트한 토론 환경을 제공합니다.
                </p>
              </div>
            </div>

            {/* Feature Cards */}
            <div className="lg:col-span-8 space-y-8">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.number}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="group"
                >
                  <div className="brutal-box bg-card p-8 flex gap-6">
                    <div className="number-badge flex-shrink-0">
                      {feature.number}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <feature.icon className="w-5 h-5 text-[hsl(var(--coral))]" />
                        <h3 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
                          {feature.title}
                        </h3>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 bg-foreground text-background diagonal-pattern">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center"
              >
                <div
                  className="text-6xl lg:text-7xl font-bold mb-4 text-[hsl(var(--coral))]"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {stat.value}
                </div>
                <div className="text-lg uppercase tracking-wider text-background/70">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Quote Section */}
      <section className="py-24 lg:py-32">
        <div className="max-w-4xl mx-auto px-6 lg:px-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative"
          >
            <Quote className="absolute -top-8 -left-4 w-24 h-24 text-[hsl(var(--coral))] opacity-20" />
            <blockquote
              className="text-3xl lg:text-4xl font-medium leading-relaxed pl-8 border-l-4 border-[hsl(var(--coral))]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              "Agora를 도입한 후, 학생들의 토론 참여도가 눈에 띄게 높아졌습니다.
              AI가 좋은 질문을 던져주니 학생들도 더 깊이 생각하게 되더군요."
            </blockquote>
            <div className="mt-8 pl-8">
              <div className="font-semibold">김교수</div>
              <div className="text-muted-foreground">서울대학교 철학과</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="brutal-box bg-foreground text-background p-12 lg:p-16 relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute top-0 right-0 w-96 h-96 border-[40px] border-background rounded-full translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 left-0 w-64 h-64 border-[30px] border-background translate-y-1/2 -translate-x-1/2" />
            </div>

            <div className="relative z-10 max-w-2xl">
              <h2 className="text-background mb-6" style={{ fontFamily: 'var(--font-display)' }}>
                더 나은 토론 수업을 시작하세요
              </h2>
              <p className="text-background/70 text-xl mb-8 leading-relaxed">
                지금 바로 Agora를 무료로 체험하고, AI와 함께하는 새로운 토론 경험을 만나보세요.
              </p>
              <Link href="/register">
                <button className="bg-[hsl(var(--coral))] text-white font-semibold uppercase tracking-wide px-8 py-4 hover:opacity-90 transition-opacity flex items-center gap-2">
                  무료로 시작하기
                  <ArrowRight className="w-5 h-5" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-2 border-foreground py-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-[hsl(var(--coral))]" />
              </div>
              <span className="font-semibold" style={{ fontFamily: 'var(--font-display)' }}>Agora</span>
            </div>

            <div className="flex items-center gap-8 text-sm text-muted-foreground">
              <Link href="#" className="hover:text-foreground transition-colors">이용약관</Link>
              <Link href="#" className="hover:text-foreground transition-colors">개인정보처리방침</Link>
              <Link href="#" className="hover:text-foreground transition-colors">문의하기</Link>
            </div>

            <div className="text-sm text-muted-foreground">
              © 2024 Agora. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
