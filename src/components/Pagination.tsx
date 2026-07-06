"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  pageCount: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

/** Shared pager for large list pages — keeps DOM row count bounded regardless of dataset size. */
export default function Pagination({ page, pageCount, totalItems, pageSize, onPageChange }: PaginationProps) {
  if (pageCount <= 1) return null;

  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-slate-100 text-sm">
      <span className="text-slate-500">
        Showing {start}–{end} of {totalItems}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-slate-600 font-medium tabular-nums">
          {page} / {pageCount}
        </span>
        <button
          onClick={() => onPageChange(Math.min(pageCount, page + 1))}
          disabled={page >= pageCount}
          className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
