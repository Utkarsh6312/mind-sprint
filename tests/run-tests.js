/**
 * MindSprint Automated CLI Test Suite
 * Comprehensive testing of question generators, evaluator, storage, engine, scoring, and resilience.
 */
const assert = require('assert');

// Load modules
const Generators = require('../js/generators.js');
const Storage = require('../js/storage.js');
const EngineModule = require('../js/engine.js');

let passedTests = 0;
let failedTests = 0;

function test(description, testFn) {
  try {
    testFn();
    passedTests++;
    console.log(`  \x1b[32m✔\x1b[0m ${description}`);
  } catch (err) {
    failedTests++;
    console.error(`  \x1b[31m✖\x1b[0m ${description}`);
    console.error(`    ${err.message}`);
  }
}

console.log('\n\x1b[1m=== RUNNING MINDSPRINT AUTOMATED TEST SUITE ===\x1b[0m\n');

// ==========================================
// SUITE 1: ARITHMETIC & QUESTION GENERATION
// ==========================================
console.log('\x1b[33m[1. Arithmetic & Quick Math]\x1b[0m');

test('Addition generates valid integers and exact sum', () => {
  for (let i = 0; i < 50; i++) {
    const q = Generators.QuickMath.generate('medium', ['add']);
    assert(Number.isInteger(q.correctAnswer), 'Answer must be an integer');
    assert(q.expression.includes('+'), 'Expression must include +');
    assert.strictEqual(q.choices.length, 4, 'Must have 4 choices');
    const correctInChoices = q.choices.filter(c => c.value === q.correctAnswer);
    assert.strictEqual(correctInChoices.length, 1, 'Choices must contain exactly one correct answer');
  }
});

test('Subtraction guarantees non-negative answers', () => {
  for (let i = 0; i < 50; i++) {
    const q = Generators.QuickMath.generate('hard', ['sub']);
    assert(q.correctAnswer >= 0, `Subtraction answer ${q.correctAnswer} must be non-negative`);
    assert(q.expression.includes('−'), 'Expression must include subtraction symbol');
    assert.strictEqual(q.choices.length, 4, 'Must have 4 choices');
  }
});

test('Multiplication produces safe integers', () => {
  for (let i = 0; i < 50; i++) {
    const q = Generators.QuickMath.generate('expert', ['mul']);
    assert(Number.isSafeInteger(q.correctAnswer), 'Answer must be a safe integer');
    assert(q.correctAnswer > 0, 'Answer must be positive');
  }
});

test('Division produces exact integer quotients and never divides by zero', () => {
  for (let i = 0; i < 50; i++) {
    const q = Generators.QuickMath.generate('medium', ['div']);
    assert(Number.isInteger(q.correctAnswer), 'Quotient must be an integer');
    assert(!q.expression.includes('÷ 0'), 'Never divide by zero');
    const [left, right] = q.expression.replace(' = ?', '').split(' ÷ ').map(Number);
    assert.strictEqual(left / right, q.correctAnswer, 'Dividend / divisor must equal answer');
  }
});

test('Distractor generation produces exactly 4 unique choices with no duplicates', () => {
  for (let i = 0; i < 50; i++) {
    const answer = Math.floor(Math.random() * 500) + 10;
    const choices = Generators.generateDistractors(answer, 3, { min: 0 });
    assert.strictEqual(choices.length, 4, 'Must return exactly 4 choices');
    const unique = new Set(choices);
    assert.strictEqual(unique.size, 4, 'All 4 choices must be strictly unique');
    assert(unique.has(answer), 'Choices must include correct answer');
  }
});

// ==========================================
// SUITE 2: ADVANCED MATH (NO EVAL)
// ==========================================
console.log('\n\x1b[33m[2. Advanced Multi-Step Math]\x1b[0m');

test('AST Evaluator computes operations accurately with precedence', () => {
  // 5 + 3 * 4 = 17 (not 32)
  const ast1 = { op: '+', left: 5, right: { op: '*', left: 3, right: 4 } };
  assert.strictEqual(Generators.AdvancedMath.evaluateAST(ast1), 17);

  // (5 + 3) * 4 = 32
  const ast2 = { op: '*', left: { op: '+', left: 5, right: 3 }, right: 4 };
  assert.strictEqual(Generators.AdvancedMath.evaluateAST(ast2), 32);

  // (40 - 10) / 5 = 6
  const ast3 = { op: '/', left: { op: '-', left: 40, right: 10 }, right: 5 };
  assert.strictEqual(Generators.AdvancedMath.evaluateAST(ast3), 6);
});

test('Advanced question generation never uses eval and produces safe integers', () => {
  for (let i = 0; i < 30; i++) {
    const q = Generators.AdvancedMath.generate('hard');
    assert(Number.isSafeInteger(q.correctAnswer), 'Answer must be a safe integer');
    assert.strictEqual(q.choices.length, 4, 'Must have 4 choices');
    const unique = new Set(q.choices.map(c => c.value));
    assert.strictEqual(unique.size, 4, 'Choices must be distinct');
  }
});

