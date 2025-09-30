@echo off
echo Starting Go backend with Air (Hot Reload + Debug)...
echo.
echo Commands available:
echo - Ctrl+C to stop
echo - Files will auto-reload on changes
echo.
cd backend
air -c .air.toml
pause