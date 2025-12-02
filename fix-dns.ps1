# MongoDB DNS Fix Script
# Run this as Administrator

Write-Host "=" -ForegroundColor Cyan
Write-Host "MongoDB Atlas DNS Fix Script" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    Write-Host ""
    pause
    exit 1
}

Write-Host "✅ Running as Administrator" -ForegroundColor Green
Write-Host ""

# Get active network adapters
Write-Host "🔍 Finding active network adapters..." -ForegroundColor Cyan
$adapters = Get-NetAdapter | Where-Object {$_.Status -eq "Up"}

if ($adapters.Count -eq 0) {
    Write-Host "❌ No active network adapters found!" -ForegroundColor Red
    pause
    exit 1
}

Write-Host "Found $($adapters.Count) active adapter(s):" -ForegroundColor Green
$adapters | ForEach-Object { Write-Host "   - $($_.Name) ($($_.InterfaceDescription))" }
Write-Host ""

# Ask user to select adapter if multiple
$selectedAdapter = $null
if ($adapters.Count -eq 1) {
    $selectedAdapter = $adapters[0]
    Write-Host "Using adapter: $($selectedAdapter.Name)" -ForegroundColor Green
} else {
    Write-Host "Select network adapter:" -ForegroundColor Yellow
    for ($i = 0; $i -lt $adapters.Count; $i++) {
        Write-Host "   [$($i + 1)] $($adapters[$i].Name) - $($adapters[$i].InterfaceDescription)"
    }
    Write-Host ""
    $selection = Read-Host "Enter number (1-$($adapters.Count))"
    $selectedAdapter = $adapters[[int]$selection - 1]
}

Write-Host ""
Write-Host "🔧 Current DNS Settings:" -ForegroundColor Cyan
$currentDNS = Get-DnsClientServerAddress -InterfaceAlias $selectedAdapter.Name -AddressFamily IPv4
Write-Host "   Current DNS: $($currentDNS.ServerAddresses -join ', ')" -ForegroundColor Yellow
Write-Host ""

# Ask user which DNS to use
Write-Host "Select DNS Provider:" -ForegroundColor Cyan
Write-Host "   [1] Google DNS (8.8.8.8, 8.8.4.4) - Recommended"
Write-Host "   [2] Cloudflare DNS (1.1.1.1, 1.0.0.1) - Faster in some regions"
Write-Host "   [3] Restore Automatic DNS"
Write-Host "   [4] Cancel"
Write-Host ""
$dnsChoice = Read-Host "Enter choice (1-4)"

switch ($dnsChoice) {
    "1" {
        Write-Host ""
        Write-Host "🔄 Setting Google DNS..." -ForegroundColor Cyan
        Set-DnsClientServerAddress -InterfaceAlias $selectedAdapter.Name -ServerAddresses ("8.8.8.8","8.8.4.4")
        Write-Host "✅ Google DNS configured!" -ForegroundColor Green
    }
    "2" {
        Write-Host ""
        Write-Host "🔄 Setting Cloudflare DNS..." -ForegroundColor Cyan
        Set-DnsClientServerAddress -InterfaceAlias $selectedAdapter.Name -ServerAddresses ("1.1.1.1","1.0.0.1")
        Write-Host "✅ Cloudflare DNS configured!" -ForegroundColor Green
    }
    "3" {
        Write-Host ""
        Write-Host "🔄 Restoring automatic DNS..." -ForegroundColor Cyan
        Set-DnsClientServerAddress -InterfaceAlias $selectedAdapter.Name -ResetServerAddresses
        Write-Host "✅ Automatic DNS restored!" -ForegroundColor Green
    }
    default {
        Write-Host ""
        Write-Host "❌ Cancelled" -ForegroundColor Yellow
        pause
        exit 0
    }
}

# Flush DNS cache
Write-Host ""
Write-Host "🔄 Flushing DNS cache..." -ForegroundColor Cyan
ipconfig /flushdns | Out-Null
Clear-DnsClientCache
Write-Host "✅ DNS cache cleared!" -ForegroundColor Green

# Test MongoDB Atlas DNS resolution
Write-Host ""
Write-Host "🧪 Testing MongoDB Atlas DNS resolution..." -ForegroundColor Cyan
Write-Host ""

try {
    $result = Resolve-DnsName -Name "cluster0.lllnxn0.mongodb.net" -ErrorAction Stop
    Write-Host "✅ SUCCESS! MongoDB Atlas DNS resolves to:" -ForegroundColor Green
    $result | Where-Object {$_.Type -eq "A"} | ForEach-Object {
        Write-Host "   - $($_.IPAddress)" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ DNS resolution still failing" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Try:" -ForegroundColor Yellow
    Write-Host "   - Wait 30 seconds and try again" -ForegroundColor Yellow
    Write-Host "   - Restart your network adapter" -ForegroundColor Yellow
    Write-Host "   - Use mobile hotspot instead" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "✅ DNS Configuration Complete!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Run: node test-db-connection.js" -ForegroundColor White
Write-Host "   2. Run: npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  To restore original DNS later, run this script and select option 3" -ForegroundColor Yellow
Write-Host ""
pause
