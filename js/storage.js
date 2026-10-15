/**
 * MindSprint Storage Layer
 * Versioned schema, migration, validation, streak calculation, import/export.
 */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MindSprintStorage = factory();
  }
})(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  const STORAGE_KEY = 'mindsprint_v1';
  const CURRENT_SCHEMA_VERSION = 1;
  const MAX_SESSION_HISTORY = 200;

  const DEFAULT_SETTINGS = {
    difficulty: 'medium',        // 'easy' | 'medium' | 'hard' | 'expert'
    roundLength: 10,             // 5 | 10 | 20 | 50
    timeLimit: 15,               // 5 | 10 | 15 | 30 | 0 (0 = untimed)
    soundEnabled: true,
    hapticsEnabled: true,
    theme: 'dark',
    accentColor: 'yellow',       // 'yellow' | 'lime' | 'pink' | 'cyan' | 'purple' | 'orange'
    reducedMotion: false,
    density: 'normal',           // 'normal' | 'compact'
    quickMathOps: ['add', 'sub', 'mul', 'div']
  };

  const DEFAULT_STATS = {
    bestScore: 0,
    totalGames: 0,
    questionsSolved: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
    timeouts: 0,
    longestStreak: 0,
    dayStreak: 0,
    lastPracticeDate: null,
    categoryStats: {
      quickMath: { played: 0, correct: 0, totalTimeMs: 0 },
      advanced: { played: 0, correct: 0, totalTimeMs: 0 },
      sequences: { played: 0, correct: 0, totalTimeMs: 0 },
      compare: { played: 0, correct: 0, totalTimeMs: 0 },
      squares: { played: 0, correct: 0, totalTimeMs: 0 },
      puzzles: { played: 0, correct: 0, totalTimeMs: 0 },
      mixed: { played: 0, correct: 0, totalTimeMs: 0 }
    }
  };

  function createInitialState() {
    return {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),
      statistics: JSON.parse(JSON.stringify(DEFAULT_STATS)),
      sessions: []
    };
  }

  function getISODateString(d = new Date()) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function getDaysBetween(dateStrA, dateStrB) {
    if (!dateStrA || !dateStrB) return Infinity;
    const [y1, m1, d1] = dateStrA.split('-').map(Number);
    const [y2, m2, d2] = dateStrB.split('-').map(Number);
    const date1 = new Date(Date.UTC(y1, m1 - 1, d1));
    const date2 = new Date(Date.UTC(y2, m2 - 1, d2));
    const diffMs = date2.getTime() - date1.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  }

  class StorageManager {
    constructor() {
      this.state = this.load();
    }

    /**
     * Safe loading with corruption fallback and schema migration
     */
    load() {
      try {
        if (typeof localStorage === 'undefined') {
          return createInitialState();
        }
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
          const init = createInitialState();
          this.save(init);
          return init;
        }
        const parsed = JSON.parse(raw);
        return this.migrateAndSanitize(parsed);
      } catch (err) {
        console.error('[MindSprintStorage] Corrupted storage detected, using defaults:', err);
        const fallback = createInitialState();
        return fallback;
      }
    }

    save(dataToSave) {
      const data = dataToSave || this.state;
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        }
        this.state = data;
        return true;
      } catch (err) {
        console.error('[MindSprintStorage] Failed to save state to localStorage:', err);
        return false;
      }
    }

    migrateAndSanitize(data) {
      if (!data || typeof data !== 'object') {
        return createInitialState();
      }

      // Schema version check and migration hooks if needed
      let version = data.schemaVersion || 1;
      const clean = createInitialState();

      // Merge settings safely
      if (data.settings && typeof data.settings === 'object') {
        clean.settings = Object.assign({}, DEFAULT_SETTINGS, data.settings);
        // Validate specific fields
        const validDiffs = ['easy', 'medium', 'hard', 'expert'];
        if (!validDiffs.includes(clean.settings.difficulty)) clean.settings.difficulty = 'medium';
        if (typeof clean.settings.roundLength !== 'number' || clean.settings.roundLength <= 0) clean.settings.roundLength = 10;
        if (typeof clean.settings.timeLimit !== 'number' || clean.settings.timeLimit < 0) clean.settings.timeLimit = 15;
        if (!Array.isArray(clean.settings.quickMathOps) || clean.settings.quickMathOps.length === 0) {
          clean.settings.quickMathOps = ['add', 'sub', 'mul', 'div'];
        }
      }

      // Merge statistics safely
      if (data.statistics && typeof data.statistics === 'object') {
        const s = data.statistics;
        clean.statistics.bestScore = Math.max(0, Number(s.bestScore) || 0);
        clean.statistics.totalGames = Math.max(0, Number(s.totalGames) || 0);
        clean.statistics.questionsSolved = Math.max(0, Number(s.questionsSolved) || 0);
        clean.statistics.correctAnswers = Math.max(0, Number(s.correctAnswers) || 0);
        clean.statistics.incorrectAnswers = Math.max(0, Number(s.incorrectAnswers) || 0);
        clean.statistics.timeouts = Math.max(0, Number(s.timeouts) || 0);
        clean.statistics.longestStreak = Math.max(0, Number(s.longestStreak) || 0);
        clean.statistics.dayStreak = Math.max(0, Number(s.dayStreak) || 0);
        clean.statistics.lastPracticeDate = typeof s.lastPracticeDate === 'string' ? s.lastPracticeDate : null;

        // Categories
        if (s.categoryStats && typeof s.categoryStats === 'object') {
          for (const cat in clean.statistics.categoryStats) {
            if (s.categoryStats[cat]) {
              clean.statistics.categoryStats[cat] = {
                played: Math.max(0, Number(s.categoryStats[cat].played) || 0),
                correct: Math.max(0, Number(s.categoryStats[cat].correct) || 0),
                totalTimeMs: Math.max(0, Number(s.categoryStats[cat].totalTimeMs) || 0)
              };
            }
          }
        }
      }

      // Merge sessions safely
      if (Array.isArray(data.sessions)) {
        clean.sessions = data.sessions.slice(0, MAX_SESSION_HISTORY).map((sess) => {
          return {
            id: String(sess.id || `sess_${Date.now()}`),
            timestamp: Number(sess.timestamp) || Date.now(),
            dateISO: String(sess.dateISO || new Date().toISOString()),
            gameMode: String(sess.gameMode || 'quickMath'),
            difficulty: String(sess.difficulty || 'medium'),
            score: Math.max(0, Number(sess.score) || 0),
            totalQuestions: Math.max(0, Number(sess.totalQuestions) || 0),
            correctCount: Math.max(0, Number(sess.correctCount) || 0),
            incorrectCount: Math.max(0, Number(sess.incorrectCount) || 0),
            timeoutCount: Math.max(0, Number(sess.timeoutCount) || 0),
            accuracy: Math.min(100, Math.max(0, Number(sess.accuracy) || 0)),
            avgResponseTimeMs: Math.max(0, Number(sess.avgResponseTimeMs) || 0),
            longestStreak: Math.max(0, Number(sess.longestStreak) || 0),
            isGameOver: !!sess.isGameOver,
            mistakes: Array.isArray(sess.mistakes) ? sess.mistakes.slice(0, 50) : []
          };
        });
      }

      return clean;
    }

    getSettings() {
      return Object.assign({}, this.state.settings);
    }

    updateSettings(partial) {
      if (!partial || typeof partial !== 'object') return false;
      this.state.settings = Object.assign({}, this.state.settings, partial);
      return this.save();
    }

    getStatistics() {
      return JSON.parse(JSON.stringify(this.state.statistics));
    }

    getSessions() {
      return JSON.parse(JSON.stringify(this.state.sessions));
    }

    /**
     * Updates consecutive calendar day streak
     */
    updateDayStreak(targetDateStr = null) {
      const today = targetDateStr || getISODateString();
      const stats = this.state.statistics;

      if (!stats.lastPracticeDate) {
        stats.dayStreak = 1;
        stats.lastPracticeDate = today;
      } else if (stats.lastPracticeDate === today) {
        // Already practiced today, keep existing streak
      } else {
        const diffDays = getDaysBetween(stats.lastPracticeDate, today);
        if (diffDays === 1) {
          stats.dayStreak += 1;
        } else if (diffDays > 1) {
          stats.dayStreak = 1;
        }
        stats.lastPracticeDate = today;
      }
    }

    /**
     * Record a fully completed session
     */
    recordSession(sessionResult) {
      if (!sessionResult || typeof sessionResult !== 'object') return false;

      const stats = this.state.statistics;
      const todayStr = getISODateString(new Date(sessionResult.timestamp || Date.now()));

      // Update streaks
      this.updateDayStreak(todayStr);

      stats.totalGames += 1;
      stats.questionsSolved += (sessionResult.totalQuestions || 0);
      stats.correctAnswers += (sessionResult.correctCount || 0);
      stats.incorrectAnswers += (sessionResult.incorrectCount || 0);
      stats.timeouts += (sessionResult.timeoutCount || 0);

      if ((sessionResult.score || 0) > stats.bestScore) {
        stats.bestScore = sessionResult.score;
      }

      if ((sessionResult.longestStreak || 0) > stats.longestStreak) {
        stats.longestStreak = sessionResult.longestStreak;
      }

      // Update category metrics
      const mode = sessionResult.gameMode || 'quickMath';
      if (!stats.categoryStats[mode]) {
        stats.categoryStats[mode] = { played: 0, correct: 0, totalTimeMs: 0 };
      }
      stats.categoryStats[mode].played += (sessionResult.totalQuestions || 0);
      stats.categoryStats[mode].correct += (sessionResult.correctCount || 0);
      stats.categoryStats[mode].totalTimeMs += ((sessionResult.avgResponseTimeMs || 0) * (sessionResult.totalQuestions || 0));

      // Append session to front
      const cleanSession = {
        id: sessionResult.id || `sess_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        timestamp: sessionResult.timestamp || Date.now(),
        dateISO: sessionResult.dateISO || new Date().toISOString(),
        gameMode: sessionResult.gameMode,
        difficulty: sessionResult.difficulty,
        score: Math.max(0, sessionResult.score || 0),
        totalQuestions: sessionResult.totalQuestions || 0,
        correctCount: sessionResult.correctCount || 0,
        incorrectCount: sessionResult.incorrectCount || 0,
        timeoutCount: sessionResult.timeoutCount || 0,
        accuracy: sessionResult.totalQuestions > 0 ? Math.round((sessionResult.correctCount / sessionResult.totalQuestions) * 100) : 0,
        avgResponseTimeMs: Math.round(sessionResult.avgResponseTimeMs || 0),
        longestStreak: sessionResult.longestStreak || 0,
        isGameOver: !!sessionResult.isGameOver,
        mistakes: sessionResult.mistakes || []
      };

      this.state.sessions.unshift(cleanSession);
      if (this.state.sessions.length > MAX_SESSION_HISTORY) {
        this.state.sessions = this.state.sessions.slice(0, MAX_SESSION_HISTORY);
      }

      return this.save();
    }

    /**
     * Reset statistics only
     */
    resetStatistics() {
      this.state.statistics = JSON.parse(JSON.stringify(DEFAULT_STATS));
      return this.save();
    }

    /**
     * Reset settings to defaults
     */
    resetSettings() {
      this.state.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
      return this.save();
    }

    /**
     * Clear all data including sessions and stats
     */
    clearAllData() {
      this.state = createInitialState();
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (e) {}
      return this.save();
    }

    /**
     * Export data as JSON string
     */
    exportJSON() {
      return JSON.stringify(this.state, null, 2);
    }

    /**
     * Validate and import JSON string
     */
    importJSON(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('Invalid JSON structure: Root must be an object');
        }
        if (parsed.schemaVersion && typeof parsed.schemaVersion !== 'number') {
          throw new Error('Invalid schemaVersion format');
        }
        const validated = this.migrateAndSanitize(parsed);
        this.state = validated;
        this.save();
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }

    /**
     * Export history as CSV
     */
    exportCSV() {
      const headers = [
        'ID',
        'Date',
        'Game Mode',
        'Difficulty',
        'Score',
        'Questions',
        'Correct',
        'Incorrect',
        'Timeouts',
        'Accuracy %',
        'Avg Response Time (ms)',
        'Longest Streak'
      ];

      const rows = this.state.sessions.map((s) => [
        `"${s.id}"`,
        `"${s.dateISO}"`,
        `"${s.gameMode}"`,
        `"${s.difficulty}"`,
        s.score,
        s.totalQuestions,
        s.correctCount,
        s.incorrectCount,
        s.timeoutCount,
        s.accuracy,
        s.avgResponseTimeMs,
        s.longestStreak
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
      return csvContent;
    }
  }

  return new StorageManager();
});
