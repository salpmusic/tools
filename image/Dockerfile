
FROM i386/alpine:3.18

RUN apk update && \
    apk add --no-cache \
      bash \
      ca-certificates \
      curl \
      wget \
      nano \
      git \
      python3 \
      font-noto \
      font-noto-cjk \
      dbus \
      mesa-dri-gallium \
      xf86-video-vesa \
      xorg-server \
      xinit \
      openbox \
      netsurf && \
    update-ca-certificates

RUN mkdir -p /root/.config/openbox

RUN printf '%s\n' \
  '<?xml version="1.0" encoding="UTF-8"?>' \
  '<openbox_config xmlns="http://openbox.org/3.4/rc">' \
  '  <applications>' \
  '    <application class="*">' \
  '      <decor>yes</decor>' \
  '    </application>' \
  '  </applications>' \
  '</openbox_config>' \
  > /root/.config/openbox/rc.xml

RUN printf '%s\n' \
  '#!/bin/sh' \
  'URL="${1:-https://example.com}"' \
  'if command -v netsurf-gtk3 >/dev/null 2>&1; then' \
  '  exec netsurf-gtk3 "$URL"' \
  'elif command -v netsurf >/dev/null 2>&1; then' \
  '  exec netsurf "$URL"' \
  'else' \
  '  echo "NetSurf not found"' \
  '  exit 1' \
  'fi' \
  > /usr/local/bin/salp-browser && \
  chmod +x /usr/local/bin/salp-browser

RUN printf '%s\n' \
  '#!/bin/sh' \
  'openbox-session &' \
  'sleep 2' \
  '/usr/local/bin/salp-browser https://example.com &' \
  'wait' \
  > /usr/local/bin/salp-desktop && \
  chmod +x /usr/local/bin/salp-desktop

RUN printf '%s\n' \
  'salp Linux Browser Image' \
  'Version 1.7' \
  'Browser: NetSurf' \
  > /etc/salp-release

CMD ["/bin/sh"]
