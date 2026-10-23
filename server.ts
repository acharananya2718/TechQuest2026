import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import type {
  ActivityLog,
  Challenge,
  Difficulty,
  EventSettings,
  PublicLeaderboardEntry,
  RoundId,
  SubmissionLog,
  Team,
  TeamMember,
} from './src/types/index.ts';
import { verify, isAnswerMatch, type RoomStep } from './src/game/verify.ts';
import {
  ROUND1_CHALLENGES_BY_SET,
  ROUND1_PASSWORD_CLUES_BY_SET,
  ROUND1_PASSWORDS,
  ROUND2_FIELD_GUIDE_HINTS,
  ROUND2_FIELD_GUIDE_TITLE,
  validateRound1AnswerForSet,
  validateRound1PasswordForSet,
  getSetIdForColor,
  getColorForSetId,
  getSetCodeForId,
  type QuestionSetId,
} from './src/game/questionSets.ts';
import {
  getRoomsConfigForSet,
  SET_TRACKS,
} from './src/game/roomsData.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DATA_FILE = path.join(__dirname, 'competition_data.json');

app.use(express.json());

// ==========================================
// IN-MEMORY / PERSISTENT STORE
// ==========================================
interface PasswordClue {
  index: number;
  title: string;
  clue: string;
  answerChar: string; // Organizer key only!
  hints: string[];
}

export interface Round2RoomDefinition {
  roomId: number; // 1, 2, 3, 4
  roomName: string; // "The Discovery", "The Decoder", "The System", "The Final Vault"
  roomCode: string; // "ROOM-01", "ROOM-02", "ROOM-03", "ROOM-04"
  roomMission: string;
  difficulty: string;
  points: number;
  // Step 1: Letter / Spatial Clue Puzzle
  letterPuzzleTitle: string;
  letterPuzzleType: 'SPATIAL_GRID' | 'DECRYPTION_MATRIX' | 'LADDER_LOGIC' | 'ROTOR_SYNC';
  letterPuzzlePrompt: string;
  revealedLetters: string;
  venueLocation: string;
  locationClueDescription: string;
  // Step 2: Physical Key Verification
  physicalKeyCode: string;
  physicalKeyPrompt: string;
  physicalLocationClue?: string;
  physicalVerificationCode?: string;
  // Step 3: Technical Challenge (Level 2)
  techTitle: string;
  techTopic: string;
  techQuestion: string;
  techCodeSnippet?: string;
  techDiagram?: string;
  techAnswer: string;
  techExplanation: string;
  puzzleTitle?: string;
  puzzleQuestion?: string;
  puzzleDiagram?: string;
  puzzleCodeSnippet?: string;
  correctAnswer?: string;
  // Hint
  hint: string;
  hintPenaltyPoints: number;
  systemContext?: string;
}

export interface Round2LeaderboardEntry {
  rank: number;
  teamId: string;
  teamName: string;
  department: string;
  college: string;
  score: number;
  currentRoom: number;
  currentRoomName: string;
  completedRoomsCount: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  hintsUsed: number;
  timeSpentSeconds: number;
  timeFormatted: string;
  isQualified: boolean;
}

interface DatabaseSchema {
  settings: EventSettings;
  teams: Record<string, Team>;
  challenges: Record<string, Challenge>;
  submissions: SubmissionLog[];
  logs: ActivityLog[];
  passwordClues: PasswordClue[];
  round1FinalPassword: string;
  escapeRooms: Round2RoomDefinition[];
  escapeRoomPuzzles: {
    index: number;
    systemName: string;
    title: string;
    question: string;
    diagram?: string;
    codeSnippet?: string;
    hint: string;
    rewardCode: string;
    correctAnswer: string;
  }[];
  finalVaultChallenge: {
    id: string;
    title: string;
    question: string;
    systemContext: string;
    diagramAscii?: string;
    codeSnippet?: string;
    hint: string;
    correctAnswer: string;
    points: number;
  };
  registrationCounter?: number;
}

const defaultPasswordClues: PasswordClue[] = [
  {
    index: 1,
    title: 'CLUE 1',
    clue: 'I am the sound a engine makes when revved, the start of every Race, and the letter that turns a Cat into a Cart. Look to the 18th place in the alphabet.',
    answerChar: 'R',
    hints: [
      'Engine rev: Vroom... V-R-R-R.',
      'The start of the word "Race" and 18th place in the English alphabet.',
      'The single letter is R.',
    ],
  },
  {
    index: 2,
    title: 'CLUE 2',
    clue: 'Count the wheels on a passing car, the suits in a deck of cards, or the seasons that circle the year. Multiply two by itself, and you shall find my key.',
    answerChar: '4',
    hints: [
      'Four wheels on a car, four suits in cards, four seasons in a year.',
      'Multiply two by itself: 2 × 2.',
      'The single digit is 4.',
    ],
  },
  {
    index: 3,
    title: 'CLUE 3',
    clue: 'Four lines intertwine to build a small cage, two lying flat, two standing tall. I turn a musical note sharp, transform words into trending tags, and sit in the corner of your phone dialer waiting to be pressed.',
    answerChar: '#',
    hints: [
      'Four lines forming a small cage on a phone keypad.',
      'Used on social media platforms to mark trending hashtags.',
      'The symbol is #.',
    ],
  },
  {
    index: 4,
    title: 'CLUE 4',
    clue: 'I am shaped like a crossroads where three roads meet, but the path forward is blocked. I sit in the very center of water, stand at the very end of night, and without me, time itself would lose its start.',
    answerChar: 'T',
    hints: [
      'Look at the letter inside wa[T]er (center) and nigh[T] (end).',
      'The first letter of "Time".',
      'The single letter is T.',
    ],
  },
  {
    index: 5,
    title: 'CLUE 5',
    clue: 'I am the digit that returns to itself when added to any number\'s digital root. I mark the total value of a baseball team on the field, the highest single threshold before a new place value is born, and the exact count of rings forged for Mortal Men doomed to die. Cast my reflection in a mirror and I mimic a six, but divide thirty-six by four to unlock my true identity.',
    answerChar: '9',
    hints: [
      'A baseball team fielding count is nine.',
      'Calculate thirty-six divided by four: 36 / 4.',
      'The single digit is 9.',
    ],
  },
];

const DEFAULT_ROUND1_PASSWORD = 'R4#T9';

const defaultPasswordHints = [
  'Analyze each of the five cryptic riddles in sequence to deduce the five individual characters.',
  'The sequence consists of: 1st: Letter R, 2nd: Number 4, 3rd: Special symbol #, 4th: Letter T, 5th: Single digit.',
  'Combine the 5 exact characters in order: R, 4, #, T, followed by 36 / 4.',
];

const defaultInitialChallenges: Record<string, Challenge> = {
  'CH-01': {
    id: 'CH-01',
    round: 'ROUND_1',
    nodeCode: 'Q1',
    title: 'Question 1: Logical Reasoning',
    category: 'DIGITAL',
    difficulty: 'EASY',
    points: 100,
    question: 'Find the number that replaces the question mark.\n\nSeries: 25, 49, 121, 169, ?',
    questionType: 'NUMERICAL',
    correctAnswer: '289',
    hints: [
      'Look for a relationship between prime numbers and squares.',
      'The square roots of the given numbers are prime numbers.',
      'Find the next prime number after 13 and square it.',
    ],
    hint: 'Look for a relationship between prime numbers and squares.',
    explanation: 'The numbers are squares of prime numbers: 5², 7², 11², 13², and 17². Therefore, the next number is 17² = 289.',
    hintPenaltyPoints: 10,
    order: 1,
    active: true,
  },
  'CH-02': {
    id: 'CH-02',
    round: 'ROUND_1',
    nodeCode: 'Q2',
    title: 'Question 2: C Programming Output',
    category: 'CODING',
    difficulty: 'MEDIUM',
    points: 100,
    question: 'What is the output of this C program?',
    codeSnippet: `#include <stdio.h>\nint main() {\nint i = 0;\nint j = i++ && printf("Geeks");\nprintf("%d %d", i, j);\nreturn 0;\n}`,
    questionType: 'TEXT',
    correctAnswer: '1 0',
    hints: [
      'Pay attention to the initial value of i. Remember that i++ uses the current value first and increments it afterward. Since && stops when its first operand is false, think about whether printf("Geeks") will execute!',
    ],
    hint: 'Pay attention to the initial value of i. Remember that i++ uses the current value first and increments it afterward. Since && stops when its first operand is false, think about whether printf("Geeks") will execute!',
    explanation: '1. i starts at 0. Post-increment i++ evaluates to 0 (false) and then increments i to 1.\n2. Because the left side of && is 0, the operator short-circuits and skips printf("Geeks").\n3. The result of && is 0, so j = 0.\n4. Output printed: 1 0.',
    hintPenaltyPoints: 10,
    order: 2,
    active: true,
  },
  'CH-03': {
    id: 'CH-03',
    round: 'ROUND_1',
    nodeCode: 'Q3',
    title: 'Question 3: Alphabet Coding',
    category: 'ENGINEERING_LOGIC',
    difficulty: 'EASY',
    points: 100,
    question: 'In a certain code, NEWYORK is written as 111. How is NEWJERSEY written in the same code?',
    questionType: 'NUMERICAL',
    correctAnswer: '124',
    hints: [
      'Each letter has a numerical value.',
      'Use the letter\'s position in the alphabet.',
      'Add the positions of all nine letters in NEWJERSEY.',
    ],
    hint: 'Each letter has a numerical value.',
    explanation: 'Add the alphabetical positions of each letter, where A = 1, B = 2, and so on. NEWJERSEY = 14 + 5 + 23 + 10 + 5 + 18 + 19 + 5 + 25 = 124.',
    hintPenaltyPoints: 10,
    order: 3,
    active: true,
  },
  'CH-04': {
    id: 'CH-04',
    round: 'ROUND_1',
    nodeCode: 'Q4',
    title: 'Question 4: Numerical Aptitude',
    category: 'ENGINEERING_LOGIC',
    difficulty: 'MEDIUM',
    points: 100,
    question: 'A postman traveled from his post office to a village in order to distribute mails. He started on his bicycle from the post office at the speed of 25 km/hr. But, when he was about to return, a thief stole his bicycle. As a result, he had to walk back to the post office on foot at a speed of 4 km/hr. If the traveling part of his day lasted for 2 hours and 54 minutes, find the distance between the post office and the village.',
    questionType: 'TEXT',
    correctAnswer: '10 km',
    hints: [
      'Convert the total travel time into minutes.',
      'The distance travelled in both directions is equal, but the speeds differ.',
      'Let the onward journey take t minutes and equate the two distance expressions.',
    ],
    hint: 'Convert the total travel time into minutes.',
    explanation: 'Total time = 174 minutes. Let onward journey take t minutes. 25t = 4(174 - t) => 29t = 696 => t = 24. Distance = 25 * 24/60 = 10 km.',
    hintPenaltyPoints: 10,
    order: 4,
    active: true,
  },
  'CH-05': {
    id: 'CH-05',
    round: 'ROUND_1',
    nodeCode: 'Q5',
    title: 'Question 5: Digital Logic and Number Systems',
    category: 'DIGITAL',
    difficulty: 'HARD',
    points: 100,
    question: 'What is the 16-bit two\'s complement representation of decimal −28?',
    questionType: 'TEXT',
    correctAnswer: '1111 1111 1110 0100',
    hints: [
      'Start by converting positive 28 to 16-bit binary.',
      'Invert every bit to obtain the one\'s complement.',
      'Add 1 to the inverted binary number.',
    ],
    hint: 'Start by converting positive 28 to 16-bit binary.',
    explanation: '1. Write +28 in 16-bit binary: 0000 0000 0001 1100. 2. Invert all bits: 1111 1111 1110 0011. 3. Add 1: 1111 1111 1110 0100.',
    hintPenaltyPoints: 10,
    order: 5,
    active: true,
  },
};

function getTeamColor(team?: Team): 'BLUE' | 'RED' | 'GREEN' {
  if (!team) return 'BLUE';
  if (team.color === 'BLUE' || team.color === 'RED' || team.color === 'GREEN') return team.color;
  if (team.assignedSet === 'SET_2') return 'RED';
  if (team.assignedSet === 'SET_3') return 'GREEN';
  return 'BLUE';
}

function getTeamSetId(team?: Team): QuestionSetId {
  if (!team) return 1;
  const color = getTeamColor(team);
  return getSetIdForColor(color);
}

function getRound2NetScore(team: Team): number {
  if (!team) return 0;
  const rawR2 = team.round2Score || 0;
  const r2Hints = team.round2HintsUsed || 0;
  const r2Errors = team.round2FailedAttempts !== undefined ? team.round2FailedAttempts : (team.failedAttempts || 0);
  const hintPenalty = r2Hints * 10;
  const errorPenalty = Math.floor(r2Errors / 3) * 15;
  return Math.max(0, rawR2 - hintPenalty - errorPenalty);
}

function getTeamNetScore(team: Team): number {
  if (!team) return 0;
  const basePoints = (team.score || 0) + (team.round2Score || 0) + (team.timeBonus || 0);
  const totalHints = (team.hintsUsed || 0) + (team.passwordHintsUsed || 0) + (team.round2HintsUsed || 0);
  const failedAttempts = team.failedAttempts || 0;
  const hintPenalty = totalHints * 10;
  const attemptPenalty = Math.floor(failedAttempts / 3) * 15;
  const net = basePoints - hintPenalty - attemptPenalty;
  return Math.max(0, net);
}

export function isTeamRound1Cleared(team?: Team): boolean {
  if (!team) return false;
  return Boolean(
    team.passwordStatus === 'COMPLETED' ||
    (team as any).round1Completed ||
    (team.finishTimeRound1 && team.finishTimeRound1 > 0)
  );
}

export function isTeamRound2Cleared(team?: Team): boolean {
  if (!team) return false;
  return Boolean(
    team.clearedRoom4 ||
    team.room4Cleared ||
    (team as any).round2Completed ||
    team.round2Status === 'COMPLETED' ||
    (team.round2Step3Completed && team.round2Step3Completed[4]) ||
    (Array.isArray(team.round2CompletedRooms) && team.round2CompletedRooms.includes(4) && team.round2CompletedRooms.length >= 4) ||
    (team.finishTimeRound2 && team.finishTimeRound2 > 0) ||
    (team.round2FinishTime && team.round2FinishTime > 0)
  );
}

function getVerifiedCompletedRooms(team?: Team): number[] {
  if (!team) return [];
  // If team is already verified as having cleared Round 2, preserve all 4 rooms
  if (isTeamRound2Cleared(team)) {
    return [1, 2, 3, 4];
  }
  const completed: number[] = [];
  const rawList = Array.isArray(team.round2CompletedRooms) ? team.round2CompletedRooms : [];
  const step3 = team.round2Step3Completed || {};

  // Sequential progression: Room 1 -> Room 2 -> Room 3 -> Room 4
  for (let r = 1; r <= 4; r++) {
    const isStep3Done = Boolean(step3[r]);
    const isInRaw = rawList.includes(r);
    if (isStep3Done || isInRaw) {
      completed.push(r);
    } else {
      break;
    }
  }
  return completed;
}

function isTeamRoom4Cleared(team?: Team): boolean {
  return isTeamRound2Cleared(team);
}

function getGenuineCurrentRoom(team?: Team): number {
  if (!team) return 1;
  if (isTeamRound2Cleared(team)) {
    return 5;
  }
  const verified = getVerifiedCompletedRooms(team);
  const maxUnlocked = Math.min(4, verified.length + 1);
  const saved = team.round2CurrentRoom;
  if (typeof saved === 'number' && saved >= 1 && saved <= maxUnlocked) {
    return saved;
  }
  return maxUnlocked;
}

function sanitizeTeamForClient(team: Team): Team {
  if (!team) return team;
  const color = getTeamColor(team);
  const assignedSet = getSetCodeForId(getSetIdForColor(color));
  const netScore = getTeamNetScore(team);
  const totalHints = (team.hintsUsed || 0) + (team.passwordHintsUsed || 0) + (team.round2HintsUsed || 0);
  const failedAttempts = team.failedAttempts || 0;
  const hintPenalty = totalHints * 10;
  const attemptPenalty = Math.floor(failedAttempts / 3) * 15;
  const netR2 = getRound2NetScore(team);

  const clearedR1 = isTeamRound1Cleared(team);
  const clearedR2 = isTeamRound2Cleared(team);
  const verifiedCompleted = clearedR2 ? [1, 2, 3, 4] : getVerifiedCompletedRooms(team);
  const currentRoom = clearedR2 ? 5 : getGenuineCurrentRoom(team);

  return {
    ...team,
    color,
    assignedSet,
    score: netScore,
    netScore,
    round2Score: netR2,
    round2RawScore: team.round2Score || 0,
    basePoints: (team.score || 0) + (team.round2Score || 0),
    totalHintsUsed: totalHints,
    failedAttempts,
    attemptPenalty,
    hintPenalty,
    penalties: hintPenalty + attemptPenalty,
    qualified: team.isQualified,
    clearedRoom4: clearedR2,
    room4Cleared: clearedR2,
    round1Completed: clearedR1,
    round2Completed: clearedR2,
    passwordStatus: clearedR1 ? 'COMPLETED' : (team.passwordStatus || 'LOCKED'),
    round2CompletedRooms: verifiedCompleted,
    round2CurrentRoom: currentRoom,
    round2Status: clearedR2
      ? 'COMPLETED'
      : (team.round2Status === 'NOT_STARTED' && verifiedCompleted.length === 0 ? 'NOT_STARTED' : 'IN_PROGRESS'),
    round2EscapeProgress: team.round2EscapeProgress || null,
  };
}



const defaultPuzzles = [
  {
    index: 1,
    systemName: 'DIGITAL SYSTEM',
    title: 'LOGIC MATRIX DESYNCHRONIZATION',
    question:
      'The auxiliary logic gate matrix has desynchronized. Given input vector A = 10110010 and B = 11001101, the parity bypass requires computing the Hexadecimal representation of (A XOR B) followed by a 2-bit circular left shift.',
    diagram: `[A: 10110010] ──┐\n                 ├──> [XOR] ──> [CIRCULAR SHIFT << 2] ──> [HEX DECODE]\n[B: 11001101] ──┘`,
    hint: 'Step 1: A XOR B = 01111111 (0x7F). Step 2: 8-bit left rotate by 2 bits moves the two MSBs (01) to the two LSBs: 11111101. Convert to Hex.',
    rewardCode: 'OMEGA-771',
    correctAnswer: 'FD',
  },
  {
    index: 2,
    systemName: 'ELECTRONICS SYSTEM',
    title: 'WHEATSTONE BRIDGE THERMAL FAULT',
    question:
      'Backup battery bus telemetry is fluctuating. A Wheatstone bridge monitoring temperature has R1 = 120Ω, R2 = 120Ω, and R3 = 330Ω. For the bridge to achieve null deflection (0V across galvanometer), what is the required resistance of the sensor branch Rx in Ohms?',
    diagram: `         +Vcc\n        /    \\\n      R1      R2 (120Ω)\n      /   (G)  \\\n     R3 ─────── Rx (?)\n      \\        /\n         GND`,
    hint: 'For balanced bridge null condition: (R1 / R3) = (R2 / Rx). Therefore Rx = (R2 * R3) / R1.',
    rewardCode: 'VOLT-409',
    correctAnswer: '330',
  },
  {
    index: 3,
    systemName: 'CODING SYSTEM',
    title: 'FIRMWARE POINTER TRACE & CHECKSUM',
    question:
      'The PLC firmware watchdog trapped in an infinite loop. Trace the C snippet below and submit the exact final value printed for *p3.',
    codeSnippet: `int data[] = { 14, 28, 42, 56, 70, 84 };\nint *p1 = data + 1; // 28\nint *p2 = p1 + 3;   // 70\nint *p3 = p2 - 2;   // ?\n*p3 = (*p1) * 2 + (*p2) / 10;\nprintf("%d", *p3);`,
    hint: 'p1 points to data[1]=28. p2 is data[4]=70. p3 is data[2]. Expression: 28 * 2 + 70 / 10 = 56 + 7 = 63.',
    rewardCode: 'KERNEL-883',
    correctAnswer: '63',
  },
  {
    index: 4,
    systemName: 'SENSOR SYSTEM',
    title: 'INDUSTRIAL RTD TELEMETRY DEVIATION',
    question:
      'Boiler chamber PT100 RTD resistance measures 138.5Ω at emergency cutoff. If R(0°C) = 100Ω and temperature coefficient α = 0.00385 /°C (using linear approximation R = R0 * (1 + α * T)), calculate the detected core temperature T in Celsius (°C).',
    diagram: `[PT100 SENSOR] ──── R = 138.5Ω ────> [ADC 16-BIT] ────> [CORE OVERHEAT TRACE]`,
    hint: 'ΔR = 138.5 - 100 = 38.5Ω. T = ΔR / (R0 * α) = 38.5 / (100 * 0.00385) = 100.',
    rewardCode: 'FLUX-512',
    correctAnswer: '100',
  },
  {
    index: 5,
    systemName: 'ENGINEERING LOGIC',
    title: '6-AXIS HYDRAULIC ACTUATOR BALANCING',
    question:
      'A dual hydraulic cylinder must lift a 12,000 N assembly evenly. Cylinder 1 has piston bore area A1 = 40 cm², while Cylinder 2 has piston bore area A2 = 60 cm². If both operate from a common pressure manifold P, what pressure in Pascals (N/m²) is required to support the load? (Assume 1 cm² = 0.0001 m², Total Force = P * (A1 + A2)).',
    diagram: `[PUMP P] ──┬──> [CYLINDER 1: 40 cm²] ──┐\n           └──> [CYLINDER 2: 60 cm²] ──┴──> LOAD = 12,000 N`,
    hint: 'Total Area = 40 + 60 = 100 cm² = 0.01 m². Pressure P = F / Total Area = 12,000 / 0.01 = 1,200,000 Pa.',
    rewardCode: 'NEXUS-990',
    correctAnswer: '1200000',
  },
];