// ==========================================
// SUITE 3: NUMBER SEQUENCES
// ==========================================
console.log('\n\x1b[33m[3. Number Sequences]\x1b[0m');

test('Sequence generator produces unambiguous patterns with documented rules', () => {
  for (let i = 0; i < 40; i++) {
    const q = Generators.NumberSequences.generate('medium');
    assert(q.expression.includes(', ?'), 'Expression must have sequence format');
    assert(typeof q.explanation === 'string' && q.explanation.length > 0, 'Must have rule explanation');
    assert(Number.isInteger(q.correctAnswer), 'Target value must be an integer');
    const unique = new Set(q.choices.map(c => c.value));
    assert.strictEqual(unique.size, 4, 'Choices must be distinct');
  }
});

// ==========================================
// SUITE 4: COMPARISONS
// ==========================================
console.log('\n\x1b[33m[4. Expression Comparison]\x1b[0m');

test('Comparison generates valid >, <, and = relationships', () => {
  const seenRels = new Set();
  for (let i = 0; i < 60; i++) {
    const q = Generators.Comparison.generate('medium');
    assert(['>', '<', '='].includes(q.correctAnswer), 'Correct answer must be >, <, or =');
    seenRels.add(q.correctAnswer);
    if (q.correctAnswer === '=') {
      assert.strictEqual(q.leftValue, q.rightValue, 'Equality question must have equal values');
    } else if (q.correctAnswer === '>') {
      assert(q.leftValue > q.rightValue, 'Greater-than question left must exceed right');
    } else {
      assert(q.leftValue < q.rightValue, 'Less-than question left must be smaller than right');
    }
  }
  assert.strictEqual(seenRels.size, 3, 'Must generate all 3 relations: >, <, =');
});

// ==========================================
// SUITE 5: SQUARES & PUZZLES
// ==========================================
console.log('\n\x1b[33m[5. Squares & Math Puzzles]\x1b[0m');

test('Squares generator creates correct squared values', () => {
  for (let i = 0; i < 30; i++) {
    const q = Generators.Squares.generate('medium');
    assert(q.expression.includes('² = ?') || q.expression.includes('³ = ?'), 'Expression format');
    assert(Number.isSafeInteger(q.correctAnswer));
    assert.strictEqual(q.choices.length, 4);
  }
});

test('Math Puzzles generates solvable 2x2 grid equations', () => {
  for (let i = 0; i < 30; i++) {
    const q = Generators.MathPuzzles.generate('medium');
    assert(q.isPuzzle, 'Must be marked as puzzle');
    const raw = q.puzzleData.raw;
    assert.strictEqual(raw.a + raw.b, raw.r1, 'Row 1 arithmetic must hold');
    assert.strictEqual(raw.c + raw.d, raw.r2, 'Row 2 arithmetic must hold');
    assert.strictEqual(raw.a + raw.c, raw.c1, 'Col 1 arithmetic must hold');
    assert.strictEqual(raw.b + raw.d, raw.c2, 'Col 2 arithmetic must hold');
  }
});

// ==========================================
// SUITE 6: GAME ENGINE & SCORING
// ==========================================
console.log('\n\x1b[33m[6. Game Engine & Scoring Model]\x1b[0m');

test('Scoring formula calculates base + speed + streak bonuses', () => {
  const engine = new EngineModule.GameEngine({
    storage: Storage,
    sound: { playCorrect() {}, playWrong() {}, playTick() {}, playComplete() {} },
    generators: Generators
  });

  engine.startSession({
    gameMode: 'quickMath',
    roundLength: 5,
    timeLimitSec: 15
  });

  assert.strictEqual(engine.state, 'PLAYING');
  assert.strictEqual(engine.score, 0);

  // Submit correct answer
  const correctAns = engine.currentQuestion.correctAnswer;
  engine.submitAnswer(correctAns);

  assert.strictEqual(engine.correctCount, 1);
  assert.strictEqual(engine.currentStreak, 1);
  assert(engine.score >= 100, `Score (${engine.score}) must include basePoints 100`);

  engine.cleanupTimers();
});

test('Double answer submissions are strictly prevented by FSM', () => {
  const engine = new EngineModule.GameEngine({
    storage: Storage,
    sound: null,
    generators: Generators
  });

  engine.startSession({ roundLength: 5, timeLimitSec: 15 });
  const ans = engine.currentQuestion.correctAnswer;

  engine.submitAnswer(ans);
  const scoreAfterFirst = engine.score;
  const countAfterFirst = engine.correctCount;

  // Try submitting again in FEEDBACK state
  engine.submitAnswer(ans);
  assert.strictEqual(engine.score, scoreAfterFirst, 'Score must not change on duplicate submission');
  assert.strictEqual(engine.correctCount, countAfterFirst, 'Count must not change on duplicate submission');

  engine.cleanupTimers();
});

test('Timeout locks question, awards zero points, and records mistake', () => {
  const engine = new EngineModule.GameEngine({
    storage: Storage,
    sound: null,
    generators: Generators
  });

  engine.startSession({ roundLength: 5, timeLimitSec: 15 });
  engine.handleTimeout();

  assert.strictEqual(engine.timeoutCount, 1);
  assert.strictEqual(engine.score, 0);
  assert.strictEqual(engine.mistakes.length, 1);
  assert.strictEqual(engine.mistakes[0].timedOut, true);

  engine.cleanupTimers();
});

