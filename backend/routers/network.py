"""Router quản lý network — /api/network.

Endpoints:
- GET /api/network/interfaces : liệt kê card mạng (psutil.net_if_addrs / net_if_stats / net_io_counters)
- GET /api/network/dns?host=   : DNS lookup (socket.getaddrinfo)
- GET /api/network/ping?host=  : ping host (subprocess `ping`, cross-platform)

Phần này cross-platform nhờ psutil + socket; chỉ `ping` rẽ nhánh cờ dòng
lệnh theo HĐH. Mọi lời gọi đều bọc try/except.
"""

import re
import socket
import subprocess
import sys
import time

import psutil
from fastapi import APIRouter, HTTPException

from core.schemas import DnsResponse, NetworkInterface, PingResponse

router = APIRouter(prefix="/api/network", tags=["network"])

IS_WINDOWS = sys.platform.startswith("win")

# Bắt "time=23ms", "time<1ms", "thời gian=1.2 ms"... — khóa vào dấu =/< + số + ms,
# nên không phụ thuộc ngôn ngữ output của ping.
_PING_TIME_RE = re.compile(r"[=<]\s*([\d.]+)\s*ms", re.IGNORECASE)


@router.get("/interfaces", response_model=list[NetworkInterface])
def list_interfaces():
    """Liệt kê card mạng kèm IPv4, netmask, flags, RX/TX bytes."""
    try:
        # net_if_addrs ~ getifaddrs(): địa chỉ của từng interface.
        addrs = psutil.net_if_addrs()
        stats = psutil.net_if_stats()  # trạng thái up/down, mtu, speed
        io = psutil.net_io_counters(pernic=True)  # số byte gửi/nhận mỗi nic
    except OSError as e:
        raise HTTPException(500, f"Lỗi đọc thông tin mạng: {e}")

    result: list[NetworkInterface] = []
    for name, addr_list in addrs.items():
        ipv4, netmask = "", ""
        # Tìm bản ghi IPv4 (AF_INET) đầu tiên của interface.
        for a in addr_list:
            if a.family == socket.AF_INET:
                ipv4 = a.address
                netmask = a.netmask or ""
                break

        flags = ""
        st = stats.get(name)
        if st is not None:
            flags = ("UP" if st.isup else "DOWN") + f",MTU={st.mtu}"

        counters = io.get(name)
        rx = counters.bytes_recv if counters else 0
        tx = counters.bytes_sent if counters else 0

        result.append(
            NetworkInterface(
                name=name,
                ipv4=ipv4,
                netmask=netmask,
                flags=flags,
                rx_bytes=rx,
                tx_bytes=tx,
            )
        )
    return result


@router.get("/dns", response_model=DnsResponse)
def dns_lookup(host: str):
    """Phân giải tên miền sang địa chỉ IP (socket.getaddrinfo)."""
    name = (host or "").strip()
    if not name:
        raise HTTPException(400, "Thiếu tham số host")

    try:
        # getaddrinfo() tra DNS, trả về danh sách (family, type, proto, canon, sockaddr).
        infos = socket.getaddrinfo(name, None)
    except socket.gaierror:
        raise HTTPException(404, f"Không phân giải được tên miền: {name}")
    except OSError as e:
        raise HTTPException(500, f"Lỗi DNS: {e}")

    # Gom IP duy nhất, giữ thứ tự xuất hiện.
    seen: list[str] = []
    for info in infos:
        ip = info[4][0]
        if ip not in seen:
            seen.append(ip)
    return DnsResponse(host=name, addresses=seen)


@router.get("/ping", response_model=PingResponse)
def ping_host(host: str):
    """Ping một host (gửi 1 gói ICMP qua lệnh hệ thống `ping`)."""
    name = (host or "").strip()
    if not name or any(c.isspace() for c in name):
        raise HTTPException(400, "Host không hợp lệ")

    # Cờ ping khác nhau giữa Windows và Linux. shell=False + truyền host dạng
    # tham số => không có nguy cơ command injection.
    if IS_WINDOWS:
        cmd = ["ping", "-n", "1", "-w", "2000", name]
    else:
        cmd = ["ping", "-c", "1", "-W", "2", name]

    start = time.perf_counter()
    try:
        proc = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=5,
        )
    except subprocess.TimeoutExpired:
        return PingResponse(host=name, reachable=False, latency_ms=None)
    except OSError as e:
        raise HTTPException(500, f"Lỗi chạy ping: {e}")
    elapsed_ms = (time.perf_counter() - start) * 1000

    reachable = proc.returncode == 0
    if not reachable:
        return PingResponse(host=name, reachable=False, latency_ms=None)

    # Ưu tiên lấy latency do ping báo; nếu không parse được thì dùng thời gian đo.
    out = proc.stdout.decode("utf-8", errors="ignore")
    m = _PING_TIME_RE.search(out)
    latency = float(m.group(1)) if m else round(elapsed_ms, 2)
    return PingResponse(host=name, reachable=True, latency_ms=latency)
