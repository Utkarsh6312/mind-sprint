# MINDSPRINT &mdash; Mental Calculation Training Web App

> **Train your brain. Own your progress.**  
> A complete, fully functional, 100% ad-free mental arithmetic training web application built with a distinctive **Dark Neo-Brutalism** design system.

---

## ⚡ Overview & Key Highlights

MindSprint provides a focused, distraction-free environment for sharpening mental arithmetic, numerical reasoning, calculation speed, and focus.

- **Dark Neo-Brutalism Design**: High-contrast dark canvas (`#111111`), thick black borders (`3px solid #050505`), hard offset shadows (`5px 5px 0 #050505`), flat saturated neon accents (electric yellow, acid lime, hyper cyan, hot pink, purple, orange), and physical button press mechanics (`transform: translate(3px, 3px)`).
- **100% Static & Client-Side**: No Node.js runtime required, no backend server, no database, no external font services, and zero analytics or trackers.
- **7 Distinct Mathematical Games**:
  1. **Quick Math**: Addition, Subtraction (guaranteed non-negative), Multiplication, Division (exact integer quotients, no division by zero), and Mixed.
  2. **Advanced Calculations**: Multi-step arithmetic expressions with parentheses and operator precedence evaluated safely using a custom Abstract Syntax Tree (AST) evaluator &mdash; **never `eval()`**.
  3. **Number Sequences**: 8 distinct pattern types (arithmetic, geometric, increasing/decreasing difference, square numbers, cubes, Fibonacci-style, alternating steps) with clear rule explanations.
  4. **Compare**: Fast numerical evaluation comparing two expressions with balanced greater than (`>`), equal to (`=`), and less than (`<`) relationships.
  5. **Squares**: Mental square and cube powers with difficulty-scaled base numbers and realistic distractors.
  6. **Math Puzzles**: Structured 2&times;2 grid matrix arithmetic where rows and columns resolve simultaneously to find missing values.
  7. **Mixed Sprint**: Dynamically balanced gauntlet cycling across all categories with category badges.
- **Deterministic & Safe Math**: Integer arithmetic only, verified safe integer ranges, exactly 4 unique choices per question, and guaranteed single correct answers.
- **Transparent Scoring Formula**:
  $$\text{questionScore} = \text{basePoints (100)} + \text{speedBonus} + \text{streakBonus}$$
- **Full Offline PWA**: Installable Progressive Web App (`manifest.json` + `sw.js`) with cache-first shell caching and relative subpath compatibility for GitHub Pages (`https://username.github.io/mindsprint/`).
- **Zero-Asset Web Audio API Sound**: Retro mechanical tactile clicks, harmonic chimes, buzzers, and ticking clocks synthesized natively on the device with zero external sound files.
- **Robust Persistence & Backup**: Versioned LocalStorage schema with corruption fallback, consecutive calendar-day streak calculation, JSON export/import with strict schema validation, and CSV export for session logs.
- **Automated Test Suite**: CLI test suite (`node tests/run-tests.js`) and visual in-browser test runner (`tests/game-tests.html`).

---

## 📁 Project Structure

```text
mindsprint/
├── index.html                   # Semantic HTML5 single-page application structure
├── style.css                    # Complete Dark Neo-Brutalism design system & animations
├── app.js                       # Application bootstrap & PWA registration
├── manifest.json                # Web App Manifest with relative subpath routing
├── sw.js                        # Offline caching Service Worker
├── favicon.svg                  # Vector SVG favicon with Brutalist Sigma stamp
├── README.md                    # Documentation & GitHub Pages deployment guide
├── assets/
│   └── icons/
│       ├── icon.svg             # High-resolution vector icon
│       ├── icon-192.png         # Standard 192x192 PWA icon
│       ├── icon-512.png         # High-res 512x512 PWA icon
│       └── icon-maskable-512.png# Maskable icon for Android adaptive icons
├── js/
│   ├── storage.js               # Versioned LocalStorage, streak calculator, JSON/CSV I/O
│   ├── sound.js                 # Web Audio API sound synthesizer & haptics engine
│   ├── generators.js            # Mathematical generators for all 7 game modes (No eval)
│   ├── engine.js                # Finite State Machine, drift-free timer, and scoring
│   └── ui.js                    # Screen transitions, SVG charts, and keyboard shortcuts
├── tests/
│   ├── game-tests.html          # Interactive in-browser visual test runner
│   └── run-tests.js             # Automated CLI test suite for terminal execution
└── scripts/
    └── generate-all-icons.js    # Node script for generating PNG icons from scratch
```

