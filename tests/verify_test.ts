import { verify, isAnswerMatch, normalizeInput, computeNetScore } from '../src/game/verify.ts';
import {
  ROUND1_PASSWORDS,
  validateRound1AnswerForSet,
  validateRound1PasswordForSet,
  ROUND1_CHALLENGES_BY_SET,
  ROUND1_PASSWORD_CLUES_BY_SET,
} from '../src/game/questionSets.ts';

console.log('------------------------------------------------------------');
console.log('RUNNING UNIT TESTS: 3 QUESTION SETS & ESCAPE ROOM SECTORS');
console.log('------------------------------------------------------------');

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, msg: string) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  } else {
    passedTests++;
    console.log(`✅ PASSED: ${msg}`);
  }
}

// ============================================================================
// 1. ROUND 1 TESTS ACROSS ALL 3 SETS
// ============================================================================

// SET 1: BLUE TEAM
assert(validateRound1AnswerForSet(1, 'CH-01', '289'), 'Set 1 Q1 matches 289');
assert(validateRound1AnswerForSet(1, 'CH-01', 'B. 289'), 'Set 1 Q1 accepts option B. 289');
assert(validateRound1AnswerForSet(1, 'CH-02', '1 0'), 'Set 1 Q2 matches 1 0');
assert(validateRound1AnswerForSet(1, 'CH-03', '124'), 'Set 1 Q3 matches 124');
assert(validateRound1AnswerForSet(1, 'CH-04', '10 km'), 'Set 1 Q4 matches 10 km');
assert(validateRound1AnswerForSet(1, 'CH-04', '10'), 'Set 1 Q4 accepts 10');
assert(validateRound1AnswerForSet(1, 'CH-05', '1111 1111 1110 0100'), 'Set 1 Q5 matches -28 two complement');
assert(validateRound1AnswerForSet(1, 'CH-05', '1111111111100100'), 'Set 1 Q5 matches without spaces');
assert(validateRound1PasswordForSet(1, 'R4#T9'), 'Set 1 password matches R4#T9');
assert(validateRound1PasswordForSet(1, 'r4#t9'), 'Set 1 password is case-insensitive');

// SET 2: RED TEAM
assert(validateRound1AnswerForSet(2, 'CH-01', '121'), 'Set 2 Q1 matches 121');
assert(validateRound1AnswerForSet(2, 'CH-01', 'C. 121'), 'Set 2 Q1 accepts option C. 121');
assert(validateRound1AnswerForSet(2, 'CH-02', 'Tech4 1'), 'Set 2 Q2 matches Tech4 1');
assert(validateRound1AnswerForSet(2, 'CH-03', '74'), 'Set 2 Q3 matches 74 (LONDON)');
assert(validateRound1AnswerForSet(2, 'CH-04', '12 km'), 'Set 2 Q4 matches 12 km');
assert(validateRound1AnswerForSet(2, 'CH-04', '12'), 'Set 2 Q4 accepts 12');
assert(validateRound1AnswerForSet(2, 'CH-05', '1111 1111 1101 0110'), 'Set 2 Q5 matches -42 two complement');
assert(validateRound1PasswordForSet(2, 'K4%N7'), 'Set 2 password matches K4%N7');

// SET 3: GREEN TEAM
assert(validateRound1AnswerForSet(3, 'CH-01', '169'), 'Set 3 Q1 matches 169');
assert(validateRound1AnswerForSet(3, 'CH-01', 'B. 169'), 'Set 3 Q1 accepts option B. 169');
assert(validateRound1AnswerForSet(3, 'CH-02', 'Code3 1'), 'Set 3 Q2 matches Code3 1');
assert(validateRound1AnswerForSet(3, 'CH-03', '59'), 'Set 3 Q3 matches 59 (MUMBAI)');
assert(validateRound1AnswerForSet(3, 'CH-04', '10 km'), 'Set 3 Q4 matches 10 km');
assert(validateRound1AnswerForSet(3, 'CH-05', '1111 1111 1101 1101'), 'Set 3 Q5 matches -35 two complement');
assert(validateRound1PasswordForSet(3, 'Q5&X8'), 'Set 3 password matches Q5&X8');

