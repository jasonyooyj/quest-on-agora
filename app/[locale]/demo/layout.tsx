import { DemoProvider } from '@/components/demo/live'

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DemoProvider>{children}</DemoProvider>
}
