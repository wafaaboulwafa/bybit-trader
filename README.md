# Bybit Trading Bot - Service Installation and Management

This guide provides instructions for installing, configuring, and managing the Bybit Trading Bot as a systemd service on Ubuntu Linux. It includes steps for installation, starting, stopping, and uninstalling the service, as well as setting up a health check timer to ensure the bot is running smoothly.

---

## Prerequisites

- Ubuntu Linux (20.04 or later)
- Node.js (v16+)
- NPM
- Git (optional, for cloning)

---

## 1. Installation

### Clone the Repository
```bash
cd /opt
sudo git clone https://github.com/yourusername/bybit-trading-bot.git
cd bybit-trading-bot
```

---

### Install Dependencies
```bash
sudo npm install
```

---

### Configure Environment Variables
Create a `.env` file in the root directory:

```bash
sudo nano .env
```

Add the following:
```
BYBIT_API_KEY=your_bybit_api_key
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_chat_id
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_password
TRADE_PAIRS=XAUUSD,BTCUSDT,ETHUSDT
```

Save and exit (CTRL + O, CTRL + X).

---

## 2. Create a Systemd Service

### Create Service File
```bash
sudo nano /etc/systemd/system/bybit-bot.service
```

Add the following configuration:
```ini
[Unit]
Description=Bybit Trading Bot
After=network.target

[Service]
ExecStart=/usr/bin/node /opt/bybit-trading-bot/index.js
WorkingDirectory=/opt/bybit-trading-bot
Restart=always
User=root
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Save and exit.

---

### Reload Systemd and Enable Service
```bash
sudo systemctl daemon-reload
sudo systemctl enable bybit-bot
sudo systemctl start bybit-bot
```

---

## 3. Health Check Timer Setup

### Create Timer Unit
```bash
sudo nano /etc/systemd/system/bybit-bot-health.timer
```

Add the following:
```ini
[Unit]
Description=Health Check Timer for Bybit Bot

[Timer]
OnBootSec=1min
OnUnitActiveSec=5min
Unit=bybit-bot-health.service

[Install]
WantedBy=timers.target
```

---

### Create Health Check Service
```bash
sudo nano /etc/systemd/system/bybit-bot-health.service
```

Add:
```ini
[Unit]
Description=Health Check for Bybit Bot

[Service]
ExecStart=/bin/bash -c 'systemctl is-active --quiet bybit-bot || systemctl restart bybit-bot'
```

---

### Enable and Start Timer
```bash
sudo systemctl daemon-reload
sudo systemctl enable bybit-bot-health.timer
sudo systemctl start bybit-bot-health.timer
```

---

## 4. Managing the Service

### Start Service
```bash
sudo systemctl start bybit-bot
```

---

### Stop Service
```bash
sudo systemctl stop bybit-bot
```

---

### Restart Service
```bash
sudo systemctl restart bybit-bot
```

---

### Check Service Status
```bash
sudo systemctl status bybit-bot
```

---

## 5. Uninstall the Service

### Stop and Disable Service
```bash
sudo systemctl stop bybit-bot
sudo systemctl disable bybit-bot
```

---

### Remove Files
```bash
sudo rm /etc/systemd/system/bybit-bot.service
sudo rm -r /opt/bybit-trading-bot
```

---

### Remove Health Check Timer
```bash
sudo systemctl stop bybit-bot-health.timer
sudo systemctl disable bybit-bot-health.timer
sudo rm /etc/systemd/system/bybit-bot-health.timer
sudo rm /etc/systemd/system/bybit-bot-health.service
```

---

### Reload Systemd
```bash
sudo systemctl daemon-reload
```

---

## 6. Verify Uninstallation
```bash
systemctl list-units | grep bybit-bot
```

If no output appears, the service has been successfully uninstalled.

---

### Notes
- Ensure to regularly monitor logs:
```bash
sudo journalctl -u bybit-bot -f
```
- Update bot by pulling changes from GitHub and restarting the service.

