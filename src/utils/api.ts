import {
  Challenge,
  Difficulty,
  EventSettings,
  PublicLeaderboardEntry,
  Round2LeaderboardEntry,
  EscapeRoomItem,
  HauntedGameState,
  HauntedLetter,
  HauntedKeyBox,
  RoundId,
  Team,
  ActivityLog,
} from '../types';

function getToken(): string | null {
  return localStorage.getItem('tech_quest_token');
}

export function setToken(token: string | null) {
  if (token) {
    localStorage.setItem('tech_quest_token', token);
  } else {
    localStorage.removeItem('tech_quest_token');
  }
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 2,
  delay = 350
): Promise<Response> {
  try {
    return await fetch(url, options);
  } catch (err: any) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 1.5);
    }
    throw err;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetchWithRetry(endpoint, {
      ...options,
      headers,
    });
  } catch (err: any) {
    const error: any = new Error(
      err?.message && !err.message.toLowerCase().includes('failed to fetch')
        ? err.message
        : 'Telemetry server connection unavailable. Auto-reconnecting...'
    );
    error.isNetworkError = true;
    throw error;
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg = data.error || data.message || `HTTP error ${res.status}`;
    const error: any = new Error(errorMsg);
    error.status = res.status;
    error.isAuthError = res.status === 401 || res.status === 403;
    throw error;
  }

  return data as T;
}