const defaultEscapeRooms: Round2RoomDefinition[] = [
  {
    roomId: 1,
    roomName: 'The Discovery',
    roomCode: 'ROOM-01',
    roomMission: 'Open the front door of the facility.',
    difficulty: 'LEVEL 2: MODERATE',
    points: 100,
    letterPuzzleTitle: 'PERIMETER SENSOR SPATIAL GRID',
    letterPuzzleType: 'SPATIAL_GRID',
    letterPuzzlePrompt: 'Trace spatial coordinate grid vectors to reveal the facility entrance terminal coordinates.',
    revealedLetters: 'L1',
    venueLocation: 'Lab Bench 1',
    locationClueDescription: 'Physical keycard hidden at Lab Bench 1 (Intake Junction).',
    physicalKeyCode: 'DOOR-KEY-91',
    physicalVerificationCode: 'DOOR-KEY-91',
    physicalKeyPrompt: 'Enter the physical keycard code hidden at Lab Bench 1.',
    techTitle: 'NESTED SQUARE-PRIME SERIES & ALTERNATING LOGIC',
    techTopic: 'Nested Square-Prime Series & Alternating Logic',
    techQuestion: 'Find the number that replaces the question mark (?) in the series:\n9, 25, 49, 121, 169, 289, 361, ?',
    techAnswer: '529',
    correctAnswer: '529',
    techExplanation: 'Squares of prime numbers: 3²=9, 5²=25, 7²=49, 11²=121, 13²=169, 17²=289, 19²=361. Next prime is 23. Therefore, 23² = 529.',
    hint: 'Each number is the square of a prime number: 3², 5², 7², 11², 13², 17², 19². Identify the next prime number after 19 and compute its square.',
    hintPenaltyPoints: 10,
  },
  {
    roomId: 2,
    roomName: 'The Decoder',
    roomCode: 'ROOM-02',
    roomMission: 'Restore deadlocked CAN bus telemetry.',
    difficulty: 'LEVEL 2: ADVANCED',
    points: 150,
    letterPuzzleTitle: 'COMMUNICATIONS MATRIX DECRYPTION CIPHER',
    letterPuzzleType: 'DECRYPTION_MATRIX',
    letterPuzzlePrompt: 'Decode bus parity vectors to uncover the telemetry scope terminal.',
    revealedLetters: 'S2',
    venueLocation: 'Scope Station 2',
    locationClueDescription: 'Physical card attached to Scope Station 2 near the oscilloscope rack.',
    physicalKeyCode: 'DECODER-CHIP-42',
    physicalVerificationCode: 'DECODER-CHIP-42',
    physicalKeyPrompt: 'Enter the verification code embossed on the Scope Station 2 microcontroller tag.',
    techTitle: 'C PROGRAM TRACE: OPERATOR PRECEDENCE & SHORT-CIRCUITING',
    techTopic: 'Post/Pre-Increment & Complex Bitwise Operator Precedence',
    techQuestion: 'What is the exact output printed by this program?',
    techCodeSnippet: `#include <stdio.h>\nint main() {\nint i = 0;\nint j = i++ && printf("Geeks");\nprintf("%d %d", i, j);\nreturn 0;\n}`,
    techAnswer: '1 0',
    correctAnswer: '1 0',
    techExplanation: '1. i starts at 0. In i++, the current value 0 (false) is evaluated first, then i increments to 1.\n2. Because the left operand of && is 0, logical AND short-circuits and skips printf("Geeks").\n3. The logical AND yields 0, assigned to j.\n4. printf("%d %d", i, j) prints: 1 0.',
    hint: 'Pay attention to the initial value of i. Remember that i++ uses the current value first and increments it afterward. Since && stops when its first operand is false, think about whether printf("Geeks") will execute!',
    hintPenaltyPoints: 10,
  },
  {
    roomId: 3,
    roomName: 'The System',
    roomCode: 'ROOM-03',
    roomMission: 'Overrule safety lockout interlocks.',
    difficulty: 'LEVEL 2: HIGH',
    points: 200,
    letterPuzzleTitle: 'SCADA PLC RELAY LADDER LOGIC TRACE',
    letterPuzzleType: 'LADDER_LOGIC',
    letterPuzzlePrompt: 'Trace power flow through ladder rungs to energize the master safety coil.',
    revealedLetters: 'P3',
    venueLocation: '3D Printer Enclosure',
    locationClueDescription: 'Physical tag in 3D Printer Enclosure on acrylic safety visor at Workbench 03.',
    physicalKeyCode: 'SYSTEM-RELAY-88',
    physicalVerificationCode: 'SYSTEM-RELAY-88',
    physicalKeyPrompt: 'Enter the 4-digit System Lockout Key etched on the acrylic safety visor in the 3D Printer Enclosure.',
    techTitle: 'WEIGHTED POSITIONAL CHARACTER CIPHER',
    techTopic: 'Alphabet Coding & Modulo Encryption',
    techQuestion: 'Letters map to A=1 … Z=26. Multiply by weights 1, 2, 1, 2, … by position and sum. Compute the coded value of NEWJERSEY',
    techAnswer: '162',
    correctAnswer: '162',
    techExplanation: 'N(14×1) + E(5×2) + W(23×1) + J(10×2) + E(5×1) + R(18×2) + S(19×1) + E(5×2) + Y(25×1) = 14 + 10 + 23 + 20 + 5 + 36 + 19 + 10 + 25 = 162.',
    hint: 'Alphabet indices (1-26): N=14, E=5, W=23, J=10, E=5, R=18, S=19, E=5, Y=25. Apply weights (1, 2, 1, 2, 1, 2, 1, 2, 1) and sum all products.',
    hintPenaltyPoints: 10,
  },
  {
    roomId: 4,
    roomName: 'The Final Vault',
    roomCode: 'ROOM-04',
    roomMission: 'Disengage facility lockdown and capture the flag.',
    difficulty: 'LEVEL 2: MAXIMUM CRITICAL',
    points: 300,
    letterPuzzleTitle: '3-PHASE ROTOR STATOR FREQUENCY SYNC',
    letterPuzzleType: 'ROTOR_SYNC',
    letterPuzzlePrompt: 'Synchronize 3-phase induction slip and stator coils to access the Master Core.',
    revealedLetters: 'V4',
    venueLocation: 'Vault Control Desk',
    locationClueDescription: 'Master Physical Authorization Key from Chief Proctor / Central Vault Control Desk in Room 200.',
    physicalKeyCode: 'VAULT-FLAG-777',
    physicalVerificationCode: 'VAULT-FLAG-777',
    physicalKeyPrompt: 'Enter the Master Authorization Key obtained from the Vault Control Desk.',
    techTitle: '16-BIT TWO\'S COMPLEMENT & ACCELERATION KINEMATICS',
    techTopic: '16-Bit Two\'s Complement & Acceleration Kinematics',
    techQuestion: 'An automated guided vehicle (AGV) accelerates uniformly from rest to 36 km/h over 10 seconds. Calculate its displacement in meters (S), then express S as a negative integer (-S) represented in 16-bit 2\'s Complement binary (format as four 4-bit nibbles with single spaces, e.g., 1111 1111 0000 0000).',
    techAnswer: '1111 1111 1100 1110',
    correctAnswer: '1111 1111 1100 1110',
    techExplanation: '1. v = 36 km/h = 10 m/s. a = 10 / 10 = 1 m/s². S = 0.5 * 1 * 10² = 50 m.\n2. Target value is -50.\n3. +50 in 16-bit binary: 0000 0000 0011 0010.\n4. Invert bits (1\'s complement): 1111 1111 1100 1101.\n5. Add 1 (2\'s complement): 1111 1111 1100 1110.',
    hint: 'Convert 36 km/h to 10 m/s. Acceleration a = 1 m/s², so S = 50 m. Express -50 in 16-bit two\'s complement binary: invert the bits of +50 and add 1.',
    hintPenaltyPoints: 10,
  },
];

const defaultFinalVault = {
  id: 'VAULT-001',
  title: 'THE FINAL VAULT: QUANTUM CORE INTERLOCK',
  question:
    'The mainframe central vault is protected by a multi-variable engineering polynomial key. Solve for the master unlock key K: In a synchronized 3-phase induction motor operating at 50 Hz with 4 poles and slip s = 0.04 (4%), calculate the rotor speed in RPM, then take the sum of the digits of this speed and multiply by 42.',
  systemContext:
    'CRITICAL AUTHORIZATION REQUIRED: Top qualifying engineering squads only. System security lock is counting down.',
  diagramAscii: `  ┌────────────────────────────────────────────────────────┐\n  │ [3-PHASE INDUCTION MOTOR] 50 Hz | 4 POLES | SLIP 4%    │\n  │ Synchronous Speed Ns = (120 * f) / P                   │\n  │ Rotor Speed Nr = Ns * (1 - s)                          │\n  │ Master Key = (Sum of digits of Nr) * 42                │\n  └────────────────────────────────────────────────────────┘`,
  hint: 'Ns = (120 * 50) / 4 = 1500 RPM. Nr = 1500 * (1 - 0.04) = 1440 RPM. Sum of digits = 1 + 4 + 4 + 0 = 9. Master Key = 9 * 42 = 378.',
  correctAnswer: '378',
  points: 250,
};


const defaultDemoTeams: Record<string, Team> = {
  'TQ-CYBER-101': {
    id: 'TQ-CYBER-101',
    name: 'CYBERDYNE SYSTEMS',
    loginCode: 'CYBER2026',
    leaderName: 'Aarav Sharma',
    leaderEmail: 'aarav.sharma@eng.edu',
    leaderPhone: '+91 98450 11223',
    department: 'Computer Science & Eng',
    college: 'Apex Institute of Technology',
    members: [
      { name: 'Aarav Sharma', usn: '4AP21CS014', department: 'CSE' },
      { name: 'Pooja Hegde', usn: '4AP21CS042', department: 'CSE' },
      { name: 'Karthik Rao', usn: '4AP21CS089', department: 'ISE' },
    ],
    currentRound: 'ROUND_2',
    status: 'QUALIFIED',
    score: 620,
    timeBonus: 40,
    penalties: 5,
    totalTimeSpentSeconds: 2420,
    completedChallenges: ['CH-01', 'CH-02', 'CH-03', 'CH-04', 'CH-05'],
    unlockedCodesRound2: { 1: 'OMEGA-771', 2: 'VOLT-409' },
    selectedDifficulties: {},
    hintsUsed: 1,
    attemptsCount: 10,
    passwordStatus: 'COMPLETED',
    isQualified: true,
    createdAt: Date.now() - 3600000,
  },
  'TQ-QUANTUM-202': {
    id: 'TQ-QUANTUM-202',
    name: 'QUANTUM PULSE',
    loginCode: 'PULSE2026',
    leaderName: 'Rohan Deshmukh',
    leaderEmail: 'rohan.d@eng.edu',
    leaderPhone: '+91 98765 43210',
    department: 'Electronics & Comm Eng',
    college: 'National Institute of Tech',
    members: [
      { name: 'Rohan Deshmukh', usn: '4NI22EC011', department: 'ECE' },
      { name: 'Sneha Patel', usn: '4NI22EC033', department: 'ECE' },
      { name: 'Varun Nair', usn: '4NI22EE005', department: 'EEE' },
      { name: 'Ananya Roy', usn: '4NI22EC055', department: 'ECE' },
    ],
    currentRound: 'ROUND_2',
    status: 'QUALIFIED',
    score: 580,
    timeBonus: 35,
    penalties: 0,
    totalTimeSpentSeconds: 2680,
    completedChallenges: ['CH-01', 'CH-02', 'CH-03', 'CH-04', 'CH-05'],
    unlockedCodesRound2: { 1: 'OMEGA-771' },
    selectedDifficulties: {},
    hintsUsed: 0,
    attemptsCount: 8,
    passwordStatus: 'COMPLETED',
    isQualified: true,
    createdAt: Date.now() - 3500000,
  },
  'TQ-MECH-303': {
    id: 'TQ-MECH-303',
    name: 'MECH HORIZON',
    loginCode: 'MECH2026',
    leaderName: 'Vikramaditya Sen',
    leaderEmail: 'vikram.sen@eng.edu',
    leaderPhone: '+91 91234 56789',
    department: 'Mechanical Engineering',
    college: 'Heritage College of Eng',
    members: [
      { name: 'Vikramaditya Sen', usn: '4HC21ME020', department: 'ME' },
      { name: 'Aditya Kulkarni', usn: '4HC21ME045', department: 'ME' },
    ],
    currentRound: 'ROUND_1',
    status: 'ACTIVE',
    score: 410,
    timeBonus: 20,
    penalties: 10,
    totalTimeSpentSeconds: 3100,
    completedChallenges: ['CH-01', 'CH-02', 'CH-03'],
    unlockedCodesRound2: {},
    selectedDifficulties: {},
    hintsUsed: 2,
    attemptsCount: 7,
    passwordStatus: 'LOCKED',
    isQualified: false,
    createdAt: Date.now() - 3400000,
  },
  'TQ-VOLT-404': {
    id: 'TQ-VOLT-404',
    name: 'VOLT DYNAMICS',
    loginCode: 'VOLT2026',
    leaderName: 'Meera Nambiar',
    leaderEmail: 'meera.n@eng.edu',
    leaderPhone: '+91 97412 34567',
    department: 'Electrical & Electronics',
    college: 'St. Joseph Engineering College',
    members: [
      { name: 'Meera Nambiar', usn: '4SJ22EE018', department: 'EEE' },
      { name: 'Gautam Menon', usn: '4SJ22EE029', department: 'EEE' },
      { name: 'Tara Bhat', usn: '4SJ22CS090', department: 'CSE' },
    ],
    currentRound: 'ROUND_1',
    status: 'ACTIVE',
    score: 0,
    timeBonus: 0,
    penalties: 0,
    totalTimeSpentSeconds: 0,
    completedChallenges: [],
    unlockedCodesRound2: {},
    selectedDifficulties: {},
    hintsUsed: 0,
    attemptsCount: 0,
    passwordStatus: 'LOCKED',
    isQualified: false,
    createdAt: Date.now() - 3300000,
  },
  'TQ-ROBOTIC-505': {
    id: 'TQ-ROBOTIC-505',
    name: 'ROBOTIC SYNAPSE',
    loginCode: 'SYNAPSE2026',
    leaderName: 'Devansh Verma',
    leaderEmail: 'devansh.v@eng.edu',
    leaderPhone: '+91 99887 76655',
    department: 'Mechatronics & Robotics',
    college: 'Sahyadri College of Eng',
    members: [
      { name: 'Devansh Verma', usn: '4SC21MT004', department: 'MTR' },
      { name: 'Tanvi Jain', usn: '4SC21MT012', department: 'MTR' },
      { name: 'Farhan Ali', usn: '4SC21CS034', department: 'CSE' },
      { name: 'Rahul Joshi', usn: '4SC21EC041', department: 'ECE' },
    ],
    currentRound: 'ROUND_2',
    status: 'QUALIFIED',
    score: 525,
    timeBonus: 25,
    penalties: 0,
    totalTimeSpentSeconds: 2850,
    completedChallenges: ['CH-01', 'CH-02', 'CH-03', 'CH-04', 'CH-05'],
    unlockedCodesRound2: { 1: 'OMEGA-771' },
    selectedDifficulties: {},
    hintsUsed: 0,
    attemptsCount: 6,
    passwordStatus: 'COMPLETED',
    isQualified: true,
    createdAt: Date.now() - 3200000,
  },
};

const defaultSettings: EventSettings = {
  competitionState: 'ACTIVE',
  currentActiveRound: 'ROUND_1',
  round1DurationMinutes: 75,
  round2DurationMinutes: 60,
  vaultDurationMinutes: 15,
  round1StartedAt: Date.now() - 15 * 60 * 1000, // started 15 min ago
  qualifyTopCount: 10,
  isLeaderboardPublic: true,
  allowRetry: true,
  maxRetriesPerNode: 5,
  isDemoMode: true,
  hintPenaltyPointsDefault: 5,
  timeBonusWeight: 1,
};

let db: DatabaseSchema = {
  settings: { ...defaultSettings },
  teams: { ...defaultDemoTeams },
  challenges: { ...defaultInitialChallenges },
  submissions: [],
  logs: [
    {
      id: 'LOG-001',
      type: 'ADMIN_ACTION',
      message: 'Competition system initialized. Round 1 (Tech Hunt) active.',
      timestamp: Date.now() - 15 * 60 * 1000,
      severity: 'INFO',
    },
    {
      id: 'LOG-002',
      teamId: 'TQ-CYBER-101',
      teamName: 'CYBERDYNE SYSTEMS',
      type: 'ROUND_ADVANCED',
      message: 'Team successfully completed Node 08 and unlocked Round 2 preview.',
      timestamp: Date.now() - 8 * 60 * 1000,
      severity: 'INFO',
    },
  ],
  passwordClues: [...defaultPasswordClues],
  round1FinalPassword: DEFAULT_ROUND1_PASSWORD,
  escapeRooms: [...defaultEscapeRooms],
  escapeRoomPuzzles: [...defaultPuzzles],
  finalVaultChallenge: { ...defaultFinalVault },
};

function saveDb() {
  try {
    (db as any).sessions = SESSIONS;
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save DB:', err);
  }
}

function loadDb() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      db = JSON.parse(data);
      // Ensure Round 1 strictly has only the 5 new canonical questions
      db.challenges = { ...defaultInitialChallenges };
      db.passwordClues = [...defaultPasswordClues];
      db.round1FinalPassword = DEFAULT_ROUND1_PASSWORD;

      // Ensure Round 2 has the 4 official rooms
      db.escapeRooms = JSON.parse(JSON.stringify(defaultEscapeRooms));

      // Clean up team completedChallenges to remove any obsolete challenge IDs
      if (db.teams) {
        for (const t of Object.values(db.teams)) {
          if (Array.isArray(t.completedChallenges)) {
            t.completedChallenges = t.completedChallenges.filter(
              (id) => ['CH-01', 'CH-02', 'CH-03', 'CH-04', 'CH-05'].includes(id)
            );
          }

          // Ensure Round 2 fields exist on all team records
          if (t.round2Score === undefined) t.round2Score = 0;
          if (!Array.isArray(t.round2CompletedRooms)) t.round2CompletedRooms = [];
          if (!Array.isArray(t.round2SolvedPuzzles)) t.round2SolvedPuzzles = [];
          if (!t.round2VerifiedCodes) t.round2VerifiedCodes = {};
          if (t.round2HintsUsed === undefined) t.round2HintsUsed = 0;
          if (!t.round2RoomHintsUsed) t.round2RoomHintsUsed = {};
          if (t.round2TimeSpentSeconds === undefined) t.round2TimeSpentSeconds = 0;
          if (!t.round2Status) t.round2Status = 'NOT_STARTED';
          if (t.failedAttempts === undefined) t.failedAttempts = 0;
          if (!t.round2Step1Solved) t.round2Step1Solved = {};
          if (!t.round2Step2Verified) t.round2Step2Verified = {};
          if (!t.round2Step3Completed) t.round2Step3Completed = {};
          if (!t.round2RoomAttempts) t.round2RoomAttempts = {};
          t.qualified = t.isQualified;

          // Reconcile and preserve Round 1 completion:
          if (isTeamRound1Cleared(t)) {
            t.passwordStatus = 'COMPLETED';
            (t as any).round1Completed = true;
            if (!t.finishTimeRound1) {
              t.finishTimeRound1 = t.startTimeRound1 ? (t.startTimeRound1 + (t.totalTimeSpentSeconds || 60) * 1000) : Date.now();
            }
          }

          // Reconcile and preserve Round 2 completion:
          if (isTeamRound2Cleared(t)) {
            t.clearedRoom4 = true;
            t.room4Cleared = true;
            t.flagCollected = true;
            t.round2Status = 'COMPLETED';
            (t as any).round2Completed = true;
            t.round2CompletedRooms = [1, 2, 3, 4];
            t.round2Step3Completed = { ...t.round2Step3Completed, 1: true, 2: true, 3: true, 4: true };
            t.round2CurrentRoom = 5;
            if (!t.round2FinishTime) {
              t.round2FinishTime = t.finishTimeRound2 || Date.now();
              t.finishTimeRound2 = t.round2FinishTime;
            }
            if (!t.round2TimeSpentSeconds || t.round2TimeSpentSeconds <= 0) {
              const st = t.round2StartTime || t.startTimeRound2 || (t.round2FinishTime - 60000);
              t.round2TimeSpentSeconds = Math.max(1, Math.round((t.round2FinishTime - st) / 1000));
            }
          } else {
            const verified = getVerifiedCompletedRooms(t);
            t.round2CompletedRooms = [...verified];
            t.round2CurrentRoom = getGenuineCurrentRoom(t);
          }
        }

        // Backfill team colours and assigned question sets for existing teams
        const teamList = Object.values(db.teams);
        const palette: ('BLUE' | 'RED' | 'GREEN')[] = ['BLUE', 'RED', 'GREEN'];
        teamList.forEach((t: any, idx: number) => {
          if (!t.color) {
            t.color = palette[idx % 3];
          }
          if (!t.assignedSet) {
            t.assignedSet = t.color === 'BLUE' ? 'SET_1' : t.color === 'RED' ? 'SET_2' : 'SET_3';
          }
        });
      }
      saveDb();
    } else {
      saveDb();
    }
  } catch (err) {
    console.error('Failed to load DB, using defaults:', err);
    saveDb();
  }
}

loadDb();

// ==========================================
// AUTHENTICATION & TOKENS
// ==========================================
const SESSIONS: Record<string, { role: 'TEAM' | 'ADMIN'; teamId?: string }> = {
  'demo-admin-token-techquest': { role: 'ADMIN' },
  'demo-admin-token': { role: 'ADMIN' },
};

// Restore persisted sessions if available
if ((db as any)?.sessions && typeof (db as any).sessions === 'object') {
  Object.assign(SESSIONS, (db as any).sessions);
}

function generateToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  const token = authHeader.split(' ')[1];
  const session = SESSIONS[token];
  if (session) {
    (req as any).user = session;
  }
  next();
}

app.use(authMiddleware);

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user || user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'ACCESS DENIED: Administrator clearance required.' });
  }
  next();
}

function requireTeam(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user || user.role !== 'TEAM' || !user.teamId) {
    return res.status(401).json({ error: 'ACCESS DENIED: Team credentials missing or invalid.' });
  }
  const team = db.teams[user.teamId];
  if (!team) {
    return res.status(401).json({ error: 'Team not found in registry.' });
  }
  if (team.status === 'DISQUALIFIED') {
    return res.status(403).json({ error: `MISSION TERMINATED: Disqualified. Reason: ${team.disqualifiedReason || 'Violation'}` });
  }
  (req as any).team = team;
  next();
}

// Timer remaining calculator
function calculateRemainingTime(round: RoundId): number {
  const s = db.settings;
  let duration = 60;
  let startedAt: number | undefined;

  if (round === 'ROUND_1') {
    duration = s.round1DurationMinutes * 60;
    startedAt = s.round1StartedAt;
  } else if (round === 'ROUND_2') {
    duration = s.round2DurationMinutes * 60;
    startedAt = s.round2StartedAt;
  } else {
    duration = s.vaultDurationMinutes * 60;
    startedAt = s.vaultStartedAt;
  }

  if (!startedAt) return duration;
  if (s.competitionState === 'NOT_STARTED') return duration;

  const elapsed = Math.floor((Date.now() - startedAt) / 1000);
  const remaining = duration - elapsed;
  if (remaining <= 0 && s.isDemoMode && s.competitionState === 'ACTIVE') {
    if (round === 'ROUND_1') {
      s.round1StartedAt = Date.now() - 15 * 60 * 1000;
      saveDb();
      return Math.max(0, (s.round1DurationMinutes - 15) * 60);
    }
  }
  return Math.max(0, remaining);
}

