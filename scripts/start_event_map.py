"""Start the Event Map locally using only the Python standard library."""

from __future__ import annotations

import os
import sys
import threading
import urllib.error
import urllib.request
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


HOST = "127.0.0.1"
PORTS = range(8000, 8011)
PROJECT_ROOT = Path(__file__).resolve().parent.parent


def event_map_is_running(port: int) -> bool:
    try:
        with urllib.request.urlopen(
            f"http://{HOST}:{port}/index.html", timeout=0.6
        ) as response:
            page = response.read(32_000)
        return b"Hamamatsu_Event_Map" in page or "浜松市 イベントマップ".encode() in page
    except (OSError, urllib.error.URLError):
        return False


def open_browser(url: str) -> None:
    if not webbrowser.open(url):
        print(f"ブラウザを自動で開けませんでした。次のURLを開いてください: {url}")


def main() -> int:
    os.chdir(PROJECT_ROOT)

    for port in PORTS:
        if event_map_is_running(port):
            url = f"http://{HOST}:{port}/"
            print(f"イベントマップはすでに起動しています: {url}")
            open_browser(url)
            return 0

    server = None
    selected_port = None
    for port in PORTS:
        try:
            server = ThreadingHTTPServer((HOST, port), SimpleHTTPRequestHandler)
            selected_port = port
            break
        except OSError:
            continue

    if server is None or selected_port is None:
        print("ローカルサーバーを起動できませんでした。ポート8000～8010が使用中です。")
        return 1

    url = f"http://{HOST}:{selected_port}/"
    print(f"イベントマップを起動しました: {url}")
    print("終了するには、このウィンドウを閉じるか Ctrl+C を押してください。")
    threading.Timer(0.5, open_browser, args=(url,)).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nローカルサーバーを終了します。")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
