"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase-client";
import {
  GraduationCap,
  MessageSquare,
  Plus,
  Users,
  Calendar,
  Loader2,
  ArrowLeft,
  LayoutDashboard,
  TrendingUp,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { DiscussionCard } from "@/components/instructor/DiscussionCard";
import { ProfileMenuAuto } from "@/components/profile/ProfileMenuAuto";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Discussion {
  id: string;
  title: string;
  description?: string;
  status: string;
  joinCode: string;
  createdAt: string;
  closedAt?: string;
  participantCount: number;
}

export default function DiscussionsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user and check role
  useEffect(() => {
    const loadUser = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (!authUser) {
          router.push("/login");
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authUser.id)
          .single();

        if (profile) {
          setUser({ id: authUser.id, role: profile.role });
          if (profile.role !== "instructor") {
            router.push("/student");
            return;
          }
        } else {
          router.push("/login");
          return;
        }
      } catch (error) {
        console.error("Error loading user:", error);
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, [router]);

  const { data: discussions = [], isLoading: loading } = useQuery({
    queryKey: ["instructor-discussions", user?.id],
    queryFn: async () => {
      const response = await fetch("/api/discussions");
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch discussions");
      }
      const result = await response.json();
      return (result.discussions || []) as Discussion[];
    },
    enabled: !!(user && user.role === "instructor"),
    staleTime: 1000 * 60 * 5,
  });

  const deleteMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(`/api/discussions/${sessionId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete discussion");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["instructor-discussions", user?.id],
      });
      toast.success("토론이 삭제되었습니다");
    },
    onError: (error: Error) => {
      toast.error(error.message || "토론 삭제에 실패했습니다");
    },
  });

  const copyJoinCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("참여 코드가 복사되었습니다");
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const activeCount = discussions.filter((d) => d.status === "active").length;
  const closedCount = discussions.filter((d) => d.status === "closed").length;
  const totalParticipants = discussions.reduce(
    (sum, d) => sum + d.participantCount,
    0
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-t-2 border-primary animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-primary/20 rounded-full blur-xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900 selection:bg-primary/30">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/15 rounded-full blur-[120px] animate-blob mix-blend-multiply" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-200/40 rounded-full blur-[120px] animate-blob [animation-delay:2s] mix-blend-multiply" />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-purple-200/30 rounded-full blur-[100px] animate-blob [animation-delay:4s] mix-blend-multiply" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03] bg-center [mask-image:radial-gradient(ellipse_at_center,black,transparent)]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/instructor">
              <button className="w-10 h-10 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center hover:bg-zinc-200 transition-all active:scale-95 group">
                <ArrowLeft className="w-5 h-5 text-zinc-500 group-hover:text-zinc-900 transition-colors" />
              </button>
            </Link>
            <div>
              <h1 className="text-xl font-black tracking-tight text-zinc-900 leading-none">
                토론 세션 관리
              </h1>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 mt-1">
                Discussion Management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/instructor/discussions/new">
              <button className="h-12 px-6 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black text-sm flex items-center gap-2 hover:shadow-[0_4px_20px_rgba(99,102,241,0.4)] transition-all active:scale-95">
                <Plus className="w-5 h-5" />
                새 토론 만들기
              </button>
            </Link>
            <ProfileMenuAuto />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-8 relative z-10">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: '총 토론', value: discussions.length, icon: MessageSquare, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { label: '진행중', value: activeCount, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
            { label: '종료됨', value: closedCount, icon: CheckCircle2, color: 'text-zinc-500', bg: 'bg-zinc-500/10' },
            { label: '총 참여자', value: totalParticipants, icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-panel p-6 border-zinc-200 bg-white/90 relative overflow-hidden group shadow-sm"
            >
              <div className={`absolute top-0 right-0 w-24 h-24 ${stat.bg} rounded-full blur-3xl -mr-8 -mt-8 opacity-50 group-hover:opacity-100 transition-opacity`} />
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-10 h-10 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{stat.label}</span>
              </div>
              <p className="text-3xl font-black text-zinc-900">{stat.value.toLocaleString()}</p>
            </motion.div>
          ))}
        </div>

        {/* List Section */}
        <div className="space-y-6">
          <div className="flex items-end justify-between px-2">
            <div>
              <h2 className="text-2xl font-black text-zinc-900">내 토론 목록</h2>
              <p className="text-zinc-500 font-medium">생성된 모든 토론 세션입니다</p>
            </div>
            <div className="bg-zinc-100 px-4 py-2 rounded-full border border-zinc-200 text-[10px] font-black text-zinc-600 uppercase tracking-widest">
              {discussions.length} SESSIONS
            </div>
          </div>

          <div className="grid gap-4">
            {loading ? (
              <div className="glass-panel p-20 text-center border-zinc-200 bg-white/90 shadow-sm">
                <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
                <p className="text-zinc-500 font-bold">목록을 불러오는 중...</p>
              </div>
            ) : discussions.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-panel p-20 text-center border-zinc-200 bg-white/90 shadow-sm"
              >
                <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <MessageSquare className="w-10 h-10 text-zinc-400" />
                </div>
                <h3 className="text-2xl font-bold text-zinc-900 mb-3">생성된 토론이 없습니다</h3>
                <p className="text-zinc-500 mb-8 max-w-sm mx-auto font-medium">
                  첫 번째 토론을 만들어 학생들과 의미 있는 대화를 시작하세요.
                </p>
                <Link href="/instructor/discussions/new">
                  <button className="h-14 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-extrabold rounded-full px-8 hover:shadow-[0_4px_20px_rgba(99,102,241,0.4)] transition-all active:scale-95">
                    첫 토론 만들기
                  </button>
                </Link>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {discussions.map((discussion, index) => (
                  <motion.div
                    key={discussion.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <DiscussionCard
                      key={discussion.id}
                      discussion={discussion}
                      onCopyCode={copyJoinCode}
                      onDelete={handleDelete}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
