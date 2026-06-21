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
    """Dựng TCP echo server tạm trên 127.0.0.1, client gửi rồi nhận lại.

    Mỗi bước đều ghi log realtime (log_bus) để xem rõ vòng đời socket
    ngay trên khung "Log hệ thống" của UI.
    """
    # socket() tạo endpoint; SOCK_STREAM = TCP.
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    log_bus.log("INFO", "socket", f"TCP socket() → tạo server fd={server.fileno()} (AF_INET, SOCK_STREAM)")
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        server.bind(("127.0.0.1", 0))  # bind() cổng 0 = để OS chọn cổng trống
        host, port = server.getsockname()
        log_bus.log("INFO", "socket", f"TCP bind() → {host}:{port} (cổng 0 → OS tự cấp)")
        server.listen(1)  # listen() chuyển socket sang trạng thái LISTEN
        log_bus.log("INFO", "socket", f"TCP listen() → server vào trạng thái LISTEN tại {host}:{port}")

        def serve():
            server.settimeout(TIMEOUT)
            try:
                log_bus.log("INFO", "socket", "TCP [server] accept() → đang chờ kết nối…")
                conn, peer = server.accept()  # accept() chờ và nhận kết nối
                log_bus.log("INFO", "socket", f"TCP [server] accept() → nhận kết nối từ {peer[0]}:{peer[1]} (fd={conn.fileno()})")
                with conn:
                    data = conn.recv(BUFSIZE)  # recv() đọc dữ liệu client gửi
                    log_bus.log("INFO", "socket", f"TCP [server] recv() → {len(data)} bytes")
                    conn.sendall(data)  # send() trả lại y nguyên (echo)
                    log_bus.log("INFO", "socket", f"TCP [server] send() → echo lại {len(data)} bytes")
            except OSError as e:
                log_bus.log("ERROR", "socket", f"TCP [server] lỗi: {e}")

        t = threading.Thread(target=serve, daemon=True)
        t.start()

        # Phía client: connect() rồi send/recv.
        client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        log_bus.log("INFO", "socket", f"TCP [client] socket() → tạo client fd={client.fileno()}")
        client.settimeout(TIMEOUT)
        try:
            client.connect((host, port))  # connect() bắt tay 3 bước tới server
            log_bus.log("INFO", "socket", f"TCP [client] connect() → bắt tay tới {host}:{port}")
            payload = message.encode("utf-8")
            client.sendall(payload)
            log_bus.log("INFO", "socket", f"TCP [client] send() → {payload!r} ({len(payload)} bytes)")
            echoed = client.recv(BUFSIZE)
            log_bus.log("INFO", "socket", f"TCP [client] recv() → {echoed!r}")
        finally:
            client.close()
            log_bus.log("INFO", "socket", "TCP [client] close() → đóng socket client")
        t.join(timeout=TIMEOUT)
        return echoed.decode("utf-8", errors="replace")
    finally:
        server.close()  # close() giải phóng cổng, server tạm biến mất
        log_bus.log("INFO", "socket", "TCP close() → đóng server, kết thúc vòng đời")


def _udp_echo_once(message: str) -> str:
    """Dựng UDP echo server tạm; minh họa sendto()/recvfrom() (không kết nối).

    Ghi log từng bước để thấy UDP KHÔNG có listen/accept/connect — chỉ gửi
    từng datagram trực tiếp.
    """
    # SOCK_DGRAM = UDP: gửi từng datagram, không bắt tay kết nối.
    server = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    log_bus.log("INFO", "socket", f"UDP socket() → tạo server fd={server.fileno()} (AF_INET, SOCK_DGRAM)")
    try:
        server.bind(("127.0.0.1", 0))
        host, port = server.getsockname()
        log_bus.log("INFO", "socket", f"UDP bind() → {host}:{port} (không listen/accept như TCP)")

        def serve():
            server.settimeout(TIMEOUT)
            try:
                log_bus.log("INFO", "socket", "UDP [server] recvfrom() → đang chờ datagram…")
                data, addr = server.recvfrom(BUFSIZE)  # recvfrom() trả kèm địa chỉ gửi
                log_bus.log("INFO", "socket", f"UDP [server] recvfrom() → {len(data)} bytes từ {addr[0]}:{addr[1]}")
                server.sendto(data, addr)  # sendto() gửi trả về đúng addr đó
                log_bus.log("INFO", "socket", f"UDP [server] sendto() → echo {len(data)} bytes về {addr[0]}:{addr[1]}")
            except OSError as e:
                log_bus.log("ERROR", "socket", f"UDP [server] lỗi: {e}")

        t = threading.Thread(target=serve, daemon=True)
        t.start()

        client = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        log_bus.log("INFO", "socket", f"UDP [client] socket() → tạo client fd={client.fileno()}")
        client.settimeout(TIMEOUT)
        try:
            payload = message.encode("utf-8")
            client.sendto(payload, (host, port))  # sendto() gửi thẳng, không cần connect
            log_bus.log("INFO", "socket", f"UDP [client] sendto() → {payload!r} ({len(payload)} bytes) tới {host}:{port}")
            data, _ = client.recvfrom(BUFSIZE)
            log_bus.log("INFO", "socket", f"UDP [client] recvfrom() → {data!r}")
        finally:
            client.close()
            log_bus.log("INFO", "socket", "UDP [client] close() → đóng socket client")
        t.join(timeout=TIMEOUT)
        return data.decode("utf-8", errors="replace")
    finally:
        server.close()
        log_bus.log("INFO", "socket", "UDP close() → đóng server, kết thúc vòng đời")


