"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Copy,
  Link2,
  Settings,
  Share2,
  StopCircle,
  Users,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { useSessionActions } from "@/hooks/useDiscussion";
import type { DiscussionSession } from "@/types/discussion";

interface DiscussionSessionHeaderProps {
  session: DiscussionSession;
  participantCount: number;
}

export function DiscussionSessionHeader({
  session,
  participantCount,
}: DiscussionSessionHeaderProps) {
  const router = useRouter();
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const { closeSession, updateSettings } = useSessionActions(session.id);

  const handleCopyJoinLink = async () => {
    const joinUrl = `${window.location.origin}/join?code=${session.joinCode}`;
    try {
      await navigator.clipboard.writeText(joinUrl);
      toast.success("참여 링크가 복사되었습니다");
    } catch {
      toast.error("링크 복사에 실패했습니다");
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(session.joinCode);
      toast.success("참여 코드가 복사되었습니다");
    } catch {
      toast.error("코드 복사에 실패했습니다");
    }
  };

  const handleCloseSession = async () => {
    try {
      await closeSession.mutateAsync();
      toast.success("토론 세션이 종료되었습니다");
      setShowCloseDialog(false);
    } catch {
      toast.error("세션 종료에 실패했습니다");
    }
  };

  const handleToggleAnonymous = async (anonymous: boolean) => {
    try {
      await updateSettings.mutateAsync({
        settings: { ...session.settings, anonymous },
      });
      toast.success(anonymous ? "익명 모드 활성화" : "실명 모드 활성화");
    } catch {
      toast.error("설정 변경에 실패했습니다");
    }
  };

  const getStatusBadge = () => {
    switch (session.status) {
      case "active":
        return (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
            <span className="relative flex h-2 w-2 mr-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            진행 중
          </Badge>
        );
      case "closed":
        return (
          <Badge variant="secondary" className="bg-slate-100 text-slate-600">
            종료됨
          </Badge>
        );
      case "draft":
        return (
          <Badge variant="outline" className="text-muted-foreground">
            준비 중
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <header className="border-b bg-card/95 backdrop-blur-sm sticky top-0 z-40">
        <div className="px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Back, Title, Status */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => router.push("/instructor")}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold truncate">
                    {session.title}
                  </h1>
                  {getStatusBadge()}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {participantCount}명 참여
                  </span>
                  <span className="text-muted-foreground/50">·</span>
                  <span className="font-mono">{session.joinCode}</span>
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Share Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Share2 className="w-4 h-4" />
                    <span className="hidden sm:inline">공유</span>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleCopyJoinLink}>
                    <Link2 className="w-4 h-4 mr-2" />
                    참여 링크 복사
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCopyCode}>
                    <Copy className="w-4 h-4 mr-2" />
                    참여 코드 복사
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Close Session Button (Active only) */}
              {session.status === "active" && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setShowCloseDialog(true)}
                >
                  <StopCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">종료</span>
                </Button>
              )}

              {/* Settings */}
              <Sheet open={showSettingsSheet} onOpenChange={setShowSettingsSheet}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Settings className="w-4 h-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>세션 설정</SheetTitle>
                    <SheetDescription>
                      토론 세션의 설정을 변경합니다
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-6 space-y-6">
                    {/* Anonymous Toggle */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>익명 모드</Label>
                        <p className="text-xs text-muted-foreground">
                          학생 이름을 숨기고 익명으로 표시합니다
                        </p>
                      </div>
                      <Switch
                        checked={session.settings.anonymous}
                        onCheckedChange={handleToggleAnonymous}
                        disabled={updateSettings.isPending}
                      />
                    </div>

                    {/* Join Code */}
                    <div className="space-y-2">
                      <Label>참여 코드</Label>
                      <div className="flex gap-2">
                        <Input
                          value={session.joinCode}
                          readOnly
                          className="font-mono"
                        />
                        <Button variant="outline" size="icon" onClick={handleCopyCode}>
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Session Info */}
                    <div className="space-y-2">
                      <Label>세션 정보</Label>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>
                          생성:{" "}
                          {new Date(session.createdAt).toLocaleString("ko-KR")}
                        </p>
                        {session.closedAt && (
                          <p>
                            종료:{" "}
                            {new Date(session.closedAt).toLocaleString("ko-KR")}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Close Session Confirmation Dialog */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>토론 세션 종료</DialogTitle>
            <DialogDescription>
              토론 세션을 종료하시겠습니까? 종료 후에는 학생들이 더 이상 참여할 수
              없으며, 모든 데이터는 보존됩니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseDialog(false)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleCloseSession}
              disabled={closeSession.isPending}
            >
              {closeSession.isPending ? "종료 중..." : "세션 종료"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
