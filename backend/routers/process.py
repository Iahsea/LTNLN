"""Router quản lý tiến trình — /api/process.

Endpoints:
- GET    /api/process              : liệt kê tiến trình đang chạy (psutil)
- POST   /api/process/spawn        : tạo tiến trình con (subprocess.Popen → fork/exec)
- DELETE /api/process/{pid}/kill   : gửi tín hiệu kết thúc (os.kill + SIGTERM)

Quy tắc an toàn (xem skill syscall-module):
- Cross-platform: ưu tiên psutil; phần đặc thù Linux bọc try/except.
- Chỉ kill tiến trình DO APP TẠO (theo dõi trong `_children`), không đụng
  tiến trình hệ thống.
- Tiến trình con spawn trong thư mục sandbox; thu hồi để tránh zombie.
"""

import os
import shlex
import signal
import subprocess
import sys
from pathlib import Path

import psutil
from fastapi import APIRouter, HTTPException, Query

from core.logbus import log_bus
from core.schemas import (
    KillResponse,
    ProcessInfo,
    ProcessListResponse,
    SpawnRequest,
    SpawnResponse,
)

router = APIRouter(prefix="/api/process", tags=["process"])

# Phát hiện nền tảng để rẽ nhánh phần đặc thù Linux.
IS_LINUX = sys.platform.startswith("linux")

# Mọi tiến trình con spawn ra chạy trong sandbox cho an toàn.
SANDBOX = Path("./sandbox").resolve()
SANDBOX.mkdir(parents=True, exist_ok=True)

# Sổ theo dõi các tiến trình con do app tạo: { pid: Popen }.
# Chỉ những PID trong đây mới được phép kill.
_children: dict[int, subprocess.Popen] = {}


def _reap_children() -> None:
    """Thu hồi các tiến trình con đã kết thúc để tránh zombie.

    `Popen.poll()` gọi `waitpid(pid, WNOHANG)` cho đúng tiến trình con đó:
    nếu nó đã thoát thì hệ thống thu hồi entry trong bảng tiến trình,
    không để lại zombie.
    """
    for pid, proc in list(_children.items()):
        try:
            if proc.poll() is not None:  # đã thoát → đã được waitpid thu hồi
                _children.pop(pid, None)
        except OSError:
            _children.pop(pid, None)


# Bắt SIGCHLD trên Linux: tín hiệu kernel gửi cho tiến trình cha mỗi khi một
# tiến trình con đổi trạng thái (thường là thoát). Khi nhận, ta thu hồi con.
# Lưu ý: signal handler chỉ đặt được ở main thread; bỏ qua nếu không được.
if IS_LINUX:
    try:

        def _on_sigchld(signum, frame):  # noqa: ANN001
            _reap_children()

        signal.signal(signal.SIGCHLD, _on_sigchld)
    except (ValueError, OSError):
        pass


