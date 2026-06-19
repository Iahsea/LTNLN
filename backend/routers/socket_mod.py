"""Router quản lý socket — /api/socket.

Sẽ implement:
- GET  /api/socket/connections : liệt kê kết nối socket (psutil.net_connections)
- POST /api/socket/echo        : demo TCP echo server (socket)
"""

from fastapi import APIRouter

router = APIRouter(prefix="/api/socket", tags=["socket"])
