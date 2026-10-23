// ============================================================================
// TECH QUEST: THREE QUESTION SETS, TEAM COLOURS, PASSWORDS & HINTS SPECIFICATION
// ============================================================================

import type { Challenge } from '../types';

export type TeamColor = 'BLUE' | 'RED' | 'GREEN';
export type QuestionSetCode = 'SET_1' | 'SET_2' | 'SET_3';
export type QuestionSetId = 1 | 2 | 3;

export function getSetIdForColor(color?: string): QuestionSetId {
  const norm = (color || 'BLUE').toUpperCase();
  if (norm === 'RED') return 2;
  if (norm === 'GREEN') return 3;
  return 1; // Default to Blue / Set 1
}

export function getColorForSetId(setId: number): TeamColor {
  if (setId === 2) return 'RED';
  if (setId === 3) return 'GREEN';
  return 'BLUE';
}

export function getSetCodeForId(setId: number): QuestionSetCode {
  if (setId === 2) return 'SET_2';
  if (setId === 3) return 'SET_3';
  return 'SET_1';
}

// ----------------------------------------------------------------------------
// 1. ROUND 1 PASSWORDS & CLUES BY SET
// ----------------------------------------------------------------------------

export interface PasswordClueDef {
  index: number;
  title: string;
  clue: string;
  answerChar: string; // Internal / Organizer key only
}

export const ROUND1_PASSWORDS: Record<QuestionSetId, string> = {
  1: 'R4#T9',
  2: 'K4%N7',
  3: 'Q5&X8',
};

export const ROUND1_PASSWORD_CLUES_BY_SET: Record<QuestionSetId, PasswordClueDef[]> = {
  // SET 1: BLUE TEAM (Password: R4#T9)
  1: [
    {
      index: 1,
      title: 'CLUE 1',
      clue: 'I am the sound a engine makes when revved, the start of every Race, and the letter that turns a Cat into a Cart. Look to the 18th place in the alphabet.',
      answerChar: 'R',
    },
    {
      index: 2,
      title: 'CLUE 2',
      clue: 'Count the wheels on a passing car, the suits in a deck of cards, or the seasons that circle the year. Multiply two by itself, and you shall find my key.',
      answerChar: '4',
    },
    {
      index: 3,
      title: 'CLUE 3',
      clue: 'Four lines intertwine to build a small cage, two lying flat, two standing tall. I turn a musical note sharp, transform words into trending tags, and sit in the corner of your phone dialer waiting to be pressed.',
      answerChar: '#',
    },
    {
      index: 4,
      title: 'CLUE 4',
      clue: 'I am shaped like a crossroads where three roads meet, but the path forward is blocked. I sit in the very center of water, stand at the very end of night, and without me, time itself would lose its start.',
      answerChar: 'T',
    },
    {
      index: 5,
      title: 'CLUE 5',
      clue: "I am the digit that returns to itself when added to any number's digital root. I mark the total value of a baseball team on the field, the highest single threshold before a new place value is born, and the exact count of rings forged for Mortal Men doomed to die. Cast my reflection in a mirror and I mimic a six, but divide thirty-six by four to unlock my true identity.",
      answerChar: '9',
    },
  ],

  // SET 2: RED TEAM (Password: K4%N7)
  2: [
    {
      index: 1,
      title: 'CLUE 1',
      clue: 'Think of the chess piece whose capture ends the contest. Take its initial. It is also the prefix that means one thousand times larger when placed before gram.',
      answerChar: 'K',
    },
    {
      index: 2,
      title: 'CLUE 2',
      clue: 'Picture a shape with four corners, a car with four wheels, or two pairs of objects. The number they share is your next character.',
      answerChar: '4',
    },
    {
      index: 3,
      title: 'CLUE 3',
      clue: 'I represent a part out of one hundred. You see me in discounts, statistics, and exam results. Which symbol am I?',
      answerChar: '%',
    },
    {
      index: 4,
      title: 'CLUE 4',
      clue: "I finish the word 'moon' and begin the word 'night'. You will also find me appearing twice in the word 'nineteen'.",
      answerChar: 'N',
    },
    {
      index: 5,
      title: 'CLUE 5',
      clue: 'Count the wonders of the ancient world, the days in a week, or the notes in a basic diatonic scale. What number appears in all three?',
      answerChar: '7',
    },
  ],

  // SET 3: GREEN TEAM (Password: Q5&X8)
  3: [
    {
      index: 1,
      title: 'CLUE 1',
      clue: 'I lead a word with a silent partner, rarely appearing without it in English. I also begin a sentence asking for an answer.',
      answerChar: 'Q',
    },
    {
      index: 2,
      title: 'CLUE 2',
      clue: 'Think of a five-pointed star, the fingers on one hand, or a Greek polygon with five sides. Find their shared number.',
      answerChar: '5',
    },
    {
      index: 3,
      title: 'CLUE 3',
      clue: "I join words without writing 'and'. You may find me in company names, and I began as a symbol in old handwriting.",
      answerChar: '&',
    },
    {
      index: 4,
      title: 'CLUE 4',
      clue: 'Imagine a treasure map marked by two diagonal strokes. In algebra, I can stand for an unknown, and in Roman numerals, I represent ten.',
      answerChar: 'X',
    },
    {
      index: 5,
      title: 'CLUE 5',
      clue: "Count a spider's legs, the sides of a stop-sign polygon, or the vertices of a cube. Which number connects these clues?",
      answerChar: '8',
    },
  ],
};

