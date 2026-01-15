"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Maximize2, Pin, Trash2, Quote } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import type { PinnedQuote } from "@/types/discussion";

interface PinnedQuotesPanelProps {
  quotes: PinnedQuote[];
  onUnpin: (quoteId: string) => void;
  isAnonymous: boolean;
}

export function PinnedQuotesPanel({
  quotes,
  onUnpin,
  isAnonymous,
}: PinnedQuotesPanelProps) {
  const handleShowOnProjector = (quote: PinnedQuote) => {
    // Open fullscreen modal or separate route
    const projectorWindow = window.open(
      "",
      "projector",
      "width=1920,height=1080,fullscreen=yes"
    );
    if (projectorWindow) {
      projectorWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>발언 표시</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              min-height: 100vh;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
              font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif;
              color: white;
              padding: 4rem;
            }
            .quote-mark {
              font-size: 6rem;
              opacity: 0.2;
              line-height: 1;
              margin-bottom: -2rem;
            }
            .quote-text {
              font-size: 3rem;
              font-weight: 300;
              line-height: 1.4;
              text-align: center;
              max-width: 80%;
            }
            .quote-author {
              margin-top: 2rem;
              font-size: 1.5rem;
              opacity: 0.6;
            }
          </style>
        </head>
        <body>
          <div class="quote-mark">"</div>
          <p class="quote-text">${quote.content}</p>
          <p class="quote-author">— ${isAnonymous ? (quote.displayName || "익명") : (quote.displayName || "학생")}</p>
        </body>
        </html>
      `);
    }
  };

  if (quotes.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Pin className="w-4 h-4" />
            핀 보드
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Quote className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">핀 된 발언이 없습니다</p>
            <p className="text-xs mt-1">
              학생 대화에서 핀 버튼을 눌러 수업에서 공유하세요
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Pin className="w-4 h-4" />
          핀 보드 ({quotes.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {quotes.map((quote) => (
          <div
            key={quote.id}
            className="group p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-start gap-2">
              <Quote className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm line-clamp-3">{quote.content}</p>
                <div className="flex items-center justify-between mt-2">
                  <div className="text-[10px] text-muted-foreground">
                    {isAnonymous
                      ? quote.displayName || "익명"
                      : quote.displayName || "학생"}{" "}
                    ·{" "}
                    {formatDistanceToNow(new Date(quote.pinnedAt), {
                      addSuffix: true,
                      locale: ko,
                    })}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleShowOnProjector(quote)}
                      title="프로젝터에 표시"
                    >
                      <Maximize2 className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={() => onUnpin(quote.id)}
                      title="핀 해제"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
