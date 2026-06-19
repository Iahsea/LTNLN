"""Router quản lý tiến trình — /api/process.

Sẽ implement:
- GET    /api/process              : liệt kê tiến trình đang chạy (psutil, /proc)
- POST   /api/process/spawn        : tạo tiến trình con (subprocess.Popen)
- DELETE /api/process/{pid}/kill   : gửi tín hiệu kết thúc (os.kill + signal)
"""

from fastapi import APIRouter

router = APIRouter(prefix="/api/process", tags=["process"])
