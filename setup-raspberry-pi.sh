#!/bin/bash
# Biga OS - Raspberry Pi Setup Script
# This script installs and configures Biga OS on a Raspberry Pi 5

set -e  # Exit on error

echo "╔════════════════════════════════════════╗"
echo "║   Biga OS - Raspberry Pi Setup        ║"
echo "║   Intelligent Boat Automation System   ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running on Raspberry Pi
if [ ! -f /proc/device-tree/model ] || ! grep -q "Raspberry Pi" /proc/device-tree/model; then
    print_warn "This script is designed for Raspberry Pi. Continuing anyway..."
fi

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Please do not run this script as root. Use a regular user with sudo access."
    exit 1
fi

print_info "Starting Biga OS installation..."
echo ""

# ============================================
# Step 1: System Update
# ============================================
print_info "Step 1/7: Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# ============================================
# Step 2: Install Node.js 20 LTS
# ============================================
print_info "Step 2/7: Installing Node.js 20 LTS..."

# Check if Node.js is already installed
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    print_info "Node.js $NODE_VERSION is already installed"
else
    # Install Node.js 20.x
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    print_info "Node.js $(node -v) installed successfully"
fi

# ============================================
# Step 3: Install build tools
# ============================================
print_info "Step 3/7: Installing build tools..."
sudo apt-get install -y build-essential python3 git

# ============================================
# Step 4: Clone or update repository
# ============================================
print_info "Step 4/7: Setting up Biga OS application..."

INSTALL_DIR="$HOME/BigaOS"

if [ -d "$INSTALL_DIR" ]; then
    print_warn "Directory $INSTALL_DIR already exists. Updating..."
    cd "$INSTALL_DIR"
    git pull || print_warn "Could not update repository. Continuing with existing files..."
else
    print_info "Cloning Biga OS repository..."
    # If you have a git repository, uncomment and update the line below:
    # git clone https://github.com/yourusername/BigaOS.git "$INSTALL_DIR"
    # For now, we assume files are already in place
    print_warn "Please ensure Biga OS files are in $INSTALL_DIR"
fi

cd "$INSTALL_DIR"

# ============================================
# Step 5: Install dependencies
# ============================================
print_info "Step 5/7: Installing application dependencies..."

# Install server dependencies
print_info "Installing server dependencies..."
cd "$INSTALL_DIR/server"
npm install --production

# Install client dependencies and build
print_info "Installing and building client..."
cd "$INSTALL_DIR/client"
npm install
npm run build

# ============================================
# Step 6: Setup environment and database
# ============================================
print_info "Step 6/7: Configuring application..."

# Create data directory
mkdir -p "$INSTALL_DIR/server/data"

# Create .env file if it doesn't exist
if [ ! -f "$INSTALL_DIR/server/.env" ]; then
    print_info "Creating .env file..."
    cat > "$INSTALL_DIR/server/.env" << 'EOF'
NODE_ENV=production
PORT=3000
WS_PORT=3001

# Database
DATABASE_PATH=./data/bigaos.db

# Logging
LOG_LEVEL=info
EOF
    print_info ".env file created"
else
    print_info ".env file already exists"
fi

# Initialize database
print_info "Initializing database..."
cd "$INSTALL_DIR/server"
npm run build || print_warn "Build failed, using existing build..."

# ============================================
# Step 7: Create systemd service
# ============================================
print_info "Step 7/7: Creating systemd service..."

sudo tee /etc/systemd/system/bigaos.service > /dev/null << EOF
[Unit]
Description=Biga OS - Intelligent Boat Automation System
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$INSTALL_DIR/server
Environment="NODE_ENV=production"
ExecStart=$(which node) dist/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=bigaos

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable bigaos

print_info "Systemd service created and enabled"

# ============================================
# Installation Complete
# ============================================
echo ""
echo "╔════════════════════════════════════════╗"
echo "║   Installation Complete! 🎉            ║"
echo "╚════════════════════════════════════════╝"
echo ""
print_info "Biga OS has been installed successfully!"
echo ""
echo "To start Biga OS:"
echo "  sudo systemctl start bigaos"
echo ""
echo "To check status:"
echo "  sudo systemctl status bigaos"
echo ""
echo "To view logs:"
echo "  sudo journalctl -u bigaos -f"
echo ""
echo "To access the web interface:"
echo "  http://$(hostname -I | awk '{print $1}'):3000"
echo ""
echo "To enable auto-start on boot (already enabled):"
echo "  sudo systemctl enable bigaos"
echo ""
print_info "Would you like to start Biga OS now? (y/n)"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    sudo systemctl start bigaos
    sleep 2
    sudo systemctl status bigaos
    echo ""
    print_info "Biga OS is now running!"
    print_info "Access it at: http://$(hostname -I | awk '{print $1}'):3000"
else
    print_info "You can start Biga OS later with: sudo systemctl start bigaos"
fi

echo ""
print_info "Happy sailing! ⛵"
