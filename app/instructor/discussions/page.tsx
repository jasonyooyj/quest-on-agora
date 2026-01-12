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
} from "lucide-react";
import { DiscussionCard } from "@/components/instructor/DiscussionCard";
import { toast } from "sonner";

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

        // Get profile to check role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authUser.id)
          .single();

        if (profile) {
          setUser({ id: authUser.id, role: profile.role });
          
          // Redirect non-instructors
          if (profile.role !== "instructor") {
            router.push("/student");
            return;
          }
        } else {
          // No profile, redirect to login
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

  // Fetch discussions from API using TanStack Query
  const { data: discussions = [], isLoading: loading } = useQuery({
    queryKey: ["instructor-discussions", user?.id],
    queryFn: async () => {
      const response = await fetch("/api/discussion");

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch discussions");
      }

      const result = await response.json();
      return (result.sessions || []) as Discussion[];
    },
    enabled: !!(user && user.role === "instructor"),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(`/api/discussion/${sessionId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete discussion");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch discussions
      queryClient.invalidateQueries({
        queryKey: ["instructor-discussions", user?.id],
      });
      toast.success("토론이 삭제되었습니다");
    },
    onError: (error: Error) => {
      console.error("Error deleting discussion:", error);
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
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== "instructor") {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="w-full max-w-md shadow-xl border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto">
              <GraduationCap className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-xl">로그인이 필요합니다</CardTitle>
            <p className="text-sm text-muted-foreground">
              토론 관리 페이지에 접근하려면 로그인해주세요
            </p>
          </CardHeader>
          <CardContent className="text-center pb-8">
            <Button
              onClick={() => router.replace("/login")}
              className="w-full min-h-[44px]"
            >
              강사로 로그인
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="bg-card/80 backdrop-blur-sm border-b border-border shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    토론 관리
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    생성한 토론 세션을 관리하세요
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Link href="/instructor">
                  <Button variant="outline" size="sm" className="min-h-[44px]">
                    대시보드로
                  </Button>
                </Link>
                <Link href="/instructor/discussions/new">
                  <Button size="sm" className="min-h-[44px]">
                    <Plus className="w-4 h-4 mr-2" />
                    새 토론 만들기
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto p-6 space-y-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  <span className="text-sm text-muted-foreground">총 토론</span>
                </div>
                <p className="text-2xl font-bold">{discussions.length}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-muted-foreground">진행중</span>
                </div>
                <p className="text-2xl font-bold">{activeCount}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-5 h-5 text-slate-600" />
                  <span className="text-sm text-muted-foreground">종료됨</span>
                </div>
                <p className="text-2xl font-bold">{closedCount}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  <span className="text-sm text-muted-foreground">
                    총 참여자
                  </span>
                </div>
                <p className="text-2xl font-bold">{totalParticipants}</p>
              </CardContent>
            </Card>
          </div>

          {/* Discussion List */}
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                <span>내 토론 목록</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    토론 목록을 불러오는 중...
                  </p>
                </div>
              ) : discussions.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    아직 토론이 없습니다
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    첫 번째 토론을 만들어 시작하세요!
                  </p>
                  <Link href="/instructor/discussions/new">
                    <Button className="min-h-[44px]">
                      <Plus className="w-4 h-4 mr-2" />
                      새 토론 만들기
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {discussions.map((discussion) => (
                    <DiscussionCard
                      key={discussion.id}
                      discussion={discussion}
                      onCopyCode={copyJoinCode}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
    </div>
  );
}

