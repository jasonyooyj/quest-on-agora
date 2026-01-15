"use client";

import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface AIMessageRendererProps {
    content: string;
    timestamp: string | Date;
}

export default function AIMessageRenderer({
    content,
    timestamp,
}: AIMessageRendererProps) {
    return (
        <div className="max-w-[85%] rounded-lg p-3 bg-slate-50 border border-slate-200">
            <div className="text-[10px] text-slate-600 mb-1 font-medium">AI 응답</div>
            <div className="text-sm prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
            <div className="text-[10px] mt-1.5 text-muted-foreground">
                {formatDistanceToNow(new Date(timestamp), {
                    addSuffix: true,
                    locale: ko,
                })}
            </div>
        </div>
    );
}
