#!/bin/bash

SERVICE_NAME="bybit-trader"

echo "Stop the service: $SERVICE_NAME"

sudo systemctl stop "$SERVICE_NAME" || { echo "Failed to install service $SERVICE_NAME. Exiting."; exit 1; }
sudo systemctl disable "$SERVICE_NAME" || { echo "Failed to start service $SERVICE_NAME. Exiting."; exit 1; }
