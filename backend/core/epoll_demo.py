"""Demo select/epoll độc lập (chạy riêng bằng terminal).

Module này KHÔNG phụ thuộc FastAPI. Mục tiêu thể hiện kiến thức I/O
multiplexing của môn học: dùng select.epoll() để xử lý nhiều client
trên một luồng duy nhất.

Cách chạy (trên Ubuntu):
    python3 epoll_demo.py
"""


def main() -> None:
    """Điểm vào của demo epoll (sẽ implement sau)."""
    raise NotImplementedError("epoll demo chưa được implement")


if __name__ == "__main__":
    main()
