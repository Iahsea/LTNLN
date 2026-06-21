"use client";

import { useCallback, useEffect, useState } from "react";
import {
  File as FileIcon,
  Folder,
  FilePlus2,
  RefreshCw,
  Eye,
  Trash2,
  ShieldEllipsis,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

import {
  listFiles,
  readFile,
  writeFile,
  deleteFile,
  chmodFile,
  type FileInfo,
} from "@/lib/api";
import { DataTable, type Column } from "@/components/data-table";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function FilesPage() {
  // Đường dẫn thư mục hiện tại, TƯƠNG ĐỐI so với sandbox ("" = gốc sandbox).
  const [path, setPath] = useState("");
  const [rows, setRows] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog ghi/tạo file
  const [writeOpen, setWriteOpen] = useState(false);
  const [writePath, setWritePath] = useState("");
  const [writeContent, setWriteContent] = useState("");
  const [writing, setWriting] = useState(false);

  // Dialog đọc file
  const [readName, setReadName] = useState<string | null>(null);
  const [readContent, setReadContent] = useState("");
  const [readingBusy, setReadingBusy] = useState(false);

  // Dialog chmod
  const [chmodTarget, setChmodTarget] = useState<FileInfo | null>(null);
  const [mode, setMode] = useState("");
  const [chmodding, setChmodding] = useState(false);

  // Xác nhận xóa
  const [deleteTarget, setDeleteTarget] = useState<FileInfo | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async (p: string, initial = false) => {
    if (initial) setLoading(true);
    try {
      const data = await listFiles(p);
      setRows(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không đọc được thư mục");
    } finally {
      setLoading(false);
    }
  }, []);

  // Tải lại mỗi khi đổi thư mục.
  useEffect(() => {
    load(path, true);
  }, [path, load]);

  const enterDir = (name: string) => setPath(path ? `${path}/${name}` : name);

  // Breadcrumb: "sandbox" + từng đoạn của path.
  const segments = path ? path.split("/") : [];
  const goToSegment = (idx: number) =>
    setPath(segments.slice(0, idx + 1).join("/"));

  function openWrite() {
    setWritePath(path ? `${path}/` : "");
    setWriteContent("");
    setWriteOpen(true);
  }

  async function handleWrite() {
    const p = writePath.trim();
    if (!p) return;
    setWriting(true);
    try {
      const res = await writeFile(p, writeContent);
      toast.success(`Đã ghi ${res.path} (${res.bytes_written} bytes)`);
      setWriteOpen(false);
      load(path);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ghi file thất bại");
    } finally {
      setWriting(false);
    }
  }

  async function openRead(f: FileInfo) {
    setReadName(f.name);
    setReadContent("");
    setReadingBusy(true);
    const full = path ? `${path}/${f.name}` : f.name;
    try {
      const res = await readFile(full);
      setReadContent(res.content);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Đọc file thất bại");
      setReadName(null);
    } finally {
      setReadingBusy(false);
    }
  }

  function openChmod(f: FileInfo) {
    setChmodTarget(f);
    setMode("");
  }

  async function handleChmod() {
    if (!chmodTarget) return;
    const m = mode.trim();
    if (!m) return;
    const full = path ? `${path}/${chmodTarget.name}` : chmodTarget.name;
    setChmodding(true);
    try {
      const res = await chmodFile(full, m);
      toast.success(`Đã đổi quyền ${res.path} → ${res.mode}`);
      setChmodTarget(null);
      load(path);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Đổi quyền thất bại");
    } finally {
      setChmodding(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const full = path ? `${path}/${deleteTarget.name}` : deleteTarget.name;
    setDeleting(true);
    try {
      await deleteFile(full);
      toast.success(`Đã xóa ${full}`);
      setDeleteTarget(null);
      load(path);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xóa thất bại");
    } finally {
      setDeleting(false);
    }
  }

  const dirCount = rows.filter((r) => r.is_dir).length;
  const fileCount = rows.length - dirCount;
  const totalSize = rows.reduce((s, r) => (r.is_dir ? s : s + r.size), 0);

  const columns: Column<FileInfo>[] = [
    {
      key: "name",
      header: "Tên",
      className: "font-mono",
      cell: (f) =>
        f.is_dir ? (
          <button
            onClick={() => enterDir(f.name)}
            className="flex cursor-pointer items-center gap-2 text-left hover:underline"
          >
            <Folder className="size-4 text-status-warn" />
            {f.name}
          </button>
        ) : (
          <span className="flex items-center gap-2 text-foreground">
            <FileIcon className="size-4 text-muted-foreground" />
            {f.name}
          </span>
        ),
    },
    {
      key: "size",
      header: "Kích thước",
      className: "w-28 text-right font-mono tabular-nums",
      cell: (f) => (f.is_dir ? "—" : formatSize(f.size)),
    },
    {
      key: "perm",
      header: "Quyền",
      className: "w-32 font-mono",
      cell: (f) => f.permissions,
    },
    {
      key: "modified",
      header: "Sửa đổi",
      className: "w-44 font-mono text-muted-foreground",
      cell: (f) => f.modified.replace("T", " "),
    },
    {
      key: "actions",
      header: "",
      className: "w-44 text-right",
      cell: (f) => (
        <div className="flex justify-end gap-1">
          {!f.is_dir ? (
            <Button variant="ghost" size="sm" className="h-7" onClick={() => openRead(f)}>
              <Eye className="size-3.5" />
              Đọc
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" className="h-7" onClick={() => openChmod(f)}>
            <ShieldEllipsis className="size-3.5" />
            Quyền
          </Button>
          {!f.is_dir ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-status-error hover:text-status-error"
              onClick={() => setDeleteTarget(f)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Tổng mục" value={loading ? "—" : rows.length} />
        <StatCard label="Thư mục" value={loading ? "—" : dirCount} />
        <StatCard label="File" value={loading ? "—" : fileCount} />
        <StatCard label="Tổng dung lượng" value={loading ? "—" : formatSize(totalSize)} />
      </div>

      {/* Thanh công cụ + breadcrumb */}
      <div className="flex flex-wrap items-center gap-2">
        <nav className="flex items-center gap-1 text-sm">
          <button
            onClick={() => setPath("")}
            className="cursor-pointer font-mono text-muted-foreground hover:text-foreground"
          >
            sandbox
          </button>
          {segments.map((seg, i) => (
            <span key={i} className="flex items-center gap-1">
              <ChevronRight className="size-3.5 text-muted-foreground" />
              <button
                onClick={() => goToSegment(i)}
                className="cursor-pointer font-mono text-muted-foreground hover:text-foreground"
              >
                {seg}
              </button>
            </span>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" className="h-9" onClick={openWrite}>
            <FilePlus2 className="size-3.5" />
            Ghi / Tạo file
          </Button>
          <Button variant="outline" size="sm" className="h-9" onClick={() => load(path)}>
            <RefreshCw className="size-3.5" />
            Làm mới
          </Button>
        </div>
      </div>

      {/* Bảng file */}
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(f) => f.name}
        loading={loading}
        error={error}
        onRetry={() => load(path, true)}
        emptyText="Thư mục trống"
      />

      {/* Dialog ghi / tạo file */}
      <Dialog open={writeOpen} onOpenChange={setWriteOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Ghi / tạo file</DialogTitle>
            <DialogDescription>
              Đường dẫn tương đối trong sandbox. Tạo mới nếu chưa tồn tại.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="wpath" className="text-xs text-muted-foreground">
                Đường dẫn
              </Label>
              <Input
                id="wpath"
                value={writePath}
                onChange={(e) => setWritePath(e.target.value)}
                placeholder="vd: demo/hello.txt"
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wcontent" className="text-xs text-muted-foreground">
                Nội dung
              </Label>
              <Textarea
                id="wcontent"
                value={writeContent}
                onChange={(e) => setWriteContent(e.target.value)}
                placeholder="Nội dung file…"
                className="h-48 font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWriteOpen(false)} disabled={writing}>
              Hủy
            </Button>
            <Button onClick={handleWrite} disabled={writing || !writePath.trim()}>
              {writing ? "Đang ghi…" : "Ghi file"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog đọc file */}
      <Dialog open={!!readName} onOpenChange={(o) => !o && setReadName(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-mono">{readName}</DialogTitle>
            <DialogDescription>Nội dung file (chỉ đọc).</DialogDescription>
          </DialogHeader>
          <Textarea
            readOnly
            value={readingBusy ? "Đang đọc…" : readContent}
            className="h-72 font-mono text-[12px]"
          />
        </DialogContent>
      </Dialog>

      {/* Dialog chmod */}
      <Dialog open={!!chmodTarget} onOpenChange={(o) => !o && setChmodTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Đổi quyền</DialogTitle>
            <DialogDescription className="font-mono">
              {chmodTarget?.name} · hiện tại {chmodTarget?.permissions}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="mode" className="text-xs text-muted-foreground">
              Quyền (bát phân)
            </Label>
            <Input
              id="mode"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              placeholder="vd: 644"
              className="font-mono"
              onKeyDown={(e) => e.key === "Enter" && handleChmod()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChmodTarget(null)} disabled={chmodding}>
              Hủy
            </Button>
            <Button onClick={handleChmod} disabled={chmodding || !mode.trim()}>
              {chmodding ? "Đang đổi…" : "Đổi quyền"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Xác nhận xóa */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa file?</AlertDialogTitle>
            <AlertDialogDescription>
              Xóa vĩnh viễn{" "}
              <span className="font-mono text-foreground">
                {path ? `${path}/` : ""}
                {deleteTarget?.name}
              </span>{" "}
              khỏi sandbox. Không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={deleting}
              className="bg-status-error text-white hover:bg-status-error/90"
            >
              {deleting ? "Đang xóa…" : "Xóa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
