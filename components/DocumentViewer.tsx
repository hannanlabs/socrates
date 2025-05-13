"use client";

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DocumentViewerProps {
  src: string;
  initialPage?: number;
  pageCount: number | null;
  onPageChange?: (page: number) => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  src,
  initialPage = 1,
  pageCount,
  onPageChange,
}) => {
  const [page, setPage] = useState<number>(initialPage);

  const safePage = Math.max(1, page);

  const iframeSrc = `${src}#page=${safePage}`;

  const goTo = (newPage: number) => {
    setPage(newPage);
    if (onPageChange) onPageChange(newPage);
  };

  const goPrev = () => {
    if (safePage > 1) goTo(safePage - 1);
  };

  const goNext = () => {
    if (pageCount && safePage >= pageCount) return;
    goTo(safePage + 1);
  };

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-2 border-b border-border bg-muted/40">
        <Button variant="ghost" size="sm" onClick={goPrev} disabled={safePage <= 1}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="text-sm font-medium text-muted-foreground">
          Page {safePage}
          {pageCount ? ` / ${pageCount}` : ''}
        </span>
        <Button variant="ghost" size="sm" onClick={goNext} disabled={pageCount ? safePage >= pageCount : false}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <iframe
        key={iframeSrc}
        src={iframeSrc}
        className="flex-1 w-full h-full bg-background"
        title="PDF document"
      />
    </div>
  );
};

export default DocumentViewer; 