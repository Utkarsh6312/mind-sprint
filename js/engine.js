/**
 * MindSprint Game Engine
 * Dynamic decreasing timer per calculation, points based on questions solved,
 * Sudden Death (ends and saves points on 1 wrong input), FSM, and session tracking.
 */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MindSprintEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  const STATES = {
    IDLE: 'IDLE',
    READY: 'READY',
    PLAYING: 'PLAYING',
    FEEDBACK: 'FEEDBACK',
    COMPLETED: 'COMPLETED',
    ABANDONED: 'ABANDONED'
  };

  class GameEngine {
    constructor(dependencies = {}) {
      this.storage = dependencies.storage || (typeof MindSprintStorage !== 'undefined' ? MindSprintStorage : null);
      this.sound = dependencies.sound || (typeof MindSprintSound !== 'undefined' ? MindSprintSound : null);
      this.generators = dependencies.generators || (typeof MindSprintGenerators !== 'undefined' ? MindSprintGenerators : null);

      this.state = STATES.IDLE;

      // Active session parameters
      this.gameMode = 'quickMath';
      this.difficulty = 'medium';
      this.roundLength = 10;
      this.baseTimeLimitSec = 15; // Starting time per question
      this.timeLimitSec = 15;     // Current time per question (decreases slowly)
      this.quickMathOps = ['add', 'sub', 'mul', 'div'];

      // Session run-time stats
      this.questionIndex = 0;
      this.currentQuestion = null;
      this.score = 0;
      this.currentStreak = 0;
      this.longestStreak = 0;
      this.correctCount = 0;
      this.incorrectCount = 0;
      this.timeoutCount = 0;
      this.responseTimes = [];
      this.mistakes = [];

      // Timer internals
      this.timerInterval = null;
      this.feedbackTimeout = null;
      this.questionStartTime = 0;
      this.allowedMs = 0;
      this.hasPlayedLowTimeTick = false;

      // Listeners
      this.listeners = {
        stateChange: [],
        tick: [],
        question: [],
        feedback: [],
        completed: []
      };
    }

    on(event, callback) {
      if (this.listeners[event]) {
        this.listeners[event].push(callback);
      }
    }

    emit(event, ...args) {
      if (this.listeners[event]) {
        for (const cb of this.listeners[event]) {
          try {
            cb(...args);
          } catch (e) {
            console.error(`[Engine] Listener error on ${event}:`, e);
          }
        }
      }
    }

    setState(newState) {
      const prev = this.state;
      this.state = newState;
      this.emit('stateChange', newState, prev);
    }

    /**
     * Start a new game session
     */
    startSession(config = {}) {
      this.cleanupTimers();

      this.gameMode = config.gameMode || 'quickMath';
      this.difficulty = config.difficulty || 'medium';
      this.roundLength = config.roundLength !== undefined ? config.roundLength : 10;
      this.baseTimeLimitSec = config.timeLimitSec !== undefined ? config.timeLimitSec : 15;
      this.timeLimitSec = this.baseTimeLimitSec;
      this.quickMathOps = config.quickMathOps || ['add', 'sub', 'mul', 'div'];

      this.questionIndex = 0;
      this.currentQuestion = null;
      this.score = 0;
      this.currentStreak = 0;
      this.longestStreak = 0;
      this.correctCount = 0;
      this.incorrectCount = 0;
      this.timeoutCount = 0;
      this.responseTimes = [];
      this.mistakes = [];

      this.setState(STATES.READY);
      this.nextQuestion();
    }

    /**
     * Advance to the next question or complete session
     */
    nextQuestion() {
      this.cleanupTimers();

      if (this.roundLength > 0 && this.questionIndex >= this.roundLength) {
        this.finishSession();
        return;
      }

      this.questionIndex += 1;
      this.currentQuestion = this.generateQuestion();

      // Decrease the time after every calculation slowly:
      // Decreases by 0.4s for every correct answer solved down to a floor of 2.5s
      if (this.baseTimeLimitSec > 0) {
        const decayPerQuestion = 0.4;
        const minTimeSec = 2.5;
        this.timeLimitSec = Math.max(minTimeSec, +(this.baseTimeLimitSec - (this.correctCount * decayPerQuestion)).toFixed(1));
        this.allowedMs = Math.round(this.timeLimitSec * 1000);
      } else {
        this.allowedMs = 0;
      }

      this.questionStartTime = Date.now();
      this.hasPlayedLowTimeTick = false;

      this.setState(STATES.PLAYING);

      this.emit('question', {
        question: this.currentQuestion,
        questionIndex: this.questionIndex,
        totalQuestions: this.roundLength,
        score: this.score,
        currentStreak: this.currentStreak,
        timeLimitSec: this.timeLimitSec,
        baseTimeLimitSec: this.baseTimeLimitSec,
        questionsSolved: this.correctCount
      });

      if (this.allowedMs > 0) {
        this.startTimer();
      } else {
        this.emit('tick', { remainingMs: 0, totalMs: 0, percent: 100, isUntimed: true, isLowTime: false });
      }
    }

    generateQuestion() {
      const diff = this.difficulty;
      switch (this.gameMode) {
        case 'quickMath':
          return this.generators.QuickMath.generate(diff, this.quickMathOps);
        case 'advanced':
          return this.generators.AdvancedMath.generate(diff);
        case 'sequences':
          return this.generators.NumberSequences.generate(diff);
        case 'compare':
          return this.generators.Comparison.generate(diff);
        case 'squares':
          return this.generators.Squares.generate(diff);
        case 'puzzles':
          return this.generators.MathPuzzles.generate(diff);
        case 'mixed':
        default:
          return this.generators.MixedSprint.generate(diff, { quickMathOps: this.quickMathOps });
      }
    }

    startTimer() {
      const tick = () => {
        if (this.state !== STATES.PLAYING) return;
        const now = Date.now();
        const elapsed = now - this.questionStartTime;
        const remainingMs = Math.max(0, this.allowedMs - elapsed);
        const percent = Math.min(100, Math.max(0, (remainingMs / this.allowedMs) * 100));
        const isLowTime = remainingMs <= (this.allowedMs * 0.20) && remainingMs > 0;

        if (isLowTime && !this.hasPlayedLowTimeTick && remainingMs < 3000) {
          if (this.sound) this.sound.playTick();
        }

        this.emit('tick', {
          remainingMs,
          totalMs: this.allowedMs,
          percent,
          isLowTime,
          isUntimed: false,
          currentAllowedSec: this.timeLimitSec
        });

        if (remainingMs <= 0) {
          this.handleTimeout();
        }
      };

      tick();
      this.timerInterval = setInterval(tick, 50);
    }

    /**
     * Submit an answer choice
     */
    submitAnswer(selectedAnswer) {
      if (this.state !== STATES.PLAYING) return;
      this.cleanupTimers();
      this.setState(STATES.FEEDBACK);

      const responseTimeMs = Date.now() - this.questionStartTime;
      this.responseTimes.push(responseTimeMs);

      const isCorrect = String(selectedAnswer).trim() === String(this.currentQuestion.correctAnswer).trim();

      let pointsAwarded = 0;
      let speedBonus = 0;
      let streakBonus = 0;

      if (isCorrect) {
        this.correctCount += 1;
        this.currentStreak += 1;
        if (this.currentStreak > this.longestStreak) {
          this.longestStreak = this.currentStreak;
        }

        // Points based on questions solved & remaining time on shrinking clock
        const basePoints = 100; // 100 base points per question solved
        if (this.allowedMs > 0) {
          const remainingTime = Math.max(0, this.allowedMs - responseTimeMs);
          speedBonus = Math.round(50 * (remainingTime / this.allowedMs));
          // Clutch speed bonus when time limit has decayed under 6s
          if (this.timeLimitSec < 6.0) {
            speedBonus += Math.round((6.0 - this.timeLimitSec) * 10);
          }
        } else {
          speedBonus = 25; // fixed speed bonus for untimed
        }
        streakBonus = Math.min(this.currentStreak * 5, 25);
        pointsAwarded = basePoints + speedBonus + streakBonus;
        this.score += pointsAwarded;

        if (this.sound) this.sound.playCorrect();

        this.emit('feedback', {
          isCorrect: true,
          isTimeout: false,
          isGameOver: false,
          selectedAnswer,
          correctAnswer: this.currentQuestion.correctAnswer,
          correctAnswerDisplay: this.currentQuestion.correctAnswerDisplay,
          pointsAwarded,
          speedBonus,
          streakBonus,
          currentScore: this.score,
          currentStreak: this.currentStreak,
          questionsSolved: this.correctCount
        });

        // Advance to next question with shorter time
        const delay = 800;
        this.feedbackTimeout = setTimeout(() => {
          this.nextQuestion();
        }, delay);
      } else {
        // ONE WRONG INPUT -> END RUN IMMEDIATELY & SAVE POINTS!
        this.incorrectCount += 1;
        this.currentStreak = 0;

        this.mistakes.push({
          questionDisplay: this.currentQuestion.expression,
          userAnswer: String(selectedAnswer),
          correctAnswer: this.currentQuestion.correctAnswerDisplay,
          timeSpentMs: responseTimeMs,
          category: this.currentQuestion.category,
          explanation: this.currentQuestion.explanation,
          timedOut: false
        });

        if (this.sound) this.sound.playWrong();

        this.emit('feedback', {
          isCorrect: false,
          isTimeout: false,
          isGameOver: true,
          selectedAnswer,
          correctAnswer: this.currentQuestion.correctAnswer,
          correctAnswerDisplay: this.currentQuestion.correctAnswerDisplay,
          pointsAwarded: 0,
          speedBonus: 0,
          streakBonus: 0,
          currentScore: this.score,
          currentStreak: 0,
          questionsSolved: this.correctCount
        });

        // Save session & points immediately and transition to results
        this.feedbackTimeout = setTimeout(() => {
          this.finishSession();
        }, 1300);
      }
    }

    /**
     * Handle timer timeout — counts as wrong input -> ends run and saves points
     */
    handleTimeout() {
      if (this.state !== STATES.PLAYING) return;
      this.cleanupTimers();
      this.setState(STATES.FEEDBACK);

      const responseTimeMs = this.allowedMs;
      this.responseTimes.push(responseTimeMs);

      this.timeoutCount += 1;
      this.incorrectCount += 1;
      this.currentStreak = 0;

      this.mistakes.push({
        questionDisplay: this.currentQuestion.expression,
        userAnswer: 'TIME OUT',
        correctAnswer: this.currentQuestion.correctAnswerDisplay,
        timeSpentMs: responseTimeMs,
        category: this.currentQuestion.category,
        explanation: this.currentQuestion.explanation,
        timedOut: true
      });

      if (this.sound) this.sound.playWrong();

      this.emit('feedback', {
        isCorrect: false,
        isTimeout: true,
        isGameOver: true,
        selectedAnswer: null,
        correctAnswer: this.currentQuestion.correctAnswer,
        correctAnswerDisplay: this.currentQuestion.correctAnswerDisplay,
        pointsAwarded: 0,
        speedBonus: 0,
        streakBonus: 0,
        currentScore: this.score,
        currentStreak: 0,
        questionsSolved: this.correctCount
      });

      // Save points and finish session on timeout
      this.feedbackTimeout = setTimeout(() => {
        this.finishSession();
      }, 1400);
    }

    /**
     * Finish session and persist results
     */
    finishSession() {
      this.cleanupTimers();
      this.setState(STATES.COMPLETED);

      const totalTime = this.responseTimes.reduce((acc, v) => acc + v, 0);
      const avgResponseTimeMs = this.responseTimes.length > 0 ? Math.round(totalTime / this.responseTimes.length) : 0;
      const questionsAttempted = this.correctCount + this.incorrectCount;
      const accuracy = questionsAttempted > 0 ? Math.round((this.correctCount / questionsAttempted) * 100) : 0;

      const sessionResult = {
        id: `sess_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        timestamp: Date.now(),
        dateISO: new Date().toISOString(),
        gameMode: this.gameMode,
        difficulty: this.difficulty,
        score: this.score,
        totalQuestions: questionsAttempted,
        correctCount: this.correctCount,
        incorrectCount: this.incorrectCount,
        timeoutCount: this.timeoutCount,
        accuracy,
        avgResponseTimeMs,
        longestStreak: this.longestStreak,
        mistakes: this.mistakes,
        isGameOver: this.incorrectCount > 0
      };

      if (this.storage) {
        this.storage.recordSession(sessionResult);
      }

      if (this.sound) {
        if (this.incorrectCount === 0) {
          this.sound.playComplete();
        }
      }

      this.emit('completed', sessionResult);
    }

    /**
     * Abandon current session (does NOT record as completed)
     */
    abandonSession() {
      this.cleanupTimers();
      this.setState(STATES.ABANDONED);
    }

    cleanupTimers() {
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
      if (this.feedbackTimeout) {
        clearTimeout(this.feedbackTimeout);
        this.feedbackTimeout = null;
      }
    }
  }

  return {
    STATES,
    GameEngine
  };
});
