// ============================================================================
// TECH QUEST: ROUND 2 — AUTHORITATIVE ANSWER VERIFICATION & SCORING MODULE
// ============================================================================
// Authoritative answers for all 3 Question Sets:
// Set 1: Blue Team | Set 2: Red Team | Set 3: Green Team
// ============================================================================

import {
  ROUND2_FIELD_GUIDE_HINTS,
  type QuestionSetId,
} from './questionSets.ts';

export type RoomStep = 'LETTER_1' | 'LETTER_2' | 'PHYSICAL_KEY' | 'TECH';

export interface VerifyResult {
  success: boolean;
  message: string;
  revealedClue?: string;
  pointsAwarded?: number;
  newNetScore?: number;
  cumulativeErrors?: number;
  errorWarning?: boolean;
}

export interface RoomAnswersConfig {
  roomId: number;
  letter1Answer: string;
  letter2Answer: string;
  physicalKey: string;
  techAnswer: string;
  letter1RevealClue: string;
  letter2RevealClue: string;
  hints: {
    letter1: string;
    letter2: string;
    physicalKey?: string;
    tech: string;
  };
}

export const AUTHORITATIVE_ROOMS_BY_SET: Record<number, Record<number, RoomAnswersConfig>> = {
  // --------------------------------------------------------------------------
  // SET 1: BLUE TEAM
  // --------------------------------------------------------------------------
  1: {
    1: {
      roomId: 1,
      // Handshakes: 7 people => 7*6/2 = 21
      letter1Answer: '21',
      letter1RevealClue: 'Look beneath the loose red brick on the cell floor.',
      // Ages: A = 2B, A+B=72 => 3B=72 => B=24
      letter2Answer: '24',
      letter2RevealClue: 'The old television screen still hums in the corner. Look behind where it sits.',
      physicalKey: 'DOOR-KEY-91',
      // Prime series: 4, 9, 25, 49, 121, 169, 289, ? => 19² = 361
      techAnswer: '361',
      hints: {
        letter1: ROUND2_FIELD_GUIDE_HINTS[1].letter1,
        letter2: ROUND2_FIELD_GUIDE_HINTS[1].letter2,
        physicalKey: 'Locate Lab Bench 1 in the venue room to inspect the keycard tag.',
        tech: ROUND2_FIELD_GUIDE_HINTS[1].tech,
      },
    },
    2: {
      roomId: 2,
      // Father 50, son 14 => 50+x = 2*(14+x) => x = 22
      letter1Answer: '22',
      letter1RevealClue: 'Signals rest where rubber meets steel on the oscilloscope workbench.',
      // Riddle => M
      letter2Answer: 'M',
      letter2RevealClue: 'The clock keeps count, but not the hours. Check the wall recess behind its face on the west wall.',
      physicalKey: 'DECODER-CHIP-42',
      // C code output: "1 0"
      techAnswer: '1 0',
      hints: {
        letter1: ROUND2_FIELD_GUIDE_HINTS[2].letter1,
        letter2: ROUND2_FIELD_GUIDE_HINTS[2].letter2,
        physicalKey: 'Locate Scope Station 2 near the oscilloscope rack in the venue.',
        tech: ROUND2_FIELD_GUIDE_HINTS[2].tech,
      },
    },
    3: {
      roomId: 3,
      // Two fathers & two sons went fishing: 3 (Grandfather, father, son)
      letter1Answer: '3',
      letter1RevealClue: 'Cold air breathes where the blades stand still on the east ventilation fan.',
      // Bridge crossing: 1, 3, 6, 11 min => 3 + 1 + 11 + 3 + 3 = 21 minutes
      letter2Answer: '21 minutes',
      letter2RevealClue: 'Climb above the pipes where the rope secures the overhead ceiling hatch.',
      physicalKey: 'SYSTEM-RELAY-88',
      // Weighted cipher: CALIFORNIA => 128
      techAnswer: '128',
      hints: {
        letter1: ROUND2_FIELD_GUIDE_HINTS[3].letter1,
        letter2: ROUND2_FIELD_GUIDE_HINTS[3].letter2,
        physicalKey: 'Locate 3D Printer Enclosure on acrylic safety visor at Workbench 03 in the venue.',
        tech: ROUND2_FIELD_GUIDE_HINTS[3].tech,
      },
    },
    4: {
      roomId: 4,
      // Hat deduction: FRONT BLACK
      letter1Answer: 'FRONT BLACK',
      letter1RevealClue: 'Look inside the red emergency safety cabinet mounted on the north wall.',
      // Stacked boxes: F
      letter2Answer: 'F',
      letter2RevealClue: 'Enter your final calculation into the central SCADA console terminal in the vault core.',
      physicalKey: 'VAULT-FLAG-777',
      // Stack ops: Sum 39 - 42 = -3 => 1111 1111 1111 1101
      techAnswer: '1111 1111 1111 1101',
      hints: {
        letter1: ROUND2_FIELD_GUIDE_HINTS[4].letter1,
        letter2: ROUND2_FIELD_GUIDE_HINTS[4].letter2,
        physicalKey: 'Obtain Master Physical Authorization Key from Chief Proctor at Vault Control Desk.',
        tech: ROUND2_FIELD_GUIDE_HINTS[4].tech,
      },
    },
  },

  // --------------------------------------------------------------------------
  // SET 2: RED TEAM
  // --------------------------------------------------------------------------
  2: {
    1: {
      roomId: 1,
      // Handshakes: 8 people => 8*7/2 = 28
      letter1Answer: '28',
      letter1RevealClue: 'Look beneath the loose red brick on the cell floor.',
      // Ages: A = 2B, A+B=66 => 3B=66 => B=22
      letter2Answer: '22',
      letter2RevealClue: 'The old television screen still hums in the corner. Look behind where it sits.',
      physicalKey: 'DOOR-KEY-92',
      // Prime series: 25, 49, 121, 169, 289, 361, 529, ? => 29² = 841
      techAnswer: '841',
      hints: {
        letter1: ROUND2_FIELD_GUIDE_HINTS[1].letter1,
        letter2: ROUND2_FIELD_GUIDE_HINTS[1].letter2,
        physicalKey: 'Locate Station 2 in the venue room to inspect the keycard tag.',
        tech: ROUND2_FIELD_GUIDE_HINTS[1].tech,
      },
    },
    2: {
      roomId: 2,
      // Father 36, son 12 => 36+x = 2*(12+x) => x = 12
      letter1Answer: '12',
      letter1RevealClue: 'Signals rest where rubber meets steel on the oscilloscope workbench.',
      // Riddle => M
      letter2Answer: 'M',
      letter2RevealClue: 'The clock keeps count, but not the hours. Check the wall recess behind its face on the west wall.',
      physicalKey: 'DECODER-CHIP-43',
      // C code output: "6 -1 0 1"
      techAnswer: '6 -1 0 1',
      hints: {
        letter1: ROUND2_FIELD_GUIDE_HINTS[2].letter1,
        letter2: ROUND2_FIELD_GUIDE_HINTS[2].letter2,
        physicalKey: 'Locate Scope Station 3 near the oscilloscope rack in the venue.',
        tech: ROUND2_FIELD_GUIDE_HINTS[2].tech,
      },
    },
    3: {
      roomId: 3,
      // Two fathers & two sons went fishing: 3 (Grandfather, father, son)
      letter1Answer: '3',
      letter1RevealClue: 'Cold air breathes where the blades stand still on the east ventilation fan.',
      // Bridge crossing: 2, 4, 7, 12 min => 4 + 2 + 12 + 4 + 4 = 26 minutes
      letter2Answer: '26 minutes',
      letter2RevealClue: 'Climb above the pipes where the rope secures the overhead ceiling hatch.',
      physicalKey: 'SYSTEM-RELAY-89',
      // Weighted cipher: TEXAS => 75
      techAnswer: '75',
      hints: {
        letter1: ROUND2_FIELD_GUIDE_HINTS[3].letter1,
        letter2: ROUND2_FIELD_GUIDE_HINTS[3].letter2,
        physicalKey: 'Locate 3D Printer Enclosure at Workbench 02 in the venue.',
        tech: ROUND2_FIELD_GUIDE_HINTS[3].tech,
      },
    },
    4: {
      roomId: 4,
      // Hat deduction: FRONT BLACK
      letter1Answer: 'FRONT BLACK',
      letter1RevealClue: 'Look inside the red emergency safety cabinet mounted on the north wall.',
      // Stacked boxes: F
      letter2Answer: 'F',
      letter2RevealClue: 'Enter your final calculation into the central SCADA console terminal in the vault core.',
      physicalKey: 'VAULT-FLAG-778',
      // Stack ops: Sum 47 - 54 = -7 => 1111 1111 1111 1001
      techAnswer: '1111 1111 1111 1001',
      hints: {
        letter1: ROUND2_FIELD_GUIDE_HINTS[4].letter1,
        letter2: ROUND2_FIELD_GUIDE_HINTS[4].letter2,
        physicalKey: 'Obtain Keycard Red from Chief Proctor in the venue.',
        tech: ROUND2_FIELD_GUIDE_HINTS[4].tech,
      },
    },
  },

  // --------------------------------------------------------------------------
  // SET 3: GREEN TEAM
  // --------------------------------------------------------------------------
  3: {
    1: {
      roomId: 1,
      // Handshakes: 6 people => 6*5/2 = 15
      letter1Answer: '15',
      letter1RevealClue: 'Look beneath the loose red brick on the cell floor.',
      // Ages: A = 2B, A+B=54 => 3B=54 => B=18
      letter2Answer: '18',
      letter2RevealClue: 'The old television screen still hums in the corner. Look behind where it sits.',
      physicalKey: 'DOOR-KEY-93',
      // Prime series: 9, 25, 49, 121, 169, 289, 361, ? => 23² = 529
      techAnswer: '529',
      hints: {
        letter1: ROUND2_FIELD_GUIDE_HINTS[1].letter1,
        letter2: ROUND2_FIELD_GUIDE_HINTS[1].letter2,
        physicalKey: 'Locate Station 3 in the venue room to inspect the keycard tag.',
        tech: ROUND2_FIELD_GUIDE_HINTS[1].tech,
      },
    },
    2: {
      roomId: 2,
      // Father 40, son 10 => 40+x = 2*(10+x) => x = 20
      letter1Answer: '20',
      letter1RevealClue: 'Signals rest where rubber meets steel on the oscilloscope workbench.',
      // Riddle => M
      letter2Answer: 'M',
      letter2RevealClue: 'The clock keeps count, but not the hours. Check the wall recess behind its face on the west wall.',
      physicalKey: 'DECODER-CHIP-44',
      // C code output: "4 -1 1 1"
      techAnswer: '4 -1 1 1',
      hints: {
        letter1: ROUND2_FIELD_GUIDE_HINTS[2].letter1,
        letter2: ROUND2_FIELD_GUIDE_HINTS[2].letter2,
        physicalKey: 'Locate Scope Station 4 near the oscilloscope rack in the venue.',
        tech: ROUND2_FIELD_GUIDE_HINTS[2].tech,
      },
    },
    3: {
      roomId: 3,
      // Two fathers & two sons went fishing: 3 (Grandfather, father, son)
      letter1Answer: '3',
      letter1RevealClue: 'Cold air breathes where the blades stand still on the east ventilation fan.',
      // Bridge crossing: 1, 2, 5, 10 min => 2 + 1 + 10 + 2 + 2 = 17 minutes
      letter2Answer: '17 minutes',
      letter2RevealClue: 'Climb above the pipes where the rope secures the overhead ceiling hatch.',
      physicalKey: 'SYSTEM-RELAY-90',
      // Weighted cipher: NEWJERSEY => 162
      techAnswer: '162',
      hints: {
        letter1: ROUND2_FIELD_GUIDE_HINTS[3].letter1,
        letter2: ROUND2_FIELD_GUIDE_HINTS[3].letter2,
        physicalKey: 'Locate 3D Printer Enclosure at Workbench 01 in the venue.',
        tech: ROUND2_FIELD_GUIDE_HINTS[3].tech,
      },
    },
    4: {
      roomId: 4,
      // Hat deduction: FRONT BLACK
      letter1Answer: 'FRONT BLACK',
      letter1RevealClue: 'Look inside the red emergency safety cabinet mounted on the north wall.',
      // Stacked boxes: F
      letter2Answer: 'F',
      letter2RevealClue: 'Enter your final calculation into the central SCADA console terminal in the vault core.',
      physicalKey: 'VAULT-FLAG-779',
      // Stack ops: Sum 47 - 50 = -3 => 1111 1111 1111 1101
      techAnswer: '1111 1111 1111 1101',
      hints: {
        letter1: ROUND2_FIELD_GUIDE_HINTS[4].letter1,
        letter2: ROUND2_FIELD_GUIDE_HINTS[4].letter2,
        physicalKey: 'Obtain Keycard Green from Chief Proctor in the venue.',
        tech: ROUND2_FIELD_GUIDE_HINTS[4].tech,
      },
    },
  },
};

