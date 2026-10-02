# Dockerfile para ejecutar Offline Media Vault 24/7 en cualquier nube (Render, Railway, Fly.io, VPS)
FROM oven/bun:latest

# Copiar el binario oficial de Deno para resolver desafíos EJS de YouTube en yt-dlp
COPY --from=denoland/deno:bin /deno /usr/local/bin/deno

# Instalar ffmpeg, python3, curl, unzip y dependencias
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    nodejs \
    curl \
    unzip \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Instalar la versión más reciente de yt-dlp
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp \
    && /usr/local/bin/yt-dlp --version \
    && /usr/local/bin/deno --version

# Instalar yt-dlp[default] via pip — incluye yt-dlp-ejs para resolver el challenge "n" de YouTube
# Este paquete es CLAVE: sin él yt-dlp no puede descargar desde IPs de datacenter
RUN pip3 install --no-cache-dir --break-system-packages "yt-dlp[default]" \
    || pip3 install --no-cache-dir "yt-dlp[default]" \
    || true

WORKDIR /app

# Copiar dependencias y archivo de bloqueo
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile || bun install

# Copiar el código fuente completo
COPY . .

# Compilar el frontend para producción
RUN bun run build

# Variables de entorno
ENV PORT=3000
ENV HOST=0.0.0.0
ENV NODE_ENV=production

EXPOSE 3000

# Iniciar servidor backend con soporte de descargas 24/7
CMD ["bun", "run", "server.ts"]
