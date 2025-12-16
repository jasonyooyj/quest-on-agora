"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp";
import Link from "next/link";
import { MessageSquare } from "lucide-react";

// Error handler for discussion join
function DiscussionErrorToastHandler() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");

  useEffect(() => {
    if (!errorParam) return;

    if (errorParam === "discussion_code") {
      toast.error(
        "이 코드는 토론 세션 코드입니다. 아래에 다시 입력해서 토론에 참여하세요."
      );
    }
  }, [errorParam]);

  return null;
}

function DiscussionCodeEntryContent() {
  const searchParams = useSearchParams();
  const initialCode = (searchParams.get("code") || "").toUpperCase();
  const [joinCode, setJoinCode] = useState(initialCode);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.length !== 6) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/discussion/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message =
          errorData.message ||
          errorData.error ||
          "토론 세션에 참여할 수 없습니다. 코드와 상태를 확인해주세요.";
        toast.error(message);
        return;
      }

      const data = await response.json();
      router.push(`/student/discussion/${data.session.id}`);
    } catch (error) {
      console.error("Error joining discussion:", error);
      toast.error("토론 세션에 참여하는 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="max-w-md mx-auto">
          <Card className="shadow-xl border-0">
            <CardHeader className="text-center pb-6">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl">토론 코드 입력</CardTitle>
              <CardDescription className="text-base">
                강사가 제공한 토론 코드를 입력하여 토론에 참여하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2 mb-12">
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
                      value={joinCode}
                      onChange={(value) => setJoinCode(value.toUpperCase())}
                      className="gap-1"
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} className="h-12 w-12 text-lg" />
                        <InputOTPSlot index={1} className="h-12 w-12 text-lg" />
                        <InputOTPSlot index={2} className="h-12 w-12 text-lg" />
                        <InputOTPSlot index={3} className="h-12 w-12 text-lg" />
                        <InputOTPSlot index={4} className="h-12 w-12 text-lg" />
                        <InputOTPSlot index={5} className="h-12 w-12 text-lg" />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    영문자와 숫자만 입력 가능합니다 (예: DISC01)
                  </p>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || joinCode.length !== 6}
                >
                  {isLoading ? "입장 중..." : "토론 입장"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8 space-y-3">
          <p className="text-muted-foreground">
            도움이 필요하신가요? 강사에게 문의하세요
          </p>
          <div className="flex justify-center gap-2">
            <Link href="/join">
              <Button variant="outline" size="sm">
                시험 코드 입력
              </Button>
            </Link>
            <Link href="/">
              <Button variant="ghost" size="sm">
                홈으로 돌아가기
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="max-w-md mx-auto">
          <Card className="shadow-xl border-0">
            <CardHeader className="text-center pb-6">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl">토론 코드 입력</CardTitle>
              <CardDescription className="text-base">
                로딩 중...
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function DiscussionCodeEntryPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <DiscussionErrorToastHandler />
      <DiscussionCodeEntryContent />
    </Suspense>
  );
}


