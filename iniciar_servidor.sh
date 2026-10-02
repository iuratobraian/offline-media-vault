#!/usr/bin/env bash
# ==============================================================================
# OFFLINE MEDIA VAULT - LANZADOR AUTOMÁTICO DE SERVIDOR
# ==============================================================================

# Ir al directorio donde se encuentra este script
cd "$(dirname "$0")" || exit 1

# Detectar IP local para acceso desde celular en la misma red Wi-Fi
LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
if [ -z "$LOCAL_IP" ]; then
  LOCAL_IP=$(ip -4 addr show 2>/dev/null | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | grep -v '127.0.0.1' | head -n 1)
fi
if [ -z "$LOCAL_IP" ]; then
  LOCAL_IP="192.168.1.X"
fi

echo ""
echo "======================================================================"
echo "           🚀 INICIANDO OFFLINE MEDIA VAULT (V2)                      "
echo "======================================================================"
echo ""

# Verificar Bun o Node
RUNNER=""
if command -v bun &> /dev/null; then
  RUNNER="bun"
elif command -v npm &> /dev/null; then
  RUNNER="npm"
else
  echo "❌ Error: Se requiere 'bun' o 'node/npm' para iniciar la aplicación."
  echo "Por favor instala bun o nodejs."
  exit 1
fi

# Verificar yt-dlp y ffmpeg
echo "🔍 Verificando herramientas de descarga..."
if command -v yt-dlp &> /dev/null || [ -f "$HOME/.local/bin/yt-dlp" ]; then
  echo "  ✓ yt-dlp detectado y listo."
else
  echo "  ⚠️ yt-dlp no encontrado en el PATH. Las descargas de YouTube podrían verse limitadas."
fi

if command -v ffmpeg &> /dev/null; then
  echo "  ✓ ffmpeg detectado para procesamiento multimedia."
else
  echo "  ⚠️ ffmpeg no encontrado. Se recomienda instalarlo con: sudo apt install ffmpeg"
fi

echo ""
echo "📡 Enlaces de acceso:"
echo "   💻 En tu computadora: http://localhost:3000"
echo "   📱 En tu celular:     http://${LOCAL_IP}:3000 (conectado al mismo Wi-Fi)"
echo ""
echo "⏳ Iniciando servidor web..."

# Abrir el navegador en segundo plano una vez que el servidor responda
(
  sleep 2
  for i in {1..15}; do
    if curl -s -I http://localhost:3000 &> /dev/null; then
      echo "🌐 Abriendo navegador en http://localhost:3000 ..."
      if command -v xdg-open &> /dev/null; then
        xdg-open "http://localhost:3000" &> /dev/null &
      elif command -v sensible-browser &> /dev/null; then
        sensible-browser "http://localhost:3000" &> /dev/null &
      fi
      break
    fi
    sleep 1
  done
) &

echo "======================================================================"
echo " Servidor activo. Presiona Ctrl + C en cualquier momento para salir.  "
echo "======================================================================"
echo ""

# Liberar puerto 3000 si hay un proceso previo colgado
OLD_PID=$(lsof -ti :3000 2>/dev/null)
if [ -n "$OLD_PID" ]; then
  echo "🔄 Liberando puerto 3000 previo..."
  kill -15 $OLD_PID 2>/dev/null || kill -9 $OLD_PID 2>/dev/null || true
  sleep 1
fi

echo "📦 Compilando aplicación y Service Worker para soporte 100% offline (Modo Avión)..."
if [ "$RUNNER" = "bun" ]; then
  bun run build
else
  npm run build
fi

echo ""
echo "🚀 Iniciando servidor Offline Media Vault..."
if [ "$RUNNER" = "bun" ]; then
  exec bun run server.ts
else
  exec npx tsx server.ts
fi

