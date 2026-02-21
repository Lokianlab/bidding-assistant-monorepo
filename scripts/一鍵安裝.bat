@echo off
chcp 65001 >nul 2>nul
title Bidding Assistant - Setup

echo.
echo   ====================================
echo    Bidding Assistant - Setup
echo   ====================================
echo.
echo   This will install everything needed.
echo   If prompted to allow changes, click Yes.
echo.

REM -- Step 1: Git --
where git >nul 2>nul
if errorlevel 1 goto :install_git
echo   [OK] Git
goto :check_gh

:install_git
echo   Installing Git...
echo.
where winget >nul 2>nul
if errorlevel 1 goto :no_winget_git
winget install Git.Git -e --accept-package-agreements --accept-source-agreements
if errorlevel 1 goto :git_install_failed
echo.
echo   ========================================
echo    Git installed!
echo    Close this window and double-click
echo    this file again to continue.
echo   ========================================
echo.
pause
exit /b 0

:no_winget_git
echo   Please install Git manually:
echo     https://git-scm.com/download/win
echo   Then double-click this file again.
echo.
pause
exit /b 1

:git_install_failed
echo   Git install failed. Please install manually:
echo     https://git-scm.com/download/win
echo.
pause
exit /b 1

:check_gh
REM -- Step 2: GitHub CLI --
where gh >nul 2>nul
if errorlevel 1 goto :install_gh
echo   [OK] GitHub CLI
goto :check_auth

:install_gh
echo   Installing GitHub CLI...
where winget >nul 2>nul
if errorlevel 1 goto :no_winget_gh
winget install GitHub.cli -e --accept-package-agreements --accept-source-agreements
if errorlevel 1 goto :gh_install_failed
echo.
echo   ========================================
echo    GitHub CLI installed!
echo    Close this window and double-click
echo    this file again to continue.
echo   ========================================
echo.
pause
exit /b 0

:no_winget_gh
echo   Please install GitHub CLI manually:
echo     https://cli.github.com/
echo.
pause
exit /b 1

:gh_install_failed
echo   GitHub CLI install failed.
echo   Please install manually: https://cli.github.com/
echo.
pause
exit /b 1

:check_auth
REM -- Step 3: GitHub login --
gh auth status >nul 2>nul
if not errorlevel 1 goto :auth_ok

echo.
echo   ==========================================
echo    IMPORTANT: Log in with Jin's GitHub
echo    account! Other accounts won't work.
echo   ==========================================
echo.
gh auth login --web --git-protocol https
if errorlevel 1 goto :auth_failed
echo   [OK] GitHub login OK
goto :check_repo

:auth_ok
echo   [OK] GitHub logged in
goto :check_repo

:auth_failed
echo   Login failed. Please try again.
echo.
pause
exit /b 1

:check_repo
REM -- Step 4: Clone or update --
if exist "C:\dev\cc程式\.git" goto :repo_exists

echo   Downloading project...
if not exist "C:\dev" mkdir "C:\dev"
git clone "https://github.com/Lokianlab/bidding-assistant-monorepo.git" "C:\dev\cc程式"
if errorlevel 1 goto :clone_failed
echo   [OK] Download complete
goto :launch_setup

:repo_exists
echo   [OK] Project exists, updating...
cd /d "C:\dev\cc程式"
git pull origin main >nul 2>nul
goto :launch_setup

:clone_failed
echo.
echo   Download failed!
echo.
echo   Most likely: wrong GitHub account.
echo   Fix: run "gh auth logout" then try again
echo   with Jin's account.
echo.
pause
exit /b 1

:launch_setup
REM -- Step 5: Launch Git Bash --
if exist "C:\Program Files\Git\bin\bash.exe" goto :launch_64
if exist "C:\Program Files (x86)\Git\bin\bash.exe" goto :launch_32
goto :no_bash

:launch_64
echo.
echo   Opening setup window...
echo   Continue in the NEW black window.
echo.
timeout /t 3 >nul
start "" "C:\Program Files\Git\bin\bash.exe" --login -c "cd /c/dev/cc程式 && bash scripts/setup-new-machine.sh; echo; read -rp 'Press Enter to close...'"
exit /b 0

:launch_32
echo.
echo   Opening setup window...
timeout /t 3 >nul
start "" "C:\Program Files (x86)\Git\bin\bash.exe" --login -c "cd /c/dev/cc程式 && bash scripts/setup-new-machine.sh; echo; read -rp 'Press Enter to close...'"
exit /b 0

:no_bash
echo   Git Bash not found.
echo   Reinstall Git: https://git-scm.com/download/win
echo.
pause
exit /b 1
