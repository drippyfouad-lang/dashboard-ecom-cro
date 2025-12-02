@echo off
echo =====================================
echo MongoDB DNS Fix - Setting Google DNS
echo =====================================
echo.

REM Check for administrator privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script must be run as Administrator!
    echo.
    echo Right-click this file and select "Run as administrator"
    echo.
    pause
    exit /b 1
)

echo Setting Google DNS for WiFi adapter...
powershell -Command "Set-DnsClientServerAddress -InterfaceAlias 'WiFi' -ServerAddresses ('8.8.8.8','8.8.4.4')"

echo.
echo Flushing DNS cache...
ipconfig /flushdns
powershell -Command "Clear-DnsClientCache"

echo.
echo =====================================
echo DNS Changed Successfully!
echo =====================================
echo.

echo Testing MongoDB Atlas DNS resolution...
echo.
nslookup cluster0.lllnxn0.mongodb.net 8.8.8.8

echo.
echo =====================================
echo Next Steps:
echo   1. Run: node test-db-connection.js
echo   2. Run: npm run dev
echo =====================================
echo.
pause
