#!/bin/bash
# MacArthur HAT System Cleanup
# Runs with sudo during plugin uninstall.
# Removes system-level changes made by setup.sh.

set -e

BOOT_CONFIG="/boot/firmware/config.txt"

# Fallback for older Raspberry Pi OS
if [ ! -f "$BOOT_CONFIG" ]; then
  BOOT_CONFIG="/boot/config.txt"
fi

# ── Remove i2c-dev auto-load ─────────────────────────────
if [ -f /etc/modules-load.d/i2c-dev.conf ]; then
  rm -f /etc/modules-load.d/i2c-dev.conf
  echo "Removed i2c-dev auto-load config"
fi

# ── Remove CAN systemd service ───────────────────────────
SERVICE_FILE="/etc/systemd/system/can0.service"
if [ -f "$SERVICE_FILE" ]; then
  systemctl stop can0.service 2>/dev/null || true
  systemctl disable can0.service 2>/dev/null || true
  rm -f "$SERVICE_FILE"
  systemctl daemon-reload
  echo "Removed can0.service"
fi

# ── Remove boot config entries added by setup.sh ─────────
if [ -f "$BOOT_CONFIG" ]; then
  # Remove MacArthur HAT comment lines and their config lines
  sed -i '/^# MacArthur HAT/d' "$BOOT_CONFIG"
  # Remove the CAN overlay we added
  sed -i '/^dtoverlay=mcp251xfd,spi0-1/d' "$BOOT_CONFIG"
  echo "Cleaned boot config entries"
fi

# Note: we intentionally do NOT remove:
# - build-essential, python3 (shared build tools, other things may need them)
# - can-utils, i2c-tools (small diagnostic tools, harmless to keep)
# - dtparam=spi=on, dtparam=i2c_arm=on (other hardware may use these)

echo "UNINSTALL_COMPLETE"
