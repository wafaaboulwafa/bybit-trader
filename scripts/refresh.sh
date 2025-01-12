#!/bin/bash

BRANCH="main"
SERVICE_NAME="bybit-trader"

sudo systemctl stop "$SERVICE_NAME" || { echo "Failed to install service $SERVICE_NAME. Exiting."; exit 1; }
sudo systemctl disable "$SERVICE_NAME" || { echo "Failed to start service $SERVICE_NAME. Exiting."; exit 1; }

# Fetch and pull the latest changes
echo "Fetching and pulling the latest changes from branch $BRANCH"

git fetch || { echo "Failed to fetch changes. Exiting."; exit 1; }
git checkout "$BRANCH" || { echo "Failed to checkout branch $BRANCH. Exiting."; exit 1; }
git pull origin "$BRANCH" || { echo "Failed to pull changes. Exiting."; exit 1; }

# Start the service
echo "Starting the service: $SERVICE_NAME"

sudo systemctl enable "$SERVICE_NAME" || { echo "Failed to install service $SERVICE_NAME. Exiting."; exit 1; }
sudo systemctl start "$SERVICE_NAME" || { echo "Failed to start service $SERVICE_NAME. Exiting."; exit 1; }

sudo journalctl -u "$SERVICE_NAME" -f