// ----------------------------------------------------------------------------
// 2. ROUND 1 CHALLENGES BY SET
// ----------------------------------------------------------------------------

export const ROUND1_CHALLENGES_BY_SET: Record<QuestionSetId, Record<string, Challenge>> = {
  // SET 1: BLUE TEAM
  1: {
    'CH-01': {
      id: 'CH-01',
      round: 'ROUND_1',
      nodeCode: 'Q1',
      title: 'Question 1: Number series',
      category: 'DIGITAL',
      difficulty: 'EASY',
      points: 100,
      question: 'Find the missing number:\n\n25, 49, 121, 169, ?',
      questionType: 'MCQ',
      options: ['A. 225', 'B. 289', 'C. 256', 'D. 361'],
      correctAnswer: '289',
      hints: [
        'Look for a relationship between prime numbers and squares.',
        'The square roots of the given numbers are prime numbers.',
        'Find the next prime number after 13 and square it.',
      ],
      hint: 'Look for a relationship between prime numbers and squares.',
      explanation: 'The numbers are squares of consecutive prime numbers: 5², 7², 11², 13², 17². 17² = 289.',
      hintPenaltyPoints: 10,
      order: 1,
      active: true,
    },
    'CH-02': {
      id: 'CH-02',
      round: 'ROUND_1',
      nodeCode: 'Q2',
      title: 'Question 2: C programming',
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
      explanation: '1. i is initialized to 0. In the expression i++, post-increment yields 0 first, then increments i to 1.\n2. In logical AND (&&), if the first operand is false (0), short-circuit evaluation prevents the second operand from executing. Thus, printf("Geeks") does NOT execute.\n3. The logical expression evaluates to 0, which is assigned to j.\n4. When printf("%d %d", i, j) runs, i is 1 and j is 0, producing: 1 0.',
      hintPenaltyPoints: 10,
      order: 2,
      active: true,
    },
    'CH-03': {
      id: 'CH-03',
      round: 'ROUND_1',
      nodeCode: 'Q3',
      title: 'Question 3: Word and number code',
      category: 'ENGINEERING_LOGIC',
      difficulty: 'EASY',
      points: 100,
      question: 'If NEWYORK = 111, find the value of NEWJERSEY.',
      questionType: 'NUMERICAL',
      correctAnswer: '124',
      hints: [
        'Each letter corresponds to its position in the alphabet (A=1 ... Z=26).',
        'Sum the numerical values of all letters in NEWYORK to see the pattern.',
        'Calculate N(14) + E(5) + W(23) + J(10) + E(5) + R(18) + S(19) + E(5) + Y(25).',
      ],
      hint: 'Each letter corresponds to its position in the alphabet (A=1 ... Z=26).',
      explanation: 'NEWJERSEY = 14 + 5 + 23 + 10 + 5 + 18 + 19 + 5 + 25 = 124.',
      hintPenaltyPoints: 10,
      order: 3,
      active: true,
    },
    'CH-04': {
      id: 'CH-04',
      round: 'ROUND_1',
      nodeCode: 'Q4',
      title: 'Question 4: Postman distance problem',
      category: 'ENGINEERING_LOGIC',
      difficulty: 'MEDIUM',
      points: 100,
      question:
        'A postman traveled from his post office to a village in order to distribute mails. He started on his bicycle from the post office at the speed of 25 km/hr. But, when he was about to return, a thief stole his bicycle. As a result, he had to walk back to the post office on foot at a speed of 4 km/hr. If the traveling part of his day lasted for 2 hours and 54 minutes, find the distance between the post office and the village.',
      questionType: 'TEXT',
      correctAnswer: '10 km',
      hints: [
        'Convert the total time 2 hours and 54 minutes into hours or minutes (2.9 hours or 174 minutes).',
        'Let the distance be d. The time equation is d/25 + d/4 = 2.9.',
        'Find the common denominator for 25 and 4 and solve for d.',
      ],
      hint: 'Convert the total time 2 hours and 54 minutes into hours or minutes (2.9 hours or 174 minutes).',
      explanation: 'd/25 + d/4 = 29/10 => 29d / 100 = 29/10 => d = 10 km.',
      hintPenaltyPoints: 10,
      order: 4,
      active: true,
    },
    'CH-05': {
      id: 'CH-05',
      round: 'ROUND_1',
      nodeCode: 'Q5',
      title: "Question 5: Two's complement",
      category: 'DIGITAL',
      difficulty: 'HARD',
      points: 100,
      question: "Represent -28 in 16-bit two's complement binary.",
      questionType: 'TEXT',
      correctAnswer: '1111 1111 1110 0100',
      hints: [
        'Write positive 28 in 16-bit binary: 0000 0000 0001 1100.',
        "Invert all bits to obtain the one's complement: 1111 1111 1110 0011.",
        "Add 1 to the one's complement to determine the two's complement.",
      ],
      hint: 'Write positive 28 in 16-bit binary and invert all bits.',
      explanation: '+28 = 0000 0000 0001 1100. Invert: 1111 1111 1110 0011. Add 1: 1111 1111 1110 0100.',
      hintPenaltyPoints: 10,
      order: 5,
      active: true,
    },
  },

  // SET 2: RED TEAM
  2: {
    'CH-01': {
      id: 'CH-01',
      round: 'ROUND_1',
      nodeCode: 'Q1',
      title: 'Question 1: Number series',
      category: 'DIGITAL',
      difficulty: 'EASY',
      points: 100,
      question: 'Find the missing number:\n\n4, 9, 25, 49, ?',
      questionType: 'MCQ',
      options: ['A. 81', 'B. 100', 'C. 121', 'D. 144'],
      correctAnswer: '121',
      hints: [
        'Notice that 4=2², 9=3², 25=5², 49=7².',
        'The bases 2, 3, 5, 7 are consecutive prime numbers.',
        'Find the next prime number after 7 and square it.',
      ],
      hint: 'Notice that 4=2², 9=3², 25=5², 49=7².',
      explanation: 'Consecutive prime squares: 2², 3², 5², 7², 11². 11² = 121.',
      hintPenaltyPoints: 10,
      order: 1,
      active: true,
    },
    'CH-02': {
      id: 'CH-02',
      round: 'ROUND_1',
      nodeCode: 'Q2',
      title: 'Question 2: C programming',
      category: 'CODING',
      difficulty: 'MEDIUM',
      points: 100,
      question: 'Predict the output.',
      codeSnippet: `int i = 3;\nint j = i++ && printf("Tech");\nprintf("%d %d", i, j);`,
      questionType: 'TEXT',
      correctAnswer: 'Tech4 1',
      hints: [
        'i starts at 3. The post-increment i++ evaluates to 3 (non-zero truthy).',
        'Because the left operand of && is true, printf("Tech") executes and prints "Tech".',
        'printf returns the number of characters printed (4). Both operands of && are non-zero, so j becomes 1. i increments to 4.',
      ],
      hint: 'i++ evaluates to 3 (non-zero truthy), so the right side executes.',
      explanation: 'printf("Tech") prints "Tech" and returns 4. Logical AND yields 1 for j. i is incremented to 4. Final output: Tech4 1.',
      hintPenaltyPoints: 10,
      order: 2,
      active: true,
    },
    'CH-03': {
      id: 'CH-03',
      round: 'ROUND_1',
      nodeCode: 'Q3',
      title: 'Question 3: Word and number code',
      category: 'ENGINEERING_LOGIC',
      difficulty: 'EASY',
      points: 100,
      question: 'If PARIS = 63, find the value of LONDON.',
      questionType: 'NUMERICAL',
      correctAnswer: '74',
      hints: [
        'Calculate letter positions for PARIS: P=16, A=1, R=18, I=9, S=19. Sum = 63.',
        'Apply the exact same alphabetical letter indexing to LONDON.',
        'Sum: L(12) + O(15) + N(14) + D(4) + O(15) + N(14).',
      ],
      hint: 'Apply alphabetical letter indexing (A=1 ... Z=26) and sum all characters.',
      explanation: 'LONDON = 12 + 15 + 14 + 4 + 15 + 14 = 74.',
      hintPenaltyPoints: 10,
      order: 3,
      active: true,
    },
    'CH-04': {
      id: 'CH-04',
      round: 'ROUND_1',
      nodeCode: 'Q4',
      title: 'Question 4: Postman distance problem',
      category: 'ENGINEERING_LOGIC',
      difficulty: 'MEDIUM',
      points: 100,
      question:
        'A postman travels by bike at 20 km/h and walks at 5 km/h. The total time taken is 3 hours. Find the distance travelled by bike.',
      questionType: 'TEXT',
      correctAnswer: '12 km',
      hints: [
        'Total time is 3 hours. Let distance be d.',
        'Time equation: d/20 + d/5 = 3.',
        'Multiply entire equation by 20 to clear denominators.',
      ],
      hint: 'Set up time equation: d/20 + d/5 = 3 hours.',
      explanation: 'd/20 + 4d/20 = 3 => 5d/20 = 3 => d/4 = 3 => d = 12 km.',
      hintPenaltyPoints: 10,
      order: 4,
      active: true,
    },
    'CH-05': {
      id: 'CH-05',
      round: 'ROUND_1',
      nodeCode: 'Q5',
      title: "Question 5: Two's complement",
      category: 'DIGITAL',
      difficulty: 'HARD',
      points: 100,
      question: "Represent -42 in 16-bit two's complement binary.",
      questionType: 'TEXT',
      correctAnswer: '1111 1111 1101 0110',
      hints: [
        'Start with +42 in 16-bit binary: 0000 0000 0010 1010.',
        'Invert all bits: 1111 1111 1101 0101.',
        'Add 1 to the result.',
      ],
      hint: 'Invert the 16-bit binary of +42 and add 1.',
      explanation: '+42 = 0000 0000 0010 1010. Invert: 1111 1111 1101 0101. Add 1: 1111 1111 1101 0110.',
      hintPenaltyPoints: 10,
      order: 5,
      active: true,
    },
  },

  // SET 3: GREEN TEAM
  3: {
    'CH-01': {
      id: 'CH-01',
      round: 'ROUND_1',
      nodeCode: 'Q1',
      title: 'Question 1: Number series',
      category: 'DIGITAL',
      difficulty: 'EASY',
      points: 100,
      question: 'Find the missing number:\n\n9, 25, 49, 121, ?',
      questionType: 'MCQ',
      options: ['A. 144', 'B. 169', 'C. 196', 'D. 225'],
      correctAnswer: '169',
      hints: [
        'Notice that 9=3², 25=5², 49=7², 121=11².',
        'The bases 3, 5, 7, 11 are consecutive prime numbers.',
        'Find the next prime number after 11 and square it.',
      ],
      hint: 'Notice that 9=3², 25=5², 49=7², 121=11².',
      explanation: 'Consecutive prime squares: 3², 5², 7², 11², 13². 13² = 169.',
      hintPenaltyPoints: 10,
      order: 1,
      active: true,
    },
    'CH-02': {
      id: 'CH-02',
      round: 'ROUND_1',
      nodeCode: 'Q2',
      title: 'Question 2: C programming',
      category: 'CODING',
      difficulty: 'MEDIUM',
      points: 100,
      question: 'Predict the output.',
      codeSnippet: `int i = 2;\nint j = i++ && printf("Code");\nprintf("%d %d", i, j);`,
      questionType: 'TEXT',
      correctAnswer: 'Code3 1',
      hints: [
        'i starts at 2. i++ evaluates to 2 (non-zero truthy).',
        'printf("Code") executes, prints "Code" and returns 4.',
        'Both sides of && are true, so j = 1. i increments to 3. printf prints "3 1".',
      ],
      hint: 'i starts at 2 (truthy), so printf("Code") executes before incrementing i.',
      explanation: 'printf("Code") prints "Code". j receives 1. i becomes 3. Printed result: Code3 1.',
      hintPenaltyPoints: 10,
      order: 2,
      active: true,
    },
    'CH-03': {
      id: 'CH-03',
      round: 'ROUND_1',
      nodeCode: 'Q3',
      title: 'Question 3: Word and number code',
      category: 'ENGINEERING_LOGIC',
      difficulty: 'EASY',
      points: 100,
      question: 'If DELHI = 38, find the value of MUMBAI.',
      questionType: 'NUMERICAL',
      correctAnswer: '59',
      hints: [
        'Letter indices for DELHI: D=4, E=5, L=12, H=8, I=9. Sum = 38.',
        'Use the same alphabetical indices (A=1 ... Z=26) for MUMBAI.',
        'Sum: M(13) + U(21) + M(13) + B(2) + A(1) + I(9).',
      ],
      hint: 'Map each letter of MUMBAI to its alphabet index (A=1 ... Z=26) and sum them.',
      explanation: 'MUMBAI = 13 + 21 + 13 + 2 + 1 + 9 = 59.',
      hintPenaltyPoints: 10,
      order: 3,
      active: true,
    },
    'CH-04': {
      id: 'CH-04',
      round: 'ROUND_1',
      nodeCode: 'Q4',
      title: 'Question 4: Postman distance problem',
      category: 'ENGINEERING_LOGIC',
      difficulty: 'MEDIUM',
      points: 100,
      question:
        'A postman travels by bike at 30 km/h and walks at 5 km/h. The total time taken is 2 hours and 20 minutes. Find the distance travelled by bike.',
      questionType: 'TEXT',
      correctAnswer: '10 km',
      hints: [
        'Convert 2 hours 20 minutes into hours: 2 + 20/60 = 7/3 hours.',
        'Let distance be d. Equation: d/30 + d/5 = 7/3.',
        'Multiply by 30: d + 6d = 70 => 7d = 70 => d = 10 km.',
      ],
      hint: 'Convert 2 hours 20 minutes to 7/3 hours and solve d/30 + d/5 = 7/3.',
      explanation: 'd/30 + 6d/30 = 7/3 => 7d/30 = 70/30 => d = 10 km.',
      hintPenaltyPoints: 10,
      order: 4,
      active: true,
    },
    'CH-05': {
      id: 'CH-05',
      round: 'ROUND_1',
      nodeCode: 'Q5',
      title: "Question 5: Two's complement",
      category: 'DIGITAL',
      difficulty: 'HARD',
      points: 100,
      question: "Represent -35 in 16-bit two's complement binary.",
      questionType: 'TEXT',
      correctAnswer: '1111 1111 1101 1101',
      hints: [
        'Write +35 in 16-bit binary: 0000 0000 0010 0011.',
        'Invert all bits: 1111 1111 1101 1100.',
        'Add 1 to the result.',
      ],
      hint: 'Invert the 16-bit binary of +35 and add 1.',
      explanation: '+35 = 0000 0000 0010 0011. Invert: 1111 1111 1101 1100. Add 1: 1111 1111 1101 1101.',
      hintPenaltyPoints: 10,
      order: 5,
      active: true,
    },
  },
};

