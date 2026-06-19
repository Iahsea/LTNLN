---
name: syscall-module
description: Dùng khi viết code backend gọi system call Linux (đọc /proc, fork/exec, signal, socket, epoll, thao tác file, network interface). Đóng gói cách viết an toàn và cross-platform Windows/Ubuntu, bọc try/except, giới hạn sandbox. Kích hoạt khi làm các module process, file, socket, network hoặc bất kỳ chỗ nào gọi os/socket/subprocess/psutil.
---

# Viết module gọi system call an toàn

Project chạy thật trên Ubuntu nhưng dev trên Windows. Mọi code gọi system call phải tuân thủ các quy tắc dưới đây để không crash lúc dev và không gây hại lúc chạy.

## 1. Cross-platform: Windows dev / Ubuntu deploy

Các API CHỈ có trên Linux — phải kiểm tra trước khi dùng:
- `os.fork`, `os.kill` với một số signal
- `signal.SIGCHLD`, `signal.SIGUSR1`
- `socket.AF_UNIX` (Unix domain socket)
- `select.epoll`
- Đọc trực tiếp `/proc`

Mẫu kiểm tra nền tảng:
```python
import sys

IS_LINUX = sys.platform.startswith("linux")

def list_processes():
    if not IS_LINUX:
        # Fallback cross-platform bằng psutil
        return _list_via_psutil()
    # Đường đặc thù Linux: đọc /proc
    return _list_via_proc()
```

**Ưu tiên `psutil`** cho tiến trình và network — nó chạy được cả hai nền tảng, giảm số chỗ phải rẽ nhánh. Chỉ dùng đường đặc thù Linux (`/proc`, `epoll`...) khi cần thể hiện đúng kiến thức môn học, và luôn có nhánh fallback hoặc thông báo rõ ràng.

## 2. Bọc try/except, không để crash

Mọi lời gọi system call có thể ném `OSError`, `PermissionError`, `ProcessLookupError`, `FileNotFoundError`. Bắt và trả lỗi gọn cho frontend:
```python
from fastapi import HTTPException

try:
    os.kill(pid, signal.SIGTERM)
except ProcessLookupError:
    raise HTTPException(404, f"Không tìm thấy tiến trình {pid}")
except PermissionError:
    raise HTTPException(403, f"Không đủ quyền với tiến trình {pid}")
except OSError as e:
    raise HTTPException(500, f"Lỗi hệ thống: {e}")
```

Trên Windows, phần đặc thù Linux trả thông báo thay vì crash:
```python
if not IS_LINUX:
    raise HTTPException(501, "Chức năng này chỉ hỗ trợ trên Linux")
```

## 3. An toàn sandbox (BẮT BUỘC)

Mọi thao tác file/process chỉ trong `./sandbox/`. Validate đường dẫn để không thoát ra ngoài:
```python
from pathlib import Path

SANDBOX = Path("./sandbox").resolve()

def safe_path(user_path: str) -> Path:
    p = (SANDBOX / user_path).resolve()
    if not str(p).startswith(str(SANDBOX)):
        raise HTTPException(400, "Đường dẫn ngoài sandbox không được phép")
    return p
```

Không bao giờ thao tác file ngoài sandbox, kể cả khi test. Không kill tiến trình hệ thống (PID thấp, tiến trình không do app tạo).

## 4. Comment phục vụ báo cáo

Ở mỗi chỗ gọi system call, thêm comment tiếng Việt ngắn giải thích syscall đó làm gì — phục vụ viết báo cáo môn học. Ví dụ:
```python
# os.fork() tạo tiến trình con, trả về PID con cho tiến trình cha
pid = os.fork()
```

## Checklist trước khi xong một module
- [ ] Đã kiểm tra `sys.platform` cho mọi API đặc thù Linux?
- [ ] Đã bọc try/except cho mọi lời gọi syscall?
- [ ] Thao tác file/process đã giới hạn trong sandbox?
- [ ] Đã có comment giải thích syscall?
- [ ] Chạy thử trên Windows không crash (dù trả "chỉ hỗ trợ Linux")?