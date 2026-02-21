@echo off
chcp 65001 >nul 2>nul
title 全能標案助理 - 安裝程式

echo.
echo   ====================================
echo    全能標案助理 - 新機器安裝程式
echo   ====================================
echo.
echo   這個程式會自動安裝所有需要的東西。
echo   過程中可能會跳出「允許變更」的視窗，
echo   請都按「是」。
echo.

REM ── 第 1 步：檢查 Git ──
where git >nul 2>nul
if errorlevel 1 goto :install_git
echo   [OK] Git
goto :check_gh

:install_git
echo   需要先安裝 Git...
echo.
where winget >nul 2>nul
if errorlevel 1 goto :no_winget_git
echo   正在安裝 Git（需要 1-2 分鐘）...
winget install Git.Git -e --accept-package-agreements --accept-source-agreements
if errorlevel 1 goto :git_install_failed
echo.
echo   ========================================
echo    Git 安裝好了！
echo    請關掉這個視窗，重新雙擊此檔案繼續。
echo   ========================================
echo.
pause
exit /b 0

:no_winget_git
echo   自動安裝工具不可用。
echo   請到下面這個網址，下載安裝 Git：
echo.
echo     https://git-scm.com/download/win
echo.
echo   安裝時一路按 Next 就好，不用改任何設定。
echo   裝完後，關掉這個視窗，重新雙擊此檔案。
echo.
pause
exit /b 1

:git_install_failed
echo.
echo   自動安裝失敗。請手動安裝：
echo     https://git-scm.com/download/win
echo   裝完後重新雙擊此檔案。
echo.
pause
exit /b 1

:check_gh
REM ── 第 2 步：檢查 GitHub CLI ──
where gh >nul 2>nul
if errorlevel 1 goto :install_gh
echo   [OK] GitHub CLI
goto :check_auth

:install_gh
echo   安裝 GitHub CLI（用來登入 GitHub）...
where winget >nul 2>nul
if errorlevel 1 goto :no_winget_gh
winget install GitHub.cli -e --accept-package-agreements --accept-source-agreements
if errorlevel 1 goto :gh_install_failed
echo.
echo   ========================================
echo    GitHub CLI 安裝好了！
echo    請關掉這個視窗，重新雙擊此檔案繼續。
echo   ========================================
echo.
pause
exit /b 0

:no_winget_gh
echo.
echo   自動安裝工具不可用。
echo   請到 https://cli.github.com/ 手動安裝 GitHub CLI，
echo   裝完後重新雙擊此檔案。
echo.
pause
exit /b 1

:gh_install_failed
echo.
echo   GitHub CLI 安裝失敗。
echo   請到 https://cli.github.com/ 手動安裝，
echo   裝完後重新雙擊此檔案。
echo.
pause
exit /b 1

:check_auth
REM ── 第 3 步：GitHub 登入 ──
gh auth status >nul 2>nul
if not errorlevel 1 goto :auth_ok

echo.
echo   ==========================================
echo    重要：登入時請用 Jin 的 GitHub 帳號！
echo    用其他帳號登入會下載不了專案。
echo   ==========================================
echo.
echo   等一下會自動開網頁。
echo.
gh auth login --web --git-protocol https
if errorlevel 1 goto :auth_failed
echo   [OK] GitHub 登入成功
goto :check_repo

:auth_ok
echo   [OK] 已登入 GitHub
goto :check_repo

:auth_failed
echo.
echo   登入失敗。請確認網路連線，然後重新雙擊此檔案。
echo.
pause
exit /b 1

:check_repo
REM ── 第 4 步：下載或更新專案 ──
if exist "C:\dev\cc程式\.git" goto :repo_exists

echo   下載專案中（需要 1-2 分鐘）...
if not exist "C:\dev" mkdir "C:\dev"
git clone "https://github.com/Lokianlab/bidding-assistant-monorepo.git" "C:\dev\cc程式"
if errorlevel 1 goto :clone_failed
echo   [OK] 下載完成
goto :launch_setup

:repo_exists
echo   [OK] 專案已下載
cd /d "C:\dev\cc程式"
git pull origin main >nul 2>nul
goto :launch_setup

:clone_failed
echo.
echo   下載失敗！
echo.
echo   最常見的原因：登入的不是 Jin 的 GitHub 帳號。
echo   解法：
echo     - 先執行 gh auth logout
echo     - 再重新雙擊此檔案，用 Jin 的帳號登入
echo.
echo   其他可能：電腦沒連上網路。
echo.
pause
exit /b 1

:launch_setup
REM ── 第 5 步：找 Git Bash 並啟動安裝腳本 ──
if exist "C:\Program Files\Git\bin\bash.exe" goto :launch_64
if exist "C:\Program Files (x86)\Git\bin\bash.exe" goto :launch_32
goto :no_bash

:launch_64
echo.
echo   ========================================
echo    即將開啟安裝視窗。
echo    請到新開的黑色視窗中繼續操作。
echo    這個視窗會自動關閉。
echo   ========================================
echo.
timeout /t 3 >nul
start "" "C:\Program Files\Git\bin\bash.exe" --login -c "cd /c/dev/cc程式 && bash scripts/setup-new-machine.sh; echo; read -rp 'Press Enter to close / 按 Enter 關閉...'"
exit /b 0

:launch_32
echo.
echo   即將開啟安裝視窗...
timeout /t 3 >nul
start "" "C:\Program Files (x86)\Git\bin\bash.exe" --login -c "cd /c/dev/cc程式 && bash scripts/setup-new-machine.sh; echo; read -rp 'Press Enter to close / 按 Enter 關閉...'"
exit /b 0

:no_bash
echo.
echo   找不到 Git Bash。
echo   請重新安裝 Git：https://git-scm.com/download/win
echo   裝完後重新雙擊此檔案。
echo.
pause
exit /b 1