---

## 🎮 Game Modes Detailed

| Mode | Key Features | Difficulty Progression |
| :--- | :--- | :--- |
| **Quick Math** | Addition, Subtraction, Multiplication, Division. Toggle specific operators. | Easy (1-digit/small), Medium (2-digit), Hard (3-digit), Expert (4-digit/compound). |
| **Advanced** | Multi-step arithmetic expressions with parentheses, e.g. `(24 + 16) ÷ 5` or `18 × 4 − 27`. | Uses deterministic AST evaluation. Tests operator precedence without `eval()`. |
| **Sequences** | Pattern completion: e.g. `7, 14, 21, 28, ?` or `2, 5, 9, 14, ?`. | 8 distinct rules including arithmetic, geometric, squares, additive sequences, and alternating steps. |
| **Compare** | Compare expression pairs, e.g. `28 − 10 ? 13 + 1`. Buttons: `>`, `=`, `<`. | Generates balanced 33% `>`, 33% `<`, 33% `=` relationships. |
| **Squares** | Base numbers $x^2$ and $x^3$, e.g. $23^2 = ?$ or $7^3 = ?$. | Easy ($2-12$), Medium ($11-25$), Hard ($21-50$), Expert ($40-99$ and cubes). |
| **Math Puzzles**| 2&times;2 Grid Matrix with simultaneous row and column equations. | Solve for missing cell `?` using orthogonal arithmetic constraints. |
| **Mixed Sprint**| Interleaved challenges across all 6 modes with category badges. | Cycles through all modes to provide a balanced cognitive workout. |

---

## 🏆 Scoring Formula

Points are awarded exclusively for correct answers according to:

$$\text{basePoints} = 100$$
$$\text{speedBonus} = \text{round}\left(50 \times \frac{\text{remainingTime}}{\text{allowedTime}}\right)$$
$$\text{streakBonus} = \min(\text{currentStreak} \times 5, 25)$$
$$\text{questionScore} = \text{basePoints} + \text{speedBonus} + \text{streakBonus}$$

- **Untimed Mode**: Awards 100 base points + a fixed 25 speed bonus + streak bonus.
- **Incorrect & Timeouts**: 0 points awarded. No negative point deductions.

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
| :--- | :--- |
| **1** or **A** | Select Answer Choice 1 (or `>` in Compare mode) |
| **2** or **B** | Select Answer Choice 2 (or `=` in Compare mode) |
| **3** or **C** | Select Answer Choice 3 (or `<` in Compare mode) |
| **4** or **D** | Select Answer Choice 4 |
| **Escape** | Open Exit Confirmation Modal |
| **Enter** / **Space** | Trigger focused button or card |

---

## 🚀 GitHub Pages Deployment Guide

MindSprint is built with relative paths (`./`) and does not assume hosting at the domain root. It is 100% compatible with repository subfolders (e.g., `https://USERNAME.github.io/REPOSITORY-NAME/`).

