# kildonan Bot

A Telegram bot for the McKinlays

## Quick Start

### Prerequisites

- Node.js 16+ installed
- A Telegram bot token (see setup below)
- A Notion API token (see setup below)

### 1. Get Your Tokens

**Telegram Token:**

1. Open Telegram and search for **@BotFather**
2. Send `/start` then `/newbot`
3. Follow the prompts to create your bot
4. Copy the token you receive

**Notion Token:**

1. Go to https://www.notion.so/my-integrations
2. Click "Create new integration"
3. Give it a name and create
4. Copy the token
5. Share your Notion page with this integration

### 2. Configure Environment

Copy `.env.sample` to `.env` and fill in your tokens:

```bash
cp .env.sample .env
# Edit .env with your actual tokens
```

Or set environment variables:

```bash
export TELEGRAM_BOT_TOKEN="your_token"
export NOTION_TOKEN="your_token"
```

### 3. Install & Run

```bash
# Install dependencies
npm install

# Run locally (development)
npm run telegram:dev

# Or run in the background (see deployment section)
```

## Deployment

### Option 1: Systemd Service (Recommended for Raspbian)

Run the bot as a system service that starts automatically on boot.

**Steps:**

1. **SSH into your Raspberry Pi:**

   ```bash
   ssh pi@your-pi-ip
   ```

2. **Install Node.js (if not already installed):**

   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Clone or copy your code:**

   ```bash
   git clone https://github.com/AlMcKinlay/McLab.git ~/McLab
   cd ~/McLab/telegram-bot
   npm install
   ```

4. **Create `.env` file with your tokens:**

   ```bash
   cp .env.sample .env
   nano .env  # Edit with your actual tokens
   ```

5. **Create systemd service:**

   ```bash
   sudo tee /etc/systemd/system/kildonan-bot.service > /dev/null << 'EOF'
   [Unit]
   Description=Kildonan Telegram Bot
   After=network.target

   [Service]
   Type=simple
   User=pi
   WorkingDirectory=/home/pi/McLab/telegram-bot
   EnvironmentFile=/home/pi/McLab/telegram-bot/.env
   ExecStart=/usr/bin/node index.js
   Restart=always
   RestartSec=10
   StandardOutput=journal
   StandardError=journal

   [Install]
   WantedBy=multi-user.target
   EOF
   ```

6. **Enable and start the service:**

   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable kildonan-bot
   sudo systemctl start kildonan-bot
   ```

7. **Check status:**
   ```bash
   sudo systemctl status kildonan-bot
   sudo journalctl -u kildonan-bot -f  # Follow logs
   ```

### Option 2: PM2 (Process Manager)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start the bot
pm2 start index.js --name kildonan-bot --env-file .env

# Set to start on boot
pm2 startup
pm2 save

# Check status
pm2 status
pm2 logs kildonan-bot
```

### Option 3: Docker

If you have Docker installed, you can containerize the bot.

Run with:

```bash
docker build -t kildonan-bot .
docker run -d --restart always \
  -e TELEGRAM_BOT_TOKEN=your_token \
  -e NOTION_TOKEN=your_token \
  --name kildonan-bot kildonan-bot
```

## Usage

Once running, the bot responds to:

- `/nathan` - Shows rating buttons (Good 😊 / OK 😐 / Bad 😞)
- `/help` - Shows available commands
- 📊 Button - Quick access to rate your day

Click a rating button and the bot will:

1. Check if today's already rated
2. Ask for confirmation if needed
3. Update your Notion page
4. Confirm the update

## Commands Available

- `/nathan` - Rate today's day
- `/help` - Show help message
- `/start` - Show welcome message

## Monitoring

### Check if bot is running

**With systemd:**

```bash
sudo systemctl status kildonan-bot
sudo journalctl -u kildonan-bot -n 50  # Last 50 lines
sudo journalctl -u kildonan-bot -f     # Follow in real-time
```

**With PM2:**

```bash
pm2 status
pm2 logs kildonan-bot
```

### Common Issues

**Bot not responding:**

- Check service is running: `sudo systemctl status kildonan-bot`
- Check logs: `sudo journalctl -u kildonan-bot -f`
- Verify `TELEGRAM_BOT_TOKEN` is correct in `.env`
- Verify internet connectivity on your system

**Notion not updating:**

- Check `NOTION_TOKEN` is correct in `.env`
- Verify bot integration has access to your Notion page
- Check logs for specific error message
- Ensure your Notion table has today's date as a column header

**Service won't start:**

- Check Node.js is installed: `node --version`
- Check file permissions: `ls -la ~/McLab/telegram-bot/`
- Check for syntax errors: `node ~/McLab/telegram-bot/index.js`
- Check `.env` file exists and has correct format

## Development

See `../../README.md` for full project structure.

## License

MIT
