"""Pydantic models dùng chung cho các response của API.

Mỗi module bổ sung schema của mình vào đây khi được implement, giúp
response nhất quán và frontend dễ parse.
"""

from pydantic import BaseModel

# ── Module tiến trình (Process) ──────────────────────────────────────────


class ProcessInfo(BaseModel):
    """Thông tin một tiến trình đang chạy (GET /api/process)."""

    pid: int
    name: str
    ppid: int
    status: str
    cpu_percent: float
    memory_kb: int


class SpawnRequest(BaseModel):
    """Body cho POST /api/process/spawn."""

    command: str


class SpawnResponse(BaseModel):
    """Kết quả tạo tiến trình con."""

    pid: int
    status: str


class KillResponse(BaseModel):
    """Kết quả gửi tín hiệu kết thúc tiến trình."""

    pid: int
    killed: bool


# ── Module file (File I/O) ───────────────────────────────────────────────


class FileInfo(BaseModel):
    """Metadata một mục trong thư mục (GET /api/files)."""

    name: str
    size: int
    permissions: str  # dạng ls -l, ví dụ "-rw-r--r--"
    is_dir: bool
    modified: str  # thời điểm sửa đổi, ISO 8601


class FileReadResponse(BaseModel):
    """Nội dung file (GET /api/files/read)."""

    path: str
    content: str


class FileWriteRequest(BaseModel):
    """Body cho POST /api/files/write."""

    path: str
    content: str


class FileWriteResponse(BaseModel):
    """Kết quả ghi file."""

    path: str
    bytes_written: int


class FileDeleteResponse(BaseModel):
    """Kết quả xóa file (DELETE /api/files/delete)."""

    path: str
    deleted: bool


class ChmodRequest(BaseModel):
    """Body cho PATCH /api/files/chmod."""

    path: str
    mode: str  # quyền dạng bát phân, ví dụ "644"


class ChmodResponse(BaseModel):
    """Kết quả đổi quyền file."""

    path: str
    mode: str


# ── Module socket (Socket Programming) ───────────────────────────────────


class SocketConnection(BaseModel):
    """Một kết nối socket hiện có (GET /api/socket/connections)."""

    fd: int
    type: str  # TCP / UDP
    local_addr: str  # "ip:port"
    remote_addr: str  # "ip:port" (rỗng nếu chưa kết nối)
    status: str  # LISTEN, ESTABLISHED, CLOSE_WAIT, NONE...


class EchoRequest(BaseModel):
    """Body cho các endpoint echo (TCP / UDP / Unix)."""

    message: str


class EchoResponse(BaseModel):
    """Kết quả gửi/nhận qua echo server demo."""

    transport: str  # tcp / udp / unix
    sent: str
    received: str
