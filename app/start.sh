#!/bin/bash

if [[ -n "${SSH_PASSWD}" ]]; then
	#Set the root password
	echo "root:$SSH_PASSWD" | chpasswd
	#Spawn dropbear
	dropbear -E -F &
fi

export DBUS_SYSTEM_BUS_ADDRESS=unix:path=/host/run/dbus/system_bus_socket

# Enable i2c
modprobe i2c-dev || true

# Start SD card app
node /usr/src/app/index.js
