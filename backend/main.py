"""Điểm khởi tạo ứng dụng FastAPI.

Khởi tạo app, cấu hình CORS và mount các router của 4 module:
tiến trình, file, socket, network. Logic chi tiết được implement trong
từng router tương ứng.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