// Format seconds into MM:SS or HH:MM:SS
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Clean normalize string for answer comparison
function normalizeAnswer(ans?: string): string {
  return String(ans || '').trim().toLowerCase().replace(/\s+/g, '').replace(/^0x/, '');
}

// ==========================================
// API ROUTES
// ==========================================

// 1. Auth routes
app.post('/api/auth/register', (req: Request, res: Response) => {
  const { teamName, leaderName, leaderEmail, leaderPhone, department, college, members } = req.body;

  if (!teamName || !leaderName || !leaderEmail || !department) {
    return res.status(400).json({ error: 'All primary team credentials are required.' });
  }

  if (!members || !Array.isArray(members) || members.length < 1 || members.length > 3) {
    return res.status(400).json({ error: 'Teams must consist of 2 to 4 members (Leader + 1-3 members).' });
  }

  const teamId = `TQ-${department.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
  const loginCode = crypto.randomBytes(3).toString('hex').toUpperCase();

  const fullMembers: TeamMember[] = [
    { name: leaderName, usn: 'LEADER', department },
    ...members,
  ];

  const teamCount = Object.keys(db.teams).length;
  const palette: ('BLUE' | 'RED' | 'GREEN')[] = ['BLUE', 'RED', 'GREEN'];
  const assignedColor = palette[teamCount % 3];
  const assignedSet = assignedColor === 'BLUE' ? 'SET_1' : assignedColor === 'RED' ? 'SET_2' : 'SET_3';

  const newTeam: Team = {
    id: teamId,
    name: teamName.trim(),
    loginCode,
    leaderName: leaderName.trim(),
    leaderEmail: leaderEmail.trim(),
    leaderPhone: leaderPhone || '',
    department: department.trim(),
    college: (college || 'Engineering Institute').trim(),
    color: assignedColor,
    assignedSet: assignedSet,
    members: fullMembers,
    currentRound: 'ROUND_1',
    status: 'ACTIVE',
    score: 0,
    timeBonus: 0,
    penalties: 0,
    totalTimeSpentSeconds: 0,
    completedChallenges: [],
    unlockedCodesRound2: {},
    selectedDifficulties: {},
    hintsUsed: 0,
    attemptsCount: 0,
    isQualified: false,
    createdAt: Date.now(),
  };

  db.teams[teamId] = newTeam;

  const log: ActivityLog = {
    id: `LOG-${Date.now()}`,
    teamId,
    teamName: newTeam.name,
    type: 'REGISTRATION',
    message: `Team "${newTeam.name}" registered successfully [${teamId}] with ${fullMembers.length} engineers.`,
    timestamp: Date.now(),
    severity: 'INFO',
  };
  db.logs.unshift(log);
  saveDb();

  const token = generateToken();
  SESSIONS[token] = { role: 'TEAM', teamId };

  return res.json({ team: sanitizeTeamForClient(newTeam), token });
});

app.post('/api/auth/team-login', (req: Request, res: Response) => {
  const { teamId, loginCode } = req.body;

  if (!teamId || !loginCode) {
    return res.status(400).json({ error: 'Team ID and Access Code are required.' });
  }

  const team = Object.values(db.teams).find(
    (t) =>
      t.id.toLowerCase() === teamId.trim().toLowerCase() &&
      t.loginCode.toLowerCase() === loginCode.trim().toLowerCase()
  );

  if (!team) {
    return res.status(401).json({ error: 'ACCESS DENIED: Invalid Team ID or Access Code.' });
  }

  if (team.status === 'DISQUALIFIED') {
    return res.status(403).json({ error: `MISSION TERMINATED: Team Disqualified. (${team.disqualifiedReason || 'Violation'})` });
  }

  const token = generateToken();
  SESSIONS[token] = { role: 'TEAM', teamId: team.id };

  const log: ActivityLog = {
    id: `LOG-${Date.now()}`,
    teamId: team.id,
    teamName: team.name,
    type: 'LOGIN',
    message: `Team "${team.name}" authenticated into tactical dashboard.`,
    timestamp: Date.now(),
    severity: 'INFO',
  };
  db.logs.unshift(log);
  saveDb();

  return res.json({ team: sanitizeTeamForClient(team), token });
});

app.post('/api/auth/admin-login', (req: Request, res: Response) => {
  const { password } = req.body;
  // Default master pass or demo
  if (password === 'admin' || password === 'admin2026' || password === 'techquest') {
    const token = generateToken();
    SESSIONS[token] = { role: 'ADMIN' };
    saveDb();
    return res.json({ admin: true, token });
  }
  return res.status(401).json({ error: 'SECURITY BREACH: Invalid administrator access key.' });
});

app.get('/api/auth/me', (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) {
    return res.json({ role: 'ANON' });
  }
  if (user.role === 'ADMIN') {
    return res.json({ role: 'ADMIN', admin: true });
  }
  const team = db.teams[user.teamId];
  return res.json({ role: 'TEAM', team: sanitizeTeamForClient(team) });
});

// 2. Event & Public Leaderboard
app.get('/api/event/status', (_req: Request, res: Response) => {
  return res.json({
    settings: db.settings,
    serverTime: Date.now(),
    round1TimeLeft: calculateRemainingTime('ROUND_1'),
    round2TimeLeft: calculateRemainingTime('ROUND_2'),
    vaultTimeLeft: calculateRemainingTime('FINAL_VAULT'),
    activeRound: db.settings.currentActiveRound,
  });
});

// ==========================================
// COMBINED SCORE RANKING LOGIC
// ==========================================
export function getRound1MaxPossibleScore(): number {
  const qSum = Object.values(db.challenges)
    .filter((c) => c.round === 'ROUND_1' && c.active)
    .reduce((sum, c) => sum + (c.points || 100), 0);
  const passwordBonus = 150;
  const theoretical = Math.max(650, qSum + passwordBonus);
  const allFinalScores = Object.values(db.teams).map((t) =>
    Math.max(0, (t.score || 0) + (t.timeBonus || 0) - (t.penalties || 0))
  );
  const highestTeamScore = allFinalScores.length > 0 ? Math.max(...allFinalScores) : 0;
  return Math.max(theoretical, highestTeamScore, 100);
}

export function getRound2MaxPossibleScore(): number {
  const theoretical = 1400; // 4 rooms: 300 * 3 + 500 = 1400
  const allR2Scores = Object.values(db.teams).map((t) => getRound2NetScore(t));
  const highestTeamScore = allR2Scores.length > 0 ? Math.max(...allR2Scores) : 0;
  return Math.max(theoretical, highestTeamScore, 100);
}

export function computeRound1Leaderboard(allTeams: Team[]): PublicLeaderboardEntry[] {
  const maxPossibleScore = getRound1MaxPossibleScore();

  // Find completed teams with valid completion time (> 0)
  const completedTeams = allTeams.filter((t) => isTeamRound1Cleared(t));
  const validTimes = completedTeams
    .map((t) => {
      if (t.finishTimeRound1 && t.startTimeRound1 && t.finishTimeRound1 > t.startTimeRound1) {
        return Math.round((t.finishTimeRound1 - t.startTimeRound1) / 1000);
      }
      return (t.totalTimeSpentSeconds && t.totalTimeSpentSeconds > 0) ? t.totalTimeSpentSeconds : 0;
    })
    .filter((time) => time > 0);

  const fastestValidCompletionTime = validTimes.length > 0 ? Math.min(...validTimes) : 0;

  const evaluated = allTeams.map((t) => {
    const finalScore = Math.max(0, (t.score || 0) + (t.timeBonus || 0) - (t.penalties || 0));
    const isCompleted = isTeamRound1Cleared(t);

    let completionTimeSeconds: number | null = null;
    let completionTimeFormatted = '--';

    if (isCompleted) {
      if (t.finishTimeRound1 && t.startTimeRound1 && t.finishTimeRound1 > t.startTimeRound1) {
        completionTimeSeconds = Math.round((t.finishTimeRound1 - t.startTimeRound1) / 1000);
      } else {
        completionTimeSeconds = (t.totalTimeSpentSeconds && t.totalTimeSpentSeconds > 0) ? t.totalTimeSpentSeconds : 60;
      }
      completionTimeFormatted = formatDuration(completionTimeSeconds);
    }

    // Score Percentage = (Team's Final Score / Maximum Possible Score) * 100
    const scorePercentage = Math.min(100, Math.max(0, (finalScore / maxPossibleScore) * 100));

    // Time Performance = (Fastest Valid Completion Time / Team's Completion Time) * 100
    let timePerformance = 0;
    if (isCompleted && fastestValidCompletionTime > 0 && completionTimeSeconds && completionTimeSeconds > 0) {
      timePerformance = Math.min(100, Math.max(0, (fastestValidCompletionTime / completionTimeSeconds) * 100));
    }

    // Combined Score = (Score Percentage + Time Performance) / 2
    const rawCombined = (scorePercentage + timePerformance) / 2;
    const combinedScore = Math.round(rawCombined * 100) / 100;

    const isRoom4Cleared = isTeamRound2Cleared(t);

    return {
      team: t,
      finalScore,
      isCompleted,
      completionTimeSeconds,
      completionTimeFormatted,
      scorePercentage: Math.round(scorePercentage * 100) / 100,
      timePerformance: Math.round(timePerformance * 100) / 100,
      combinedScore,
      isRoom4Cleared,
    };
  });

  // Sort by Combined Score descending (Highest Combined Score receives Rank 1)
  evaluated.sort((a, b) => {
    if (b.combinedScore !== a.combinedScore) {
      return b.combinedScore - a.combinedScore;
    }
    if (b.finalScore !== a.finalScore) {
      return b.finalScore - a.finalScore;
    }
    if (a.isCompleted !== b.isCompleted) {
      return a.isCompleted ? -1 : 1;
    }
    if (a.completionTimeSeconds !== null && b.completionTimeSeconds !== null) {
      if (a.completionTimeSeconds !== b.completionTimeSeconds) {
        return a.completionTimeSeconds - b.completionTimeSeconds;
      }
    }
    const hintsA = a.team.hintsUsed || 0;
    const hintsB = b.team.hintsUsed || 0;
    if (hintsA !== hintsB) return hintsA - hintsB;
    return (a.team.createdAt || 0) - (b.team.createdAt || 0);
  });

  return evaluated.map((item, idx) => {
    const t = item.team;
    return {
      rank: idx + 1,
      teamId: t.id,
      teamName: t.name,
      department: t.department,
      college: t.college,
      color: getTeamColor(t),
      score: item.finalScore,
      timeFormatted: item.completionTimeFormatted,
      timeSpentSeconds: item.completionTimeSeconds || 0,
      status: t.status,
      currentRound: t.currentRound,
      completedCount: t.completedChallenges.length,
      hintsUsed: t.hintsUsed || 0,
      passwordStatus: (item.isCompleted ? 'COMPLETED' : (t.passwordStatus || 'LOCKED')) as any,
      isQualified: t.isQualified,
      clearedRoom4: item.isRoom4Cleared,
      completedRoomsCount: t.round2CompletedRooms?.length || (item.isRoom4Cleared ? 4 : 0),
      combinedScore: item.combinedScore,
      scorePercentage: item.scorePercentage,
      timePerformance: item.timePerformance,
      isCompleted: item.isCompleted,
      completionTimeSeconds: item.completionTimeSeconds,
    };
  });
}

export function computeRound2Leaderboard(allTeams: Team[]): Round2LeaderboardEntry[] {
  const round2Teams = allTeams.filter(
    (t) => t.isQualified || (t.round2Score && t.round2Score > 0) || t.round2Status === 'IN_PROGRESS' || t.round2Status === 'COMPLETED' || isTeamRound2Cleared(t)
  );

  const maxPossibleScore = getRound2MaxPossibleScore();

  // Completed teams in Round 2: cleared Room 4 or status === 'COMPLETED'
  const completedTeams = round2Teams.filter((t) => isTeamRound2Cleared(t));
  const validTimes = completedTeams
    .map((t) => {
      if (t.round2FinishTime && t.round2StartTime && t.round2FinishTime > t.round2StartTime) {
        return Math.round((t.round2FinishTime - t.round2StartTime) / 1000);
      }
      return (t.round2TimeSpentSeconds && t.round2TimeSpentSeconds > 0) ? t.round2TimeSpentSeconds : 0;
    })
    .filter((time) => time > 0);

  const fastestValidCompletionTime = validTimes.length > 0 ? Math.min(...validTimes) : 0;

  const evaluated = round2Teams.map((t) => {
    const finalScore = getRound2NetScore(t);
    const isRoom4Cleared = isTeamRound2Cleared(t);
    const isCompleted = isRoom4Cleared;

    let completionTimeSeconds: number | null = null;
    let completionTimeFormatted = '--';

    if (isCompleted) {
      if (t.round2FinishTime && t.round2StartTime && t.round2FinishTime > t.round2StartTime) {
        completionTimeSeconds = Math.round((t.round2FinishTime - t.round2StartTime) / 1000);
      } else {
        completionTimeSeconds = (t.round2TimeSpentSeconds && t.round2TimeSpentSeconds > 0) ? t.round2TimeSpentSeconds : 60;
      }
      completionTimeFormatted = formatDuration(completionTimeSeconds);
    }

    // Score Percentage = (Team's Final Score / Maximum Possible Score) * 100
    const scorePercentage = Math.min(100, Math.max(0, (finalScore / maxPossibleScore) * 100));

    // Time Performance = (Fastest Valid Completion Time / Team's Completion Time) * 100
    let timePerformance = 0;
    if (isCompleted && fastestValidCompletionTime > 0 && completionTimeSeconds && completionTimeSeconds > 0) {
      timePerformance = Math.min(100, Math.max(0, (fastestValidCompletionTime / completionTimeSeconds) * 100));
    }

    // Combined Score = (Score Percentage + Time Performance) / 2
    const rawCombined = (scorePercentage + timePerformance) / 2;
    const combinedScore = Math.round(rawCombined * 100) / 100;

    const verifiedRooms = getVerifiedCompletedRooms(t);
    const curRoom = isRoom4Cleared ? 5 : getGenuineCurrentRoom(t);

    return {
      team: t,
      finalScore,
      isCompleted,
      completionTimeSeconds,
      completionTimeFormatted,
      scorePercentage: Math.round(scorePercentage * 100) / 100,
      timePerformance: Math.round(timePerformance * 100) / 100,
      combinedScore,
      isRoom4Cleared,
      verifiedRooms,
      curRoom,
    };
  });

  // Sort by Combined Score descending (Highest Combined Score receives Rank 1)
  evaluated.sort((a, b) => {
    if (b.combinedScore !== a.combinedScore) {
      return b.combinedScore - a.combinedScore;
    }
    if (b.finalScore !== a.finalScore) {
      return b.finalScore - a.finalScore;
    }
    if (a.isCompleted !== b.isCompleted) {
      return a.isCompleted ? -1 : 1;
    }
    if (a.completionTimeSeconds !== null && b.completionTimeSeconds !== null) {
      if (a.completionTimeSeconds !== b.completionTimeSeconds) {
        return a.completionTimeSeconds - b.completionTimeSeconds;
      }
    }
    const hintsA = a.team.round2HintsUsed || 0;
    const hintsB = b.team.round2HintsUsed || 0;
    if (hintsA !== hintsB) return hintsA - hintsB;
    return (a.team.createdAt || 0) - (b.team.createdAt || 0);
  });

  const getRoomName = (roomNum: number) => {
    if (roomNum === 1) return 'Room 1: The Discovery';
    if (roomNum === 2) return 'Room 2: The Decoder';
    if (roomNum === 3) return 'Room 3: The System';
    if (roomNum === 4) return 'Room 4: The Final Vault';
    return 'RESTORED (COMPLETED)';
  };

  return evaluated.map((item, idx) => {
    const t = item.team;
    return {
      rank: idx + 1,
      teamId: t.id,
      teamName: t.name,
      department: t.department,
      college: t.college,
      color: getTeamColor(t),
      score: item.finalScore,
      currentRoom: item.curRoom,
      currentRoomName: item.isRoom4Cleared ? 'ROOM 4 CLEARED (CHAMPION)' : getRoomName(item.curRoom),
      completedRoomsCount: item.verifiedRooms.length,
      status: item.isRoom4Cleared ? 'COMPLETED' : ((t.round2Status as any) || 'NOT_STARTED'),
      hintsUsed: t.round2HintsUsed || 0,
      timeSpentSeconds: item.completionTimeSeconds || 0,
      timeFormatted: item.completionTimeFormatted,
      isQualified: t.isQualified,
      clearedRoom4: item.isRoom4Cleared,
      combinedScore: item.combinedScore,
      scorePercentage: item.scorePercentage,
      timePerformance: item.timePerformance,
      isCompleted: item.isCompleted,
      completionTimeSeconds: item.completionTimeSeconds,
    };
  });
}

app.get('/api/leaderboard', (_req: Request, res: Response) => {
  const allTeams = Object.values(db.teams);
  const leaderboard = computeRound1Leaderboard(allTeams);

  return res.json({
    leaderboard,
    isPublic: db.settings.isLeaderboardPublic,
    totalTeams: allTeams.length,
  });
});

// 3. Team Protected Routes
app.get('/api/team/dashboard', requireTeam, (req: Request, res: Response) => {
  const team: Team = (req as any).team;
  const timeRemaining = calculateRemainingTime(team.currentRound);
  const allTeams = Object.values(db.teams);

  // Compute rank using official Combined Score ranking
  const r1Leaderboard = computeRound1Leaderboard(allTeams);
  const rank = r1Leaderboard.findIndex((t) => t.teamId === team.id) + 1;

  let roundStatus = 'ACTIVE';
  let canAccessRound = true;

  if (team.currentRound === 'ROUND_2' && !team.isQualified) {
    canAccessRound = false;
    roundStatus = 'AWAITING_QUALIFICATION';
  } else if (team.currentRound === 'FINAL_VAULT' && !team.isQualified) {
    canAccessRound = false;
    roundStatus = 'NOT_QUALIFIED_FOR_VAULT';
  }

  return res.json({
    team,
    settings: db.settings,
    timeRemaining,
    rank,
    totalTeams: allTeams.length,
    roundStatus,
    canAccessRound,
  });
});

// Round 1 Challenges (Sanitized: NO ANSWERS OR EXPLANATIONS SENT TO CLIENT)
app.get('/api/team/round1/challenges', requireTeam, (req: Request, res: Response) => {
  const team: Team = (req as any).team;
  const setId = getTeamSetId(team);
  const challengesDict = ROUND1_CHALLENGES_BY_SET[setId] || ROUND1_CHALLENGES_BY_SET[1];

  const list = Object.values(challengesDict)
    .filter((c) => c.round === 'ROUND_1' && c.active)
    .sort((a, b) => a.order - b.order);

  // Sequential progression: challenge N is unlocked if previous challenges are completed or if it's the first one
  const sanitized = list.map((c, idx) => {
    const isCompleted = team.completedChallenges.includes(c.id);
    const isUnlocked = idx === 0 || team.completedChallenges.includes(list[idx - 1].id) || isCompleted;

    const hintsCount = team.nodeHintsUsed?.[c.id] || 0;
    const revealedHints =
      hintsCount > 0 && c.hints ? c.hints.slice(0, hintsCount) : hintsCount > 0 ? [c.hint] : [];

    return {
      id: c.id,
      round: c.round,
      nodeCode: c.nodeCode,
      title: c.title,
      category: c.category,
      difficulty: c.difficulty,
      points: c.points,
      question: c.question,
      diagramAscii: c.diagramAscii,
      codeSnippet: c.codeSnippet,
      questionType: c.questionType,
      options: c.options,
      hintPenaltyPoints: c.hintPenaltyPoints || 10,
      order: c.order,
      isCompleted,
      isUnlocked,
      hintsAvailable: c.hints?.length || 3,
      hintsUnlocked: hintsCount,
      revealedHints,
      active: c.active,
    };
  });

  const allCompleted = sanitized.length > 0 && sanitized.every((c) => c.isCompleted);
  const passwordStatus = team.passwordStatus || (allCompleted ? 'IN_PROGRESS' : 'LOCKED');

  return res.json({
    challenges: sanitized,
    teamProgress: {
      completedCount: sanitized.filter((c) => c.isCompleted).length,
      totalCount: sanitized.length,
      score: getTeamNetScore(team),
      hintsUsed: team.hintsUsed,
      allCompleted,
      passwordStatus,
    },
  });
});

app.post('/api/team/round1/select-difficulty', requireTeam, (req: Request, res: Response) => {
  return res.status(400).json({ error: 'Current Round 1 challenges are standardized and do not require difficulty selection.' });
});

app.post('/api/team/round1/submit', requireTeam, (req: Request, res: Response) => {
  const team: Team = (req as any).team;
  const { challengeId, answer } = req.body;
  const setId = getTeamSetId(team);
  const challengesDict = ROUND1_CHALLENGES_BY_SET[setId] || ROUND1_CHALLENGES_BY_SET[1];

  const challenge = challengesDict[challengeId] || db.challenges[challengeId];
  if (!challenge) {
    return res.status(404).json({ error: 'Question not found.' });
  }

  if (team.completedChallenges.includes(challengeId)) {
    return res.status(400).json({ error: 'This question is already solved.' });
  }

  team.attemptsCount += 1;
  if (!team.nodeAttempts) team.nodeAttempts = {};
  team.nodeAttempts[challengeId] = (team.nodeAttempts[challengeId] || 0) + 1;

  // Validate answer securely on the server using team's assigned set
  const isCorrect = validateRound1AnswerForSet(setId, challengeId, String(answer || ''));

  const submissionLog: SubmissionLog = {
    id: `SUB-${Date.now()}`,
    teamId: team.id,
    teamName: team.name,
    challengeId,
    round: 'ROUND_1',
    answerSubmitted: String(answer || ''),
    isCorrect,
    pointsAwarded: isCorrect ? challenge.points : 0,
    timestamp: Date.now(),
  };
  db.submissions.unshift(submissionLog);

  if (isCorrect) {
    team.completedChallenges.push(challengeId);
    team.score += challenge.points;
    team.totalTimeSpentSeconds += 45;

    const round1List = Object.values(challengesDict).filter((c) => c.round === 'ROUND_1' && c.active);
    const allCompleted = round1List.every((c) => team.completedChallenges.includes(c.id));

    if (allCompleted && (!team.passwordStatus || team.passwordStatus === 'LOCKED')) {
      team.passwordStatus = 'IN_PROGRESS';
    }

    const questionOrder = challenge.order; // 1 to 5
    const cluesList = ROUND1_PASSWORD_CLUES_BY_SET[setId] || ROUND1_PASSWORD_CLUES_BY_SET[1];
    const correspondingClue = cluesList.find((c) => c.index === questionOrder);

    const log: ActivityLog = {
      id: `LOG-${Date.now()}`,
      teamId: team.id,
      teamName: team.name,
      type: 'ANSWER_ATTEMPT',
      message: `Team successfully cleared ${challenge.title} (+${challenge.points} pts). Clue ${questionOrder} unlocked.`,
      timestamp: Date.now(),
      severity: 'INFO',
    };
    db.logs.unshift(log);
    saveDb();

    return res.json({
      isCorrect: true,
      message: `ACCESS GRANTED: Answer verified correctly! Password Clue ${questionOrder} unlocked.`,
      pointsAwarded: challenge.points,
      nextChallengeId: questionOrder < 5 ? `CH-0${questionOrder + 1}` : undefined,
      totalScore: getTeamNetScore(team),
      allCompleted,
      passwordUnlocked: allCompleted,
      unlockedClue: correspondingClue
        ? {
            index: correspondingClue.index,
            title: correspondingClue.title,
            clue: correspondingClue.clue,
          }
        : undefined,
    });
  } else {
    team.failedAttempts = (team.failedAttempts || 0) + 1;
    saveDb();
    return res.json({
      isCorrect: false,
      message: 'ACCESS DENIED: Verification failed. Re-evaluate parameters and check calculations.',
      pointsAwarded: 0,
      totalScore: getTeamNetScore(team),
      allCompleted: false,
    });
  }
});

app.post('/api/team/round1/hint', requireTeam, (req: Request, res: Response) => {
  const team: Team = (req as any).team;
  const { challengeId, hintNumber } = req.body;
  const setId = getTeamSetId(team);
  const challengesDict = ROUND1_CHALLENGES_BY_SET[setId] || ROUND1_CHALLENGES_BY_SET[1];

  const challenge = challengesDict[challengeId] || db.challenges[challengeId];
  if (!challenge) {
    return res.status(404).json({ error: 'Question not found.' });
  }

  const rawPenalty = challenge.hintPenaltyPoints || db.settings.hintPenaltyPointsDefault || 10;

  if (!team.nodeHintsUsed) team.nodeHintsUsed = {};
  const currentCount = team.nodeHintsUsed[challengeId] || 0;
  const totalAvailable = challenge.hints?.length || 3;

  // Prevent duplicate deductions if already unlocked or repeated clicks
  const requestedNumber = hintNumber ? Number(hintNumber) : currentCount + 1;
  if (requestedNumber <= currentCount) {
    const revealedHints = challenge.hints ? challenge.hints.slice(0, currentCount) : [challenge.hint];
    const latestHint =
      challenge.hints && challenge.hints[currentCount - 1] ? challenge.hints[currentCount - 1] : challenge.hint;
    return res.json({
      hint: latestHint,
      revealedHints,
      hintNumber: currentCount,
      totalHints: totalAvailable,
      penaltyPoints: 0,
      currentScore: getTeamNetScore(team),
      alreadyUnlocked: true,
    });
  }

  if (currentCount >= totalAvailable) {
    return res.status(400).json({ error: 'All available hints for this question have already been revealed.' });
  }

  // Ensure a question's score never falls below zero:
  // Total penalties applied to this specific question cannot exceed challenge.points
  if (!team.questionPenalties) team.questionPenalties = {};
  const currentQP = team.questionPenalties[challengeId] || 0;
  const maxPossibleDeduction = Math.max(0, challenge.points - currentQP);
  const effectivePenalty = Math.min(rawPenalty, maxPossibleDeduction);

  const nextCount = currentCount + 1;
  team.nodeHintsUsed[challengeId] = nextCount;
  team.questionPenalties[challengeId] = currentQP + effectivePenalty;
  team.hintsUsed = (team.hintsUsed || 0) + 1;
  team.penalties = (team.penalties || 0) + effectivePenalty;

  const revealedHints = challenge.hints ? challenge.hints.slice(0, nextCount) : [challenge.hint];
  const latestHint =
    challenge.hints && challenge.hints[nextCount - 1] ? challenge.hints[nextCount - 1] : challenge.hint;

  const log: ActivityLog = {
    id: `LOG-${Date.now()}`,
    teamId: team.id,
    teamName: team.name,
    type: 'HINT_USED',
    message: `Team accessed Hint ${nextCount} on ${challenge.title} (-${effectivePenalty} pts penalty).`,
    timestamp: Date.now(),
    severity: 'WARNING',
  };
  db.logs.unshift(log);
  saveDb();

  return res.json({
    hint: latestHint,
    revealedHints,
    hintNumber: nextCount,
    totalHints: totalAvailable,
    penaltyPoints: effectivePenalty,
    currentScore: getTeamNetScore(team),
  });
});

// Part 2: Final Password Challenge Endpoints
app.get('/api/team/round1/password-challenge', requireTeam, (req: Request, res: Response) => {
  const team: Team = (req as any).team;
  const setId = getTeamSetId(team);
  const challengesDict = ROUND1_CHALLENGES_BY_SET[setId] || ROUND1_CHALLENGES_BY_SET[1];
  const cluesList = ROUND1_PASSWORD_CLUES_BY_SET[setId] || ROUND1_PASSWORD_CLUES_BY_SET[1];

  const round1Questions = Object.values(challengesDict)
    .filter((c) => c.round === 'ROUND_1' && c.active)
    .sort((a, b) => a.order - b.order);
  const questionsCompleted =
    round1Questions.length === 5 && round1Questions.every((q) => team.completedChallenges.includes(q.id));

  // Question 1 unlocks Clue 1, Question 2 unlocks Clue 2, Question 3 unlocks Clue 3, Question 4 unlocks Clue 4, Question 5 unlocks Clue 5
  const cluesStatus = cluesList.map((clue) => {
    const qId = `CH-0${clue.index}`;
    const isUnlocked =
      team.completedChallenges.includes(qId) || questionsCompleted || team.passwordStatus === 'COMPLETED';
    return {
      index: clue.index,
      title: clue.title,
      clue: isUnlocked ? clue.clue : null,
      questionId: qId,
      isUnlocked,
    };
  });

  const unlockedClues = cluesStatus
    .filter((c) => c.isUnlocked)
    .map((c) => ({
      index: c.index,
      title: c.title,
      clue: c.clue!,
      questionId: c.questionId,
    }));

  const isFinalPasswordUnlocked = questionsCompleted || team.passwordStatus === 'COMPLETED';

  return res.json({
    isUnlocked: isFinalPasswordUnlocked,
    allQuestionsCompleted: questionsCompleted,
    passwordStatus: team.passwordStatus || (isFinalPasswordUnlocked ? 'IN_PROGRESS' : 'LOCKED'),
    clues: unlockedClues, // Unlocked clues saved across refreshes and reconnects
    totalCluesCount: 5,
    unlockedCluesCount: unlockedClues.length,
    cluesStatus,
    passwordHintsAvailable: defaultPasswordHints.length,
    passwordHintsUnlocked: team.passwordHintsUsed || 0,
    revealedPasswordHints: team.passwordHintsUsed ? defaultPasswordHints.slice(0, team.passwordHintsUsed) : [],
    isCompleted: team.passwordStatus === 'COMPLETED',
  });
});

app.post('/api/team/round1/password-submit', requireTeam, (req: Request, res: Response) => {
  const team: Team = (req as any).team;
  const { password } = req.body;
  const setId = getTeamSetId(team);
  const challengesDict = ROUND1_CHALLENGES_BY_SET[setId] || ROUND1_CHALLENGES_BY_SET[1];
  const targetPassword = ROUND1_PASSWORDS[setId] || 'R4#T9';

  const round1Questions = Object.values(challengesDict).filter((c) => c.round === 'ROUND_1' && c.active);
  const questionsCompleted =
    round1Questions.length === 5 && round1Questions.every((q) => team.completedChallenges.includes(q.id));

  if (!questionsCompleted && team.passwordStatus !== 'COMPLETED') {
    return res.status(403).json({ error: 'All 5 Round 1 questions must be completed before entering the password.' });
  }

  // Prevent duplicate completion rewards
  if (team.passwordStatus === 'COMPLETED') {
    return res.json({
      isCorrect: true,
      message: 'PASSWORD ALREADY VERIFIED: Round 1 Tech Hunt completed!',
      pointsAwarded: 0,
      totalScore: getTeamNetScore(team),
      isCompleted: true,
    });
  }

  team.attemptsCount += 1;
  team.passwordAttempts = (team.passwordAttempts || 0) + 1;

  const isCorrect = validateRound1PasswordForSet(setId, String(password || ''));

  if (isCorrect) {
    team.passwordStatus = 'COMPLETED';
    team.finishTimeRound1 = Date.now();
    const bonusPoints = 150;
    team.score += bonusPoints;
    team.totalTimeSpentSeconds += 60;

    const log: ActivityLog = {
      id: `LOG-${Date.now()}`,
      teamId: team.id,
      teamName: team.name,
      type: 'ROUND_ADVANCED',
      message: `DECRYPTION SUCCESSFUL: Team solved Final Password "${targetPassword}" (+${bonusPoints} pts). Round 1 Tech Hunt Completed!`,
      timestamp: Date.now(),
      severity: 'ALERT',
    };
    db.logs.unshift(log);
    saveDb();

    return res.json({
      isCorrect: true,
      message: `DECRYPTION COMPLETE: Master password ${targetPassword} verified! Round 1 successfully finished.`,
      pointsAwarded: bonusPoints,
      totalScore: getTeamNetScore(team),
      isCompleted: true,
    });
  } else {
    team.failedAttempts = (team.failedAttempts || 0) + 1;
    saveDb();
    return res.json({
      isCorrect: false,
      message: 'ACCESS DENIED: Master password invalid. Analyze the five clues carefully.',
      pointsAwarded: 0,
      totalScore: getTeamNetScore(team),
      isCompleted: false,
    });
  }
});

app.post('/api/team/round1/password-hint', requireTeam, (req: Request, res: Response) => {
  const team: Team = (req as any).team;
  const currentCount = team.passwordHintsUsed || 0;
  const { hintNumber } = req.body;

  // Prevent duplicate deductions if already unlocked or repeated clicks
  const requestedNumber = hintNumber ? Number(hintNumber) : currentCount + 1;
  if (requestedNumber <= currentCount) {
    return res.json({
      hint: defaultPasswordHints[currentCount - 1] || defaultPasswordHints[0],
      revealedHints: defaultPasswordHints.slice(0, currentCount),
      penaltyPoints: 0,
      currentScore: getTeamNetScore(team),
      alreadyUnlocked: true,
    });
  }

  if (currentCount >= defaultPasswordHints.length) {
    return res.status(400).json({ error: 'All password clues hints have been revealed.' });
  }

  const penalty = 10;
  team.passwordHintsUsed = currentCount + 1;
  team.penalties = (team.penalties || 0) + penalty;

  const log: ActivityLog = {
    id: `LOG-${Date.now()}`,
    teamId: team.id,
    teamName: team.name,
    type: 'HINT_USED',
    message: `Team accessed hint for Final Password Challenge (-${penalty} pts penalty).`,
    timestamp: Date.now(),
    severity: 'WARNING',
  };
  db.logs.unshift(log);
  saveDb();

  return res.json({
    hint: defaultPasswordHints[team.passwordHintsUsed - 1],
    revealedHints: defaultPasswordHints.slice(0, team.passwordHintsUsed),
    penaltyPoints: penalty,
    currentScore: getTeamNetScore(team),
  });
});

// Round 2 Escape Room Endpoints
app.get('/api/team/round2/state', requireTeam, (req: Request, res: Response) => {
  const team: Team = (req as any).team;

  if (!team.isQualified) {
    return res.status(403).json({
      error: 'QUALIFICATION REQUIRED: Only squads evaluated and approved from Round 1 can access the Round 2 Escape Room.',
      isQualified: false,
      round1Score: getTeamNetScore(team),
      round1Status: team.passwordStatus,
    });
  }

  // Record Round 2 start timestamp if first time entering
  if (!team.round2StartTime) {
    team.round2StartTime = Date.now();
    team.round2Status = 'IN_PROGRESS';
    const log: ActivityLog = {
      id: `LOG-${Date.now()}`,
      teamId: team.id,
      teamName: team.name,
      type: 'ROUND_ADVANCED',
      message: `Squad "${team.name}" breached the facility airlock and entered Round 2: Escape Room.`,
      timestamp: Date.now(),
      severity: 'INFO',
    };
    db.logs.unshift(log);
    saveDb();
  }

  const timeLeft = calculateRemainingTime('ROUND_2');
  const durationSec = (db.settings.round2DurationMinutes || 60) * 60;
  const backupPowerPercent = Math.max(5, Math.min(100, Math.round((timeLeft / durationSec) * 100)));

  // Sanitize all 4 sequential rooms with verified sequential clearance data
  const verifiedRooms = getVerifiedCompletedRooms(team);
  const isRoom4Escaped = isTeamRoom4Cleared(team);
  const currentRoomNum = isRoom4Escaped ? 5 : getGenuineCurrentRoom(team);
  const solvedPuzzles = team.round2SolvedPuzzles || [];
  const roomHintsUsed = team.round2RoomHintsUsed || {};
  const setId = getTeamSetId(team);
  const roomsConfig = getRoomsConfigForSet(setId);

  const rooms = [1, 2, 3, 4].map((roomId) => {
    const rConfig = roomsConfig[roomId];
    // Sequential unlocking: Room 1 is always unlocked. Room N requires Room N-1 to be verified completed.
    const isUnlocked = roomId === 1 || verifiedRooms.includes(roomId - 1);
    const step1Solved = Boolean(team.round2Step1Solved?.[roomId] || solvedPuzzles.includes(roomId));
    const step2Verified = Boolean(team.round2Step2Verified?.[roomId] || team.round2VerifiedCodes?.[roomId]);
    const step3Completed = verifiedRooms.includes(roomId);
    const isCompleted = step3Completed;
    const hintRevealed = Boolean(roomHintsUsed[roomId]);

    const fieldHints = ROUND2_FIELD_GUIDE_HINTS[roomId];
    const compositeHint = fieldHints
      ? `${ROUND2_FIELD_GUIDE_TITLE}: Letter 1: ${fieldHints.letter1} | Letter 2: ${fieldHints.letter2} | Tech: ${fieldHints.tech}`
      : 'Consult field guide observations for tactical insight.';

    return {
      roomId,
      roomName: rConfig?.roomName || `Sector ${roomId}`,
      roomCode: `SECTOR-0${roomId}`,
      roomMission: rConfig?.subtitle || 'Investigate sector and unlock terminal.',
      difficulty: roomId === 4 ? 'LEVEL 2: MAXIMUM CRITICAL' : 'LEVEL 1: TACTICAL',
      systemContext: rConfig?.roomName,
      points: 250,
      isUnlocked,
      isSolved: step1Solved,
      isCompleted,
      // Step 1: Letter / Spatial Clue Puzzle
      step1Solved,
      letterPuzzleTitle: isUnlocked ? (rConfig?.letter1?.title || 'Sector Cipher Letter') : 'LOCKED ACCESS',
      letterPuzzleType: 'LOGIC_RIDDLE',
      letterPuzzlePrompt: isUnlocked
        ? `${rConfig?.letter1?.puzzleQuestion || ''}\n\n[Letter 2 Note]: ${rConfig?.letter2?.puzzleQuestion || ''}`
        : 'Preceding room clearance required.',
      revealedLetters: step1Solved ? rConfig?.venue?.code : undefined,
      venueLocation: step1Solved ? rConfig?.venue?.locationName : undefined,
      locationClueDescription: step1Solved ? rConfig?.venue?.description : undefined,
      puzzleTitle: isUnlocked ? (rConfig?.letter1?.title || 'Sector Cipher') : 'LOCKED ACCESS',
      puzzleQuestion: isUnlocked ? (rConfig?.letter1?.puzzleQuestion || '') : 'Preceding room clearance required.',
      // Step 2: Physical Key Verification
      step2Verified,
      physicalKeyPrompt: isUnlocked ? `Enter the physical keycard code obtained from ${rConfig?.venue?.locationName}.` : undefined,
      physicalLocationClue: step1Solved ? rConfig?.venue?.description : undefined,
      physicalCodeVerified: step2Verified,
      // Step 3: Technical Engineering Challenge
      step3Completed,
      techTitle: (isUnlocked && step2Verified) ? (rConfig?.keyBox?.techTitle || 'Technical Challenge') : 'LOCKED: PHYSICAL KEY REQUIRED',
      techTopic: 'Sector Engineering Protocol',
      techQuestion: (isUnlocked && step2Verified) ? (rConfig?.keyBox?.techQuestion || '') : 'Unlock room door via physical keycard to view technical challenge.',
      techExplanation: step3Completed ? rConfig?.keyBox?.techExplanation : undefined,
      // Hint & Diagnostics
      hintRevealed,
      hint: hintRevealed ? compositeHint : undefined,
      hintPenaltyPoints: 10,
    };
  });

  const totalHints = (team.hintsUsed || 0) + (team.passwordHintsUsed || 0) + (team.round2HintsUsed || 0);
  const failedAttempts = team.failedAttempts || 0;
  const attemptPenalty = Math.floor(failedAttempts / 3) * 15;
  const hintPenalty = totalHints * 10;
  const netScore = getTeamNetScore(team);
  const flagCaptured = isRoom4Escaped;

  return res.json({
    isQualified: true,
    round2Score: team.round2Score || 0,
    currentRoom: currentRoomNum,
    isCompleted: isRoom4Escaped,
    flagCaptured,
    timeRemaining: timeLeft,
    backupPowerPercent,
    timeSpentSeconds: team.round2TimeSpentSeconds || 0,
    hintsUsed: team.round2HintsUsed || 0,
    totalHints,
    failedAttempts,
    attemptPenalty,
    hintPenalty,
    netScore,
    rooms,
  });
});

// Step 1: Letter / Spatial Clue Puzzle Submission
app.post(['/api/team/round2/submit-step1', '/api/team/round2/submit-puzzle'], requireTeam, (req: Request, res: Response) => {
  const team: Team = (req as any).team;
  if (!team.isQualified) {
    return res.status(403).json({ error: 'QUALIFICATION REQUIRED: Round 1 qualification required.' });
  }

  const { roomId, answer } = req.body;
  const roomIndex = Number(roomId);
  const setId = getTeamSetId(team);
  const roomsConfig = getRoomsConfigForSet(setId);
  const room = roomsConfig[roomIndex];

  if (!room) {
    return res.status(404).json({ error: 'Room subsystem node not found.' });
  }

  const verifiedRooms = getVerifiedCompletedRooms(team);
  const maxAccessible = Math.min(4, verifiedRooms.length + 1);
  if (roomIndex > maxAccessible) {
    return res.status(403).json({ error: 'SECURITY INTERLOCK: Room sequence mismatch. Preceding rooms must be completed first.' });
  }

  if (!team.round2Step1Solved) team.round2Step1Solved = {};
  if (team.round2Step1Solved[roomIndex]) {
    return res.json({
      isCorrect: true,
      message: 'Step 1 letter puzzle already solved for this room.',
      revealedLetters: room.venue.code,
      venueLocation: room.venue.locationName,
      locationClueDescription: room.venue.description,
      physicalLocationClue: room.venue.description,
      pointsAwarded: 0,
      round2Score: team.round2Score || 0,
      totalScore: getTeamNetScore(team),
    });
  }

  const isMatch = isAnswerMatch(roomIndex, 'LETTER_1', String(answer || ''), setId);

  if (isMatch) {
    team.round2Step1Solved[roomIndex] = true;
    if (!team.round2SolvedPuzzles) team.round2SolvedPuzzles = [];
    if (!team.round2SolvedPuzzles.includes(roomIndex)) {
      team.round2SolvedPuzzles.push(roomIndex);
    }
    const step1Pts = 50;
    team.round2Score = (team.round2Score || 0) + step1Pts;

    const log: ActivityLog = {
      id: `LOG-${Date.now()}`,
      teamId: team.id,
      teamName: team.name,
      type: 'ANSWER_ATTEMPT',
      message: `Squad "${team.name}" solved Step 1 Letter Puzzle for ${room.roomName} (+${step1Pts} PTS). Venue Clue: "${room.venue.code}" (${room.venue.locationName}).`,
      timestamp: Date.now(),
      severity: 'INFO',
    };
    db.logs.unshift(log);
    saveDb();

    return res.json({
      isCorrect: true,
      message: `LETTER PUZZLE SOLVED: Clue letters "${room.venue.code}" deciphered! Search venue at ${room.venue.locationName}.`,
      revealedLetters: room.venue.code,
      venueLocation: room.venue.locationName,
      locationClueDescription: room.venue.description,
      physicalLocationClue: room.venue.description,
      pointsAwarded: step1Pts,
      round2Score: team.round2Score,
      totalScore: getTeamNetScore(team),
    });
  } else {
    team.failedAttempts = (team.failedAttempts || 0) + 1;
    saveDb();
    return res.json({
      isCorrect: false,
      message: 'ACCESS DENIED: Spatial/logic sequence rejected. Check calculations and try again.',
      totalScore: getTeamNetScore(team),
    });
  }
});

// Step 1 Part B: Letter 2 Puzzle Submission
app.post('/api/team/round2/submit-letter2', requireTeam, (req: Request, res: Response) => {
  const team: Team = (req as any).team;
  const { roomId, answer } = req.body;
  const roomIndex = Number(roomId);
  const setId = getTeamSetId(team);
  const roomsConfig = getRoomsConfigForSet(setId);
  const room = roomsConfig[roomIndex];

  if (!room) {
    return res.status(404).json({ error: 'Room subsystem node not found.' });
  }

  const verifiedRooms = getVerifiedCompletedRooms(team);
  const maxAccessible = Math.min(4, verifiedRooms.length + 1);
  if (roomIndex > maxAccessible) {
    return res.status(403).json({ error: 'SECURITY INTERLOCK: Room sequence mismatch. Preceding rooms must be completed first.' });
  }

  if (!team.round2Letter2Solved) team.round2Letter2Solved = {};
  if (team.round2Letter2Solved[roomIndex]) {
    return res.json({
      isCorrect: true,
      message: 'Step 1 Letter 2 puzzle already solved for this room.',
      pointsAwarded: 0,
      round2Score: team.round2Score || 0,
      totalScore: getTeamNetScore(team),
    });
  }

  const isMatch = isAnswerMatch(roomIndex, 'LETTER_2', String(answer || ''), setId);

  if (isMatch) {
    team.round2Letter2Solved[roomIndex] = true;
    const stepPts = 50;
    team.round2Score = (team.round2Score || 0) + stepPts;

    const log: ActivityLog = {
      id: `LOG-${Date.now()}`,
      teamId: team.id,
      teamName: team.name,
      type: 'ANSWER_ATTEMPT',
      message: `Squad "${team.name}" solved Letter 2 Puzzle for ${room.roomName} (+${stepPts} PTS).`,
      timestamp: Date.now(),
      severity: 'INFO',
    };
    db.logs.unshift(log);
    saveDb();

    return res.json({
      isCorrect: true,
      message: `LETTER 2 SOLVED: Fragment captured and verified!`,
      pointsAwarded: stepPts,
      round2Score: team.round2Score,
      totalScore: getTeamNetScore(team),
    });
  } else {
    team.failedAttempts = (team.failedAttempts || 0) + 1;
    saveDb();
    return res.json({
      isCorrect: false,
      message: 'ACCESS DENIED: Puzzle 2 answer rejected. Check your reasoning and try again.',
      totalScore: getTeamNetScore(team),
    });
  }
});

// Step 2: Physical Keycard Verification Submission
app.post(['/api/team/round2/submit-step2', '/api/team/round2/submit-physical-code'], requireTeam, (req: Request, res: Response) => {
  const team: Team = (req as any).team;

  const { roomId, code } = req.body;
  const roomIndex = Number(roomId);
  const setId = getTeamSetId(team);
  const roomsConfig = getRoomsConfigForSet(setId);
  const room = roomsConfig[roomIndex];

  if (!room) {
    return res.status(404).json({ error: 'Room subsystem node not found.' });
  }

  const verifiedRooms = getVerifiedCompletedRooms(team);
  const maxAccessible = Math.min(4, verifiedRooms.length + 1);
  if (roomIndex > maxAccessible) {
    return res.status(403).json({ error: 'SECURITY INTERLOCK: Room sequence mismatch. Preceding rooms must be completed first.' });
  }

  if (!team.round2Step2Verified) team.round2Step2Verified = {};
  if (team.round2Step2Verified[roomIndex]) {
    return res.json({
      success: true,
      isCorrect: true,
      message: 'Physical keycard already verified for this room. Proceed to Step 3 Technical Challenge.',
      pointsAwarded: 0,
      totalScore: getTeamNetScore(team),
    });
  }

  const isCorrect = isAnswerMatch(roomIndex, 'PHYSICAL_KEY', String(code || ''), setId);

  if (isCorrect) {
    team.round2Step2Verified[roomIndex] = true;
    if (!team.round2VerifiedCodes) team.round2VerifiedCodes = {};
    team.round2VerifiedCodes[roomIndex] = String(code).trim();
    const step2Pts = 50;
    team.round2Score = (team.round2Score || 0) + step2Pts;

    const log: ActivityLog = {
      id: `LOG-${Date.now()}`,
      teamId: team.id,
      teamName: team.name,
      type: 'ANSWER_ATTEMPT',
      message: `Squad "${team.name}" verified physical keycard "${code}" for ${room.roomName} (+${step2Pts} PTS). Door unlocked.`,
      timestamp: Date.now(),
      severity: 'INFO',
    };
    db.logs.unshift(log);
    saveDb();

    return res.json({
      success: true,
      isCorrect: true,
      message: `PHYSICAL KEY VERIFIED: Door to ${room.roomName} unlocked! Proceed to Step 3 Technical Challenge.`,
      pointsAwarded: step2Pts,
      round2Score: team.round2Score,
      totalScore: getTeamNetScore(team),
    });
  } else {
    team.failedAttempts = (team.failedAttempts || 0) + 1;
    saveDb();
    return res.json({
      success: false,
      isCorrect: false,
      message: 'SECURITY BREACH: Invalid physical verification keycard code. Check the physical tag at the venue location.',
      totalScore: getTeamNetScore(team),
    });
  }
});

// Step 3: Technical Engineering Challenge (Level 2 Difficulty) Submission
app.post(['/api/team/round2/submit-step3', '/api/team/round2/submit-tech-challenge'], requireTeam, (req: Request, res: Response) => {
  const team: Team = (req as any).team;

  const { roomId, answer } = req.body;
  const roomIndex = Number(roomId);
  const setId = getTeamSetId(team);
  const roomsConfig = getRoomsConfigForSet(setId);
  const room = roomsConfig[roomIndex];

  if (!room) {
    return res.status(404).json({ error: 'Room subsystem node not found.' });
  }

  const verifiedRooms = getVerifiedCompletedRooms(team);
  const maxAccessible = Math.min(4, verifiedRooms.length + 1);
  if (roomIndex > maxAccessible) {
    return res.status(403).json({ error: 'SECURITY INTERLOCK: Room sequence mismatch. Preceding rooms must be completed first.' });
  }

  if (!team.round2Step3Completed) team.round2Step3Completed = {};
  if (team.round2Step3Completed[roomIndex]) {
    return res.json({
      isCorrect: true,
      success: true,
      message: 'Technical engineering challenge already solved for this room.',
      pointsAwarded: 0,
      totalScore: getTeamNetScore(team),
    });
  }

  const isCorrect = isAnswerMatch(roomIndex, 'TECH', String(answer || ''), setId);

  if (isCorrect) {
    team.round2Step3Completed[roomIndex] = true;
    if (!team.round2CompletedRooms) team.round2CompletedRooms = [];
    if (!team.round2CompletedRooms.includes(roomIndex)) {
      team.round2CompletedRooms.push(roomIndex);
    }
    const techPts = 250;
    team.round2Score = (team.round2Score || 0) + techPts;

    // Re-verify completed rooms in order
    const updatedVerified = getVerifiedCompletedRooms(team);

    if (roomIndex < 4) {
      team.round2CurrentRoom = Math.max(team.round2CurrentRoom || 1, roomIndex + 1);
      const log: ActivityLog = {
        id: `LOG-${Date.now()}`,
        teamId: team.id,
        teamName: team.name,
        type: 'ROUND_ADVANCED',
        message: `Squad "${team.name}" cleared Step 3 Tech Challenge for ${room.roomName} (+${techPts} PTS). Advancing to Room ${roomIndex + 1}!`,
        timestamp: Date.now(),
        severity: 'INFO',
      };
      db.logs.unshift(log);
      saveDb();

      return res.json({
        isCorrect: true,
        success: true,
        message: `CHALLENGE CLEARED: ${room.keyBox.techTitle} verified! Room ${roomIndex} completed. Advancing to Room ${roomIndex + 1}.`,
        nextRoomId: roomIndex + 1,
        pointsAwarded: techPts,
        explanation: room.keyBox.techExplanation,
        isCompleted: false,
        flagCaptured: false,
        totalScore: getTeamNetScore(team),
      });
    } else {
      // Room 4 (The Final Vault) Completed ONLY IF rooms 1, 2, 3 were also cleared
      if (updatedVerified.includes(1) && updatedVerified.includes(2) && updatedVerified.includes(3) && updatedVerified.includes(4)) {
        team.round2CurrentRoom = 5;
        team.round2Status = 'COMPLETED';
        team.status = 'COMPLETED';
        team.flagCollected = true;
        team.clearedRoom4 = true;
        team.room4Cleared = true;

        const validationTimestamp = Date.now();
        const wasAlreadyCompleted = Boolean(team.round2FinishTime && team.round2TimeSpentSeconds);

        // Requirement 2, 3, 4, 5, 8: Stop timer at exact moment Technical Question 4 is validated, freeze and preserve original timestamp
        if (!team.round2FinishTime) {
          team.round2FinishTime = validationTimestamp;
          team.finishTimeRound2 = validationTimestamp;
          const startTime = team.round2StartTime || team.startTimeRound2 || team.createdAt || (validationTimestamp - 60000);
          if (!team.round2StartTime) team.round2StartTime = startTime;
          if (!team.startTimeRound2) team.startTimeRound2 = startTime;
          team.round2TimeSpentSeconds = Math.max(1, Math.round((validationTimestamp - startTime) / 1000));
        }

        const flagBonus = wasAlreadyCompleted ? 0 : 200;
        if (!wasAlreadyCompleted) {
          team.round2Score = (team.round2Score || 0) + flagBonus;
          const log: ActivityLog = {
            id: `LOG-${Date.now()}`,
            teamId: team.id,
            teamName: team.name,
            type: 'ROUND_ADVANCED',
            message: `CHAMPIONSHIP RESTORATION: Squad "${team.name}" cleared Technical Question No. 4 in ${room.roomName}! Official time recorded: ${team.round2TimeSpentSeconds}s.`,
            timestamp: validationTimestamp,
            severity: 'ALERT',
          };
          db.logs.unshift(log);
        }

        saveDb();

        return res.json({
          isCorrect: true,
          success: true,
          message: 'CHAMPIONSHIP FLAG CAPTURED: All 4 rooms cleared! Official timer stopped and recorded.',
          isCompleted: true,
          flagCaptured: true,
          clearedRoom4: true,
          pointsAwarded: techPts + flagBonus,
          explanation: room.keyBox.techExplanation,
          finalScore: team.round2Score,
          timeSpentSeconds: team.round2TimeSpentSeconds || 0,
          round2FinishTime: team.round2FinishTime,
          finishTimeRound2: team.finishTimeRound2,
          timerStopped: true,
          totalScore: getTeamNetScore(team),
        });
      } else {
        saveDb();
        return res.json({
          isCorrect: true,
          success: true,
          message: 'Room 4 puzzle solved, but preceding rooms must also be cleared to escape.',
          isCompleted: false,
          flagCaptured: false,
          pointsAwarded: techPts,
          explanation: room.keyBox.techExplanation,
          totalScore: getTeamNetScore(team),
        });
      }
    }
  } else {
    // Requirement 7: If answer is incorrect, timer continues running!
    team.failedAttempts = (team.failedAttempts || 0) + 1;
    saveDb();
    return res.json({
      isCorrect: false,
      success: false,
      timerStopped: false,
      message: 'ACCESS DENIED: Technical calculation rejected. Check your derivation and format.',
      totalScore: getTeamNetScore(team),
    });
  }
});

app.post(['/api/team/round2/request-hint', '/api/team/round2/hint'], requireTeam, (req: Request, res: Response) => {
  const team: Team = (req as any).team;
  if (!team.isQualified) {
    return res.status(403).json({ error: 'QUALIFICATION REQUIRED.' });
  }

  const { roomId, step, hintKey: customKey } = req.body;
  const roomIndex = Number(roomId) || 1;
  const setId = getTeamSetId(team);
  const roomsConfig = getRoomsConfigForSet(setId);
  const room = roomsConfig[roomIndex];

  if (!room) {
    return res.status(404).json({ error: 'Room not found.' });
  }

  const hintKey = customKey || (step ? `${roomIndex}_${step}` : `ROOM_${roomIndex}`);
  if (!team.round2RoomHintsUsed) team.round2RoomHintsUsed = {};
  if (!team.round2HintsRevealed) team.round2HintsRevealed = [];

  const alreadyUnlocked = team.round2HintsRevealed.includes(hintKey) || Boolean(team.round2RoomHintsUsed[hintKey]);

  if (!alreadyUnlocked) {
    team.round2RoomHintsUsed[hintKey] = true;
    team.round2HintsRevealed.push(hintKey);
    team.round2HintsUsed = (team.round2HintsUsed || 0) + 1;

    const log: ActivityLog = {
      id: `LOG-${Date.now()}`,
      teamId: team.id,
      teamName: team.name,
      type: 'HINT_USED',
      message: `Squad "${team.name}" requested tactical hint for ${room.roomName} (${step || 'INTEL'}) (-10 PTS penalty).`,
      timestamp: Date.now(),
      severity: 'WARNING',
    };
    db.logs.unshift(log);
    saveDb();
  }

  const fieldHints = ROUND2_FIELD_GUIDE_HINTS[roomIndex];
  const hintText = fieldHints
    ? `${ROUND2_FIELD_GUIDE_TITLE}: Letter 1: ${fieldHints.letter1} | Letter 2: ${fieldHints.letter2} | Tech: ${fieldHints.tech}`
    : 'Analyze the letter observations and terminal equation carefully.';

  return res.json({
    hint: hintText,
    penaltyPoints: 10,
    currentScore: getTeamNetScore(team),
    round2Score: getRound2NetScore(team),
    totalHintsUsed: (team.hintsUsed || 0) + (team.passwordHintsUsed || 0) + (team.round2HintsUsed || 0),
    alreadyUnlocked,
  });
});

// Dedicated 3D Escape Room Hint Registration & Score Deduction
app.post('/api/escape/hint', (req: Request, res: Response) => {
  const user = (req as any).user;
  const team: Team | undefined = user && user.teamId ? db.teams[user.teamId] : undefined;
  const { roomId, step, hintKey: customKey, hintsCount, errorsCount } = req.body;
  const roomIndex = Number(roomId) || 1;
  const hintKey = customKey || (step ? `${roomIndex}_${step}` : `ROOM_${roomIndex}_${Date.now()}`);

  if (team) {
    if (!team.round2HintsRevealed) team.round2HintsRevealed = [];
    if (!team.round2RoomHintsUsed) team.round2RoomHintsUsed = {};

    const alreadyUnlocked = team.round2HintsRevealed.includes(hintKey) || Boolean(team.round2RoomHintsUsed[hintKey]);
    if (!alreadyUnlocked) {
      team.round2HintsRevealed.push(hintKey);
      team.round2RoomHintsUsed[hintKey] = true;
      team.round2HintsUsed = (team.round2HintsUsed || 0) + 1;

      const log: ActivityLog = {
        id: `LOG-${Date.now()}`,
        teamId: team.id,
        teamName: team.name,
        type: 'HINT_USED',
        message: `Squad "${team.name}" unlocked tactical hint for Room ${roomIndex} (${step || 'INTEL'}) (-10 PTS penalty).`,
        timestamp: Date.now(),
        severity: 'WARNING',
      };
      db.logs.unshift(log);
    }

    if (typeof hintsCount === 'number' && hintsCount > (team.round2HintsUsed || 0)) {
      team.round2HintsUsed = hintsCount;
    }
    if (typeof errorsCount === 'number' && errorsCount > (team.round2FailedAttempts || 0)) {
      team.round2FailedAttempts = errorsCount;
    }
    saveDb();

    return res.json({
      success: true,
      penaltyPoints: 10,
      currentScore: getTeamNetScore(team),
      round2Score: getRound2NetScore(team),
      totalHintsUsed: (team.hintsUsed || 0) + (team.passwordHintsUsed || 0) + (team.round2HintsUsed || 0),
    });
  }

  return res.json({
    success: true,
    penaltyPoints: 10,
    currentScore: Math.max(0, 1000 - ((hintsCount || 1) * 10)),
    round2Score: Math.max(0, 1000 - ((hintsCount || 1) * 10)),
    totalHintsUsed: hintsCount || 1,
  });
});

// Authoritative Escape Memoirs verification endpoint
app.post('/api/escape/verify', (req: Request, res: Response) => {
  const { roomId, step, input, currentErrors, currentHints, setId } = req.body;
  const roomIndex = Number(roomId);
  const user = (req as any).user;
  const team: Team | undefined = user && user.teamId ? db.teams[user.teamId] : undefined;

  let effectiveSetId: 1 | 2 | 3 = 1;
  if (setId && (Number(setId) === 1 || Number(setId) === 2 || Number(setId) === 3)) {
    effectiveSetId = Number(setId) as 1 | 2 | 3;
  } else if (team) {
    effectiveSetId = getTeamSetId(team);
  }

  // Sequential progression check if team is authenticated
  if (team && roomIndex > 1) {
    const verifiedRooms = getVerifiedCompletedRooms(team);
    if (!verifiedRooms.includes(roomIndex - 1)) {
      return res.status(403).json({
        success: false,
        message: 'SECURITY INTERLOCK: Room sequence mismatch. Preceding room must be completed first.',
      });
    }
  }

  const result = verify(
    roomIndex,
    step as RoomStep,
    String(input || ''),
    Number(currentErrors || 0),
    Number(currentHints || 0),
    effectiveSetId
  );

  // If a registered team is making the verification, sync their progress to the backend DB!
  if (team) {
    if (typeof currentHints === 'number' && currentHints > (team.round2HintsUsed || 0)) {
      team.round2HintsUsed = currentHints;
    }
    if (typeof currentErrors === 'number' && currentErrors > (team.round2FailedAttempts || 0)) {
      team.round2FailedAttempts = currentErrors;
    }

    if (result.success) {
      if (step === 'LETTER_1') {
        if (!team.round2Step1Solved) team.round2Step1Solved = {};
        if (!team.round2Step1Solved[roomIndex]) {
          team.round2Step1Solved[roomIndex] = true;
          team.round2Score = (team.round2Score || 0) + 50;
        }
      } else if (step === 'LETTER_2') {
        if (!team.round2Letter2Solved) team.round2Letter2Solved = {};
        if (!team.round2Letter2Solved[roomIndex]) {
          team.round2Letter2Solved[roomIndex] = true;
          team.round2Score = (team.round2Score || 0) + 50;
        }
      } else if (step === 'PHYSICAL_KEY') {
        if (!team.round2Step2Verified) team.round2Step2Verified = {};
        if (!team.round2Step2Verified[roomIndex]) {
          team.round2Step2Verified[roomIndex] = true;
          team.round2Score = (team.round2Score || 0) + 50;
        }
      } else if (step === 'TECH') {
        const wasAlreadyCompleted = Boolean(team.round2Step3Completed && team.round2Step3Completed[roomIndex]);
        if (!team.round2Step3Completed) team.round2Step3Completed = {};
        if (!team.round2Step3Completed[roomIndex]) {
          team.round2Step3Completed[roomIndex] = true;
          if (!team.round2CompletedRooms) team.round2CompletedRooms = [];
          if (!team.round2CompletedRooms.includes(roomIndex)) team.round2CompletedRooms.push(roomIndex);
          team.round2Score = (team.round2Score || 0) + 250;
        }

        const updatedVerified = getVerifiedCompletedRooms(team);
        if (roomIndex < 4) {
          team.round2CurrentRoom = Math.max(team.round2CurrentRoom || 1, roomIndex + 1);
          // Requirement: Do not stop timer after Questions 1, 2, or 3
        } else {
          // Room 4 completion ONLY valid if 1, 2, 3 were completed
          if (updatedVerified.includes(1) && updatedVerified.includes(2) && updatedVerified.includes(3) && updatedVerified.includes(4)) {
            team.round2CurrentRoom = 5;
            team.round2Status = 'COMPLETED';
            team.status = 'COMPLETED';
            team.flagCollected = true;
            team.clearedRoom4 = true;
            team.room4Cleared = true;

            const validationTimestamp = Date.now();
            const hadRecordedCompletion = Boolean(team.round2FinishTime && team.round2TimeSpentSeconds);

            // Requirements 2, 3, 4, 5, 8: Freeze timer immediately at the exact validation moment
            if (!team.round2FinishTime) {
              team.round2FinishTime = validationTimestamp;
              team.finishTimeRound2 = validationTimestamp;
              const startTime = team.round2StartTime || team.startTimeRound2 || team.createdAt || (validationTimestamp - 60000);
              if (!team.round2StartTime) team.round2StartTime = startTime;
              if (!team.startTimeRound2) team.startTimeRound2 = startTime;
              team.round2TimeSpentSeconds = Math.max(1, Math.round((validationTimestamp - startTime) / 1000));
            }

            if (!hadRecordedCompletion) {
              team.round2Score = (team.round2Score || 0) + 200; // Flag bonus
              const log: ActivityLog = {
                id: `LOG-${Date.now()}`,
                teamId: team.id,
                teamName: team.name,
                type: 'ROUND_ADVANCED',
                message: `CHAMPIONSHIP RESTORATION: Squad "${team.name}" cleared Technical Question No. 4! Official timer stopped at ${team.round2TimeSpentSeconds}s.`,
                timestamp: validationTimestamp,
                severity: 'ALERT',
              };
              db.logs.unshift(log);
            }
          }
        }
      }
    } else {
      // Requirement 7: If answer is incorrect, timer continues running
      team.failedAttempts = (team.failedAttempts || 0) + 1;
      team.round2FailedAttempts = (team.round2FailedAttempts || 0) + 1;
    }
    saveDb();

    const isRoom4Completed = Boolean(team && isTeamRoom4Cleared(team) && team.round2FinishTime);
    return res.json({
      ...result,
      timerStopped: isRoom4Completed,
      timeSpentSeconds: team?.round2TimeSpentSeconds || 0,
      round2FinishTime: team?.round2FinishTime,
      finishTimeRound2: team?.finishTimeRound2,
      round2StartTime: team?.round2StartTime,
      isCompleted: isRoom4Completed,
      clearedRoom4: isRoom4Completed,
      currentRoom: isRoom4Completed ? 5 : (team ? getGenuineCurrentRoom(team) : roomIndex),
      completedRooms: team ? getVerifiedCompletedRooms(team) : [],
    });
  }

  return res.json(result);
});

// Explicit endpoint to finalize Round 2 Escape Room completion
app.post('/api/team/round2/complete-escape', requireTeam, (req: Request, res: Response) => {
  const team: Team = (req as any).team;
  if (!team) {
    return res.status(401).json({ error: 'Team authentication required.' });
  }

  // Prevent duplicate completion records if the screen is refreshed
  if (team.round2Status === 'COMPLETED' && team.finishTimeRound2 && team.round2TimeSpentSeconds) {
    return res.json({
      success: true,
      message: 'Round 2 Escape Room already marked as COMPLETED.',
      isAlreadyCompleted: true,
      finalScore: getTeamNetScore(team),
      round2Score: team.round2Score || 0,
      completionTime: team.finishTimeRound2,
      timeSpentSeconds: team.round2TimeSpentSeconds || 0,
      timerStopped: true,
      clearedRoom4: true,
    });
  }

  const verifiedRooms = getVerifiedCompletedRooms(team);
  const hasRoom4Tech = Boolean(team.round2Step3Completed?.[4]);
  if (!verifiedRooms.includes(1) || !verifiedRooms.includes(2) || !verifiedRooms.includes(3) || !hasRoom4Tech) {
    return res.status(403).json({
      error: 'SECURITY INTERLOCK: All 4 rooms must be legitimately solved before escaping.',
      completedRooms: verifiedRooms,
    });
  }

  team.round2CurrentRoom = 5;
  team.round2Status = 'COMPLETED';
  team.status = 'COMPLETED';
  team.flagCollected = true;
  team.clearedRoom4 = true;
  team.room4Cleared = true;
  if (!team.round2CompletedRooms) team.round2CompletedRooms = [];
  if (!team.round2CompletedRooms.includes(4)) {
    team.round2CompletedRooms.push(4);
  }
  if (!team.round2FinishTime) {
    team.round2FinishTime = Date.now();
  }
  team.finishTimeRound2 = team.round2FinishTime;
  if (!team.round2TimeSpentSeconds) {
    const startTime = team.round2StartTime || team.startTimeRound2 || team.createdAt || (team.round2FinishTime - 60000);
    if (!team.round2StartTime) team.round2StartTime = startTime;
    if (!team.startTimeRound2) team.startTimeRound2 = startTime;
    team.round2TimeSpentSeconds = Math.max(1, Math.round((team.round2FinishTime - startTime) / 1000));
  }

  const log: ActivityLog = {
    id: `LOG-${Date.now()}`,
    teamId: team.id,
    teamName: team.name,
    type: 'ROUND_ADVANCED',
    message: `CHAMPIONSHIP RESTORATION: Squad "${team.name}" cracked the Final Vault, opened the blast door, and successfully escaped the room!`,
    timestamp: Date.now(),
    severity: 'ALERT',
  };
  db.logs.unshift(log);
  saveDb();

  return res.json({
    success: true,
    message: 'Round 2 Escape Room successfully marked as COMPLETED.',
    isAlreadyCompleted: false,
    finalScore: getTeamNetScore(team),
    round2Score: team.round2Score || 0,
    completionTime: team.finishTimeRound2,
    timeSpentSeconds: team.round2TimeSpentSeconds || 0,
    timerStopped: true,
    clearedRoom4: true,
  });
});

// Automatic & Instant Escape Room Progress Sync (persisting state even when teams go back or refresh)
app.get('/api/team/round2/sync-progress', requireTeam, (req: Request, res: Response) => {
  const team: Team = (req as any).team;
  if (!team.round2StartTime) {
    const now = Date.now();
    team.round2StartTime = now;
    team.startTimeRound2 = now;
    if (!team.round2Status || team.round2Status === 'NOT_STARTED') {
      team.round2Status = 'IN_PROGRESS';
    }
    saveDb();
  }

  const isRoom4Cleared = isTeamRoom4Cleared(team);
  const genuineRoom = isRoom4Cleared ? 5 : getGenuineCurrentRoom(team);
  const isTimerStopped = Boolean(isRoom4Cleared && team.round2FinishTime);

  return res.json({
    success: true,
    progress: team.round2EscapeProgress || null,
    currentRoom: genuineRoom,
    completedRooms: getVerifiedCompletedRooms(team),
    clearedRoom4: isRoom4Cleared,
    round2StartTime: team.round2StartTime,
    round2FinishTime: team.round2FinishTime,
    finishTimeRound2: team.finishTimeRound2,
    timeSpentSeconds: team.round2TimeSpentSeconds || (team.round2StartTime ? Math.round((Date.now() - team.round2StartTime) / 1000) : 0),
    timerStopped: isTimerStopped,
    team: sanitizeTeamForClient(team),
  });
});

app.post(['/api/team/round2/sync-progress', '/api/escape/sync-progress'], requireTeam, (req: Request, res: Response) => {
  const team: Team = (req as any).team;
  if (!team) {
    return res.status(401).json({ error: 'Team authentication required.' });
  }

  const { progress, currentRoomId } = req.body;

  if (progress && typeof progress === 'object') {
    // Retain safe client UI state (e.g. inventory notes), but do not let client spoof completions
    team.round2EscapeProgress = progress;

    if (!team.round2StartTime) {
      team.round2StartTime = Date.now();
      team.startTimeRound2 = team.round2StartTime;
      if (!team.round2Status || team.round2Status === 'NOT_STARTED') {
        team.round2Status = 'IN_PROGRESS';
      }
    }

    if (typeof progress.hintsUsedCount === 'number') {
      team.round2HintsUsed = Math.max(team.round2HintsUsed || 0, progress.hintsUsedCount);
    }
    if (typeof progress.cumulativeErrors === 'number') {
      team.round2FailedAttempts = Math.max(team.round2FailedAttempts || 0, progress.cumulativeErrors);
    }
  }

  // Always compute current room and completion strictly from verified records
  const isRoom4Cleared = isTeamRoom4Cleared(team) || isTeamRound2Cleared(team);
  const verifiedRooms = getVerifiedCompletedRooms(team);
  const maxAccessible = Math.min(4, verifiedRooms.length + 1);

  if (isRoom4Cleared) {
    team.round2CurrentRoom = 5;
    team.round2Status = 'COMPLETED';
    team.status = 'COMPLETED';
    team.flagCollected = true;
    team.clearedRoom4 = true;
    team.room4Cleared = true;
    if (!team.round2CompletedRooms || !team.round2CompletedRooms.includes(4)) {
      team.round2CompletedRooms = Array.from(new Set([...(team.round2CompletedRooms || []), 1, 2, 3, 4])).sort();
    }
    if (!team.round2FinishTime) {
      team.round2FinishTime = team.finishTimeRound2 || Date.now();
      team.finishTimeRound2 = team.round2FinishTime;
      const startTime = team.round2StartTime || team.startTimeRound2 || team.createdAt || (team.round2FinishTime - 60000);
      if (!team.round2StartTime) team.round2StartTime = startTime;
      if (!team.startTimeRound2) team.startTimeRound2 = startTime;
      team.round2TimeSpentSeconds = Math.max(1, Math.round((team.round2FinishTime - startTime) / 1000));
    }
  } else {
    // Only adjust current room for active progressing teams, never overwrite legitimate completions
    if (typeof currentRoomId === 'number' && currentRoomId >= 1) {
      team.round2CurrentRoom = Math.min(maxAccessible, Math.max(1, currentRoomId));
    } else {
      team.round2CurrentRoom = Math.min(maxAccessible, team.round2CurrentRoom || 1);
    }
    if (!team.round2Status || team.round2Status === 'NOT_STARTED') {
      if (verifiedRooms.length > 0 || team.round2StartTime) {
        team.round2Status = 'IN_PROGRESS';
      }
    }
  }

  saveDb();
  const effectiveVerified = isRoom4Cleared ? [1, 2, 3, 4] : verifiedRooms;
  const isTimerStopped = Boolean(isRoom4Cleared && team.round2FinishTime);
  return res.json({
    success: true,
    clearedRoom4: isRoom4Cleared,
    currentRoom: isRoom4Cleared ? 5 : team.round2CurrentRoom,
    completedRooms: effectiveVerified,
    round2StartTime: team.round2StartTime,
    round2FinishTime: team.round2FinishTime,
    finishTimeRound2: team.finishTimeRound2,
    timeSpentSeconds: team.round2TimeSpentSeconds || (team.round2StartTime ? Math.round((Date.now() - team.round2StartTime) / 1000) : 0),
    timerStopped: isTimerStopped,
    team: sanitizeTeamForClient(team),
  });
});


// ==========================================
// 3D HAUNTED MYSTERY HOUSE DATA & ENDPOINTS
// ==========================================

const hauntedHouseConfig = [
  {
    roomId: 1,
    roomName: 'The Forgotten Study',
    roomTheme: 'Antique mahogany study filled with towering bookshelves, grandfather clock, stone fireplace, and dusty rolltop desk.',
    doorName: 'Heavy Wrought-Oak Portal (Door 1)',
    keyNeeded: 'Antique Brass Key',
    decoyObjects: [
      { id: 'R1-D1', name: 'Cobwebbed Painting', message: 'An oil portrait of an austere Victorian scholar. Cold dead eyes watch you, but no papers are concealed behind the frame.' },
      { id: 'R1-D2', name: 'Fireplace Hearth Urn', message: 'A heavy iron urn coated in centuries of cold soot. Nothing inside except brittle embers.' },
      { id: 'R1-D3', name: 'Wrought Chandelier', message: 'Flickering wax tapers cast trembling shadows against the high wooden rafters.' },
    ],
    letters: [
      {
        id: 'R1-L1',
        roomId: 1,
        title: "A Scholar's Parity Fragment",
        locationName: 'Antique Bookshelf',
        storyText: 'Tucked between cracked leather folios on the third shelf, you find a faded parchment inscribed with telemetric binary:',
        question: 'An antique telemetry log holds an encrypted 8-bit stream: 1101001X. The sector protocol enforces Odd Parity (the total count of 1s in the 8-bit stream must be an odd number). First, determine the single binary bit value of X (0 or 1). Then evaluate: (2^X + 1) * 64 - 1. Enter the resulting decimal integer.',
        hint: 'Count the 1s in 1101001: there are four 1s (even). Odd parity requires an odd total of ones, so X must be 1. Now calculate (2^1 + 1) * 64 - 1 = 3 * 64 - 1 = 191.',
        hintPenalty: 10,
        answer: '191',
        locationClueFragment: 'The pendulum never sleeps where time was buried...',
      },
      {
        id: 'R1-L2',
        roomId: 1,
        title: "The Cartographer's Memory Allocation",
        locationName: 'Rolltop Desk',
        storyText: 'Beneath the stained leather desk blotter, you discover a yellowed engineer notebook snippet:',
        question: 'A C-language memory buffer allocation in the scholar\'s notebook reads:\nint arr[4] = { 12, 24, 36, 48 };\nint *p = arr + 1;\nint result = *(p + 2) - *p;\nWhat integer value is assigned to result?',
        hint: 'p points to arr[1] which is 24. Adding 2 advances the pointer to arr[3] which is 48. Calculate 48 - 24.',
        hintPenalty: 10,
        answer: '24',
        locationClueFragment: 'Search within the towering oak casing of the grandfather clock...',
      },
      {
        id: 'R1-L3',
        roomId: 1,
        title: "The Alchemist's Thermal Bridge",
        locationName: 'Fireplace Mantel',
        storyText: 'Behind a loose stone in the fireplace hearth, you extract a soot-stained parchment formula:',
        question: 'A Wheatstone bridge circuit in the hearth chamber has R1 = 150 Ω, R2 = 450 Ω, and R3 = 200 Ω. For null deflection (0V across detector), calculate the required sensor resistance Rx in Ohms using the balanced bridge condition: Rx = (R2 * R3) / R1.',
        hint: 'Multiply 450 by 200 to obtain 90,000. Divide 90,000 by 150.',
        hintPenalty: 10,
        answer: '600',
        locationClueFragment: 'The concealed key box is behind the lower clock pendulum panel.',
      },
    ],
    keyBox: {
      roomId: 1,
      objectName: 'Grandfather Clock',
      boxTitle: "The Clockmaker's Ornamental Brass Box",
      finalQuestion: 'To disengage the clockmaker\'s brass dial, combine your findings: Take the sum of your three letter puzzle answers (191 + 24 + 600) and calculate the modulo 100 remainder (the last two digits). Enter the number.',
      hint: '191 + 24 = 215. 215 + 600 = 815. 815 modulo 100 is 15.',
      answer: '15',
      keyName: 'Antique Brass Key',
    },
  },
  {
    roomId: 2,
    roomName: 'The Abandoned Laboratory',
    roomTheme: 'Cluttered industrial electronics laboratory with broken oscilloscopes, flickering vacuum tubes, chemical flasks, and circuit racks.',
    doorName: 'Reinforced Magnetic Airlock (Door 2)',
    keyNeeded: 'Heavy Iron Laboratory Key',
    decoyObjects: [
      { id: 'R2-D1', name: 'Microscope Stand', message: 'The high-power objective lens is cracked and encrusted with dried copper sulfate crystals.' },
      { id: 'R2-D2', name: 'Reagent Acid Cabinet', message: 'Empty amber glass bottles labeled "NITRIC ACID - CORROSIVE". Toxic fumes linger in the air.' },
      { id: 'R2-D3', name: 'Soldering Station', message: 'A burnt soldering iron tip rests on a charred asbestos mat. No clues here.' },
    ],
    letters: [
      {
        id: 'R2-L1',
        roomId: 2,
        title: 'Flip-Flop Truth Vector',
        locationName: 'Component Drawer Rack',
        storyText: 'In a steel drawer labeled "INTEGRATED LOGIC", you uncover a technical schematic note:',
        question: 'An active-high SR latch is initialized with S=1, R=0 (setting output Q=1). In the subsequent clock cycle, inputs change to S=0, R=1. What is the resulting binary value of output Q (0 or 1)?',
        hint: 'With S=0 and R=1, the latch is driven into its reset state, forcing output Q to 0.',
        hintPenalty: 10,
        answer: '0',
        locationClueFragment: 'High-voltage breaker lines hum in the northwest corner...',
      },
      {
        id: 'R2-L2',
        roomId: 2,
        title: 'Root-Mean-Square Telemetry',
        locationName: 'Cathode Ray Oscilloscope',
        storyText: 'Taped to the side of the green phosphor CRT oscilloscope, a lab calibration memo reads:',
        question: 'The cathode ray oscilloscope measures a sinusoidal mains waveform with peak-to-peak voltage Vpp = 282.8 V. Calculate the root-mean-square voltage Vrms in Volts (rounded to the nearest whole integer: Vrms = Vpp / (2 * √2)).',
        hint: 'Peak voltage Vp is half of Vpp = 141.4 V. Vrms = 141.4 / 1.414 = 100 V.',
        hintPenalty: 10,
        answer: '100',
        locationClueFragment: 'The steel industrial circuit breaker safe bears yellow danger stripes...',
      },
      {
        id: 'R2-L3',
        roomId: 2,
        title: 'Synchronous 4-Bit Counter Overflow',
        locationName: 'Chemical Distillation Station',
        storyText: 'Under an antique copper condensing coil, you retrieve a damp laboratory log:',
        question: 'A 4-bit synchronous binary counter initialized at 0000 is pulsed 29 times. In standard 4-bit binary format (e.g. 1010), what is the final state of the counter? (Calculate 29 mod 16 and convert to 4-bit binary).',
        hint: '29 mod 16 = 13. 13 in 4-bit binary is 8 + 4 + 0 + 1 = 1101.',
        hintPenalty: 10,
        answer: '1101',
        locationClueFragment: 'The concealed key box is locked behind Breaker Unit #42.',
      },
    ],
    keyBox: {
      roomId: 2,
      objectName: 'High-Voltage Breaker Safe',
      boxTitle: 'Industrial High-Voltage Lockout Safe',
      finalQuestion: 'Calculate the resonant frequency in Hz of a tank circuit with L = 25 mH and C = 10 µF, rounded to the nearest whole integer: f = 1 / (2 * π * √(L * C)). Use π ≈ 3.1416.',
      hint: 'L * C = 25e-3 * 10e-6 = 2.5e-7. √(2.5e-7) = 0.0005. 2 * 3.1416 * 0.0005 = 0.0031416. 1 / 0.0031416 ≈ 318.',
      answer: '318',
      keyName: 'Heavy Iron Laboratory Key',
    },
  },
  {
    roomId: 3,
    roomName: 'The Cursed Gallery',
    roomTheme: 'Gothic portrait gallery lined with gilded paintings whose eyes watch, covered marble statues, broken mirrors, and crimson velvet drapery.',
    doorName: 'Gothic Gargoyle Archway (Door 3)',
    keyNeeded: 'Ornate Gilded Gallery Key',
    decoyObjects: [
      { id: 'R3-D1', name: 'Candelabra Pedestal', message: 'Tears of black wax have dripped down the carved marble pedestal into gargoyle claws.' },
      { id: 'R3-D2', name: 'Velvet Settee', message: 'Rotting crimson damask upholstery exhales a musty odor of ancient damp earth.' },
      { id: 'R3-D3', name: 'Draped Portrait', message: 'A canvas shrouded in heavy burlap. You peek beneath: only a blackened silhouette stares back.' },
    ],
    letters: [
      {
        id: 'R3-L1',
        roomId: 3,
        title: "The Architect's Caesar Shift",
        locationName: 'Gilded Architect Portrait',
        storyText: 'Behind the heavy gold leaf frame of the mansion founder\'s portrait, a secret parchment note is tucked:',
        question: 'Inscribed on the oil canvas is a classical Caesar cipher shifted by +7: OLSSV. Decrypt the original 5-letter word.',
        hint: 'Shift each letter backward in the alphabet by 7 positions: O->H, L->E, S->L, S->L, V->O.',
        hintPenalty: 10,
        answer: 'HELLO',
        locationClueFragment: 'Reflections betray the truth in the cracked Venetian glass...',
      },
      {
        id: 'R3-L2',
        roomId: 3,
        title: "Euler's Planar Topography",
        locationName: 'Shrouded Marble Statue',
        storyText: 'Under the hem of the white sheet draping a life-sized marble statue, you locate an ink ledger:',
        question: 'A connected planar graph representation of the gallery hall has V = 6 vertices and E = 9 edges. According to Euler\'s formula V - E + F = 2, how many faces (regions) F does this planar graph enclose?',
        hint: 'Rearrange: F = 2 - V + E = 2 - 6 + 9 = 5.',
        hintPenalty: 10,
        answer: '5',
        locationClueFragment: 'The tall gilded mirror on the south wall possesses a loose bevel...',
      },
      {
        id: 'R3-L3',
        roomId: 3,
        title: 'Modular Exponentiation Seal',
        locationName: 'Glass Display Vitrine',
        storyText: 'Inside a glass display cabinet, pinned beside an ancient jeweled scarab, you read a cipher card:',
        question: 'Calculate the exact integer remainder of the modular expression: (17^3) mod 11.',
        hint: '17 mod 11 is 6. 6^3 = 216. 216 / 11 = 19 with remainder 7.',
        hintPenalty: 10,
        answer: '7',
        locationClueFragment: 'Slide the antique mirror aside to reveal the secret wall vault.',
      },
    ],
    keyBox: {
      roomId: 3,
      objectName: 'Secret Mirror Vault',
      boxTitle: 'The Venetian Mirror Wall Vault',
      finalQuestion: 'To disengage the mirrored vault interlock, evaluate the curator\'s hexadecimal checksum: 0x2A + 0x3F. Enter the final decimal integer.',
      hint: '0x2A in decimal is 2*16 + 10 = 42. 0x3F in decimal is 3*16 + 15 = 63. 42 + 63 = 105.',
      answer: '105',
      keyName: 'Ornate Gilded Gallery Key',
    },
  },
  {
    roomId: 4,
    roomName: 'The Final Chamber',
    roomTheme: 'Monumental stone crypt with tall basalt pillars, hanging iron chains, dark-red mystic floor glyphs, burning brass braziers, and a central stone altar illuminated by a dramatic shaft of celestial amber light.',
    doorName: 'Sanctum Vault Portal (Door 4)',
    keyNeeded: 'Victory Keystone Flag',
    decoyObjects: [
      { id: 'R4-D1', name: 'Iron Wall Sconce', message: 'Cold iron sconces hold guttering tallow candles that cast twisting shadows against the obsidian wall.' },
      { id: 'R4-D2', name: 'Altar Steps', message: 'Ancient granite flagstones carved with forgotten sigils worn smooth by countless pilgrims.' },
    ],
    letters: [
      {
        id: 'R4-L1',
        roomId: 4,
        title: 'State Automaton Sequence',
        locationName: 'North Basalt Pillar',
        storyText: 'Chiseled into the fluted basalt pillar in glowing crimson ink:',
        question: 'A 3-state finite automaton tracking the vault locks has states S0, S1, S2. Each binary 1 transitions clockwise (S0->S1->S2->S0), and each 0 maintains current state. Starting at state S0, what state is reached after input sequence 1101101? (Enter S0, S1, or S2).',
        hint: 'Count the number of 1s in 1101101: there are 5 ones. 5 mod 3 = 2, so the final state is S2.',
        hintPenalty: 15,
        answer: 'S2',
        locationClueFragment: 'The First Dial of the Obsidian Chest aligns with State 2.',
      },
      {
        id: 'R4-L2',
        roomId: 4,
        title: 'Induction Rotor Velocity',
        locationName: 'Chained Altar Monolith',
        storyText: 'Bound by heavy iron links to the eastern altar, an engraved brass plate proclaims:',
        question: 'A 3-phase induction motor driving the final vault hydraulic barrier operates at 50 Hz with 4 poles (Synchronous speed Ns = 1500 RPM). If slip s = 0.06 (6%), calculate the actual rotor speed Nr = Ns * (1 - s) in RPM.',
        hint: 'Nr = 1500 * (1 - 0.06) = 1500 * 0.94 = 1410.',
        hintPenalty: 15,
        answer: '1410',
        locationClueFragment: 'The Second Dial aligns with Rotor Speed 1410.',
      },
      {
        id: 'R4-L3',
        roomId: 4,
        title: 'Prime Factorization of the Seal',
        locationName: 'Burning Brass Brazier',
        storyText: 'Engraved around the rim of the flaming brass brazier:',
        question: 'The final seal requires the sum of all distinct prime factors of 210. Find the prime factors of 210 and submit their total sum.',
        hint: '210 = 2 * 3 * 5 * 7. Sum: 2 + 3 + 5 + 7 = 17.',
        hintPenalty: 15,
        answer: '17',
        locationClueFragment: 'The Third Dial aligns with Prime Sum 17.',
      },
    ],
    keyBox: {
      roomId: 4,
      objectName: 'Ancient Obsidian Relic Casket',
      boxTitle: 'The Altar Obsidian Casket',
      finalQuestion: 'Enter the Master Vault Key: Calculate the total sum of (Automaton State Number 2 + Rotor Speed 1410 + Prime Factor Sum 17).',
      hint: 'Compute 2 + 1410 + 17 = 1429.',
      answer: '1429',
      keyName: 'The Final Flag of Tech Quest',
    },
  },
];

// Helper to sanitize room data for client
function sanitizeHauntedRoom(room: typeof hauntedHouseConfig[0], team: Team) {
  const currentRoomNum = team.round2CurrentRoom || 1;
  const isUnlocked = currentRoomNum >= room.roomId;
  const isCompleted = (team.round2CompletedRooms || []).includes(room.roomId);

  const discovered = team.round2DiscoveredLetters || [];
  const solved = team.round2SolvedLetters || [];
  const foundBoxes = team.round2FoundBoxes || [];
  const collectedKeys = team.round2CollectedKeys || [];

  const letters = room.letters.map((l) => {
    const isDiscovered = discovered.includes(l.id);
    const isSolved = solved.includes(l.id);

    return {
      id: l.id,
      roomId: l.roomId,
      title: l.title,
      locationName: l.locationName,
      storyText: isDiscovered ? l.storyText : 'An undiscovered letter rests in the shadows...',
      question: isDiscovered ? l.question : 'Explore the chamber and discover the letter to read the puzzle.',
      codeSnippet: isDiscovered ? (l as any).codeSnippet : undefined,
      diagram: isDiscovered ? (l as any).diagram : undefined,
      hint: isSolved || (team.round2HintsRevealed || []).includes(l.id) ? l.hint : undefined,
      hintPenalty: l.hintPenalty,
      locationClueFragment: isSolved ? l.locationClueFragment : undefined,
      isDiscovered,
      isSolved,
    };
  });

  const isFound = foundBoxes.includes(room.roomId);
  const isBoxUnlocked = (team.round2SolvedPuzzles || []).includes(room.roomId);
  const isKeyCollected = collectedKeys.includes(room.keyBox.keyName);

  const keyBox = {
    roomId: room.keyBox.roomId,
    objectName: room.keyBox.objectName,
    boxTitle: isFound ? room.keyBox.boxTitle : 'Concealed Compartment',
    finalQuestion: isFound ? room.keyBox.finalQuestion : 'Discover the hidden key box by following your solved clues.',
    hint: (team.round2HintsRevealed || []).includes(`BOX-${room.roomId}`) ? room.keyBox.hint : undefined,
    keyName: room.keyBox.keyName,
    isFound,
    isUnlocked: isBoxUnlocked,
    isKeyCollected,
  };

  return {
    roomId: room.roomId,
    roomName: room.roomName,
    roomTheme: room.roomTheme,
    doorName: room.doorName,
    keyNeeded: room.keyNeeded,
    isUnlocked,
    isCompleted,
    letters,
    keyBox,
    decoyObjects: room.decoyObjects,
  };
}

// 1. GET Haunted Mystery House State
app.get('/api/team/round2/haunted-state', requireTeam, (req: Request, res: Response) => {
  const team: Team = (req as any).team;

  if (!team.isQualified) {
    return res.status(403).json({
      error: 'QUALIFICATION REQUIRED: Only squads evaluated and approved from Round 1 can access Round 2.',
      isQualified: false,
    });
  }

  // Record start time if entering for the first time
  if (!team.round2StartTime) {
    team.round2StartTime = Date.now();
    team.round2Status = 'IN_PROGRESS';
    const log: ActivityLog = {
      id: `LOG-${Date.now()}`,
      teamId: team.id,
      teamName: team.name,
      type: 'ROUND_ADVANCED',
      message: `Squad "${team.name}" crossed the threshold into Round 2: The Mystery House (Four Doors. One Final Flag).`,
      timestamp: Date.now(),
      severity: 'INFO',
    };
    db.logs.unshift(log);
    saveDb();
  }

  const timeLeft = calculateRemainingTime('ROUND_2');
  const rooms = hauntedHouseConfig.map((r) => sanitizeHauntedRoom(r, team));

  return res.json({
    isQualified: true,
    currentRoom: team.round2CurrentRoom || 1,
    round2Score: team.round2Score || 0,
    hintsUsed: team.round2HintsUsed || 0,
    timeRemaining: timeLeft,
    isCompleted: team.round2Status === 'COMPLETED',
    discoveredLetters: team.round2DiscoveredLetters || [],
    solvedLetters: team.round2SolvedLetters || [],
    foundBoxes: team.round2FoundBoxes || [],
    collectedKeys: team.round2CollectedKeys || [],
    unlockedDoors: team.round2UnlockedDoors || [],
    flagCollected: Boolean(team.round2FlagCollected),
    rooms,
  });
});

// 2. Discover Letter
app.post('/api/team/round2/discover-letter', requireTeam, (req: Request, res: Response) => {
  const team: Team = (req as any).team;
  if (!team.isQualified) return res.status(403).json({ error: 'QUALIFICATION REQUIRED.' });

  const { roomId, letterId } = req.body;
  const roomConfig = hauntedHouseConfig.find((r) => r.roomId === Number(roomId));
  if (!roomConfig) return res.status(404).json({ error: 'Room not found.' });

  const letter = roomConfig.letters.find((l) => l.id === letterId);
  if (!letter) return res.status(404).json({ error: 'Letter not found in this chamber.' });

  if (!team.round2DiscoveredLetters) team.round2DiscoveredLetters = [];
  if (!team.round2DiscoveredLetters.includes(letterId)) {
    team.round2DiscoveredLetters.push(letterId);
    saveDb();
  }

  const isSolved = (team.round2SolvedLetters || []).includes(letterId);
  return res.json({
    success: true,
    letter: {
      id: letter.id,
      roomId: letter.roomId,
      title: letter.title,
      locationName: letter.locationName,
      storyText: letter.storyText,
      question: letter.question,
      codeSnippet: (letter as any).codeSnippet,
      diagram: (letter as any).diagram,
      hintPenalty: letter.hintPenalty,
      locationClueFragment: isSolved ? letter.locationClueFragment : undefined,
      isDiscovered: true,
      isSolved,
    },
  });
});

// 3. Solve Letter Puzzle
app.post('/api/team/round2/solve-letter', requireTeam, (req: Request, res: Response) => {
  const team: Team = (req as any).team;
  if (!team.isQualified) return res.status(403).json({ error: 'QUALIFICATION REQUIRED.' });

  const { roomId, letterId, answer } = req.body;
  const roomConfig = hauntedHouseConfig.find((r) => r.roomId === Number(roomId));
  if (!roomConfig) return res.status(404).json({ error: 'Room not found.' });

  const letter = roomConfig.letters.find((l) => l.id === letterId);
  if (!letter) return res.status(404).json({ error: 'Letter not found.' });

  if (!team.round2SolvedLetters) team.round2SolvedLetters = [];
  if (team.round2SolvedLetters.includes(letterId)) {
    return res.json({
      isCorrect: true,
      message: 'This parchment riddle was already deciphered.',
      clueFragment: letter.locationClueFragment,
      pointsAwarded: 0,
      newScore: team.round2Score || 0,
      allLettersSolvedForRoom: roomConfig.letters.every((l) => (team.round2SolvedLetters || []).includes(l.id)),
    });
  }

  const cleanSub = normalizeAnswer(String(answer || ''));
  const cleanExp = normalizeAnswer(letter.answer);
  const isCorrect = cleanSub === cleanExp || (letter.answer === 'S2' && cleanSub === '2');

  if (isCorrect) {
    team.round2SolvedLetters.push(letterId);
    const awardPoints = 30;
    team.round2Score = (team.round2Score || 0) + awardPoints;

    const log: ActivityLog = {
      id: `LOG-${Date.now()}`,
      teamId: team.id,
      teamName: team.name,
      type: 'ANSWER_ATTEMPT',
      message: `Squad "${team.name}" solved riddle on ${letter.title} (+${awardPoints} PTS). Location clue revealed!`,
      timestamp: Date.now(),
      severity: 'INFO',
    };
    db.logs.unshift(log);
    saveDb();

    const allSolved = roomConfig.letters.every((l) => (team.round2SolvedLetters || []).includes(l.id));

    return res.json({
      isCorrect: true,
      message: `PARCHMENT DECIPHERED: The ink glows with mystical energy! Location fragment revealed.`,
      clueFragment: letter.locationClueFragment,
      pointsAwarded: awardPoints,
      newScore: team.round2Score,
      allLettersSolvedForRoom: allSolved,
    });
  } else {
    team.failedAttempts = (team.failedAttempts || 0) + 1;
    saveDb();
    return res.json({
      isCorrect: false,
      message: 'ACCESS DENIED: The ancient cipher rejects your solution. Check calculations and try again.',
      pointsAwarded: 0,
      newScore: getTeamNetScore(team),
      allLettersSolvedForRoom: false,
    });
  }
});

// 4. Discover Key Box
app.post('/api/team/round2/discover-box', requireTeam, (req: Request, res: Response) => {
  const team: Team = (req as any).team;
  if (!team.isQualified) return res.status(403).json({ error: 'QUALIFICATION REQUIRED.' });

  const { roomId } = req.body;
  const roomConfig = hauntedHouseConfig.find((r) => r.roomId === Number(roomId));
  if (!roomConfig) return res.status(404).json({ error: 'Room not found.' });

  if (!team.round2FoundBoxes) team.round2FoundBoxes = [];
  if (!team.round2FoundBoxes.includes(Number(roomId))) {
    team.round2FoundBoxes.push(Number(roomId));
    saveDb();
  }

  const isUnlocked = (team.round2SolvedPuzzles || []).includes(Number(roomId));
  const isKeyCollected = (team.round2CollectedKeys || []).includes(roomConfig.keyBox.keyName);

  return res.json({
    success: true,
    keyBox: {
      roomId: roomConfig.keyBox.roomId,
      objectName: roomConfig.keyBox.objectName,
      boxTitle: roomConfig.keyBox.boxTitle,
      finalQuestion: roomConfig.keyBox.finalQuestion,
      keyName: roomConfig.keyBox.keyName,
      isFound: true,
      isUnlocked,
      isKeyCollected,
    },
  });
});

// 5. Solve Key Box Final Question
app.post('/api/team/round2/solve-box', requireTeam, (req: Request, res: Response) => {
  const team: Team = (req as any).team;
  if (!team.isQualified) return res.status(403).json({ error: 'QUALIFICATION REQUIRED.' });

  const { roomId, answer } = req.body;
  const roomConfig = hauntedHouseConfig.find((r) => r.roomId === Number(roomId));
  if (!roomConfig) return res.status(404).json({ error: 'Room not found.' });

  if (!team.round2SolvedPuzzles) team.round2SolvedPuzzles = [];
  if (team.round2SolvedPuzzles.includes(Number(roomId))) {
    return res.json({
      isCorrect: true,
      message: 'Key box mechanism is already unlocked.',
      keyName: roomConfig.keyBox.keyName,
      pointsAwarded: 0,
      newScore: team.round2Score || 0,
      canCollectKey: !(team.round2CollectedKeys || []).includes(roomConfig.keyBox.keyName),
      isRoom4FlagRevealed: Number(roomId) === 4,
    });
  }

  const cleanSub = normalizeAnswer(String(answer || ''));
  const cleanExp = normalizeAnswer(roomConfig.keyBox.answer);
  const isCorrect = cleanSub === cleanExp;

  if (isCorrect) {
    team.round2SolvedPuzzles.push(Number(roomId));
    const awardPoints = 50;
    team.round2Score = (team.round2Score || 0) + awardPoints;

    const log: ActivityLog = {
      id: `LOG-${Date.now()}`,
      teamId: team.id,
      teamName: team.name,
      type: 'ANSWER_ATTEMPT',
      message: `Squad "${team.name}" unlocked ${roomConfig.keyBox.boxTitle} in ${roomConfig.roomName} (+${awardPoints} PTS)!`,
      timestamp: Date.now(),
      severity: 'INFO',
    };
    db.logs.unshift(log);
    saveDb();

    return res.json({
      isCorrect: true,
      message: `MECHANISM UNLOCKED: Heavy tumblers fall into place with a resounding clunk! The box swings open.`,
      keyName: roomConfig.keyBox.keyName,
      pointsAwarded: awardPoints,
      newScore: team.round2Score,
      canCollectKey: true,
      isRoom4FlagRevealed: Number(roomId) === 4,
    });
  } else {
    team.failedAttempts = (team.failedAttempts || 0) + 1;
    saveDb();
    return res.json({
      isCorrect: false,
      message: 'LOCK REJECTED: The dial snaps back with an ominous screech. Re-read the clues and recalculate.',
      pointsAwarded: 0,
      newScore: getTeamNetScore(team),
      canCollectKey: false,
    });
  }
});

// 6. Collect Key into Inventory
app.post('/api/team/round2/collect-key', requireTeam, (req: Request, res: Response) => {
  const team: Team = (req as any).team;
  if (!team.isQualified) return res.status(403).json({ error: 'QUALIFICATION REQUIRED.' });

  const { roomId } = req.body;
  const roomConfig = hauntedHouseConfig.find((r) => r.roomId === Number(roomId));
  if (!roomConfig) return res.status(404).json({ error: 'Room not found.' });

  if (!(team.round2SolvedPuzzles || []).includes(Number(roomId))) {
    return res.status(400).json({ error: 'You must solve the box mechanism before picking up the key.' });
  }

  if (!team.round2CollectedKeys) team.round2CollectedKeys = [];
  if (!team.round2CollectedKeys.includes(roomConfig.keyBox.keyName)) {
    team.round2CollectedKeys.push(roomConfig.keyBox.keyName);
    saveDb();
  }

  return res.json({
    success: true,
    keyName: roomConfig.keyBox.keyName,
    inventory: team.round2CollectedKeys,
    message: `Collected ${roomConfig.keyBox.keyName} into your inventory!`,
  });
});

// 7. Unlock Door and Advance
app.post('/api/team/round2/unlock-door', requireTeam, (req: Request, res: Response) => {
  const team: Team = (req as any).team;
  if (!team.isQualified) return res.status(403).json({ error: 'QUALIFICATION REQUIRED.' });

  const { roomId } = req.body;
  const roomNum = Number(roomId);
  const roomConfig = hauntedHouseConfig.find((r) => r.roomId === roomNum);
  if (!roomConfig) return res.status(404).json({ error: 'Room not found.' });

  if (!(team.round2CollectedKeys || []).includes(roomConfig.keyBox.keyName)) {
    return res.status(400).json({ error: `You need the ${roomConfig.keyBox.keyName} to unlock this door.` });
  }

  if (!team.round2UnlockedDoors) team.round2UnlockedDoors = [];
  if (!team.round2UnlockedDoors.includes(roomNum)) {
    team.round2UnlockedDoors.push(roomNum);
  }

  if (!team.round2CompletedRooms) team.round2CompletedRooms = [];
  if (!team.round2CompletedRooms.includes(roomNum)) {
    team.round2CompletedRooms.push(roomNum);
  }

  const nextRoom = Math.min(4, roomNum + 1);
  if ((team.round2CurrentRoom || 1) < nextRoom) {
    team.round2CurrentRoom = nextRoom;
  }

  const log: ActivityLog = {
    id: `LOG-${Date.now()}`,
    teamId: team.id,
    teamName: team.name,
    type: 'ROUND_ADVANCED',
    message: `Squad "${team.name}" used ${roomConfig.keyBox.keyName} to breach ${roomConfig.doorName}! Access granted to Chamber ${nextRoom}.`,
    timestamp: Date.now(),
    severity: 'INFO',
  };
  db.logs.unshift(log);
  saveDb();

  return res.json({
    success: true,
    message: `DOOR UNLOCKED: The heavy lock clatters to the ground. The portal creaks open!`,
    nextRoomId: nextRoom,
    doorName: roomConfig.doorName,
  });
});

// 8. Collect Final Flag (Victory condition)
app.post('/api/team/round2/collect-flag', requireTeam, (req: Request, res: Response) => {
  const team: Team = (req as any).team;
  if (!team.isQualified) return res.status(403).json({ error: 'QUALIFICATION REQUIRED.' });

  // Room 4 box must be unlocked
  if (!(team.round2SolvedPuzzles || []).includes(4)) {
    return res.status(400).json({ error: 'The obsidian relic casket must be unlocked to reach the final flag.' });
  }

  if (team.round2FlagCollected && team.round2Status === 'COMPLETED') {
    return res.json({
      success: true,
      message: 'THE FINAL FLAG HAS ALREADY BEEN CLAIMED: Championship Victory is sealed!',
      finalScore: team.round2Score || 0,
      timeSpentSeconds: team.round2TimeSpentSeconds || 0,
      completionTime: formatDuration(team.round2TimeSpentSeconds || 0),
    });
  }

  team.round2FlagCollected = true;
  team.round2CurrentRoom = 5;
  team.round2Status = 'COMPLETED';
  team.round2FinishTime = Date.now();
  const victoryBonus = 250;
  team.round2Score = (team.round2Score || 0) + victoryBonus;

  if (team.round2StartTime) {
    team.round2TimeSpentSeconds = Math.round((team.round2FinishTime - team.round2StartTime) / 1000);
  }

  if (!team.round2CompletedRooms) team.round2CompletedRooms = [];
  if (!team.round2CompletedRooms.includes(4)) team.round2CompletedRooms.push(4);

  const log: ActivityLog = {
    id: `LOG-${Date.now()}`,
    teamId: team.id,
    teamName: team.name,
    type: 'ROUND_ADVANCED',
    message: `HAUNTED MANSION CONQUERED: Squad "${team.name}" retrieved THE FINAL FLAG (+${victoryBonus} PTS)! All four chambers conquered!`,
    timestamp: Date.now(),
    severity: 'ALERT',
  };
  db.logs.unshift(log);
  saveDb();

  return res.json({
    success: true,
    message: 'VICTORY ACHIEVED! You have claimed THE FINAL FLAG of Tech Quest!',
    finalScore: team.round2Score,
    timeSpentSeconds: team.round2TimeSpentSeconds || 0,
    completionTime: formatDuration(team.round2TimeSpentSeconds || 0),
  });
});

// 9. Haunted House Hint Request
app.post('/api/team/round2/haunted-hint', requireTeam, (req: Request, res: Response) => {
  const team: Team = (req as any).team;
  if (!team.isQualified) return res.status(403).json({ error: 'QUALIFICATION REQUIRED.' });

  const { roomId, hintType, letterId } = req.body;
  const roomConfig = hauntedHouseConfig.find((r) => r.roomId === Number(roomId));
  if (!roomConfig) return res.status(404).json({ error: 'Room not found.' });

  if (!team.round2HintsRevealed) team.round2HintsRevealed = [];

  let hintText = '';
  let penalty = 10;
  const hintKey = letterId ? letterId : `BOX-${roomId}`;

  if (team.round2HintsRevealed.includes(hintKey)) {
    // Already revealed: free revisit
    if (letterId) {
      const l = roomConfig.letters.find((item) => item.id === letterId);
      hintText = l?.hint || 'Analyze the puzzle details carefully.';
    } else {
      hintText = roomConfig.keyBox.hint;
    }
    return res.json({
      hint: hintText,
      penaltyPoints: 0,
      currentScore: team.round2Score || 0,
      alreadyUnlocked: true,
    });
  }

  if (letterId) {
    const l = roomConfig.letters.find((item) => item.id === letterId);
    if (!l) return res.status(404).json({ error: 'Letter not found.' });
    hintText = l.hint;
    penalty = l.hintPenalty;
  } else {
    hintText = roomConfig.keyBox.hint;
    penalty = 15;
  }

  team.round2HintsRevealed.push(hintKey);
  team.round2HintsUsed = (team.round2HintsUsed || 0) + 1;

  const log: ActivityLog = {
    id: `LOG-${Date.now()}`,
    teamId: team.id,
    teamName: team.name,
    type: 'HINT_USED',
    message: `Squad "${team.name}" consulted the spirits for a hint in ${roomConfig.roomName} (-10 PTS).`,
    timestamp: Date.now(),
    severity: 'WARNING',
  };
  db.logs.unshift(log);
  saveDb();

  return res.json({
    hint: hintText,
    penaltyPoints: 10,
    currentScore: getTeamNetScore(team),
    alreadyUnlocked: false,
  });
});

// Separate Round 2 Leaderboard
app.get('/api/leaderboard/round2', (_req: Request, res: Response) => {
  const allTeams = Object.values(db.teams);
  const leaderboard = computeRound2Leaderboard(allTeams);

  return res.json({
    leaderboard,
    isPublic: db.settings.isLeaderboardPublic,
    totalTeams: leaderboard.length,
  });
});

// Legacy Round 2 Escape Room Endpoints (kept for compatibility)
app.get('/api/team/round2/puzzles', requireTeam, (req: Request, res: Response) => {
  const team: Team = (req as any).team;

  const timeLeft = calculateRemainingTime('ROUND_2');
  const backupPowerPercent = Math.max(5, Math.round((timeLeft / (db.settings.round2DurationMinutes * 60)) * 100));

  const puzzles = db.escapeRoomPuzzles.map((p) => {
    const isSolved = Boolean(team.unlockedCodesRound2[p.index]);
    let status: 'LOCKED' | 'ACTIVE' | 'RESOLVED' = 'LOCKED';

    if (isSolved) {
      status = 'RESOLVED';
    } else if (p.index === 1 || Boolean(team.unlockedCodesRound2[p.index - 1])) {
      status = 'ACTIVE';
    }

    return {
      index: p.index,
      systemName: p.systemName,
      title: p.title,
      status,
      question: status !== 'LOCKED' ? p.question : 'SECURITY LOCK ENGAGED: Requires preceding system authorization key.',
      diagram: status !== 'LOCKED' ? p.diagram : undefined,
      codeSnippet: status !== 'LOCKED' ? p.codeSnippet : undefined,
      hint: status !== 'LOCKED' ? p.hint : undefined,
      unlockedCode: isSolved ? p.rewardCode : undefined,
    };
  });

  const isControlPanelReady = Object.keys(team.unlockedCodesRound2).length === 5;
  const isSystemRestored = team.finishTimeRound2 !== undefined;

  return res.json({
    story:
      'A smart manufacturing plant has gone offline. The control system is locked and backup power is failing. Your team has 60 minutes to restore the system.',
    backupPowerPercent,
    timeRemaining: timeLeft,
    puzzles,
    collectedCodes: team.unlockedCodesRound2,
    isControlPanelReady,
    isSystemRestored,
  });
});

app.post('/api/team/round2/submit', requireTeam, (req: Request, res: Response) => {
  const team: Team = (req as any).team;
  const { puzzleIndex, answer } = req.body;

  const puzzle = db.escapeRoomPuzzles.find((p) => p.index === puzzleIndex);
  if (!puzzle) {
    return res.status(404).json({ error: 'System puzzle node not found.' });
  }

  if (puzzleIndex > 1 && !team.unlockedCodesRound2[puzzleIndex - 1]) {
    return res.status(403).json({ error: 'SECURITY INTERLOCK: Preceding system must be decrypted first.' });
  }

  team.attemptsCount += 1;
  const cleanSubmitted = normalizeAnswer(String(answer));
  const cleanExpected = normalizeAnswer(puzzle.correctAnswer);
  const isCorrect = cleanSubmitted === cleanExpected;

  if (isCorrect) {
    team.unlockedCodesRound2[puzzleIndex] = puzzle.rewardCode;
    team.score += 100;
    saveDb();
    const isAllSolved = Object.keys(team.unlockedCodesRound2).length === 5;
    return res.json({
      isCorrect: true,
      message: `SYSTEM SUBSYSTEM RESTORED: Master Key [${puzzle.rewardCode}] registered in memory buffer.`,
      rewardCode: puzzle.rewardCode,
      nextPuzzleUnlocked: true,
      isAllSolved,
    });
  } else {
    saveDb();
    return res.json({
      isCorrect: false,
      message: 'ACCESS DENIED: Critical parity breach. Logic sequence rejected.',
      rewardCode: undefined,
      nextPuzzleUnlocked: false,
      isAllSolved: false,
    });
  }
});

app.post('/api/team/round2/final-control', requireTeam, (req: Request, res: Response) => {
  const team: Team = (req as any).team;
  const { codes } = req.body;

  if (!Array.isArray(codes) || codes.length !== 5) {
    return res.status(400).json({ error: 'All 5 system unlock codes must be provided in sequence.' });
  }

  const expectedCodes = db.escapeRoomPuzzles.map((p) => p.rewardCode);
  const isValid = codes.every((code, idx) => normalizeAnswer(code) === normalizeAnswer(expectedCodes[idx]));

  if (isValid) {
    team.finishTimeRound2 = Date.now();
    team.score += 250;
    team.status = 'COMPLETED';
    saveDb();
    return res.json({
      success: true,
      message: 'SYSTEM RESTORED: Main reactor online. Grid interlocks synchronized.',
      finalScore: team.score,
      completionTime: formatDuration(team.totalTimeSpentSeconds),
    });
  } else {
    return res.status(400).json({
      success: false,
      message: 'ACCESS DENIED: Sequence mismatch detected across central bus lines.',
    });
  }
});

// Final Vault Endpoints
app.get('/api/team/vault/challenge', requireTeam, (req: Request, res: Response) => {
  const team: Team = (req as any).team;

  const timeLeft = calculateRemainingTime('FINAL_VAULT');

  return res.json({
    isQualified: team.isQualified,
    isUnlocked: team.isQualified,
    challenge: {
      title: db.finalVaultChallenge.title,
      question: db.finalVaultChallenge.question,
      systemContext: db.finalVaultChallenge.systemContext,
      points: db.finalVaultChallenge.points,
      diagramAscii: db.finalVaultChallenge.diagramAscii,
      codeSnippet: db.finalVaultChallenge.codeSnippet,
      hint: db.finalVaultChallenge.hint,
    },
    isCracked: team.finishTimeVault !== undefined,
    vaultTimeLeft: timeLeft,
  });
});

app.post('/api/team/vault/submit', requireTeam, (req: Request, res: Response) => {
  const team: Team = (req as any).team;
  const { answer } = req.body;

  if (!team.isQualified) {
    return res.status(403).json({ error: 'MISSION TERMINATED: Authorization limited to qualified squads.' });
  }

  const cleanSubmitted = normalizeAnswer(String(answer));
  const cleanExpected = normalizeAnswer(db.finalVaultChallenge.correctAnswer);
  const rawNumOnly = String(answer || '').replace(/[^0-9]/g, '');
  const expNumOnly = String(db.finalVaultChallenge.correctAnswer).replace(/[^0-9]/g, '');

  const isCorrect = cleanSubmitted === cleanExpected || (rawNumOnly.length > 0 && rawNumOnly === expNumOnly);

  if (isCorrect) {
    team.finishTimeVault = Date.now();
    team.score += db.finalVaultChallenge.points;
    team.status = 'COMPLETED';

    const log: ActivityLog = {
      id: `LOG-${Date.now()}`,
      teamId: team.id,
      teamName: team.name,
      type: 'ROUND_ADVANCED',
      message: `VAULT CRACKED! Team "${team.name}" breached the Final Vault! Champion contender.`,
      timestamp: Date.now(),
      severity: 'ALERT',
    };
    db.logs.unshift(log);
    saveDb();

    return res.json({
      isCorrect: true,
      message: 'VAULT CRACKED: Master Core Disengaged. Championship threshold achieved!',
      finalScore: team.score,
      isWinner: true,
    });
  } else {
    return res.json({
      isCorrect: false,
      message: 'ACCESS DENIED: Core algorithm defense intact. Recalculate parameters.',
      finalScore: team.score,
      isWinner: false,
    });
  }
});

// Anti-Cheat Logging - tab switches and window focus tracking across full session
const teamLastTabSwitchTimes: Record<string, { lastSwitch: number; lastReturn: number }> = {};

app.post('/api/team/anti-cheat/alert', requireTeam, (req: Request, res: Response) => {
  const team: Team = (req as any).team;
  if (!team) {
    return res.status(401).json({ error: 'Team session required.' });
  }

  const { eventType, details } = req.body;
  const now = Date.now();
  if (!teamLastTabSwitchTimes[team.id]) {
    teamLastTabSwitchTimes[team.id] = { lastSwitch: 0, lastReturn: 0 };
  }

  const isReturn = eventType === 'TAB_RETURN' || eventType === 'RETURN' || eventType === 'WINDOW_FOCUS';
  const isSwitch =
    eventType === 'TAB_SWITCH' ||
    eventType === 'TAB_SWITCH_BLUR' ||
    eventType === 'BLUR' ||
    eventType === 'WINDOW_LOST_FOCUS' ||
    eventType === 'Tab Switched / Window Lost Focus';

  if (!isReturn && !isSwitch) {
    return res.json({ logged: false, reason: 'Unrecognized event type' });
  }

  // Deduplicate rapid firing (e.g. both blur and visibilitychange firing on same focus loss)
  if (isSwitch) {
    if (now - teamLastTabSwitchTimes[team.id].lastSwitch < 1500) {
      return res.json({ logged: false, reason: 'Throttled duplicate tab-switch event' });
    }
    teamLastTabSwitchTimes[team.id].lastSwitch = now;
  } else if (isReturn) {
    if (now - teamLastTabSwitchTimes[team.id].lastReturn < 1500) {
      return res.json({ logged: false, reason: 'Throttled duplicate return event' });
    }
    teamLastTabSwitchTimes[team.id].lastReturn = now;
  }

  // Authoritatively derive active round number from server session
  const roundNumber = (isTeamRound2Cleared(team) || team.round2Status === 'COMPLETED' || team.isQualified || isTeamRound1Cleared(team) || (team.passwordStatus === 'COMPLETED')) ? 2 : 1;
  const eventLabel = isReturn ? 'Returned to Game Tab' : 'Tab Switched / Window Lost Focus';
  const isoTimestamp = new Date(now).toISOString();

  const log: ActivityLog = {
    id: `LOG-${now}-${Math.random().toString(36).substring(2, 6)}`,
    teamId: team.id,
    teamName: team.name,
    type: 'CHEAT_ALERT',
    message: `[SECURITY AUDIT] Team: "${team.name}" | Team ID: ${team.id} | Round: ${roundNumber} | Event: ${eventLabel} | Timestamp: ${isoTimestamp}`,
    timestamp: now,
    severity: isReturn ? 'INFO' : 'ALERT',
  };

  db.logs.unshift(log);
  if (db.logs.length > 1000) {
    db.logs = db.logs.slice(0, 1000);
  }
  saveDb();

  return res.json({
    logged: true,
    teamId: team.id,
    teamName: team.name,
    roundNumber,
    eventType: eventLabel,
    timestamp: isoTimestamp,
  });
});

// ==========================================
// ADMIN DASHBOARD ROUTES
// ==========================================
app.get('/api/admin/overview', requireAdmin, (_req: Request, res: Response) => {
  const allTeams = Object.values(db.teams);
  const activeTeams = allTeams.filter((t) => t.status === 'ACTIVE').length;
  const completedTeams = allTeams.filter((t) => t.status === 'COMPLETED').length;
  const qualifiedTeams = allTeams.filter((t) => t.isQualified).length;

  return res.json({
    totalTeams: allTeams.length,
    activeTeams,
    completedTeams,
    qualifiedTeams,
    settings: db.settings,
    serverTime: Date.now(),
    round1TimeLeft: calculateRemainingTime('ROUND_1'),
    round2TimeLeft: calculateRemainingTime('ROUND_2'),
    vaultTimeLeft: calculateRemainingTime('FINAL_VAULT'),
  });
});

app.get('/api/admin/teams', requireAdmin, (_req: Request, res: Response) => {
  return res.json({ teams: Object.values(db.teams).map(sanitizeTeamForClient) });
});

app.post('/api/admin/teams/set-color', requireAdmin, (req: Request, res: Response) => {
  const { teamId, color } = req.body;
  if (!teamId || !color) {
    return res.status(400).json({ error: 'Team ID and color are required.' });
  }
  const normColor = String(color).toUpperCase();
  if (normColor !== 'BLUE' && normColor !== 'RED' && normColor !== 'GREEN') {
    return res.status(400).json({ error: 'Color must be BLUE, RED, or GREEN.' });
  }
  const team = db.teams[teamId];
  if (!team) {
    return res.status(404).json({ error: 'Team not found.' });
  }
  team.color = normColor as 'BLUE' | 'RED' | 'GREEN';
  team.assignedSet = normColor === 'BLUE' ? 'SET_1' : normColor === 'RED' ? 'SET_2' : 'SET_3';
  saveDb();
  return res.json({ success: true, team: sanitizeTeamForClient(team) });
});

app.post('/api/admin/teams/qualify', requireAdmin, (req: Request, res: Response) => {
  const { qualifyTopCount, teamId, isQualified } = req.body;

  if (teamId) {
    if (db.teams[teamId]) {
      db.teams[teamId].isQualified = Boolean(isQualified);
      db.teams[teamId].qualified = Boolean(isQualified);
      db.teams[teamId].status = isQualified ? 'QUALIFIED' : 'ACTIVE';
    }
  } else if (typeof qualifyTopCount === 'number') {
    db.settings.qualifyTopCount = qualifyTopCount;
    const rankedR1 = computeRound1Leaderboard(Object.values(db.teams));
    const qualifiedTeamIds = new Set(rankedR1.slice(0, qualifyTopCount).map((entry) => entry.teamId));

    Object.values(db.teams).forEach((t) => {
      const isQual = qualifiedTeamIds.has(t.id);
      t.isQualified = isQual;
      t.qualified = isQual;
      t.status = isQual ? 'QUALIFIED' : 'ACTIVE';
    });
  }

  saveDb();
  const qualifiedCount = Object.values(db.teams).filter((t) => t.isQualified).length;
  return res.json({ success: true, qualifiedCount });
});

app.post('/api/admin/teams/disqualify', requireAdmin, (req: Request, res: Response) => {
  const { teamId, reason } = req.body;
  if (!db.teams[teamId]) {
    return res.status(404).json({ error: 'Team not found.' });
  }

  db.teams[teamId].status = 'DISQUALIFIED';
  db.teams[teamId].disqualifiedReason = reason || 'Violation of technical competition protocol';

  const log: ActivityLog = {
    id: `LOG-${Date.now()}`,
    teamId,
    teamName: db.teams[teamId].name,
    type: 'ADMIN_ACTION',
    message: `Team "${db.teams[teamId].name}" DISQUALIFIED. Reason: ${reason}`,
    timestamp: Date.now(),
    severity: 'ALERT',
  };
  db.logs.unshift(log);
  saveDb();

  return res.json({ success: true });
});

app.post('/api/admin/teams/reset', requireAdmin, (req: Request, res: Response) => {
  const { teamId } = req.body;
  if (!db.teams[teamId]) {
    return res.status(404).json({ error: 'Team not found.' });
  }

  const team = db.teams[teamId];
  team.status = 'ACTIVE';
  team.score = 0;
  team.penalties = 0;
  team.hintsUsed = 0;
  team.attemptsCount = 0;
  team.completedChallenges = [];
  team.unlockedCodesRound2 = {};
  team.selectedDifficulties = {};
  delete team.finishTimeRound1;
  delete team.finishTimeRound2;
  delete team.finishTimeVault;

  saveDb();
  return res.json({ success: true });
});

app.post('/api/admin/teams/penalty', requireAdmin, (req: Request, res: Response) => {
  const { teamId, penaltyPoints, reason } = req.body;
  if (!db.teams[teamId]) {
    return res.status(404).json({ error: 'Team not found.' });
  }

  db.teams[teamId].penalties += Number(penaltyPoints || 0);

  const log: ActivityLog = {
    id: `LOG-${Date.now()}`,
    teamId,
    teamName: db.teams[teamId].name,
    type: 'ADMIN_ACTION',
    message: `Manual penalty of ${penaltyPoints} points applied to "${db.teams[teamId].name}". Reason: ${reason || 'Adjudication'}`,
    timestamp: Date.now(),
    severity: 'WARNING',
  };
  db.logs.unshift(log);
  saveDb();

  return res.json({ success: true, newScore: db.teams[teamId].score - db.teams[teamId].penalties });
});

app.get('/api/admin/challenges', requireAdmin, (_req: Request, res: Response) => {
  return res.json({ challenges: Object.values(db.challenges).sort((a, b) => a.order - b.order) });
});

app.post('/api/admin/challenges', requireAdmin, (req: Request, res: Response) => {
  const challenge: Challenge = req.body;
  if (!challenge.id) {
    challenge.id = `CH-${Date.now()}`;
  }
  db.challenges[challenge.id] = challenge;
  saveDb();
  return res.json({ challenge });
});

app.delete('/api/admin/challenges/:id', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  if (db.challenges[id]) {
    delete db.challenges[id];
    saveDb();
  }
  return res.json({ success: true });
});

app.post('/api/admin/event/control', requireAdmin, (req: Request, res: Response) => {
  const { action, round } = req.body;

  if (action === 'START') {
    db.settings.competitionState = 'ACTIVE';
    db.settings.round1StartedAt = Date.now();
  } else if (action === 'PAUSE') {
    db.settings.competitionState = 'PAUSED';
  } else if (action === 'RESUME') {
    db.settings.competitionState = 'ACTIVE';
  } else if (action === 'END') {
    db.settings.competitionState = 'COMPLETED';
  } else if (action === 'SET_ROUND' && round) {
    db.settings.currentActiveRound = round as RoundId;
    if (round === 'ROUND_2' && !db.settings.round2StartedAt) {
      db.settings.round2StartedAt = Date.now();
    } else if (round === 'FINAL_VAULT' && !db.settings.vaultStartedAt) {
      db.settings.vaultStartedAt = Date.now();
    }
  }

  saveDb();
  return res.json({ success: true, settings: db.settings });
});

app.post('/api/admin/event/settings', requireAdmin, (req: Request, res: Response) => {
  db.settings = { ...db.settings, ...req.body };
  saveDb();
  return res.json({ success: true, settings: db.settings });
});

// Admin Round 2 Management Endpoints
app.get('/api/admin/round2/overview', requireAdmin, (_req: Request, res: Response) => {
  const allTeams = Object.values(db.teams);

  const teamSummaries = allTeams.map((t) => ({
    id: t.id,
    name: t.name,
    department: t.department,
    college: t.college,
    leaderName: t.leaderName,
    leaderEmail: t.leaderEmail,
    // Round 1 metrics (preserved)
    r1Score: getTeamNetScore(t),
    r1CompletedCount: t.completedChallenges.length,
    r1PasswordStatus: t.passwordStatus || 'LOCKED',
    r1TimeSpentSeconds: t.totalTimeSpentSeconds,
    // Qualification
    isQualified: t.isQualified,
    disqualifiedReason: t.disqualifiedReason,
    status: t.status,
    // Round 2 metrics
    r2Score: getRound2NetScore(t),
    r2RawScore: t.round2Score || 0,
    r2Penalties: (t.round2HintsUsed || 0) * 10 + Math.floor((t.round2FailedAttempts !== undefined ? t.round2FailedAttempts : (t.failedAttempts || 0)) / 3) * 15,
    r2CurrentRoom: isTeamRoom4Cleared(t) ? 5 : getGenuineCurrentRoom(t),
    r2CompletedRooms: getVerifiedCompletedRooms(t),
    r2SolvedPuzzles: t.round2SolvedPuzzles || [],
    r2HintsUsed: t.round2HintsUsed || 0,
    r2StartTime: t.round2StartTime,
    r2FinishTime: t.round2FinishTime,
    r2TimeSpentSeconds: t.round2TimeSpentSeconds || 0,
    r2Status: isTeamRoom4Cleared(t)
      ? 'COMPLETED'
      : (t.round2Status === 'NOT_STARTED' && getVerifiedCompletedRooms(t).length === 0 ? 'NOT_STARTED' : 'IN_PROGRESS'),
  }));

  return res.json({
    teams: teamSummaries,
    rooms: db.escapeRooms || defaultEscapeRooms,
    settings: db.settings,
    totalTeams: allTeams.length,
    qualifiedCount: allTeams.filter((t) => t.isQualified).length,
    round2CompletedCount: allTeams.filter((t) => isTeamRoom4Cleared(t)).length,
    round2ActiveCount: allTeams.filter((t) => !isTeamRoom4Cleared(t) && t.round2Status === 'IN_PROGRESS').length,
  });
});

app.post('/api/admin/round2/update-room', requireAdmin, (req: Request, res: Response) => {
  const {
    roomId,
    roomName,
    systemContext,
    points,
    puzzleTitle,
    puzzleQuestion,
    puzzleDiagram,
    puzzleCodeSnippet,
    correctAnswer,
    hint,
    hintPenaltyPoints,
    physicalLocationClue,
    physicalVerificationCode,
  } = req.body;

  const room = (db.escapeRooms || defaultEscapeRooms).find((r) => r.roomId === Number(roomId));
  if (!room) {
    return res.status(404).json({ error: 'Room not found.' });
  }

  if (roomName !== undefined) room.roomName = String(roomName);
  if (systemContext !== undefined) room.systemContext = String(systemContext);
  if (points !== undefined) room.points = Number(points);
  if (puzzleTitle !== undefined) room.puzzleTitle = String(puzzleTitle);
  if (puzzleQuestion !== undefined) room.puzzleQuestion = String(puzzleQuestion);
  if (puzzleDiagram !== undefined) room.puzzleDiagram = puzzleDiagram;
  if (puzzleCodeSnippet !== undefined) room.puzzleCodeSnippet = puzzleCodeSnippet;
  if (correctAnswer !== undefined) room.correctAnswer = String(correctAnswer).trim();
  if (hint !== undefined) room.hint = String(hint);
  if (hintPenaltyPoints !== undefined) room.hintPenaltyPoints = Number(hintPenaltyPoints);
  if (physicalLocationClue !== undefined) room.physicalLocationClue = String(physicalLocationClue);
  if (physicalVerificationCode !== undefined) room.physicalVerificationCode = String(physicalVerificationCode).trim();

  saveDb();
  return res.json({ success: true, room });
});

app.post('/api/admin/round2/toggle-qualify', requireAdmin, (req: Request, res: Response) => {
  const { teamId, isQualified } = req.body;
  if (!db.teams[teamId]) {
    return res.status(404).json({ error: 'Team not found.' });
  }

  db.teams[teamId].isQualified = Boolean(isQualified);
  db.teams[teamId].qualified = Boolean(isQualified);
  db.teams[teamId].status = isQualified ? 'QUALIFIED' : 'ACTIVE';
  saveDb();

  return res.json({
    success: true,
    teamId,
    isQualified: db.teams[teamId].isQualified,
    qualified: db.teams[teamId].isQualified,
    qualifiedCount: Object.values(db.teams).filter((t) => t.isQualified).length,
  });
});

app.post('/api/admin/round2/qualification-criteria', requireAdmin, (req: Request, res: Response) => {
  const { criteriaType, topCount, minScore } = req.body;
  const allTeams = Object.values(db.teams);

  if (criteriaType === 'TOP_N') {
    const n = Math.max(1, Number(topCount) || 10);
    db.settings.qualifyTopCount = n;
    const rankedR1 = computeRound1Leaderboard(Object.values(db.teams));
    const qualifiedTeamIds = new Set(rankedR1.slice(0, n).map((entry) => entry.teamId));

    Object.values(db.teams).forEach((t) => {
      const isQual = qualifiedTeamIds.has(t.id);
      t.isQualified = isQual;
      t.qualified = isQual;
      t.status = isQual ? 'QUALIFIED' : 'ACTIVE';
    });
  } else if (criteriaType === 'MIN_SCORE') {
    const threshold = Number(minScore) || 200;
    allTeams.forEach((t) => {
      const net = t.score + t.timeBonus - t.penalties;
      t.isQualified = net >= threshold;
      t.qualified = t.isQualified;
      t.status = t.isQualified ? 'QUALIFIED' : 'ACTIVE';
    });
  } else if (criteriaType === 'ALL_R1_COMPLETE') {
    allTeams.forEach((t) => {
      t.isQualified = t.completedChallenges.length >= 5 && t.passwordStatus === 'COMPLETED';
      t.qualified = t.isQualified;
      t.status = t.isQualified ? 'QUALIFIED' : 'ACTIVE';
    });
  }

  saveDb();
  const qualifiedCount = allTeams.filter((t) => t.isQualified).length;
  return res.json({ success: true, qualifiedCount });
});

app.post('/api/admin/round2/reset-team', requireAdmin, (req: Request, res: Response) => {
  const { teamId } = req.body;
  if (!db.teams[teamId]) {
    return res.status(404).json({ error: 'Team not found.' });
  }

  const team = db.teams[teamId];
  // CRITICAL: Reset ONLY Round 2 progress, completely preserving Round 1 scores & achievements!
  team.round2Score = 0;
  team.round2CurrentRoom = 1;
  team.round2CompletedRooms = [];
  team.round2SolvedPuzzles = [];
  team.round2VerifiedCodes = {};
  team.round2HintsUsed = 0;
  team.round2RoomHintsUsed = {};
  delete team.round2StartTime;
  delete team.round2FinishTime;
  team.round2TimeSpentSeconds = 0;
  team.round2Status = 'NOT_STARTED';
  team.unlockedCodesRound2 = {};
  delete team.finishTimeRound2;

  const log: ActivityLog = {
    id: `LOG-${Date.now()}`,
    teamId: team.id,
    teamName: team.name,
    type: 'ADMIN_ACTION',
    message: `Organizer reset Round 2 Escape Room progress for squad "${team.name}". Round 1 results preserved.`,
    timestamp: Date.now(),
    severity: 'INFO',
  };
  db.logs.unshift(log);
  saveDb();

  return res.json({ success: true, message: `Round 2 progress reset for team ${team.name}. Round 1 remained intact.` });
});

app.post('/api/admin/round2/timer', requireAdmin, (req: Request, res: Response) => {
  const { durationMinutes, action } = req.body;

  if (typeof durationMinutes === 'number' && durationMinutes > 0) {
    db.settings.round2DurationMinutes = durationMinutes;
  }

  if (action === 'START') {
    db.settings.round2StartedAt = Date.now();
  } else if (action === 'RESET') {
    db.settings.round2StartedAt = undefined;
  }

  saveDb();
  return res.json({
    success: true,
    round2DurationMinutes: db.settings.round2DurationMinutes,
    round2StartedAt: db.settings.round2StartedAt,
    timeLeft: calculateRemainingTime('ROUND_2'),
  });
});

app.get('/api/admin/logs', requireAdmin, (_req: Request, res: Response) => {
  return res.json({ logs: db.logs });
});

app.post('/api/admin/demo-seed', requireAdmin, (_req: Request, res: Response) => {
  db.teams = { ...defaultDemoTeams };
  db.challenges = { ...defaultInitialChallenges };
  db.escapeRoomPuzzles = [...defaultPuzzles];
  db.finalVaultChallenge = { ...defaultFinalVault };
  db.settings = { ...defaultSettings };
  saveDb();
  return res.json({ success: true, message: 'Competition state re-seeded with realistic engineering demo data.' });
});

app.post('/api/admin/demo-reset', requireAdmin, (_req: Request, res: Response) => {
  db.teams = { ...defaultDemoTeams };
  db.submissions = [];
  db.settings = { ...defaultSettings };
  saveDb();
  return res.json({ success: true, message: 'All live telemetry reset to demo baseline.' });
});

// ==========================================
// VITE INTEGRATION
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    // Serve production build
    const distPath = path.join(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  } else {
    // Vite middleware for dev
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TECH QUEST] Master server active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
