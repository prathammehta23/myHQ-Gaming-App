# Project Helper Commands

This file lists the common utility commands for running, testing, and verifying the myHQ Gaming App project locally.

---

## 1. Running the Web Server Locally

Since this is a static frontend project, you need a local web server to serve the HTML pages over HTTP (essential for Firebase client-side SDK imports to operate correctly).

### Option A: Using Python 3 (Recommended)
This requires no external package installations if Python 3 is present on your system.
```bash
python3 -m http.server 8000
```
*Access URL:* [http://localhost:8000](http://localhost:8000)

### Option B: Using Node.js (`npx`)
If you have Node.js and NPM installed, you can start a server directly using:
```bash
npx http-server -p 8000
```
*Access URL:* [http://localhost:8000](http://localhost:8000)

### Option C: Using PHP
If you have PHP installed on your terminal:
```bash
php -S localhost:8000
```
*Access URL:* [http://localhost:8000](http://localhost:8000)

---

## 2. Syntax Validation Checks

You can run this validation script to scan all HTML files in the project directory, extract their script blocks, and verify JavaScript parser compatibility and syntax correctness.

To run:
```bash
node check_scripts.js
```

*(Note: The validation script `check_scripts.js` has been copied to your project folder for standalone execution).*
