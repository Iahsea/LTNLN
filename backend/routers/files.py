"""Router quản lý file — /api/files.

Endpoints:
- GET    /api/files?path=...        : liệt kê file + metadata (os.scandir, os.stat)
- GET    /api/files/read?path=...   : đọc nội dung file (open, read)
- POST   /api/files/write           : ghi / tạo file (open, write)
- DELETE /api/files/delete?path=... : xóa file (os.remove)
- PATCH  /api/files/chmod           : đổi quyền file (os.chmod)

Quy tắc an toàn (xem skill syscall-module):
- MỌI thao tác giới hạn trong thư mục sandbox; `safe_path()` chặn đường dẫn
  thoát ra ngoài (kể cả path tuyệt đối hoặc `..`).
- Bọc try/except cho mọi lời gọi hệ thống, trả HTTPException gọn.
"""

import os
import stat
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, HTTPException

from core.schemas import (
    ChmodRequest,
    ChmodResponse,
    FileDeleteResponse,
    FileInfo,
    FileReadResponse,
    FileWriteRequest,
    FileWriteResponse,
)

router = APIRouter(prefix="/api/files", tags=["files"])

# Vùng an toàn duy nhất cho mọi thao tác file.
SANDBOX = Path("./sandbox").resolve()
SANDBOX.mkdir(parents=True, exist_ok=True)

# Giới hạn kích thước file đọc để tránh nuốt file khổng lồ (1 MB).
MAX_READ_BYTES = 1024 * 1024


def safe_path(user_path: str) -> Path:
    """Ghép path người dùng vào sandbox và chặn mọi đường thoát ra ngoài.

    `resolve()` chuẩn hóa `..` và path tuyệt đối; sau đó `relative_to`
    đảm bảo kết quả vẫn nằm trong sandbox.
    """
    raw = (user_path or "").strip()
    candidate = (SANDBOX / raw).resolve()
    try:
        candidate.relative_to(SANDBOX)
    except ValueError:
        raise HTTPException(400, "Đường dẫn ngoài sandbox không được phép")
    return candidate


def _rel(p: Path) -> str:
    """Đường dẫn tương đối so với sandbox, để trả về cho frontend dùng lại."""
    rel = p.relative_to(SANDBOX).as_posix()
    return rel or "."


@router.get("", response_model=list[FileInfo])
def list_files(path: str = ""):
    """Liệt kê file + metadata trong một thư mục (mặc định gốc sandbox)."""
    target = safe_path(path)
    if not target.exists():
        raise HTTPException(404, f"Không tồn tại: {path or '.'}")
    if not target.is_dir():
        raise HTTPException(400, f"Không phải thư mục: {path}")

    result: list[FileInfo] = []
    try:
        # os.scandir tương ứng opendir()/readdir() — duyệt từng entry kèm stat.
        with os.scandir(target) as it:
            for entry in it:
                try:
                    st = entry.stat()
                    result.append(
                        FileInfo(
                            name=entry.name,
                            size=st.st_size,
                            # stat.filemode đổi st_mode sang chuỗi kiểu "-rwxr-xr-x".
                            permissions=stat.filemode(st.st_mode),
                            is_dir=entry.is_dir(),
                            modified=datetime.fromtimestamp(
                                st.st_mtime
                            ).isoformat(timespec="seconds"),
                        )
                    )
                except OSError:
                    # Một entry lỗi (quyền, biến mất) → bỏ qua, không hỏng cả list.
                    continue
    except OSError as e:
        raise HTTPException(500, f"Lỗi đọc thư mục: {e}")

    # Thư mục trước, rồi theo tên — cho dễ nhìn.
    result.sort(key=lambda f: (not f.is_dir, f.name.lower()))
    return result


