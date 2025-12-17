export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex noise-overlay">
      {/* Left Side - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-foreground text-background p-12 flex-col justify-between relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 diagonal-pattern opacity-10" />
        <div className="absolute top-20 right-20 w-64 h-64 border-[20px] border-background/10 rounded-full" />
        <div className="absolute bottom-20 left-20 w-32 h-32 bg-[hsl(var(--coral))] opacity-30" />

        <div className="relative z-10">
          <div className="w-12 h-12 bg-background flex items-center justify-center mb-8">
            <svg className="w-6 h-6 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h1
            className="text-4xl lg:text-5xl font-bold mb-4 leading-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Agora
          </h1>
          <p className="text-background/70 text-lg">
            대학 토론의 새로운 장을 열다
          </p>
        </div>

        <div className="relative z-10">
          <blockquote className="text-xl leading-relaxed mb-4 border-l-4 border-[hsl(var(--coral))] pl-6">
            "토론은 단순히 이기는 것이 아니라,
            함께 진실에 다가가는 과정입니다."
          </blockquote>
          <div className="text-background/50 text-sm">— 소크라테스</div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background grid-pattern">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  )
}