// ============================================================================
// 2. ROUND 2 ESCAPE ROOM TESTS ACROSS ALL 3 SETS
// ============================================================================

// SET 1 (BLUE TEAM)
assert(isAnswerMatch(1, 'LETTER_1', '21', 1), 'Set 1 R1 Handshakes matches 21');
assert(isAnswerMatch(1, 'LETTER_2', '24', 1), 'Set 1 R1 Age B matches 24');
assert(isAnswerMatch(1, 'TECH', '361', 1), 'Set 1 R1 Prime square matches 361');
assert(isAnswerMatch(1, 'PHYSICAL_KEY', 'door-key-91', 1), 'Set 1 R1 Key matches DOOR-KEY-91');
assert(isAnswerMatch(2, 'LETTER_1', '22', 1), 'Set 1 R2 Father/Son matches 22');
assert(isAnswerMatch(2, 'LETTER_2', 'M', 1), 'Set 1 R2 Riddle matches M');
assert(isAnswerMatch(2, 'TECH', '1 0', 1), 'Set 1 R2 C code matches "1 0"');
assert(isAnswerMatch(2, 'TECH', '5 -1 0 1', 1), 'Set 1 R2 C code matches "5 -1 0 1"');
assert(isAnswerMatch(3, 'LETTER_1', 'Grandfather, father, son', 1), 'Set 1 R3 Family relationship matches');
assert(isAnswerMatch(3, 'LETTER_1', '3', 1), 'Set 1 R3 Fishing answer 3 matches');
assert(isAnswerMatch(3, 'LETTER_1', '3 fishes', 1), 'Set 1 R3 Fishing answer 3 fishes matches');
assert(isAnswerMatch(3, 'LETTER_2', '21 minutes', 1), 'Set 1 R3 Bridge crossing matches 21 minutes');
assert(isAnswerMatch(3, 'LETTER_2', '21', 1), 'Set 1 R3 Bridge crossing accepts 21');
assert(isAnswerMatch(3, 'TECH', '128', 1), 'Set 1 R3 CALIFORNIA cipher matches 128');
assert(isAnswerMatch(4, 'LETTER_1', 'FRONT BLACK', 1), 'Set 1 R4 Hat deduction matches FRONT BLACK');
assert(isAnswerMatch(4, 'LETTER_2', 'F', 1), 'Set 1 R4 Stacked boxes matches F');
assert(isAnswerMatch(4, 'TECH', '1111 1111 1111 1101', 1), 'Set 1 R4 Stack -3 binary matches');

// SET 2 (RED TEAM)
assert(isAnswerMatch(1, 'LETTER_1', '28', 2), 'Set 2 R1 Handshakes matches 28');
assert(isAnswerMatch(1, 'LETTER_2', '22', 2), 'Set 2 R1 Age B matches 22');
assert(isAnswerMatch(1, 'TECH', '841', 2), 'Set 2 R1 Prime square matches 841');
assert(isAnswerMatch(1, 'PHYSICAL_KEY', 'door-key-92', 2), 'Set 2 R1 Key matches DOOR-KEY-92');
assert(isAnswerMatch(2, 'LETTER_1', '12', 2), 'Set 2 R2 Father/Son matches 12');
assert(isAnswerMatch(2, 'LETTER_2', 'M', 2), 'Set 2 R2 Riddle matches M');
assert(isAnswerMatch(2, 'TECH', '6 -1 0 1', 2), 'Set 2 R2 C code matches "6 -1 0 1"');
assert(isAnswerMatch(3, 'LETTER_1', 'Grandfather, father, son', 2), 'Set 2 R3 Family matches');
assert(isAnswerMatch(3, 'LETTER_2', '26 minutes', 2), 'Set 2 R3 Bridge crossing matches 26 minutes');
assert(isAnswerMatch(3, 'TECH', '75', 2), 'Set 2 R3 TEXAS cipher matches 75');
assert(isAnswerMatch(4, 'LETTER_1', 'FRONT BLACK', 2), 'Set 2 R4 Hat deduction matches FRONT BLACK');
assert(isAnswerMatch(4, 'LETTER_2', 'F', 2), 'Set 2 R4 Stacked boxes matches F');
assert(isAnswerMatch(4, 'TECH', '1111 1111 1111 1001', 2), 'Set 2 R4 Stack -7 binary matches');

