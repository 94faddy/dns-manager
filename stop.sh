#!/bin/bash
# Path: stop.sh

APPNAME="dns-manager"

echo "🛑 Stopping dns-manager..."

pm2 delete $APPNAME 2>/dev/null

echo "✅ PM2 processes stopped."
