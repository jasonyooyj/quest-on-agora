import Link from "next/link";
import { Copy, Calendar, Users, Trash2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LiveStatusBadge } from "@/components/ui/status-badge";
import { useTranslations, useFormatter } from 'next-intl';

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
  onDelete?: (id: string) => void;
}

export function DiscussionCard({
  discussion,
  onCopyCode,
  onDelete,
}: DiscussionCardProps) {
  const t = useTranslations('Instructor.DiscussionCard');
  const format = useFormatter();

  const statusLabels = {
    draft: t('status.draft'),
    active: t('status.live'),
    closed: t('status.closed'),
  };

  const handleCopyCode = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onCopyCode) {
      onCopyCode(discussion.joinCode);
    } else {
      navigator.clipboard.writeText(discussion.joinCode);
      toast.success(t('toasts.codeCopied'));
    }
  };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="group"
    >
      <div className="glass-panel bg-white/90 border-zinc-200 p-6 hover:bg-white hover:border-zinc-300 transition-all relative overflow-hidden shadow-sm">
        <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-4 mb-3">
              <h4 className="text-xl font-bold text-zinc-900 truncate group-hover:text-primary transition-colors flex-1 min-w-0">
                {discussion.title}
              </h4>
              <LiveStatusBadge status={discussion.status} labels={statusLabels} />
            </div>

            {discussion.description && (
              <p className="text-zinc-500 text-sm mb-6 line-clamp-1 max-w-3xl">
                {discussion.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-6">
              <div
                className="flex items-center gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest border border-zinc-200 bg-zinc-100 px-3 py-1.5 rounded-lg transition-all hover:bg-primary/10 hover:text-primary hover:border-primary/20 cursor-pointer"
                onClick={handleCopyCode}
              >
                <span>{t('codePrefix', { code: discussion.joinCode })}</span>
                <Copy className="w-3 h-3" />
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                <Users className="w-3.5 h-3.5" />
                <span>{t('studentsSuffix', { count: discussion.participantCount })}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                <Calendar className="w-3.5 h-3.5" />
                <span>{format.dateTime(new Date(discussion.createdAt), { dateStyle: 'medium' })}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link href={`/instructor/discussions/${discussion.id}`} className="flex-1 md:flex-none">
              <button className="h-12 px-6 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-600 font-bold text-sm flex items-center justify-center gap-2 hover:bg-zinc-200 hover:text-zinc-900 transition-all group/btn">
                {t('enter')}
                <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </Link>

            {onDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    className="w-12 h-12 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-500 hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/20 transition-all"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent className="glass-panel bg-white/95 border-zinc-200 p-8 shadow-2xl backdrop-blur-xl max-w-md">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-2xl font-black tracking-tight text-zinc-900 mb-2">{t('deleteDialog.title')}</AlertDialogTitle>
                    <AlertDialogDescription className="text-zinc-500 font-medium leading-relaxed">
                      {t.rich('deleteDialog.description', {
                        title: discussion.title,
                        spanClass: (chunks) => <span className="text-zinc-900">{chunks}</span>,
                        br: () => <br />
                      })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="mt-8 gap-3">
                    <AlertDialogCancel className="h-12 rounded-full border-zinc-200 bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 font-bold transition-all px-6">
                      {t('deleteDialog.cancel')}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(discussion.id)}
                      className="h-12 rounded-full bg-rose-500 text-white font-black hover:bg-rose-600 transition-all px-8 border-0"
                    >
                      {t('deleteDialog.confirm')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
