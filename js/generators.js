/**
 * MindSprint Question Generators
 * Robust, mathematically validated question generation for all 7 modes.
 * Zero eval() usage. Safe integer boundaries. Guaranteed unique choices.
 */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MindSprintGenerators = factory();
  }
})(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  // Helper: Random integer in [min, max] inclusive
  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Helper: Pick random element from array
  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // Helper: Fisher-Yates shuffle
  function shuffle(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  /**
   * Generates plausible distractors around correct answer
   */
  function generateDistractors(correctAnswer, count = 3, options = {}) {
    const minVal = options.min !== undefined ? options.min : 0;
    const maxVal = options.max !== undefined ? options.max : 100000;
    const isInteger = options.isInteger !== false;
    const customCandidates = options.customCandidates || [];

    const choices = new Set([correctAnswer]);

    // First try custom candidates (e.g. calculation slip variants)
    for (const cand of customCandidates) {
      if (cand !== correctAnswer && cand >= minVal && cand <= maxVal && (!isInteger || Number.isInteger(cand))) {
        choices.add(cand);
        if (choices.size >= count + 1) break;
      }
    }

    // Common arithmetic offsets: +/- 1, +/- 2, +/- 10, +/- 5, +/- 20
    const offsets = shuffle([1, -1, 2, -2, 10, -10, 5, -5, 3, -3, 20, -20, 100, -100]);
    for (const off of offsets) {
      if (choices.size >= count + 1) break;
      const val = correctAnswer + off;
      if (val >= minVal && val <= maxVal && (!isInteger || Number.isInteger(val))) {
        choices.add(val);
      }
    }

    // Fallback if still need more unique choices
    let delta = 4;
    while (choices.size < count + 1) {
      const candA = correctAnswer + delta;
      const candB = correctAnswer - delta;
      if (candA <= maxVal) choices.add(candA);
      if (choices.size < count + 1 && candB >= minVal) choices.add(candB);
      delta += randInt(2, 7);
    }

    const resultList = Array.from(choices);
    return shuffle(resultList);
  }

  // ==========================================
  // 1. QUICK MATH GENERATOR
  // ==========================================
  const QuickMath = {
    generate(difficulty = 'medium', allowedOps = ['add', 'sub', 'mul', 'div']) {
      const ops = allowedOps && allowedOps.length > 0 ? allowedOps : ['add', 'sub', 'mul', 'div'];
      const op = pickRandom(ops);

      let a, b, answer, symbol, display;

      switch (op) {
        case 'add':
          symbol = '+';
          if (difficulty === 'easy') {
            a = randInt(2, 30);
            b = randInt(2, 25);
          } else if (difficulty === 'medium') {
            a = randInt(15, 99);
            b = randInt(12, 99);
          } else if (difficulty === 'hard') {
            a = randInt(100, 899);
            b = randInt(50, 799);
          } else { // expert
            a = randInt(450, 3999);
            b = randInt(350, 3999);
          }
          answer = a + b;
          display = `${a} + ${b} = ?`;
          break;

        case 'sub':
          symbol = '−';
          if (difficulty === 'easy') {
            answer = randInt(2, 25);
            b = randInt(2, 20);
            a = answer + b;
          } else if (difficulty === 'medium') {
            answer = randInt(10, 85);
            b = randInt(10, 75);
            a = answer + b;
          } else if (difficulty === 'hard') {
            answer = randInt(50, 650);
            b = randInt(50, 600);
            a = answer + b;
          } else { // expert
            answer = randInt(200, 2500);
            b = randInt(200, 2500);
            a = answer + b;
          }
          display = `${a} − ${b} = ?`;
          break;

        case 'mul':
          symbol = '×';
          if (difficulty === 'easy') {
            a = randInt(2, 10);
            b = randInt(2, 10);
          } else if (difficulty === 'medium') {
            a = randInt(4, 15);
            b = randInt(3, 14);
          } else if (difficulty === 'hard') {
            a = randInt(12, 35);
            b = randInt(4, 25);
          } else { // expert
            a = randInt(20, 85);
            b = randInt(12, 60);
          }
          answer = a * b;
          display = `${a} × ${b} = ?`;
          break;

        case 'div':
        default:
          symbol = '÷';
          if (difficulty === 'easy') {
            answer = randInt(2, 10);
            b = randInt(2, 10);
            a = answer * b;
          } else if (difficulty === 'medium') {
            answer = randInt(4, 20);
            b = randInt(3, 12);
            a = answer * b;
          } else if (difficulty === 'hard') {
            answer = randInt(12, 45);
            b = randInt(4, 20);
            a = answer * b;
          } else { // expert
            answer = randInt(20, 95);
            b = randInt(11, 40);
            a = answer * b;
          }
          display = `${a} ÷ ${b} = ?`;
          break;
      }

      const choices = generateDistractors(answer, 3, { min: 0 });

      return {
        category: 'quickMath',
        categoryLabel: 'Quick Math',
        expression: display,
        correctAnswer: answer,
        correctAnswerDisplay: String(answer),
        choices: choices.map((c) => ({ value: c, display: String(c) })),
        explanation: `${display.replace(' = ?', '')} = ${answer}`
      };
    }
  };

  // ==========================================
  // 2. ADVANCED CALCULATIONS GENERATOR (NO EVAL)
  // ==========================================
  const AdvancedMath = {
    // Custom safe evaluator for structured ASTs
    evaluateAST(node) {
      if (typeof node === 'number') return node;
      if (!node || typeof node !== 'object') return 0;

      const left = this.evaluateAST(node.left);
      const right = this.evaluateAST(node.right);

      switch (node.op) {
        case '+': return left + right;
        case '-': return left - right;
        case '*': return left * right;
        case '/': {
          if (right === 0) return 0;
          return Math.floor(left / right);
        }
        default: return 0;
      }
    },

    formatAST(node, parentPrecedence = 0) {
      if (typeof node === 'number') return String(node);
      const precedenceMap = { '+': 1, '-': 1, '*': 2, '/': 2 };
      const currentPrec = precedenceMap[node.op] || 0;
      const symbolMap = { '+': '+', '-': '−', '*': '×', '/': '÷' };
      const sym = symbolMap[node.op] || node.op;

      const leftStr = this.formatAST(node.left, currentPrec);
      const rightStr = this.formatAST(node.right, currentPrec + (node.op === '-' || node.op === '/' ? 1 : 0));

      const expr = `${leftStr} ${sym} ${rightStr}`;
      if (currentPrec < parentPrecedence || node.forceParentheses) {
        return `(${expr})`;
      }
      return expr;
    },

    generate(difficulty = 'medium') {
      let ast;
      let template = randInt(1, 4);

      if (difficulty === 'easy') {
        // e.g. (A + B) * C or A * B + C with small numbers
        if (template <= 2) {
          const a = randInt(2, 8);
          const b = randInt(2, 8);
          const c = randInt(2, 5);
          ast = { op: '*', left: { op: '+', left: a, right: b, forceParentheses: true }, right: c };
        } else {
          const a = randInt(3, 9);
          const b = randInt(2, 8);
          const c = randInt(2, 15);
          ast = { op: '+', left: { op: '*', left: a, right: b }, right: c };
        }
      } else if (difficulty === 'medium') {
        // e.g. (A - B) ÷ C + D or A * B - C
        if (template === 1) {
          const c = randInt(2, 8);
          const quotient = randInt(3, 12);
          const b = randInt(5, 30);
          const a = quotient * c + b;
          const d = randInt(3, 25);
          ast = { op: '+', left: { op: '/', left: { op: '-', left: a, right: b, forceParentheses: true }, right: c }, right: d };
        } else if (template === 2) {
          const a = randInt(4, 12);
          const b = randInt(4, 12);
          const c = randInt(5, 40);
          ast = { op: '-', left: { op: '*', left: a, right: b }, right: c };
        } else if (template === 3) {
          const a = randInt(5, 20);
          const b = randInt(3, 9);
          const c = randInt(2, 7);
          ast = { op: '*', left: a, right: { op: '+', left: b, right: c, forceParentheses: true } };
        } else {
          const divisor = randInt(3, 9);
          const quotient = randInt(4, 15);
          const dividend = divisor * quotient;
          const adder = randInt(10, 50);
          ast = { op: '+', left: { op: '/', left: dividend, right: divisor }, right: adder };
        }
      } else if (difficulty === 'hard') {
        // Multi-step: e.g. A * (B + C) - D or (A * B + C) ÷ D
        if (template === 1) {
          const divisor = randInt(4, 12);
          const target = randInt(6, 25);
          const total = divisor * target;
          const c = randInt(4, 30);
          const prod = total - c;
          // find factor for prod
          const a = randInt(3, 15);
          const b = randInt(3, 15);
          const adjustedC = total - (a * b);
          if (adjustedC > 0) {
            ast = { op: '/', left: { op: '+', left: { op: '*', left: a, right: b }, right: adjustedC, forceParentheses: true }, right: divisor };
          } else {
            ast = { op: '-', left: { op: '*', left: a, right: b }, right: randInt(10, 40) };
          }
        } else if (template === 2) {
          const a = randInt(5, 15);
          const b = randInt(10, 30);
          const c = randInt(4, 15);
          const d = randInt(10, 50);
          ast = { op: '-', left: { op: '*', left: a, right: { op: '-', left: b, right: c, forceParentheses: true } }, right: d };
        } else {
          const a = randInt(10, 40);
          const b = randInt(3, 8);
          const c = randInt(10, 60);
          ast = { op: '+', left: a, right: { op: '-', left: { op: '*', left: b, right: 9 }, right: c } };
        }
      } else { // expert
        const a = randInt(8, 25);
        const b = randInt(6, 18);
        const c = randInt(15, 60);
        const d = randInt(10, 45);
        ast = { op: '+', left: { op: '*', left: a, right: b }, right: { op: '*', left: c, right: d } };
      }

      const answer = this.evaluateAST(ast);
      const expr = this.formatAST(ast);
      const display = `${expr} = ?`;

      // Common slip: evaluate left-to-right without precedence or off-by-sign
      const slipCandidates = [
        Math.abs(answer + randInt(2, 10)),
        Math.abs(answer - randInt(2, 10)),
        Math.abs(answer + 10)
      ];

      const choices = generateDistractors(answer, 3, { min: 0, customCandidates: slipCandidates });

      return {
        category: 'advanced',
        categoryLabel: 'Advanced',
        expression: display,
        correctAnswer: answer,
        correctAnswerDisplay: String(answer),
        choices: choices.map((c) => ({ value: c, display: String(c) })),
        explanation: `${expr} = ${answer}`
      };
    }
  };

  // ==========================================
  // 3. NUMBER SEQUENCES GENERATOR
  // ==========================================
  const NumberSequences = {
    generate(difficulty = 'medium') {
      const typeChoice = randInt(1, 8);
      let sequence = [];
      let nextVal = 0;
      let ruleDesc = '';

      switch (typeChoice) {
        case 1: { // Arithmetic (+step)
          const start = randInt(difficulty === 'easy' ? 2 : 10, difficulty === 'expert' ? 100 : 50);
          const step = randInt(2, difficulty === 'expert' ? 25 : 12);
          for (let i = 0; i < 4; i++) {
            sequence.push(start + i * step);
          }
          nextVal = start + 4 * step;
          ruleDesc = `Add ${step} each step`;
          break;
        }
        case 2: { // Arithmetic (-step)
          const step = randInt(2, difficulty === 'expert' ? 18 : 9);
          const nextTarget = randInt(4, 25);
          nextVal = nextTarget;
          const start = nextVal + 4 * step;
          for (let i = 0; i < 4; i++) {
            sequence.push(start - i * step);
          }
          ruleDesc = `Subtract ${step} each step`;
          break;
        }
        case 3: { // Geometric (x2, x3, etc.)
          const ratio = (difficulty === 'easy' || difficulty === 'medium') ? 2 : randInt(2, 3);
          const start = randInt(1, difficulty === 'expert' ? 5 : 3);
          let curr = start;
          for (let i = 0; i < 4; i++) {
            sequence.push(curr);
            curr *= ratio;
          }
          nextVal = curr;
          ruleDesc = `Multiply by ${ratio} each step`;
          break;
        }
        case 4: { // Increasing difference (+2, +3, +4...) or (+2, +4, +6...)
          const diffStep = randInt(1, 3);
          let diff = randInt(2, 5);
          let curr = randInt(1, 10);
          for (let i = 0; i < 4; i++) {
            sequence.push(curr);
            curr += diff;
            diff += diffStep;
          }
          nextVal = curr;
          ruleDesc = `Differences increase by ${diffStep}`;
          break;
        }
        case 5: { // Square numbers (n^2)
          const start = randInt(difficulty === 'easy' ? 1 : 3, difficulty === 'expert' ? 9 : 6);
          for (let i = 0; i < 4; i++) {
            const n = start + i;
            sequence.push(n * n);
          }
          const nextN = start + 4;
          nextVal = nextN * nextN;
          ruleDesc = `Consecutive square numbers (${nextN}² = ${nextVal})`;
          break;
        }
        case 6: { // Cube numbers (n^3)
          const start = randInt(1, 3);
          for (let i = 0; i < 4; i++) {
            const n = start + i;
            sequence.push(n * n * n);
          }
          const nextN = start + 4;
          nextVal = nextN * nextN * nextN;
          ruleDesc = `Consecutive cubes (${nextN}³ = ${nextVal})`;
          break;
        }
        case 7: { // Fibonacci / Additive style (a + b = c)
          const a = randInt(1, 5);
          const b = randInt(a, a + 4);
          sequence = [a, b, a + b, b + (a + b)];
          nextVal = sequence[2] + sequence[3];
          ruleDesc = `Each number is the sum of previous two (${sequence[2]} + ${sequence[3]} = ${nextVal})`;
          break;
        }
        case 8:
        default: { // Alternating operations (+a, -b)
          const add = randInt(3, 8);
          const sub = randInt(1, add - 1);
          let curr = randInt(5, 20);
          sequence.push(curr);
          curr += add;
          sequence.push(curr);
          curr -= sub;
          sequence.push(curr);
          curr += add;
          sequence.push(curr);
          nextVal = curr - sub;
          ruleDesc = `Alternating +${add}, −${sub}`;
          break;
        }
      }

      const display = `${sequence.join(', ')}, ?`;
      const choices = generateDistractors(nextVal, 3, { min: 0 });

      return {
        category: 'sequences',
        categoryLabel: 'Sequences',
        expression: display,
        correctAnswer: nextVal,
        correctAnswerDisplay: String(nextVal),
        choices: choices.map((c) => ({ value: c, display: String(c) })),
        explanation: `Rule: ${ruleDesc}`
      };
    }
  };

  // ==========================================
  // 4. COMPARISON GENERATOR
  // ==========================================
  const Comparison = {
    generate(difficulty = 'medium') {
      // Balanced distribution: 33% '>', 33% '<', 33% '='
      const targetRel = pickRandom(['>', '<', '=']);

      let leftVal, rightVal, leftExpr, rightExpr;

      const makeExpr = (target, diff) => {
        const type = randInt(1, 3);
        if (type === 1) { // Add
          const p1 = randInt(1, target - 1 || 1);
          const p2 = target - p1;
          return `${p1} + ${p2}`;
        } else if (type === 2) { // Sub
          const sub = randInt(2, diff === 'expert' ? 40 : 15);
          const orig = target + sub;
          return `${orig} − ${sub}`;
        } else { // Mul or add
          // If target has factor
          const factors = [];
          for (let f = 2; f <= Math.min(12, Math.floor(Math.sqrt(target))); f++) {
            if (target % f === 0) factors.push(f);
          }
          if (factors.length > 0) {
            const f = pickRandom(factors);
            return `${f} × ${target / f}`;
          }
          const p1 = randInt(1, target - 1 || 1);
          return `${p1} + ${target - p1}`;
        }
      };

      const baseVal = randInt(
        difficulty === 'easy' ? 8 : 20,
        difficulty === 'expert' ? 150 : 60
      );

      if (targetRel === '=') {
        leftVal = baseVal;
        rightVal = baseVal;
        leftExpr = makeExpr(leftVal, difficulty);
        do {
          rightExpr = makeExpr(rightVal, difficulty);
        } while (rightExpr === leftExpr); // Ensure distinct syntax
      } else if (targetRel === '>') {
        leftVal = baseVal;
        const diffOffset = randInt(1, difficulty === 'expert' ? 12 : 5);
        rightVal = baseVal - diffOffset;
        leftExpr = makeExpr(leftVal, difficulty);
        rightExpr = makeExpr(rightVal, difficulty);
      } else { // '<'
        leftVal = baseVal;
        const diffOffset = randInt(1, difficulty === 'expert' ? 12 : 5);
        rightVal = baseVal + diffOffset;
        leftExpr = makeExpr(leftVal, difficulty);
        rightExpr = makeExpr(rightVal, difficulty);
      }

      const display = `${leftExpr}  ?  ${rightExpr}`;

      return {
        category: 'compare',
        categoryLabel: 'Compare',
        expression: display,
        isCompare: true,
        leftValue: leftVal,
        rightValue: rightVal,
        correctAnswer: targetRel,
        correctAnswerDisplay: targetRel === '>' ? 'GREATER THAN (>)' : (targetRel === '<' ? 'LESS THAN (<)' : 'EQUAL TO (=)'),
        choices: [
          { value: '>', display: '>  GREATER THAN' },
          { value: '=', display: '=  EQUAL TO' },
          { value: '<', display: '<  LESS THAN' }
        ],
        explanation: `${leftExpr} (${leftVal}) ${targetRel} ${rightExpr} (${rightVal})`
      };
    }
  };

  // ==========================================
  // 5. SQUARES (AND CUBES) GENERATOR
  // ==========================================
  const Squares = {
    generate(difficulty = 'medium') {
      let base, answer, display, isCube = false;

      if (difficulty === 'easy') {
        base = randInt(2, 12);
        answer = base * base;
        display = `${base}² = ?`;
      } else if (difficulty === 'medium') {
        base = randInt(11, 25);
        answer = base * base;
        display = `${base}² = ?`;
      } else if (difficulty === 'hard') {
        base = randInt(21, 50);
        answer = base * base;
        display = `${base}² = ?`;
      } else { // expert: big squares or occasional cubes
        if (Math.random() < 0.35) {
          isCube = true;
          base = randInt(2, 12);
          answer = base * base * base;
          display = `${base}³ = ?`;
        } else {
          base = randInt(40, 99);
          answer = base * base;
          display = `${base}² = ?`;
        }
      }

      // Distractors: common slips (base * 2, (base-1)^2, last digit mixups)
      const slips = [
        isCube ? base * 3 : base * 2,
        isCube ? (base - 1) ** 3 : (base - 1) ** 2,
        isCube ? (base + 1) ** 3 : (base + 1) ** 2,
        answer + 10,
        answer - 10
      ];

      const choices = generateDistractors(answer, 3, { min: 0, customCandidates: slips });

      return {
        category: 'squares',
        categoryLabel: isCube ? 'Cubes' : 'Squares',
        expression: display,
        correctAnswer: answer,
        correctAnswerDisplay: String(answer),
        choices: choices.map((c) => ({ value: c, display: String(c) })),
        explanation: isCube ? `${base} × ${base} × ${base} = ${answer}` : `${base} × ${base} = ${answer}`
      };
    }
  };

  // ==========================================
  // 6. MATH PUZZLES GENERATOR
  // ==========================================
  const MathPuzzles = {
    generate(difficulty = 'medium') {
      // Type 1: 2x2 Arithmetic Grid
      //   [ A ] + [ B ] = R1
      //   +       +
      //   [ C ] + [ D ] = R2
      //   =       =
      //   C1      C2
      // One cell is hidden: e.g. D = ?
      const maxVal = difficulty === 'easy' ? 9 : (difficulty === 'expert' ? 35 : 19);
      const minVal = difficulty === 'easy' ? 1 : 3;

      const a = randInt(minVal, maxVal);
      const b = randInt(minVal, maxVal);
      const c = randInt(minVal, maxVal);
      const d = randInt(minVal, maxVal);

      const r1 = a + b;
      const r2 = c + d;
      const c1 = a + c;
      const c2 = b + d;

      // Pick which position to hide (0: a, 1: b, 2: c, 3: d)
      const hidePos = randInt(0, 3);
      let targetAnswer = d;
      if (hidePos === 0) targetAnswer = a;
      else if (hidePos === 1) targetAnswer = b;
      else if (hidePos === 2) targetAnswer = c;
      else targetAnswer = d;

      const puzzleGrid = {
        type: 'grid_2x2',
        cells: [
          hidePos === 0 ? '?' : a,
          b,
          hidePos === 1 ? '?' : b,
          r1,
          c,
          hidePos === 2 ? '?' : c,
          hidePos === 3 ? '?' : d,
          r2,
          c1,
          c2
        ],
        raw: { a, b, c, d, r1, r2, c1, c2, hidePos }
      };

      const choices = generateDistractors(targetAnswer, 3, { min: 0 });

      return {
        category: 'puzzles',
        categoryLabel: 'Math Puzzle',
        isPuzzle: true,
        puzzleType: 'grid_2x2',
        puzzleData: puzzleGrid,
        expression: 'Find the missing number in the grid:',
        correctAnswer: targetAnswer,
        correctAnswerDisplay: String(targetAnswer),
        choices: choices.map((ch) => ({ value: ch, display: String(ch) })),
        explanation: `Row/Column equations resolve to ? = ${targetAnswer}`
      };
    }
  };

  // ==========================================
  // 7. MIXED SPRINT GENERATOR
  // ==========================================
  const MixedSprint = {
    history: [],
    generate(difficulty = 'medium', settings = {}) {
      const allModes = ['quickMath', 'advanced', 'sequences', 'compare', 'squares', 'puzzles'];
      
      // Avoid immediate repetitions
      const last = this.history[this.history.length - 1];
      const candidates = allModes.filter((m) => m !== last);
      const chosen = pickRandom(candidates.length > 0 ? candidates : allModes);
      
      this.history.push(chosen);
      if (this.history.length > 10) this.history.shift();

      let q;
      switch (chosen) {
        case 'quickMath':
          q = QuickMath.generate(difficulty, settings.quickMathOps);
          break;
        case 'advanced':
          q = AdvancedMath.generate(difficulty);
          break;
        case 'sequences':
          q = NumberSequences.generate(difficulty);
          break;
        case 'compare':
          q = Comparison.generate(difficulty);
          break;
        case 'squares':
          q = Squares.generate(difficulty);
          break;
        case 'puzzles':
          q = MathPuzzles.generate(difficulty);
          break;
        default:
          q = QuickMath.generate(difficulty);
      }

      // Mark mode source while keeping specific category badge
      q.isMixedSprint = true;
      return q;
    }
  };

  return {
    randInt,
    shuffle,
    generateDistractors,
    QuickMath,
    AdvancedMath,
    NumberSequences,
    Comparison,
    Squares,
    MathPuzzles,
    MixedSprint
  };
});
