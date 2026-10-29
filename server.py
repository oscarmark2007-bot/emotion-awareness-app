#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
情緒觀察表 - 本地微型伺服器與備份工具
支援手機透過區域網路連線、自動開啟瀏覽器、一鍵本機硬碟備份
"""

import http.server
import socketserver
import socket
import os
import sys
import json
import webbrowser
from datetime import datetime

# Ensure stdout and stderr handle utf-8 safely on Windows
try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

PORT = 8080
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKUP_DIR = os.path.join(BASE_DIR, 'backups')
os.makedirs(BACKUP_DIR, exist_ok=True)

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

class EmotionAppHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def end_headers(self):
        # Enable CORS and caching headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache, must-revalidate')
        super().end_headers()

    def do_GET(self):
        if self.path == '/api/ip':
            ip = get_local_ip()
            data = {
                'ip': ip,
                'port': PORT,
                'mobileUrl': f'http://{ip}:{PORT}'
            }
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(data).encode('utf-8'))
            return
        elif self.path == '/api/backups':
            backups = []
            if os.path.exists(BACKUP_DIR):
                for f in sorted(os.listdir(BACKUP_DIR), reverse=True):
                    if f.endswith('.json'):
                        fp = os.path.join(BACKUP_DIR, f)
                        backups.append({
                            'filename': f,
                            'size': os.path.getsize(fp),
                            'mtime': datetime.fromtimestamp(os.path.getmtime(fp)).isoformat()
                        })
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(backups).encode('utf-8'))
            return

        super().do_GET()

    def do_POST(self):
        if self.path == '/api/backup':
            content_length = int(self.headers.get('Content-Length', 0))
            post_body = self.rfile.read(content_length)
            try:
                data = json.loads(post_body.decode('utf-8'))
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                filename = f'emotion_backup_{timestamp}.json'
                filepath = os.path.join(BACKUP_DIR, filename)

                with open(filepath, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)

                response_data = {
                    'ok': True,
                    'filename': filename,
                    'path': filepath,
                    'recordsCount': len(data.get('records', []))
                }
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps(response_data).encode('utf-8'))
                print(f"[備份成功] 資料已儲存至: {filepath}")
                return
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({'ok': False, 'error': str(e)}).encode('utf-8'))
                return

        self.send_response(404)
        self.end_headers()

def main():
    global PORT
    local_ip = get_local_ip()

    # Find free port if 8080 is occupied
    for p in range(8080, 8095):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('0.0.0.0', p))
                PORT = p
                break
        except OSError:
            continue

    local_url = f"http://localhost:{PORT}"
    mobile_url = f"http://{local_ip}:{PORT}"

    print("=" * 64)
    print("   [Emotional Awareness] 2026 PEI 第三屆情緒觀察營 - 情緒觀察表 App")
    print("=" * 64)
    print(f"  電腦瀏覽器開啟:   {local_url}")
    print(f"  手機掃描或連線:   {mobile_url}")
    print(f"  本機硬碟備份目錄: {BACKUP_DIR}")
    print("-" * 64)
    print("  提示: 手機與電腦連接同一 Wi-Fi，即可在手機使用本 App！")
    print("  可於手機 Safari / Chrome 點擊「加入主畫面」，獲得原生 App 體驗。")
    print("  按 Ctrl+C 可停止伺服器。")
    print("=" * 64)

    # Open browser automatically
    try:
        webbrowser.open(local_url)
    except Exception:
        pass

    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("0.0.0.0", PORT), EmotionAppHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n伺服器已正常停止。")

if __name__ == '__main__':
    main()
