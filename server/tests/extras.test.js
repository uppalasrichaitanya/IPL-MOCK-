// ═══════════════════════════════════════════════════════════
// server/tests/extras.test.js — Validation test suite
// Run with: node server/tests/extras.test.js
// Tests all 5 groups: extrasFactor, isDotBall, isValidWicket,
// calculateOverRuns, full pipeline calculateWinProbability
// ═══════════════════════════════════════════════════════════

'use strict';

// ── Import the modules under test ───────────────────────────
// We test internal helpers by requiring the modules directly.
// betResolver exports are straightforward.
const betResolver = require('../services/betResolver');
const oddsEngine  = require('../services/oddsEngine');

// ── Grab the three bet resolver helpers ─────────────────────
const { calculateOverRuns, isDotBall, isValidWicket } = betResolver;

// ── We need to test extrasFactor which is NOT exported.
// Instead we test it via calculateWinProbability and inspect
// the extrasAdj field in the returned object.
const { calculateWinProbability } = oddsEngine;

// ── Simple test runner ───────────────────────────────────────
let passed = 0;
let failed = 0;

function assert(condition, testName, detail = '') {
  if (condition) {
    console.log(`  ✅ ${testName}`);
    passed++;
  } else {
    console.log(`  ❌ ${testName}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

function assertInRange(value, min, max, testName) {
  const ok = value >= min && value <= max;
  assert(ok, testName, `got ${value.toFixed(4)}, expected [${min}, ${max}]`);
}

// ══════════════════════════════════════════════════════════
// TEST 1: extrasFactor — tested via calculateWinProbability
// We compare extrasAdj in 3 scenarios to validate the function.
// ══════════════════════════════════════════════════════════

console.log('\n══════════════════════════════════════════════');
console.log('TEST GROUP 1: extrasFactor (via calculateWinProbability)');
console.log('══════════════════════════════════════════════');

// Minimal match state builder
function makeMatchState(overrides = {}) {
  return {
    teams: [
      { id: '1', name: 'MI', abbreviation: 'MI', score: '100', wickets: '2', overs: '12', isHome: true, logo: '' },
      { id: '2', name: 'CSK', abbreviation: 'CSK', score: '0', wickets: '0', overs: '0', isHome: false, logo: '' },
    ],
    currentBatsmen: [],
    currentBowler: null,
    crr: '8.33',
    rrr: '8.00',
    currentInnings: 2,
    overs: 12,
    isPowerplay: false,
    recentOvers: [],
    partnership: { runs: 20, balls: 15 },
    lastUpdated: new Date().toISOString(),
    extrasData: {
      widesThisInnings:   0,
      noBallsThisInnings: 0,
      byesThisInnings:    0,
      legByesThisInnings: 0,
      totalExtras:        0,
      extrasThisOver:     0,
      lastBallWasNoBall:  false,
      lastBallWasWide:    false,
      freehitActive:      false,
      extrasRate:         0,
    },
    ...overrides,
  };
}

// ── Scenario 1: High extras — expected adjustment 0.06–0.10 ─
const scenario1State = makeMatchState({
  overs: 12,
  extrasData: {
    widesThisInnings:   8,
    noBallsThisInnings: 4,
    byesThisInnings:    1,
    legByesThisInnings: 1,
    totalExtras:        14,
    extrasThisOver:     2,
    lastBallWasNoBall:  false,
    lastBallWasWide:    false,
    freehitActive:      false,
    extrasRate:         1.2,
  },
});
const result1 = calculateWinProbability(scenario1State);
console.log(`  Scenario 1 extrasAdj: ${result1.extrasAdj}`);
assertInRange(result1.extrasAdj, 0.06, 0.10, 'Scenario 1: High extras → adjustment 0.06–0.10');

// ── Scenario 2: Free hit in death overs — expected 0.09–0.13 ─
const scenario2State = makeMatchState({
  overs: 18,
  extrasData: {
    widesThisInnings:   3,
    noBallsThisInnings: 2,
    byesThisInnings:    0,
    legByesThisInnings: 1,
    totalExtras:        6,
    extrasThisOver:     1,
    lastBallWasNoBall:  true,
    lastBallWasWide:    false,
    freehitActive:      true,
    extrasRate:         0.6,
  },
});
const result2 = calculateWinProbability(scenario2State);
console.log(`  Scenario 2 extrasAdj: ${result2.extrasAdj}`);
assertInRange(result2.extrasAdj, 0.09, 0.13, 'Scenario 2: Free hit death overs → adjustment 0.09–0.13');

// ── Scenario 3: Clean bowling — expected adjustment 0.00–0.02 ─
const scenario3State = makeMatchState({
  overs: 15,
  extrasData: {
    widesThisInnings:   1,
    noBallsThisInnings: 0,
    byesThisInnings:    0,
    legByesThisInnings: 0,
    totalExtras:        1,
    extrasThisOver:     0,
    lastBallWasNoBall:  false,
    lastBallWasWide:    false,
    freehitActive:      false,
    extrasRate:         0.1,
  },
});
const result3 = calculateWinProbability(scenario3State);
console.log(`  Scenario 3 extrasAdj: ${result3.extrasAdj}`);
assertInRange(result3.extrasAdj, 0.00, 0.02, 'Scenario 3: Clean bowling → adjustment 0.00–0.02');

// ── Verify extrasAdj is always included in return value ──────
assert(
  typeof result1.extrasAdj === 'number' && typeof result2.extrasAdj === 'number',
  'extrasAdj field present in calculateWinProbability return'
);

// ══════════════════════════════════════════════════════════
// TEST 2: isDotBall()
// ══════════════════════════════════════════════════════════

console.log('\n══════════════════════════════════════════════');
console.log('TEST GROUP 2: isDotBall()');
console.log('══════════════════════════════════════════════');

assert(
  isDotBall({ type: 'wide', runs: 1 }) === false,
  'Wide delivery → NOT a dot ball'
);
assert(
  isDotBall({ type: 'noball', runs: 1 }) === false,
  'No ball delivery → NOT a dot ball'
);
assert(
  isDotBall({ type: 'normal', runs: 0 }) === true,
  '0 runs normal delivery → IS a dot ball'
);
assert(
  isDotBall({ type: 'normal', runs: 4 }) === false,
  '4 runs normal delivery → NOT a dot ball'
);

// ══════════════════════════════════════════════════════════
// TEST 3: isValidWicket()
// ══════════════════════════════════════════════════════════

console.log('\n══════════════════════════════════════════════');
console.log('TEST GROUP 3: isValidWicket()');
console.log('══════════════════════════════════════════════');

assert(
  isValidWicket({ type: 'noball', wicketType: 'bowled',  isWicket: true }) === false,
  'No ball + bowled → INVALID wicket'
);
assert(
  isValidWicket({ type: 'noball', wicketType: 'run out', isWicket: true }) === true,
  'No ball + run out → VALID wicket'
);
assert(
  isValidWicket({ type: 'wide', wicketType: 'caught', isWicket: true }) === false,
  'Wide + caught → INVALID wicket'
);
assert(
  isValidWicket({ type: 'wide', wicketType: 'stumped', isWicket: true }) === true,
  'Wide + stumped → VALID wicket'
);
assert(
  isValidWicket({ type: 'normal', wicketType: 'caught', isWicket: true }) === true,
  'Normal delivery + caught → VALID wicket'
);

// ══════════════════════════════════════════════════════════
// TEST 4: calculateOverRuns()
// ══════════════════════════════════════════════════════════

console.log('\n══════════════════════════════════════════════');
console.log('TEST GROUP 4: calculateOverRuns()');
console.log('══════════════════════════════════════════════');

const overData = { runs: 24, wides: 3, noBalls: 1, byes: 0, legByes: 0 };
const total    = calculateOverRuns(overData);
assert(
  total === 28,
  `24 legit + 3 wides + 1 no ball = 28 total → got ${total}`
);

const overData2 = { runs: 6, wides: 2, noBalls: 1, byes: 1, legByes: 1 };
const total2    = calculateOverRuns(overData2);
assert(
  total2 === 11,
  `6 + 2 + 1 + 1 + 1 = 11 total → got ${total2}`
);

// ══════════════════════════════════════════════════════════
// TEST 5: Full pipeline — calculateWinProbability with extras
// ══════════════════════════════════════════════════════════

console.log('\n══════════════════════════════════════════════');
console.log('TEST GROUP 5: Full pipeline — extras affect probability');
console.log('══════════════════════════════════════════════');

const noExtrasState = makeMatchState({
  overs: 12,
  extrasData: {
    widesThisInnings:   0, noBallsThisInnings: 0, byesThisInnings: 0,
    legByesThisInnings: 0, totalExtras: 0,        extrasThisOver: 0,
    lastBallWasNoBall:  false, lastBallWasWide: false, freehitActive: false,
    extrasRate: 0,
  },
});

const highExtrasState = makeMatchState({
  overs: 12,
  extrasData: {
    widesThisInnings:   10, noBallsThisInnings: 5, byesThisInnings: 2,
    legByesThisInnings: 2,  totalExtras: 19,       extrasThisOver: 3,
    lastBallWasNoBall:  true, lastBallWasWide: false, freehitActive: true,
    extrasRate: 1.6,
  },
});

const noExtrasResult   = calculateWinProbability(noExtrasState);
const highExtrasResult = calculateWinProbability(highExtrasState);

console.log(`  No extras  battingProb: ${noExtrasResult.battingProb}`);
console.log(`  Hi extras  battingProb: ${highExtrasResult.battingProb}`);
console.log(`  extrasAdj diff: ${(highExtrasResult.extrasAdj - noExtrasResult.extrasAdj).toFixed(4)}`);

assert(
  highExtrasResult.battingProb > noExtrasResult.battingProb,
  'High extras → higher batting probability than zero extras'
);
assert(
  highExtrasResult.extrasAdj > noExtrasResult.extrasAdj,
  'High extras → higher extrasAdj than zero extras'
);
assert(
  highExtrasResult.battingProb >= 0.05 && highExtrasResult.battingProb <= 0.95,
  'Probability stays clamped within [0.05, 0.95]'
);

// ── Summary ──────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════');
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log('══════════════════════════════════════════════\n');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🏏 All tests passed!');
  process.exit(0);
}
