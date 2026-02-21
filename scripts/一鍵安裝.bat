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

REM ── 檢查 Git ──
where git >nul 2>nul
if errorlevel 1 goto :install_git
echo   [OK] Git
goto :check_repo

:install_git
echo   需要先安裝 Git...
echo.
where winget >nul 2>nul
if errorlevel 1 (
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
)
echo   正在安裝 Git（需要 1-2 分鐘）...
winget install Git.Git -e --accept-package-agreements --accept-source-agreements
if errorlevel 1 (
    echo.
    echo   自動安裝失敗。請手動安裝：
    echo     https://git-scm.com/download/win
    echo   裝完後重新雙擊此檔案。
    echo.
    pause
    exit /b 1
)
echo.
echo   ========================================
echo    Git 安裝好了！
echo    請關掉這個視窗，重新雙擊此檔案繼續。
echo   ========================================
echo.
pause
exit /b 0

:check_repo
REM ── 下載或更新專案 ──
if exist "C:\dev\cc程式\.git" (
    echo   [OK] 專案已下載
    cd /d "C:\dev\cc程式"
    git pull origin main >nul 2>nul
) else (
    echo   下載專案中（需要 1-2 分鐘）...
    if not exist "C:\dev" mkdir "C:\dev"
    git clone "https://github.com/Lokianlab/bidding-assistant-monorepo.git" "C:\dev\cc程式"
    if errorlevel 1 (
        echo.
        echo   下載失敗！可能的原因：
        echo   1. 電腦沒連上網路
        echo   2. 需要 GitHub 帳號登入
        echo.
        echo   請確認網路連線後，重新雙擊此檔案。
        echo.
        pause
        exit /b 1
    )
    echo   [OK] 下載完成
)

REM ── 找 Git Bash 並啟動安裝腳本 ──
if exist "C:\Program Files\Git\bin\bash.exe" (
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
)

if exist "C:\Program Files (x86)\Git\bin\bash.exe" (
    echo.
    echo   即將開啟安裝視窗...
    timeout /t 3 >nul
    start "" "C:\Program Files (x86)\Git\bin\bash.exe" --login -c "cd /c/dev/cc程式 && bash scripts/setup-new-machine.sh; echo; read -rp 'Press Enter to close / 按 Enter 關閉...'"
    exit /b 0
)

echo.
echo   找不到 Git Bash。
echo   請重新安裝 Git：https://git-scm.com/download/win
echo   裝完後重新雙擊此檔案。
echo.
pause
exit /b 1
