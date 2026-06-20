"""Router quản lý socket — /api/socket.

Endpoints:
- GET  /api/socket/connections : liệt kê kết nối socket (psutil.net_connections)
- POST /api/socket/echo        : TCP echo demo (socket, bind, listen, accept, send, recv)
- POST /api/socket/udp-echo    : UDP echo demo (sendto, recvfrom)
- POST /api/socket/unix-echo   : Unix domain socket demo (AF_UNIX, IPC) — chỉ Linux

Mỗi endpoint echo dựng một server nhỏ trên một luồng (thread), cho client
kết nối, gửi rồi nhận lại đúng chuỗi — minh họa trọn vẹn vòng đời socket.
Tất cả đều có timeout để không treo request.
"""

import socket
import sys
import threading
from pathlib import Path

import psutil
from fastapi import APIRouter, HTTPException

from core.logbus import log_bus
from core.schemas import EchoRequest, EchoResponse, SocketConnection

router = APIRouter(prefix="/api/socket", tags=["socket"])

IS_LINUX = sys.platform.startswith("linux")
SANDBOX = Path("./sandbox").resolve()
SANDBOX.mkdir(parents=True, exist_ok=True)

# Timeout chung (giây) cho mọi thao tác socket trong demo.
TIMEOUT = 5.0
BUFSIZE = 4096


def _tcp_echo_once(message: str) -> str:
    """Dựng TCP echo server tạm trên 127.0.0.1, client gửi rồi nhận lại."""
    # socket() tạo endpoint; SOCK_STREAM = TCP.
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        server.bind(("127.0.0.1", 0))  # bind() cổng 0 = để OS chọn cổng trống
        server.listen(1)  # listen() chuyển socket sang trạng thái LISTEN
        host, port = server.getsockname()

        def serve():
            server.settimeout(TIMEOUT)
            try:
                conn, _ = server.accept()  # accept() chờ và nhận kết nối
                with conn:
                    data = conn.recv(BUFSIZE)  # recv() đọc dữ liệu client gửi
                    conn.sendall(data)  # send() trả lại y nguyên (echo)
            except OSError:
                pass

        t = threading.Thread(target=serve, daemon=True)
        t.start()

        # Phía client: connect() rồi send/recv.
        client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        client.settimeout(TIMEOUT)
        try:
            client.connect((host, port))
            client.sendall(message.encode("utf-8"))
            echoed = client.recv(BUFSIZE)
        finally:
            client.close()
        t.join(timeout=TIMEOUT)
        return echoed.decode("utf-8", errors="replace")
    finally:
        server.close()


def _udp_echo_once(message: str) -> str:
    """Dựng UDP echo server tạm; minh họa sendto()/recvfrom() (không kết nối)."""
    # SOCK_DGRAM = UDP: gửi từng datagram, không bắt tay kết nối.
    server = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        server.bind(("127.0.0.1", 0))
        host, port = server.getsockname()

        def serve():
            server.settimeout(TIMEOUT)
            try:
                data, addr = server.recvfrom(BUFSIZE)  # recvfrom() trả kèm địa chỉ gửi
                server.sendto(data, addr)  # sendto() gửi trả về đúng addr đó
            except OSError:
                pass

        t = threading.Thread(target=serve, daemon=True)
        t.start()

        client = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        client.settimeout(TIMEOUT)
        try:
            client.sendto(message.encode("utf-8"), (host, port))
            data, _ = client.recvfrom(BUFSIZE)
        finally:
            client.close()
        t.join(timeout=TIMEOUT)
        return data.decode("utf-8", errors="replace")
    finally:
        server.close()


def _unix_echo_once(message: str) -> str:
    """Echo qua Unix domain socket (AF_UNIX) — IPC nội bộ máy, chỉ có trên Linux."""
    sock_path = SANDBOX / "echo.sock"
    if sock_path.exists():
        sock_path.unlink()
    # AF_UNIX dùng đường dẫn file thay cho IP:port; nhanh hơn cho IPC cùng máy.
    server = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    try:
        server.bind(str(sock_path))
        server.listen(1)

        def serve():
            server.settimeout(TIMEOUT)
            try:
                conn, _ = server.accept()
                with conn:
                    data = conn.recv(BUFSIZE)
                    conn.sendall(data)
            except OSError:
                pass

        t = threading.Thread(target=serve, daemon=True)
        t.start()

        client = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        client.settimeout(TIMEOUT)
        try:
            client.connect(str(sock_path))
            client.sendall(message.encode("utf-8"))
            echoed = client.recv(BUFSIZE)
        finally:
            client.close()
        t.join(timeout=TIMEOUT)
        return echoed.decode("utf-8", errors="replace")
    finally:
        server.close()
        sock_path.unlink(missing_ok=True)


