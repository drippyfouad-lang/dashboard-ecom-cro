@echo off
echo =====================================
echo Restoring Automatic DNS
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

echo Restoring automatic DNS for WiFi adapter...
powershell -Command "Set-DnsClientServerAddress -InterfaceAlias 'WiFi' -ResetServerAddresses"

echo.
echo Flushing DNS cache...
ipconfig /flushdns
powershell -Command "Clear-DnsClientCache"

echo.
echo =====================================
echo DNS Restored to Automatic!
echo =====================================
echo.
pause