def _unix_echo_once(message: str) -> str:
    """Echo qua Unix domain socket (AF_UNIX) — IPC nội bộ máy, chỉ có trên Linux.

    Ghi log từng bước: giống TCP (listen/accept/connect) nhưng "địa chỉ" là
    đường dẫn file trong sandbox thay vì IP:port.
    """
    sock_path = SANDBOX / "echo.sock"
    if sock_path.exists():
        sock_path.unlink()
    # AF_UNIX dùng đường dẫn file thay cho IP:port; nhanh hơn cho IPC cùng máy.
    server = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    log_bus.log("INFO", "socket", f"UNIX socket() → tạo server fd={server.fileno()} (AF_UNIX, SOCK_STREAM)")
    try:
        server.bind(str(sock_path))  # bind() vào đường dẫn file, không phải IP:port
        log_bus.log("INFO", "socket", f"UNIX bind() → {sock_path} (địa chỉ là file, không phải IP)")
        server.listen(1)
        log_bus.log("INFO", "socket", "UNIX listen() → server vào trạng thái LISTEN")

        def serve():
            server.settimeout(TIMEOUT)
            try:
                log_bus.log("INFO", "socket", "UNIX [server] accept() → đang chờ kết nối…")
                conn, _ = server.accept()
                log_bus.log("INFO", "socket", f"UNIX [server] accept() → nhận kết nối (fd={conn.fileno()})")
                with conn:
                    data = conn.recv(BUFSIZE)
                    log_bus.log("INFO", "socket", f"UNIX [server] recv() → {len(data)} bytes")
                    conn.sendall(data)
                    log_bus.log("INFO", "socket", f"UNIX [server] send() → echo lại {len(data)} bytes")
            except OSError as e:
                log_bus.log("ERROR", "socket", f"UNIX [server] lỗi: {e}")

        t = threading.Thread(target=serve, daemon=True)
        t.start()

        client = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        log_bus.log("INFO", "socket", f"UNIX [client] socket() → tạo client fd={client.fileno()}")
        client.settimeout(TIMEOUT)
        try:
            client.connect(str(sock_path))  # connect() tới file socket
            log_bus.log("INFO", "socket", f"UNIX [client] connect() → kết nối tới {sock_path}")
            payload = message.encode("utf-8")
            client.sendall(payload)
            log_bus.log("INFO", "socket", f"UNIX [client] send() → {payload!r} ({len(payload)} bytes)")
            echoed = client.recv(BUFSIZE)
            log_bus.log("INFO", "socket", f"UNIX [client] recv() → {echoed!r}")
        finally:
            client.close()
            log_bus.log("INFO", "socket", "UNIX [client] close() → đóng socket client")
        t.join(timeout=TIMEOUT)
        return echoed.decode("utf-8", errors="replace")
    finally:
        server.close()
        sock_path.unlink(missing_ok=True)  # xóa file socket khỏi sandbox
        log_bus.log("INFO", "socket", "UNIX close() → đóng server + xóa file socket")


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
    log_bus.log("INFO", "socket", f"───── Bắt đầu TCP echo: {req.message!r} ─────")
    try:
        received = _tcp_echo_once(req.message)
    except (OSError, socket.timeout) as e:
        raise HTTPException(500, f"Lỗi TCP echo: {e}")
    return EchoResponse(transport="tcp", sent=req.message, received=received)


@router.post("/udp-echo", response_model=EchoResponse)
def udp_echo(req: EchoRequest):
    """UDP echo server demo: sendto / recvfrom (giao thức không kết nối)."""
    log_bus.log("INFO", "socket", f"───── Bắt đầu UDP echo: {req.message!r} ─────")
    try:
        received = _udp_echo_once(req.message)
    except (OSError, socket.timeout) as e:
        raise HTTPException(500, f"Lỗi UDP echo: {e}")
    return EchoResponse(transport="udp", sent=req.message, received=received)


@router.post("/unix-echo", response_model=EchoResponse)
def unix_echo(req: EchoRequest):
    """Unix domain socket demo (AF_UNIX) — IPC giữa 2 tiến trình. Chỉ Linux."""
    if not IS_LINUX:
        # AF_UNIX không khả dụng ổn định trên Windows.
        raise HTTPException(501, "Unix domain socket chỉ hỗ trợ trên Linux")
    log_bus.log("INFO", "socket", f"───── Bắt đầu UNIX echo: {req.message!r} ─────")
    try:
        received = _unix_echo_once(req.message)
    except (OSError, socket.timeout) as e:
        raise HTTPException(500, f"Lỗi Unix socket echo: {e}")
    return EchoResponse(transport="unix", sent=req.message, received=received)
