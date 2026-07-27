#!/bin/bash
# Script para ejecutar envío de campañas programadas
# Uso: Agregar a crontab: * * * * * /path/to/scripts/send-scheduled.sh

URL="${NEXTAUTH_URL:-http://localhost:3000}/api/campaigns/scheduled/send"

curl -s "$URL" > /dev/null 2>&1