### Step 1: Create a GitHub Repository
1. Log in to [GitHub](https://github.com/).
2. Click **New Repository**.
3. Name your repository (e.g., `mindsprint` or `calc-app`).
4. Set visibility to **Public** (required for free GitHub Pages).
5. Click **Create repository**.

### Step 2: Upload Project Files
You can upload either using Git command line or GitHub's web interface:

#### Option A: Using Git CLI
```bash
git init
git add .
git commit -m "Initial commit: MindSprint Mental Calculation Training PWA"
git branch -M main
git remote add origin https://github.com/USERNAME/REPOSITORY-NAME.git
git push -u origin main
```

#### Option B: Using GitHub Web Uploader
1. On your newly created GitHub repository page, click **uploading an existing file**.
2. Drag and drop all project files (`index.html`, `style.css`, `app.js`, `manifest.json`, `sw.js`, `favicon.svg`, `assets/`, `js/`, `tests/`).
3. Commit changes to `main`.

### Step 3: Enable GitHub Pages
1. Navigate to your repository's **Settings** tab.
2. In the left sidebar, click **Pages** (under the "Code and automation" section).
3. Under **Build and deployment**:
   - **Source**: Select `Deploy from a branch`.
   - **Branch**: Select `main` and folder `/ (root)`.
4. Click **Save**.

### Step 4: Access Your Live Application
GitHub Pages will build and deploy the site in approximately 30–60 seconds.
Your live application URL will be:
```text
https://USERNAME.github.io/REPOSITORY-NAME/
```

### Step 5: Testing Offline & Installing PWA
1. Open the URL in Google Chrome, Safari, Firefox, or Edge.
2. Open DevTools (F12) &rarr; **Application** &rarr; **Service Workers** to verify that `sw.js` is active.
3. Check the "Offline" checkbox in DevTools or turn off your device's Wi-Fi/cellular connection.
4. Reload the page &mdash; MindSprint will load instantaneously from the cache!
5. On mobile browsers (Android Chrome, iOS Safari), tap the browser menu &rarr; **Add to Home screen** / **Install app** to install MindSprint as a standalone app on your home screen.

---

## 🧪 Testing & Verification

MindSprint includes comprehensive automated tests covering arithmetic generation, AST expression evaluation, number sequence patterns, comparison balancing, scoring calculations, finite state machine transitions, and storage corruption handling.

### Running CLI Tests
Run the test suite using Node.js:
```bash
node tests/run-tests.js
```
Expected output:
```text
=== RUNNING MINDSPRINT AUTOMATED TEST SUITE ===
[1. Arithmetic & Quick Math]
  ✔ Addition generates valid integers and exact sum
  ✔ Subtraction guarantees non-negative answers
  ✔ Multiplication produces safe integers
  ✔ Division produces exact integer quotients and never divides by zero
  ✔ Distractor generation produces exactly 4 unique choices with no duplicates
[2. Advanced Multi-Step Math]
  ✔ AST Evaluator computes operations accurately with precedence
  ✔ Advanced question generation never uses eval and produces safe integers
[3. Number Sequences]
  ✔ Sequence generator produces unambiguous patterns with documented rules
[4. Expression Comparison]
  ✔ Comparison generates valid >, <, and = relationships
[5. Squares & Math Puzzles]
  ✔ Squares generator creates correct squared values
  ✔ Math Puzzles generates solvable 2x2 grid equations
[6. Game Engine & Scoring Model]
  ✔ Scoring formula calculates base + speed + streak bonuses
  ✔ Double answer submissions are strictly prevented by FSM
  ✔ Timeout locks question, awards zero points, and records mistake
[7. Storage & Resilience]
  ✔ Consecutive day streak increases only on new calendar dates
  ✔ Corrupted JSON import is safely rejected without crash
  ✔ Valid JSON export and import cycle succeeds and preserves data

----------------------------------------
Test Results: 17 passed, 0 failed
----------------------------------------
✔ ALL MINDSPRINT TESTS PASSED PERFECTLY!
```

### Running In-Browser Tests
Open `tests/game-tests.html` directly in any web browser or navigate to:
```text
http://localhost:8080/tests/game-tests.html
```

---

## 🔒 Privacy & Zero-Telemetry Commitment

- **No Advertisements**: Zero advertising networks, SDKs, or sponsored widgets.
- **No Third-Party Trackers**: Zero Google Analytics, Facebook Pixels, or telemetry scripts.
- **No Remote Database / Cloud Login**: All scores, streaks, and settings remain solely on your device.
- **Full Data Ownership**: Export your data anytime as a clean JSON backup or CSV spreadsheet via Settings.

---

## 📄 License

MIT License &mdash; Free for personal practice, education, and open-source contribution.
