# This script initializes Let's Encrypt certificates for your domain
# Run this script before starting docker-compose for the first time

$domains = @("hackthevalley.duckdns.org")
$email = "your-email@example.com" # Replace with your email
$staging = 0 # Set to 1 for testing to avoid rate limits

Write-Host "### Initializing Let's Encrypt for $($domains[0]) ..."

# Check if certificates already exist
if (Test-Path "certbot_data\conf\live\$($domains[0])") {
    $decision = Read-Host "Existing certificates found. Do you want to continue and replace them? (y/N)"
    if ($decision -ne "Y" -and $decision -ne "y") {
        exit
    }
}

# Create directory for certbot challenge files
New-Item -ItemType Directory -Force -Path "certbot_data\www" | Out-Null

# Download recommended TLS parameters if they don't exist
if (!(Test-Path "certbot_data\conf\options-ssl-nginx.conf") -or !(Test-Path "certbot_data\conf\ssl-dhparams.pem")) {
    Write-Host "### Downloading recommended TLS parameters ..."
    New-Item -ItemType Directory -Force -Path "certbot_data\conf" | Out-Null
    Invoke-WebRequest -Uri "https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf" -OutFile "certbot_data\conf\options-ssl-nginx.conf"
    Invoke-WebRequest -Uri "https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem" -OutFile "certbot_data\conf\ssl-dhparams.pem"
    Write-Host ""
}

# Create dummy certificate to allow nginx to start
Write-Host "### Creating dummy certificate for $($domains[0]) ..."
$path = "/etc/letsencrypt/live/$($domains[0])"
New-Item -ItemType Directory -Force -Path "certbot_data\conf\live\$($domains[0])" | Out-Null

$currentDir = (Get-Location).Path.Replace('\', '/')
docker run --rm --entrypoint "" `
    -v "${currentDir}/certbot_data/conf:/etc/letsencrypt" `
    certbot/certbot sh -c "openssl req -x509 -nodes -newkey rsa:4096 -days 1 -keyout '$path/privkey.pem' -out '$path/fullchain.pem' -subj '/CN=localhost' && cp '$path/fullchain.pem' '$path/chain.pem'"

Write-Host ""

# Start nginx with dummy certificate
Write-Host "### Starting nginx ..."
docker-compose up -d frontend
Write-Host ""

# Wait for nginx to start
Write-Host "### Waiting for nginx to start ..."
Start-Sleep -Seconds 5
Write-Host ""

# Delete dummy certificate
Write-Host "### Deleting dummy certificate for $($domains[0]) ..."
docker run --rm --entrypoint "" `
    -v "${currentDir}/certbot_data/conf:/etc/letsencrypt" `
    certbot/certbot sh -c "rm -rf /etc/letsencrypt/live/$($domains[0]) && rm -rf /etc/letsencrypt/archive/$($domains[0]) && rm -rf /etc/letsencrypt/renewal/$($domains[0]).conf"

Write-Host ""

# Request Let's Encrypt certificate
Write-Host "### Requesting Let's Encrypt certificate for $($domains[0]) ..."
$domainArgs = ""
foreach ($domain in $domains) {
    $domainArgs += "-d $domain "
}

# Select appropriate email arg
if ($email -eq "" -or $email -eq "your-email@example.com") {
    $emailArg = "--register-unsafely-without-email"
    Write-Host "WARNING: No email provided. You won't receive expiration notifications!"
} else {
    $emailArg = "--email $email"
}

# Enable staging mode if needed
$stagingArg = ""
if ($staging -ne 0) {
    $stagingArg = "--staging"
    Write-Host "### Running in STAGING mode (test certificates) ###"
}

docker run --rm --name certbot `
    -v "${currentDir}/certbot_data/conf:/etc/letsencrypt" `
    -v "${currentDir}/certbot_data/www:/var/www/certbot" `
    certbot/certbot certonly --webroot -w /var/www/certbot `
    $stagingArg `
    $emailArg `
    $domainArgs `
    --rsa-key-size 4096 `
    --agree-tos `
    --force-renewal `
    --non-interactive

Write-Host ""
Write-Host "### Reloading nginx ..."
docker-compose exec frontend nginx -s reload
Write-Host ""

Write-Host "### Certificate setup complete!"
Write-Host "Your site should now be accessible with a valid SSL certificate at https://$($domains[0])"
