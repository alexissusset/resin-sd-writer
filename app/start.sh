#!/bin/bash

export DBUS_SYSTEM_BUS_ADDRESS=unix:path=/host/run/dbus/system_bus_socket

# Enable i2c
modprobe i2c-dev || true

# Start SD card app
node /usr/src/app/index.js