// ----------------------------------------------------------------------------
// 3. ROUND 2 FIELD GUIDE HINTS (CANONICAL TEXT FROM PROMPT)
// ----------------------------------------------------------------------------

export const ROUND2_FIELD_GUIDE_TITLE = 'Tech Quest Escape Room: Field Guide & Subtle Clues';

export const ROUND2_FIELD_GUIDE_HINTS: Record<
  number,
  {
    letter1: string;
    letter2: string;
    tech: string;
  }
> = {
  // Sector 1: Detention Cell Block
  1: {
    letter1:
      'Observation: Think about drawing a network where every person is a point, and every handshake is a single line connecting two points. You are trying to count the total unique lines without counting any connection twice.',
    letter2:
      'Observation: Express the two people\'s ages using a single variable. If one is twice as large as the other, how many equal "units" or "parts" make up their combined total?',
    tech: 'Observation: Look closely at the numbers being squared rather than the squares themselves. Are those base numbers even? Odd? Or do they share a special mathematical property related to prime factorization?',
  },

  // Sector 2: Surveillance & Security Hub
  2: {
    letter1:
      'Observation: As time moves forward, both the father and son grow older at the exact same rate. Consider the gap between their ages. Does that gap ever change?',
    letter2:
      'Observation: Stop thinking about time or chronology. Shift your focus strictly to typography and orthography, how those exact words are visually written on paper.',
    tech: 'Pay attention to the initial value of i. Remember that i++ uses the current value first and increments it afterward. Since && stops when its first operand is false, think about whether printf("Geeks") will execute!',
  },

  // Sector 3: Sub-Level Utility Tunnel
  3: {
    letter1:
      'Observation: Roles in a family tree can overlap. A single male individual can simultaneously hold more than one familial title depending on who he is standing next to.',
    letter2:
      'Observation: Sending the fastest person back and forth with the light seems logical, but it wastes time if your slowest travelers cross individually. Can you pair your two slowest travelers together so their slow pace is only incurred once?',
    tech: 'Observation: Treat the alphabet as positions $1$ through $26$. Line up the letters of the target word, and apply alternating multipliers to every other letter before adding them up.',
  },

  // Sector 4: Exterior Extraction Perimeter
  4: {
    letter1:
      'Observation: Put yourself in the shoes of the back prisoner. What visual scenario in front of him would give him an immediate, effortless answer? Since he hesitates, what possibilities does that rule out for the middle and front prisoners?',
    letter2:
      'Observation: Work relative to fixed positions. Anchor the bottom box at index 1, place the anchored relative offset box at index 4, and construct the remaining chain upwards step by step.',
    tech: 'Observation: Negative binary numbers represent the distance from zero in flipped-bit space. Think about standard 16-bit binary representation, invert every single bit, and adjust by one least significant bit.',
  },
};

