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
sudo git clone https://github.com/wafaaboulwafa/bybit-trader
cd bybit-trading-bot
```

---

### Install Dependencies

```bash
sudo npm install
```

---

### Configure Environment Variables

Setup environment variables on system level

```bash
sudo nano /etc/environment
```

Add the following:

```
BYBIT_API_TESTNET=false
BYBIT_API_KEY=your_bybit_api_key
BYBIT_API_SECRET=your_bybit_api_secret
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_chat_id
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
ExecStart=/usr/bin/npm start
WorkingDirectory=/path/to/bybit-trader
Restart=always
RestartSec=10
User=bybit-user
Environment=NODE_ENV=production
LimitNOFILE=4096
StandardOutput=journal
StandardError=journal
#StandardOutput=append:/var/log/bybit-trader.log
#StandardError=append:/var/log/bybit-trader.log

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

### Notes

- Ensure to regularly monitor logs:

```bash
sudo journalctl -u bybit-bot -f
```

- Update bot by pulling changes from GitHub and restarting the service.
