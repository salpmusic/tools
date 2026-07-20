FROM i386/alpine:3.22

RUN printf '%s\n' \
  'https://dl-cdn.alpinelinux.org/alpine/v3.22/main' \
  'https://dl-cdn.alpinelinux.org/alpine/v3.22/community' \
  > /etc/apk/repositories

RUN apk update && apk add --no-cache \
  bash \
  ca-certificates \
  curl \
  wget \
  git \
  nano \
  python3 \
  dbus \
  font-noto \
  font-noto-cjk \
  xorg-server \
  xinit \
  openbox \
  netsurf

RUN update-ca-certificates

RUN mkdir -p /root/.config/openbox

RUN cat > /root/.config/openbox/autostart <<'EOF'
#!/bin/sh

sleep 2
/usr/local/bin/salp-browser https://example.com &
EOF

RUN chmod +x /root/.config/openbox/autostart

RUN cat > /usr/local/bin/salp-browser <<'EOF'
#!/bin/sh

URL="${1:-https://example.com}"

if command -v netsurf-gtk3 >/dev/null 2>&1; then
  exec netsurf-gtk3 "$URL"
fi

if command -v netsurf >/dev/null 2>&1; then
  exec netsurf "$URL"
fi

echo "NetSurf not found"
exit 1
EOF

RUN chmod +x /usr/local/bin/salp-browser

RUN cat > /usr/local/bin/salp-desktop <<'EOF'
#!/bin/sh

export DISPLAY="${DISPLAY:-:0}"

openbox-session &
sleep 2

exec /usr/local/bin/salp-browser https://example.com
EOF

RUN chmod +x /usr/local/bin/salp-desktop

RUN cat > /etc/salp-release <<'EOF'
salp Linux Browser Image
Version 1.7
Browser: NetSurf
Base: Alpine Linux 3.22 x86
EOF

RUN echo 'salp Linux image ready' > /root/README.txt

CMD ["/bin/sh"]
