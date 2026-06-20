"""Demo I/O multiplexing độc lập (chạy riêng bằng terminal).

Module này KHÔNG phụ thuộc FastAPI. Mục tiêu thể hiện kiến thức môn học:
xử lý NHIỀU client trên MỘT luồng duy nhất nhờ I/O multiplexing.

- Trên Linux: dùng `select.epoll()` (cơ chế đặc thù Linux, hiệu năng cao).
- Trên Windows (lúc dev): tự fallback sang `select.select()` để vẫn chạy được.

Đây là một TCP echo server: nhận dữ liệu từ client nào thì gửi trả lại
client đó, phục vụ đồng thời nhiều kết nối mà không cần thread/process mỗi client.

Cách chạy:
    python epoll_demo.py            # lắng nghe 127.0.0.1:9099
    python epoll_demo.py 9100       # đổi cổng

Thử bằng terminal khác:
    (Linux)   nc 127.0.0.1 9099
    (Windows) Test-NetConnection / telnet, hoặc dùng client socket Python
"""

import select
import socket
import sys

HOST = "127.0.0.1"
DEFAULT_PORT = 9099

IS_LINUX = sys.platform.startswith("linux")


def _make_server(port: int) -> socket.socket:
    """Tạo TCP server non-blocking ở trạng thái LISTEN."""
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind((HOST, port))
    server.listen(64)
    server.setblocking(False)  # bắt buộc với I/O multiplexing: không chặn
    return server


def run_with_epoll(server: socket.socket) -> None:
    """Vòng lặp sự kiện dùng epoll (Linux)."""
    epoll = select.epoll()
    # Đăng ký server socket: quan tâm sự kiện 'có thể đọc' (có kết nối mới).
    epoll.register(server.fileno(), select.EPOLLIN)
    conns: dict[int, socket.socket] = {}
    print(f"[epoll] Lắng nghe {HOST}:{server.getsockname()[1]} (Ctrl+C để dừng)")

    try:
        while True:
            # epoll.poll() chặn tới khi có fd sẵn sàng; trả về danh sách (fd, event).
            for fd, event in epoll.poll(timeout=1):
                if fd == server.fileno():
                    # Server sẵn sàng đọc => có client mới đang connect.
                    conn, addr = server.accept()
                    conn.setblocking(False)
                    epoll.register(conn.fileno(), select.EPOLLIN)
                    conns[conn.fileno()] = conn
                    print(f"[epoll] + client {addr} (fd={conn.fileno()})")
                elif event & select.EPOLLIN:
                    conn = conns[fd]
                    data = conn.recv(4096)
                    if data:
                        conn.sendall(data)  # echo
                    else:
                        # recv rỗng => client đã đóng kết nối.
                        epoll.unregister(fd)
                        conn.close()
                        conns.pop(fd, None)
                        print(f"[epoll] - client đóng (fd={fd})")
    except KeyboardInterrupt:
        print("\n[epoll] Dừng.")
    finally:
        epoll.close()


def run_with_select(server: socket.socket) -> None:
    """Vòng lặp sự kiện dùng select() — fallback cho Windows."""
    inputs: list[socket.socket] = [server]
    print(f"[select] Lắng nghe {HOST}:{server.getsockname()[1]} (Ctrl+C để dừng)")

    try:
        while True:
            # select() trả về các socket đã sẵn sàng đọc.
            readable, _, _ = select.select(inputs, [], [], 1)
            for s in readable:
                if s is server:
                    conn, addr = server.accept()
                    conn.setblocking(False)
                    inputs.append(conn)
                    print(f"[select] + client {addr}")
                else:
                    data = s.recv(4096)
                    if data:
                        s.sendall(data)  # echo
                    else:
                        inputs.remove(s)
                        s.close()
                        print("[select] - client đóng")
    except KeyboardInterrupt:
        print("\n[select] Dừng.")


def main() -> None:
    # Console Windows mặc định cp1252 không in được tiếng Việt → ép UTF-8.
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    port = int(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PORT
    server = _make_server(port)
    # Chọn cơ chế theo nền tảng: epoll trên Linux, select nơi khác.
    if IS_LINUX and hasattr(select, "epoll"):
        run_with_epoll(server)
    else:
        run_with_select(server)
    server.close()


if __name__ == "__main__":
    main()