@router.get("/read", response_model=FileReadResponse)
def read_file(path: str):
    """Đọc nội dung một file văn bản (open + read)."""
    target = safe_path(path)
    if not target.exists():
        raise HTTPException(404, f"Không tồn tại: {path}")
    if target.is_dir():
        raise HTTPException(400, f"Là thư mục, không phải file: {path}")
    if target.stat().st_size > MAX_READ_BYTES:
        raise HTTPException(413, "File quá lớn (giới hạn 1 MB)")

    try:
        # open() mở file descriptor, read() đọc nội dung.
        content = target.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        raise HTTPException(400, "Không phải file văn bản UTF-8")
    except PermissionError:
        raise HTTPException(403, f"Không đủ quyền đọc: {path}")
    except OSError as e:
        raise HTTPException(500, f"Lỗi đọc file: {e}")

    return FileReadResponse(path=_rel(target), content=content)


@router.post("/write", response_model=FileWriteResponse)
def write_file(req: FileWriteRequest):
    """Ghi / tạo file (open + write). Tạo thư mục cha trong sandbox nếu thiếu."""
    target = safe_path(req.path)
    if target.is_dir():
        raise HTTPException(400, f"Là thư mục, không thể ghi: {req.path}")

    try:
        # Tạo thư mục cha (vẫn nằm trong sandbox vì target đã được kiểm tra).
        target.parent.mkdir(parents=True, exist_ok=True)
        # open(...,'w') tạo mới nếu chưa có; write() ghi nội dung.
        # newline="" để KHÔNG dịch \n -> \r\n trên Windows: byte trên đĩa
        # khớp đúng bytes_written ở cả Windows lẫn Ubuntu.
        with open(target, "w", encoding="utf-8", newline="") as f:
            f.write(req.content)
    except PermissionError:
        raise HTTPException(403, f"Không đủ quyền ghi: {req.path}")
    except OSError as e:
        raise HTTPException(500, f"Lỗi ghi file: {e}")

    bytes_written = len(req.content.encode("utf-8"))
    return FileWriteResponse(path=_rel(target), bytes_written=bytes_written)


@router.delete("/delete", response_model=FileDeleteResponse)
def delete_file(path: str):
    """Xóa một file trong sandbox (os.remove). Không xóa thư mục."""
    target = safe_path(path)
    if not target.exists():
        raise HTTPException(404, f"Không tồn tại: {path}")
    if target.is_dir():
        # An toàn: chỉ xóa file, không đụng thư mục.
        raise HTTPException(400, f"Là thư mục, không xóa: {path}")

    try:
        # os.remove() = syscall unlink(): gỡ liên kết file khỏi thư mục.
        os.remove(target)
    except PermissionError:
        raise HTTPException(403, f"Không đủ quyền xóa: {path}")
    except OSError as e:
        raise HTTPException(500, f"Lỗi xóa file: {e}")

    return FileDeleteResponse(path=_rel(target), deleted=True)


@router.patch("/chmod", response_model=ChmodResponse)
def chmod_file(req: ChmodRequest):
    """Đổi quyền file (os.chmod). Mode dạng bát phân, ví dụ "644"."""
    target = safe_path(req.path)
    if not target.exists():
        raise HTTPException(404, f"Không tồn tại: {req.path}")

    # Mode phải là số bát phân hợp lệ (3-4 chữ số), ví dụ "644", "0755".
    try:
        mode_int = int(req.mode, 8)
    except ValueError:
        raise HTTPException(400, f"Mode không hợp lệ (cần bát phân): {req.mode}")

    try:
        # os.chmod() đổi bit quyền của inode. Lưu ý: trên Windows chỉ áp được
        # bit chỉ-đọc/ghi, không đầy đủ như Linux — sẽ chuẩn khi chạy Ubuntu.
        os.chmod(target, mode_int)
    except PermissionError:
        raise HTTPException(403, f"Không đủ quyền đổi mode: {req.path}")
    except OSError as e:
        raise HTTPException(500, f"Lỗi chmod: {e}")

    return ChmodResponse(path=_rel(target), mode=req.mode)