export const AUTHORITATIVE_ROOMS: Record<number, RoomAnswersConfig> = AUTHORITATIVE_ROOMS_BY_SET[1];

export function normalizeInput(val: string): string {
  if (!val) return '';
  let str = String(val).trim().toLowerCase();
  // Strip outer quotes or brackets
  str = str.replace(/^["'`(\[]+|["'`)\]]+$/g, '');
  str = str.replace(/\s+/g, ' ').trim();
  if (/^-?\d+\.0+$/.test(str)) {
    str = str.replace(/\.0+$/, '');
  }
  // Strip trailing period e.g. "21." -> "21"
  str = str.replace(/\.$/, '');
  return str.trim();
}

function wordToNumber(str: string): string {
  const map: Record<string, string> = {
    zero: '0',
    one: '1',
    two: '2',
    three: '3',
    four: '4',
    five: '5',
    six: '6',
    seven: '7',
    eight: '8',
    nine: '9',
    ten: '10',
    twelve: '12',
    fifteen: '15',
    seventeen: '17',
    eighteen: '18',
    twenty: '20',
    'twenty one': '21',
    'twenty-one': '21',
    'twenty two': '22',
    'twenty-two': '22',
    'twenty four': '24',
    'twenty-four': '24',
    'twenty six': '26',
    'twenty-six': '26',
    'twenty eight': '28',
    'twenty-eight': '28',
  };
  return map[str.trim().toLowerCase()] || '';
}

export function isAnswerMatch(
  roomId: number,
  step: RoomStep,
  input: string,
  setId: number = 1
): boolean {
  const setConfig = AUTHORITATIVE_ROOMS_BY_SET[setId] || AUTHORITATIVE_ROOMS_BY_SET[1];
  const cfg = setConfig[roomId];
  if (!cfg) return false;

  const rawInput = (input || '').trim();
  const normInput = normalizeInput(rawInput);
  const noSpaceInput = normInput.replace(/\s+/g, '');

  if (step === 'LETTER_1') {
    // Room 1: Handshakes (Set 1: 21, Set 2: 28, Set 3: 15)
    if (roomId === 1) {
      const expNorm = normalizeInput(cfg.letter1Answer);
      if (normInput === expNorm) return true;
      const userNumOnly = normInput.replace(/[^0-9]/g, '');
      if (userNumOnly === expNorm && userNumOnly.length > 0) return true;
      const wordNum = wordToNumber(normInput);
      if (wordNum === expNorm) return true;
      if (normInput.includes(expNorm)) return true;
      return false;
    }

    // Room 2: Father/Son age gap (Set 1: 22, Set 2: 12, Set 3: 20)
    if (roomId === 2) {
      const expNorm = normalizeInput(cfg.letter1Answer);
      if (normInput === expNorm) return true;
      const userNumOnly = normInput.replace(/[^0-9]/g, '');
      if (userNumOnly === expNorm && userNumOnly.length > 0) return true;
      const wordNum = wordToNumber(normInput);
      if (wordNum === expNorm) return true;
      return false;
    }

    // Room 3: Two fathers & two sons went fishing: 3 (Grandfather, father, son)
    if (roomId === 3) {
      const normExp = normalizeInput(cfg.letter1Answer);
      if (normInput === normExp) return true;
      if (
        (normInput.includes('grandfather') || normInput.includes('grand father') || normInput.includes('grandpa')) &&
        (normInput.includes('father') || normInput.includes('dad')) &&
        (normInput.includes('son') || normInput.includes('boy'))
      ) {
        return true;
      }
      if (
        normInput.includes('grandfather') &&
        (normInput.includes('grandson') || normInput.includes('grand son'))
      ) {
        return true;
      }
      if (
        normInput.includes('generation') ||
        normInput === '3' ||
        normInput === 'three' ||
        normInput === '3 people' ||
        normInput === '3 fish' ||
        normInput === '3 fishes' ||
        normInput === 'three fish' ||
        normInput === 'three fishes' ||
        normInput.includes('3 fish') ||
        normInput.includes('3 fishes') ||
        normInput.includes('three fish') ||
        normInput.includes('three fishes') ||
        normInput.replace(/[^0-9]/g, '') === '3'
      ) {
        return true;
      }
      return false;
    }

    // Room 4: Hat deduction ("FRONT BLACK" / "BLACK")
    if (roomId === 4) {
      if (normInput === 'front black' || normInput === 'black front') return true;
      if (normInput === 'black' || normInput === 'black hat' || normInput === 'blackhat') return true;
      if (normInput.includes('black') && (normInput.includes('front') || !normInput.includes('red'))) {
        return true;
      }
      return false;
    }

    return normInput === normalizeInput(cfg.letter1Answer);
  }

  if (step === 'LETTER_2') {
    // Room 1: Ages Person B (Set 1: 24, Set 2: 22, Set 3: 18)
    if (roomId === 1) {
      const expNorm = normalizeInput(cfg.letter2Answer);
      if (normInput === expNorm) return true;
      const userNumOnly = normInput.replace(/[^0-9]/g, '');
      if (userNumOnly === expNorm && userNumOnly.length > 0) return true;
      const wordNum = wordToNumber(normInput);
      if (wordNum === expNorm) return true;
      return false;
    }

    // Room 2: Riddle ("Once in every minute... -> M")
    if (roomId === 2) {
      if (normInput === 'm' || normInput === "'m'" || normInput === '"m"') return true;
      const stripped = normInput.replace(/^(the\s+)?letter\s+/i, '').replace(/['"\s]/g, '');
      if (stripped === 'm') return true;
      if (/\bm\b/.test(normInput) && !normInput.includes('minute') && !normInput.includes('moment')) return true;
      return false;
    }

    // Room 3: Bridge crossing (Set 1: 21 minutes, Set 2: 26 minutes, Set 3: 17 minutes)
    if (roomId === 3) {
      const expNorm = normalizeInput(cfg.letter2Answer);
      if (normInput === expNorm) return true;
      const numOnly = expNorm.replace(/[^0-9]/g, '');
      const userNumOnly = normInput.replace(/[^0-9]/g, '');
      if (userNumOnly === numOnly && userNumOnly.length > 0) return true;
      const wordNum = wordToNumber(normInput.replace(/\s*minutes?|\s*mins?/, ''));
      if (wordNum === numOnly) return true;
      return false;
    }

    // Room 4: Stacked boxes ("F")
    if (roomId === 4) {
      if (normInput === 'f' || normInput === "'f'" || normInput === '"f"') return true;
      const stripped = normInput.replace(/^(the\s+)?(box|letter)\s+/i, '').replace(/['"\s\-]/g, '');
      if (stripped === 'f') return true;
      if (/\bf\b/.test(normInput)) return true;
      return false;
    }

    return normInput === normalizeInput(cfg.letter2Answer);
  }

  if (step === 'PHYSICAL_KEY') {
    const strippedInput = normInput.replace(/[-_\s]/g, '');
    const strippedExpected = normalizeInput(cfg.physicalKey).replace(/[-_\s]/g, '');
    if (strippedInput === strippedExpected) return true;
    // Allow matching numeric suffix e.g. "91" for "DOOR-KEY-91"
    const expNum = strippedExpected.replace(/[^0-9]/g, '');
    if (expNum && strippedInput === expNum) return true;
    return false;
  }

  if (step === 'TECH') {
    // Room 1: Prime squares (Set 1: 361, Set 2: 841, Set 3: 529)
    if (roomId === 1) {
      const expNorm = normalizeInput(cfg.techAnswer);
      if (normInput === expNorm) return true;
      const userNumOnly = normInput.replace(/[^0-9]/g, '');
      if (userNumOnly === expNorm && userNumOnly.length > 0) return true;
      if (setId === 1 && (normInput === '19^2' || normInput === '19²' || normInput === '19*19' || normInput === '19 squared')) return true;
      if (setId === 2 && (normInput === '29^2' || normInput === '29²' || normInput === '29*29' || normInput === '29 squared')) return true;
      if (setId === 3 && (normInput === '23^2' || normInput === '23²' || normInput === '23*23' || normInput === '23 squared')) return true;
      return false;
    }

    // Room 2: C code execution output
    if (roomId === 2) {
      // Normalize commas, multiple spaces, quotes, brackets
      const cleanTokens = normInput.replace(/[,;:"']/g, ' ').replace(/\s+/g, ' ').trim();
      if (setId === 1) {
        if (cleanTokens === '1 0' || noSpaceInput === '10' || cleanTokens === '1, 0' || cleanTokens === '1,0') return true;
        if (cleanTokens === '5 -1 0 1' || cleanTokens === '5 -1 1 1') return true;
        if (noSpaceInput === '5-101' || noSpaceInput === '5-111') return true;
      }
      if (setId === 2) {
        if (cleanTokens === '6 -1 0 1' || cleanTokens === '6 -1 1 1') return true;
        if (noSpaceInput === '6-101' || noSpaceInput === '6-111') return true;
      }
      if (setId === 3) {
        if (cleanTokens === '4 -1 1 1' || cleanTokens === '4 -1 0 1') return true;
        if (noSpaceInput === '4-111' || noSpaceInput === '4-101') return true;
      }
      return cleanTokens === normalizeInput(cfg.techAnswer);
    }

    // Room 3: Weighted cipher
    if (roomId === 3) {
      const expNorm = normalizeInput(cfg.techAnswer);
      if (normInput === expNorm) return true;
      const userNumOnly = normInput.replace(/[^0-9]/g, '');
      if (userNumOnly === expNorm && userNumOnly.length > 0) return true;
      if (setId === 3 && (userNumOnly === '162' || userNumOnly === '186')) return true;
      return false;
    }

    // Room 4: 16-bit 2's complement binary
    if (roomId === 4) {
      const binaryExpected = normalizeInput(cfg.techAnswer).replace(/\s+/g, '');
      const userBinaryClean = noSpaceInput.replace(/^0b/, '').replace(/[-_]/g, '');
      if (userBinaryClean === binaryExpected) return true;
      // Also accept decimal representation (-3 for set 1 & 3, -7 for set 2)
      if (setId === 1 && (normInput === '-3' || normInput === '- 3')) return true;
      if (setId === 2 && (normInput === '-7' || normInput === '- 7')) return true;
      if (setId === 3 && (normInput === '-3' || normInput === '- 3')) return true;
      return false;
    }

    return normInput === normalizeInput(cfg.techAnswer);
  }

  return false;
}

export const BASE_SCORE = 1000;
export const ERROR_PENALTY_RATE = 15; // per 3 errors
export const HINT_PENALTY_RATE = 10; // per unlocked hint

export function computeNetScore(
  arg1: number = BASE_SCORE,
  arg2: number = 0,
  arg3?: number
): number {
  let baseScore = BASE_SCORE;
  let totalErrors = 0;
  let hints = 0;

  if (arg3 !== undefined) {
    // 3 arguments: computeNetScore(baseScore, totalErrors, hintsUnlockedCount)
    baseScore = arg1;
    totalErrors = arg2;
    hints = arg3;
  } else {
    // 2 or fewer arguments:
    // If arg1 > 100 (e.g. 1000, 500, etc.), it represents an explicit baseScore: (baseScore, totalErrors)
    // If arg1 <= 100 (e.g. 0, 1, 2, 3), it represents (totalErrors, hintsUnlockedCount) with default BASE_SCORE!
    if (arg1 > 100) {
      baseScore = arg1;
      totalErrors = arg2;
      hints = 0;
    } else {
      baseScore = BASE_SCORE;
      totalErrors = arg1;
      hints = arg2;
    }
  }

  const errorPenalty = Math.floor(totalErrors / 3) * ERROR_PENALTY_RATE;
  const hintPenalty = hints * HINT_PENALTY_RATE;
  return Math.max(0, baseScore - errorPenalty - hintPenalty);
}


export function verify(
  roomId: number,
  step: RoomStep,
  input: string,
  currentCumulativeErrors: number = 0,
  currentHintsCount: number = 0,
  setId: number = 1
): VerifyResult {
  const setConfig = AUTHORITATIVE_ROOMS_BY_SET[setId] || AUTHORITATIVE_ROOMS_BY_SET[1];
  const cfg = setConfig[roomId];
  if (!cfg) {
    return {
      success: false,
      message: 'UNKNOWN CHAMBER: Room configuration not found.',
      cumulativeErrors: currentCumulativeErrors,
    };
  }

  const isCorrect = isAnswerMatch(roomId, step, input, setId);

  if (isCorrect) {
    let clue: string | undefined;
    let message = 'VERIFICATION ACCEPTED.';

    if (step === 'LETTER_1') {
      clue = cfg.letter1RevealClue;
      message = `PUZZLE 1 SOLVED: Engraved code registered. Clue: "${clue}"`;
    } else if (step === 'LETTER_2') {
      clue = cfg.letter2RevealClue;
      message = `PUZZLE 2 SOLVED: Fragment captured. Clue: "${clue}"`;
    } else if (step === 'PHYSICAL_KEY') {
      message = 'PHYSICAL KEYCARD VERIFIED: Key box terminal interlock disengaged.';
    } else if (step === 'TECH') {
      message = `CHALLENGE OVERRULED: Subsystem cleared! Door to Room ${roomId < 4 ? roomId + 1 : 'EXIT'} unbolting.`;
    }

    const netScore = computeNetScore(BASE_SCORE, currentCumulativeErrors, currentHintsCount);

    return {
      success: true,
      message,
      revealedClue: clue,
      newNetScore: netScore,
      cumulativeErrors: currentCumulativeErrors,
      errorWarning: false,
    };
  } else {
    const updatedErrors = currentCumulativeErrors + 1;
    const isSecondInCycle = updatedErrors % 3 === 2;
    const penaltyApplied = updatedErrors % 3 === 0;

    let message = 'ACCESS DENIED: Verification input rejected.';
    if (penaltyApplied) {
      message += ` 3 INCORRECT ATTEMPTS: -15 PTS DEDUCTED (Total Errors: ${updatedErrors}).`;
    } else if (isSecondInCycle) {
      message += ` WARNING: 2 incorrect attempts. 1 more error will deduct 15 points!`;
    }

    const netScore = computeNetScore(BASE_SCORE, updatedErrors, currentHintsCount);

    return {
      success: false,
      message,
      newNetScore: netScore,
      cumulativeErrors: updatedErrors,
      errorWarning: isSecondInCycle,
    };
  }
}