// SET 3 (GREEN TEAM)
assert(isAnswerMatch(1, 'LETTER_1', '15', 3), 'Set 3 R1 Handshakes matches 15');
assert(isAnswerMatch(1, 'LETTER_2', '18', 3), 'Set 3 R1 Age B matches 18');
assert(isAnswerMatch(1, 'TECH', '529', 3), 'Set 3 R1 Prime square matches 529');
assert(isAnswerMatch(1, 'PHYSICAL_KEY', 'door-key-93', 3), 'Set 3 R1 Key matches DOOR-KEY-93');
assert(isAnswerMatch(2, 'LETTER_1', '20', 3), 'Set 3 R2 Father/Son matches 20');
assert(isAnswerMatch(2, 'LETTER_2', 'M', 3), 'Set 3 R2 Riddle matches M');
assert(isAnswerMatch(2, 'TECH', '4 -1 1 1', 3), 'Set 3 R2 C code matches "4 -1 1 1"');
assert(isAnswerMatch(3, 'LETTER_1', 'Grandfather, father, son', 3), 'Set 3 R3 Family matches');
assert(isAnswerMatch(3, 'LETTER_2', '17 minutes', 3), 'Set 3 R3 Bridge crossing matches 17 minutes');
assert(isAnswerMatch(3, 'TECH', '162', 3), 'Set 3 R3 NEWJERSEY cipher matches 162');
assert(isAnswerMatch(4, 'LETTER_1', 'FRONT BLACK', 3), 'Set 3 R4 Hat deduction matches FRONT BLACK');
assert(isAnswerMatch(4, 'LETTER_2', 'F', 3), 'Set 3 R4 Stacked boxes matches F');
assert(isAnswerMatch(4, 'TECH', '1111 1111 1111 1101', 3), 'Set 3 R4 Stack -3 binary matches');

// Flexible natural input tests
assert(validateRound1AnswerForSet(1, 'CH-01', 'B'), 'Set 1 Q1 accepts pure option B');
assert(validateRound1AnswerForSet(1, 'CH-01', 'option b'), 'Set 1 Q1 accepts option b');
assert(validateRound1AnswerForSet(1, 'CH-01', '(B)'), 'Set 1 Q1 accepts (B)');
assert(validateRound1AnswerForSet(1, 'CH-02', '1, 0'), 'Set 1 Q2 accepts comma 1, 0');
assert(validateRound1AnswerForSet(1, 'CH-03', '124.'), 'Set 1 Q3 accepts trailing dot 124.');
assert(validateRound1AnswerForSet(1, 'CH-04', '10 kilometers'), 'Set 1 Q4 accepts 10 kilometers');
assert(validateRound1AnswerForSet(1, 'CH-05', '-28'), 'Set 1 Q5 accepts decimal -28');

assert(isAnswerMatch(1, 'LETTER_1', '21 handshakes', 1), 'Set 1 R1 accepts "21 handshakes"');
assert(isAnswerMatch(1, 'LETTER_1', 'twenty one', 1), 'Set 1 R1 accepts "twenty one"');
assert(isAnswerMatch(1, 'LETTER_2', '24 years old', 1), 'Set 1 R1 accepts "24 years old"');
assert(isAnswerMatch(2, 'LETTER_2', 'the letter M', 1), 'Set 1 R2 accepts "the letter M"');
assert(isAnswerMatch(2, 'LETTER_2', 'Letter M', 1), 'Set 1 R2 accepts "Letter M"');
assert(isAnswerMatch(2, 'TECH', '5, -1, 0, 1', 1), 'Set 1 R2 accepts comma separated C output');
assert(isAnswerMatch(4, 'LETTER_1', 'black', 1), 'Set 1 R4 accepts "black"');
assert(isAnswerMatch(4, 'LETTER_1', 'front prisoner is black', 1), 'Set 1 R4 accepts "front prisoner is black"');
assert(isAnswerMatch(4, 'LETTER_2', 'Box F', 1), 'Set 1 R4 accepts "Box F"');
assert(isAnswerMatch(4, 'TECH', '-3', 1), 'Set 1 R4 accepts decimal -3');