@router.get("/connections", response_model=list[SocketConnection])
def list_connections():
    """Liệt kê kết nối socket hiện có (psutil.net_connections).

    Trên Linux lấy cả Unix domain socket (kind="all"); trên Windows chỉ lấy
    TCP/UDP (kind="inet") vì AF_UNIX không khả dụng ổn định.
    """
    # AF_UNIX chỉ có trên Linux; getattr để không lỗi khi import trên Windows.
    AF_UNIX = getattr(socket, "AF_UNIX", None)
    try:
        conns = psutil.net_connections(kind="all" if IS_LINUX else "inet")
    except (psutil.AccessDenied, PermissionError):
        raise HTTPException(403, "Không đủ quyền liệt kê kết nối (thử chạy quyền cao hơn)")
    except OSError as e:
        raise HTTPException(500, f"Lỗi hệ thống: {e}")

    result: list[SocketConnection] = []
    for c in conns:
        if c.type == socket.SOCK_STREAM:
            kind = "TCP"
        elif c.type == socket.SOCK_DGRAM:
            kind = "UDP"
        else:
            kind = str(c.type)

        if AF_UNIX is not None and c.family == AF_UNIX:
            # Unix socket: laddr là đường dẫn file (chuỗi), không có ip/port.
            kind = "UNIX-" + kind  # UNIX-TCP (stream) / UNIX-UDP (dgram)
            local_addr = c.laddr if isinstance(c.laddr, str) else ""
            remote_addr = c.raddr if isinstance(c.raddr, str) else ""
        else:
            # Socket internet: laddr/raddr là tuple (ip, port).
            local_addr = f"{c.laddr.ip}:{c.laddr.port}" if c.laddr else ""
            remote_addr = f"{c.raddr.ip}:{c.raddr.port}" if c.raddr else ""

        result.append(
            SocketConnection(
                fd=c.fd if c.fd is not None else -1,
                type=kind,
                local_addr=local_addr,
                remote_addr=remote_addr,
                status=c.status or "NONE",
            )
        )
    return result


@router.post("/echo", response_model=EchoResponse)
def tcp_echo(req: EchoRequest):
    """TCP echo server demo: socket → bind → listen → accept → recv → send."""
    try:
        received = _tcp_echo_once(req.message)
    except (OSError, socket.timeout) as e:
        raise HTTPException(500, f"Lỗi TCP echo: {e}")
    log_bus.log("INFO", "socket", f"TCP echo: {req.message!r}")
    return EchoResponse(transport="tcp", sent=req.message, received=received)


@router.post("/udp-echo", response_model=EchoResponse)
def udp_echo(req: EchoRequest):
    """UDP echo server demo: sendto / recvfrom (giao thức không kết nối)."""
    try:
        received = _udp_echo_once(req.message)
    except (OSError, socket.timeout) as e:
        raise HTTPException(500, f"Lỗi UDP echo: {e}")
    log_bus.log("INFO", "socket", f"UDP echo: {req.message!r}")
    return EchoResponse(transport="udp", sent=req.message, received=received)


@router.post("/unix-echo", response_model=EchoResponse)
def unix_echo(req: EchoRequest):
    """Unix domain socket demo (AF_UNIX) — IPC giữa 2 tiến trình. Chỉ Linux."""
    if not IS_LINUX:
        # AF_UNIX không khả dụng ổn định trên Windows.
        raise HTTPException(501, "Unix domain socket chỉ hỗ trợ trên Linux")
    try:
        received = _unix_echo_once(req.message)
    except (OSError, socket.timeout) as e:
        raise HTTPException(500, f"Lỗi Unix socket echo: {e}")
    log_bus.log("INFO", "socket", f"Unix echo: {req.message!r}")
    return EchoResponse(transport="unix", sent=req.message, received=received)