@router.get("", response_model=ProcessListResponse)
def list_processes(
    page: int = Query(1, ge=1, description="Trang hiện tại, bắt đầu từ 1"),
    page_size: int = Query(20, ge=1, le=200, description="Số dòng mỗi trang"),
):
    """Liệt kê tiến trình đang chạy bằng psutil (cross-platform), có phân trang.

    Đọc toàn bộ bảng tiến trình rồi sắp xếp theo PID để thứ tự ổn định giữa
    các lần tải (tránh nhảy dòng khi auto-refresh), sau đó cắt theo trang.
    """
    _reap_children()
    all_procs: list[ProcessInfo] = []
    # psutil.process_iter duyệt bảng tiến trình (trên Linux là đọc /proc).
    for proc in psutil.process_iter(
        ["pid", "name", "ppid", "status", "cpu_percent", "memory_info"]
    ):
        try:
            info = proc.info
            mem = info.get("memory_info")
            all_procs.append(
                ProcessInfo(
                    pid=info["pid"],
                    name=info.get("name") or "",
                    ppid=info.get("ppid") or 0,
                    status=info.get("status") or "",
                    cpu_percent=info.get("cpu_percent") or 0.0,
                    memory_kb=int(mem.rss / 1024) if mem else 0,
                )
            )
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            # Tiến trình biến mất hoặc không đủ quyền khi đọc → bỏ qua.
            continue

    # Sắp xếp theo PID cho thứ tự phân trang ổn định.
    all_procs.sort(key=lambda p: p.pid)

    # Thống kê trên TOÀN BỘ (không chỉ trang hiện tại) để frontend hiển thị đúng.
    total = len(all_procs)
    running = sum(1 for p in all_procs if p.status.lower() == "running")
    total_pages = max(1, (total + page_size - 1) // page_size)

    # Cắt trang; nếu page vượt quá thì trả trang rỗng (items = []).
    start = (page - 1) * page_size
    items = all_procs[start : start + page_size]

    return ProcessListResponse(
        items=items,
        total=total,
        running=running,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.post("/spawn", response_model=SpawnResponse)
def spawn_process(req: SpawnRequest):
    """Tạo tiến trình con bằng subprocess.Popen (dưới nền là fork() + exec())."""
    command = req.command.strip()
    if not command:
        raise HTTPException(400, "Lệnh rỗng")

    # Tách chuỗi lệnh thành argv; shell=False để tránh chạy lệnh shell phá hủy.
    try:
        args = shlex.split(command, posix=(os.name != "nt"))
    except ValueError as e:
        raise HTTPException(400, f"Lệnh không hợp lệ: {e}")
    if not args:
        raise HTTPException(400, "Lệnh rỗng")

    try:
        # Popen fork ra tiến trình con rồi exec lệnh; cwd giới hạn trong sandbox.
        proc = subprocess.Popen(
            args,
            cwd=str(SANDBOX),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            shell=False,
        )
    except FileNotFoundError:
        raise HTTPException(404, f"Không tìm thấy lệnh: {args[0]}")
    except PermissionError:
        raise HTTPException(403, f"Không đủ quyền chạy: {args[0]}")
    except OSError as e:
        raise HTTPException(500, f"Lỗi hệ thống khi spawn: {e}")

    _children[proc.pid] = proc
    status = "running" if proc.poll() is None else "exited"
    log_bus.log("INFO", "process", f"Spawn PID {proc.pid}: {command}")
    return SpawnResponse(pid=proc.pid, status=status)


@router.delete("/{pid}/kill", response_model=KillResponse)
def kill_process(pid: int):
    """Gửi tín hiệu kết thúc tới một tiến trình CON do app tạo (os.kill)."""
    proc = _children.get(pid)
    if proc is None:
        # An toàn: không cho kill tiến trình hệ thống / không do app tạo.
        raise HTTPException(
            403,
            f"Chỉ được kill tiến trình do app tạo. PID {pid} không nằm trong danh sách.",
        )

    try:
        # os.kill gửi signal tới tiến trình; SIGTERM = yêu cầu kết thúc lịch sự.
        os.kill(pid, signal.SIGTERM)
    except ProcessLookupError:
        _children.pop(pid, None)
        raise HTTPException(404, f"Không tìm thấy tiến trình {pid}")
    except PermissionError:
        raise HTTPException(403, f"Không đủ quyền với tiến trình {pid}")
    except OSError as e:
        raise HTTPException(500, f"Lỗi hệ thống: {e}")

    # Thu hồi: chờ con thoát để tránh zombie; nếu cứng đầu thì SIGKILL.
    try:
        proc.wait(timeout=3)
    except subprocess.TimeoutExpired:
        proc.kill()  # SIGKILL — không thể bị bỏ qua
        try:
            proc.wait(timeout=3)
        except subprocess.TimeoutExpired:
            pass
    _children.pop(pid, None)

    log_bus.log("WARN", "process", f"Đã kill PID {pid} (SIGTERM)")
    return KillResponse(pid=pid, killed=True)
