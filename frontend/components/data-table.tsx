"use client";

import { type ReactNode } from "react";
import { CircleAlert, Inbox } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: ReactNode;
  className?: string; // căn lề / độ rộng cho cả th và td
  cell: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  loading?: boolean; // chỉ true ở LẦN ĐẦU (chưa có dữ liệu) — auto-refresh không bật lại
  error?: string | null;
  onRetry?: () => void;
  emptyText?: string;
  skeletonRows?: number;
}

// Bảng dùng chung cho mọi module. Bao trọn 4 trạng thái dữ liệu theo skill:
// loading (skeleton) · có dữ liệu · rỗng · lỗi (+ nút thử lại).
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  error = null,
  onRetry,
  emptyText = "Chưa có dữ liệu",
  skeletonRows = 6,
}: DataTableProps<T>) {
  const colCount = columns.length;

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary/50 hover:bg-secondary/50">
            {columns.map((c) => (
              <TableHead key={c.key} className={cn("h-9 text-[11px] uppercase tracking-wide", c.className)}>
                {c.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {error ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={colCount} className="py-10">
                <div className="flex flex-col items-center gap-3 text-center">
                  <CircleAlert className="size-5 text-status-error" />
                  <span className="text-sm text-status-error">{error}</span>
                  {onRetry ? (
                    <Button variant="outline" size="sm" onClick={onRetry}>
                      Thử lại
                    </Button>
                  ) : null}
                </div>
              </TableCell>
            </TableRow>
          ) : loading ? (
            Array.from({ length: skeletonRows }).map((_, i) => (
              <TableRow key={`sk-${i}`} className="hover:bg-transparent">
                {columns.map((c) => (
                  <TableCell key={c.key} className={c.className}>
                    <Skeleton className="h-4 w-full max-w-28" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={colCount} className="py-10">
                <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
                  <Inbox className="size-5" />
                  <span className="text-sm">{emptyText}</span>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={rowKey(row)}>
                {columns.map((c) => (
                  <TableCell key={c.key} className={cn("py-2", c.className)}>
                    {c.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
