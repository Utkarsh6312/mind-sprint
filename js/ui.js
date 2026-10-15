/**
 * MindSprint UI Controller
 * Screen routing, Neo-Brutalist component rendering, accessibility, and chart generation.
 */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MindSprintUI = factory();
  }
})(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  class UIController {
    constructor() {
      this.currentScreen = 'screen-home';
      this.selectedMode = 'quickMath';
      this.activeConfig = {
        difficulty: 'medium',
        roundLength: 10,
        timeLimitSec: 15,
        quickMathOps: ['add', 'sub', 'mul', 'div']
      };
      this.currentSessionResult = null;
      this.onExitConfirmCallback = null;
      this.onActionConfirmCallback = null;
    }

    init(engine, storage, sound) {
      this.engine = engine;
      this.storage = storage;
      this.sound = sound;

      this.applySavedSettings();
      this.bindNavigation();
      this.bindHomeEvents();
      this.bindConfigEvents();
      this.bindGameplayEvents();
      this.bindResultsEvents();
      this.bindStatsEvents();
      this.bindHistoryEvents();
      this.bindSettingsEvents();
      this.bindModals();
      this.bindKeyboardShortcuts();
      this.bindPWAInstall();

      this.refreshHomeStats();
      this.navigateTo('screen-home');
    }

    // =========================================================================
    // NAVIGATION & SETTINGS SYNC
    // =========================================================================
    navigateTo(screenId) {
      const screens = document.querySelectorAll('.screen');
      screens.forEach((s) => s.classList.remove('active'));

      const target = document.getElementById(screenId);
      if (target) {
        target.classList.add('active');
        this.currentScreen = screenId;
        window.scrollTo({ top: 0, behavior: 'instant' });

        // Screen specific hooks
        if (screenId === 'screen-home') {
          this.refreshHomeStats();
        } else if (screenId === 'screen-stats') {
          this.renderStatisticsDashboard();
        } else if (screenId === 'screen-history') {
          this.renderHistoryList();
        }
      }
    }

    applySavedSettings() {
      const settings = this.storage.getSettings();
      this.activeConfig.difficulty = settings.difficulty || 'medium';
      this.activeConfig.roundLength = settings.roundLength || 10;
      this.activeConfig.timeLimitSec = settings.timeLimitSec !== undefined ? settings.timeLimitSec : 15;
      this.activeConfig.quickMathOps = settings.quickMathOps || ['add', 'sub', 'mul', 'div'];

      // Apply Accent Color to Body
      document.body.setAttribute('data-accent', settings.accentColor || 'yellow');
      document.querySelectorAll('.color-swatch').forEach((swatch) => {
        swatch.classList.toggle('active', swatch.dataset.color === (settings.accentColor || 'yellow'));
      });

      // Reduced motion
      document.body.setAttribute('data-reduced-motion', settings.reducedMotion ? 'true' : 'false');
      const redMotionInput = document.getElementById('setting-reduced-motion');
      if (redMotionInput) redMotionInput.checked = !!settings.reducedMotion;

      // Sound & Haptics
      if (this.sound) {
        this.sound.setEnabled(settings.soundEnabled !== false);
        this.sound.setHapticsEnabled(settings.hapticsEnabled !== false);
      }
      const soundInput = document.getElementById('setting-sound');
      if (soundInput) soundInput.checked = settings.soundEnabled !== false;
      const hapticsInput = document.getElementById('setting-haptics');
      if (hapticsInput) hapticsInput.checked = settings.hapticsEnabled !== false;

      // Default Difficulty
      const diffSelect = document.getElementById('setting-default-diff');
      if (diffSelect) diffSelect.value = settings.difficulty || 'medium';

      this.updateSoundIcon();
    }

    updateSoundIcon() {
      const soundIcon = document.getElementById('sound-icon-text');
      if (soundIcon && this.sound) {
        soundIcon.textContent = this.sound.enabled ? '\uD83D\uDD0A' : '\uD83D\uDD07';
      }
    }

    // =========================================================================
    // HOME SCREEN
    // =========================================================================
    refreshHomeStats() {
      const stats = this.storage.getStatistics();
      const elBest = document.getElementById('home-stat-best');
      const elSolved = document.getElementById('home-stat-solved');
      const elStreak = document.getElementById('home-stat-streak');

      if (elBest) elBest.textContent = stats.bestScore || 0;
      if (elSolved) elSolved.textContent = stats.questionsSolved || 0;
      if (elStreak) elStreak.textContent = stats.dayStreak || 0;
    }

    bindHomeEvents() {
      const gameCards = document.querySelectorAll('.game-card');
      gameCards.forEach((card) => {
        const handleCardAction = () => {
          if (this.sound) this.sound.playClick();
          this.selectedMode = card.dataset.mode;
          this.openGameConfiguration(this.selectedMode);
        };
        card.addEventListener('click', handleCardAction);
        card.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCardAction();
          }
        });
      });

      const btnRules = document.getElementById('btn-home-rules');
      if (btnRules) {
        btnRules.addEventListener('click', () => {
          if (this.sound) this.sound.playClick();
          this.navigateTo('screen-rules');
        });
      }
    }

    // =========================================================================
    // CONFIGURATION SCREEN
    // =========================================================================
    openGameConfiguration(mode) {
      this.selectedMode = mode;
      const titleEl = document.getElementById('config-title');
      const opsGroup = document.getElementById('config-ops-group');

      const modeTitles = {
        quickMath: 'QUICK MATH',
        advanced: 'ADVANCED CALCULATIONS',
        sequences: 'NUMBER SEQUENCES',
        compare: 'COMPARISON TRAINING',
        squares: 'SQUARES & CUBES',
        puzzles: 'MATH PUZZLES',
        mixed: 'MIXED SPRINT'
      };

      if (titleEl) {
        titleEl.textContent = modeTitles[mode] || 'CHALLENGE CONFIGURATION';
      }

      // Show operators group only for Quick Math or Mixed Sprint
      if (opsGroup) {
        opsGroup.style.display = (mode === 'quickMath' || mode === 'mixed') ? 'flex' : 'none';
      }

      // Sync active settings onto controls
      this.syncConfigControls();
      this.navigateTo('screen-config');
    }

    syncConfigControls() {
      // Difficulty
      document.querySelectorAll('.diff-card').forEach((card) => {
        const isSel = card.dataset.diff === this.activeConfig.difficulty;
        card.classList.toggle('selected', isSel);
        card.setAttribute('aria-checked', isSel ? 'true' : 'false');
      });
      const badge = document.getElementById('config-diff-badge');
      if (badge) badge.textContent = this.activeConfig.difficulty.toUpperCase();

      // Round length
      document.querySelectorAll('#group-round-length .option-pill').forEach((pill) => {
        pill.classList.toggle('selected', Number(pill.dataset.val) === this.activeConfig.roundLength);
      });

      // Time limit
      document.querySelectorAll('#group-time-limit .option-pill').forEach((pill) => {
        pill.classList.toggle('selected', Number(pill.dataset.val) === this.activeConfig.timeLimitSec);
      });

      // Quick Math ops
      document.querySelectorAll('.op-toggle').forEach((btn) => {
        btn.classList.toggle('active', this.activeConfig.quickMathOps.includes(btn.dataset.op));
      });
    }

    bindConfigEvents() {
      // Back
      document.getElementById('btn-config-back')?.addEventListener('click', () => {
        if (this.sound) this.sound.playClick();
        this.navigateTo('screen-home');
      });

      // Difficulty cards
      document.querySelectorAll('.diff-card').forEach((card) => {
        const selectDiff = () => {
          if (this.sound) this.sound.playClick();
          this.activeConfig.difficulty = card.dataset.diff;
          this.syncConfigControls();
        };
        card.addEventListener('click', selectDiff);
        card.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            selectDiff();
          }
        });
      });

      // Round Length
      document.querySelectorAll('#group-round-length .option-pill').forEach((pill) => {
        pill.addEventListener('click', () => {
          if (this.sound) this.sound.playClick();
          this.activeConfig.roundLength = Number(pill.dataset.val);
          this.syncConfigControls();
        });
      });

      // Time Limit
      document.querySelectorAll('#group-time-limit .option-pill').forEach((pill) => {
        pill.addEventListener('click', () => {
          if (this.sound) this.sound.playClick();
          this.activeConfig.timeLimitSec = Number(pill.dataset.val);
          this.syncConfigControls();
        });
      });

      // Operator Toggles
      document.querySelectorAll('.op-toggle').forEach((toggle) => {
        toggle.addEventListener('click', () => {
          if (this.sound) this.sound.playClick();
          const op = toggle.dataset.op;
          let currentOps = [...this.activeConfig.quickMathOps];

          if (currentOps.includes(op)) {
            if (currentOps.length > 1) { // prevent empty
              currentOps = currentOps.filter((o) => o !== op);
            }
          } else {
            currentOps.push(op);
          }
          this.activeConfig.quickMathOps = currentOps;
          this.syncConfigControls();
        });
      });

      // Start Game Action
      document.getElementById('btn-start-game')?.addEventListener('click', () => {
        if (this.sound) this.sound.playClick();
        this.startTrainingSession();
      });
    }

    startTrainingSession() {
      this.engine.startSession({
        gameMode: this.selectedMode,
        difficulty: this.activeConfig.difficulty,
        roundLength: this.activeConfig.roundLength,
        timeLimitSec: this.activeConfig.timeLimitSec,
        quickMathOps: this.activeConfig.quickMathOps
      });

      const modeBadge = document.getElementById('gameplay-mode-badge');
      if (modeBadge) {
        modeBadge.textContent = this.selectedMode.toUpperCase();
      }

      this.navigateTo('screen-gameplay');
    }

    // =========================================================================
    // GAMEPLAY SCREEN
    // =========================================================================
    bindGameplayEvents() {
      // Exit button
      document.getElementById('btn-gameplay-exit')?.addEventListener('click', () => {
        if (this.sound) this.sound.playClick();
        this.openExitModal();
      });

      // Sound toggle
      document.getElementById('btn-gameplay-sound')?.addEventListener('click', () => {
        if (this.sound) {
          const newVal = !this.sound.enabled;
          this.sound.setEnabled(newVal);
          this.storage.updateSettings({ soundEnabled: newVal });
          this.updateSoundIcon();
          if (newVal) this.sound.playClick();
        }
      });

      // Engine Listeners
      this.engine.on('tick', (tickData) => {
        this.handleTimerTick(tickData);
      });

      this.engine.on('question', (questionData) => {
        this.renderQuestion(questionData);
      });

      this.engine.on('feedback', (feedbackData) => {
        this.renderFeedback(feedbackData);
      });

      this.engine.on('completed', (sessionResult) => {
        this.currentSessionResult = sessionResult;
        this.renderResults(sessionResult);
        this.navigateTo('screen-results');
      });
    }

    handleTimerTick(tickData) {
      const timerBox = document.getElementById('timer-display-box');
      const timerText = document.getElementById('timer-text');
      const timerLabel = document.getElementById('timer-label');
      const progressFill = document.getElementById('timer-progress-fill');

      if (tickData.isUntimed) {
        if (timerLabel) timerLabel.textContent = 'MODE: UNTIMED';
        if (timerText) timerText.textContent = 'UNTIMED';
        if (progressFill) progressFill.style.width = '100%';
        if (timerBox) timerBox.classList.remove('timer-warning');
        return;
      }

      if (timerLabel && tickData.currentAllowedSec) {
        timerLabel.textContent = `TIME (Limit: ${tickData.currentAllowedSec.toFixed(1)}s ↓)`;
      }

      const secRemaining = (tickData.remainingMs / 1000).toFixed(1);
      if (timerText) timerText.textContent = `${secRemaining}s`;
      if (progressFill) progressFill.style.width = `${tickData.percent}%`;

      if (timerBox) {
        timerBox.classList.toggle('timer-warning', tickData.isLowTime);
      }
      if (progressFill) {
        progressFill.classList.toggle('warning', tickData.isLowTime);
      }
    }

    renderQuestion(data) {
      const q = data.question;

      // Metadata
      const elQnum = document.getElementById('game-meta-qnum');
      const elScore = document.getElementById('game-meta-score');
      const elStreak = document.getElementById('game-meta-streak');
      const catTag = document.getElementById('game-category-tag');

      if (elQnum) {
        if (!data.totalQuestions || data.totalQuestions >= 999) {
          elQnum.textContent = `Q ${String(data.questionIndex).padStart(2, '0')} (∞)`;
        } else {
          elQnum.textContent = `${String(data.questionIndex).padStart(2, '0')} / ${String(data.totalQuestions).padStart(2, '0')}`;
        }
      }
      if (elScore) elScore.textContent = data.score;
      if (elStreak) elStreak.textContent = `${data.timeLimitSec.toFixed(1)}s`;
      if (catTag) catTag.textContent = q.categoryLabel || 'MATH';

      // Reset feedback banner
      const banner = document.getElementById('gameplay-feedback-banner');
      if (banner) {
        banner.className = 'feedback-banner';
        banner.textContent = '';
      }

      // Reset timer UI warning
      const timerBox = document.getElementById('timer-display-box');
      if (timerBox) timerBox.classList.remove('timer-warning');

      // Question Area: Standard vs Puzzle
      const exprText = document.getElementById('game-expression-text');
      const puzzleContainer = document.getElementById('game-puzzle-container');

      if (q.isPuzzle && q.puzzleData) {
        if (exprText) exprText.textContent = 'Find the missing number in the grid:';
        if (puzzleContainer) {
          puzzleContainer.style.display = 'flex';
          this.renderPuzzleGrid(puzzleContainer, q.puzzleData);
        }
      } else {
        if (exprText) exprText.textContent = q.expression;
        if (puzzleContainer) {
          puzzleContainer.style.display = 'none';
          puzzleContainer.innerHTML = '';
        }
      }

      // Render Answers Grid
      const answersGrid = document.getElementById('gameplay-answers-grid');
      if (!answersGrid) return;
      answersGrid.innerHTML = '';

      if (q.isCompare) {
        answersGrid.classList.add('compare-layout');
      } else {
        answersGrid.classList.remove('compare-layout');
      }

      q.choices.forEach((choice, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'answer-btn';
        btn.dataset.choiceIdx = idx;
        btn.dataset.value = choice.value;

        // Key badge: 1, 2, 3, 4
        const keyBadge = document.createElement('span');
        keyBadge.className = 'key-badge';
        keyBadge.textContent = idx + 1;

        const label = document.createElement('span');
        label.className = 'ans-label';
        label.textContent = choice.display;

        btn.appendChild(keyBadge);
        btn.appendChild(label);

        btn.addEventListener('click', () => {
          this.engine.submitAnswer(choice.value);
        });

        answersGrid.appendChild(btn);
      });
    }

    renderPuzzleGrid(container, puzzleData) {
      container.innerHTML = '';
      const raw = puzzleData.raw;

      // 2x2 Matrix with row & column operations
      // Row 1: [A] + [B] = R1
      // Op Row:  +     +
      // Row 2: [C] + [D] = R2
      // Eq Row:  =     =
      // Col Res: C1    C2

      const createCell = (val, isTarget = false, isResult = false) => {
        const c = document.createElement('div');
        c.className = `puzzle-cell ${isTarget ? 'puzzle-target' : ''} ${isResult ? 'puzzle-result' : ''}`;
        c.textContent = val;
        return c;
      };

      const createOp = (sym) => {
        const o = document.createElement('div');
        o.className = 'puzzle-op';
        o.textContent = sym;
        return o;
      };

      // Row 1
      const r1 = document.createElement('div');
      r1.className = 'puzzle-row';
      r1.appendChild(createCell(raw.hidePos === 0 ? '?' : raw.a, raw.hidePos === 0));
      r1.appendChild(createOp('+'));
      r1.appendChild(createCell(raw.hidePos === 1 ? '?' : raw.b, raw.hidePos === 1));
      r1.appendChild(createOp('='));
      r1.appendChild(createCell(raw.r1, false, true));
      container.appendChild(r1);

      // Vertical Ops
      const opRow = document.createElement('div');
      opRow.className = 'puzzle-row';
      opRow.appendChild(createOp('+'));
      opRow.appendChild(createOp(''));
      opRow.appendChild(createOp('+'));
      opRow.appendChild(createOp(''));
      opRow.appendChild(createOp(''));
      container.appendChild(opRow);

      // Row 2
      const r2 = document.createElement('div');
      r2.className = 'puzzle-row';
      r2.appendChild(createCell(raw.hidePos === 2 ? '?' : raw.c, raw.hidePos === 2));
      r2.appendChild(createOp('+'));
      r2.appendChild(createCell(raw.hidePos === 3 ? '?' : raw.d, raw.hidePos === 3));
      r2.appendChild(createOp('='));
      r2.appendChild(createCell(raw.r2, false, true));
      container.appendChild(r2);

      // Bottom Column Totals
      const botRow = document.createElement('div');
      botRow.className = 'puzzle-row';
      botRow.appendChild(createCell(raw.c1, false, true));
      botRow.appendChild(createOp(''));
      botRow.appendChild(createCell(raw.c2, false, true));
      botRow.appendChild(createOp(''));
      botRow.appendChild(createOp(''));
      container.appendChild(botRow);
    }

    renderFeedback(feedback) {
      const banner = document.getElementById('gameplay-feedback-banner');
      const allButtons = document.querySelectorAll('.answer-btn');

      // Lock buttons
      allButtons.forEach((btn) => {
        btn.disabled = true;
        const val = btn.dataset.value;

        // Mark correct answer
        if (String(val).trim() === String(feedback.correctAnswer).trim()) {
          btn.classList.add('ans-correct');
        }
        // Mark wrong answer if user selected this one
        if (!feedback.isCorrect && String(val).trim() === String(feedback.selectedAnswer).trim()) {
          btn.classList.add('ans-wrong');
        }
      });

      // Update banner
      if (banner) {
        if (feedback.isCorrect) {
          banner.className = 'feedback-banner show-correct';
          banner.textContent = `CORRECT! +${feedback.pointsAwarded} PTS (${feedback.questionsSolved} SOLVED)`;
        } else if (feedback.isTimeout) {
          banner.className = 'feedback-banner show-wrong';
          banner.textContent = `⏰ TIME'S UP! RUN OVER • SAVED ${feedback.currentScore} PTS`;
        } else {
          banner.className = 'feedback-banner show-wrong';
          banner.textContent = `❌ WRONG ANSWER! RUN OVER • SAVED ${feedback.currentScore} PTS`;
        }
      }

      // Metadata update
      const elScore = document.getElementById('game-meta-score');
      const elStreak = document.getElementById('game-meta-streak');
      if (elScore) elScore.textContent = feedback.currentScore;
    }

    // =========================================================================
    // RESULTS SCREEN
    // =========================================================================
    renderResults(res) {
      const titleEl = document.getElementById('results-super-title');
      const solvedPill = document.getElementById('results-solved-pill');
      const btnAgain = document.getElementById('btn-results-again');

      if (titleEl) {
        if (res.isGameOver || res.incorrectCount > 0) {
          titleEl.textContent = 'RUN OVER • 1 WRONG INPUT';
        } else {
          titleEl.textContent = 'PERFECT RUN COMPLETE!';
        }
      }

      if (solvedPill) {
        solvedPill.textContent = `${res.correctCount} QUESTION${res.correctCount === 1 ? '' : 'S'} SOLVED`;
      }

      if (btnAgain) {
        btnAgain.textContent = (res.isGameOver || res.incorrectCount > 0) ? 'RESTART RUN ↻' : 'PLAY AGAIN ↻';
      }

      document.getElementById('results-score-value').textContent = res.score;
      document.getElementById('results-accuracy').textContent = `${res.accuracy}%`;
      document.getElementById('results-correct').textContent = res.correctCount;
      document.getElementById('results-mistakes').textContent = res.incorrectCount;
      document.getElementById('results-timeouts').textContent = res.timeoutCount;
      document.getElementById('results-speed').textContent = `${(res.avgResponseTimeMs / 1000).toFixed(1)}s`;
      document.getElementById('results-streak').textContent = res.longestStreak;

      const mistakeCountBadge = document.getElementById('results-mistake-count');
      if (mistakeCountBadge) {
        mistakeCountBadge.textContent = res.mistakes ? res.mistakes.length : 0;
      }

      const btnMistakes = document.getElementById('btn-results-mistakes');
      const resultsActions = document.querySelector('.results-actions');
      if (btnMistakes) {
        const hasMistakes = res.mistakes && res.mistakes.length > 0;
        btnMistakes.style.display = hasMistakes ? 'inline-flex' : 'none';
        if (resultsActions) {
          resultsActions.classList.toggle('no-mistakes', !hasMistakes);
        }
      }
    }

    bindResultsEvents() {
      // Play Again
      document.getElementById('btn-results-again')?.addEventListener('click', () => {
        if (this.sound) this.sound.playClick();
        this.startTrainingSession();
      });

      // Review Mistakes
      document.getElementById('btn-results-mistakes')?.addEventListener('click', () => {
        if (this.sound) this.sound.playClick();
        if (this.currentSessionResult && this.currentSessionResult.mistakes) {
          this.openMistakesModal(this.currentSessionResult.mistakes);
        }
      });

      // Home
      document.getElementById('btn-results-home')?.addEventListener('click', () => {
        if (this.sound) this.sound.playClick();
        this.navigateTo('screen-home');
      });
    }

    // =========================================================================
    // STATISTICS DASHBOARD SCREEN
    // =========================================================================
    renderStatisticsDashboard() {
      const stats = this.storage.getStatistics();
      const sessions = this.storage.getSessions();

      const elTotal = document.getElementById('stats-total-games');
      const elAcc = document.getElementById('stats-overall-acc');
      const elTime = document.getElementById('stats-avg-time');

      if (elTotal) elTotal.textContent = stats.totalGames;

      const totalAnswered = stats.correctAnswers + stats.incorrectAnswers;
      const overallAcc = totalAnswered > 0 ? Math.round((stats.correctAnswers / totalAnswered) * 100) : 0;
      if (elAcc) elAcc.textContent = `${overallAcc}%`;

      // Calculate overall avg time
      let totalTimeSum = 0;
      let totalQuestionsWithTime = 0;
      for (const cat in stats.categoryStats) {
        totalTimeSum += (stats.categoryStats[cat].totalTimeMs || 0);
        totalQuestionsWithTime += (stats.categoryStats[cat].played || 0);
      }
      const avgSec = totalQuestionsWithTime > 0 ? (totalTimeSum / totalQuestionsWithTime / 1000).toFixed(1) : '0.0';
      if (elTime) elTime.textContent = `${avgSec}s`;

      // Category Accuracy Bars
      this.renderCategoryBars(stats.categoryStats);

      // Score Trend SVG
      this.renderScoreTrendChart(sessions);
    }

    renderCategoryBars(catStats) {
      const container = document.getElementById('stats-category-bars');
      if (!container) return;
      container.innerHTML = '';

      const labels = {
        quickMath: 'Quick Math',
        advanced: 'Advanced',
        sequences: 'Sequences',
        compare: 'Compare',
        squares: 'Squares',
        puzzles: 'Math Puzzles',
        mixed: 'Mixed Sprint'
      };

      let hasAnyData = false;
      for (const cat in labels) {
        const item = catStats[cat] || { played: 0, correct: 0 };
        if (item.played > 0) hasAnyData = true;

        const acc = item.played > 0 ? Math.round((item.correct / item.played) * 100) : 0;

        const row = document.createElement('div');
        row.className = 'category-bar-row';
        row.innerHTML = `
          <div class="category-bar-meta">
            <span>${labels[cat]}</span>
            <span>${acc}% (${item.correct}/${item.played})</span>
          </div>
          <div class="category-bar-track" aria-hidden="true">
            <div class="category-bar-fill" style="width: ${acc}%;"></div>
          </div>
        `;
        container.appendChild(row);
      }

      if (!hasAnyData) {
        container.innerHTML = `<div class="empty-state">No category practice data recorded yet. Complete your first training round!</div>`;
      }
    }

    renderScoreTrendChart(sessions) {
      const container = document.getElementById('stats-trend-container');
      if (!container) return;

      if (!sessions || sessions.length === 0) {
        container.innerHTML = `<div class="empty-state">No score trend data available. Start playing to see your progress!</div>`;
        return;
      }

      // Recent 10 sessions, chronological order
      const recent = sessions.slice(0, 10).reverse();
      const scores = recent.map((s) => s.score);
      const maxScore = Math.max(...scores, 100);

      const width = 800;
      const height = 180;
      const padLeft = 40;
      const padRight = 30;
      const padTop = 24;
      const padBottom = 34;

      const plotW = width - padLeft - padRight;
      const plotH = height - padTop - padBottom;

      const points = recent.map((s, idx) => {
        const x = padLeft + (recent.length > 1 ? (idx / (recent.length - 1)) * plotW : plotW / 2);
        const y = padTop + plotH - (s.score / maxScore) * plotH;
        return { x, y, score: s.score, mode: s.gameMode };
      });

      let pathD = '';
      points.forEach((p, i) => {
        if (i === 0) pathD += `M ${p.x} ${p.y}`;
        else pathD += ` L ${p.x} ${p.y}`;
      });

      let svgHtml = `
        <svg viewBox="0 0 ${width} ${height}" class="trend-svg" xmlns="http://www.w3.org/2000/svg">
          <!-- Brutalist Grid lines -->
          <line x1="${padLeft}" y1="${padTop}" x2="${width - padRight}" y2="${padTop}" stroke="#ccc" stroke-dasharray="4,4" stroke-width="1.5" />
          <line x1="${padLeft}" y1="${padTop + plotH / 2}" x2="${width - padRight}" y2="${padTop + plotH / 2}" stroke="#ccc" stroke-dasharray="4,4" stroke-width="1.5" />
          <line x1="${padLeft}" y1="${padTop + plotH}" x2="${width - padRight}" y2="${padTop + plotH}" stroke="#050505" stroke-width="2" />

          <!-- High Score Label -->
          <text x="${padLeft - 6}" y="${padTop + 4}" font-size="11" font-weight="900" fill="#666" text-anchor="end">${maxScore}</text>
          <text x="${padLeft - 6}" y="${padTop + plotH + 4}" font-size="11" font-weight="900" fill="#666" text-anchor="end">0</text>

          <!-- Thick Brutalist Trend Line -->
          <path d="${pathD}" fill="none" stroke="#050505" stroke-width="5" stroke-linejoin="round" />
      `;

      // Data points and badges
      points.forEach((p, idx) => {
        svgHtml += `
          <!-- Hard shadow -->
          <rect x="${p.x - 6 + 2}" y="${p.y - 6 + 2}" width="12" height="12" fill="#050505" />
          <!-- Neon point -->
          <rect x="${p.x - 6}" y="${p.y - 6}" width="12" height="12" fill="#FFE66D" stroke="#050505" stroke-width="2" />
          <!-- Score tag -->
          <text x="${p.x}" y="${p.y - 10}" font-size="11" font-weight="900" fill="#050505" text-anchor="middle">${p.score}</text>
          <!-- Session index -->
          <text x="${p.x}" y="${height - 12}" font-size="10" font-weight="800" fill="#666" text-anchor="middle">#${recent.length - idx}</text>
        `;
      });

      svgHtml += `</svg>`;
      container.innerHTML = svgHtml;
    }

    bindStatsEvents() {
      document.getElementById('btn-stats-back')?.addEventListener('click', () => {
        if (this.sound) this.sound.playClick();
        this.navigateTo('screen-home');
      });
    }

    // =========================================================================
    // SESSION HISTORY SCREEN
    // =========================================================================
    renderHistoryList() {
      const container = document.getElementById('history-list-items');
      if (!container) return;

      const sessions = this.storage.getSessions();
      const modeFilter = document.getElementById('filter-game-mode')?.value || 'all';
      const diffFilter = document.getElementById('filter-difficulty')?.value || 'all';
      const sortVal = document.getElementById('sort-history')?.value || 'date-desc';

      let filtered = sessions.filter((s) => {
        if (modeFilter !== 'all' && s.gameMode !== modeFilter) return false;
        if (diffFilter !== 'all' && s.difficulty !== diffFilter) return false;
        return true;
      });

      // Sorting
      filtered.sort((a, b) => {
        if (sortVal === 'date-asc') return a.timestamp - b.timestamp;
        if (sortVal === 'score-desc') return b.score - a.score;
        return b.timestamp - a.timestamp; // date-desc default
      });

      if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-state">No matching sessions recorded. Complete a training round to build your history!</div>`;
        return;
      }

      container.innerHTML = '';
      filtered.forEach((sess) => {
        const item = document.createElement('article');
        item.className = 'history-item';

        const dateObj = new Date(sess.timestamp);
        const dateStr = dateObj.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        const hasMistakes = sess.mistakes && sess.mistakes.length > 0;

        item.innerHTML = `
          <div class="history-main-info">
            <span class="history-game-name">${sess.gameMode.toUpperCase()} &bull; ${sess.difficulty.toUpperCase()}</span>
            <span class="history-date">${dateStr}</span>
          </div>
          <div class="history-metrics">
            <div>
              <div class="history-score-val">${sess.score} PTS</div>
              <div style="font-size: 0.78rem; font-weight: 800; color: #555;">${sess.accuracy}% ACC &bull; ${(sess.avgResponseTimeMs / 1000).toFixed(1)}s AVG</div>
            </div>
            ${hasMistakes ? `<button type="button" class="btn btn-secondary btn-sm btn-hist-mistakes" style="font-size: 0.78rem; padding: 6px 10px;">Review Mistakes (${sess.mistakes.length})</button>` : ''}
          </div>
        `;

        if (hasMistakes) {
          item.querySelector('.btn-hist-mistakes')?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.sound) this.sound.playClick();
            this.openMistakesModal(sess.mistakes);
          });
        }

        container.appendChild(item);
      });
    }

    bindHistoryEvents() {
      document.getElementById('btn-history-back')?.addEventListener('click', () => {
        if (this.sound) this.sound.playClick();
        this.navigateTo('screen-home');
      });

      document.getElementById('filter-game-mode')?.addEventListener('change', () => this.renderHistoryList());
      document.getElementById('filter-difficulty')?.addEventListener('change', () => this.renderHistoryList());
      document.getElementById('sort-history')?.addEventListener('change', () => this.renderHistoryList());
    }

    // =========================================================================
    // SETTINGS SCREEN
    // =========================================================================
    bindSettingsEvents() {
      document.getElementById('btn-settings-back')?.addEventListener('click', () => {
        if (this.sound) this.sound.playClick();
        this.navigateTo('screen-home');
      });

      // Default Difficulty
      document.getElementById('setting-default-diff')?.addEventListener('change', (e) => {
        const val = e.target.value;
        this.storage.updateSettings({ difficulty: val });
        this.activeConfig.difficulty = val;
      });

      // Sound FX
      document.getElementById('setting-sound')?.addEventListener('change', (e) => {
        const checked = e.target.checked;
        if (this.sound) this.sound.setEnabled(checked);
        this.storage.updateSettings({ soundEnabled: checked });
        this.updateSoundIcon();
        if (checked && this.sound) this.sound.playClick();
      });

      // Haptics
      document.getElementById('setting-haptics')?.addEventListener('change', (e) => {
        const checked = e.target.checked;
        if (this.sound) this.sound.setHapticsEnabled(checked);
        this.storage.updateSettings({ hapticsEnabled: checked });
      });

      // Accent Swatches
      document.querySelectorAll('#theme-swatches .color-swatch').forEach((swatch) => {
        swatch.addEventListener('click', () => {
          if (this.sound) this.sound.playClick();
          const color = swatch.dataset.color;
          document.body.setAttribute('data-accent', color);
          document.querySelectorAll('#theme-swatches .color-swatch').forEach((s) => s.classList.remove('active'));
          swatch.classList.add('active');
          this.storage.updateSettings({ accentColor: color });
        });
      });

      // Reduced Motion
      document.getElementById('setting-reduced-motion')?.addEventListener('change', (e) => {
        const checked = e.target.checked;
        document.body.setAttribute('data-reduced-motion', checked ? 'true' : 'false');
        this.storage.updateSettings({ reducedMotion: checked });
      });

      // Export JSON
      document.getElementById('btn-export-json')?.addEventListener('click', () => {
        if (this.sound) this.sound.playClick();
        const jsonStr = this.storage.exportJSON();
        this.downloadFile(jsonStr, `mindsprint-backup-${Date.now()}.json`, 'application/json');
      });

      // Export CSV
      document.getElementById('btn-export-csv')?.addEventListener('click', () => {
        if (this.sound) this.sound.playClick();
        const csvStr = this.storage.exportCSV();
        this.downloadFile(csvStr, `mindsprint-history-${Date.now()}.csv`, 'text/csv');
      });

      // Import Backup
      const fileInput = document.getElementById('input-import-file');
      document.getElementById('btn-import-json')?.addEventListener('click', () => {
        if (this.sound) this.sound.playClick();
        fileInput?.click();
      });

      fileInput?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result;
          if (typeof content === 'string') {
            const res = this.storage.importJSON(content);
            if (res.success) {
              alert('Backup imported successfully!');
              this.applySavedSettings();
              this.refreshHomeStats();
            } else {
              alert(`Import failed: ${res.error}`);
            }
          }
        };
        reader.readAsText(file);
      });

      // Reset Stats
      document.getElementById('btn-reset-stats')?.addEventListener('click', () => {
        if (this.sound) this.sound.playClick();
        this.openConfirmActionModal(
          'RESET ALL STATISTICS?',
          'Are you sure you want to reset all score counters and question stats to zero? Past session logs will remain.',
          () => {
            this.storage.resetStatistics();
            this.refreshHomeStats();
          }
        );
      });

      // Clear All Data
      document.getElementById('btn-clear-all')?.addEventListener('click', () => {
        if (this.sound) this.sound.playClick();
        this.openConfirmActionModal(
          'WIPE ALL APPLICATION DATA?',
          'WARNING: This will permanently delete all session history, statistics, streaks, and custom settings. This cannot be undone!',
          () => {
            this.storage.clearAllData();
            this.applySavedSettings();
            this.refreshHomeStats();
            this.navigateTo('screen-home');
          }
        );
      });
    }

    downloadFile(content, fileName, mimeType) {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    // =========================================================================
    // MODALS & MISTAKES REVIEW
    // =========================================================================
    bindModals() {
      // Exit modal
      const exitModal = document.getElementById('modal-confirm-exit');
      const closeExit = () => exitModal?.classList.remove('active');

      document.getElementById('btn-modal-exit-close')?.addEventListener('click', closeExit);
      document.getElementById('btn-modal-exit-resume')?.addEventListener('click', closeExit);
      document.getElementById('btn-modal-exit-confirm')?.addEventListener('click', () => {
        closeExit();
        this.engine.abandonSession();
        this.navigateTo('screen-home');
      });

      // Mistakes modal
      const mistakesModal = document.getElementById('modal-review-mistakes');
      const closeMistakes = () => mistakesModal?.classList.remove('active');
      document.getElementById('btn-modal-mistakes-close')?.addEventListener('click', closeMistakes);
      document.getElementById('btn-modal-mistakes-done')?.addEventListener('click', closeMistakes);

      // Confirm Action modal
      const actionModal = document.getElementById('modal-confirm-action');
      const closeAction = () => actionModal?.classList.remove('active');
      document.getElementById('btn-modal-action-close')?.addEventListener('click', closeAction);
      document.getElementById('btn-modal-action-cancel')?.addEventListener('click', closeAction);
      document.getElementById('btn-modal-action-proceed')?.addEventListener('click', () => {
        closeAction();
        if (this.onActionConfirmCallback) {
          this.onActionConfirmCallback();
          this.onActionConfirmCallback = null;
        }
      });
    }

    openExitModal() {
      document.getElementById('modal-confirm-exit')?.classList.add('active');
    }

    openConfirmActionModal(title, message, onConfirm) {
      const modal = document.getElementById('modal-confirm-action');
      const titleEl = document.getElementById('modal-action-title');
      const msgEl = document.getElementById('modal-action-message');

      if (titleEl) titleEl.textContent = title;
      if (msgEl) msgEl.textContent = message;
      this.onActionConfirmCallback = onConfirm;

      modal?.classList.add('active');
    }

    openMistakesModal(mistakes) {
      const modal = document.getElementById('modal-review-mistakes');
      const body = document.getElementById('modal-mistakes-body');
      if (!modal || !body) return;

      if (!mistakes || mistakes.length === 0) {
        body.innerHTML = `<div class="empty-state">Flawless round! No mistakes recorded in this session.</div>`;
      } else {
        body.innerHTML = '';
        mistakes.forEach((m, idx) => {
          const card = document.createElement('div');
          card.className = 'mistake-card';
          card.innerHTML = `
            <div class="mistake-header">
              <span>#${idx + 1} &bull; ${m.category ? m.category.toUpperCase() : 'CALCULATION'}</span>
              <span>${(m.timeSpentMs / 1000).toFixed(1)}s</span>
            </div>
            <div class="mistake-expression">${m.questionDisplay}</div>
            <div class="mistake-details">
              <span class="mistake-ans-wrong">Your answer: ${m.userAnswer || 'TIMEOUT'}</span>
              <span class="mistake-ans-correct">Correct: ${m.correctAnswer}</span>
            </div>
            ${m.explanation ? `<div style="font-size: 0.8rem; font-weight: 700; color: #555; border-top: 1px dashed #ccc; padding-top: 4px;">${m.explanation}</div>` : ''}
          `;
          body.appendChild(card);
        });
      }

      modal.classList.add('active');
    }

    // =========================================================================
    // KEYBOARD NAVIGATION
    // =========================================================================
    bindKeyboardShortcuts() {
      window.addEventListener('keydown', (e) => {
        // Ignore if user is inside an input field
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
          return;
        }

        // Gameplay controls
        if (this.currentScreen === 'screen-gameplay') {
          if (e.key === 'Escape') {
            e.preventDefault();
            this.openExitModal();
            return;
          }

          // Answer shortcuts: 1-4, A-D
          const key = e.key.toLowerCase();
          const buttons = document.querySelectorAll('.answer-btn:not(:disabled)');
          if (buttons.length === 0) return;

          let targetIdx = -1;
          if (key === '1' || key === 'a') targetIdx = 0;
          else if (key === '2' || key === 'b') targetIdx = 1;
          else if (key === '3' || key === 'c') targetIdx = 2;
          else if (key === '4' || key === 'd') targetIdx = 3;

          // For compare mode shortcuts: > = <
          if (key === '>' || (key === 'arrowleft' && buttons.length === 3)) targetIdx = 0;
          if (key === '=' || (key === 'arrowdown' && buttons.length === 3)) targetIdx = 1;
          if (key === '<' || (key === 'arrowright' && buttons.length === 3)) targetIdx = 2;

          if (targetIdx >= 0 && targetIdx < buttons.length) {
            e.preventDefault();
            const btn = buttons[targetIdx];
            btn.classList.add('pressed');
            setTimeout(() => btn.classList.remove('pressed'), 120);
            const val = btn.dataset.value;
            this.engine.submitAnswer(val);
          }
        }
      });
    }

    // =========================================================================
    // GLOBAL HEADER & FOOTER NAVIGATION
    // =========================================================================
    bindNavigation() {
      const navHome = () => {
        if (this.sound) this.sound.playClick();
        if (this.currentScreen === 'screen-gameplay') {
          this.openExitModal();
        } else {
          this.navigateTo('screen-home');
        }
      };

      document.getElementById('btn-nav-home')?.addEventListener('click', navHome);
      document.getElementById('link-footer-home')?.addEventListener('click', navHome);

      const navStats = () => {
        if (this.sound) this.sound.playClick();
        this.navigateTo('screen-stats');
      };
      document.getElementById('btn-nav-stats')?.addEventListener('click', navStats);
      document.getElementById('link-footer-stats')?.addEventListener('click', navStats);

      const navHistory = () => {
        if (this.sound) this.sound.playClick();
        this.navigateTo('screen-history');
      };
      document.getElementById('btn-nav-history')?.addEventListener('click', navHistory);
      document.getElementById('link-footer-history')?.addEventListener('click', navHistory);

      const navSettings = () => {
        if (this.sound) this.sound.playClick();
        this.navigateTo('screen-settings');
      };
      document.getElementById('btn-nav-settings')?.addEventListener('click', navSettings);
      document.getElementById('link-footer-settings')?.addEventListener('click', navSettings);

      const navRules = () => {
        if (this.sound) this.sound.playClick();
        this.navigateTo('screen-rules');
      };
      document.getElementById('btn-rules-back')?.addEventListener('click', navHome);
      document.getElementById('link-footer-rules')?.addEventListener('click', navRules);
    }

    // =========================================================================
    // PWA INSTALLATION CONTROLLER
    // =========================================================================
    bindPWAInstall() {
      const headerInstallBtn = document.getElementById('btn-header-install');
      const homeInstallBanner = document.getElementById('home-install-banner');
      const homeInstallBtn = document.getElementById('btn-home-install');
      const settingsInstallBtn = document.getElementById('btn-settings-install');
      const pwaStatusInstalled = document.getElementById('pwa-status-installed');
      const installModal = document.getElementById('modal-install-guide');
      const modalInstallContent = document.getElementById('modal-install-content');
      const btnModalClose = document.getElementById('btn-modal-install-close');
      const btnModalDone = document.getElementById('btn-modal-install-done');

      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                           window.navigator.standalone === true || 
                           document.referrer.includes('android-app://');

      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

      const updateUIState = (canPrompt = false) => {
        if (isStandalone) {
          if (headerInstallBtn) headerInstallBtn.style.display = 'none';
          if (homeInstallBanner) homeInstallBanner.style.display = 'none';
          if (settingsInstallBtn) settingsInstallBtn.style.display = 'none';
          if (pwaStatusInstalled) pwaStatusInstalled.style.display = 'inline-flex';
          return;
        }

        if (pwaStatusInstalled) pwaStatusInstalled.style.display = 'none';

        if (canPrompt || isIOS) {
          if (headerInstallBtn) headerInstallBtn.style.display = 'inline-flex';
          if (homeInstallBanner) homeInstallBanner.style.display = 'flex';
          if (settingsInstallBtn) settingsInstallBtn.style.display = 'inline-flex';
        }
      };

      const openInstallGuide = () => {
        if (!installModal || !modalInstallContent) return;
        if (isIOS) {
          modalInstallContent.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 14px; font-weight: 700;">
              <p style="font-size: 1rem; color: var(--text-dark);">
                To install <strong>MindSprint</strong> on your iPhone or iPad:
              </p>
              <ol style="margin-left: 20px; display: flex; flex-direction: column; gap: 10px; font-size: 0.95rem; color: var(--text-dark);">
                <li>Tap the <strong>Share</strong> button <span style="font-size: 1.2rem;">⎋</span> at the bottom of Safari.</li>
                <li>Scroll down and tap <strong>"Add to Home Screen"</strong> <span style="background: var(--surface-dark); color: #fff; padding: 1px 6px; border-radius: 4px;">[+]</span>.</li>
                <li>Tap <strong>Add</strong> in the top-right corner.</li>
              </ol>
              <div style="background: var(--surface-muted); padding: 10px 14px; border-radius: var(--radius-btn); border: 2px solid var(--border-color); font-size: 0.85rem; color: #333;">
                ⚡ MindSprint will launch in fullscreen with instant offline loading!
              </div>
            </div>
          `;
        } else {
          modalInstallContent.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 14px; font-weight: 700;">
              <p style="font-size: 1rem; color: var(--text-dark);">
                To install <strong>MindSprint</strong> on your browser or device:
              </p>
              <ol style="margin-left: 20px; display: flex; flex-direction: column; gap: 10px; font-size: 0.95rem; color: var(--text-dark);">
                <li>Look for the <strong>Install App</strong> icon on the right side of your address bar.</li>
                <li>Or open your browser menu <span style="background: var(--surface-dark); color: #fff; padding: 1px 6px; border-radius: 4px;">⋮</span> and select <strong>"Install MindSprint"</strong>.</li>
              </ol>
              <div style="background: var(--surface-muted); padding: 10px 14px; border-radius: var(--radius-btn); border: 2px solid var(--border-color); font-size: 0.85rem; color: #333;">
                ⚡ Installs instantly to your desktop or home screen for offline practice.
              </div>
            </div>
          `;
        }
        installModal.classList.add('active');
      };

      const triggerInstallPrompt = async () => {
        if (this.sound) this.sound.playClick();
        if (window.deferredInstallPrompt) {
          try {
            window.deferredInstallPrompt.prompt();
            const choiceResult = await window.deferredInstallPrompt.userChoice;
            if (choiceResult && choiceResult.outcome === 'accepted') {
              console.log('[MindSprint PWA] User accepted installation prompt');
              if (headerInstallBtn) headerInstallBtn.style.display = 'none';
              if (homeInstallBanner) homeInstallBanner.style.display = 'none';
              if (settingsInstallBtn) settingsInstallBtn.style.display = 'none';
            }
          } catch (e) {
            console.warn('[MindSprint PWA] Install prompt error:', e);
            openInstallGuide();
          } finally {
            window.deferredInstallPrompt = null;
          }
        } else {
          openInstallGuide();
        }
      };

      headerInstallBtn?.addEventListener('click', triggerInstallPrompt);
      homeInstallBtn?.addEventListener('click', triggerInstallPrompt);
      settingsInstallBtn?.addEventListener('click', triggerInstallPrompt);

      const closeGuide = () => installModal?.classList.remove('active');
      btnModalClose?.addEventListener('click', closeGuide);
      btnModalDone?.addEventListener('click', closeGuide);

      window.addEventListener('pwa-prompt-ready', () => {
        updateUIState(true);
      });

      if (window.deferredInstallPrompt) {
        updateUIState(true);
      } else if (isIOS && !isStandalone) {
        updateUIState(true);
      } else {
        updateUIState(false);
      }

      window.addEventListener('appinstalled', () => {
        console.log('[MindSprint PWA] App was successfully installed');
        window.deferredInstallPrompt = null;
        if (headerInstallBtn) headerInstallBtn.style.display = 'none';
        if (homeInstallBanner) homeInstallBanner.style.display = 'none';
        if (settingsInstallBtn) settingsInstallBtn.style.display = 'none';
        if (pwaStatusInstalled) pwaStatusInstalled.style.display = 'inline-flex';
      });
    }
  }

  return new UIController();
});