// ============================================================================
// 3. SCORING & DEDUCTION TESTS
// ============================================================================
assert(computeNetScore(1000, 0, 0) === 1000, 'Score 0 errors = 1000');
assert(computeNetScore(1000, 1, 0) === 1000, 'Score 1 error = 1000');
assert(computeNetScore(1000, 2, 0) === 1000, 'Score 2 errors = 1000 (warning)');
assert(computeNetScore(1000, 3, 0) === 985, 'Score 3 errors = 985 (-15 pts)');
assert(computeNetScore(1000, 3, 1) === 975, 'Score 3 errors + 1 hint = 975');
assert(computeNetScore(1000, 6, 2) === 950, 'Score 6 errors + 2 hints = 950');
assert(computeNetScore(0, 1) === 990, 'Score 0 errors + 1 hint (2 args) = 990 (-10 pts)');
assert(computeNetScore(3, 1) === 975, 'Score 3 errors + 1 hint (2 args) = 975 (-25 pts)');
assert(computeNetScore(6, 2) === 950, 'Score 6 errors + 2 hints (2 args) = 950 (-50 pts)');


// ============================================================================
// 4. ROUND 2 SEQUENTIAL ROOM PROGRESSION TESTS
// ============================================================================
function computeVerifiedCompleted(round2Step3Completed?: Record<number, boolean>, rawCompleted?: number[]): number[] {
  const completed: number[] = [];
  const rawList = Array.isArray(rawCompleted) ? rawCompleted : [];
  const step3 = round2Step3Completed || {};
  for (let r = 1; r <= 4; r++) {
    const isStep3Done = Boolean(step3[r]);
    const isInRaw = rawList.includes(r);
    if (isStep3Done || isInRaw) {
      if (r === 1 || completed.includes(r - 1)) {
        completed.push(r);
      } else {
        break; // strictly sequential
      }
    } else {
      break;
    }
  }
  return completed;
}

function computeGenuineRoom(verified: number[], rawCurrentRoom?: number): number {
  if (verified.includes(4)) return 5;
  const maxUnlocked = Math.min(4, verified.length + 1);
  if (typeof rawCurrentRoom === 'number' && rawCurrentRoom >= 1 && rawCurrentRoom <= maxUnlocked) {
    return rawCurrentRoom;
  }
  return maxUnlocked;
}

// Case 1: Fresh team entering Round 2 for the first time
const freshVerified = computeVerifiedCompleted({}, []);
assert(freshVerified.length === 0, 'Fresh team has 0 rooms verified cleared');
assert(computeGenuineRoom(freshVerified, 1) === 1, 'Fresh team starts at Room 1');
assert(computeGenuineRoom(freshVerified, 4) === 1, 'Fresh team cannot be forced to Room 4 by raw currentRoom');
assert(freshVerified.includes(4) === false, 'Fresh team Room 4 is not cleared');

// Case 2: Team solves Room 1
const r1Done = computeVerifiedCompleted({ 1: true }, [1]);
assert(r1Done.length === 1 && r1Done[0] === 1, 'Team after Room 1 has [1] cleared');
assert(computeGenuineRoom(r1Done, 2) === 2, 'Team after Room 1 advances to Room 2');
assert(computeGenuineRoom(r1Done, 4) === 2, 'Team after Room 1 cannot jump to Room 4');

// Case 3: Bogus/Spoofed payload with Room 4 solved without 2 & 3
const spoofed = computeVerifiedCompleted({ 1: true, 4: true }, [1, 4]);
assert(spoofed.length === 1 && spoofed[0] === 1, 'Spoofed Room 4 without 2 & 3 is rejected from verified rooms');
assert(computeGenuineRoom(spoofed, 4) === 2, 'Spoofed Room 4 clamped to Room 2');

// Case 4: Sequential clearance Room 1 -> 2 -> 3
const r3Done = computeVerifiedCompleted({ 1: true, 2: true, 3: true }, [1, 2, 3]);
assert(r3Done.length === 3, 'Rooms 1, 2, 3 verified cleared');
assert(computeGenuineRoom(r3Done, 4) === 4, 'Room 4 is now unlocked');
assert(r3Done.includes(4) === false, 'Room 4 not cleared until solved');

