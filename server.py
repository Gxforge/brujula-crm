#!/usr/bin/env python3
"""Servidor HTTP ligero en 0.0.0.0:8000 sin caché para vista previa en vivo."""
import http.server
import socketserver

PORT = 8000


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()


if __name__ == "__main__":
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("0.0.0.0", PORT), NoCacheHandler) as httpd:
        print(f"Brújula CRM ejecutándose en http://0.0.0.0:{PORT}", flush=True)
        httpd.serve_forever()
