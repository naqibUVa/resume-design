@echo off
REM ---------------------------------------------------------------------------
REM  Resume & CV Builder - Windows launcher.
REM
REM   Double-click this file, or from a command prompt:
REM
REM     start.bat            install if needed, then start the dev server
REM     start.bat --built    build once, then serve the static dist\ folder
REM     start.bat --check    print diagnostics and stop
REM     start.bat --clean    delete node_modules and reinstall from scratch
REM
REM  Every failure below says what went wrong and what to type to fix it.
REM ---------------------------------------------------------------------------

setlocal enabledelayedexpansion
cd /d "%~dp0"

set "MODE=dev"
set "DOCLEAN=no"

REM PORT may already be set by the suite launcher one level up, which needs the
REM dashboard iframe and the server to agree on an address. Only default it.
REM --strictPort below turns a busy assigned port into an error rather than a
REM silent move to 5181, which the dashboard could never find.
if not defined PORT set "PORT=5180"

REM NO_BROWSER is likewise set by the suite launcher, which opens the dashboard
REM itself. vite.config.js reads it too, for the dev-server path.
set "OPENFLAG=--open"
if defined NO_BROWSER set "OPENFLAG="

:parseargs
if "%~1"=="" goto doneargs
if /i "%~1"=="--built"  set "MODE=built"
if /i "%~1"=="--build"  set "MODE=built"
if /i "%~1"=="--static" set "MODE=built"
if /i "%~1"=="--check"  set "MODE=check"
if /i "%~1"=="--doctor" set "MODE=check"
if /i "%~1"=="--clean"  set "DOCLEAN=yes"
if /i "%~1"=="--port"   ( set "PORT=%~2" & shift )
shift
goto parseargs
:doneargs

cls
echo Resume ^& CV Builder
echo %CD%
echo.
echo Checking your setup
echo -------------------

REM --- in the right folder? -------------------------------------------------
if not exist "package.json" goto nopkg
if not exist "vite.config.js" goto nopkg
echo   [ok] Project files found
goto haveproject

:nopkg
call :banner "This script is not sitting in the project folder."
echo   Expected package.json and vite.config.js next to start.bat.
echo.
echo   Currently in: %CD%
echo.
echo   Move start.bat back into the Resume_design folder and try again.
goto stop

:haveproject

REM --- Node.js --------------------------------------------------------------
where node >nul 2>&1
if errorlevel 1 goto nonode

for /f "tokens=*" %%v in ('node -v 2^>nul') do set "NODEV=%%v"
REM Strip the leading "v", then take the major number before the first dot.
set "NODENUM=!NODEV:v=!"
for /f "tokens=1 delims=." %%m in ("!NODENUM!") do set "NODEMAJOR=%%m"

if !NODEMAJOR! LSS 18 (
  call :banner "Node.js !NODEV! is too old."
  echo   Vite 5 needs Node 18 or newer. Yours reports: !NODEV!
  echo.
  echo   Download the current LTS installer from  https://nodejs.org
  echo   Accept every default, then run start.bat again.
  goto stop
)
echo   [ok] Node !NODEV!

where npm >nul 2>&1
if errorlevel 1 (
  call :banner "npm is missing."
  echo   Node is installed but npm is not on your PATH, which usually means a
  echo   partial install.
  echo.
  echo   Reinstalling Node from https://nodejs.org fixes this - npm ships with it.
  goto stop
)
for /f "tokens=*" %%v in ('npm -v 2^>nul') do set "NPMV=%%v"
echo   [ok] npm !NPMV!
goto deps

:nonode
call :banner "Node.js is not installed."
echo   This app is built with Vite, which needs Node.js to run.
echo.
echo   1. Download the LTS installer from  https://nodejs.org
echo      (the big green button; accept every default)
echo.
echo   2. Close this window, open it again, and double-click start.bat
echo.
echo   You need Node 18 or newer. Check with:  node -v
goto stop

REM --- dependencies ---------------------------------------------------------
:deps
if /i "%DOCLEAN%"=="yes" (
  echo.
  echo Cleaning
  echo --------
  if exist "node_modules" rmdir /s /q "node_modules"
  if exist "package-lock.json" del /q "package-lock.json"
  echo   [ok] Removed node_modules and package-lock.json
)

echo.
echo Checking dependencies
echo ---------------------

set "NEEDINSTALL=no"
if not exist "node_modules"       set "NEEDINSTALL=yes"
if not exist "node_modules\vite"  set "NEEDINSTALL=yes"
if not exist "node_modules\react" set "NEEDINSTALL=yes"

if /i "!NEEDINSTALL!"=="yes" (
  echo   [..] Installing. First time takes a minute or two; after that it is instant.
  echo        Everything lands in .\node_modules - nothing is installed system-wide.
  echo.
  call npm install
  if errorlevel 1 (
    call :banner "npm install failed."
    echo   The npm output above says why. The usual causes, in order:
    echo.
    echo     - No internet connection. npm downloads from registry.npmjs.org.
    echo     - A corporate proxy or VPN. Try again off the VPN, or run:
    echo         npm config set proxy http://your-proxy:port
    echo     - A half-finished earlier install. Run:  start.bat --clean
    echo     - No write permission here. Do not run this from a read-only
    echo       folder, or from inside a zip file you have not extracted.
    goto stop
  )
  echo   [ok] Dependencies installed
) else (
  echo   [ok] Up to date
)

REM --- diagnostics only -----------------------------------------------------
if /i "%MODE%"=="check" (
  echo.
  echo Diagnostics
  echo -----------
  echo   Project     %CD%
  echo   Node        !NODEV!
  echo   npm         !NPMV!
  echo   Deps        installed
  if exist "dist\index.html" ( echo   Built dist  present ) else ( echo   Built dist  not built yet )
  echo   Port        %PORT%
  echo.
  echo   [ok] Everything needed to start is in place.
  goto stop
)

REM --- launch ---------------------------------------------------------------
echo.
if /i "%MODE%"=="built" (
  echo Building
  echo --------
  call npm run build
  if errorlevel 1 (
    call :banner "The build failed."
    echo   The compiler output above names the file and the line.
    echo.
    echo   If you have not edited anything, try:  start.bat --clean
    echo   If you have been editing, the error is in your change - a syntax
    echo   slip in a .jsx file is the usual cause.
    goto stop
  )
  echo   [ok] Built into dist\
  call :running
  call npx vite preview --port %PORT% --strictPort %OPENFLAG%
) else (
  echo Starting the development server
  echo -------------------------------
  echo   Edits to files in src\ appear in the browser immediately.
  call :running
  call npx vite --port %PORT% --strictPort
)

echo.
echo Server stopped. Your work is saved in the browser - run this file again
echo any time to pick it up.
goto stop

REM --- helpers --------------------------------------------------------------
:running
echo.
echo   The app is running.
echo.
echo      http://localhost:%PORT%
echo.
echo   A browser tab should open by itself. If not, copy that address in.
echo   Keep this window open while you work - closing it stops the server.
echo   Press Ctrl+C here when you are finished.
echo.
exit /b 0

:banner
echo.
echo ==========================================================
echo   %~1
echo ==========================================================
echo.
exit /b 0

:stop
echo.
pause
endlocal
