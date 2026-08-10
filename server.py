"""
Proxy Server cho CPC1 Đấu thầu
Chuyển tiếp request từ frontend đến muasamcong.mpi.gov.vn
và thêm CORS headers để tránh lỗi trình duyệt.

Cách chạy: python server.py
Mở trình duyệt: http://localhost:8080
"""

import http.server
import json
import os
import sys
import ssl
import urllib.request
import urllib.error
from urllib.parse import urlparse, parse_qs, urlencode

# SSL context - bo qua certificate verification & cho phep DH_KEY_TOO_SMALL
SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE
try:
    SSL_CTX.set_ciphers('DEFAULT:@SECLEVEL=1')
except Exception:
    pass

# ===== CẤU HÌNH =====
PORT = int(os.environ.get('PORT', 8080))
TARGET_HOST = 'https://muasamcong.mpi.gov.vn'
STATIC_DIR = os.path.dirname(os.path.abspath(__file__))

class ProxyHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP Handler: phục vụ file tĩnh + proxy API requests"""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

    def end_headers(self):
        """Thêm CORS headers vào mọi response"""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def do_OPTIONS(self):
        """Xử lý preflight CORS request"""
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        """Serve static files; handle special browser requests gracefully"""
        # Redirect root favicon request to css/favicon.ico
        if self.path == '/favicon.ico':
            self.path = '/css/favicon.ico'
        # Silently return 404 for Chrome DevTools / well-known probes
        if self.path.startswith('/.well-known/') or self.path.startswith('/socket.io'):
            self.send_response(404)
            self.end_headers()
            return
        # Fall through to default static file serving
        super().do_GET()

    def do_POST(self):
        """Proxy POST requests đến muasamcong.mpi.gov.vn"""
        if self.path.startswith('/o/'):
            self._proxy_request()
        else:
            self.send_error(404, 'Not Found')

    def _proxy_request(self):
        """Chuyển tiếp request đến server đích (bao gồm query string)"""
        parsed = urlparse(self.path)
        target_url = TARGET_HOST + parsed.path
        if parsed.query:
            target_url += '?' + parsed.query

        # Đọc request body
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length) if content_length > 0 else None

        try:
            # Tạo request đến server đích
            req = urllib.request.Request(
                target_url,
                data=body,
                method='POST',
                headers={
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Connection': 'keep-alive'
                }
            )

            # Gửi request
            with urllib.request.urlopen(req, timeout=30, context=SSL_CTX) as response:
                response_data = response.read()
                
                self.send_response(response.status)
                self.send_header('Content-Type', response.getheader('Content-Type', 'application/json'))
                self.end_headers()
                self.wfile.write(response_data)

        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8', errors='replace')
            self.send_response(e.code)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                'error': True,
                'status': e.code,
                'message': f'Server trả về lỗi {e.code}',
                'detail': error_body[:500]
            }).encode('utf-8'))

        except urllib.error.URLError as e:
            print(f"  [ERROR] URLError: {e.reason}")
            self.send_response(502)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                'error': True,
                'status': 502,
                'message': 'Không thể kết nối đến muasamcong.mpi.gov.vn',
                'detail': str(e.reason)
            }).encode('utf-8'))

        except Exception as e:
            print(f"  [ERROR] Exception: {e}")
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                'error': True,
                'status': 500,
                'message': 'Lỗi proxy server',
                'detail': str(e)
            }).encode('utf-8'))

    def log_message(self, format, *args):
        """Custom log format"""
        method = args[0] if args else ''
        if '/o/' in str(method):
            print(f"  [PROXY]  {args[0]}")
        else:
            print(f"  [STATIC] {args[0]}")

    def handle_error(self, request, client_address):
        """Suppress harmless connection errors (browser closed tab/navigated away)"""
        import sys
        exc_type = sys.exc_info()[0]
        if exc_type in (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
            return  # Ignore — browser just closed the connection early
        super().handle_error(request, client_address)


def main():
    print("=" * 56)
    print("  CPC1 Dau thau - Proxy Server")
    print("=" * 56)
    print(f"  Thu muc: {STATIC_DIR}")
    print(f"  Server:  http://localhost:{PORT}")
    print(f"  Proxy:   {TARGET_HOST}")
    print("=" * 56)
    print("  Nhan Ctrl+C de dung server\n")

    server = http.server.ThreadingHTTPServer(('', PORT), ProxyHandler)
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n\n  Server da dung.")
        server.server_close()


if __name__ == '__main__':
    main()