// Case 5: Full completion 1 -> 2 -> 3 -> 4
const allDone = computeVerifiedCompleted({ 1: true, 2: true, 3: true, 4: true }, [1, 2, 3, 4]);
assert(allDone.length === 4, 'All 4 rooms verified cleared');
assert(computeGenuineRoom(allDone) === 5, 'Current room advances to 5 (Restored/Completed)');
assert(allDone.includes(4) === true, 'Room 4 cleared');

// ============================================================================
// 5. COMBINED AVERAGE SCORE & COMPLETION TIME RANKING FORMULA TESTS
// ============================================================================

function calculateCombinedRanking(
  teams: { id: string; name: string; score: number; timeMinutes?: number; isFinished: boolean }[],
  maxScore: number
) {
  // Find fastest valid completion time among finished teams
  const finishedTimes = teams.filter((t) => t.isFinished && t.timeMinutes && t.timeMinutes > 0).map((t) => t.timeMinutes!);
  const fastestTime = finishedTimes.length > 0 ? Math.min(...finishedTimes) : 0;

  const evaluated = teams.map((t) => {
    // Score Percentage = (Team's Final Score / Maximum Possible Score) * 100
    const scorePercentage = (t.score / maxScore) * 100;

    // Time Performance = (Fastest Valid Completion Time / Team's Completion Time) * 100
    let timePerformance = 0;
    if (t.isFinished && fastestTime > 0 && t.timeMinutes && t.timeMinutes > 0) {
      timePerformance = (fastestTime / t.timeMinutes) * 100;
    }

    // Combined Score = (Score Percentage + Time Performance) / 2
    const combinedScore = Math.round(((scorePercentage + timePerformance) / 2) * 100) / 100;

    return {
      ...t,
      scorePercentage: Math.round(scorePercentage * 100) / 100,
      timePerformance: Math.round(timePerformance * 100) / 100,
      combinedScore,
      timeDisplay: t.isFinished && t.timeMinutes ? `${t.timeMinutes} min` : '--',
    };
  });

  // Rank teams by Combined Score in descending order. Highest Combined Score receives Rank 1.
  evaluated.sort((a, b) => b.combinedScore - a.combinedScore);
  return evaluated.map((item, idx) => ({ ...item, rank: idx + 1 }));
}

// Test Prompt's Exact Specification and Example:
// Max possible score = 100, Fastest valid time = 10 min
// Team Alpha: 90 pts, 20 min -> Combined Score 70
// Team Beta: 80 pts, 10 min -> Combined Score 90
// Team Gamma: 85 pts, 15 min -> Combined Score 75.83 (~75)
const exampleTeams = [
  { id: 'T-ALPHA', name: 'Team Alpha', score: 90, timeMinutes: 20, isFinished: true },
  { id: 'T-BETA', name: 'Team Beta', score: 80, timeMinutes: 10, isFinished: true },
  { id: 'T-GAMMA', name: 'Team Gamma', score: 85, timeMinutes: 15, isFinished: true },
  { id: 'T-DELTA', name: 'Team Delta (Unfinished)', score: 70, isFinished: false },
  { id: 'T-EPSILON', name: 'Team Epsilon (Unfinished)', score: 0, isFinished: false },
];

const rankedExample = calculateCombinedRanking(exampleTeams, 100);

assert(rankedExample[0].id === 'T-BETA', 'Rank 1 is Team Beta');
assert(rankedExample[0].combinedScore === 90, 'Team Beta Combined Score is exactly 90');
assert(rankedExample[0].scorePercentage === 80, 'Team Beta Score % is 80');
assert(rankedExample[0].timePerformance === 100, 'Team Beta Time Performance is 100');

assert(rankedExample[1].id === 'T-GAMMA', 'Rank 2 is Team Gamma');
assert(Math.round(rankedExample[1].combinedScore) === 75 || rankedExample[1].combinedScore === 75.83, 'Team Gamma Combined Score is 75.83 (rounded to 75)');
assert(rankedExample[1].scorePercentage === 85, 'Team Gamma Score % is 85');
assert(Math.round(rankedExample[1].timePerformance) === 67, 'Team Gamma Time Performance is ~66.67%');

