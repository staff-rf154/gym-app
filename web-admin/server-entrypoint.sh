#!/bin/sh
set -eu

CONFIG_DIR="${SERVER_CONFIG_DIR:-/etc/nginx/server-config}"
SETTINGS_FILE="$CONFIG_DIR/server-settings.json"
RUNTIME_FILE="$CONFIG_DIR/runtime.json"
UPLOADED_DIR="$CONFIG_DIR/tls"
TEMPLATE="/etc/nginx/nginx.conf.template"
OUTPUT="/etc/nginx/conf.d/default.conf"
BUILTIN_CERT="/etc/nginx/ssl/staff-rf/fullchain.pem"
BUILTIN_KEY="/etc/nginx/ssl/staff-rf/privkey.pem"
WATCH_INTERVAL="${SERVER_CONFIG_WATCH_INTERVAL:-3}"

mkdir -p "$CONFIG_DIR" "$UPLOADED_DIR"
mkdir -p "$(dirname "$OUTPUT")"

read_port() {
    if [ -f "$SETTINGS_FILE" ]; then
        sed -n 's/.*"port"[[:space:]]*:[[:space:]]*\([0-9][0-9]*\).*/\1/p' \
            "$SETTINGS_FILE" | head -n 1
    fi
}

read_cert_source() {
    if [ -f "$SETTINGS_FILE" ] &&
        grep -q '"certificate"[[:space:]]*:[[:space:]]*"uploaded"' "$SETTINGS_FILE"; then
        echo "uploaded"
    else
        echo "builtin"
    fi
}

resolve_certificate() {
    CERT_PATH="$BUILTIN_CERT"
    KEY_PATH="$BUILTIN_KEY"

    if [ "$(read_cert_source)" = "uploaded" ] &&
        [ -f "$UPLOADED_DIR/cert.pem" ] &&
        [ -f "$UPLOADED_DIR/key.pem" ]; then
        CERT_PATH="$UPLOADED_DIR/cert.pem"
        KEY_PATH="$UPLOADED_DIR/key.pem"
    fi
}

render_config() {
    resolve_certificate
    sed \
        -e "s|__LISTEN_PORT__|$START_PORT|g" \
        -e "s|__CERT_PATH__|$CERT_PATH|g" \
        -e "s|__KEY_PATH__|$KEY_PATH|g" \
        "$TEMPLATE" >"$OUTPUT"

    if ! nginx -t >/dev/null 2>&1; then
        echo "[server-config] nginx config test failed" >&2
        nginx -t >&2 || true
        return 1
    fi
}

state_hash() {
    {
        [ -f "$SETTINGS_FILE" ] && md5sum "$SETTINGS_FILE" || true
        [ -f "$UPLOADED_DIR/cert.pem" ] && md5sum "$UPLOADED_DIR/cert.pem" || true
        [ -f "$UPLOADED_DIR/key.pem" ] && md5sum "$UPLOADED_DIR/key.pem" || true
    } | md5sum | cut -d' ' -f1
}

START_PORT="$(read_port)"
if [ -z "$START_PORT" ] ||
    ! [ "$START_PORT" -ge 1 ] 2>/dev/null ||
    ! [ "$START_PORT" -le 65535 ] 2>/dev/null; then
    START_PORT=3000
fi

render_config

printf '{"port":%s,"startedAt":"%s"}\n' \
    "$START_PORT" \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >"$RUNTIME_FILE"

nginx -g 'daemon off;' &
NGINX_PID=$!

trap 'kill -TERM "$NGINX_PID" 2>/dev/null || true; wait "$NGINX_PID" 2>/dev/null || true; exit 0' TERM INT

echo "[server-config] HTTPS started on port $START_PORT"

LAST_HASH="$(state_hash)"

while sleep "$WATCH_INTERVAL"; do
    if ! kill -0 "$NGINX_PID" 2>/dev/null; then
        echo "[server-config] nginx exited" >&2
        exit 1
    fi

    CURRENT_HASH="$(state_hash)"
    if [ "$CURRENT_HASH" = "$LAST_HASH" ]; then
        continue
    fi

    echo "[server-config] certificate settings changed, reloading nginx"
    cp "$OUTPUT" "$OUTPUT.last" 2>/dev/null || true

    if render_config && nginx -s reload >/dev/null 2>&1; then
        LAST_HASH="$CURRENT_HASH"
        echo "[server-config] nginx reloaded"
    else
        echo "[server-config] reload failed, restoring previous config" >&2
        if [ -f "$OUTPUT.last" ]; then
            cp "$OUTPUT.last" "$OUTPUT"
            nginx -s reload >/dev/null 2>&1 || true
        fi
    fi
done
