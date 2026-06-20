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