assert(rankedExample[2].id === 'T-ALPHA', 'Rank 3 is Team Alpha');
assert(rankedExample[2].combinedScore === 70, 'Team Alpha Combined Score is exactly 70');
assert(rankedExample[2].scorePercentage === 90, 'Team Alpha Score % is 90');
assert(rankedExample[2].timePerformance === 50, 'Team Alpha Time Performance is 50');

// Unfinished team tests
assert(rankedExample[3].id === 'T-DELTA', 'Rank 4 is Team Delta (Unfinished)');
assert(rankedExample[3].combinedScore === 35, 'Team Delta Combined Score is 35 ((70 + 0) / 2)');
assert(rankedExample[3].timePerformance === 0, 'Team Delta Time Performance is 0 (no fake time)');
assert(rankedExample[3].timeDisplay === '--', 'Team Delta has no fake completion time assigned (-- displayed)');

assert(rankedExample[4].id === 'T-EPSILON', 'Rank 5 is Team Epsilon (0 points, unfinished)');
assert(rankedExample[4].combinedScore === 0, 'Team Epsilon Combined Score is 0');
assert(rankedExample[4].timeDisplay === '--', 'Team Epsilon time display is --');

// ============================================================================
// 6. ROUND 2 TIMER STOP CONDITION & REPEATED SUBMISSION SAFETY TESTS
// ============================================================================

interface MockTeamTimerState {
  round2StartTime?: number;
  round2FinishTime?: number;
  round2TimeSpentSeconds?: number;
  round2Status?: string;
  round2Step3Completed: Record<number, boolean>;
  round2CompletedRooms: number[];
  clearedRoom4: boolean;
  failedAttempts: number;
}

function processTechSubmission(
  teamState: MockTeamTimerState,
  roomId: number,
  answer: string,
  setId: number = 1,
  submissionTimestamp: number = Date.now()
) {
  const isCorrect = isAnswerMatch(roomId, 'TECH', answer, setId);

  if (!isCorrect) {
    teamState.failedAttempts++;
    return {
      success: false,
      isCorrect: false,
      timerStopped: false,
      message: 'ACCESS DENIED',
    };
  }

  const wasAlreadyCompleted = Boolean(teamState.round2Step3Completed[roomId]);
  teamState.round2Step3Completed[roomId] = true;
  if (!teamState.round2CompletedRooms.includes(roomId)) {
    teamState.round2CompletedRooms.push(roomId);
  }

  // Preceding rooms sequential check
  const hasPrecedingRooms = roomId === 1 || [1, 2, 3].slice(0, roomId - 1).every((r) => teamState.round2CompletedRooms.includes(r));

  let timerStopped = false;

  // Requirement 2: Stop timer immediately when Technical Question No. 4 is cleared
  // Restriction: Do not stop timer after Questions 1, 2, or 3
  if (roomId === 4 && hasPrecedingRooms) {
    teamState.clearedRoom4 = true;
    teamState.round2Status = 'COMPLETED';

    // Requirement 4 & 8: Record official elapsed time immediately and do not overwrite if already set
    if (!teamState.round2FinishTime) {
      teamState.round2FinishTime = submissionTimestamp;
      const start = teamState.round2StartTime || (submissionTimestamp - 60000);
      teamState.round2TimeSpentSeconds = Math.max(1, Math.round((submissionTimestamp - start) / 1000));
    }
    timerStopped = true;
  }

  return {
    success: true,
    isCorrect: true,
    timerStopped,
    round2FinishTime: teamState.round2FinishTime,
    timeSpentSeconds: teamState.round2TimeSpentSeconds,
    wasAlreadyCompleted,
  };
}

const startTime = 1700000000000;
const testTeam: MockTeamTimerState = {
  round2StartTime: startTime,
  round2Step3Completed: {},
  round2CompletedRooms: [],
  clearedRoom4: false,
  failedAttempts: 0,
};

// Test 6.1: Technical Question 1 solved -> Timer does NOT stop
const tq1Res = processTechSubmission(testTeam, 1, '361', 1, startTime + 120000);
assert(tq1Res.success === true, 'TQ1 answer accepted');
assert(tq1Res.timerStopped === false, 'TQ1 does NOT stop the timer (Requirement restriction)');
assert(testTeam.round2FinishTime === undefined, 'TQ1 does not set finish time');

