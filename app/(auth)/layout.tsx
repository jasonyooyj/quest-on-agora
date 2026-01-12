export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#09090b] text-white selection:bg-primary/30">
      {children}
    </div>
  )
}
