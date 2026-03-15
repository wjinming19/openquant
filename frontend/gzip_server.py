#!/usr/bin/env python3
"""带gzip压缩的HTTP服务器"""
import http.server
import socketserver
import gzip
import os
from io import BytesIO

class GzipHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # 添加缓存控制头
        if self.path.endswith(('.js', '.css', '.png', '.jpg', '.ico')):
            self.send_header('Cache-Control', 'public, max-age=86400')
        super().end_headers()
    
    def do_GET(self):
        # 检查客户端是否支持gzip
        accept_encoding = self.headers.get('Accept-Encoding', '')
        
        if 'gzip' in accept_encoding and self.path.endswith(('.js', '.css', '.html')):
            # 尝试发送gzip版本
            gzip_path = self.translate_path(self.path + '.gz')
            if os.path.exists(gzip_path):
                self.send_gzip_file(gzip_path)
                return
            else:
                # 实时压缩
                self.send_gzip_content()
                return
        
        super().do_GET()
    
    def send_gzip_file(self, path):
        try:
            with open(path, 'rb') as f:
                content = f.read()
            self.send_response(200)
            self.send_header('Content-Type', self.guess_type(path.replace('.gz', '')))
            self.send_header('Content-Encoding', 'gzip')
            self.send_header('Content-Length', len(content))
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self.send_error(500, str(e))
    
    def send_gzip_content(self):
        try:
            path = self.translate_path(self.path)
            if not os.path.exists(path):
                self.send_error(404)
                return
            
            with open(path, 'rb') as f:
                content = f.read()
            
            # gzip压缩
            buf = BytesIO()
            with gzip.GzipFile(fileobj=buf, mode='wb') as f:
                f.write(content)
            compressed = buf.getvalue()
            
            self.send_response(200)
            self.send_header('Content-Type', self.guess_type(path))
            self.send_header('Content-Encoding', 'gzip')
            self.send_header('Content-Length', len(compressed))
            self.end_headers()
            self.wfile.write(compressed)
        except Exception as e:
            self.send_error(500, str(e))

if __name__ == '__main__':
    PORT = 8090
    with socketserver.TCPServer(("", PORT), GzipHTTPRequestHandler) as httpd:
        print(f"Serving with gzip at port {PORT}")
        httpd.serve_forever()
