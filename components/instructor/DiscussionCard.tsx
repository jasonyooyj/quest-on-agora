import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Copy, Calendar, Eye, Users, MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface DiscussionCardProps {
  discussion: {
    id: string;
    title: string;
    description?: string;
    status: string;
    joinCode: string;
    createdAt: string;
    closedAt?: string;
    participantCount: number;
  };
  onCopyCode?: (code: string) => void;
}

export function DiscussionCard({
  discussion,
  onCopyCode,
}: DiscussionCardProps) {
  const getStatusBadgeProps = (status: string) => {
    if (status === "active") {
      return {
        variant: "default" as const,
        className: "text-xs bg-green-100 text-green-700",
        text: "진행중",
      };
    }
    if (status === "closed") {
      return {
        variant: "secondary" as const,
        className: "text-xs bg-slate-200 text-slate-700",
        text: "종료됨",
      };
    }
    return {
      variant: "secondary" as const,
      className: "text-xs",
      text: "초안",
    };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const badgeProps = getStatusBadgeProps(discussion.status);
  const iconSize = "w-3 h-3";

  const handleCopyCode = () => {
    if (onCopyCode) {
      onCopyCode(discussion.joinCode);
    } else {
      navigator.clipboard.writeText(discussion.joinCode);
      toast.success("참여 코드가 복사되었습니다");
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-3 mb-2">
          <MessageSquare className="w-4 h-4 text-primary shrink-0" />
          <h4 className="font-semibold text-foreground truncate">
            {discussion.title}
          </h4>
          <Badge variant={badgeProps.variant} className={badgeProps.className}>
            {badgeProps.text}
          </Badge>
        </div>
        {discussion.description && (
          <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
            {discussion.description}
          </p>
        )}
        <div className="flex items-center space-x-4 text-sm text-muted-foreground flex-wrap gap-2">
          <div className="flex items-center space-x-1">
            <Copy className={iconSize} />
            <span className="font-mono text-xs">{discussion.joinCode}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Users className={iconSize} />
            <span>{discussion.participantCount}명 참여</span>
          </div>
          <div className="flex items-center space-x-1">
            <Calendar className={iconSize} />
            <span>{formatDate(discussion.createdAt)}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-2 shrink-0 ml-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyCode}
          className="min-h-[44px] min-w-[44px]"
        >
          <Copy className={`${iconSize} mr-1`} />
          코드
        </Button>
        <Link href={`/instructor/discussions/${discussion.id}`}>
          <Button variant="outline" size="sm" className="min-h-[44px]">
            <Eye className={`${iconSize} mr-1`} />
            보기
          </Button>
        </Link>
      </div>
    </div>
  );
}

