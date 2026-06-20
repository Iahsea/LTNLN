"""Điểm khởi tạo ứng dụng FastAPI.

Khởi tạo app, cấu hình CORS và mount các router của 4 module:
tiến trình, file, socket, network. Logic chi tiết được implement trong
từng router tương ứng. Ngoài ra có WebSocket /ws/logs stream log realtime.
"""

import asyncio

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from core.logbus import log_bus
from routers import files, network, process, socket_mod

app = FastAPI(
    title="Linux System Manager",
    description="Quản lý tiến trình, file, socket và network trên Ubuntu.",
    version="0.1.0",
)

# Cho phép frontend (Next.js dev, cổng 3000) gọi API trực tiếp.
# Dev thường đi qua rewrites proxy của Next (cùng origin, không cần CORS),
# nhưng vẫn mở origin 3000 cho trường hợp gọi thẳng. Deploy có thể siết lại.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount các router theo module.
app.include_router(process.router)
app.include_router(files.router)
app.include_router(socket_mod.router)
app.include_router(network.router)


@app.get("/api/health", tags=["health"])
def health_check():
    """Kiểm tra nhanh backend đang chạy."""
    return {"status": "ok"}


@app.on_event("startup")
async def _bind_log_loop():
    """Lưu event loop chính để log bus đẩy log an toàn từ các thread sync."""
    log_bus.bind_loop(asyncio.get_running_loop())


@app.websocket("/ws/logs")
async def ws_logs(websocket: WebSocket):
    """Stream log realtime của mọi thao tác về frontend.

    Mỗi client có một hàng đợi riêng; server đọc từ hàng đợi rồi gửi JSON.
    """
    await websocket.accept()
    queue = log_bus.subscribe()
    # Báo cho chính client vừa kết nối (cũng là tín hiệu test nhanh).
    await websocket.send_json(
        {
            "time": "",
            "level": "INFO",
            "module": "ws",
            "message": "Đã kết nối /ws/logs",
        }
    )
    log_bus.log("INFO", "ws", "Client mới kết nối /ws/logs")
    try:
        while True:
            # Chờ log kế tiếp trong hàng đợi rồi đẩy xuống client.
            item = await queue.get()
            await websocket.send_json(item)
    except WebSocketDisconnect:
        # Client đóng kết nối — dọn dẹp.
        pass
    finally:
        log_bus.unsubscribe(queue)
        log_bus.log("INFO", "ws", "Client ngắt kết nối /ws/logs")