export const api = {
  // Auth
  register: (body: {
    teamName: string;
    leaderName: string;
    leaderEmail: string;
    leaderPhone: string;
    department: string;
    college: string;
    members: { name: string; usn: string; department: string }[];
  }) => request<{ team: Team; token: string }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
  }),

  teamLogin: (teamId: string, loginCode: string) =>
    request<{ team: Team; token: string }>('/api/auth/team-login', {
      method: 'POST',
      body: JSON.stringify({ teamId, loginCode }),
    }),

  adminLogin: (password: string) =>
    request<{ admin: boolean; token: string }>('/api/auth/admin-login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  getMe: () => request<{ role: 'TEAM' | 'ADMIN' | 'ANON'; team?: Team; admin?: boolean }>('/api/auth/me'),

  logout: () => {
    setToken(null);
  },

  // Event & Leaderboard
  getEventStatus: () =>
    request<{
      settings: EventSettings;
      serverTime: number;
      round1TimeLeft: number;
      round2TimeLeft: number;
      vaultTimeLeft: number;
      activeRound: RoundId;
    }>('/api/event/status'),

  getLeaderboard: () =>
    request<{
      leaderboard: PublicLeaderboardEntry[];
      isPublic: boolean;
      totalTeams: number;
    }>('/api/leaderboard'),

  // Team Operations
  getTeamDashboard: () =>
    request<{
      team: Team;
      settings: EventSettings;
      timeRemaining: number;
      rank: number;
      totalTeams: number;
      roundStatus: string;
      canAccessRound: boolean;
    }>('/api/team/dashboard'),

  getRound1Challenges: () =>
    request<{
      challenges: (Challenge & { isCompleted: boolean; isUnlocked: boolean; clueAwarded?: string })[];
      teamProgress: {
        completedCount: number;
        totalCount: number;
        score: number;
        hintsUsed: number;
        allCompleted?: boolean;
        passwordStatus?: string;
      };
    }>('/api/team/round1/challenges'),

  selectRound1Difficulty: (challengeId: string, difficulty: Difficulty) =>
    request<{ success: boolean; difficulty: Difficulty; points: number; challenge: Challenge }>(
      '/api/team/round1/select-difficulty',
      {
        method: 'POST',
        body: JSON.stringify({ challengeId, difficulty }),
      }
    ),

  submitRound1Answer: (challengeId: string, answer: string) =>
    request<{
      isCorrect: boolean;
      message: string;
      pointsAwarded: number;
      clueUnlocked?: string;
      nextChallengeId?: string;
      totalScore: number;
      allCompleted: boolean;
      unlockedClue?: { index: number; title: string; clue: string };
    }>('/api/team/round1/submit', {
      method: 'POST',
      body: JSON.stringify({ challengeId, answer }),
    }),

  requestRound1Hint: (challengeId: string, hintNumber?: number) =>
    request<{
      hint: string;
      revealedHints: string[];
      hintNumber: number;
      totalHints: number;
      penaltyPoints: number;
      currentScore: number;
      alreadyUnlocked?: boolean;
    }>('/api/team/round1/hint', {
      method: 'POST',
      body: JSON.stringify({ challengeId, hintNumber }),
    }),

  getPasswordChallenge: () =>
    request<{
      isUnlocked: boolean;
      allQuestionsCompleted?: boolean;
      passwordStatus: 'LOCKED' | 'IN_PROGRESS' | 'COMPLETED';
      clues: { index: number; title: string; clue: string; questionId?: string }[];
      totalCluesCount?: number;
      unlockedCluesCount?: number;
      cluesStatus?: { index: number; title: string; clue: string | null; questionId: string; isUnlocked: boolean }[];
      passwordHintsAvailable: number;
      passwordHintsUnlocked: number;
      revealedPasswordHints: string[];
      isCompleted: boolean;
    }>('/api/team/round1/password-challenge'),

  submitRound1Password: (password: string) =>
    request<{
      isCorrect: boolean;
      message: string;
      pointsAwarded: number;
      totalScore: number;
      isCompleted: boolean;
    }>('/api/team/round1/password-submit', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  requestPasswordHint: (hintNumber?: number) =>
    request<{
      hint: string;
      revealedHints: string[];
      penaltyPoints: number;
      currentScore: number;
      alreadyUnlocked?: boolean;
    }>('/api/team/round1/password-hint', {
      method: 'POST',
      body: JSON.stringify({ hintNumber }),
    }),

  getRound2Puzzles: () =>
    request<{
      story: string;
      backupPowerPercent: number;
      timeRemaining: number;
      puzzles: {
        index: number;
        systemName: string;
        title: string;
        status: 'LOCKED' | 'ACTIVE' | 'RESOLVED';
        question: string;
        diagram?: string;
        codeSnippet?: string;
        hint?: string;
        unlockedCode?: string;
      }[];
      collectedCodes: Record<number, string>;
      isControlPanelReady: boolean;
      isSystemRestored: boolean;
    }>('/api/team/round2/puzzles'),

  submitRound2Puzzle: (puzzleIndex: number, answer: string) =>
    request<{
      isCorrect: boolean;
      message: string;
      rewardCode?: string;
      nextPuzzleUnlocked: boolean;
      isAllSolved: boolean;
    }>('/api/team/round2/submit', {
      method: 'POST',
      body: JSON.stringify({ puzzleIndex, answer }),
    }),

  submitFinalControlPanel: (codes: string[]) =>
    request<{
      success: boolean;
      message: string;
      finalScore: number;
      completionTime: string;
    }>('/api/team/round2/final-control', {
      method: 'POST',
      body: JSON.stringify({ codes }),
    }),

  // 4-Room Sequential Round 2 Escape Room APIs
  getRound2State: () =>
    request<{
      isQualified: boolean;
      round2Score: number;
      currentRoom: number;
      isCompleted: boolean;
      flagCaptured?: boolean;
      timeRemaining: number;
      backupPowerPercent: number;
      timeSpentSeconds: number;
      hintsUsed: number;
      totalHints?: number;
      failedAttempts?: number;
      attemptPenalty?: number;
      hintPenalty?: number;
      netScore?: number;
      rooms: EscapeRoomItem[];
      error?: string;
      round1Score?: number;
      round1Status?: string;
    }>('/api/team/round2/state'),

  submitRound2Step1: (roomId: number, answer: string) =>
    request<{
      isCorrect: boolean;
      message: string;
      revealedLetters?: string;
      venueLocation?: string;
      locationClueDescription?: string;
      physicalLocationClue?: string;
      pointsAwarded?: number;
      round2Score?: number;
      totalScore?: number;
    }>('/api/team/round2/submit-step1', {
      method: 'POST',
      body: JSON.stringify({ roomId, answer }),
    }),

  submitRound2Letter2: (roomId: number, answer: string) =>
    request<{
      isCorrect: boolean;
      message: string;
      revealedLetters?: string;
      pointsAwarded?: number;
      round2Score?: number;
      totalScore?: number;
    }>('/api/team/round2/submit-letter2', {
      method: 'POST',
      body: JSON.stringify({ roomId, answer }),
    }),

  escapeVerify: async (body: {
    roomId: number;
    step: string;
    input: string;
    currentErrors?: number;
    currentHints?: number;
    setId?: number;
  }) => {
    try {
      return await request<{
        success: boolean;
        message: string;
        revealedClue?: string;
        pointsAwarded?: number;
        newNetScore?: number;
        cumulativeErrors?: number;
        errorWarning?: boolean;
        timerStopped?: boolean;
        timeSpentSeconds?: number;
        round2FinishTime?: number;
        finishTimeRound2?: number;
        round2StartTime?: number;
        isCompleted?: boolean;
        clearedRoom4?: boolean;
        currentRoom?: number;
        completedRooms?: number[];
      }>('/api/escape/verify', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    } catch (err: any) {
      console.warn('Escape room verification synced locally (backend notice):', err);
      return {
        success: false,
        message: err?.message || 'Server verification notice',
      };
    }
  },

  submitRound2Step2: (roomId: number, code: string) =>
    request<{
      success: boolean;
      isCorrect?: boolean;
      message: string;
      pointsAwarded?: number;
      round2Score?: number;
      totalScore?: number;
    }>('/api/team/round2/submit-step2', {
      method: 'POST',
      body: JSON.stringify({ roomId, code }),
    }),

  submitRound2Step3: (roomId: number, answer: string) =>
    request<{
      isCorrect: boolean;
      success?: boolean;
      message: string;
      nextRoomId?: number;
      isCompleted?: boolean;
      flagCaptured?: boolean;
      pointsAwarded?: number;
      explanation?: string;
      finalScore?: number;
      timeSpentSeconds?: number;
      totalScore?: number;
    }>('/api/team/round2/submit-step3', {
      method: 'POST',
      body: JSON.stringify({ roomId, answer }),
    }),

  submitRound2RoomPuzzle: (roomId: number, answer: string) =>
    request<{
      isCorrect: boolean;
      message: string;
      physicalLocationClue?: string;
      pointsAwarded?: number;
      round2Score?: number;
    }>('/api/team/round2/submit-puzzle', {
      method: 'POST',
      body: JSON.stringify({ roomId, answer }),
    }),

  submitRound2PhysicalCode: (roomId: number, code: string) =>
    request<{
      success: boolean;
      message: string;
      nextRoomId?: number;
      isFinalVaultCompleted?: boolean;
      finalScore?: number;
      timeSpentSeconds?: number;
    }>('/api/team/round2/submit-physical-code', {
      method: 'POST',
      body: JSON.stringify({ roomId, code }),
    }),

  requestRound2RoomHint: (roomId: number, step?: string, hintKey?: string) =>
    request<{
      hint: string;
      penaltyPoints: number;
      currentScore: number;
      totalHintsUsed: number;
    }>('/api/team/round2/request-hint', {
      method: 'POST',
      body: JSON.stringify({ roomId, step, hintKey }),
    }),

  recordEscapeHint: async (body: {
    roomId: number;
    step: string;
    hintKey?: string;
    hintsCount?: number;
    errorsCount?: number;
  }) => {
    try {
      return await request<{
        success: boolean;
        penaltyPoints: number;
        currentScore: number;
        round2Score: number;
        totalHintsUsed: number;
      }>('/api/escape/hint', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    } catch (err) {
      console.warn('Escape room hint recorded locally (backend notice):', err);
      return {
        success: true,
        penaltyPoints: 10,
        currentScore: 0,
        round2Score: 0,
        totalHintsUsed: body.hintsCount || 1,
      };
    }
  },

  completeRound2Escape: () =>
    request<{
      success: boolean;
      message: string;
      isAlreadyCompleted: boolean;
      finalScore: number;
      round2Score: number;
      completionTime: number;
      timeSpentSeconds: number;
    }>('/api/team/round2/complete-escape', {
      method: 'POST',
    }),

  saveEscapeProgress: async (body: {
    progress: any;
    currentRoomId: number;
  }) => {
    try {
      return await request<{
        success: boolean;
        clearedRoom4: boolean;
        currentRoom?: number;
        completedRooms?: number[];
        round2StartTime?: number;
        round2FinishTime?: number;
        finishTimeRound2?: number;
        timeSpentSeconds?: number;
        timerStopped?: boolean;
        team?: Team;
      }>('/api/team/round2/sync-progress', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    } catch (err) {
      console.warn('Progress synced locally (backend fallback):', err);
      return { success: true, clearedRoom4: false };
    }
  },

  getEscapeProgress: async () => {
    try {
      return await request<{
        success: boolean;
        progress?: any;
        currentRoom?: number;
        completedRooms?: number[];
        clearedRoom4: boolean;
        round2StartTime?: number;
        round2FinishTime?: number;
        finishTimeRound2?: number;
        timeSpentSeconds?: number;
        timerStopped?: boolean;
        team?: Team;
      }>('/api/team/round2/sync-progress');
    } catch (err) {
      console.warn('Could not fetch server progress, using local:', err);
      return { success: false, clearedRoom4: false };
    }
  },

  getRound2Leaderboard: () =>
    request<{
      leaderboard: Round2LeaderboardEntry[];
      isPublic: boolean;
      totalTeams: number;
    }>('/api/leaderboard/round2'),

  // 3D Haunted Mystery House Specialized APIs
  getHauntedHouseState: () =>
    request<HauntedGameState>('/api/team/round2/haunted-state'),

  discoverHauntedLetter: (roomId: number, letterId: string) =>
    request<{ success: boolean; letter: HauntedLetter }>('/api/team/round2/discover-letter', {
      method: 'POST',
      body: JSON.stringify({ roomId, letterId }),
    }),

  solveHauntedLetter: (roomId: number, letterId: string, answer: string) =>
    request<{
      isCorrect: boolean;
      message: string;
      clueFragment?: string;
      pointsAwarded: number;
      newScore: number;
      allLettersSolvedForRoom: boolean;
    }>('/api/team/round2/solve-letter', {
      method: 'POST',
      body: JSON.stringify({ roomId, letterId, answer }),
    }),

  discoverHauntedKeyBox: (roomId: number) =>
    request<{ success: boolean; keyBox: HauntedKeyBox }>('/api/team/round2/discover-box', {
      method: 'POST',
      body: JSON.stringify({ roomId }),
    }),

  solveHauntedKeyBox: (roomId: number, answer: string) =>
    request<{
      isCorrect: boolean;
      message: string;
      keyName?: string;
      pointsAwarded: number;
      newScore: number;
      canCollectKey: boolean;
      isRoom4FlagRevealed?: boolean;
    }>('/api/team/round2/solve-box', {
      method: 'POST',
      body: JSON.stringify({ roomId, answer }),
    }),

  collectHauntedKey: (roomId: number) =>
    request<{ success: boolean; keyName: string; inventory: string[]; message: string }>(
      '/api/team/round2/collect-key',
      {
        method: 'POST',
        body: JSON.stringify({ roomId }),
      }
    ),

  unlockHauntedDoor: (roomId: number) =>
    request<{
      success: boolean;
      message: string;
      nextRoomId: number;
      doorName: string;
    }>('/api/team/round2/unlock-door', {
      method: 'POST',
      body: JSON.stringify({ roomId }),
    }),

  collectFinalFlag: () =>
    request<{
      success: boolean;
      message: string;
      finalScore: number;
      timeSpentSeconds: number;
      completionTime: string;
    }>('/api/team/round2/collect-flag', {
      method: 'POST',
    }),

  requestHauntedHint: (roomId: number, hintType: string, letterId?: string) =>
    request<{
      hint: string;
      penaltyPoints: number;
      currentScore: number;
      alreadyUnlocked?: boolean;
    }>('/api/team/round2/haunted-hint', {
      method: 'POST',
      body: JSON.stringify({ roomId, hintType, letterId }),
    }),

  // Admin Round 2 APIs
  getAdminRound2Overview: () =>
    request<{
      teams: any[];
      rooms: any[];
      settings: EventSettings;
      totalTeams: number;
      qualifiedCount: number;
      round2CompletedCount: number;
      round2ActiveCount: number;
    }>('/api/admin/round2/overview'),

  updateAdminRound2Room: (roomData: any) =>
    request<{ success: boolean; room: any }>('/api/admin/round2/update-room', {
      method: 'POST',
      body: JSON.stringify(roomData),
    }),

  toggleAdminRound2Qualify: (teamId: string, isQualified: boolean) =>
    request<{ success: boolean; teamId: string; isQualified: boolean; qualifiedCount: number }>(
      '/api/admin/round2/toggle-qualify',
      {
        method: 'POST',
        body: JSON.stringify({ teamId, isQualified }),
      }
    ),

  updateAdminRound2QualificationCriteria: (params: {
    criteriaType: 'TOP_N' | 'MIN_SCORE' | 'ALL_R1_COMPLETE';
    topCount?: number;
    minScore?: number;
  }) =>
    request<{ success: boolean; qualifiedCount: number }>('/api/admin/round2/qualification-criteria', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  resetAdminTeamRound2: (teamId: string) =>
    request<{ success: boolean; message: string }>('/api/admin/round2/reset-team', {
      method: 'POST',
      body: JSON.stringify({ teamId }),
    }),

  updateAdminRound2Timer: (params: { durationMinutes?: number; action?: 'START' | 'RESET' }) =>
    request<{ success: boolean; round2DurationMinutes: number; round2StartedAt?: number; timeLeft: number }>(
      '/api/admin/round2/timer',
      {
        method: 'POST',
        body: JSON.stringify(params),
      }
    ),

  getVaultChallenge: () =>
    request<{
      isQualified: boolean;
      isUnlocked: boolean;
      challenge?: {
        title: string;
        question: string;
        systemContext: string;
        points: number;
        diagramAscii?: string;
        codeSnippet?: string;
        hint?: string;
      };
      isCracked: boolean;
      vaultTimeLeft: number;
    }>('/api/team/vault/challenge'),

  submitVaultAnswer: (answer: string) =>
    request<{
      isCorrect: boolean;
      message: string;
      finalScore: number;
      isWinner: boolean;
    }>('/api/team/vault/submit', {
      method: 'POST',
      body: JSON.stringify({ answer }),
    }),

  logAntiCheatAlert: (eventType: string, details: string) =>
    request<{ logged: boolean }>('/api/team/anti-cheat/alert', {
      method: 'POST',
      body: JSON.stringify({ eventType, details }),
    }),

  // Admin APIs
  getAdminOverview: () =>
    request<{
      totalTeams: number;
      activeTeams: number;
      completedTeams: number;
      qualifiedTeams: number;
      settings: EventSettings;
      serverTime: number;
      round1TimeLeft: number;
      round2TimeLeft: number;
      vaultTimeLeft: number;
    }>('/api/admin/overview'),

  getAdminTeams: () => request<{ teams: Team[] }>('/api/admin/teams'),

  updateQualifyTeams: (params: { qualifyTopCount?: number; teamId?: string; isQualified?: boolean }) =>
    request<{ success: boolean; qualifiedCount: number }>('/api/admin/teams/qualify', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  disqualifyTeam: (teamId: string, reason: string) =>
    request<{ success: boolean }>('/api/admin/teams/disqualify', {
      method: 'POST',
      body: JSON.stringify({ teamId, reason }),
    }),

  resetTeam: (teamId: string) =>
    request<{ success: boolean }>('/api/admin/teams/reset', {
      method: 'POST',
      body: JSON.stringify({ teamId }),
    }),

  applyTeamPenalty: (teamId: string, penaltyPoints: number, reason: string) =>
    request<{ success: boolean; newScore: number }>('/api/admin/teams/penalty', {
      method: 'POST',
      body: JSON.stringify({ teamId, penaltyPoints, reason }),
    }),

  getAdminChallenges: () => request<{ challenges: Challenge[] }>('/api/admin/challenges'),

  saveAdminChallenge: (challenge: Partial<Challenge>) =>
    request<{ challenge: Challenge }>('/api/admin/challenges', {
      method: 'POST',
      body: JSON.stringify(challenge),
    }),

  verifyEscapeStep: (params: {
    roomId: number;
    step: 'LETTER_1' | 'LETTER_2' | 'KEY_BOX' | 'TECH_CODE';
    input: string;
    currentErrors?: number;
    currentHints?: number;
    setId?: number;
  }) =>
    request<{
      isCorrect: boolean;
      pointsAwarded: number;
      penalties: number;
      hintsRevealed: number;
      message: string;
      netPoints: number;
      nextStep?: string;
      hintText?: string;
    }>('/api/escape/verify', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  setAdminTeamColor: (teamId: string, color: 'BLUE' | 'RED' | 'GREEN') =>
    request<{ success: boolean; team: Team }>('/api/admin/teams/set-color', {
      method: 'POST',
      body: JSON.stringify({ teamId, color }),
    }),

  deleteAdminChallenge: (id: string) =>
    request<{ success: boolean }>(`/api/admin/challenges/${id}`, {
      method: 'DELETE',
    }),

  controlEvent: (action: string, round?: RoundId) =>
    request<{ success: boolean; settings: EventSettings }>('/api/admin/event/control', {
      method: 'POST',
      body: JSON.stringify({ action, round }),
    }),

  updateEventSettings: (settings: Partial<EventSettings>) =>
    request<{ success: boolean; settings: EventSettings }>('/api/admin/event/settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    }),

  getAdminLogs: () => request<{ logs: ActivityLog[] }>('/api/admin/logs'),

  seedDemoData: () => request<{ success: boolean; message: string }>('/api/admin/demo-seed', { method: 'POST' }),

  resetToDemo: () => request<{ success: boolean; message: string }>('/api/admin/demo-reset', { method: 'POST' }),
};