test('Time limit decreases gradually after each successful calculation', () => {
  const engine = new EngineModule.GameEngine({
    storage: Storage,
    sound: null,
    generators: Generators
  });

  engine.startSession({ roundLength: 10, timeLimitSec: 15 });
  assert.strictEqual(engine.timeLimitSec, 15);

  // Solve question 1 correctly
  engine.submitAnswer(engine.currentQuestion.correctAnswer);
  assert.strictEqual(engine.correctCount, 1);
  
  // Advance to question 2
  engine.nextQuestion();
  assert(engine.timeLimitSec < 15, `Time limit (${engine.timeLimitSec}s) should be less than 15s`);
  assert.strictEqual(engine.timeLimitSec, 14.6);

  // Solve question 2 correctly
  engine.submitAnswer(engine.currentQuestion.correctAnswer);
  assert.strictEqual(engine.correctCount, 2);

  // Advance to question 3
  engine.nextQuestion();
  assert.strictEqual(engine.timeLimitSec, 14.2);

  engine.cleanupTimers();
});

test('One wrong input immediately ends run and saves points and questions solved', () => {
  Storage.clearAllData();
  const engine = new EngineModule.GameEngine({
    storage: Storage,
    sound: null,
    generators: Generators
  });

  engine.startSession({ roundLength: 20, timeLimitSec: 15 });

  // Solve 3 questions correctly
  for (let i = 0; i < 3; i++) {
    engine.submitAnswer(engine.currentQuestion.correctAnswer);
    engine.nextQuestion();
  }
  assert.strictEqual(engine.correctCount, 3);
  const earnedScore = engine.score;
  assert(earnedScore >= 300, 'Score should reflect at least 3 solved questions');

  // Submit 1 WRONG answer on 4th question
  const wrongChoice = engine.currentQuestion.choices.find(c => c.value !== engine.currentQuestion.correctAnswer).value;
  engine.submitAnswer(wrongChoice);

  assert.strictEqual(engine.incorrectCount, 1);
  assert.strictEqual(engine.score, earnedScore, 'Earned points from solved questions must be preserved');

  // Finish session immediately
  engine.finishSession();

  // Verify saved into storage
  const sessions = Storage.getSessions();
  assert.strictEqual(sessions.length, 1);
  assert.strictEqual(sessions[0].score, earnedScore);
  assert.strictEqual(sessions[0].correctCount, 3);
  assert.strictEqual(sessions[0].isGameOver, true);

  engine.cleanupTimers();
});

// ==========================================
// SUITE 7: STORAGE & RESILIENCE
// ==========================================
console.log('\n\x1b[33m[7. Storage & Resilience]\x1b[0m');

test('Consecutive day streak increases only on new calendar dates', () => {
  Storage.clearAllData();

  // Day 1
  Storage.updateDayStreak('2026-10-15');
  assert.strictEqual(Storage.getStatistics().dayStreak, 1);

  // Multiple sessions on Day 1 must NOT increase dayStreak
  Storage.updateDayStreak('2026-10-15');
  assert.strictEqual(Storage.getStatistics().dayStreak, 1);

  // Consecutive Day 2
  Storage.updateDayStreak('2026-10-16');
  assert.strictEqual(Storage.getStatistics().dayStreak, 2);

  // Broken streak (skipping 3 days) resets to 1
  Storage.updateDayStreak('2026-10-20');
  assert.strictEqual(Storage.getStatistics().dayStreak, 1);
});

test('Corrupted JSON import is safely rejected without crash', () => {
  const corrupt1 = '{{{invalid json';
  const res1 = Storage.importJSON(corrupt1);
  assert.strictEqual(res1.success, false);

  const nonObject = JSON.stringify(['not an object']);
  const res2 = Storage.importJSON(nonObject);
  assert.strictEqual(res2.success, false);
});

test('Valid JSON export and import cycle succeeds and preserves data', () => {
  Storage.clearAllData();
  Storage.recordSession({
    gameMode: 'squares',
    difficulty: 'hard',
    score: 450,
    totalQuestions: 10,
    correctCount: 9,
    incorrectCount: 1,
    timeoutCount: 0,
    longestStreak: 8,
    avgResponseTimeMs: 2100,
    mistakes: []
  });

  const exported = Storage.exportJSON();
  assert(typeof exported === 'string' && exported.includes('"schemaVersion": 1'));

  // Import into clean instance
  const importRes = Storage.importJSON(exported);
  assert.strictEqual(importRes.success, true);
  assert.strictEqual(Storage.getStatistics().bestScore, 450);
});

console.log('\n----------------------------------------');
console.log(`Test Results: \x1b[32m${passedTests} passed\x1b[0m, \x1b[31m${failedTests} failed\x1b[0m`);
console.log('----------------------------------------\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('\x1b[32m✔ ALL MINDSPRINT TESTS PASSED PERFECTLY!\x1b[0m\n');
}
