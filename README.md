# MindSprint — Mental Calculation Training

> **Train your brain. Own your progress.**  
> A complete, ad-free mental arithmetic training web app. No backend. No trackers. No distractions.

🔗 **Live App**: [utkarsh6312.github.io/mind-sprint](https://utkarsh6312.github.io/mind-sprint/)

---

## ⚡ Overview

MindSprint is a focused environment for sharpening mental arithmetic, numerical reasoning, calculation speed, and concentration.

- **100% Static & Client-Side** — no server, no database, no external dependencies
- **7 Distinct Game Modes** — from basic arithmetic to sequences and puzzles
- **Offline PWA** — installable, works without internet
- **Zero Analytics or Ads** — your data stays on your device

---

## 📁 Project Structure

```text
mindsprint/
├── index.html                   # Single-page application
├── style.css                    # Design system & animations
├── app.js                       # App bootstrap & PWA registration
├── manifest.json                # Web App Manifest
├── sw.js                        # Service Worker for offline use
├── favicon.svg                  # App icon
├── assets/icons/                # PWA icons (192px, 512px, maskable)
├── js/
│   ├── storage.js               # LocalStorage, streak calculator, JSON/CSV I/O
│   ├── sound.js                 # Web Audio API sound & haptics engine
│   ├── generators.js            # Question generators for all 7 modes
│   ├── engine.js                # Game engine, timer, and scoring
│   └── ui.js                    # Screen transitions & keyboard shortcuts
└── tests/
    ├── game-tests.html          # In-browser test runner
    └── run-tests.js             # CLI test suite
```

---

## 🎮 Game Modes

| Mode | Description |
| :--- | :--- |
| **Quick Math** | Addition, Subtraction, Multiplication, Division — toggle specific operators |
| **Advanced** | Multi-step expressions with parentheses using a safe AST evaluator (no `eval()`) |
| **Sequences** | Pattern completion — arithmetic, geometric, squares, Fibonacci-style, and more |
| **Compare** | Compare two expressions using `>`, `=`, `<` |
| **Squares** | Mental squares and cubes with difficulty-scaled base numbers |
| **Math Puzzles** | 2×2 grid matrix — solve for the missing cell using row & column equations |
| **Mixed Sprint** | Cycles through all modes for a balanced mental workout |

---

## 🏆 Scoring

Points are awarded for correct answers based on speed and streaks:

- **Base**: 100 points per correct answer  
- **Speed Bonus**: up to +50 (based on remaining time)  
- **Streak Bonus**: up to +25 (increases with consecutive correct answers)  
- **Wrong Answer / Timeout**: 0 points, game resets

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
| :--- | :--- |
| **1 / A** | Answer choice 1 (or `>` in Compare) |
| **2 / B** | Answer choice 2 (or `=` in Compare) |
| **3 / C** | Answer choice 3 (or `<` in Compare) |
| **4 / D** | Answer choice 4 |
| **Escape** | Exit confirmation |
| **Enter / Space** | Confirm focused button |

---

## 🔒 Privacy

- No ads, no trackers, no cloud login
- All data stored locally on your device
- Export your progress as JSON or CSV anytime via Settings

---

## 📄 License

MIT — free for personal use, education, and open-source contributions.
