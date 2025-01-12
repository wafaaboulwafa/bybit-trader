#!/bin/bash

SERVICE_NAME="bybit-trader"

echo "Starting the service: $SERVICE_NAME"

sudo systemctl enable "$SERVICE_NAME" || { echo "Failed to install service $SERVICE_NAME. Exiting."; exit 1; }
sudo systemctl start "$SERVICE_NAME" || { echo "Failed to start service $SERVICE_NAME. Exiting."; exit 1; }

sudo journalctl -u "$SERVICE_NAME" -f