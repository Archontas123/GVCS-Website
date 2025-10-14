#!/bin/bash
# DuckDNS Auto-Update Setup Script
# Run this on your Hetzner VPS

set -e

echo "=== DuckDNS Setup ==="

# Create duckdns directory
mkdir -p ~/duckdns
cd ~/duckdns

# Create update script
cat > duck.sh << 'EOF'
echo url="https://www.duckdns.org/update?domains=hackthevalley&token=5ae5c5e9-303d-42a1-b5c9-547d7c2bf698&ip=" | curl -k -o ~/duckdns/duck.log -K -
EOF

# Make executable
chmod 700 duck.sh

echo "Testing DuckDNS update..."
./duck.sh

# Check result
if grep -q "OK" duck.log; then
    echo "✓ DuckDNS update successful!"
else
    echo "✗ DuckDNS update failed. Check duck.log"
    cat duck.log
    exit 1
fi

# Add to crontab (runs every 5 minutes)
(crontab -l 2>/dev/null | grep -v "duckdns/duck.sh"; echo "*/5 * * * * ~/duckdns/duck.sh >/dev/null 2>&1") | crontab -

echo "✓ DuckDNS auto-update configured (runs every 5 minutes)"
echo "✓ Domain: hackthevalley.duckdns.org"
echo ""
echo "You can check the status anytime with: cat ~/duckdns/duck.log"
