import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import QueryProvider from "@/components/providers/QueryProvider";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "Agora - 대학 토론 플랫폼",
  description: "AI 기반 대학 토론 플랫폼. 교수와 학생이 함께하는 깊이 있는 토론 경험.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning={true}>
      <head>
        {/* Pretendard Font - Modern Korean Typography */}
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body
        className="antialiased min-h-screen relative overflow-x-hidden selection:bg-purple-200"
        suppressHydrationWarning={true}
      >
        <div className="fixed inset-0 z-[-1]">
          <div className="absolute inset-0 bg-white" />
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-200/40 blur-[120px] animate-blob" />
          <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-200/30 blur-[120px] animate-blob animation-delay-2000" />
          <div className="absolute bottom-[-20%] left-[20%] w-[50%] h-[50%] rounded-full bg-blue-100/30 blur-[120px] animate-blob animation-delay-4000" />
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-multiply" />
        </div>
        <QueryProvider>
          {children}
          <Toaster richColors position="top-right" theme="light" />
        </QueryProvider>
        <Analytics />
      </body>
    </html>
  );
}