// ----------------------------------------------------------------------------
// 4. ROUND 1 ANSWER VALIDATION HELPER
// ----------------------------------------------------------------------------

export function validateRound1AnswerForSet(
  setId: QuestionSetId,
  challengeId: string,
  submitted: string
): boolean {
  if (typeof submitted !== 'string') return false;
  let raw = submitted.trim();
  if (!raw) return false;

  // Strip leading/trailing quotes, parentheses, brackets, and trailing punctuation
  raw = raw.replace(/^["'`(\[]+|["'`)\]]+$/g, '').trim();
  raw = raw.replace(/[.,;!]+$/, '').trim();

  // Strip common answer prefixes like "answer: ", "ans = ", "output is "
  raw = raw.replace(/^(the\s+)?(correct\s+)?(answer|ans|result|output|value)\s*(is|=|:)\s*/i, '').trim();

  const lower = raw.toLowerCase().replace(/[,;]/g, ' ').replace(/\s+/g, ' ').trim();
  const noSpace = raw.replace(/[\s,;:\-_.]/g, '').toLowerCase();

  const challenge = ROUND1_CHALLENGES_BY_SET[setId]?.[challengeId];
  if (!challenge) return false;

  const expectedRaw = challenge.correctAnswer || '';
  const expectedLower = expectedRaw.toLowerCase().replace(/[,;]/g, ' ').replace(/\s+/g, ' ').trim();
  const expectedNoSpace = expectedRaw.replace(/[\s,;:\-_.]/g, '').toLowerCase();

  // 1. Direct match ignoring punctuation & spacing
  if (lower === expectedLower || noSpace === expectedNoSpace) return true;

  // 2. Options / MCQ handling
  if (challenge.options && challenge.options.length > 0) {
    let correctOptIndex = -1;
    let correctOptLetter = '';
    for (let i = 0; i < challenge.options.length; i++) {
      const opt = challenge.options[i];
      const optLower = opt.toLowerCase();
      if (optLower.includes(expectedLower) || opt.replace(/[\s\-_.]/g, '').toLowerCase().includes(expectedNoSpace)) {
        correctOptIndex = i;
        correctOptLetter = String.fromCharCode(65 + i).toLowerCase(); // 'a', 'b', 'c', 'd'
        break;
      }
    }

    if (correctOptLetter) {
      // Check user option letter: "b", "option b", "b.", "(b)", "b)", "choice b"
      const cleanUserOpt = lower.replace(/^(option|choice)\s+/i, '').replace(/[\.\)\]]/g, '').trim();
      if (cleanUserOpt === correctOptLetter) return true;

      // If user typed e.g. "b: 289", "b. 289", "b - 289", "option b: 289", "b 289"
      const strippedLetter = lower.replace(/^(option|choice)\s+/i, '').replace(/^[a-d][:\.\-)]\s*/i, '').trim();
      if (strippedLetter === expectedLower || strippedLetter.replace(/[\s\-_.]/g, '') === expectedNoSpace) return true;

      // Check against the full option text
      const fullCorrectOpt = challenge.options[correctOptIndex].toLowerCase();
      if (
        lower === fullCorrectOpt ||
        noSpace === challenge.options[correctOptIndex].replace(/[\s\-_.]/g, '').toLowerCase() ||
        lower.replace(/[\s\-_.]/g, '') === fullCorrectOpt.replace(/[\s\-_.]/g, '')
      ) {
        return true;
      }
    }
  }

  // 3. Distance questions (accept "10", "10 km", "10km", "12", "12 km", "12km", "10 kilometers", "10.0")
  if (expectedLower.includes('km')) {
    const numOnly = expectedNoSpace.replace(/[^0-9]/g, '');
    const userNumOnly = noSpace.replace(/[^0-9]/g, '');
    if (userNumOnly === numOnly && userNumOnly.length > 0) return true;
  }

  // 4. Numerical question extraction (e.g. "124", "74", "59", "289", "121", "169")
  if (challenge.questionType === 'NUMERICAL' || /^\d+$/.test(expectedNoSpace)) {
    const numOnly = expectedNoSpace.replace(/[^0-9]/g, '');
    const userNumOnly = noSpace.replace(/[^0-9]/g, '');
    if (userNumOnly === numOnly && userNumOnly.length > 0) return true;
  }

  // 5. Two's complement binary questions (accept with/without spaces, dashes, 0b prefix, or decimal integer)
  if (challenge.title.toLowerCase().includes("two's complement") || challenge.questionType === 'TEXT') {
    const cleanUserBin = raw.replace(/^0b/i, '').replace(/[\s\-_.]+/g, '');
    const cleanExpBin = expectedRaw.replace(/^0b/i, '').replace(/[\s\-_.]+/g, '');
    if (cleanUserBin.length === 16 && cleanUserBin === cleanExpBin) return true;

    // Check decimal representation (-28, -42, -35)
    if (setId === 1 && challengeId === 'CH-05' && (raw.trim() === '-28' || raw.trim() === '- 28')) return true;
    if (setId === 2 && challengeId === 'CH-05' && (raw.trim() === '-42' || raw.trim() === '- 42')) return true;
    if (setId === 3 && challengeId === 'CH-05' && (raw.trim() === '-35' || raw.trim() === '- 35')) return true;
  }

  // 6. C programming output (e.g. "5 -1 0 1", "1 0", "Tech4 1", "Code3 1")
  if (challenge.title.toLowerCase().includes('c programming') || challengeId === 'CH-02') {
    if (noSpace === expectedNoSpace) return true;
    if (setId === 1) {
      if (lower === '5 -1 0 1' || noSpace === '5-101' || lower === '5, -1, 0, 1' || lower === '5,-1,0,1' || lower === '5 - 1 0 1') return true;
      if (lower === '1 0' || noSpace === '10' || lower === '1, 0' || lower === '1,0' || lower === '1 and 0') return true;
      if (lower.includes('1') && lower.includes('0') && !lower.includes('geeks')) return true;
    }
    if (setId === 2) {
      if (noSpace === 'tech41' || noSpace === 'tech4,1' || lower === 'tech4 1' || lower === 'tech 4 1') return true;
    }
    if (setId === 3) {
      if (noSpace === 'code31' || noSpace === 'code3,1' || lower === 'code3 1' || lower === 'code 3 1') return true;
    }
  }

  return false;
}

export function validateRound1PasswordForSet(setId: QuestionSetId, submitted: string): boolean {
  if (typeof submitted !== 'string') return false;
  let cleanSubmitted = submitted.trim().replace(/^["'`(\[]+|["'`)\]]+$/g, '').trim();
  // Strip optional prefix like "password: " or "pass: " or "code: "
  cleanSubmitted = cleanSubmitted.replace(/^(password|pass|code)\s*[:=]\s*/i, '');
  cleanSubmitted = cleanSubmitted.replace(/\s+/g, '').toUpperCase();
  const expected = (ROUND1_PASSWORDS[setId] || '').toUpperCase();
  return cleanSubmitted === expected;
}
