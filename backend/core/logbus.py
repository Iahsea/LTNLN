"""Log bus realtime cho WebSocket /ws/logs.

Vấn đề: các router (spawn process, ghi file, echo socket...) là hàm SYNC,
chạy trong threadpool của FastAPI; còn WebSocket nằm trên event loop asyncio.
Để đẩy log từ thread sang loop một cách an toàn, ta dùng
`loop.call_soon_threadsafe()` bơm vào hàng đợi (asyncio.Queue) của từng client.

Cách dùng:
    from core.logbus import log_bus
    log_bus.log("INFO", "process", "Spawn PID 123: sleep 30")
"""

import asyncio
from datetime import datetime

from core.schemas import LogEvent


def _safe_put(queue: "asyncio.Queue", item: dict) -> None:
    """Bơm item vào queue, bỏ qua nếu queue đầy (client đọc quá chậm)."""
    try:
        queue.put_nowait(item)
    except asyncio.QueueFull:
        pass


class LogBus:
    """Quản lý các client WebSocket và broadcast log tới tất cả."""

    def __init__(self) -> None:
        self._subscribers: set[asyncio.Queue] = set()
        self._loop: asyncio.AbstractEventLoop | None = None

    def bind_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        """Lưu event loop chính (gọi lúc app startup)."""
        self._loop = loop

    def subscribe(self) -> "asyncio.Queue":
        """Một client kết nối → tạo hàng đợi riêng cho client đó."""
        queue: asyncio.Queue = asyncio.Queue(maxsize=1000)
        self._subscribers.add(queue)
        return queue

    def unsubscribe(self, queue: "asyncio.Queue") -> None:
        """Client ngắt kết nối → bỏ hàng đợi của nó."""
        self._subscribers.discard(queue)

    def log(self, level: str, module: str, message: str) -> None:
        """Tạo một dòng log và broadcast (an toàn khi gọi từ thread khác)."""
        item = LogEvent(
            time=datetime.now().isoformat(timespec="seconds"),
            level=level,
            module=module,
            message=message,
        ).model_dump()

        loop = self._loop
        if loop is None:
            return  # app chưa startup xong, chưa có client nào
        for queue in list(self._subscribers):
            # call_soon_threadsafe: bắc cầu an toàn từ thread sync sang loop.
            loop.call_soon_threadsafe(_safe_put, queue, item)


# Singleton dùng chung toàn app.
log_bus = LogBus()
