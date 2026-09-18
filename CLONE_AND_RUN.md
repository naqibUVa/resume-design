# How to Clone and Run Resume & CV Builder on Your Laptop

This application is fully standalone and can be run locally on macOS, Windows, or Linux.

---

## ⚡ Option 1: Double-Click Launcher (No Terminal Needed!)

### On macOS
1. Double-click `start.command` in this folder.
2. If macOS reports "Permission denied" the first time, open Terminal and run:
   ```bash
   chmod +x start.command start.sh
   ```
3. Your browser will automatically open to `http://localhost:5180`.

### On Windows
1. Double-click `start.bat`.
2. It will launch the application and open your default browser.

---

## 💻 Option 2: Standard Developer Mode (npm / Node.js)

If you have Node.js (v18+) installed:

```bash
# 1. Install dependencies
npm install

# 2. Start the live-reloading development server
npm run dev
```

Open `http://localhost:5173` (or the port Vite displays) in your browser.

---

## 🚀 Option 3: Instant Static Serve (No Build Needed)

Because the pre-bundled production files are already in `dist/`, you can serve it with any local static web server:

```bash
# Using npx (Node.js)
npx serve dist

# Or using Python 3
cd dist && python3 -m http.server 8000
```
Then visit `http://localhost:8000`.

---

## 🌐 How to Upload as a Public Project to GitHub

To publish this project to your GitHub account (`naqibUVa`) as a **Public** repository:

1. Go to [github.com/new](https://github.com/new).
2. Set the **Repository name** to: `resume-design`.
3. Select **Public**.
4. Leave "Add a README", ".gitignore", and license **unchecked** (we already have them).
5. Click **Create repository**.
6. In your terminal inside this folder (`App_Suites/apps/01-Resume-Design`), run:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Resume & CV Builder with portfolio data"
   git branch -M main
   git remote add origin https://github.com/naqibUVa/resume-design.git
   git push -u origin main
   ```
