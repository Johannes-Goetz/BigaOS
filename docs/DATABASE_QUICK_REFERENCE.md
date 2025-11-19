# Database Quick Reference

## Quick Start

### Local Development
```bash
cd server
npm install    # Installs SQLite and dependencies
npm run dev    # Starts server (database auto-created)
```

Database created at: `server/data/bigaos.db`

### Raspberry Pi Installation
```bash
# One-command setup:
./setup-raspberry-pi.sh

# Then manage with systemd:
sudo systemctl start bigaos
sudo systemctl status bigaos
sudo journalctl -u bigaos -f
```

## API Quick Reference

### Base URL
- Local: `http://localhost:3000/api`
- Raspberry Pi: `http://<pi-ip>:3000/api`

### Database Endpoints

#### Get Statistics
```bash
curl http://localhost:3000/api/database/stats
```

#### Settings
```bash
# Get all settings
curl http://localhost:3000/api/database/settings

# Update a setting
curl -X PUT http://localhost:3000/api/database/settings \
  -H "Content-Type: application/json" \
  -d '{"key":"data_retention_days","value":"60"}'
```

#### Events
```bash
# Get unacknowledged events
curl http://localhost:3000/api/database/events?acknowledged=false

# Acknowledge event
curl -X POST http://localhost:3000/api/database/events/1/acknowledge
```

#### Maintenance Log
```bash
# Get pending maintenance
curl http://localhost:3000/api/database/maintenance?status=pending

# Add maintenance item
curl -X POST http://localhost:3000/api/database/maintenance \
  -H "Content-Type: application/json" \
  -d '{
    "item": "Engine oil change",
    "description": "Replace engine oil and filter",
    "category": "engine",
    "dueDate": "2025-12-01"
  }'

# Mark as completed
curl -X PUT http://localhost:3000/api/database/maintenance/1 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed",
    "completedDate": "2025-11-19",
    "notes": "Used synthetic 10W-40"
  }'
```

#### Trip Log
```bash
# Start a trip
curl -X POST http://localhost:3000/api/database/trips/start \
  -H "Content-Type: application/json" \
  -d '{
    "startLocation": "Marina Bay",
    "startLat": 37.8,
    "startLon": -122.4,
    "crew": ["John", "Jane"]
  }'

# End a trip (returns trip ID, e.g., 1)
curl -X POST http://localhost:3000/api/database/trips/1/end \
  -H "Content-Type: application/json" \
  -d '{
    "endLocation": "Harbor Point",
    "endLat": 37.9,
    "endLon": -122.5,
    "distanceNm": 15.5,
    "maxSpeedKt": 6.5,
    "avgSpeedKt": 4.2,
    "notes": "Beautiful day, light winds",
    "weatherSummary": "15kt NW winds, sunny"
  }'

# Get trip history
curl http://localhost:3000/api/database/trips?limit=20
```

## SQLite CLI Commands

### Open Database
```bash
sqlite3 ~/BigaOS/server/data/bigaos.db
```

### Useful Commands
```sql
-- List tables
.tables

-- Show schema
.schema

-- View state history
SELECT * FROM state_history ORDER BY timestamp DESC LIMIT 10;

-- View unacknowledged events
SELECT * FROM events WHERE acknowledged = 0 ORDER BY timestamp DESC;

-- View pending maintenance
SELECT * FROM maintenance_log WHERE status = 'pending' ORDER BY due_date;

-- View recent trips
SELECT * FROM trip_log ORDER BY start_time DESC LIMIT 5;

-- Get database size
SELECT page_count * page_size / 1024.0 / 1024.0 as size_mb
FROM pragma_page_count(), pragma_page_size();

-- Exit
.quit
```

## Common Tasks

### Backup Database
```bash
# Create backup
cp ~/BigaOS/server/data/bigaos.db ~/backup-$(date +%Y%m%d).db

# Copy to another machine
scp pi@raspberrypi:~/BigaOS/server/data/bigaos.db ./backup.db
```

### Restore Database
```bash
sudo systemctl stop bigaos
cp ~/backup.db ~/BigaOS/server/data/bigaos.db
sudo systemctl start bigaos
```

### Clean Old Data
```bash
# Via API (keeps last 30 days)
curl -X POST http://localhost:3000/api/database/cleanup \
  -H "Content-Type: application/json" \
  -d '{"days": 30}'

# Via SQL
sqlite3 ~/BigaOS/server/data/bigaos.db
DELETE FROM sensor_data WHERE timestamp < datetime('now', '-30 days');
VACUUM;
.quit
```

### Check Database Health
```bash
# Via API
curl http://localhost:3000/health

# Via SQLite
sqlite3 ~/BigaOS/server/data/bigaos.db "PRAGMA integrity_check;"
```

## Raspberry Pi Service Commands

```bash
# Start service
sudo systemctl start bigaos

# Stop service
sudo systemctl stop bigaos

# Restart service
sudo systemctl restart bigaos

# Check status
sudo systemctl status bigaos

# View logs (follow mode)
sudo journalctl -u bigaos -f

# View logs (last 100 lines)
sudo journalctl -u bigaos -n 100

# Enable auto-start on boot
sudo systemctl enable bigaos

# Disable auto-start
sudo systemctl disable bigaos
```

## Troubleshooting

### Database Locked
```bash
# Check what's using the database
sudo lsof ~/BigaOS/server/data/bigaos.db

# Stop service and restart
sudo systemctl restart bigaos
```

### Permission Issues
```bash
# Fix ownership (replace 'pi' with your username)
sudo chown -R pi:pi ~/BigaOS/server/data/
chmod 755 ~/BigaOS/server/data/
chmod 644 ~/BigaOS/server/data/bigaos.db
```

### Reset Database
```bash
sudo systemctl stop bigaos
rm ~/BigaOS/server/data/bigaos.db
sudo systemctl start bigaos
# Database will be recreated automatically
```

### View Errors
```bash
# Real-time logs
sudo journalctl -u bigaos -f -p err

# All errors from today
sudo journalctl -u bigaos -S today -p err
```

## Database Schema Overview

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `state_history` | Boat state changes | state, reason, override_by, timestamp |
| `sensor_data` | Sensor readings | category, sensor_name, value, unit, timestamp |
| `events` | System notifications | type, category, message, acknowledged, timestamp |
| `settings` | System configuration | key, value, description |
| `maintenance_log` | Maintenance tasks | item, category, status, due_date |
| `trip_log` | Trip/passage records | start_location, end_location, distance_nm, duration_hours |

## Performance Tips

### Automatic Cleanup Cron Job
```bash
crontab -e
# Add this line to clean data nightly at 2 AM:
0 2 * * * curl -X POST http://localhost:3000/api/database/cleanup -d '{"days":30}' -H "Content-Type: application/json" > /dev/null 2>&1
```

### Monitor Database Size
```bash
# Add to crontab to monitor weekly
0 0 * * 0 du -h ~/BigaOS/server/data/bigaos.db | mail -s "BigaOS DB Size" your@email.com
```

## File Locations

| Item | Location |
|------|----------|
| Database file | `~/BigaOS/server/data/bigaos.db` |
| Environment config | `~/BigaOS/server/.env` |
| Server logs | `sudo journalctl -u bigaos` |
| Service file | `/etc/systemd/system/bigaos.service` |
| Schema definition | `~/BigaOS/server/src/database/schema.sql` |

## Support

- **Full Documentation**: See `docs/DATABASE_SETUP.md`
- **Health Check**: `http://localhost:3000/health`
- **API Docs**: Coming soon!
- **Logs**: `sudo journalctl -u bigaos -f`
