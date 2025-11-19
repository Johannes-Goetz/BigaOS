# Database Setup Guide

## Overview

Biga OS uses **SQLite** as its database - a lightweight, serverless, and zero-configuration database engine that's perfect for embedded systems like the Raspberry Pi.

### Why SQLite?

- **No server needed**: File-based database (single .db file)
- **Zero configuration**: Works out of the box
- **Lightweight**: Perfect for Raspberry Pi
- **Reliable**: Used by billions of devices worldwide
- **ACID compliant**: Reliable and crash-resistant

## Database Schema

The database includes the following tables:

### State History
Tracks all boat state changes (Anchored, Sailing, Motoring, etc.)

### Sensor Data
Stores historical sensor readings with timestamps

### Events/Notifications
System events and notifications (warnings, errors, info)

### Settings
Key-value store for system configuration

### Maintenance Log
Track maintenance tasks and schedules

### Trip Log
Record trips, passages, and logbook entries

## Local Development Setup

### 1. Install Dependencies

```bash
cd server
npm install
```

This will install `better-sqlite3` and all other required packages.

### 2. Start the Server

```bash
npm run dev
```

The database will be automatically created at `server/data/bigaos.db` on first run.

### 3. Verify Database

Check the health endpoint to see database statistics:

```bash
curl http://localhost:3000/health
```

## API Endpoints

### Database Statistics
```
GET /api/database/stats
```
Returns database statistics (record counts, size, etc.)

### Settings Management
```
GET /api/database/settings
PUT /api/database/settings
Body: { "key": "setting_name", "value": "setting_value", "description": "..." }
```

### Events/Notifications
```
GET /api/database/events?limit=100&acknowledged=false
POST /api/database/events/:id/acknowledge
```

### Maintenance Log
```
GET /api/database/maintenance?status=pending
POST /api/database/maintenance
Body: { "item": "Engine oil change", "description": "...", "category": "engine", "dueDate": "2025-12-01" }

PUT /api/database/maintenance/:id
Body: { "status": "completed", "completedDate": "2025-11-19", "notes": "..." }
```

### Trip Log / Logbook
```
GET /api/database/trips?limit=50

POST /api/database/trips/start
Body: { "startLocation": "Marina", "startLat": 37.8, "startLon": -122.4, "crew": ["John", "Jane"] }

POST /api/database/trips/:id/end
Body: {
  "endLocation": "Harbor",
  "endLat": 37.9,
  "endLon": -122.5,
  "distanceNm": 15.5,
  "maxSpeedKt": 6.5,
  "avgSpeedKt": 4.2,
  "notes": "Great sail!",
  "weatherSummary": "Light winds, sunny"
}
```

### Data Cleanup
```
POST /api/database/cleanup
Body: { "days": 30 }
```
Removes sensor data older than specified days.

## Raspberry Pi Setup

### Automated Installation

Run the setup script:

```bash
curl -o setup-raspberry-pi.sh https://your-repo/setup-raspberry-pi.sh
chmod +x setup-raspberry-pi.sh
./setup-raspberry-pi.sh
```

Or if files are already on the Pi:

```bash
cd ~/BigaOS
chmod +x setup-raspberry-pi.sh
./setup-raspberry-pi.sh
```

The script will:
1. Update system packages
2. Install Node.js 20 LTS
3. Install build tools
4. Install application dependencies
5. Build the client
6. Create database directory
7. Create systemd service for auto-start

### Manual Installation

If you prefer to install manually:

#### 1. Install Node.js 20 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### 2. Install Build Tools

```bash
sudo apt-get install -y build-essential python3 git
```

#### 3. Copy Files to Raspberry Pi

```bash
# From your development machine
rsync -avz --exclude 'node_modules' --exclude '.git' ~/BigaOS/ pi@raspberrypi:~/BigaOS/
```

#### 4. Install Dependencies

```bash
cd ~/BigaOS/server
npm install --production

cd ~/BigaOS/client
npm install
npm run build
```

#### 5. Create Environment File

```bash
cd ~/BigaOS/server
cp .env.example .env
```

Edit `.env` if needed (defaults work fine).

#### 6. Create Systemd Service

