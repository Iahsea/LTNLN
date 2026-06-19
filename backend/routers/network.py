"""Router quản lý network — /api/network.

Sẽ implement:
- GET /api/network/interfaces : liệt kê card mạng (psutil.net_if_addrs)
- GET /api/network/dns        : DNS lookup (socket.getaddrinfo)
"""

from fastapi import APIRouter

router = APIRouter(prefix="/api/network", tags=["network"])
