"""Router quản lý file — /api/files.

Sẽ implement:
- GET   /api/files         : liệt kê file + metadata (os.listdir, os.stat)
- GET   /api/files/read    : đọc nội dung file (open, read)
- POST  /api/files/write   : ghi/tạo file (open, write)
- PATCH /api/files/chmod   : đổi quyền file (os.chmod)
"""

from fastapi import APIRouter

router = APIRouter(prefix="/api/files", tags=["files"])