```bash
sudo nano /etc/systemd/system/bigaos.service
```

Add this content:

```ini
[Unit]
Description=Biga OS - Intelligent Boat Automation System
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/BigaOS/server
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=bigaos

[Install]
WantedBy=multi-user.target
```

#### 7. Enable and Start Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable bigaos
sudo systemctl start bigaos
```

### Verify Installation

Check service status:
```bash
sudo systemctl status bigaos
```

View logs:
```bash
sudo journalctl -u bigaos -f
```

Access web interface:
```
http://<raspberry-pi-ip>:3000
```

## Database Management

### Backup Database

```bash
# On Raspberry Pi
cp ~/BigaOS/server/data/bigaos.db ~/bigaos-backup-$(date +%Y%m%d).db
```

Or copy to another machine:
```bash
scp pi@raspberrypi:~/BigaOS/server/data/bigaos.db ./bigaos-backup.db
```

### Restore Database

```bash
# Stop the service first
sudo systemctl stop bigaos

# Restore backup
cp ~/bigaos-backup-20250119.db ~/BigaOS/server/data/bigaos.db

# Start service
sudo systemctl start bigaos
```

### View Database Contents

```bash
# Install SQLite CLI
sudo apt-get install sqlite3

# Open database
sqlite3 ~/BigaOS/server/data/bigaos.db

# SQLite commands:
.tables              # List all tables
.schema              # Show schema
SELECT * FROM state_history LIMIT 10;
SELECT * FROM events WHERE acknowledged = 0;
.quit                # Exit
```

### Database Size and Cleanup

Check database size:
```bash
du -h ~/BigaOS/server/data/bigaos.db
```

Clean up old data via API:
```bash
curl -X POST http://localhost:3000/api/database/cleanup \
  -H "Content-Type: application/json" \
  -d '{"days": 30}'
```

Or manually with SQL:
```bash
sqlite3 ~/BigaOS/server/data/bigaos.db
DELETE FROM sensor_data WHERE timestamp < datetime('now', '-30 days');
VACUUM;  -- Reclaim space
.quit
```

## Troubleshooting

### Database Locked Error

SQLite uses file locks. If you get "database is locked":

1. Make sure only one instance of the server is running
2. Close any open SQLite CLI connections
3. Check file permissions:
   ```bash
   ls -la ~/BigaOS/server/data/
   ```

### Permission Denied

Fix ownership:
```bash
sudo chown -R pi:pi ~/BigaOS/server/data/
chmod 755 ~/BigaOS/server/data/
chmod 644 ~/BigaOS/server/data/bigaos.db
```

### Database Corrupted

SQLite is very robust, but if corruption occurs:

1. Restore from backup (see Backup section)
2. Or try integrity check:
   ```bash
   sqlite3 ~/BigaOS/server/data/bigaos.db
   PRAGMA integrity_check;
   ```

### Reset Database

To start fresh:

```bash
sudo systemctl stop bigaos
rm ~/BigaOS/server/data/bigaos.db
sudo systemctl start bigaos
```

The database will be recreated with fresh schema on startup.

## Performance Tips

### For Raspberry Pi

1. **Use WAL mode** (already enabled):
   - Better concurrency
   - Faster writes
   - Automatic in our implementation

2. **Regular cleanup**:
   - Set up a cron job to clean old data:
     ```bash
     crontab -e
     # Add:
     0 2 * * * curl -X POST http://localhost:3000/api/database/cleanup -d '{"days":30}' -H "Content-Type: application/json"
     ```

3. **SD Card health**:
   - Use a quality SD card
   - Enable log2ram to reduce writes (optional):
     ```bash
     sudo apt-get install log2ram
     ```

## Additional Resources

- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [better-sqlite3 Library](https://github.com/WiseLibs/better-sqlite3)
- [Raspberry Pi OS Documentation](https://www.raspberrypi.org/documentation/)

## Support

For issues or questions:
1. Check logs: `sudo journalctl -u bigaos -f`
2. Check health endpoint: `curl http://localhost:3000/health`
3. Verify database: `sqlite3 ~/BigaOS/server/data/bigaos.db .tables`