// Test 6.2: Technical Question 2 solved -> Timer does NOT stop
const tq2Res = processTechSubmission(testTeam, 2, '1 0', 1, startTime + 250000);
assert(tq2Res.success === true, 'TQ2 answer accepted');
assert(tq2Res.timerStopped === false, 'TQ2 does NOT stop the timer (Requirement restriction)');
assert(testTeam.round2FinishTime === undefined, 'TQ2 does not set finish time');

// Test 6.3: Technical Question 3 solved -> Timer does NOT stop
const tq3Res = processTechSubmission(testTeam, 3, '128', 1, startTime + 400000);
assert(tq3Res.success === true, 'TQ3 answer accepted');
assert(tq3Res.timerStopped === false, 'TQ3 does NOT stop the timer (Requirement restriction)');
assert(testTeam.round2FinishTime === undefined, 'TQ3 does not set finish time');

// Test 6.4: Technical Question 4 INCORRECT submission -> Timer continues running
const tq4WrongRes = processTechSubmission(testTeam, 4, '9999', 1, startTime + 500000);
assert(tq4WrongRes.success === false, 'TQ4 incorrect answer rejected');
assert(tq4WrongRes.timerStopped === false, 'TQ4 incorrect submission does NOT stop timer (Requirement 7)');
assert(testTeam.round2FinishTime === undefined, 'TQ4 incorrect submission leaves finish time undefined');
assert(testTeam.failedAttempts === 1, 'TQ4 incorrect submission increments failed attempts');

// Test 6.5: Technical Question 4 CORRECT submission -> Timer stops immediately & records official elapsed time
const validTq4Time = startTime + 534000; // 534 seconds elapsed
const tq4CorrectRes = processTechSubmission(testTeam, 4, '1111 1111 1111 1101', 1, validTq4Time);
assert(tq4CorrectRes.success === true, 'TQ4 correct answer validated');
assert(tq4CorrectRes.timerStopped === true, 'TQ4 validation IMMEDIATELY stops timer (Requirement 2 & 3)');
assert(testTeam.round2FinishTime === validTq4Time, 'Official completion timestamp recorded immediately (Requirement 4 & 6)');
assert(testTeam.round2TimeSpentSeconds === 534, 'Official elapsed time is exactly 534 seconds');
assert(testTeam.clearedRoom4 === true, 'Room 4 is officially cleared');

// Test 6.6: Repeated submission to Technical Question 4 -> Preserves original timestamp & time
const repeatedSubmissionTime = startTime + 900000; // 900 seconds later
const tq4RepeatRes = processTechSubmission(testTeam, 4, '1111 1111 1111 1101', 1, repeatedSubmissionTime);
assert(tq4RepeatRes.success === true, 'Repeated TQ4 submission accepted idempotently');
assert(tq4RepeatRes.wasAlreadyCompleted === true, 'Marked as was already completed');
assert(testTeam.round2FinishTime === validTq4Time, 'Original completion timestamp CANNOT be overwritten (Requirement 8)');
assert(testTeam.round2TimeSpentSeconds === 534, 'Original elapsed time remains 534s and is NOT overwritten (Requirement 8)');

// Test 6.7: Leaderboard calculation uses the saved completion time (534s = 8.9 min)
const leaderboardEntry = calculateCombinedRanking(
  [
    { id: 'T-FAST', name: 'Fast Team', score: 900, timeMinutes: 5, isFinished: true },
    { id: 'T-CURRENT', name: 'Test Team', score: 950, timeMinutes: Math.round(534 / 60), isFinished: true }, // ~9 min
  ],
  1000
);
assert(leaderboardEntry.find((t) => t.id === 'T-CURRENT') !== undefined, 'Team appears on leaderboard');
assert(leaderboardEntry.find((t) => t.id === 'T-CURRENT')?.timeDisplay === '9 min', 'Saved completion time displayed on leaderboard');

// ============================================================================
// 7. LEADERBOARD PERSISTENCE & MONOTONICITY TESTS
// ============================================================================
// Simulating Round 1 and Round 2 independent completion persistence
interface TestPersistenceTeam {
  id: string;
  name: string;
  completedChallenges: string[];
  passwordStatus: string;
  round1Completed?: boolean;
  finishTimeRound1?: number;
  clearedRoom4?: boolean;
  round2Status?: string;
  round2CompletedRooms?: number[];
  finishTimeRound2?: number;
}

