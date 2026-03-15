#!/bin/bash
cd /root/.openclaw/workspace/openquant/frontend/build
exec python3 /root/.openclaw/workspace/openquant/frontend/gzip_server.py
