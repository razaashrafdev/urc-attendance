# ZKTeco Attendance Sync Service

Local service that connects to ZKTeco biometric device and syncs attendance logs to the cloud database.

## Requirements

- Python 3.8+
- Network access to ZKTeco device (same LAN)
- Network access to cloud API

## Installation

```bash
cd local-sync-service
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your configuration
```

## Configuration

Edit the `.env` file:

```env
ZKTECO_DEVICE_IP=192.168.1.201    # Your device IP
ZKTECO_DEVICE_PORT=4370           # Device port (usually 4370)
SYNC_INTERVAL_MINUTES=15          # How often to sync (daemon mode)
```

## Usage

### List Device Users (for employee mapping)

```bash
python sync_attendance.py --list-users
```

This shows all users registered on the device. Use these IDs when adding employees in the web app.

### Run Once

```bash
python sync_attendance.py
```

### Run as Daemon (Recommended)

```bash
python sync_attendance.py --daemon
```

This will:
- Run an immediate sync on startup
- Continue syncing every 15 minutes (configurable)
- Log all activity to `sync_attendance.log`

### Run as System Service (Linux)

Create `/etc/systemd/system/attendance-sync.service`:

```ini
[Unit]
Description=ZKTeco Attendance Sync Service
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/local-sync-service
ExecStart=/usr/bin/python3 sync_attendance.py --daemon
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable attendance-sync
sudo systemctl start attendance-sync
```

### Windows Task Scheduler

Create a scheduled task to run `python sync_attendance.py` every 15 minutes.

## How It Works

1. Connects to ZKTeco device via TCP/IP
2. Fetches attendance logs from the last 7 days
3. Pushes logs to the cloud API
4. API processes logs:
   - Maps device_user_id to employee records
   - Prevents duplicate entries
   - Calculates check-in/check-out times
   - Updates daily attendance records

## Troubleshooting

### Cannot connect to device

- Verify device IP is correct
- Ensure device is on the same network
- Check firewall rules (port 4370)
- Try pinging the device

### Logs not syncing

- Check `sync_attendance.log` for errors
- Verify employees are mapped with correct device_user_id
- Ensure API credentials are correct

### Missing punches

- Increase sync frequency
- Check device memory isn't full