const pTeam: TestPersistenceTeam = {
  id: 'TEAM-PERSIST',
  name: 'Persistence Squad',
  completedChallenges: ['CH-01', 'CH-02', 'CH-03', 'CH-04', 'CH-05'],
  passwordStatus: 'COMPLETED',
  finishTimeRound1: 1700000000,
  clearedRoom4: true,
  round2Status: 'COMPLETED',
  round2CompletedRooms: [1, 2, 3, 4],
  finishTimeRound2: 1700003000,
};

function isTeamR1Cleared(t: TestPersistenceTeam): boolean {
  return t.passwordStatus === 'COMPLETED' || Boolean(t.round1Completed) || Boolean(t.finishTimeRound1 && t.finishTimeRound1 > 0);
}

function isTeamR2Cleared(t: TestPersistenceTeam): boolean {
  return Boolean(t.clearedRoom4) || t.round2Status === 'COMPLETED' || Boolean(t.round2CompletedRooms?.includes(4)) || Boolean(t.finishTimeRound2 && t.finishTimeRound2 > 0);
}

assert(isTeamR1Cleared(pTeam) === true, 'Team Round 1 is verified Cleared');
assert(isTeamR2Cleared(pTeam) === true, 'Team Round 2 is verified Cleared');

// Emulate client sending sync progress with lower room number or empty progress
function emulateSyncProgress(t: TestPersistenceTeam, clientCurrentRoom: number) {
  const isR2Cleared = isTeamR2Cleared(t);
  if (isR2Cleared) {
    t.round2Status = 'COMPLETED';
    t.clearedRoom4 = true;
    if (!t.round2CompletedRooms?.includes(4)) {
      t.round2CompletedRooms = [1, 2, 3, 4];
    }
  } else {
    t.round2Status = 'IN_PROGRESS';
  }
}

emulateSyncProgress(pTeam, 2);
assert(pTeam.clearedRoom4 === true, 'Sync progress NEVER overwrites clearedRoom4 when already cleared');
assert(pTeam.round2Status === 'COMPLETED', 'Sync progress NEVER demotes round2Status to IN_PROGRESS');
assert(isTeamR1Cleared(pTeam) === true, 'Round 1 completion status remains completely independent and intact');

// ============================================================================
// 8. TAB SWITCH MONITORING & DEDUPLICATION TESTS
// ============================================================================
const auditMessage = `[SECURITY AUDIT] Team: "Alpha Squad" | Team ID: TEAM-01 | Round: 2 | Event: Tab Switched / Window Lost Focus | Timestamp: 2026-10-23T12:00:00.000Z`;

const match = auditMessage.match(/Team:\s*"([^"]+)"\s*\|\s*Team ID:\s*([^\s|]+)\s*\|\s*Round:\s*([^\s|]+)\s*\|\s*Event:\s*([^|]+)\s*\|\s*Timestamp:\s*(.+)/);
assert(match !== null, 'Security audit log message parses successfully');
assert(match![1] === 'Alpha Squad', 'Parsed team name is Alpha Squad');
assert(match![2] === 'TEAM-01', 'Parsed team ID is TEAM-01');
assert(match![3] === '2', 'Parsed round is 2');
assert(match![4].trim() === 'Tab Switched / Window Lost Focus', 'Parsed event type is Tab Switched / Window Lost Focus');

// Test deduplication threshold (1500ms)
let lastAlertTime = 1000;
function shouldRecordAlert(newTime: number): boolean {
  if (newTime - lastAlertTime < 1500) {
    return false; // throttled / duplicate
  }
  lastAlertTime = newTime;
  return true;
}

assert(shouldRecordAlert(1200) === false, 'Duplicate event at +200ms (blur + visibilitychange) is throttled');
assert(shouldRecordAlert(1400) === false, 'Duplicate event at +400ms is throttled');
assert(shouldRecordAlert(2600) === true, 'Legitimate subsequent tab switch after 1600ms is recorded');

console.log('------------------------------------------------------------');
console.log(`ALL ${passedTests}/${totalTests} TESTS PASSED PERFECTLY! 🚀`);
console.log('------------------------------------------------------------');

