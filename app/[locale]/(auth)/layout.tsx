export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-white text-zinc-900 selection:bg-purple-200">
      {children}
    </div>
  )
}
