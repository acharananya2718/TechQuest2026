import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import {
  Volume2,
  VolumeX,
  Eye,
  Crosshair,
  HelpCircle,
  Trophy,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Key,
  Layers,
  ArrowRight,
  ArrowLeft,
  Lightbulb,
  RefreshCw,
  Terminal,
  FileText,
  X,
  Maximize2,
  Minimize2,
  Sparkles,
  Shield,
  Clock,
  Compass,
  Settings,
  Hand,
  RotateCcw,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ROOMS_CONFIG, getRoomsConfigForSet, RoomConfig, RoomInteractableDef } from './roomsData.ts';
import { getSetIdForColor, QuestionSetId } from './questionSets.ts';
import { TeamColorDot } from '../components/TeamColorDot.tsx';
import {
  verify,
  computeNetScore,
  BASE_SCORE,
  RoomStep,
  AUTHORITATIVE_ROOMS,
} from './verify.ts';
import {
  createRustedMetalTexture,
  createBrickMasonryTexture,
  createDampConcreteTexture,
  createWeatheredWoodTexture,
  createHazardStripesTexture,
  createOscilloscopeTexture,
  createCRTTerminalTexture,
} from './proceduralTextures.ts';
import { escapeAudio } from './audioEngine.ts';
import { EscapePhysicsWorld, PhysicsObjectBinding } from './physicsWorld.ts';
import { HighVoltageCircuit } from './HighVoltageCircuit.tsx';
import { VictoryScreen } from '../components/VictoryScreen.tsx';
import { api } from '../utils/api.ts';

interface InventoryItem {
  id: string;
  name: string;
  type: 'NOTE' | 'KEY' | 'TOOL';
  icon: string;
  description: string;
}

interface GameProgress {
  currentRoomId: number;
  netScore: number;
  cumulativeErrors: number;
  hintsUsedCount: number;
  unlockedHints: Record<string, boolean>; // key: `${roomId}_${step}`
  physicalVenueMode: boolean;

  // Per-room state:
  roomStates: Record<
    number,
    {
      letter1Found: boolean;
      letter1Solved: boolean;
      letter2Found: boolean;
      letter2Solved: boolean;
      circuitSolved?: boolean;
      physicalKeyVerified?: boolean;
      techSolved: boolean;
      doorUnbolted: boolean;
      timeSpentSeconds: number;
      mattressFlipped?: boolean;
      breakerDoorOpen?: boolean;
      tvMoved?: boolean;
      deskDrawerOpen?: boolean;
      scopeMatMoved?: boolean;
      wallClockTaken?: boolean;
      cableCoverLifted?: boolean;
      fanGuardRemoved?: boolean;
      ladderPlaced?: boolean;
      ropeCut?: boolean;
      batteryDrawerPulled?: boolean;
      diagnosticDrawerPulled?: boolean;
      trenchHatchOpen?: boolean;
      cryoValveVented?: boolean;
      bladeSledEjected?: boolean;
      safetyCabinetOpen?: boolean;
      laserCalibrated?: boolean;
      biometricScanned?: boolean;
    }
  >;

  inventory: InventoryItem[];
  objectiveLog: string[];
  round2StartTime?: number;
  round2FinishTime?: number;
  officialTimeSpentSeconds?: number;
  timerStopped?: boolean;
}

const STORAGE_KEY = 'TECH_QUEST_ESCAPE_SIMULATOR_PROGRESS_V2';

const DEFAULT_PROGRESS: GameProgress = {
  currentRoomId: 1,
  netScore: BASE_SCORE,
  cumulativeErrors: 0,
  hintsUsedCount: 0,
  unlockedHints: {},
  physicalVenueMode: false,
  timerStopped: false,
  roomStates: {
    1: {
      letter1Found: false,
      letter1Solved: false,
      letter2Found: false,
      letter2Solved: false,
      techSolved: false,
      doorUnbolted: false,
      timeSpentSeconds: 0,
      mattressFlipped: false,
      breakerDoorOpen: false,
      tvMoved: false,
    },
    2: {
      letter1Found: false,
      letter1Solved: false,
      letter2Found: false,
      letter2Solved: false,
      techSolved: false,
      doorUnbolted: false,
      timeSpentSeconds: 0,
      deskDrawerOpen: false,
      scopeMatMoved: false,
      wallClockTaken: false,
    },
    3: {
      letter1Found: false,
      letter1Solved: false,
      letter2Found: false,
      letter2Solved: false,
      circuitSolved: false,
      techSolved: false,
      doorUnbolted: false,
      timeSpentSeconds: 0,
      cableCoverLifted: false,
      fanGuardRemoved: false,
      ladderPlaced: false,
      ropeCut: false,
    },
    4: {
      letter1Found: false,
      letter1Solved: false,
      letter2Found: false,
      letter2Solved: false,
      techSolved: false,
      doorUnbolted: false,
      timeSpentSeconds: 0,
      batteryDrawerPulled: false,
      diagnosticDrawerPulled: false,
      trenchHatchOpen: false,
      cryoValveVented: false,
      bladeSledEjected: false,
      safetyCabinetOpen: false,
      laserCalibrated: false,
      biometricScanned: false,
    },
  },
  inventory: [],
  objectiveLog: ['Entered detention cell. Search the room for clues and tools.'],
};

// Spatial Furniture Obstacles per room to prevent camera and player from clipping into props
const ROOM_OBSTACLES: Record<number, Array<{ minX: number; maxX: number; minZ: number; maxZ: number }>> = {
  // Room 1: The Discovery (Bunk Bed & CRT Table)
  1: [
    { minX: -3.4, maxX: -1.6, minZ: -4.2, maxZ: -0.8 }, // Iron Bunk Bed Frame
    { minX: -3.5, maxX: -2.1, minZ: 2.5, maxZ: 3.9 },   // CRT Television Table
  ],
  // Room 2: The Decoder (Officer Desk & Oscilloscope Bench)
  2: [
    { minX: -2.7, maxX: -1.3, minZ: -2.6, maxZ: -1.4 }, // Officer Desk
    { minX: 1.6, maxX: 2.8, minZ: -2.7, maxZ: -1.7 },   // Oscilloscope Workbench
  ],
  // Room 3: The System (Utility Storage Locker & Relay Racks)
  3: [
    { minX: -4.2, maxX: -3.2, minZ: -4.2, maxZ: -2.8 }, // Maintenance Tool Locker
  ],
  // Room 4: The Final Vault (Server Racks, Diagnostic Bench, SCADA Console, Cryo Tanks, Transformer, Laser Pedestal, Tool Trolley, Safety Cabinet)
  4: [
    { minX: -3.1, maxX: -1.9, minZ: -0.6, maxZ: 0.6 },   // Server Rack 04
    { minX: -3.1, maxX: -1.9, minZ: -2.4, maxZ: -1.2 },  // Supercomputer Server Rack 03
    { minX: -3.1, maxX: -2.3, minZ: -4.1, maxZ: -2.9 },  // Mainframe Server Rack 02 (adjusted so player can step closer to drive sled)
    { minX: -1.3, maxX: 1.3, minZ: -2.5, maxZ: -1.1 },   // Central SCADA Console Desk
    { minX: 2.7, maxX: 4.1, minZ: -3.2, maxZ: -1.8 },   // Diagnostic Test Bench
    { minX: 1.2, maxX: 2.4, minZ: -4.4, maxZ: -3.2 },   // Maintenance Tool Trolley
    { minX: 2.8, maxX: 4.4, minZ: 1.0, maxZ: 2.6 },     // Cryo-Coolant Nitrogen Tanks
    { minX: 3.0, maxX: 4.2, minZ: -0.4, maxZ: 0.8 },    // Hydraulic Accumulator Bank
    { minX: 1.4, maxX: 3.0, minZ: -5.8, maxZ: -5.0 },   // High-Voltage Transformer Bank
    { minX: -1.0, maxX: -0.2, minZ: -5.8, maxZ: -5.35 }, // Emergency Safety Cabinet (adjusted so player can step closer to cabinet interior)
    { minX: -3.8, maxX: -3.0, minZ: 2.7, maxZ: 3.7 },   // Laser Collimator Pedestal
    { minX: -2.2, maxX: -1.4, minZ: 4.6, maxZ: 5.4 },   // Biometric Scanner Pedestal
  ],
};

interface EscapeMemoirsGameProps {
  onNavigate: (path: string) => void;
  teamName: string;
  teamColor?: 'BLUE' | 'RED' | 'GREEN' | string;
  teamId?: string;
  team?: any;
  onRefreshTeam?: () => void;
}

export const EscapeMemoirsGame: React.FC<EscapeMemoirsGameProps> = ({
  onNavigate,
  teamName,
  teamColor = 'BLUE',
  teamId,
  team,
  onRefreshTeam,
}) => {
  // Canvas & Three.js refs
  const gameViewportRef = useRef<HTMLDivElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animFrameId = useRef<number | null>(null);
  const physicsWorldRef = useRef<EscapePhysicsWorld | null>(null);

  // First-Person Player Kinematics (Smoothed Velocity & Damped Look)
  const playerPos = useRef<THREE.Vector3>(new THREE.Vector3(0, 1.65, 0));
  const playerVelocity = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const horizontalVelocity = useRef<THREE.Vector2>(new THREE.Vector2(0, 0));
  const isGrounded = useRef<boolean>(true);
  const isCrouching = useRef<boolean>(false);
  const currentEyeHeight = useRef<number>(1.65);
  const targetEyeHeight = useRef<number>(1.65);
  const footstepAccumulator = useRef<number>(0);

  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const cameraPitch = useRef<number>(0);
  const cameraYaw = useRef<number>(0);
  const targetPitch = useRef<number>(0);
  const targetYaw = useRef<number>(0);
  const isPointerLocked = useRef<boolean>(false);

  // Escape Simulator: Held Object & Throw System
  const heldBindingRef = useRef<PhysicsObjectBinding | null>(null);
  const carryDistanceRef = useRef<number>(1.2);
  const heldRotationRef = useRef<THREE.Euler>(new THREE.Euler(0, 0, 0, 'YXZ'));
  const isRotatingHeldRef = useRef<boolean>(false);
  const isChargingThrowRef = useRef<boolean>(false);
  const throwChargeStartRef = useRef<number>(0);
  const [throwMeterPercent, setThrowMeterPercent] = useState<number>(0);

  // Settings
  const [mouseSensitivity, setMouseSensitivity] = useState<number>(1.0);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showAdminModal, setShowAdminModal] = useState<boolean>(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState<string>('');
  const [adminAuthenticated, setAdminAuthenticated] = useState<boolean>(false);

  // Storage Key keyed strictly by team ID so squad progress never collides or falls back to dirty cache
  const storageKey = teamId ? `TECH_QUEST_ESCAPE_PROGRESS_${teamId}` : 'TECH_QUEST_ESCAPE_PROGRESS_GUEST';

  // Persistent Progress (Initial load merges verified team server data + team local storage)
  const [progress, setProgress] = useState<GameProgress>(() => {
    try {
      // Clear legacy contaminated shared key if present in browser
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}

      const serverProgress = team?.round2EscapeProgress;
      const savedLocal = localStorage.getItem(storageKey);
      const parsed = serverProgress || (savedLocal ? JSON.parse(savedLocal) : null);

      // Compute sequential verified completed rooms from authoritative team state
      const verifiedRooms: number[] = [];
      const rawCompleted = Array.isArray(team?.round2CompletedRooms) ? team.round2CompletedRooms : [];
      for (let r = 1; r <= 4; r++) {
        const isStep3Completed = Boolean(team?.round2Step3Completed?.[r]);
        const inRaw = rawCompleted.includes(r);
        if (isStep3Completed || inRaw) {
          if (r === 1 || verifiedRooms.includes(r - 1)) {
            verifiedRooms.push(r);
          } else {
            break;
          }
        } else {
          break;
        }
      }

      const maxAccessible = Math.min(4, verifiedRooms.length + 1);

      if (parsed) {
        const cleanScore = computeNetScore(
          BASE_SCORE,
          parsed.cumulativeErrors || 0,
          parsed.hintsUsedCount || 0
        );
        const seenIds = new Set<string>();
        const uniqueInventory = (parsed.inventory || []).filter((item: InventoryItem) => {
          if (!item || !item.id || seenIds.has(item.id)) return false;
          seenIds.add(item.id);
          return true;
        });

        const mergedRoomStates = {
          ...DEFAULT_PROGRESS.roomStates,
        };

        // Only incorporate rooms from parsed state up to maxAccessible
        for (let r = 1; r <= 4; r++) {
          const isCompleted = verifiedRooms.includes(r);
          const pRoom = (parsed.roomStates && parsed.roomStates[r]) || {};
          mergedRoomStates[r] = {
            ...DEFAULT_PROGRESS.roomStates[r],
            ...pRoom,
            techSolved: isCompleted,
            doorUnbolted: isCompleted,
            letter1Solved: isCompleted || Boolean(pRoom.letter1Solved && r <= maxAccessible),
            letter2Solved: isCompleted || Boolean(pRoom.letter2Solved && r <= maxAccessible),
            physicalKeyVerified: isCompleted || Boolean(pRoom.physicalKeyVerified && r <= maxAccessible),
          };
        }

        // Clamp effective room strictly: new teams with 0 verified completions start at Room 1
        const rawRequested = parsed.currentRoomId || team?.round2CurrentRoom || 1;
        const effectiveRoomId = Math.min(maxAccessible, Math.max(1, rawRequested));

        return {
          ...DEFAULT_PROGRESS,
          ...parsed,
          currentRoomId: effectiveRoomId,
          roomStates: mergedRoomStates,
          inventory: uniqueInventory,
          netScore: cleanScore,
        };
      } else {
        // Fresh start: Room 1, 0 rooms cleared
        const initialRoomStates = { ...DEFAULT_PROGRESS.roomStates };
        verifiedRooms.forEach((r) => {
          if (initialRoomStates[r]) {
            initialRoomStates[r].techSolved = true;
            initialRoomStates[r].doorUnbolted = true;
          }
        });

        return {
          ...DEFAULT_PROGRESS,
          currentRoomId: maxAccessible,
          roomStates: initialRoomStates,
        };
      }
    } catch (e) {
      console.warn('Error reading stored escape progress:', e);
    }
    return DEFAULT_PROGRESS;
  });

  const progressRef = useRef<GameProgress>(progress);

  // Official Round 2 Timer (Requirement 1, 2, 3, 4, 5, 6, 7, 8)
  const isRoom4AlreadyCleared = Boolean(
    team?.clearedRoom4 ||
    team?.room4Cleared ||
    team?.round2FinishTime ||
    team?.finishTimeRound2 ||
    (team?.round2Step3Completed && team.round2Step3Completed[4]) ||
    progress.timerStopped ||
    progress.roomStates[4]?.techSolved
  );

  const initialElapsedTime = (team?.round2TimeSpentSeconds && team.round2TimeSpentSeconds > 0)
    ? team.round2TimeSpentSeconds
    : (progress.officialTimeSpentSeconds && progress.officialTimeSpentSeconds > 0)
    ? progress.officialTimeSpentSeconds
    : (team?.round2FinishTime && team?.round2StartTime && team.round2FinishTime >= team.round2StartTime)
    ? Math.round((team.round2FinishTime - team.round2StartTime) / 1000)
    : (team?.round2StartTime)
    ? Math.max(0, Math.floor((Date.now() - team.round2StartTime) / 1000))
    : (progress.round2StartTime)
    ? Math.max(0, Math.floor((Date.now() - progress.round2StartTime) / 1000))
    : 0;

  const [round2ElapsedSeconds, setRound2ElapsedSeconds] = useState<number>(initialElapsedTime);
  const [isTimerFrozen, setIsTimerFrozen] = useState<boolean>(isRoom4AlreadyCleared);
  const isTimerFrozenRef = useRef<boolean>(isRoom4AlreadyCleared);
  const round2StartTimeRef = useRef<number>(team?.round2StartTime || progress.round2StartTime || Date.now());

  // Instant and Automatic Save to local storage AND backend server
  const saveProgressInstantly = useCallback((targetProgress?: GameProgress) => {
    const p = targetProgress || progressRef.current;
    if (!p) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(p));
    } catch {}

    api.saveEscapeProgress({
      progress: p,
      currentRoomId: p.currentRoomId,
    }).then((res) => {
      if (res && res.clearedRoom4 && onRefreshTeam) {
        onRefreshTeam();
      }
    }).catch((err) => console.warn('Instant escape progress sync notice:', err));
  }, [storageKey, onRefreshTeam]);

  // Sync to progressRef and trigger instant save whenever progress updates
  useEffect(() => {
    progressRef.current = progress;
    saveProgressInstantly(progress);
  }, [progress, saveProgressInstantly]);

  // Restore latest cloud progress on mount if server has newer progress
  useEffect(() => {
    api.getEscapeProgress().then((res) => {
      if (res && res.success) {
        if (res.round2StartTime) {
          round2StartTimeRef.current = res.round2StartTime;
        }

        // If Room 4 was cleared or timer stopped on server, freeze immediately!
        if (res.clearedRoom4 || res.timerStopped || res.round2FinishTime) {
          isTimerFrozenRef.current = true;
          setIsTimerFrozen(true);
          if (typeof res.timeSpentSeconds === 'number' && res.timeSpentSeconds > 0) {
            setRound2ElapsedSeconds(res.timeSpentSeconds);
          }
        } else if (!isTimerFrozenRef.current) {
          if (typeof res.timeSpentSeconds === 'number' && res.timeSpentSeconds > round2ElapsedSeconds) {
            setRound2ElapsedSeconds(res.timeSpentSeconds);
          }
        }

        const verifiedRooms: number[] = Array.isArray(res.completedRooms) ? res.completedRooms : [];
        const maxAccessible = Math.min(4, verifiedRooms.length + 1);
        const serverCurRoom = typeof res.currentRoom === 'number' ? Math.min(maxAccessible, Math.max(1, res.currentRoom)) : 1;

        setProgress((prev) => {
          const srv = res.progress || {};
          const mergedRooms = { ...prev.roomStates };

          for (let r = 1; r <= 4; r++) {
            const isCompleted = verifiedRooms.includes(r);
            const prevR = mergedRooms[r] || {};
            const srvR = (srv.roomStates && srv.roomStates[r]) || {};

            mergedRooms[r] = {
              ...prevR,
              ...srvR,
              techSolved: isCompleted,
              doorUnbolted: isCompleted,
              letter1Solved: isCompleted || Boolean(prevR.letter1Solved || srvR.letter1Solved),
              letter2Solved: isCompleted || Boolean(prevR.letter2Solved || srvR.letter2Solved),
              physicalKeyVerified: isCompleted || Boolean(prevR.physicalKeyVerified || srvR.physicalKeyVerified),
            };
          }

          const targetRoom = Math.min(maxAccessible, Math.max(1, prev.currentRoomId || serverCurRoom));
          return {
            ...prev,
            ...srv,
            roomStates: mergedRooms,
            currentRoomId: targetRoom,
          };
        });
      }
    }).catch(() => {});
  }, []);

  // Save automatically and instantly even if users press browser back button, close tab, or navigate away
  useEffect(() => {
    const handleBeforeUnload = () => {
      const p = progressRef.current;
      if (p) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(p));
          if (navigator.sendBeacon) {
            const blob = new Blob([JSON.stringify({ progress: p, currentRoomId: p.currentRoomId })], {
              type: 'application/json',
            });
            navigator.sendBeacon('/api/team/round2/sync-progress', blob);
          }
        } catch {}
      }
    };

    const handlePopState = () => {
      saveProgressInstantly(progressRef.current);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
      saveProgressInstantly(progressRef.current);
    };
  }, [saveProgressInstantly, storageKey]);

  // Navigate back to Dashboard handler with guaranteed instant save
  const handleGoBack = () => {
    saveProgressInstantly(progressRef.current);
    if (onRefreshTeam) onRefreshTeam();
    onNavigate('/dashboard');
  };

  // Switch room with strict sequential access guard (allows visiting any already unlocked/cleared room)
  const switchRoom = (targetRoomId: number) => {
    if (targetRoomId === progress.currentRoomId) return;

    // Strict sequential unlocking check:
    // Room 1 is always unlocked. Room N requires Room N-1 to be completed (techSolved and doorUnbolted)
    const isUnlocked = targetRoomId === 1 || Boolean(
      progress.roomStates[targetRoomId - 1]?.techSolved &&
      progress.roomStates[targetRoomId - 1]?.doorUnbolted
    );

    if (!isUnlocked) {
      escapeAudio.playErrorBuzz();
      return;
    }

    saveProgressInstantly(progressRef.current);
    escapeAudio.playFootstep();
    setProgress((prev) => ({
      ...prev,
      currentRoomId: targetRoomId,
      objectiveLog: [
        `Navigated to Room ${targetRoomId}: ${ROOMS_CONFIG[targetRoomId]?.roomName || 'Chamber'}.`,
        ...prev.objectiveLog,
      ].slice(0, 10),
    }));
  };

  // Current Room Configuration for assigned question set
  const teamSetId: QuestionSetId =
    team?.assignedSet === 'SET_2'
      ? 2
      : team?.assignedSet === 'SET_3'
      ? 3
      : getSetIdForColor(teamColor || team?.color);
  const roomsConfig = getRoomsConfigForSet(teamSetId);
  const roomConfig = roomsConfig[progress.currentRoomId] || roomsConfig[1];

  // Hovered target
  const [hoveredPrompt, setHoveredPrompt] = useState<{
    text: string;
    subText?: string;
    isPickable?: boolean;
    isContainer?: boolean;
    isInteractable?: boolean;
  } | null>(null);
  const hoveredTargetRef = useRef<RoomInteractableDef | null>(null);
  const hoveredPhysicsBindingRef = useRef<PhysicsObjectBinding | null>(null);

  // Modals & Active Screens
  const [activeNoteModal, setActiveNoteModal] = useState<{
    step: 'LETTER_1' | 'LETTER_2';
    title: string;
    storyLocation: string;
    code: string;
    paperText: string;
    puzzleQuestion: string;
    revealClue: string;
    hint: string;
  } | null>(null);

  const [activeKeyBoxTerminal, setActiveKeyBoxTerminal] = useState<boolean>(false);
  const [activeCircuitPanel, setActiveCircuitPanel] = useState<boolean>(false);
  const [activeNotesMenu, setActiveNotesMenu] = useState<boolean>(false);
  const [showHintsOverviewModal, setShowHintsOverviewModal] = useState<boolean>(false);
  const [activeHintConfirmModal, setActiveHintConfirmModal] = useState<{
    step: RoomStep;
    puzzleTitle: string;
    hintText: string;
  } | null>(null);
  const [revealedHintModal, setRevealedHintModal] = useState<{
    puzzleTitle: string;
    hintText: string;
    isNewUnlock?: boolean;
  } | null>(null);
  const [showVictoryModal, setShowVictoryModal] = useState<boolean>(false);

  // Close-Up 3D Combination Lock Modal
  const [activeComboLock, setActiveComboLock] = useState<{
    targetCode: string;
    currentDials: number[];
    title: string;
    onSuccess: () => void;
  } | null>(null);

  // Submission inputs & feedbacks
  const [puzzleInput, setPuzzleInput] = useState<string>('');
  const [puzzleFeedback, setPuzzleFeedback] = useState<{ success?: boolean; message: string } | null>(null);
  const [keyBoxInput, setKeyBoxInput] = useState<string>('');
  const [venueKeyInput, setVenueKeyInput] = useState<string>('');
  const [keyBoxFeedback, setKeyBoxFeedback] = useState<{ success?: boolean; message: string } | null>(null);
  const [selectedInventorySlot, setSelectedInventorySlot] = useState<number | null>(null);

  // References and guards to prevent stray interaction key (e.g. 'E') from leaking into answer inputs
  const noteInputRef = useRef<HTMLInputElement | null>(null);
  const keyBoxInputRef = useRef<HTMLInputElement | null>(null);
  const suppressStrayERef = useRef<boolean>(false);

  useEffect(() => {
    if (activeNoteModal) {
      suppressStrayERef.current = true;
      setPuzzleInput('');
      const timer = setTimeout(() => {
        noteInputRef.current?.focus();
        suppressStrayERef.current = false;
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [activeNoteModal]);

  useEffect(() => {
    if (activeKeyBoxTerminal) {
      suppressStrayERef.current = true;
      setKeyBoxInput('');
      const timer = setTimeout(() => {
        keyBoxInputRef.current?.focus();
        suppressStrayERef.current = false;
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [activeKeyBoxTerminal]);

  // Audio mute state
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Meshes Registry
  const dynamicMeshes = useRef<{
    mattress?: THREE.Mesh;
    breakerDoor?: THREE.Mesh;
    tv?: THREE.Mesh;
    deskDrawer?: THREE.Mesh;
    scopeMat?: THREE.Mesh;
    wallClock?: THREE.Mesh;
    cableCover?: THREE.Mesh;
    fanBlades?: THREE.Mesh;
    fanGuard?: THREE.Mesh;
    ceilingHatch?: THREE.Mesh;
    ladder?: THREE.Mesh;
    vaultDoorGears?: THREE.Mesh;
    vaultDoor?: THREE.Group;
    vaultDoorPivot?: THREE.Group;
    dustParticles?: THREE.Points;
    ceilingLamp?: THREE.PointLight;
    batteryDrawer?: THREE.Mesh;
    batteryLetter2?: THREE.Mesh;
    diagnosticDrawer?: THREE.Mesh;
    diagnosticLetter1?: THREE.Mesh;
    trenchHatch?: THREE.Mesh;
    trenchLetter2?: THREE.Mesh;
    cryoValve?: THREE.Mesh;
    rack2Sled?: THREE.Mesh;
    rack2Letter1?: THREE.Group | THREE.Mesh;
    safetyCabinetDoor?: THREE.Mesh;
    safetyLetter2?: THREE.Group | THREE.Mesh;
    laserBeam?: THREE.Mesh;
    laserHalo?: THREE.Mesh;
    biometricPlate?: THREE.Mesh;
  }>({});

  const doorOpeningAnimationRef = useRef<{
    active: boolean;
    startTime: number;
    duration: number;
    completed: boolean;
  }>({
    active: false,
    startTime: 0,
    duration: 2700,
    completed: false,
  });

  const targetMeshMap = useRef<Map<THREE.Object3D, RoomInteractableDef>>(new Map());

  // Background Audio Drone
  useEffect(() => {
    if (soundEnabled) {
      escapeAudio.startAmbientDrone();
    } else {
      escapeAudio.stopAmbientDrone();
    }
    return () => {
      escapeAudio.stopAmbientDrone();
    };
  }, [soundEnabled]);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    escapeAudio.setMuted(!next);
  };

  // Add an entry to the Objective Log
  const logObjective = useCallback((text: string) => {
    setProgress((prev) => {
      if (prev.objectiveLog.includes(text)) return prev;
      return {
        ...prev,
        objectiveLog: [text, ...prev.objectiveLog].slice(0, 10),
      };
    });
  }, []);

  // Continuous Round 2 timer throughout Escape Room (all rooms, clues, and technical questions)
  // Stops and freezes immediately when Technical Question No. 4 is cleared.
  useEffect(() => {
    if (isTimerFrozen) return;

    const interval = setInterval(() => {
      if (isTimerFrozenRef.current) {
        clearInterval(interval);
        return;
      }

      setRound2ElapsedSeconds((prev) => {
        if (isTimerFrozenRef.current) return prev;
        const start = round2StartTimeRef.current;
        if (start && start > 0) {
          const calc = Math.floor((Date.now() - start) / 1000);
          return Math.max(prev + 1, calc);
        }
        return prev + 1;
      });

      // Keep per-room active time for diagnostic reference if not frozen
      setProgress((prev) => {
        if (isTimerFrozenRef.current) return prev;
        const cur = prev.currentRoomId;
        const roomState = prev.roomStates[cur] || { timeSpentSeconds: 0 };
        return {
          ...prev,
          roomStates: {
            ...prev.roomStates,
            [cur]: {
              ...roomState,
              timeSpentSeconds: (roomState.timeSpentSeconds || 0) + 1,
            },
          },
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerFrozen]);

  // ==========================================================================
  // INITIALIZE THREE.JS & CANNON-ES SCENE
  // ==========================================================================
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 560;

    // 1. Scene & Atmospheric Daylight Setting
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x384a5e);
    scene.fog = new THREE.Fog(0x384a5e, 22, 65);

    // 2. Camera & Kinematics Initial State: 80° FOV, Level Horizon, 1.65m Eye Height
    const camera = new THREE.PerspectiveCamera(80, width / height, 0.08, 100);
    cameraRef.current = camera;
    camera.rotation.order = 'YXZ'; // Critical: Enforces level horizon, eliminates diagonal rotation and tilting

    const spawnY = roomConfig.playerSpawn[1] || 1.65;
    currentEyeHeight.current = spawnY;
    targetEyeHeight.current = spawnY;
    playerPos.current.set(roomConfig.playerSpawn[0], spawnY, roomConfig.playerSpawn[2]);
    camera.position.copy(playerPos.current);

    const initYaw = roomConfig.initialYaw ?? 0;
    cameraYaw.current = initYaw;
    cameraPitch.current = 0;
    targetYaw.current = initYaw;
    targetPitch.current = 0;
    camera.rotation.set(0, initYaw, 0);
    camera.rotation.z = 0;

    horizontalVelocity.current.set(0, 0);
    playerVelocity.current.set(0, 0, 0);

    // 3. Renderer with PCF Soft Shadows
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    // 4. Initialize Cannon-ES Physics
    const physicsWorld = new EscapePhysicsWorld();
    physicsWorldRef.current = physicsWorld;
    physicsWorld.buildRoomBoundaries(roomConfig.roomBounds, 4.2);

    // 5. Procedural Textures
    const rustTex = createRustedMetalTexture();
    const brickTex = createBrickMasonryTexture();
    const concreteTex = createDampConcreteTexture();
    const woodTex = createWeatheredWoodTexture();
    const hazardTex = createHazardStripesTexture(false);

    // 6. Build Room Architecture & Static Colliders
    buildRoomArchitecture(scene, physicsWorld, roomConfig, concreteTex, brickTex, rustTex);

    // 7. Daylight & Natural Illumination
    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x64748b, 2.2);
    scene.add(hemiLight);

    const ambient = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambient);

    // Natural Sunlight streaming in from high windows / skylight
    const sunLight = new THREE.DirectionalLight(0xfffaed, 2.6);
    sunLight.position.set(4, 7, 3);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    // Soft sky bounce fill light from opposite angle
    const bounceLight = new THREE.DirectionalLight(0xbae6fd, 1.2);
    bounceLight.position.set(-4, 6, -3);
    scene.add(bounceLight);

    // Bright daylight overhead fixture
    const ceilingLamp = new THREE.PointLight(0xfffbeb, 3.2, 24, 1.2);
    ceilingLamp.position.set(0, 3.8, 0);
    ceilingLamp.castShadow = true;
    ceilingLamp.shadow.mapSize.width = 1024;
    ceilingLamp.shadow.mapSize.height = 1024;
    scene.add(ceilingLamp);
    dynamicMeshes.current.ceilingLamp = ceilingLamp;

    // Warm daylight corner fill
    const cornerFill = new THREE.PointLight(0xfef08a, 1.5, 14, 1.2);
    cornerFill.position.set(roomConfig.roomBounds.minX + 0.8, 2.0, roomConfig.roomBounds.minZ + 0.8);
    scene.add(cornerFill);

    // 8. Dust Motes Particle Field
    const dustCount = 180;
    const dustGeo = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPositions[i * 3] = (Math.random() - 0.5) * 8;
      dustPositions[i * 3 + 1] = Math.random() * 3.6;
      dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0x94a3b8,
      size: 0.035,
      transparent: true,
      opacity: 0.45,
    });
    const dustPoints = new THREE.Points(dustGeo, dustMat);
    scene.add(dustPoints);
    dynamicMeshes.current.dustParticles = dustPoints;

    // 9. Build Props & Dynamic Physics Objects for this room
    buildRoomProps(scene, physicsWorld, roomConfig, rustTex, woodTex, hazardTex);

    // 10. Main Game Animation Loop
    let lastTime = performance.now();

    const animate = () => {
      animFrameId.current = requestAnimationFrame(animate);
      const now = performance.now();
      const delta = Math.min((now - lastTime) / 1000, 0.08);
      lastTime = now;

      // Update Player Kinematics & Crouch
      updateMovement(delta);

      // Step Rigid Body Physics
      physicsWorld.step(delta);

      // Update Held Object Transform & Throw Charge
      updateHeldObject(delta);

      // Flickering Lamp
      if (dynamicMeshes.current.ceilingLamp) {
        if (Math.random() < 0.035) {
          dynamicMeshes.current.ceilingLamp.intensity = 0.5 + Math.random() * 2.8;
        } else {
          dynamicMeshes.current.ceilingLamp.intensity = 2.6 + Math.sin(now * 0.006) * 0.25;
        }
      }

      // Fan Blades (Room 3)
      if (dynamicMeshes.current.fanBlades) {
        dynamicMeshes.current.fanBlades.rotation.z += delta * 6;
      }

      // Vault Door Physical Smooth Swing Open Animation (Room 4)
      if (doorOpeningAnimationRef.current.active && dynamicMeshes.current.vaultDoorPivot) {
        const anim = doorOpeningAnimationRef.current;
        const elapsed = now - anim.startTime;
        const animProgress = Math.min(elapsed / anim.duration, 1.0);

        // Smooth sinusoidal ease-in-out
        const ease = 0.5 - 0.5 * Math.cos(animProgress * Math.PI);

        // Animate door swinging smoothly open, revealing the space beyond it
        dynamicMeshes.current.vaultDoorPivot.rotation.y = -Math.PI * 0.58 * ease;

        // Animate gears spinning rapidly during unlock
        if (dynamicMeshes.current.vaultDoorGears) {
          dynamicMeshes.current.vaultDoorGears.rotation.z += delta * (8 * (1 - animProgress * 0.5));
        }

        // Camera smoothly pans towards the opening door on south wall so the player witnesses it
        const targetDoorYaw = 0; // facing south towards door at +Z
        cameraYaw.current += (targetDoorYaw - cameraYaw.current) * Math.min(delta * 3.5, 0.18);
        targetYaw.current = cameraYaw.current;
        cameraPitch.current += (-0.05 - cameraPitch.current) * Math.min(delta * 3.5, 0.18);
        targetPitch.current = cameraPitch.current;

        // Trigger victory screen ONLY AFTER final door-opening animation completes
        if (animProgress >= 1.0 && !anim.completed) {
          anim.completed = true;
          anim.active = false;
          setShowVictoryModal(true);
        }
      } else if (dynamicMeshes.current.vaultDoorGears) {
        dynamicMeshes.current.vaultDoorGears.rotation.z += delta * 0.4;
      }

      // Quantum Optical Laser Beam Shimmer (Room 4)
      if (dynamicMeshes.current.laserHalo && dynamicMeshes.current.laserHalo.material) {
        const mat = dynamicMeshes.current.laserHalo.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.22 + Math.sin(now * 0.008) * 0.08;
      }

      // Biometric Scanner Plate Pulse (Room 4)
      if (dynamicMeshes.current.biometricPlate && dynamicMeshes.current.biometricPlate.material) {
        const mat = dynamicMeshes.current.biometricPlate.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 0.45 + Math.sin(now * 0.004) * 0.2;
      }

      // Dust Motes
      if (dynamicMeshes.current.dustParticles) {
        const pos = dynamicMeshes.current.dustParticles.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < dustCount; i++) {
          pos[i * 3 + 1] -= delta * 0.07;
          if (pos[i * 3 + 1] < 0.15) pos[i * 3 + 1] = 3.6;
        }
        dynamicMeshes.current.dustParticles.geometry.attributes.position.needsUpdate = true;
      }

      // Crosshair Hover Raycast
      checkCrosshairRaycast();

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 560;
      if (w <= 0 || h <= 0) return;
      camera.aspect = w / h;
      camera.fov = 80;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);
    window.addEventListener('resize', handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      physicsWorld.dispose();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [progress.currentRoomId]);

  // ==========================================================================
  // ROOM ARCHITECTURE BUILDER
  // ==========================================================================
  const buildRoomArchitecture = (
    scene: THREE.Scene,
    physicsWorld: EscapePhysicsWorld,
    cfg: RoomConfig,
    concreteTex: THREE.CanvasTexture,
    brickTex: THREE.CanvasTexture,
    rustTex: THREE.CanvasTexture
  ) => {
    const { minX, maxX, minZ, maxZ } = cfg.roomBounds;
    const roomWidth = maxX - minX;
    const roomDepth = maxZ - minZ;

    // Floor
    const floorGeo = new THREE.PlaneGeometry(roomWidth + 2, roomDepth + 2);
    const floorMat = new THREE.MeshStandardMaterial({
      map: concreteTex,
      roughness: 0.65,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Ceiling with Conduit Pipes
    const ceilGeo = new THREE.PlaneGeometry(roomWidth + 2, roomDepth + 2);
    const ceilMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.7,
    });
    const ceiling = new THREE.Mesh(ceilGeo, ceilMat);
    ceiling.position.y = 4.2;
    ceiling.rotation.x = Math.PI / 2;
    scene.add(ceiling);

    // Overhead Industrial Pipes
    for (let p = minX + 0.8; p <= maxX - 0.8; p += 1.8) {
      const pipeGeo = new THREE.CylinderGeometry(0.08, 0.08, roomDepth, 16);
      const pipeMat = new THREE.MeshStandardMaterial({
        map: rustTex,
        metalness: 0.8,
        roughness: 0.35,
      });
      const pipe = new THREE.Mesh(pipeGeo, pipeMat);
      pipe.position.set(p, 3.9, (minZ + maxZ) / 2);
      pipe.rotation.x = Math.PI / 2;
      scene.add(pipe);
    }

    // Walls
    const wallMat = new THREE.MeshStandardMaterial({
      map: brickTex,
      roughness: 0.8,
    });

    const northWall = new THREE.Mesh(new THREE.PlaneGeometry(roomWidth + 2, 4.2), wallMat);
    northWall.position.set((minX + maxX) / 2, 2.1, minZ);
    northWall.receiveShadow = true;
    scene.add(northWall);

    if (cfg.roomId === 4) {
      // Split south wall into Left Wall, Right Wall, and Top Transom around the 3.2m extraction doorway
      const leftWidth = -1.6 - minX;
      const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(leftWidth, 4.2), wallMat);
      leftWall.position.set(minX + leftWidth / 2, 2.1, maxZ);
      leftWall.rotation.y = Math.PI;
      leftWall.receiveShadow = true;
      scene.add(leftWall);

      const rightWidth = maxX - 1.6;
      const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(rightWidth, 4.2), wallMat);
      rightWall.position.set(1.6 + rightWidth / 2, 2.1, maxZ);
      rightWall.rotation.y = Math.PI;
      rightWall.receiveShadow = true;
      scene.add(rightWall);

      // Top Transom above door: from y = 3.6 to 4.2 (height 0.6)
      const transom = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.6), wallMat);
      transom.position.set(0, 3.9, maxZ);
      transom.rotation.y = Math.PI;
      scene.add(transom);

      // Extraction Portal Heavy Steel Frame Arch
      const portalFrameGroup = new THREE.Group();
      // Left Jamb Column
      const leftJamb = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 3.8, 0.45),
        new THREE.MeshStandardMaterial({ map: rustTex, metalness: 0.9, roughness: 0.3 })
      );
      leftJamb.position.set(-1.75, 1.9, maxZ - 0.1);
      portalFrameGroup.add(leftJamb);

      // Right Jamb Column
      const rightJamb = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 3.8, 0.45),
        new THREE.MeshStandardMaterial({ map: rustTex, metalness: 0.9, roughness: 0.3 })
      );
      rightJamb.position.set(1.75, 1.9, maxZ - 0.1);
      portalFrameGroup.add(rightJamb);

      // Overhead Lintel Arch Beam
      const lintel = new THREE.Mesh(
        new THREE.BoxGeometry(3.8, 0.45, 0.45),
        new THREE.MeshStandardMaterial({ map: rustTex, metalness: 0.9, roughness: 0.3 })
      );
      lintel.position.set(0, 3.65, maxZ - 0.1);
      portalFrameGroup.add(lintel);

      // Illuminated Extraction Portal Header Sign
      const signPlate = new THREE.Mesh(
        new THREE.PlaneGeometry(2.6, 0.28),
        new THREE.MeshStandardMaterial({
          color: 0x0f172a,
          emissive: 0x06b6d4,
          emissiveIntensity: 0.6,
        })
      );
      signPlate.position.set(0, 3.65, maxZ - 0.34);
      portalFrameGroup.add(signPlate);

      scene.add(portalFrameGroup);

      // Exterior Space Beyond Door (The Open Vista revealed when door opens!)
      const exteriorGroup = new THREE.Group();

      // Exterior Extraction Deck Floor extending to Z = maxZ + 9
      const extDeck = new THREE.Mesh(
        new THREE.PlaneGeometry(6.4, 9.5),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.35 })
      );
      extDeck.rotation.x = -Math.PI / 2;
      extDeck.position.set(0, -0.01, maxZ + 4.75);
      exteriorGroup.add(extDeck);

      // Yellow/Black Caution Edge Strip
      const cautionStrip = new THREE.Mesh(
        new THREE.BoxGeometry(3.4, 0.05, 0.4),
        new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.4, metalness: 0.8 })
      );
      cautionStrip.position.set(0, 0.02, maxZ + 0.2);
      exteriorGroup.add(cautionStrip);

      // Safety Railings on Exterior Balcony
      [-2.8, 2.8].forEach((rx) => {
        const rail = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 1.1, 8.5),
          new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.85 })
        );
        rail.position.set(rx, 0.55, maxZ + 4.5);
        exteriorGroup.add(rail);
      });

      const endRail = new THREE.Mesh(
        new THREE.BoxGeometry(5.6, 1.1, 0.08),
        new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.85 })
      );
      endRail.position.set(0, 0.55, maxZ + 8.8);
      exteriorGroup.add(endRail);

      // Open Sky Vista Horizon Backdrop
      const skyBackdrop = new THREE.Mesh(
        new THREE.PlaneGeometry(24, 14),
        new THREE.MeshBasicMaterial({ color: 0x075985 }) // Vibrant daylight sky
      );
      skyBackdrop.position.set(0, 5, maxZ + 11.5);
      exteriorGroup.add(skyBackdrop);

      // Distant Horizon Glow
      const horizonGlow = new THREE.Mesh(
        new THREE.PlaneGeometry(22, 5),
        new THREE.MeshBasicMaterial({
          color: 0x7dd3fc,
          transparent: true,
          opacity: 0.45,
        })
      );
      horizonGlow.position.set(0, 2.5, maxZ + 11.2);
      exteriorGroup.add(horizonGlow);

      // Outdoor Lighting streaming into the room through the portal
      const outdoorLight = new THREE.DirectionalLight(0xfffaed, 3.5);
      outdoorLight.position.set(0, 6, maxZ + 7);
      outdoorLight.target.position.set(0, 1.5, maxZ - 2);
      scene.add(outdoorLight.target);
      exteriorGroup.add(outdoorLight);

      const exteriorFill = new THREE.PointLight(0x38bdf8, 2.2, 16);
      exteriorFill.position.set(0, 3.2, maxZ + 2.5);
      exteriorGroup.add(exteriorFill);

      scene.add(exteriorGroup);
    } else {
      const southWall = new THREE.Mesh(new THREE.PlaneGeometry(roomWidth + 2, 4.2), wallMat);
      southWall.position.set((minX + maxX) / 2, 2.1, maxZ);
      southWall.rotation.y = Math.PI;
      southWall.receiveShadow = true;
      scene.add(southWall);
    }

    const westWall = new THREE.Mesh(new THREE.PlaneGeometry(roomDepth + 2, 4.2), wallMat);
    westWall.position.set(minX, 2.1, (minZ + maxZ) / 2);
    westWall.rotation.y = Math.PI / 2;
    westWall.receiveShadow = true;
    scene.add(westWall);

    const eastWall = new THREE.Mesh(new THREE.PlaneGeometry(roomDepth + 2, 4.2), wallMat);
    eastWall.position.set(maxX, 2.1, (minZ + maxZ) / 2);
    eastWall.rotation.y = -Math.PI / 2;
    eastWall.receiveShadow = true;
    scene.add(eastWall);
  };

  // ==========================================================================
  // PROPS & PHYSICAL OBJECTS BUILDER
  // ==========================================================================
  const buildRoomProps = (
    scene: THREE.Scene,
    physicsWorld: EscapePhysicsWorld,
    cfg: RoomConfig,
    rustTex: THREE.CanvasTexture,
    woodTex: THREE.CanvasTexture,
    hazardTex: THREE.CanvasTexture
  ) => {
    targetMeshMap.current.clear();
    const curState = progress.roomStates[cfg.roomId] || {};

    // ------------------------------------------------------------------------
    // ROOM 1: THE DISCOVERY (Detention Cell)
    // ------------------------------------------------------------------------
    if (cfg.roomId === 1) {
      // 1. Iron Bunk Bed Frame (Static Obstacle)
      const bedGroup = new THREE.Group();
      const frameMat = new THREE.MeshStandardMaterial({ map: rustTex, metalness: 0.8 });

      // Bed Posts
      const postGeo = new THREE.BoxGeometry(0.1, 2.2, 0.1);
      const posts = [
        [-0.8, 1.1, -1.6],
        [0.8, 1.1, -1.6],
        [-0.8, 1.1, 1.6],
        [0.8, 1.1, 1.6],
      ];
      posts.forEach(([x, y, z]) => {
        const post = new THREE.Mesh(postGeo, frameMat);
        post.position.set(x, y, z);
        bedGroup.add(post);
      });

      // Bed Slats
      const slatGeo = new THREE.BoxGeometry(1.6, 0.06, 0.12);
      for (let z = -1.5; z <= 1.5; z += 0.3) {
        const slat = new THREE.Mesh(slatGeo, frameMat);
        slat.position.set(0, 0.55, z);
        bedGroup.add(slat);
      }
      bedGroup.position.set(-2.5, 0, -2.5);
      scene.add(bedGroup);
      physicsWorld.addStaticBox([-2.5, 0.7, -2.5], [0.9, 0.7, 1.7]);

      // 2. Physical Flippable Mattress (Dynamic Rigid Body)
      const mattressGeo = new THREE.BoxGeometry(1.5, 0.3, 3.0);
      const mattressMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.95,
      });
      const mattress = new THREE.Mesh(mattressGeo, mattressMat);
      mattress.castShadow = true;
      mattress.receiveShadow = true;

      // Position on bed frame or flipped
      if (curState.mattressFlipped) {
        mattress.position.set(-2.5, 1.4, -2.5);
        mattress.rotation.z = Math.PI * 0.4;
      } else {
        mattress.position.set(-2.5, 0.75, -2.5);
      }
      scene.add(mattress);
      dynamicMeshes.current.mattress = mattress;

      const mattressBinding = physicsWorld.registerDynamicObject(mattress, 4.5, [0.75, 0.15, 1.5], 'wood');
      (mattress as any).__physicsBinding = mattressBinding;

      const mattressInteractable: RoomInteractableDef = {
        id: 'r1_bunk_mattress',
        name: 'Bunk Bed Mattress',
        prompt: curState.mattressFlipped ? '[E] Pick up mattress' : '[E] Flip mattress',
        category: 'PHYSICAL_PROP',
        position: [-2.5, 0.75, -2.5],
      };
      targetMeshMap.current.set(mattress, mattressInteractable);

      // 3. Hidden Letter 1 (taped under mattress on bed slats)
      const letter1Geo = new THREE.PlaneGeometry(0.35, 0.45);
      const letter1Mat = new THREE.MeshStandardMaterial({
        color: 0xfef3c7,
        roughness: 0.85,
        side: THREE.DoubleSide,
      });
      const letter1Mesh = new THREE.Mesh(letter1Geo, letter1Mat);
      letter1Mesh.rotation.x = -Math.PI / 2;
      letter1Mesh.position.set(-2.5, 0.58, -2.5);
      scene.add(letter1Mesh);

      const letter1Def: RoomInteractableDef = {
        id: 'r1_letter1',
        name: 'Taped Parchment Note (Code L1)',
        prompt: '[E] Inspect Note',
        category: 'LETTER_1',
        position: [-2.5, 0.58, -2.5],
      };
      targetMeshMap.current.set(letter1Mesh, letter1Def);

      // 4. Rusted Metal Breaker Box on North Wall
      const breakerGroup = new THREE.Group();
      const boxShellGeo = new THREE.BoxGeometry(0.9, 1.3, 0.25);
      const boxShellMat = new THREE.MeshStandardMaterial({ map: rustTex, metalness: 0.8 });
      const boxShell = new THREE.Mesh(boxShellGeo, boxShellMat);
      breakerGroup.add(boxShell);

      // Hinged Door
      const doorGeo = new THREE.BoxGeometry(0.85, 1.25, 0.05);
      const doorMat = new THREE.MeshStandardMaterial({ map: rustTex, metalness: 0.85 });
      const door = new THREE.Mesh(doorGeo, doorMat);
      door.position.set(0, 0, 0.14);
      if (curState.breakerDoorOpen) {
        door.position.set(0.45, 0, 0.45);
        door.rotation.y = -Math.PI * 0.6;
      }
      breakerGroup.add(door);
      dynamicMeshes.current.breakerDoor = door;

      breakerGroup.position.set(2.4, 2.1, cfg.roomBounds.minZ + 0.15);
      scene.add(breakerGroup);
      physicsWorld.addStaticBox([2.4, 2.1, cfg.roomBounds.minZ + 0.15], [0.5, 0.7, 0.2]);

      const breakerDef: RoomInteractableDef = {
        id: 'r1_breaker_panel',
        name: 'Rusted Industrial Breaker Box',
        prompt: curState.breakerDoorOpen ? '[E] Inspect Breaker Interior' : '[E] Open Breaker Door',
        category: 'PHYSICAL_PROP',
        position: [2.4, 2.1, cfg.roomBounds.minZ + 0.15],
      };
      targetMeshMap.current.set(breakerGroup, breakerDef);
      targetMeshMap.current.set(door, breakerDef);

      // Hidden Letter 2 (tucked beneath heavy loose cell brick on the floor)
      const letter2Geo = new THREE.PlaneGeometry(0.32, 0.42);
      const letter2Mat = new THREE.MeshStandardMaterial({
        color: 0xfef3c7,
        roughness: 0.85,
        side: THREE.DoubleSide,
      });
      const letter2Mesh = new THREE.Mesh(letter2Geo, letter2Mat);
      letter2Mesh.rotation.x = -Math.PI / 2;
      letter2Mesh.rotation.z = 0.15;
      letter2Mesh.position.set(1.5, 0.02, -1.72);
      scene.add(letter2Mesh);

      const letter2Def: RoomInteractableDef = {
        id: 'r1_letter2',
        name: 'Maintenance Ticket #2 (Under Loose Brick)',
        prompt: '[E] Inspect Note',
        category: 'LETTER_2',
        position: [1.5, 0.02, -1.72],
      };
      targetMeshMap.current.set(letter2Mesh, letter2Def);

      // 5. Corner CRT TV & Table (Hides Key Box)
      const tableGeo = new THREE.BoxGeometry(1.2, 0.9, 1.2);
      const tableMat = new THREE.MeshStandardMaterial({ map: woodTex });
      const table = new THREE.Mesh(tableGeo, tableMat);
      table.position.set(-2.8, 0.45, 3.2);
      scene.add(table);
      physicsWorld.addStaticBox([-2.8, 0.45, 3.2], [0.65, 0.45, 0.65]);

      // CRT TV (Dynamic Pickable / Pushable Rigid Body)
      const tvGeo = new THREE.BoxGeometry(0.85, 0.75, 0.75);
      const tvMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
      const tvMesh = new THREE.Mesh(tvGeo, tvMat);
      tvMesh.castShadow = true;

      if (curState.tvMoved) {
        tvMesh.position.set(-2.1, 0.4, 2.4);
        tvMesh.rotation.y = 0.5;
      } else {
        tvMesh.position.set(-2.8, 1.3, 3.2);
      }
      scene.add(tvMesh);
      dynamicMeshes.current.tv = tvMesh;

      const tvBinding = physicsWorld.registerDynamicObject(tvMesh, 10.0, [0.42, 0.37, 0.37], 'metal');
      (tvMesh as any).__physicsBinding = tvBinding;

      const tvDef: RoomInteractableDef = {
        id: 'r1_crt_tv',
        name: 'Humming CRT Television',
        prompt: '[E] Push TV Aside',
        category: 'PHYSICAL_PROP',
        position: [-2.8, 1.3, 3.2],
      };
      targetMeshMap.current.set(tvMesh, tvDef);

      // Hidden Key Box behind TV (Wall Niche)
      const keyBoxGeo = new THREE.BoxGeometry(0.55, 0.55, 0.2);
      const keyBoxMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        metalness: 0.8,
        emissive: 0x06b6d4,
        emissiveIntensity: 0.2,
      });
      const keyBox = new THREE.Mesh(keyBoxGeo, keyBoxMat);
      keyBox.position.set(-2.8, 1.3, 3.7);
      scene.add(keyBox);

      const keyBoxDef: RoomInteractableDef = {
        id: 'r1_keybox',
        name: 'Security SCADA Key Box Terminal',
        prompt: '[E] Access Key Box Terminal',
        category: 'KEY_BOX',
        position: [-2.8, 1.3, 3.7],
      };
      targetMeshMap.current.set(keyBox, keyBoxDef);

      // 6. Interactive Loose Throwables: Rusted Mug, Bricks, Plate
      const brickGeo = new THREE.BoxGeometry(0.35, 0.18, 0.2);
      const brickMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.9 });
      const brick1 = new THREE.Mesh(brickGeo, brickMat);
      brick1.position.set(1.5, 0.1, -1.8);
      scene.add(brick1);
      const brickBinding = physicsWorld.registerDynamicObject(brick1, 2.2, [0.18, 0.09, 0.1], 'wood');
      (brick1 as any).__physicsBinding = brickBinding;
      targetMeshMap.current.set(brick1, {
        id: 'r1_brick_1',
        name: 'Heavy Loose Brick',
        prompt: '[E] Pick up brick  [T] Throw',
        category: 'PHYSICAL_PROP',
        position: [1.5, 0.1, -1.8],
      });

      const mugGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.22, 12);
      const mugMat = new THREE.MeshStandardMaterial({ map: rustTex, metalness: 0.7 });
      const mug = new THREE.Mesh(mugGeo, mugMat);
      mug.position.set(2.0, 0.12, 1.2);
      scene.add(mug);
      const mugBinding = physicsWorld.registerDynamicObject(mug, 0.6, [0.1, 0.11, 0.1], 'metal');
      (mug as any).__physicsBinding = mugBinding;
      targetMeshMap.current.set(mug, {
        id: 'r1_tin_mug',
        name: 'Rusted Prison Tin Mug',
        prompt: '[E] Pick up mug  [R+Mouse] Rotate to inspect',
        category: 'PHYSICAL_PROP',
        position: [2.0, 0.12, 1.2],
      });

      // 7. Exit Door (Heavy Iron Cell Gate)
      const gateGroup = new THREE.Group();
      const barMat = new THREE.MeshStandardMaterial({ map: rustTex, metalness: 0.9 });
      for (let x = -0.9; x <= 0.9; x += 0.2) {
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 3.2, 12), barMat);
        bar.position.set(x, 1.6, 0);
        gateGroup.add(bar);
      }
      gateGroup.position.set(cfg.roomBounds.maxX - 0.1, 0, 0);
      gateGroup.rotation.y = -Math.PI / 2;
      scene.add(gateGroup);

      const exitDef: RoomInteractableDef = {
        id: 'r1_exit_gate',
        name: 'Reinforced Detention Cell Gate',
        prompt: curState.doorUnbolted ? '[E] Escape to Corridor (Next Room)' : '[E] Heavy Gate Locked with Keyhole',
        category: 'EXIT_DOOR',
        position: [cfg.roomBounds.maxX - 0.1, 1.6, 0],
      };
      targetMeshMap.current.set(gateGroup, exitDef);
    }

    // ------------------------------------------------------------------------
    // ROOM 2: THE DECODER (Guard Comms Lab)
    // ------------------------------------------------------------------------
    if (cfg.roomId === 2) {
      // 1. Guard Comms Workbench Desk with False-Bottom Drawer
      const deskGroup = new THREE.Group();
      const deskMat = new THREE.MeshStandardMaterial({ map: woodTex });
      const top = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 1.4), deskMat);
      top.position.y = 0.9;
      deskGroup.add(top);

      deskGroup.position.set(-2.0, 0, -2.0);
      scene.add(deskGroup);
      physicsWorld.addStaticBox([-2.0, 0.45, -2.0], [1.3, 0.45, 0.7]);

      // Sliding Drawer with false bottom
      const drawerGeo = new THREE.BoxGeometry(1.0, 0.35, 0.9);
      const drawer = new THREE.Mesh(drawerGeo, deskMat);
      drawer.position.set(-2.0, 0.65, curState.deskDrawerOpen ? -1.4 : -2.0);
      scene.add(drawer);
      dynamicMeshes.current.deskDrawer = drawer;

      const drawerDef: RoomInteractableDef = {
        id: 'r2_desk_drawer',
        name: 'Officer Desk Drawer (False Bottom)',
        prompt: curState.deskDrawerOpen ? '[E] Search False Bottom' : '[E] Slide Drawer Open',
        category: 'PHYSICAL_PROP',
        position: [-2.0, 0.65, -2.0],
      };
      targetMeshMap.current.set(drawer, drawerDef);

      // Hidden Letter 1 in Drawer
      const letter1Geo = new THREE.PlaneGeometry(0.3, 0.4);
      const letter1Mesh = new THREE.Mesh(letter1Geo, new THREE.MeshStandardMaterial({ color: 0xfef3c7 }));
      letter1Mesh.rotation.x = -Math.PI / 2;
      letter1Mesh.position.set(-2.0, 0.68, curState.deskDrawerOpen ? -1.4 : -2.0);
      scene.add(letter1Mesh);

      const letter1Def: RoomInteractableDef = {
        id: 'r2_letter1',
        name: 'Hidden Note under False Bottom (Code S2)',
        prompt: '[E] Inspect Note',
        category: 'LETTER_1',
        position: [-2.0, 0.68, -2.0],
      };
      targetMeshMap.current.set(letter1Mesh, letter1Def);

      // 2. Oscilloscope Station & Rubber Mat
      const scopeGroup = new THREE.Group();
      const scopeBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.6, 0.7),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7 })
      );
      scopeBody.position.y = 1.25;
      scopeGroup.add(scopeBody);

      // Screen
      const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(0.5, 0.4),
        new THREE.MeshBasicMaterial({ map: createOscilloscopeTexture() })
      );
      screen.position.set(0, 1.25, 0.36);
      scopeGroup.add(screen);

      scopeGroup.position.set(2.2, 0, -2.2);
      scene.add(scopeGroup);
      physicsWorld.addStaticBox([2.2, 0.6, -2.2], [0.6, 0.6, 0.5]);

      // Removable Rubber Mat (Dynamic)
      const matGeo = new THREE.BoxGeometry(1.2, 0.04, 0.9);
      const matMesh = new THREE.Mesh(matGeo, new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 }));
      if (curState.scopeMatMoved) {
        matMesh.position.set(2.2, 0.95, -1.5);
      } else {
        matMesh.position.set(2.2, 0.92, -2.2);
      }
      scene.add(matMesh);
      dynamicMeshes.current.scopeMat = matMesh;

      const matBinding = physicsWorld.registerDynamicObject(matMesh, 1.8, [0.6, 0.02, 0.45], 'wood');
      (matMesh as any).__physicsBinding = matBinding;

      const matDef: RoomInteractableDef = {
        id: 'r2_scope_mat',
        name: 'Rubber Insulating Station Mat',
        prompt: '[E] Lift Rubber Mat',
        category: 'PHYSICAL_PROP',
        position: [2.2, 0.92, -2.2],
      };
      targetMeshMap.current.set(matMesh, matDef);

      // Hidden Letter 2 under Rubber Mat
      const letter2Mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.3, 0.4),
        new THREE.MeshStandardMaterial({ color: 0xfef3c7, side: THREE.DoubleSide })
      );
      letter2Mesh.rotation.x = -Math.PI / 2;
      letter2Mesh.position.set(2.2, 0.91, -2.2);
      scene.add(letter2Mesh);

      const letter2Def: RoomInteractableDef = {
        id: 'r2_letter2',
        name: 'Note Under Rubber Mat',
        prompt: '[E] Inspect Note',
        category: 'LETTER_2',
        position: [2.2, 0.91, -2.2],
      };
      targetMeshMap.current.set(letter2Mesh, letter2Def);

      // 3. Wall Clock (Can be taken off wall to reveal Key Box)
      const clockGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.08, 24);
      const clockMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6 });
      const clockMesh = new THREE.Mesh(clockGeo, clockMat);
      clockMesh.rotation.x = Math.PI / 2;

      if (curState.wallClockTaken) {
        clockMesh.position.set(-2.0, 0.1, 1.5);
      } else {
        clockMesh.position.set(cfg.roomBounds.minX + 0.08, 2.4, 0);
      }
      scene.add(clockMesh);
      dynamicMeshes.current.wallClock = clockMesh;

      const clockBinding = physicsWorld.registerDynamicObject(clockMesh, 1.5, [0.4, 0.4, 0.05], 'wood');
      (clockMesh as any).__physicsBinding = clockBinding;

      const clockDef: RoomInteractableDef = {
        id: 'r2_wall_clock',
        name: 'Heavy Industrial Wall Clock',
        prompt: '[E] Take Clock Off Wall',
        category: 'PHYSICAL_PROP',
        position: [cfg.roomBounds.minX + 0.08, 2.4, 0],
      };
      targetMeshMap.current.set(clockMesh, clockDef);

      // Key Box in Wall Recess behind Clock
      const keyBox = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.5, 0.18),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0xd946ef, emissiveIntensity: 0.25 })
      );
      keyBox.position.set(cfg.roomBounds.minX + 0.05, 2.4, 0);
      keyBox.rotation.y = Math.PI / 2;
      scene.add(keyBox);

      const keyBoxDef: RoomInteractableDef = {
        id: 'r2_keybox',
        name: 'Comms Encryption Key Box',
        prompt: '[E] Access Comms Terminal',
        category: 'KEY_BOX',
        position: [cfg.roomBounds.minX + 0.05, 2.4, 0],
      };
      targetMeshMap.current.set(keyBox, keyBoxDef);

      // 5. Exit Blast Door
      const doorGroup = new THREE.Group();
      const exitLeaf = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 3.2, 1.8),
        new THREE.MeshStandardMaterial({ map: rustTex, metalness: 0.85 })
      );
      doorGroup.add(exitLeaf);
      doorGroup.position.set(cfg.roomBounds.maxX - 0.1, 1.6, 0);
      scene.add(doorGroup);

      const exitDef: RoomInteractableDef = {
        id: 'r2_exit_door',
        name: 'Heavy Steel Comms Portal',
        prompt: curState.doorUnbolted ? '[E] Proceed to Utility Tunnels' : '[E] Locked Portal Requires Passkey',
        category: 'EXIT_DOOR',
        position: [cfg.roomBounds.maxX - 0.1, 1.6, 0],
      };
      targetMeshMap.current.set(doorGroup, exitDef);
    }

    // ------------------------------------------------------------------------
    // ROOM 3: THE SYSTEM (Utility Tunnels / PLC Relay)
    // ------------------------------------------------------------------------
    if (cfg.roomId === 3) {
      // 1. High-Voltage Circuit Panel on North Wall
      const circuitPanel = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 1.6, 0.2),
        new THREE.MeshStandardMaterial({
          map: rustTex,
          emissive: curState.circuitSolved ? 0x22c55e : 0xf59e0b,
          emissiveIntensity: 0.2,
        })
      );
      circuitPanel.position.set(-2.0, 2.1, cfg.roomBounds.minZ + 0.15);
      scene.add(circuitPanel);

      const circuitDef: RoomInteractableDef = {
        id: 'r3_circuit_panel',
        name: 'High-Voltage 480V Breaker Panel',
        prompt: curState.circuitSolved ? '[E] Circuit Restored (480V Active)' : '[E] Route Circuit Switches',
        category: 'CIRCUIT_PANEL',
        position: [-2.0, 2.1, cfg.roomBounds.minZ + 0.15],
      };
      targetMeshMap.current.set(circuitPanel, circuitDef);

      // 2. Loose Floor Cable Duct Cover (Dynamic Physics)
      const ductCoverGeo = new THREE.BoxGeometry(2.4, 0.08, 0.8);
      const ductCover = new THREE.Mesh(
        ductCoverGeo,
        new THREE.MeshStandardMaterial({ map: rustTex, metalness: 0.9 })
      );
      if (curState.cableCoverLifted) {
        ductCover.position.set(0, 0.1, 1.6);
        ductCover.rotation.z = 0.2;
      } else {
        ductCover.position.set(0, 0.04, 0);
      }
      scene.add(ductCover);
      dynamicMeshes.current.cableCover = ductCover;

      const ductBinding = physicsWorld.registerDynamicObject(ductCover, 5.0, [1.2, 0.04, 0.4], 'metal');
      (ductCover as any).__physicsBinding = ductBinding;

      const ductDef: RoomInteractableDef = {
        id: 'r3_cable_cover',
        name: 'Loose Floor Cable Duct Cover',
        prompt: '[E] Lift Duct Cover',
        category: 'PHYSICAL_PROP',
        position: [0, 0.04, 0],
      };
      targetMeshMap.current.set(ductCover, ductDef);

      // Hidden Letter 1 in Floor Duct
      const letter1Mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.35, 0.45),
        new THREE.MeshStandardMaterial({ color: 0xfef3c7, side: THREE.DoubleSide })
      );
      letter1Mesh.rotation.x = -Math.PI / 2;
      letter1Mesh.position.set(0, 0.02, 0);
      scene.add(letter1Mesh);

      const letter1Def: RoomInteractableDef = {
        id: 'r3_letter1',
        name: 'Parchment Note in Floor Conduits (Code P3)',
        prompt: '[E] Inspect Note',
        category: 'LETTER_1',
        position: [0, 0.02, 0],
      };
      targetMeshMap.current.set(letter1Mesh, letter1Def);

      // 3. Ventilation Fan & Protective Wire Guard
      const fanGroup = new THREE.Group();
      const cowlGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.3, 20);
      const cowl = new THREE.Mesh(cowlGeo, new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.8 }));
      cowl.rotation.z = Math.PI / 2;
      fanGroup.add(cowl);

      const bladeGeo = new THREE.BoxGeometry(0.12, 1.2, 0.02);
      const blades = new THREE.Mesh(bladeGeo, new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9 }));
      fanGroup.add(blades);
      dynamicMeshes.current.fanBlades = blades;

      fanGroup.position.set(cfg.roomBounds.maxX - 0.15, 2.4, -2.0);
      scene.add(fanGroup);

      // Removable Wire Guard
      const guardGeo = new THREE.CylinderGeometry(0.72, 0.72, 0.05, 16);
      const guardMesh = new THREE.Mesh(
        guardGeo,
        new THREE.MeshStandardMaterial({ color: 0x64748b, wireframe: true })
      );
      guardMesh.rotation.z = Math.PI / 2;
      if (curState.fanGuardRemoved) {
        guardMesh.position.set(cfg.roomBounds.maxX - 0.5, 0.1, -2.0);
      } else {
        guardMesh.position.set(cfg.roomBounds.maxX - 0.25, 2.4, -2.0);
      }
      scene.add(guardMesh);
      dynamicMeshes.current.fanGuard = guardMesh;

      const fanGuardDef: RoomInteractableDef = {
        id: 'r3_fan_guard',
        name: 'Ventilation Fan Protective Grill',
        prompt: curState.fanGuardRemoved ? '[E] Inspect Fan Housing' : '[E] Unscrew & Remove Fan Grill',
        category: 'PHYSICAL_PROP',
        position: [cfg.roomBounds.maxX - 0.25, 2.4, -2.0],
      };
      targetMeshMap.current.set(guardMesh, fanGuardDef);

      // Hidden Letter 2 behind Fan Blades
      const letter2Mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.3, 0.4),
        new THREE.MeshStandardMaterial({ color: 0xfef3c7, side: THREE.DoubleSide })
      );
      letter2Mesh.position.set(cfg.roomBounds.maxX - 0.1, 2.4, -2.0);
      letter2Mesh.rotation.y = -Math.PI / 2;
      scene.add(letter2Mesh);

      const letter2Def: RoomInteractableDef = {
        id: 'r3_letter2',
        name: 'Note Behind Fan Housing',
        prompt: '[E] Inspect Note',
        category: 'LETTER_2',
        position: [cfg.roomBounds.maxX - 0.1, 2.4, -2.0],
      };
      targetMeshMap.current.set(letter2Mesh, letter2Def);

      // 4. Wooden Ladder (Dynamic Pickable)
      const ladderGeo = new THREE.BoxGeometry(0.6, 2.8, 0.15);
      const ladderMesh = new THREE.Mesh(ladderGeo, new THREE.MeshStandardMaterial({ map: woodTex }));
      if (curState.ladderPlaced) {
        ladderMesh.position.set(2.0, 1.4, 2.0);
      } else {
        ladderMesh.position.set(-2.5, 1.4, 2.5);
        ladderMesh.rotation.z = 0.1;
      }
      scene.add(ladderMesh);
      dynamicMeshes.current.ladder = ladderMesh;

      const ladderBinding = physicsWorld.registerDynamicObject(ladderMesh, 6.0, [0.3, 1.4, 0.08], 'wood');
      (ladderMesh as any).__physicsBinding = ladderBinding;

      const ladderDef: RoomInteractableDef = {
        id: 'r3_wooden_ladder',
        name: 'Heavy Wooden Utility Ladder',
        prompt: '[E] Pick up ladder  [T] Throw / Place',
        category: 'PHYSICAL_PROP',
        position: [-2.5, 1.4, 2.5],
      };
      targetMeshMap.current.set(ladderMesh, ladderDef);

      // 5. Ceiling Hatch tied with Rope (Contains Key Box)
      const hatchMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.1, 1.2),
        new THREE.MeshStandardMaterial({ map: rustTex })
      );
      hatchMesh.position.set(2.0, 4.15, 2.0);
      scene.add(hatchMesh);
      dynamicMeshes.current.ceilingHatch = hatchMesh;

      const hatchDef: RoomInteractableDef = {
        id: 'r3_ceiling_hatch',
        name: 'Overhead Maintenance Hatch (Tied with Rope)',
        prompt: curState.ropeCut ? '[E] Access Overhead Key Box' : '[E] Cut Rope & Drop Hatch',
        category: 'KEY_BOX',
        position: [2.0, 4.15, 2.0],
      };
      targetMeshMap.current.set(hatchMesh, hatchDef);

      // 6. Exit Portal Door
      const exitDoor = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 3.2, 1.8),
        new THREE.MeshStandardMaterial({ map: rustTex, metalness: 0.9 })
      );
      exitDoor.position.set(cfg.roomBounds.maxX - 0.1, 1.6, 2.0);
      scene.add(exitDoor);

      const exitDef: RoomInteractableDef = {
        id: 'r3_exit_door',
        name: 'Master SCADA Blast Portal',
        prompt: curState.doorUnbolted ? '[E] Proceed to Master SCADA Vault' : '[E] Portal Locked by PLC Relay',
        category: 'EXIT_DOOR',
        position: [cfg.roomBounds.maxX - 0.1, 1.6, 2.0],
      };
      targetMeshMap.current.set(exitDoor, exitDef);
    }

    // ------------------------------------------------------------------------
    // ROOM 4: THE FINAL VAULT (Master SCADA Core)
    // ------------------------------------------------------------------------
    if (cfg.roomId === 4) {
      // 1. Massive Circular Vault Door with Animated Gears on Physical Hinge Pivot
      const vaultDoorPivot = new THREE.Group();
      vaultDoorPivot.position.set(-1.65, 0, cfg.roomBounds.maxZ - 0.2);

      // Heavy Iron Hinge Brackets mounted to the wall jamb at pivot X=0
      [0.9, 2.7].forEach((hy) => {
        const hingeBracket = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.12, 0.35, 16),
          new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.95, roughness: 0.2 })
        );
        hingeBracket.position.set(0, hy, 0);
        vaultDoorPivot.add(hingeBracket);

        const hingePin = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.06, 0.45, 12),
          new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.95 })
        );
        hingePin.position.set(0, hy, 0);
        vaultDoorPivot.add(hingePin);
      });

      // Door Leaf Body (centered at local X = 1.65, Y = 1.95, Z = 0)
      const doorLeaf = new THREE.Mesh(
        new THREE.CylinderGeometry(1.55, 1.55, 0.35, 32),
        new THREE.MeshStandardMaterial({ map: rustTex, metalness: 0.9, roughness: 0.25 })
      );
      doorLeaf.rotation.x = Math.PI / 2;
      doorLeaf.position.set(1.65, 1.95, 0);
      vaultDoorPivot.add(doorLeaf);

      // Outer Reinforced Steel Armor Ring
      const outerRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.45, 0.1, 16, 32),
        new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.95, roughness: 0.2 })
      );
      outerRing.position.set(1.65, 1.95, 0.18);
      vaultDoorPivot.add(outerRing);

      // Rotating Gears Group
      const gearGroup = new THREE.Group();
      const gearMesh = new THREE.Mesh(
        new THREE.TorusGeometry(1.05, 0.12, 16, 32),
        new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.95, roughness: 0.2 })
      );
      gearGroup.add(gearMesh);

      // Gear teeth
      for (let g = 0; g < 12; g++) {
        const tooth = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.18, 0.1),
          new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.9 })
        );
        tooth.position.set(Math.cos((g * Math.PI) / 6) * 1.15, Math.sin((g * Math.PI) / 6) * 1.15, 0);
        tooth.rotation.z = (g * Math.PI) / 6;
        gearGroup.add(tooth);
      }
      gearGroup.position.set(1.65, 1.95, 0.2);
      vaultDoorPivot.add(gearGroup);
      dynamicMeshes.current.vaultDoorGears = gearGroup as any;

      // Vault Door Spokes & Locking Pins
      for (let sp = 0; sp < 8; sp++) {
        const spoke = new THREE.Mesh(
          new THREE.BoxGeometry(0.1, 1.1, 0.08),
          new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.95 })
        );
        spoke.rotation.z = (sp * Math.PI) / 4;
        spoke.position.set(1.65, 1.95, 0.24);
        vaultDoorPivot.add(spoke);
      }

      // Central Chrome Hand Wheel
      const wheel = new THREE.Mesh(
        new THREE.TorusGeometry(0.38, 0.04, 12, 24),
        new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.95, roughness: 0.1 })
      );
      wheel.position.set(1.65, 1.95, 0.28);
      vaultDoorPivot.add(wheel);

      // Status Indicator LED on Vault Door
      const isAlreadyUnlocked = Boolean(curState.techSolved || curState.doorUnbolted);
      const statusLed = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 12, 12),
        new THREE.MeshBasicMaterial({
          color: isAlreadyUnlocked ? 0x10b981 : 0xef4444,
        })
      );
      statusLed.position.set(1.65, 3.1, 0.22);
      vaultDoorPivot.add(statusLed);

      // Set initial door angle: if already solved/unbolted, swing wide open!
      vaultDoorPivot.rotation.y = isAlreadyUnlocked ? -Math.PI * 0.58 : 0;

      scene.add(vaultDoorPivot);
      dynamicMeshes.current.vaultDoorPivot = vaultDoorPivot;
      dynamicMeshes.current.vaultDoor = vaultDoorPivot as any;

      const vaultDef: RoomInteractableDef = {
        id: 'r4_vault_door',
        name: 'Master Pneumatic Vault Blast Door',
        prompt: isAlreadyUnlocked ? '[E] Escape Through Extraction Portal!' : '[E] Inspect Vault Blast Door Mechanism',
        category: 'PHYSICAL_PROP',
        position: [0, 2.0, cfg.roomBounds.maxZ - 0.2],
      };
      targetMeshMap.current.set(doorLeaf, vaultDef);
      targetMeshMap.current.set(vaultDoorPivot, vaultDef);

      // 2. Electronics Diagnostic & Calibration Workbench (East Wall)
      const benchGroup = new THREE.Group();
      const benchMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.35 });
      const benchTop = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.85, 1.1), benchMat);
      benchTop.position.y = 0.425;
      benchGroup.add(benchTop);

      // Oscilloscope Monitor on Bench
      const scopeHousing = new THREE.Mesh(
        new THREE.BoxGeometry(0.65, 0.45, 0.4),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9 })
      );
      scopeHousing.position.set(-0.35, 1.1, 0.1);
      benchGroup.add(scopeHousing);

      const scopeScreen = new THREE.Mesh(
        new THREE.PlaneGeometry(0.45, 0.32),
        new THREE.MeshBasicMaterial({ color: 0x06b6d4 })
      );
      scopeScreen.position.set(-0.35, 1.1, 0.31);
      benchGroup.add(scopeScreen);

      benchGroup.position.set(3.4, 0, -2.5);
      scene.add(benchGroup);
      physicsWorld.addStaticBox([3.4, 0.55, -2.5], [0.85, 0.55, 0.6]);

      // Sliding Diagnostic Tool Drawer
      const diagDrawerGeo = new THREE.BoxGeometry(0.85, 0.26, 0.85);
      const diagDrawer = new THREE.Mesh(
        diagDrawerGeo,
        new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.4 })
      );
      diagDrawer.position.set(3.4, 0.65, curState.diagnosticDrawerPulled ? -1.95 : -2.5);

      const diagHandle = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.08, 0.08),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xb45309, emissiveIntensity: 0.5, metalness: 0.95 })
      );
      diagHandle.position.set(0, 0, 0.45);
      diagDrawer.add(diagHandle);

      scene.add(diagDrawer);
      dynamicMeshes.current.diagnosticDrawer = diagDrawer;

      const diagDrawerDef: RoomInteractableDef = {
        id: 'r4_diagnostic_drawer',
        name: 'Diagnostic Workbench Tool Drawer',
        prompt: curState.diagnosticDrawerPulled ? '[E] Close Tool Drawer' : '[E] Slide Open Tool Drawer',
        category: 'PHYSICAL_PROP',
        position: [3.4, 0.65, -2.5],
      };
      targetMeshMap.current.set(diagDrawer, diagDrawerDef);
      targetMeshMap.current.set(diagHandle, diagDrawerDef);
      targetMeshMap.current.set(benchTop, diagDrawerDef);

      // Heavy Titanium Service Spanner on the Diagnostic Workbench
      const spannerGeo = new THREE.BoxGeometry(0.45, 0.06, 0.12);
      const spannerMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.95, roughness: 0.2 });
      const spannerMesh = new THREE.Mesh(spannerGeo, spannerMat);
      spannerMesh.position.set(3.2, 0.95, -2.2);
      scene.add(spannerMesh);
      const spannerBinding = physicsWorld.registerDynamicObject(spannerMesh, 3.2, [0.22, 0.03, 0.06], 'metal');
      (spannerMesh as any).__physicsBinding = spannerBinding;
      targetMeshMap.current.set(spannerMesh, {
        id: 'r4_spanner_item',
        name: 'Heavy Titanium Service Spanner',
        prompt: '[E] Pick up spanner  [T] Throw',
        category: 'TOOL_PICKUP',
        position: [3.2, 0.95, -2.2],
      });

      // 3. Sub-Floor Hydraulic Conduit Trench with Diamond-Plate Hatch
      const trenchGroup = new THREE.Group();
      const trenchCavity = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.1, 1.4),
        new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.9 })
      );
      trenchCavity.position.set(-1.8, -0.02, 2.4);
      trenchGroup.add(trenchCavity);

      // Colored Conduit Cables inside Trench
      const cableColors = [0xef4444, 0x3b82f6, 0xf59e0b];
      cableColors.forEach((col, idx) => {
        const cable = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.04, 1.3, 12),
          new THREE.MeshStandardMaterial({ color: col, roughness: 0.7 })
        );
        cable.rotation.x = Math.PI / 2;
        cable.position.set(-1.8 - 0.3 + idx * 0.3, 0.01, 2.4);
        trenchGroup.add(cable);
      });
      scene.add(trenchGroup);

      // Diamond-Plate Sliding Hatch Cover
      const hatchMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.45, 0.05, 1.45),
        new THREE.MeshStandardMaterial({ map: rustTex, metalness: 0.95, roughness: 0.3 })
      );
      hatchMesh.position.set(curState.trenchHatchOpen ? -0.8 : -1.8, 0.05, 2.4);

      const grabBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.04, 0.06),
        new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.4 })
      );
      grabBar.position.set(0, 0.04, 0);
      hatchMesh.add(grabBar);

      scene.add(hatchMesh);
      dynamicMeshes.current.trenchHatch = hatchMesh;

      const trenchHatchDef: RoomInteractableDef = {
        id: 'r4_trench_hatch',
        name: 'Sub-Floor Hydraulic Conduit Trench Hatch',
        prompt: curState.trenchHatchOpen ? '[E] Close Conduit Hatch' : '[E] Slide Trench Hatch Open',
        category: 'PHYSICAL_PROP',
        position: [-1.8, 0.05, 2.4],
      };
      targetMeshMap.current.set(hatchMesh, trenchHatchDef);
      targetMeshMap.current.set(grabBar, trenchHatchDef);

      // 4. Server Rack 04 with Battery Tray (West Wall, Z = 0)
      const rackGroup = new THREE.Group();
      const rack = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 3.2, 0.9),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85 })
      );
      rack.position.y = 1.6;
      rackGroup.add(rack);

      const batteryTrayGeo = new THREE.BoxGeometry(1.05, 0.38, 0.92);
      const batteryTray = new THREE.Mesh(
        batteryTrayGeo,
        new THREE.MeshStandardMaterial({ map: rustTex, metalness: 0.8 })
      );
      batteryTray.position.set(0.1, 0.7, curState.batteryDrawerPulled ? 0.85 : 0.05);

      const handleMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.08, 0.08),
        new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          emissive: 0x0284c7,
          emissiveIntensity: 0.6,
          metalness: 0.9,
        })
      );
      handleMesh.position.set(0, 0, 0.5);
      batteryTray.add(handleMesh);

      for (let b = -0.3; b <= 0.3; b += 0.3) {
        const cell = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.08, 0.3, 12),
          new THREE.MeshStandardMaterial({ color: 0x0284c7, emissive: 0x06b6d4, emissiveIntensity: 0.4 })
        );
        cell.position.set(b, 0.15, 0);
        batteryTray.add(cell);
      }

      rackGroup.add(batteryTray);
      dynamicMeshes.current.batteryDrawer = batteryTray;

      rackGroup.position.set(-2.5, 0, 0);
      scene.add(rackGroup);
      physicsWorld.addStaticBox([-2.5, 1.6, 0], [0.6, 1.6, 0.5]);

      const trayDef: RoomInteractableDef = {
        id: 'r4_server_drawer',
        name: 'Server Rack Backup Battery Tray',
        prompt: curState.batteryDrawerPulled ? '[E] Close Battery Tray' : '[E] Pull Battery Tray Open',
        category: 'PHYSICAL_PROP',
        position: [-2.5, 0.7, 0],
      };
      targetMeshMap.current.set(batteryTray, trayDef);
      targetMeshMap.current.set(handleMesh, trayDef);
      targetMeshMap.current.set(rack, trayDef);
      targetMeshMap.current.set(rackGroup, trayDef);

      // 5. Mainframe Server Rack 02 with Modular Drive Sled (West Wall, Z = -3.5)
      // THIS IS THE NEW LOCATION FOR HIDDEN LETTER 1!
      const rack2Group = new THREE.Group();
      const rack2 = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 3.2, 0.9),
        new THREE.MeshStandardMaterial({ color: 0x090d16, metalness: 0.9, roughness: 0.3 })
      );
      rack2.position.y = 1.6;
      rack2Group.add(rack2);

      // Blinking Mainframe LED Arrays
      for (let row = 0.6; row <= 2.8; row += 0.28) {
        const led = new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 0.06, 0.02),
          new THREE.MeshStandardMaterial({
            color: row > 1.8 ? 0x10b981 : 0x06b6d4,
            emissive: row > 1.8 ? 0x10b981 : 0x06b6d4,
            emissiveIntensity: 0.7,
          })
        );
        led.position.set(0, row, 0.46);
        rack2Group.add(led);
      }

      // Ejectable Blade Sled
      const sledMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.25, 0.85),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9 })
      );
      sledMesh.position.set(0, 1.4, curState.bladeSledEjected ? 0.6 : 0.0);
      rack2Group.add(sledMesh);
      dynamicMeshes.current.rack2Sled = sledMesh;

      rack2Group.position.set(-2.5, 0, -3.5);
      scene.add(rack2Group);
      physicsWorld.addStaticBox([-2.5, 1.6, -3.5], [0.6, 1.6, 0.5]);

      const sledDef: RoomInteractableDef = {
        id: 'r4_rack2_sled',
        name: 'Mainframe Rack 02 Modular Drive Sled',
        prompt: curState.bladeSledEjected
          ? '[E] Inspect Blade Drive / Read Note [V4]'
          : '[E] Eject Mainframe Drive Sled',
        category: 'PHYSICAL_PROP',
        position: [-2.5, 1.4, -3.5],
      };
      targetMeshMap.current.set(sledMesh, sledDef);
      // NOTE: Do not map rack2 (3.2m tall cabinet frame) to sledDef so it never intercepts crosshair clicks!

      // HIDDEN LETTER 1 (ELEVATED & PROMINENT: Mounted on illuminated document tray on top of Drive Sled!)
      const letter1Group = new THREE.Group();
      // Backing Clipboard Plate
      const clipBoard1 = new THREE.Mesh(
        new THREE.BoxGeometry(0.44, 0.03, 0.56),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85, roughness: 0.3 })
      );
      clipBoard1.position.y = 0;
      letter1Group.add(clipBoard1);

      // Gold Document Clip
      const clip1 = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.04, 0.06),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.95 })
      );
      clip1.position.set(0, 0.03, -0.23);
      letter1Group.add(clip1);

      // Glowing Parchment Document
      const letter1Mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.38, 0.5),
        new THREE.MeshStandardMaterial({
          color: 0xfef3c7,
          emissive: 0xfef08a,
          emissiveIntensity: 0.3,
          side: THREE.DoubleSide,
        })
      );
      letter1Mesh.rotation.x = -Math.PI / 2;
      letter1Mesh.position.set(0, 0.02, 0);
      letter1Group.add(letter1Mesh);

      // Generous Hit Proxy Box for effortless crosshair targeting
      const hitProxy1 = new THREE.Mesh(
        new THREE.BoxGeometry(0.75, 0.65, 0.7),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      letter1Group.add(hitProxy1);

      // Position the letter group elevated on top of the drive sled
      letter1Group.rotation.x = -Math.PI * 0.2; // Tilted towards player's line of sight
      letter1Group.position.set(-2.5, 1.58, curState.bladeSledEjected ? -2.75 : -3.35);
      scene.add(letter1Group);
      dynamicMeshes.current.rack2Letter1 = letter1Group as any;

      const letter1Def: RoomInteractableDef = {
        id: 'r4_letter1',
        name: 'Vault Interlock Log [V4] (Drive Sled Document)',
        prompt: '[E] Read Interlock Log  [1] Quick Access',
        category: 'LETTER_1',
        position: [-2.5, 1.58, -3.5],
      };
      targetMeshMap.current.set(letter1Mesh, letter1Def);
      targetMeshMap.current.set(clipBoard1, letter1Def);
      targetMeshMap.current.set(clip1, letter1Def);
      targetMeshMap.current.set(hitProxy1, letter1Def);
      targetMeshMap.current.set(letter1Group, letter1Def);

      // 6. NEW: Supercomputing Server Rack 03 (Optical Fiber Distribution Node, West Wall, Z = -1.8)
      const rack3Group = new THREE.Group();
      const rack3 = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 3.2, 0.9),
        new THREE.MeshStandardMaterial({ color: 0x0c1322, metalness: 0.9, roughness: 0.25 })
      );
      rack3.position.y = 1.6;
      rack3Group.add(rack3);

      // Tinted Glass Front Panel
      const glassDoor = new THREE.Mesh(
        new THREE.BoxGeometry(1.05, 3.0, 0.04),
        new THREE.MeshStandardMaterial({
          color: 0x06b6d4,
          transparent: true,
          opacity: 0.25,
          metalness: 0.9,
          roughness: 0.1,
        })
      );
      glassDoor.position.set(0, 1.6, 0.46);
      rack3Group.add(glassDoor);

      // Fiber Optic Patch Cables (Braided Neon Loops)
      const fiberColors = [0x06b6d4, 0xd946ef, 0x10b981, 0x3b82f6];
      for (let f = 0; f < 6; f++) {
        const loop = new THREE.Mesh(
          new THREE.TorusGeometry(0.12, 0.02, 8, 16, Math.PI),
          new THREE.MeshStandardMaterial({
            color: fiberColors[f % fiberColors.length],
            emissive: fiberColors[f % fiberColors.length],
            emissiveIntensity: 0.8,
          })
        );
        loop.position.set(-0.35 + (f % 3) * 0.35, 1.0 + Math.floor(f / 3) * 0.8, 0.44);
        loop.rotation.z = Math.PI / 2;
        rack3Group.add(loop);
      }

      rack3Group.position.set(-2.5, 0, -1.8);
      scene.add(rack3Group);
      physicsWorld.addStaticBox([-2.5, 1.6, -1.8], [0.6, 1.6, 0.45]);

      const rack3Def: RoomInteractableDef = {
        id: 'r4_server_rack3',
        name: 'Supercomputing Cluster Optical Fiber Node',
        prompt: '[E] Inspect Optical Fiber Patch Bay',
        category: 'PHYSICAL_PROP',
        position: [-2.5, 1.6, -1.8],
      };
      targetMeshMap.current.set(rack3, rack3Def);
      targetMeshMap.current.set(glassDoor, rack3Def);

      // 7. NEW: Wall-Mounted Emergency Safety & Fire Station Cabinet (North Wall, X = -0.6, Z = -5.5)
      // THIS IS THE NEW LOCATION FOR HIDDEN LETTER 2!
      const safetyGroup = new THREE.Group();
      const cabMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.7, roughness: 0.35 });

      // Hollow Cabinet Housing (Back plate, Top, Bottom, Left, Right panels - FRONT IS 100% OPEN!)
      const backWall = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.25, 0.04), cabMat);
      backWall.position.set(0, 0, -0.16);
      safetyGroup.add(backWall);

      const topWall = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.34), cabMat);
      topWall.position.set(0, 0.61, 0);
      safetyGroup.add(topWall);

      const bottomWall = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.34), cabMat);
      bottomWall.position.set(0, -0.61, 0);
      safetyGroup.add(bottomWall);

      const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.25, 0.34), cabMat);
      leftWall.position.set(-0.43, 0, 0);
      safetyGroup.add(leftWall);

      const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.25, 0.34), cabMat);
      rightWall.position.set(0.43, 0, 0);
      safetyGroup.add(rightWall);

      // Hinged Door Group
      const doorPivot = new THREE.Group();
      doorPivot.position.set(-0.43, 0, 0.17);
      const doorPanel = new THREE.Mesh(
        new THREE.BoxGeometry(0.86, 1.2, 0.04),
        new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.8, roughness: 0.3 })
      );
      doorPanel.position.set(0.43, 0, 0);
      doorPivot.add(doorPanel);

      // Clear Glass Window in Door
      const windowMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.5, 0.7),
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.35,
          roughness: 0.1,
          metalness: 0.9,
        })
      );
      windowMesh.position.set(0.43, 0.1, 0.025);
      doorPivot.add(windowMesh);

      // Emergency Cross Emblem
      const crossH = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.08, 0.01),
        new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.2 })
      );
      crossH.position.set(0.43, -0.4, 0.025);
      doorPivot.add(crossH);
      const crossV = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.25, 0.01),
        new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.2 })
      );
      crossV.position.set(0.43, -0.4, 0.025);
      doorPivot.add(crossV);

      // Door Handle
      const safetyHandle = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.22, 0.06),
        new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.95, roughness: 0.2 })
      );
      safetyHandle.position.set(0.8, 0, 0.04);
      doorPivot.add(safetyHandle);

      doorPivot.rotation.y = curState.safetyCabinetOpen ? -Math.PI * 0.75 : 0;
      safetyGroup.add(doorPivot);
      dynamicMeshes.current.safetyCabinetDoor = doorPivot as any;

      safetyGroup.position.set(-0.6, 1.6, -5.5);
      scene.add(safetyGroup);

      const safetyCabDef: RoomInteractableDef = {
        id: 'r4_safety_cabinet',
        name: 'Wall-Mounted Emergency Safety & Fire Station Cabinet',
        prompt: curState.safetyCabinetOpen
          ? '[E] Take Dispatch Slip / Close Cabinet'
          : '[E] Swing Open Safety Cabinet',
        category: 'PHYSICAL_PROP',
        position: [-0.6, 1.6, -5.5],
      };
      targetMeshMap.current.set(doorPanel, safetyCabDef);
      targetMeshMap.current.set(windowMesh, safetyCabDef);
      targetMeshMap.current.set(safetyHandle, safetyCabDef);

      // HIDDEN LETTER 2 (Mounted prominently on Emergency Inspection Clipboard inside Safety Cabinet!)
      const letter2Group = new THREE.Group();
      // Clipboard Backing Plate
      const clipBoard2 = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.52, 0.03),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.4 })
      );
      clipBoard2.position.set(0, 0, 0);
      letter2Group.add(clipBoard2);

      // Gold Document Clip
      const clip2 = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.04, 0.06),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.95 })
      );
      clip2.position.set(0, 0.24, 0.02);
      letter2Group.add(clip2);

      // Glowing Parchment Dispatch Slip
      const letter2Mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.36, 0.46),
        new THREE.MeshStandardMaterial({
          color: 0xfef3c7,
          emissive: 0xfef08a,
          emissiveIntensity: 0.35,
          side: THREE.DoubleSide,
        })
      );
      letter2Mesh.position.set(0, 0, 0.02);
      letter2Group.add(letter2Mesh);

      // Generous Hit Proxy Box for effortless crosshair targeting
      const hitProxy2 = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.8, 0.5),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      letter2Group.add(hitProxy2);

      letter2Group.position.set(-0.5, 1.7, -5.45);
      scene.add(letter2Group);
      dynamicMeshes.current.safetyLetter2 = letter2Group as any;

      const letter2Def: RoomInteractableDef = {
        id: 'r4_letter2',
        name: 'Cryptographic Dispatch Slip (Inside Safety Cabinet)',
        prompt: '[E] Read Dispatch Slip  [2] Quick Access',
        category: 'LETTER_2',
        position: [-0.5, 1.7, -5.45],
      };
      targetMeshMap.current.set(letter2Mesh, letter2Def);
      targetMeshMap.current.set(clipBoard2, letter2Def);
      targetMeshMap.current.set(clip2, letter2Def);
      targetMeshMap.current.set(hitProxy2, letter2Def);
      targetMeshMap.current.set(letter2Group, letter2Def);

      // Heavy Industrial Fire Extinguisher inside Safety Cabinet (Dynamic Throwable Object)
      const extinguisherGroup = new THREE.Group();
      const extBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 0.55, 16),
        new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.8, roughness: 0.3 })
      );
      extBody.position.y = 0.28;
      extinguisherGroup.add(extBody);

      // Brass Head & Lever
      const extHead = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.1, 0.08),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9 })
      );
      extHead.position.set(0, 0.58, 0);
      extinguisherGroup.add(extHead);

      // Black Hose
      const extHose = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.35, 8),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 })
      );
      extHose.position.set(0.11, 0.42, 0);
      extinguisherGroup.add(extHose);

      extinguisherGroup.position.set(-0.6 - 0.14, 1.35, -5.35);
      scene.add(extinguisherGroup);
      const extBinding = physicsWorld.registerDynamicObject(extinguisherGroup, 3.8, [0.12, 0.3, 0.12], 'metal');
      (extinguisherGroup as any).__physicsBinding = extBinding;
      targetMeshMap.current.set(extinguisherGroup, {
        id: 'r4_extinguisher_item',
        name: 'Heavy Industrial Fire Extinguisher',
        prompt: '[E] Grab Fire Extinguisher  [T] Throw',
        category: 'TOOL_PICKUP',
        position: [-0.6 - 0.14, 1.35, -5.35],
      });

      // 8. NEW: Overhead Heavy Industrial Gantry Crane & Motorized Hoist System (Ceiling Y = 3.65)
      const gantryGroup = new THREE.Group();
      // Dual Longitudinal Steel I-Beams (Along Z)
      [-3.2, 3.2].forEach((beamX) => {
        const iBeam = new THREE.Mesh(
          new THREE.BoxGeometry(0.2, 0.3, 11.2),
          new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.85, roughness: 0.4 })
        );
        iBeam.position.set(beamX, 3.65, 0);
        gantryGroup.add(iBeam);
      });

      // Traverse Cross Girder
      const crossGirder = new THREE.Mesh(
        new THREE.BoxGeometry(6.6, 0.32, 0.3),
        new THREE.MeshStandardMaterial({ map: hazardTex, metalness: 0.8 })
      );
      crossGirder.position.set(0, 3.5, 0);
      gantryGroup.add(crossGirder);

      // Motorized Hoist Trolley Block
      const hoistBlock = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.5, 0.8),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9 })
      );
      hoistBlock.position.set(0, 3.2, 0);
      gantryGroup.add(hoistBlock);

      // Steel Suspension Cables
      [-0.15, 0.15].forEach((cableOffset) => {
        const hoistCable = new THREE.Mesh(
          new THREE.CylinderGeometry(0.015, 0.015, 0.9, 8),
          new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.95 })
        );
        hoistCable.position.set(cableOffset, 2.7, 0);
        gantryGroup.add(hoistCable);
      });

      // Forged Steel Lifting Hook
      const hookMesh = new THREE.Mesh(
        new THREE.TorusGeometry(0.12, 0.03, 8, 16, Math.PI * 1.5),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.95 })
      );
      hookMesh.position.set(0, 2.2, 0);
      gantryGroup.add(hookMesh);

      // Suspended Cable Reel / Steel Spool
      const reelFlange1 = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.45, 0.06, 20),
        new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85 })
      );
      reelFlange1.rotation.z = Math.PI / 2;
      reelFlange1.position.set(-0.25, 1.85, 0);
      gantryGroup.add(reelFlange1);

      const reelFlange2 = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.45, 0.06, 20),
        new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85 })
      );
      reelFlange2.rotation.z = Math.PI / 2;
      reelFlange2.position.set(0.25, 1.85, 0);
      gantryGroup.add(reelFlange2);

      const reelCore = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.25, 0.44, 16),
        new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.6 })
      );
      reelCore.rotation.z = Math.PI / 2;
      reelCore.position.set(0, 1.85, 0);
      gantryGroup.add(reelCore);

      scene.add(gantryGroup);

      // 9. NEW: Quantum Optical Laser Interlock Collimator Station (X = -3.4, Z = 3.2)
      const laserGroup = new THREE.Group();
      // Titanium Pedestal Column
      const pedBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.38, 0.44, 0.95, 20),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.2 })
      );
      pedBase.position.y = 0.475;
      laserGroup.add(pedBase);

      // Collimator Emitter Barrel
      const emitterTube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.14, 0.4, 16),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.95 })
      );
      emitterTube.rotation.z = Math.PI / 2;
      emitterTube.position.set(0.1, 1.15, 0);
      laserGroup.add(emitterTube);

      // Glowing Cyan Laser Aperture Lens
      const lensMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0x06b6d4 })
      );
      lensMesh.position.set(0.3, 1.15, 0);
      laserGroup.add(lensMesh);

      // Status Indicator Ring
      const ringMesh = new THREE.Mesh(
        new THREE.TorusGeometry(0.18, 0.02, 8, 24),
        new THREE.MeshStandardMaterial({
          color: curState.laserCalibrated ? 0x10b981 : 0x06b6d4,
          emissive: curState.laserCalibrated ? 0x10b981 : 0x06b6d4,
          emissiveIntensity: 0.8,
        })
      );
      ringMesh.rotation.y = Math.PI / 2;
      ringMesh.position.set(0, 1.15, 0);
      laserGroup.add(ringMesh);

      laserGroup.position.set(-3.4, 0, 3.2);
      scene.add(laserGroup);
      physicsWorld.addStaticBox([-3.4, 0.6, 3.2], [0.4, 0.6, 0.4]);

      const laserDef: RoomInteractableDef = {
        id: 'r4_laser_emitter',
        name: 'Quantum Optical Laser Collimator Pedestal',
        prompt: curState.laserCalibrated ? '[E] Disengage Laser Collimator' : '[E] Calibrate Laser Collimator',
        category: 'PHYSICAL_PROP',
        position: [-3.4, 1.2, 3.2],
      };
      targetMeshMap.current.set(pedBase, laserDef);
      targetMeshMap.current.set(emitterTube, laserDef);
      targetMeshMap.current.set(lensMesh, laserDef);

      // High-Energy Glowing Laser Beam across room (From X = -3.1 to X = 3.6, at Y = 1.15, Z = 3.2)
      const beamGeo = new THREE.CylinderGeometry(0.015, 0.015, 6.7, 12);
      const beamMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
      const beamMesh = new THREE.Mesh(beamGeo, beamMat);
      beamMesh.rotation.z = Math.PI / 2;
      beamMesh.position.set(0.25, 1.15, 3.2);
      scene.add(beamMesh);
      dynamicMeshes.current.laserBeam = beamMesh;

      // Outer Shimmering Halo Sleeve
      const haloGeo = new THREE.CylinderGeometry(0.045, 0.045, 6.7, 12);
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
      });
      const haloMesh = new THREE.Mesh(haloGeo, haloMat);
      haloMesh.rotation.z = Math.PI / 2;
      haloMesh.position.set(0.25, 1.15, 3.2);
      scene.add(haloMesh);
      dynamicMeshes.current.laserHalo = haloMesh;

      // Laser Receiver Prism & Sensor Target on East Wall
      const receptorGroup = new THREE.Group();
      const receptorPlate = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.45, 0.45),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9 })
      );
      receptorGroup.add(receptorPlate);

      const prismCrystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.14),
        new THREE.MeshStandardMaterial({
          color: 0x06b6d4,
          emissive: 0x0284c7,
          emissiveIntensity: 0.5,
          metalness: 0.95,
          roughness: 0.1,
        })
      );
      prismCrystal.position.x = -0.1;
      receptorGroup.add(prismCrystal);

      receptorGroup.position.set(3.6, 1.15, 3.2);
      scene.add(receptorGroup);

      // 10. NEW: Rolling Multi-Tier Maintenance Tool Trolley (X = 1.8, Z = -3.8)
      const trolleyGroup = new THREE.Group();
      // Red Frame & 3 Shelves
      for (let s = 0; s < 3; s++) {
        const shelf = new THREE.Mesh(
          new THREE.BoxGeometry(0.9, 0.04, 0.65),
          new THREE.MeshStandardMaterial({ color: 0xb91c1c, metalness: 0.75, roughness: 0.35 })
        );
        shelf.position.y = 0.15 + s * 0.35;
        trolleyGroup.add(shelf);
      }

      // Vertical Corner Struts
      [-0.42, 0.42].forEach((cx) => {
        [-0.3, 0.3].forEach((cz) => {
          const strut = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.02, 0.85, 8),
            new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9 })
          );
          strut.position.set(cx, 0.45, cz);
          trolleyGroup.add(strut);
        });
      });

      // Tubular Push Handle
      const cartHandle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.55, 8),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.95 })
      );
      cartHandle.rotation.x = Math.PI / 2;
      cartHandle.position.set(-0.48, 0.9, 0);
      trolleyGroup.add(cartHandle);

      trolleyGroup.position.set(1.8, 0, -3.8);
      scene.add(trolleyGroup);
      physicsWorld.addStaticBox([1.8, 0.5, -3.8], [0.45, 0.5, 0.35]);

      const trolleyDef: RoomInteractableDef = {
        id: 'r4_tool_trolley',
        name: 'Rolling Multi-Tier Maintenance Tool Trolley',
        prompt: '[E] Inspect Tool Cart',
        category: 'PHYSICAL_PROP',
        position: [1.8, 0.8, -3.8],
      };
      targetMeshMap.current.set(trolleyGroup, trolleyDef);

      // Digital Multimeter & Signal Analyzer on Tool Trolley (Dynamic Throwable Object)
      const meterGroup = new THREE.Group();
      const meterBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.06, 0.34),
        new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.5, roughness: 0.5 })
      );
      meterGroup.add(meterBody);

      // LCD Screen
      const meterLcd = new THREE.Mesh(
        new THREE.PlaneGeometry(0.16, 0.09),
        new THREE.MeshBasicMaterial({ color: 0x06b6d4 })
      );
      meterLcd.rotation.x = -Math.PI / 2;
      meterLcd.position.set(0, 0.035, -0.06);
      meterGroup.add(meterLcd);

      // Rotary Dial
      const meterDial = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.02, 12),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 })
      );
      meterDial.position.set(0, 0.04, 0.08);
      meterGroup.add(meterDial);

      meterGroup.position.set(1.8, 0.9, -3.8);
      scene.add(meterGroup);
      const meterBinding = physicsWorld.registerDynamicObject(meterGroup, 1.5, [0.12, 0.04, 0.17], 'metal');
      (meterGroup as any).__physicsBinding = meterBinding;
      targetMeshMap.current.set(meterGroup, {
        id: 'r4_multimeter_item',
        name: 'Digital Multimeter & Signal Analyzer',
        prompt: '[E] Pick Up Multimeter  [T] Throw',
        category: 'TOOL_PICKUP',
        position: [1.8, 0.9, -3.8],
      });

      // 11. NEW: High-Pressure Hydraulic Accumulators & Analog Gauges (East Wall, X = 3.6, Z = 0.2)
      const hydGroup = new THREE.Group();
      // Twin Vertical Chrome Accumulators
      [-0.26, 0.26].forEach((ox) => {
        const bottle = new THREE.Mesh(
          new THREE.CylinderGeometry(0.2, 0.2, 1.8, 16),
          new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.95, roughness: 0.15 })
        );
        bottle.position.set(ox, 0.95, 0);
        hydGroup.add(bottle);
      });

      // Connecting Manifold
      const hydManifold = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.12, 0.15),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85 })
      );
      hydManifold.position.set(0, 1.55, 0.18);
      hydGroup.add(hydManifold);

      // Dual Brass Analog Pressure Gauges
      [-0.2, 0.2].forEach((gx) => {
        const gaugeCase = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.12, 0.06, 16),
          new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9 })
        );
        gaugeCase.rotation.x = Math.PI / 2;
        gaugeCase.position.set(gx, 1.75, 0.2);
        hydGroup.add(gaugeCase);

        // White Dial Face
        const dialFace = new THREE.Mesh(
          new THREE.CircleGeometry(0.1, 16),
          new THREE.MeshBasicMaterial({ color: 0xf8fafc })
        );
        dialFace.position.set(gx, 1.75, 0.24);
        hydGroup.add(dialFace);

        // Red Needle
        const needle = new THREE.Mesh(
          new THREE.BoxGeometry(0.015, 0.08, 0.005),
          new THREE.MeshBasicMaterial({ color: 0xdc2626 })
        );
        needle.rotation.z = Math.PI / 4;
        needle.position.set(gx, 1.77, 0.245);
        hydGroup.add(needle);
      });

      hydGroup.position.set(3.6, 0, 0.2);
      scene.add(hydGroup);
      physicsWorld.addStaticBox([3.6, 0.95, 0.2], [0.4, 0.95, 0.4]);

      const hydDef: RoomInteractableDef = {
        id: 'r4_hydraulic_gauge',
        name: 'High-Pressure Hydraulic Accumulator Bank',
        prompt: '[E] Inspect Hydraulic Gauges',
        category: 'PHYSICAL_PROP',
        position: [3.6, 1.5, 0.2],
      };
      targetMeshMap.current.set(hydGroup, hydDef);
      targetMeshMap.current.set(hydManifold, hydDef);

      // 12. NEW: Biometric Hand & Retinal Scanner Pedestal (X = -1.8, Z = 5.0)
      const bioGroup = new THREE.Group();
      // Angled Stanchion
      const bioPole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.24, 1.05, 12),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.3 })
      );
      bioPole.position.y = 0.525;
      bioGroup.add(bioPole);

      // Angled Console Head
      const bioHead = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.1, 0.45),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.95 })
      );
      bioHead.rotation.x = -Math.PI / 6;
      bioHead.position.set(0, 1.12, 0);
      bioGroup.add(bioHead);

      // Glowing Glass Hand Scan Plate
      const bioPlate = new THREE.Mesh(
        new THREE.PlaneGeometry(0.28, 0.3),
        new THREE.MeshStandardMaterial({
          color: 0x06b6d4,
          emissive: 0x06b6d4,
          emissiveIntensity: 0.55,
          roughness: 0.2,
          metalness: 0.8,
        })
      );
      bioPlate.rotation.x = -Math.PI / 2 - Math.PI / 6;
      bioPlate.position.set(0, 1.18, 0.02);
      bioGroup.add(bioPlate);
      dynamicMeshes.current.biometricPlate = bioPlate;

      // Status Indicator LEDs
      const redLed = new THREE.Mesh(
        new THREE.SphereGeometry(0.025, 8, 8),
        new THREE.MeshBasicMaterial({ color: curState.doorUnbolted ? 0x334155 : 0xef4444 })
      );
      redLed.position.set(-0.12, 1.25, -0.1);
      bioGroup.add(redLed);

      const greenLed = new THREE.Mesh(
        new THREE.SphereGeometry(0.025, 8, 8),
        new THREE.MeshBasicMaterial({ color: curState.doorUnbolted ? 0x10b981 : 0x334155 })
      );
      greenLed.position.set(0.12, 1.25, -0.1);
      bioGroup.add(greenLed);

      bioGroup.position.set(-1.8, 0, 5.0);
      scene.add(bioGroup);
      physicsWorld.addStaticBox([-1.8, 0.6, 5.0], [0.25, 0.6, 0.25]);

      const bioDef: RoomInteractableDef = {
        id: 'r4_biometric_pod',
        name: 'Biometric Hand & Retinal Scanner Pedestal',
        prompt: '[E] Scan Biometric ID',
        category: 'PHYSICAL_PROP',
        position: [-1.8, 1.2, 5.0],
      };
      targetMeshMap.current.set(bioGroup, bioDef);
      targetMeshMap.current.set(bioHead, bioDef);
      targetMeshMap.current.set(bioPlate, bioDef);

      // 13. NEW: Industrial Heavy Wooden/Steel Wire Cable Reel (Dynamic Object at X = -3.6, Z = 4.2)
      const spoolGroup = new THREE.Group();
      const flangeGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.05, 16);
      const flangeMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.8 });
      const flangeA = new THREE.Mesh(flangeGeo, flangeMat);
      flangeA.position.y = 0.025;
      spoolGroup.add(flangeA);
      const flangeB = new THREE.Mesh(flangeGeo, flangeMat);
      flangeB.position.y = 0.425;
      spoolGroup.add(flangeB);

      const coreCyl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.38, 16),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 })
      );
      coreCyl.position.y = 0.225;
      spoolGroup.add(coreCyl);

      spoolGroup.position.set(-3.6, 0.05, 4.2);
      scene.add(spoolGroup);
      const spoolBinding = physicsWorld.registerDynamicObject(spoolGroup, 5.0, [0.36, 0.24, 0.36], 'wood');
      (spoolGroup as any).__physicsBinding = spoolBinding;
      targetMeshMap.current.set(spoolGroup, {
        id: 'r4_cable_spool',
        name: 'Heavy Industrial Wire Cable Reel',
        prompt: '[E] Pick up cable reel  [T] Throw',
        category: 'PHYSICAL_PROP',
        position: [-3.6, 0.35, 4.2],
      });

      // 14. NEW: High-Voltage Transformer Safety Bollards
      [1.2, 3.2].forEach((bx) => {
        const bollard = new THREE.Mesh(
          new THREE.CylinderGeometry(0.09, 0.09, 0.9, 12),
          new THREE.MeshStandardMaterial({ map: hazardTex, metalness: 0.85, roughness: 0.3 })
        );
        bollard.position.set(bx, 0.45, -4.6);
        scene.add(bollard);

        const cap = new THREE.Mesh(
          new THREE.SphereGeometry(0.09, 12, 12),
          new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.9 })
        );
        cap.position.set(bx, 0.9, -4.6);
        scene.add(cap);
        physicsWorld.addStaticBox([bx, 0.45, -4.6], [0.1, 0.45, 0.1]);
      });

      // 15. Cryogenic Coolant Storage Station (East Wall, Z = 1.8)
      const cryoGroup = new THREE.Group();
      const tankMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.8, roughness: 0.2 });
      [-0.45, 0.45].forEach((offsetX) => {
        const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 2.5, 20), tankMat);
        tank.position.set(offsetX, 1.25, 0);
        cryoGroup.add(tank);
      });

      const pipeMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 1.6, 12),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 })
      );
      pipeMesh.rotation.z = Math.PI / 2;
      pipeMesh.position.set(0, 2.3, 0);
      cryoGroup.add(pipeMesh);

      const valveMesh = new THREE.Mesh(
        new THREE.TorusGeometry(0.18, 0.03, 8, 24),
        new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.9 })
      );
      valveMesh.position.set(0, 1.4, 0.45);
      cryoGroup.add(valveMesh);
      dynamicMeshes.current.cryoValve = valveMesh;

      cryoGroup.position.set(3.6, 0, 1.8);
      scene.add(cryoGroup);
      physicsWorld.addStaticBox([3.6, 1.25, 1.8], [0.8, 1.25, 0.6]);

      const valveDef: RoomInteractableDef = {
        id: 'r4_cryo_valve',
        name: 'Cryo-Coolant Pressure Relief Valve',
        prompt: '[E] Turn Pressure Relief Valve',
        category: 'PHYSICAL_PROP',
        position: [3.6, 1.4, 1.8],
      };
      targetMeshMap.current.set(valveMesh, valveDef);

      // Pressurized Cryo Canister on Floor (Dynamic Throwable Object)
      const cryoCanisterGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.5, 16);
      const cryoCanisterMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.85, roughness: 0.3 });
      const cryoCanister = new THREE.Mesh(cryoCanisterGeo, cryoCanisterMat);
      cryoCanister.position.set(3.2, 0.3, 1.1);
      scene.add(cryoCanister);
      const canisterBinding = physicsWorld.registerDynamicObject(cryoCanister, 4.0, [0.15, 0.25, 0.15], 'metal');
      (cryoCanister as any).__physicsBinding = canisterBinding;
      targetMeshMap.current.set(cryoCanister, {
        id: 'r4_cryo_canister',
        name: 'Pressurized Cryo Canister',
        prompt: '[E] Pick up canister  [T] Throw',
        category: 'PHYSICAL_PROP',
        position: [3.2, 0.3, 1.1],
      });

      // 16. High-Voltage Step-Down Transformer Bank (North Wall, Z = -5.3)
      const transformerGroup = new THREE.Group();
      const tfCore = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 1.8, 0.8),
        new THREE.MeshStandardMaterial({ map: rustTex, metalness: 0.85, roughness: 0.5 })
      );
      tfCore.position.y = 0.9;
      transformerGroup.add(tfCore);

      for (let insX = -0.5; insX <= 0.5; insX += 0.5) {
        const insulator = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.1, 0.45, 12),
          new THREE.MeshStandardMaterial({ color: 0x93c5fd, roughness: 0.2 })
        );
        insulator.position.set(insX, 2.0, 0);
        transformerGroup.add(insulator);
      }

      const hazardPlate = new THREE.Mesh(
        new THREE.PlaneGeometry(0.8, 0.4),
        new THREE.MeshStandardMaterial({ map: hazardTex })
      );
      hazardPlate.position.set(0, 1.2, 0.42);
      transformerGroup.add(hazardPlate);

      transformerGroup.position.set(2.2, 0, -5.3);
      scene.add(transformerGroup);
      physicsWorld.addStaticBox([2.2, 0.9, -5.3], [0.8, 0.9, 0.4]);

      // 17. Heavy Metal Supply Crate (Dynamic Throwable Object near Server Rack)
      const crateGeo = new THREE.BoxGeometry(0.65, 0.5, 0.65);
      const crateMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.8 });
      const crateMesh = new THREE.Mesh(crateGeo, crateMat);
      crateMesh.position.set(-3.5, 0.25, 1.6);
      scene.add(crateMesh);
      const crateBinding = physicsWorld.registerDynamicObject(crateMesh, 5.5, [0.32, 0.25, 0.32], 'wood');
      (crateMesh as any).__physicsBinding = crateBinding;
      targetMeshMap.current.set(crateMesh, {
        id: 'r4_metal_crate',
        name: 'Heavy Supply Crate',
        prompt: '[E] Pick up crate  [T] Throw',
        category: 'PHYSICAL_PROP',
        position: [-3.5, 0.25, 1.6],
      });

      // 18. Central SCADA Control Desk & Key Box Terminal
      const deskMesh = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 0.9, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7 })
      );
      deskMesh.position.set(0, 0.45, -1.8);
      scene.add(deskMesh);
      physicsWorld.addStaticBox([0, 0.45, -1.8], [1.2, 0.45, 0.6]);

      // Terminal Screen on Desk
      const terminalScreen = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.6, 0.15),
        new THREE.MeshStandardMaterial({
          color: 0x020617,
          emissive: 0x3b82f6,
          emissiveIntensity: 0.35,
        })
      );
      terminalScreen.position.set(0, 1.25, -1.8);
      scene.add(terminalScreen);

      const terminalDef: RoomInteractableDef = {
        id: 'r4_keybox',
        name: 'Master SCADA Terminal & Vault Console',
        prompt: '[E] Access Master SCADA Terminal',
        category: 'KEY_BOX',
        position: [0, 1.25, -1.8],
      };
      targetMeshMap.current.set(terminalScreen, terminalDef);

      // SCADA Diagnostic Tablet on Desk (Dynamic Throwable Object)
      const tabletGeo = new THREE.BoxGeometry(0.35, 0.04, 0.45);
      const tabletMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x0284c7, emissiveIntensity: 0.2 });
      const tabletMesh = new THREE.Mesh(tabletGeo, tabletMat);
      tabletMesh.position.set(-0.6, 0.95, -1.8);
      scene.add(tabletMesh);
      const tabletBinding = physicsWorld.registerDynamicObject(tabletMesh, 1.2, [0.18, 0.02, 0.22], 'metal');
      (tabletMesh as any).__physicsBinding = tabletBinding;
      targetMeshMap.current.set(tabletMesh, {
        id: 'r4_tablet_item',
        name: 'SCADA Operations Diagnostic Tablet',
        prompt: '[E] Pick up tablet  [T] Throw',
        category: 'PHYSICAL_PROP',
        position: [-0.6, 0.95, -1.8],
      });

      // 19. CHAMPIONSHIP EXTRACTION FLAG (Spawns beyond vault door when cracked)
      if (curState.techSolved) {
        const flagGroup = new THREE.Group();
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.04, 2.5, 12),
          new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9 })
        );
        pole.position.y = 1.25;
        flagGroup.add(pole);

        const banner = new THREE.Mesh(
          new THREE.PlaneGeometry(1.2, 0.7),
          new THREE.MeshStandardMaterial({
            color: 0x06b6d4,
            emissive: 0x06b6d4,
            emissiveIntensity: 0.4,
            side: THREE.DoubleSide,
          })
        );
        banner.position.set(0.6, 2.0, 0);
        flagGroup.add(banner);

        flagGroup.position.set(0, 0, cfg.roomBounds.maxZ + 2.0);
        scene.add(flagGroup);

        const flagDef: RoomInteractableDef = {
          id: 'r4_flag',
          name: 'CHAMPIONSHIP VICTORY FLAG',
          prompt: '[E] CAPTURE CHAMPIONSHIP FLAG & ESCAPE!',
          category: 'FLAG',
          position: [0, 1.5, cfg.roomBounds.maxZ + 2.0],
        };
        targetMeshMap.current.set(flagGroup, flagDef);
      }
    }
  };

  // ==========================================================================
  // FIRST-PERSON KINEMATICS, COLLISION & CROUCH
  // ==========================================================================
  const updateMovement = (delta: number) => {
    const camera = cameraRef.current;
    if (!camera) return;

    // 1. Smooth Camera Look Yaw & Pitch (Responsive, buttery subpixel interpolation)
    const lookDamping = 36;
    cameraYaw.current += (targetYaw.current - cameraYaw.current) * Math.min(delta * lookDamping, 1.0);
    cameraPitch.current += (targetPitch.current - cameraPitch.current) * Math.min(delta * lookDamping, 1.0);

    // 2. Smooth Crouch Transition (1.65m standing eye height, 0.95m crouch)
    targetEyeHeight.current = isCrouching.current ? 0.95 : 1.65;
    currentEyeHeight.current += (targetEyeHeight.current - currentEyeHeight.current) * Math.min(delta * 14, 1.0);

    // 3. Smooth Acceleration & Deceleration (Horizontal Kinematics)
    const baseSpeed = isCrouching.current
      ? 2.0
      : keysPressed.current['ShiftLeft'] || keysPressed.current['ShiftRight']
      ? 5.8
      : 3.5;

    const moveVector = new THREE.Vector3(0, 0, 0);
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw.current);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw.current);

    if (keysPressed.current['KeyW'] || keysPressed.current['ArrowUp']) moveVector.add(forward);
    if (keysPressed.current['KeyS'] || keysPressed.current['ArrowDown']) moveVector.sub(forward);
    if (keysPressed.current['KeyD'] || keysPressed.current['ArrowRight']) moveVector.add(right);
    if (keysPressed.current['KeyA'] || keysPressed.current['ArrowLeft']) moveVector.sub(right);

    const isMoving = moveVector.lengthSq() > 0.001;
    if (isMoving) {
      moveVector.normalize();
    }

    const targetVelX = isMoving ? moveVector.x * baseSpeed : 0;
    const targetVelZ = isMoving ? moveVector.z * baseSpeed : 0;

    // Responsive acceleration, smooth gentle damping upon release
    const accelRate = isMoving ? 20 : 16;
    horizontalVelocity.current.x += (targetVelX - horizontalVelocity.current.x) * Math.min(delta * accelRate, 1.0);
    horizontalVelocity.current.y += (targetVelZ - horizontalVelocity.current.y) * Math.min(delta * accelRate, 1.0);

    playerPos.current.x += horizontalVelocity.current.x * delta;
    playerPos.current.z += horizontalVelocity.current.y * delta;

    // 4. Natural Footstep Pacing
    const currentSpeedSq = horizontalVelocity.current.x ** 2 + horizontalVelocity.current.y ** 2;
    if (isGrounded.current && currentSpeedSq > 0.15) {
      footstepAccumulator.current += delta;
      const stepInterval = keysPressed.current['ShiftLeft'] || keysPressed.current['ShiftRight'] ? 0.32 : 0.46;
      if (footstepAccumulator.current >= stepInterval) {
        escapeAudio.playFootstep();
        footstepAccumulator.current = 0;
      }
    } else {
      footstepAccumulator.current = Math.min(footstepAccumulator.current, 0.1);
    }

    // 5. Jump & Gravity with Ceiling Collision Guard
    if (keysPressed.current['Space'] && isGrounded.current && !isCrouching.current) {
      playerVelocity.current.y = 4.6;
      isGrounded.current = false;
      escapeAudio.playFootstep();
    }

    if (!isGrounded.current) {
      playerVelocity.current.y -= 14.0 * delta; // Gravity
      playerPos.current.y += playerVelocity.current.y * delta;
      if (playerPos.current.y <= currentEyeHeight.current) {
        playerPos.current.y = currentEyeHeight.current;
        playerVelocity.current.y = 0;
        isGrounded.current = true;
      }
    } else {
      playerPos.current.y = currentEyeHeight.current;
    }
    // Prevent clipping above ceiling
    playerPos.current.y = Math.min(playerPos.current.y, 3.8);

    // 6. Perimeter Wall Collision (0.55m padding prevents camera near-clipping)
    const bounds = roomConfig.roomBounds;
    const wallPadding = 0.55;
    playerPos.current.x = Math.max(bounds.minX + wallPadding, Math.min(bounds.maxX - wallPadding, playerPos.current.x));
    playerPos.current.z = Math.max(bounds.minZ + wallPadding, Math.min(bounds.maxZ - wallPadding, playerPos.current.z));

    // 7. Interior Furniture & Object Collision (Prevents camera from clipping into furniture)
    const obstacles = ROOM_OBSTACLES[roomConfig.roomId] || [];
    const playerRadius = 0.45;
    for (const obs of obstacles) {
      const minX = obs.minX - playerRadius;
      const maxX = obs.maxX + playerRadius;
      const minZ = obs.minZ - playerRadius;
      const maxZ = obs.maxZ + playerRadius;
      if (
        playerPos.current.x > minX &&
        playerPos.current.x < maxX &&
        playerPos.current.z > minZ &&
        playerPos.current.z < maxZ
      ) {
        const dLeft = playerPos.current.x - minX;
        const dRight = maxX - playerPos.current.x;
        const dTop = playerPos.current.z - minZ;
        const dBottom = maxZ - playerPos.current.z;
        const minOverlap = Math.min(dLeft, dRight, dTop, dBottom);
        if (minOverlap === dLeft) playerPos.current.x = minX;
        else if (minOverlap === dRight) playerPos.current.x = maxX;
        else if (minOverlap === dTop) playerPos.current.z = minZ;
        else playerPos.current.z = maxZ;
      }
    }

    // 8. Synchronize Camera Position & Rotation (Level Horizon, YXZ order)
    camera.position.copy(playerPos.current);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = cameraYaw.current;
    camera.rotation.x = cameraPitch.current;
    camera.rotation.z = 0; // Strictly 0: No unwanted roll or diagonal tilting!
  };

  // ==========================================================================
  // HELD OBJECT UPDATES (CARRY DISTANCE, 3D ROTATE WITH R, CHARGE THROW)
  // ==========================================================================
  const updateHeldObject = (delta: number) => {
    const camera = cameraRef.current;
    const binding = heldBindingRef.current;
    if (!camera || !binding) return;

    // Update Throw Power Meter
    if (isChargingThrowRef.current) {
      const elapsed = (performance.now() - throwChargeStartRef.current) / 1000;
      const power = Math.min(elapsed / 1.1, 1.0);
      setThrowMeterPercent(Math.round(power * 100));
    }

    // Calculate carry target position in front of camera
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);

    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(forward, up).normalize();
    const actualUp = new THREE.Vector3().crossVectors(right, forward).normalize();

    const targetPos = camera.position
      .clone()
      .add(forward.clone().multiplyScalar(carryDistanceRef.current))
      .sub(actualUp.clone().multiplyScalar(0.2));

    binding.mesh.position.lerp(targetPos, Math.min(delta * 22, 1.0));

    // Combine camera orientation with local held rotation (from [R] mouse drag)
    const combinedQuat = camera.quaternion.clone();
    const rotQuat = new THREE.Quaternion().setFromEuler(heldRotationRef.current);
    combinedQuat.multiply(rotQuat);
    binding.mesh.quaternion.slerp(combinedQuat, Math.min(delta * 20, 1.0));

    // Sync kinematic cannon body
    binding.body.position.set(binding.mesh.position.x, binding.mesh.position.y, binding.mesh.position.z);
    binding.body.quaternion.set(
      binding.mesh.quaternion.x,
      binding.mesh.quaternion.y,
      binding.mesh.quaternion.z,
      binding.mesh.quaternion.w
    );
  };

  // ==========================================================================
  // RAYCASTING FOR CROSSHAIR & PROMPT (ESCAPE SIMULATOR STYLE)
  // ==========================================================================
  const checkCrosshairRaycast = () => {
    const camera = cameraRef.current;
    const scene = sceneRef.current;
    if (!camera || !scene) return;

    // If holding an object, context is different
    if (heldBindingRef.current) {
      setHoveredPrompt({
        text: `Holding ${heldBindingRef.current.mesh.name || 'Object'}`,
        subText: `[T Hold] Throw  |  [R+Mouse] 3D Rotate  |  [Wheel] Distance (${carryDistanceRef.current.toFixed(1)}m)  |  [Q] Drop  |  [F] Inspect`,
        isPickable: false,
        isInteractable: true,
      });
      return;
    }

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

    const intersects = raycaster.intersectObjects(scene.children, true);
    let foundInteractable: RoomInteractableDef | null = null;
    let foundBinding: PhysicsObjectBinding | null = null;

    let bestInteractable: RoomInteractableDef | null = null;
    let bestBinding: PhysicsObjectBinding | null = null;
    let bestScore = -1;

    for (const hit of intersects) {
      if (hit.distance > 4.5) break;

      let obj: THREE.Object3D | null = hit.object;
      let hitInteractable: RoomInteractableDef | null = null;
      let hitBinding: PhysicsObjectBinding | null = null;

      while (obj) {
        if (!hitBinding && (obj as any).__physicsBinding) {
          hitBinding = (obj as any).__physicsBinding;
        }
        if (!hitInteractable && targetMeshMap.current.has(obj)) {
          hitInteractable = targetMeshMap.current.get(obj)!;
        }
        obj = obj.parent;
      }

      if (hitInteractable) {
        let score = 10;
        if (hitInteractable.category === 'LETTER_1' || hitInteractable.category === 'LETTER_2') {
          score = 100; // Letters and clue notes take absolute priority!
        } else if (
          hitInteractable.category === 'KEY_BOX' ||
          hitInteractable.category === 'EXIT_DOOR' ||
          hitInteractable.category === 'FLAG'
        ) {
          score = 80;
        } else if (hitInteractable.category === 'CIRCUIT_PANEL') {
          score = 70;
        } else if (hitInteractable.category === 'TOOL_PICKUP') {
          score = 60;
        }

        if (score > bestScore) {
          bestScore = score;
          bestInteractable = hitInteractable;
          if (hitBinding) bestBinding = hitBinding;
          // Letters and key boxes lock in immediately without being blocked by outer furniture
          if (score >= 80) break;
        }
      } else if (hitBinding && bestScore < 40) {
        bestScore = 40;
        bestBinding = hitBinding;
      }
    }

    hoveredTargetRef.current = bestInteractable;
    hoveredPhysicsBindingRef.current = bestBinding;

    if (bestInteractable) {
      setHoveredPrompt({
        text: bestInteractable.name,
        subText: bestInteractable.prompt,
        isPickable: bestInteractable.category === 'PHYSICAL_PROP',
        isContainer: bestInteractable.category === 'PHYSICAL_PROP' && bestInteractable.prompt.includes('Open'),
        isInteractable: true,
      });
    } else if (bestBinding) {
      setHoveredPrompt({
        text: bestBinding.mesh.name || 'Physical Object',
        subText: '[E] Pick up  [T] Throw  [C] Crouch to search',
        isPickable: true,
        isInteractable: true,
      });
    } else {
      setHoveredPrompt(null);
    }
  };

  // ==========================================================================
  // PICK UP / DROP / THROW / INSPECT ACTIONS
  // ==========================================================================
  const pickUpObject = (binding: PhysicsObjectBinding) => {
    if (!physicsWorldRef.current) return;
    heldBindingRef.current = binding;
    physicsWorldRef.current.setHeld(binding, true);
    carryDistanceRef.current = 1.2;
    heldRotationRef.current.set(0, 0, 0);
    escapeAudio.playGrab();
  };

  const dropHeldObject = () => {
    if (!heldBindingRef.current || !physicsWorldRef.current || !cameraRef.current) return;
    const forward = new THREE.Vector3();
    cameraRef.current.getWorldDirection(forward);
    physicsWorldRef.current.dropBody(heldBindingRef.current, forward);
    heldBindingRef.current = null;
    setThrowMeterPercent(0);
    isChargingThrowRef.current = false;
  };

  const throwHeldObject = (power: number) => {
    if (!heldBindingRef.current || !physicsWorldRef.current || !cameraRef.current) return;
    const forward = new THREE.Vector3();
    cameraRef.current.getWorldDirection(forward);
    physicsWorldRef.current.throwBody(heldBindingRef.current, forward, power);
    heldBindingRef.current = null;
    setThrowMeterPercent(0);
    isChargingThrowRef.current = false;
  };

  // ==========================================================================
  // INTERACT WITH SCENE TARGET
  // ==========================================================================
  const triggerInteraction = (target: RoomInteractableDef) => {
    suppressStrayERef.current = true;
    setTimeout(() => {
      suppressStrayERef.current = false;
    }, 200);
    const roomId = progress.currentRoomId;
    const roomState = progress.roomStates[roomId] || {};

    // 1. HIDDEN LETTER 1
    if (target.category === 'LETTER_1') {
      escapeAudio.playPaperRustle();
      setActiveNoteModal({
        step: 'LETTER_1',
        title: roomConfig.letter1.title,
        storyLocation: roomConfig.letter1.storyLocation,
        code: roomConfig.letter1.engravedCode,
        paperText: roomConfig.letter1.paperText,
        puzzleQuestion: roomConfig.letter1.puzzleQuestion,
        revealClue: roomConfig.letter1.revealClue,
        hint: roomConfig.letter1.hint,
      });
      setPuzzleInput('');
      setPuzzleFeedback(null);
      return;
    }

    // 2. HIDDEN LETTER 2
    if (target.category === 'LETTER_2') {
      escapeAudio.playPaperRustle();
      setActiveNoteModal({
        step: 'LETTER_2',
        title: roomConfig.letter2.title,
        storyLocation: roomConfig.letter2.storyLocation,
        code: 'CLUE-2',
        paperText: roomConfig.letter2.paperText,
        puzzleQuestion: roomConfig.letter2.puzzleQuestion,
        revealClue: roomConfig.letter2.revealClue,
        hint: roomConfig.letter2.hint,
      });
      setPuzzleInput('');
      setPuzzleFeedback(null);
      return;
    }

    // 3. KEY BOX / TERMINAL
    if (target.category === 'KEY_BOX') {
      escapeAudio.playKeypadBeep(650);
      setActiveKeyBoxTerminal(true);
      setKeyBoxInput('');
      setVenueKeyInput('');
      setKeyBoxFeedback(null);
      return;
    }

    // 4. HIGH-VOLTAGE CIRCUIT (Room 3)
    if (target.category === 'CIRCUIT_PANEL') {
      escapeAudio.playElectricSpark();
      setActiveCircuitPanel(true);
      return;
    }


    // 6. SPECIFIC PHYSICAL PROPS
    if (target.id === 'r1_bunk_mattress') {
      // Flip Mattress
      const flipped = !roomState.mattressFlipped;
      setProgress((prev) => ({
        ...prev,
        roomStates: {
          ...prev.roomStates,
          [roomId]: { ...prev.roomStates[roomId], mattressFlipped: flipped },
        },
      }));
      escapeAudio.playImpact('wood', 0.6);
      if (dynamicMeshes.current.mattress) {
        dynamicMeshes.current.mattress.position.set(-2.5, flipped ? 1.4 : 0.75, -2.5);
        dynamicMeshes.current.mattress.rotation.z = flipped ? Math.PI * 0.4 : 0;
      }
      logObjective('Flipped the bunk bed mattress! A note is taped to the bed slats.');
      return;
    }

    if (target.id === 'r1_breaker_panel') {
      // Open Breaker Door
      const open = !roomState.breakerDoorOpen;
      setProgress((prev) => ({
        ...prev,
        roomStates: {
          ...prev.roomStates,
          [roomId]: { ...prev.roomStates[roomId], breakerDoorOpen: open },
        },
      }));
      escapeAudio.playUnboltClunk();
      if (dynamicMeshes.current.breakerDoor) {
        dynamicMeshes.current.breakerDoor.position.set(open ? 0.45 : 0, 0, open ? 0.45 : 0.14);
        dynamicMeshes.current.breakerDoor.rotation.y = open ? -Math.PI * 0.6 : 0;
      }
      logObjective('Swung open the rusty breaker box. High-voltage conduits and wiring exposed.');
      return;
    }

    if (target.id === 'r1_crt_tv') {
      // Tilt / Slide TV Aside
      const moved = !roomState.tvMoved;
      setProgress((prev) => ({
        ...prev,
        roomStates: {
          ...prev.roomStates,
          [roomId]: { ...prev.roomStates[roomId], tvMoved: moved },
        },
      }));
      escapeAudio.playImpact('metal', 0.8);
      if (dynamicMeshes.current.tv) {
        dynamicMeshes.current.tv.position.set(moved ? -2.1 : -2.8, moved ? 0.4 : 1.3, moved ? 2.4 : 3.2);
        dynamicMeshes.current.tv.rotation.y = moved ? 0.5 : 0;
      }
      logObjective('Pushed the heavy CRT TV aside. Security Key Box uncovered in wall niche!');
      return;
    }

    if (target.id === 'r2_desk_drawer') {
      const open = !roomState.deskDrawerOpen;
      setProgress((prev) => ({
        ...prev,
        roomStates: {
          ...prev.roomStates,
          [roomId]: { ...prev.roomStates[roomId], deskDrawerOpen: open },
        },
      }));
      escapeAudio.playImpact('wood', 0.5);
      if (dynamicMeshes.current.deskDrawer) {
        dynamicMeshes.current.deskDrawer.position.z = open ? -1.4 : -2.0;
      }
      logObjective('Slid the officer desk drawer open. Inspecting false bottom.');
      return;
    }

    if (target.id === 'r2_scope_mat') {
      const moved = !roomState.scopeMatMoved;
      setProgress((prev) => ({
        ...prev,
        roomStates: {
          ...prev.roomStates,
          [roomId]: { ...prev.roomStates[roomId], scopeMatMoved: moved },
        },
      }));
      escapeAudio.playImpact('wood', 0.4);
      if (dynamicMeshes.current.scopeMat) {
        dynamicMeshes.current.scopeMat.position.set(2.2, moved ? 0.95 : 0.92, moved ? -1.5 : -2.2);
      }
      logObjective('Lifted the oscilloscope rubber mat. Discovered hidden note!');
      return;
    }

    if (target.id === 'r2_wall_clock') {
      const taken = !roomState.wallClockTaken;
      setProgress((prev) => ({
        ...prev,
        roomStates: {
          ...prev.roomStates,
          [roomId]: { ...prev.roomStates[roomId], wallClockTaken: taken },
        },
      }));
      escapeAudio.playImpact('glass', 0.7);
      if (dynamicMeshes.current.wallClock) {
        dynamicMeshes.current.wallClock.position.set(
          taken ? -2.0 : roomConfig.roomBounds.minX + 0.08,
          taken ? 0.1 : 2.4,
          taken ? 1.5 : 0
        );
      }
      logObjective('Removed the industrial wall clock. Uncovered Comms Key Box!');
      return;
    }

    if (target.id === 'r3_cable_cover') {
      const lifted = !roomState.cableCoverLifted;
      setProgress((prev) => ({
        ...prev,
        roomStates: {
          ...prev.roomStates,
          [roomId]: { ...prev.roomStates[roomId], cableCoverLifted: lifted },
        },
      }));
      escapeAudio.playImpact('metal', 0.9);
      if (dynamicMeshes.current.cableCover) {
        dynamicMeshes.current.cableCover.position.set(0, lifted ? 0.1 : 0.04, lifted ? 1.6 : 0);
        dynamicMeshes.current.cableCover.rotation.z = lifted ? 0.2 : 0;
      }
      logObjective('Lifted the heavy diamond-plate cable cover. Found note in conduits!');
      return;
    }

    if (target.id === 'r3_fan_guard') {
      const removed = !roomState.fanGuardRemoved;
      setProgress((prev) => ({
        ...prev,
        roomStates: {
          ...prev.roomStates,
          [roomId]: { ...prev.roomStates[roomId], fanGuardRemoved: removed },
        },
      }));
      escapeAudio.playUnboltClunk();
      if (dynamicMeshes.current.fanGuard) {
        dynamicMeshes.current.fanGuard.position.set(
          roomConfig.roomBounds.maxX - (removed ? 0.5 : 0.25),
          removed ? 0.1 : 2.4,
          -2.0
        );
      }
      logObjective('Unscrewed the fan protective grill. Note accessible behind blades!');
      return;
    }

    if (target.id === 'r3_ceiling_hatch') {
      if (!roomState.ropeCut) {
        // Cut rope with utility knife
        setProgress((prev) => ({
          ...prev,
          roomStates: {
            ...prev.roomStates,
            [roomId]: { ...prev.roomStates[roomId], ropeCut: true },
          },
        }));
        escapeAudio.playUnboltClunk();
        logObjective('Cut the rope binding the ceiling hatch! Reached the overhead Key Box.');
      }
      setActiveKeyBoxTerminal(true);
      return;
    }

    if (target.id === 'r4_diagnostic_drawer') {
      const pulled = !roomState.diagnosticDrawerPulled;
      setProgress((prev) => ({
        ...prev,
        roomStates: {
          ...prev.roomStates,
          [roomId]: { ...prev.roomStates[roomId], diagnosticDrawerPulled: pulled },
        },
      }));
      escapeAudio.playImpact('metal', 0.6);
      if (dynamicMeshes.current.diagnosticDrawer) {
        dynamicMeshes.current.diagnosticDrawer.position.z = pulled ? -1.95 : -2.5;
      }
      logObjective(pulled ? 'Opened Diagnostic Workbench tool drawer. Precision diagnostic leads and spare fuses inside.' : 'Closed the tool drawer.');
      return;
    }

    if (target.id === 'r4_trench_hatch') {
      const opened = !roomState.trenchHatchOpen;
      setProgress((prev) => ({
        ...prev,
        roomStates: {
          ...prev.roomStates,
          [roomId]: { ...prev.roomStates[roomId], trenchHatchOpen: opened },
        },
      }));
      escapeAudio.playImpact('metal', 0.85);
      if (dynamicMeshes.current.trenchHatch) {
        dynamicMeshes.current.trenchHatch.position.x = opened ? -0.8 : -1.8;
      }
      logObjective(opened ? 'Slid open the sub-floor hydraulic conduit trench hatch. Armored cables route through floor.' : 'Closed the sub-floor conduit hatch.');
      return;
    }

    if (target.id === 'r4_battery_drawer') {
      const pulled = !roomState.batteryDrawerPulled;
      setProgress((prev) => ({
        ...prev,
        roomStates: {
          ...prev.roomStates,
          [roomId]: { ...prev.roomStates[roomId], batteryDrawerPulled: pulled },
        },
      }));
      escapeAudio.playImpact('metal', 0.6);
      if (dynamicMeshes.current.batteryDrawer) {
        dynamicMeshes.current.batteryDrawer.position.set(0.1, 0.7, pulled ? 0.85 : 0.05);
      }
      logObjective(pulled ? 'Pulled open the backup battery tray. High-capacity power cells active!' : 'Closed the battery tray.');
      return;
    }

    if (target.id === 'r4_cryo_valve') {
      const vented = !roomState.cryoValveVented;
      setProgress((prev) => ({
        ...prev,
        roomStates: {
          ...prev.roomStates,
          [roomId]: { ...prev.roomStates[roomId], cryoValveVented: vented },
        },
      }));
      escapeAudio.playElectricSpark();
      if (dynamicMeshes.current.cryoValve) {
        dynamicMeshes.current.cryoValve.rotation.z += Math.PI * 0.5;
      }
      logObjective(vented ? 'Turned cryogenic pressure relief valve! Pneumatic hiss purged manifold.' : 'Reset pressure relief valve.');
      return;
    }

    if (target.id === 'r4_rack2_sled') {
      if (roomState.bladeSledEjected && !roomState.letter1Solved) {
        // Direct note access when sled is already open!
        escapeAudio.playPaperRustle();
        setActiveNoteModal({
          step: 'LETTER_1',
          title: roomConfig.letter1.title,
          storyLocation: roomConfig.letter1.storyLocation,
          code: roomConfig.letter1.engravedCode,
          paperText: roomConfig.letter1.paperText,
          puzzleQuestion: roomConfig.letter1.puzzleQuestion,
          revealClue: roomConfig.letter1.revealClue,
          hint: roomConfig.letter1.hint,
        });
        setPuzzleInput('');
        setPuzzleFeedback(null);
        return;
      }
      const ejected = !roomState.bladeSledEjected;
      setProgress((prev) => ({
        ...prev,
        roomStates: {
          ...prev.roomStates,
          [roomId]: { ...prev.roomStates[roomId], bladeSledEjected: ejected },
        },
      }));
      escapeAudio.playUnboltClunk();
      if (dynamicMeshes.current.rack2Sled) {
        dynamicMeshes.current.rack2Sled.position.z = ejected ? 0.6 : 0.0;
      }
      if (dynamicMeshes.current.rack2Letter1) {
        dynamicMeshes.current.rack2Letter1.position.z = ejected ? -2.75 : -3.35;
      }
      logObjective(
        ejected
          ? 'Ejected modular blade drive sled from Mainframe Rack 02! Hidden Note #1 [V4] is ready on top of drive tray.'
          : 'Re-seated blade drive sled into rack.'
      );
      return;
    }

    if (target.id === 'r4_safety_cabinet') {
      if (roomState.safetyCabinetOpen && !roomState.letter2Solved) {
        // Direct note access when cabinet is already open!
        escapeAudio.playPaperRustle();
        setActiveNoteModal({
          step: 'LETTER_2',
          title: roomConfig.letter2.title,
          storyLocation: roomConfig.letter2.storyLocation,
          code: 'CLUE-2',
          paperText: roomConfig.letter2.paperText,
          puzzleQuestion: roomConfig.letter2.puzzleQuestion,
          revealClue: roomConfig.letter2.revealClue,
          hint: roomConfig.letter2.hint,
        });
        setPuzzleInput('');
        setPuzzleFeedback(null);
        return;
      }
      const open = !roomState.safetyCabinetOpen;
      setProgress((prev) => ({
        ...prev,
        roomStates: {
          ...prev.roomStates,
          [roomId]: { ...prev.roomStates[roomId], safetyCabinetOpen: open },
        },
      }));
      escapeAudio.playUnboltClunk();
      if (dynamicMeshes.current.safetyCabinetDoor) {
        dynamicMeshes.current.safetyCabinetDoor.rotation.y = open ? -Math.PI * 0.75 : 0;
      }
      logObjective(
        open
          ? 'Swung open Wall-Mounted Emergency Safety & Fire Cabinet! Note #2 (Cryptographic Dispatch Slip) is inside.'
          : 'Closed the emergency safety cabinet.'
      );
      return;
    }

    if (target.id === 'r4_laser_emitter') {
      const calibrated = !roomState.laserCalibrated;
      setProgress((prev) => ({
        ...prev,
        roomStates: {
          ...prev.roomStates,
          [roomId]: { ...prev.roomStates[roomId], laserCalibrated: calibrated },
        },
      }));
      escapeAudio.playKeypadBeep(880);
      escapeAudio.playElectricSpark();
      logObjective(calibrated ? 'Calibrated Quantum Optical Laser Collimator! Beam frequency locked at 632.8 nm.' : 'Reset optical laser collimator.');
      return;
    }

    if (target.id === 'r4_biometric_pod') {
      escapeAudio.playKeypadBeep(720);
      escapeAudio.playElectricSpark();
      logObjective('Engaged Biometric Hand & Retinal Scanner: "INTERLOCK ACTIVE // REQUIRES CHAMPIONSHIP EXTRACTION PASS"');
      return;
    }

    if (target.id === 'r4_hydraulic_gauge') {
      escapeAudio.playImpact('metal', 0.5);
      logObjective('Inspected Hydraulic Accumulator Gauges: Main line pressure 3,250 PSI [NOMINAL]. Secondary accumulator fully charged.');
      return;
    }

    if (target.id === 'r4_server_rack3') {
      escapeAudio.playKeypadBeep(940);
      logObjective('Supercomputing Cluster Optical Fiber Node: High-throughput photonic packet stream active across multi-colored fibers.');
      return;
    }

    if (target.id === 'r4_tool_trolley') {
      escapeAudio.playImpact('metal', 0.4);
      logObjective('Inspected Rolling Maintenance Tool Trolley. Precision tools and Digital Multimeter ready on rubber mat.');
      return;
    }

    if (target.id === 'r4_vault_door') {
      if (!roomState.doorUnbolted && !roomState.techSolved) {
        escapeAudio.playErrorBuzz();
        logObjective('Master Pneumatic Vault Blast Door is locked with heavy hydraulic bolts! Solve the final technical puzzle at the Master SCADA Terminal.');
        return;
      }
      setShowVictoryModal(true);
      return;
    }

    // 7. EXIT DOOR INTERACTION
    if (target.category === 'EXIT_DOOR') {
      if (!roomState.doorUnbolted) {
        escapeAudio.playErrorBuzz();
        logObjective('Portal locked! Must solve technical question at the Key Box first.');
        return;
      }
      advanceToNextRoom();
      return;
    }

    // 8. CHAMPIONSHIP FLAG (Room 4)
    if (target.category === 'FLAG') {
      escapeAudio.playVictoryFanfare();
      confetti({
        particleCount: 180,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#06b6d4', '#eab308', '#ec4899', '#3b82f6'],
      });
      setShowVictoryModal(true);
      return;
    }
  };

  // ==========================================================================
  // VERIFY PUZZLE 1 & 2 ANSWERS
  // ==========================================================================
  const handleSolveNotePuzzle = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!activeNoteModal) return;

    if (!puzzleInput.trim()) {
      setPuzzleFeedback({
        success: false,
        message: 'Please enter your decoded answer before verifying.',
      });
      return;
    }

    const roomId = progress.currentRoomId;
    const step = activeNoteModal.step;

    const res = verify(
      roomId,
      step,
      puzzleInput.trim(),
      progress.cumulativeErrors,
      progress.hintsUsedCount,
      teamSetId
    );

    // Sync with backend API (best-effort, local progress is already authoritative)
    api.escapeVerify({
      roomId,
      step,
      input: puzzleInput.trim(),
      currentErrors: progress.cumulativeErrors,
      currentHints: progress.hintsUsedCount,
      setId: teamSetId,
    }).catch((err) => console.warn('Escape room API sync notice:', err));

    if (res.success) {
      escapeAudio.playUnboltClunk();
      setPuzzleFeedback({ success: true, message: res.message });

      setProgress((prev) => {
        const curRoomState = prev.roomStates[roomId] || {};
        const updatedRoom = {
          ...curRoomState,
          [step === 'LETTER_1' ? 'letter1Solved' : 'letter2Solved']: true,
        };

        const newLogEntry =
          step === 'LETTER_1'
            ? `Letter 1 Solved! Revealed Clue: "${res.revealedClue}"`
            : `Letter 2 Solved! Revealed Clue: "${res.revealedClue}"`;

        return {
          ...prev,
          roomStates: { ...prev.roomStates, [roomId]: updatedRoom },
          netScore: computeNetScore(BASE_SCORE, prev.cumulativeErrors, prev.hintsUsedCount),
          objectiveLog: [newLogEntry, ...prev.objectiveLog].slice(0, 10),
        };
      });

      if (onRefreshTeam) onRefreshTeam();
    } else {
      escapeAudio.playErrorBuzz();
      const newErrors = progress.cumulativeErrors + 1;
      const isWarn = newErrors % 3 === 2;
      const penaltyMsg =
        newErrors % 3 === 0
          ? '(-15 PTS DEDUCTED)'
          : isWarn
          ? '(WARNING: 1 attempt left before penalty)'
          : '';

      setPuzzleFeedback({
        success: false,
        message: `${res.message} ${penaltyMsg}`,
      });

      setProgress((prev) => ({
        ...prev,
        cumulativeErrors: newErrors,
        netScore: computeNetScore(BASE_SCORE, newErrors, prev.hintsUsedCount),
      }));

      if (onRefreshTeam) onRefreshTeam();
    }
  };

  // ==========================================================================
  // VERIFY TECHNICAL QUESTION / KEY BOX
  // ==========================================================================
  const handleSolveKeyBox = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const roomId = progress.currentRoomId;
    const roomState = progress.roomStates[roomId] || {};

    if (!roomState.letter1Solved || !roomState.letter2Solved) {
      escapeAudio.playErrorBuzz();
      setKeyBoxFeedback({
        success: false,
        message: 'LOCKED: Both Puzzle 1 and Puzzle 2 fragments must be decoded first.',
      });
      return;
    }

    if (!keyBoxInput.trim()) {
      setKeyBoxFeedback({
        success: false,
        message: 'Please enter your technical answer before transmitting.',
      });
      return;
    }

    // Physical Venue Keycard Check (if venue mode active)
    if (progress.physicalVenueMode && !roomState.physicalKeyVerified) {
      const venueRes = verify(
        roomId,
        'PHYSICAL_KEY',
        venueKeyInput.trim(),
        progress.cumulativeErrors,
        progress.hintsUsedCount,
        teamSetId
      );

      api.escapeVerify({
        roomId,
        step: 'PHYSICAL_KEY',
        input: venueKeyInput.trim(),
        currentErrors: progress.cumulativeErrors,
        currentHints: progress.hintsUsedCount,
        setId: teamSetId,
      }).catch((err) => console.warn('Physical key API sync notice:', err));

      if (!venueRes.success) {
        escapeAudio.playErrorBuzz();
        setKeyBoxFeedback({
          success: false,
          message: 'INVALID PHYSICAL KEYCARD: Check the card code at the physical venue station.',
        });
        return;
      }

      setProgress((prev) => ({
        ...prev,
        roomStates: {
          ...prev.roomStates,
          [roomId]: { ...prev.roomStates[roomId], physicalKeyVerified: true },
        },
      }));
    }

    // Technical Question Verification
    const res = verify(
      roomId,
      'TECH',
      keyBoxInput.trim(),
      progress.cumulativeErrors,
      progress.hintsUsedCount,
      teamSetId
    );

    // Requirement 2 & 3: Stop the timer IMMEDIATELY at the exact moment Technical Question No. 4 is successfully validated!
    // Do not stop after Questions 1, 2, or 3.
    // Do not wait until the final vault door opens or celebration screen appears.
    // If the answer is incorrect, the timer must continue running.
    if (roomId === 4 && res.success) {
      isTimerFrozenRef.current = true;
      setIsTimerFrozen(true);
    }

    let serverVerifyRes: any = null;
    try {
      serverVerifyRes = await api.escapeVerify({
        roomId,
        step: 'TECH',
        input: keyBoxInput.trim(),
        currentErrors: progress.cumulativeErrors,
        currentHints: progress.hintsUsedCount,
        setId: teamSetId,
      });
    } catch (err) {
      console.warn('Technical key box API sync notice:', err);
    }

    if (res.success) {
      // For Room 4: Lock the official server-verified elapsed time
      let officialElapsed = round2ElapsedSeconds;
      if (roomId === 4) {
        isTimerFrozenRef.current = true;
        setIsTimerFrozen(true);
        if (serverVerifyRes && typeof serverVerifyRes.timeSpentSeconds === 'number' && serverVerifyRes.timeSpentSeconds > 0) {
          officialElapsed = serverVerifyRes.timeSpentSeconds;
          setRound2ElapsedSeconds(officialElapsed);
        }
      }

      escapeAudio.playUnboltClunk();
      setKeyBoxFeedback({ success: true, message: res.message });

      const unlockedItem: InventoryItem = {
        id: `ROOM_KEY_${roomId}`,
        name: roomConfig.keyBox.unlockedKeyName,
        type: 'KEY',
        icon: '🔑',
        description: `Unlocked key for the exit portal of ${roomConfig.roomName}.`,
      };

      setProgress((prev) => {
        const updatedRoom = {
          ...prev.roomStates[roomId],
          techSolved: true,
          doorUnbolted: true,
        };
        const filteredInventory = (prev.inventory || []).filter((it) => it.id !== unlockedItem.id);
        const updatedInventory = [...filteredInventory, unlockedItem];
        return {
          ...prev,
          roomStates: { ...prev.roomStates, [roomId]: updatedRoom },
          inventory: updatedInventory,
          timerStopped: roomId === 4 ? true : prev.timerStopped,
          officialTimeSpentSeconds: roomId === 4 ? officialElapsed : prev.officialTimeSpentSeconds,
          netScore: computeNetScore(BASE_SCORE, prev.cumulativeErrors, prev.hintsUsedCount),
          objectiveLog: [
            roomId === 4
              ? `Technical Question No. 4 CLEARED! Facility lockdown terminated. Official timer locked at ${officialElapsed}s!`
              : `Key Box Cracked! Retrieved ${roomConfig.keyBox.unlockedKeyName}. Exit portal unbolted!`,
            ...prev.objectiveLog,
          ].slice(0, 10),
        };
      });

      // Special Room 4: Final Vault Door Opening & Completion Sequence
      if (roomId === 4) {
        // 1. Close terminal modal immediately to reveal the 3D scene
        setActiveKeyBoxTerminal(false);
        // 2. Play heavy hydraulic unbolt and metal door swinging sound
        escapeAudio.playVaultDoorSwing();
        // 3. Mark Round 2 status as COMPLETED and save completion time and final score in database (idempotent, prevents duplicate records)
        api.completeRound2Escape().catch((err) => console.warn('Escape completion API sync notice:', err));
        // 4. Trigger smooth physical door-opening animation (swings door open over 2.7s revealing the space beyond)
        doorOpeningAnimationRef.current = {
          active: true,
          startTime: performance.now(),
          duration: 2700,
          completed: false,
        };
      }

      if (onRefreshTeam) onRefreshTeam();
    } else {
      // Requirement 7: If the answer is incorrect, the timer must continue running.
      escapeAudio.playErrorBuzz();
      const newErrors = progress.cumulativeErrors + 1;
      const isWarn = newErrors % 3 === 2;
      const penaltyMsg =
        newErrors % 3 === 0
          ? '(-15 PTS DEDUCTED)'
          : isWarn
          ? '(WARNING: 1 attempt left before penalty)'
          : '';

      setKeyBoxFeedback({
        success: false,
        message: `${res.message} ${penaltyMsg}`,
      });

      setProgress((prev) => ({
        ...prev,
        cumulativeErrors: newErrors,
        netScore: computeNetScore(BASE_SCORE, newErrors, prev.hintsUsedCount),
      }));

      if (onRefreshTeam) onRefreshTeam();
    }
  };

  // ==========================================================================
  // ADVANCE TO NEXT ROOM
  // ==========================================================================
  const advanceToNextRoom = () => {
    const nextRoomId = progress.currentRoomId + 1;
    if (nextRoomId > 4) {
      setShowVictoryModal(true);
      return;
    }
    escapeAudio.playUnboltClunk();
    setProgress((prev) => ({
      ...prev,
      currentRoomId: nextRoomId,
      objectiveLog: [
        `Entered Room ${nextRoomId}: ${ROOMS_CONFIG[nextRoomId]?.roomName}. Free roam to search.`,
        ...prev.objectiveLog,
      ].slice(0, 10),
    }));
    setActiveKeyBoxTerminal(false);
  };

  // ==========================================================================
  // CONFIRM AND DEDUCT HINT (-10 PTS) - ZERO PREVIEW UNTIL UNLOCKED
  // ==========================================================================
  const handleConfirmHint = () => {
    if (!activeHintConfirmModal) return;
    const { step, puzzleTitle, hintText } = activeHintConfirmModal;
    const roomId = progress.currentRoomId;
    const hintKey = `${roomId}_${step}`;

    if (!progress.unlockedHints[hintKey]) {
      const newHintsCount = progress.hintsUsedCount + 1;
      setProgress((prev) => ({
        ...prev,
        hintsUsedCount: newHintsCount,
        unlockedHints: { ...prev.unlockedHints, [hintKey]: true },
        netScore: computeNetScore(BASE_SCORE, prev.cumulativeErrors, newHintsCount),
        objectiveLog: [`Hint unlocked for Room ${roomId} (${puzzleTitle}): -10 points`, ...prev.objectiveLog].slice(0, 10),
      }));

      // Sync hint unlock and deduction with the backend
      api.recordEscapeHint({
        roomId,
        step,
        hintKey,
        hintsCount: newHintsCount,
        errorsCount: progress.cumulativeErrors,
      }).then(() => {
        if (onRefreshTeam) onRefreshTeam();
      }).catch((err) => console.warn('Hint API sync notice:', err));
    }
    setActiveHintConfirmModal(null);
    setRevealedHintModal({
      puzzleTitle,
      hintText,
      isNewUnlock: true,
    });
    if (onRefreshTeam) onRefreshTeam();
  };

  const handleRequestHint = (step: RoomStep, puzzleTitle: string, hintText: string) => {
    const roomId = progress.currentRoomId;
    const hintKey = `${roomId}_${step}`;
    if (progress.unlockedHints[hintKey]) {
      setRevealedHintModal({ puzzleTitle, hintText, isNewUnlock: false });
    } else {
      setActiveHintConfirmModal({ step, puzzleTitle, hintText });
    }
  };

  // ==========================================================================
  // KEYBOARD & MOUSE EVENT LISTENERS (POINTER LOCK, CROUCH, ROTATE, THROW)
  // ==========================================================================
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // If user is focused on an input or textarea, do NOT trigger game hotkeys
      const targetElement = e.target as HTMLElement | null;
      const isInput =
        targetElement &&
        (targetElement.tagName === 'INPUT' ||
          targetElement.tagName === 'TEXTAREA' ||
          targetElement.isContentEditable);

      if (isInput) {
        if (e.code === 'Escape') {
          setActiveNoteModal(null);
          setActiveKeyBoxTerminal(false);
          setActiveCircuitPanel(false);
          setActiveNotesMenu(false);
          setActiveHintConfirmModal(null);
          setShowHintsOverviewModal(false);
          setRevealedHintModal(null);
          setShowSettingsModal(false);
          setShowAdminModal(false);
        }
        return;
      }

      keysPressed.current[e.code] = true;

      // [C] Crouch Toggle
      if (e.code === 'KeyC') {
        isCrouching.current = !isCrouching.current;
        escapeAudio.playFootstep();
      }

      // [R] Hold for 3D rotate held object
      if (e.code === 'KeyR' && heldBindingRef.current) {
        isRotatingHeldRef.current = true;
      }

      // [Q] Drop held object
      if (e.code === 'KeyQ' && heldBindingRef.current) {
        dropHeldObject();
      }

      // [F] Inspect Mode
      if (e.code === 'KeyF') {
        e.preventDefault();
        e.stopPropagation();
        if (hoveredTargetRef.current) {
          triggerInteraction(hoveredTargetRef.current);
        } else if (heldBindingRef.current) {
          // Open 3D inspection view
          setActiveNotesMenu(true);
        }
      }

      // [E] Pick up or Interact (preventDefault prevents 'e'/'E' from being inserted into newly focused answer inputs!)
      if (e.code === 'KeyE' || e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        e.stopPropagation();
        suppressStrayERef.current = true;
        setTimeout(() => {
          suppressStrayERef.current = false;
        }, 200);
        if (hoveredPhysicsBindingRef.current && !heldBindingRef.current) {
          pickUpObject(hoveredPhysicsBindingRef.current);
        } else if (hoveredTargetRef.current) {
          triggerInteraction(hoveredTargetRef.current);
        }
      }

      // [1] Quick Access Note 1 Decryption Modal
      if ((e.code === 'Digit1' || e.code === 'Numpad1') && !heldBindingRef.current) {
        e.preventDefault();
        e.stopPropagation();
        suppressStrayERef.current = true;
        setTimeout(() => {
          suppressStrayERef.current = false;
        }, 200);
        escapeAudio.playPaperRustle();
        setActiveNoteModal({
          step: 'LETTER_1',
          title: roomConfig.letter1.title,
          storyLocation: roomConfig.letter1.storyLocation,
          code: roomConfig.letter1.engravedCode,
          paperText: roomConfig.letter1.paperText,
          puzzleQuestion: roomConfig.letter1.puzzleQuestion,
          revealClue: roomConfig.letter1.revealClue,
          hint: roomConfig.letter1.hint,
        });
        setPuzzleInput('');
        setPuzzleFeedback(null);
      }

      // [2] Quick Access Note 2 Decryption Modal
      if ((e.code === 'Digit2' || e.code === 'Numpad2') && !heldBindingRef.current) {
        e.preventDefault();
        e.stopPropagation();
        suppressStrayERef.current = true;
        setTimeout(() => {
          suppressStrayERef.current = false;
        }, 200);
        escapeAudio.playPaperRustle();
        setActiveNoteModal({
          step: 'LETTER_2',
          title: roomConfig.letter2.title,
          storyLocation: roomConfig.letter2.storyLocation,
          code: 'CLUE-2',
          paperText: roomConfig.letter2.paperText,
          puzzleQuestion: roomConfig.letter2.puzzleQuestion,
          revealClue: roomConfig.letter2.revealClue,
          hint: roomConfig.letter2.hint,
        });
        setPuzzleInput('');
        setPuzzleFeedback(null);
      }

      // [T] Throw Key (Replaced LMB with dedicated key to eliminate ambiguity with normal clicks)
      if (e.code === 'KeyT') {
        if (heldBindingRef.current) {
          isChargingThrowRef.current = true;
          throwChargeStartRef.current = performance.now();
        } else if (hoveredPhysicsBindingRef.current) {
          pickUpObject(hoveredPhysicsBindingRef.current);
          isChargingThrowRef.current = true;
          throwChargeStartRef.current = performance.now();
        }
      }

      // [H] Hint Key - opens room tactical hints dossier
      if (e.code === 'KeyH') {
        e.preventDefault();
        e.stopPropagation();
        setShowHintsOverviewModal(true);
      }

      // [N] Notes Log
      if (e.code === 'KeyN') {
        e.preventDefault();
        e.stopPropagation();
        setActiveNotesMenu(true);
      }

      // [M] Mute Toggle
      if (e.code === 'KeyM') {
        e.preventDefault();
        toggleSound();
      }

      // [O] Settings
      if (e.code === 'KeyO') {
        e.preventDefault();
        e.stopPropagation();
        setShowSettingsModal(true);
      }

      // Admin shortcut: Ctrl+Shift+A
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyA') {
        setShowAdminModal(true);
      }

      // [Escape] Close Modals
      if (e.code === 'Escape') {
        setActiveNoteModal(null);
        setActiveKeyBoxTerminal(false);
        setActiveCircuitPanel(false);
        setActiveNotesMenu(false);
        setActiveHintConfirmModal(null);
        setShowHintsOverviewModal(false);
        setRevealedHintModal(null);
        setShowSettingsModal(false);
        setShowAdminModal(false);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = false;
      if (e.code === 'KeyR') {
        isRotatingHeldRef.current = false;
      }
      if (e.code === 'KeyT') {
        if (heldBindingRef.current && isChargingThrowRef.current) {
          const elapsed = (performance.now() - throwChargeStartRef.current) / 1000;
          const power = Math.max(0.35, Math.min(elapsed / 0.8, 1.0));
          throwHeldObject(power);
        } else {
          isChargingThrowRef.current = false;
          setThrowMeterPercent(0);
        }
      }
    };

    const onMouseDown = (_e: MouseEvent) => {
      // LMB is kept free of game action bindings to avoid ambiguity with normal browser click operations
    };

    const onMouseUp = (_e: MouseEvent) => {
      // LMB is kept free of game action bindings to avoid ambiguity with normal browser click operations
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isPointerLocked.current) return;

      // If holding [R] and an object is held, rotate the held object in 3D!
      if (heldBindingRef.current && isRotatingHeldRef.current) {
        heldRotationRef.current.y += e.movementX * 0.007 * mouseSensitivity;
        heldRotationRef.current.x += e.movementY * 0.007 * mouseSensitivity;
        return;
      }

      // Normal first-person look with responsive mouse sensitivity
      const sens = 0.0022 * mouseSensitivity;
      targetYaw.current -= e.movementX * sens;
      targetPitch.current -= e.movementY * sens;
      // Sensible vertical rotation limits: prevent flipping upside down or looking inside neck/body
      const minPitch = -Math.PI * 0.40; // ~ -72 degrees (down)
      const maxPitch = Math.PI * 0.38;  // ~ +68.4 degrees (up)
      targetPitch.current = Math.max(minPitch, Math.min(maxPitch, targetPitch.current));
    };

    const onWheel = (e: WheelEvent) => {
      // Mouse Wheel adjusts carry distance in Escape Simulator!
      if (heldBindingRef.current) {
        carryDistanceRef.current = Math.max(
          0.6,
          Math.min(2.4, carryDistanceRef.current - e.deltaY * 0.0015)
        );
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('wheel', onWheel, { passive: true });

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('wheel', onWheel);
    };
  }, [progress, mouseSensitivity]);

  // Pointer Lock Handler on Canvas / Viewport
  const requestPointerLock = () => {
    // Never request pointer lock if any modal or panel is open
    if (
      activeNoteModal ||
      activeKeyBoxTerminal ||
      activeCircuitPanel ||
      activeNotesMenu ||
      activeHintConfirmModal ||
      showHintsOverviewModal ||
      revealedHintModal ||
      showSettingsModal ||
      showAdminModal ||
      showVictoryModal
    ) {
      return;
    }
    const target = gameViewportRef.current || canvasContainerRef.current;
    if (target && document.pointerLockElement !== target) {
      target.requestPointerLock();
    }
  };

  // Release pointer lock immediately whenever any interactive modal opens
  useEffect(() => {
    const isModalOpen = Boolean(
      activeNoteModal ||
      activeKeyBoxTerminal ||
      activeCircuitPanel ||
      activeNotesMenu ||
      activeHintConfirmModal ||
      showHintsOverviewModal ||
      revealedHintModal ||
      showSettingsModal ||
      showAdminModal ||
      showVictoryModal
    );
    if (isModalOpen && document.pointerLockElement) {
      document.exitPointerLock();
    }
  }, [
    activeNoteModal,
    activeKeyBoxTerminal,
    activeCircuitPanel,
    activeNotesMenu,
    activeHintConfirmModal,
    showHintsOverviewModal,
    revealedHintModal,
    showSettingsModal,
    showAdminModal,
    showVictoryModal,
  ]);

  useEffect(() => {
    const handleLockChange = () => {
      isPointerLocked.current =
        Boolean(document.pointerLockElement) &&
        (document.pointerLockElement === gameViewportRef.current ||
          document.pointerLockElement === canvasContainerRef.current);
    };
    document.addEventListener('pointerlockchange', handleLockChange);
    return () => document.removeEventListener('pointerlockchange', handleLockChange);
  }, []);

  return (
    <div className="relative w-full h-full bg-[#1e293b] text-slate-100 flex flex-col select-none overflow-hidden font-mono">
      {/* =====================================================================
          TOP MINIMAL HUD: Room Title, Score, Errors, Timer, Mute & Settings
      ===================================================================== */}
      <div className="z-20 bg-slate-950/85 border-b border-slate-900/90 px-4 py-2.5 flex items-center justify-between text-xs backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleGoBack}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-400 text-slate-300 hover:text-cyan-300 text-xs font-mono transition-colors cursor-pointer mr-1"
            title="Return to Dashboard (Progress Saved Automatically & Instantly)"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-bold">DASHBOARD</span>
          </button>

          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full animate-ping"
              style={{ backgroundColor: roomConfig.accentColor }}
            />
            <span className="font-heading font-black tracking-wider text-white text-sm">
              ROOM {roomConfig.roomId}: {roomConfig.roomName}
            </span>
          </div>

          {/* Instant Auto-Save Indicator */}
          <div className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-[10px] text-emerald-300 font-mono shadow-[0_0_8px_rgba(16,185,129,0.3)]" title="Progress saved automatically and instantly">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold tracking-wider">AUTO-SAVED</span>
          </div>

          {/* Quick Room Jumper for Unlocked & Cleared Rooms (Always accessible for backtracking) */}
          <div className="flex items-center gap-1 ml-1 pl-2 border-l border-slate-800">
            {[1, 2, 3, 4].map((rId) => {
              const rState = progress.roomStates[rId];
              const isCleared = Boolean(rState?.techSolved && rState?.doorUnbolted);
              const isCurrent = progress.currentRoomId === rId;
              // Strict sequential unlocking: Room 1 is unlocked, Room N requires Room N-1 cleared
              const isUnlocked = rId === 1 || Boolean(
                progress.roomStates[rId - 1]?.techSolved &&
                progress.roomStates[rId - 1]?.doorUnbolted
              );

              return (
                <button
                  key={rId}
                  type="button"
                  disabled={!isUnlocked}
                  onClick={() => isUnlocked && switchRoom(rId)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 transition-all ${
                    !isUnlocked
                      ? 'bg-slate-950/60 border border-slate-800/80 text-slate-600 cursor-not-allowed opacity-60'
                      : isCurrent
                      ? 'bg-cyan-950 border border-cyan-400 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.4)] cursor-pointer'
                      : isCleared
                      ? 'bg-emerald-950/80 border border-emerald-600/60 text-emerald-300 hover:bg-emerald-900/50 cursor-pointer'
                      : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-slate-200 cursor-pointer'
                  }`}
                  title={isUnlocked ? `Switch to Room ${rId}` : `Room ${rId} Locked (Clear Room ${rId - 1} first)`}
                >
                  {isCleared ? '✓ ' : !isUnlocked ? '🔒 ' : ''}R{rId}
                </button>
              );
            })}
          </div>

          <span className="text-slate-500 hidden sm:inline">|</span>
          <span className="text-slate-400 hidden sm:inline">{roomConfig.subtitle}</span>
          {teamName && (
            <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
              <TeamColorDot color={teamColor} size="sm" />
              <span className="font-bold text-slate-200">{teamName}</span>
            </div>
          )}
        </div>

        {/* Real-Time Metrics */}
        <div className="flex items-center gap-4 sm:gap-6 font-mono text-xs">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-slate-400">SCORE:</span>
            <strong className="text-amber-300 font-bold">{progress.netScore}</strong>
          </div>

          <div className="flex items-center gap-1.5">
            <AlertTriangle
              className={`w-4 h-4 ${
                progress.cumulativeErrors % 3 === 2 ? 'text-red-400 animate-pulse' : 'text-slate-400'
              }`}
            />
            <span className="text-slate-400">ERRORS:</span>
            <strong
              className={`font-bold ${
                progress.cumulativeErrors % 3 === 2 ? 'text-red-400 font-black' : 'text-slate-300'
              }`}
            >
              {progress.cumulativeErrors}
            </strong>
          </div>

          <div
            className="flex items-center gap-1.5 hidden md:flex"
            title={isTimerFrozen ? 'Official Round 2 completion time permanently frozen' : 'Round 2 Official Timer'}
          >
            <Clock className={`w-4 h-4 ${isTimerFrozen ? 'text-emerald-400' : 'text-cyan-400'}`} />
            <span className="text-slate-400">R2 TIMER:</span>
            <span className={`font-mono font-bold ${isTimerFrozen ? 'text-emerald-300' : 'text-cyan-300'}`}>
              {Math.floor(round2ElapsedSeconds / 60)}m {String(round2ElapsedSeconds % 60).padStart(2, '0')}s
              {isTimerFrozen && (
                <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-500/80 text-emerald-300 uppercase tracking-wider font-bold">
                  FROZEN
                </span>
              )}
            </span>
          </div>

          {/* Quick-Access Note Badges with Hotkey hints [1] and [2] */}
          <div className="flex items-center gap-1.5 border-l border-slate-800 pl-3">
            <button
              type="button"
              onClick={() => {
                escapeAudio.playPaperRustle();
                setActiveNoteModal({
                  step: 'LETTER_1',
                  title: roomConfig.letter1.title,
                  storyLocation: roomConfig.letter1.storyLocation,
                  code: roomConfig.letter1.engravedCode,
                  paperText: roomConfig.letter1.paperText,
                  puzzleQuestion: roomConfig.letter1.puzzleQuestion,
                  revealClue: roomConfig.letter1.revealClue,
                  hint: roomConfig.letter1.hint,
                });
                setPuzzleInput('');
                setPuzzleFeedback(null);
              }}
              className={`px-2 py-1 rounded-lg border text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                progress.roomStates[roomConfig.roomId]?.letter1Solved
                  ? 'bg-emerald-950/60 border-emerald-600 text-emerald-300'
                  : 'bg-amber-950/50 border-amber-600/80 text-amber-300 hover:bg-amber-900/60'
              }`}
              title="Inspect Note 1 Decryption Modal [Hotkey 1]"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">NOTE 1 [1]:</span>
              <span>{progress.roomStates[roomConfig.roomId]?.letter1Solved ? 'SOLVED' : 'INSPECT'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                escapeAudio.playPaperRustle();
                setActiveNoteModal({
                  step: 'LETTER_2',
                  title: roomConfig.letter2.title,
                  storyLocation: roomConfig.letter2.storyLocation,
                  code: 'CLUE-2',
                  paperText: roomConfig.letter2.paperText,
                  puzzleQuestion: roomConfig.letter2.puzzleQuestion,
                  revealClue: roomConfig.letter2.revealClue,
                  hint: roomConfig.letter2.hint,
                });
                setPuzzleInput('');
                setPuzzleFeedback(null);
              }}
              className={`px-2 py-1 rounded-lg border text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                progress.roomStates[roomConfig.roomId]?.letter2Solved
                  ? 'bg-emerald-950/60 border-emerald-600 text-emerald-300'
                  : 'bg-amber-950/50 border-amber-600/80 text-amber-300 hover:bg-amber-900/60'
              }`}
              title="Inspect Note 2 Decryption Modal [Hotkey 2]"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">NOTE 2 [2]:</span>
              <span>{progress.roomStates[roomConfig.roomId]?.letter2Solved ? 'SOLVED' : 'INSPECT'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 border-l border-slate-800 pl-4">
            <button
              onClick={() => setShowHintsOverviewModal(true)}
              title="Tactical Surveillance Hints [H]"
              className="p-1.5 rounded-lg hover:bg-amber-950/50 text-amber-400 border border-amber-900/60 hover:border-amber-400 transition-colors cursor-pointer flex items-center gap-1.5 font-bold"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="hidden lg:inline text-[11px]">HINTS [H]</span>
            </button>

            <button
              onClick={() => setActiveNotesMenu(true)}
              title="Notes Log [N]"
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors cursor-pointer flex items-center gap-1"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden lg:inline text-[10px]">NOTES [N]</span>
            </button>

            <button
              onClick={toggleSound}
              title={soundEnabled ? 'Mute Audio [M]' : 'Unmute Audio [M]'}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>

            <button
              onClick={() => setShowSettingsModal(true)}
              title="Controls & Settings [O]"
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================================
          PRIMARY 3D INTERACTIVE CANVAS & RETICLE
      ===================================================================== */}
      <div
        ref={gameViewportRef}
        onClick={requestPointerLock}
        className="relative flex-1 w-full h-full cursor-crosshair overflow-hidden"
      >
        {/* Dedicated 3D Canvas Mount (Contains NO React children - purely managed by Three.js) */}
        <div ref={canvasContainerRef} className="absolute inset-0 w-full h-full pointer-events-none" />

        {/* CENTER CROSSHAIR / HAND GRAB ICON */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          {hoveredPrompt?.isPickable ? (
            <div className="flex flex-col items-center animate-pulse">
              <Hand className="w-6 h-6 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
            </div>
          ) : hoveredPrompt?.isInteractable ? (
            <div className="w-3 h-3 rounded-full border-2 border-cyan-400 bg-cyan-400/30 animate-ping" />
          ) : (
            <div className="w-1.5 h-1.5 rounded-full bg-white/70" />
          )}
        </div>

        {/* THROW POWER CHARGE METER */}
        {throwMeterPercent > 0 && (
          <div className="absolute inset-x-0 bottom-24 flex flex-col items-center pointer-events-none">
            <div className="w-48 bg-slate-950/80 border border-amber-500 rounded-full h-3 p-0.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-full transition-all duration-75"
                style={{ width: `${throwMeterPercent}%` }}
              />
            </div>
            <span className="text-[11px] font-bold text-amber-300 mt-1 uppercase tracking-wider drop-shadow">
              THROW POWER: {throwMeterPercent}% (Release [T])
            </span>
          </div>
        )}

        {/* INTERACTION CONTEXT PROMPT (Escape Simulator Style) */}
        {hoveredPrompt && (
          <div className="absolute inset-x-0 bottom-16 flex flex-col items-center pointer-events-none animate-in fade-in">
            <div className="bg-slate-950/90 border border-cyan-500/80 px-4 py-2 rounded-xl shadow-2xl text-center backdrop-blur-md">
              <div className="text-cyan-300 font-heading font-black text-sm tracking-wide">
                {hoveredPrompt.text}
              </div>
              {hoveredPrompt.subText && (
                <div className="text-slate-300 text-xs font-mono mt-0.5">
                  {hoveredPrompt.subText}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CROUCH STATUS BADGE */}
        {isCrouching.current && (
          <div className="absolute bottom-16 left-4 bg-slate-950/80 border border-slate-700 px-2.5 py-1 rounded text-[11px] text-cyan-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>[C] CROUCHING (Looking under furniture)</span>
          </div>
        )}

        {/* =====================================================================
            FLOATING BOTTOM HUD: ONLY MOVEMENT INSTRUCTION & MINIMAL INVENTORY PILL
        ===================================================================== */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center gap-2 max-w-[95%] px-2">
          {/* Minimal Stowed Inventory (Only if items collected) */}
          {progress.inventory.length > 0 && (
            <div className="pointer-events-auto flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-md border border-slate-800 px-3 py-1 rounded-full shadow-xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                ITEMS:
              </span>
              {progress.inventory.map((item, idx) => (
                <button
                  key={`${item.id}_${idx}`}
                  onClick={() => setSelectedInventorySlot(idx)}
                  className={`px-2.5 py-0.5 rounded-full border text-[11px] flex items-center gap-1 transition-all cursor-pointer ${
                    selectedInventorySlot === idx
                      ? 'bg-cyan-950/90 border-cyan-400 text-cyan-300 font-bold shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                      : 'bg-slate-900/80 border-slate-700 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Movement Instruction Bar Only */}
          <div className="pointer-events-auto bg-slate-950/85 backdrop-blur-md border border-slate-800/80 px-4 py-1.5 rounded-full text-slate-300 text-[11px] sm:text-xs shadow-2xl flex items-center gap-2 sm:gap-2.5 whitespace-nowrap">
            <span className="text-cyan-400 font-bold tracking-wider hidden xs:inline">CONTROLS:</span>
            <span>
              WASD Move <span className="text-slate-600">•</span> Shift Sprint <span className="text-slate-600">•</span> Space Jump <span className="text-slate-600">•</span> C Crouch <span className="text-slate-600">•</span> E Interact/Open <span className="text-slate-600">•</span> T Throw <span className="text-slate-600">•</span> R Rotate 3D <span className="text-slate-600">•</span> H Hint <span className="text-slate-600">•</span> Esc Close
            </span>
          </div>
        </div>
      </div>

      {/* =====================================================================
          MODAL: FULL PARCHMENT NOTE READER (LETTER 1 & 2)
      ===================================================================== */}
      {activeNoteModal && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in overflow-y-auto"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[92vh] overflow-y-auto my-auto p-5 sm:p-7 rounded-3xl bg-[#fef3c7] text-slate-900 border-4 border-amber-900/60 shadow-2xl space-y-4 font-mono relative"
          >
            {/* Parchment texture background overlay */}
            <div className="flex items-center justify-between border-b-2 border-amber-900/20 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-6 h-6 text-amber-800" />
                <div>
                  <h3 className="font-heading font-black text-amber-950 text-base sm:text-lg">
                    {activeNoteModal.title}
                  </h3>
                  <span className="text-xs text-amber-800 font-bold block">
                    LOCATION: {activeNoteModal.storyLocation}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {activeNoteModal.code && (
                  <span className="px-2.5 py-1 rounded bg-amber-900 text-amber-100 font-black text-xs uppercase tracking-widest border border-amber-950">
                    CODE: {activeNoteModal.code}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setActiveNoteModal(null)}
                  className="p-1 rounded text-amber-900 hover:text-black cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Note Paper Text */}
            <div className="bg-amber-100/60 p-4 rounded-xl border border-amber-900/20 text-xs sm:text-sm text-amber-950 leading-relaxed italic space-y-2">
              <p>"{activeNoteModal.paperText}"</p>
            </div>

            {/* Puzzle Question */}
            <div className="p-4 rounded-xl bg-amber-900/10 border-2 border-amber-900/30 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 block">
                DECRYPTION CHALLENGE:
              </span>
              <p className="font-bold text-xs sm:text-sm text-slate-900">
                {activeNoteModal.puzzleQuestion}
              </p>
            </div>

            {/* Tactical Hint (Zero preview if locked) */}
            {progress.unlockedHints[`${progress.currentRoomId}_${activeNoteModal.step}`] ? (
              <div className="p-3.5 rounded-xl bg-amber-200/90 border border-amber-600/60 text-xs text-amber-950 font-mono space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-amber-900">
                  <Lightbulb className="w-4 h-4 text-amber-700" /> UNLOCKED TACTICAL HINT:
                </span>
                <p className="italic text-slate-900 font-medium">{activeNoteModal.hint}</p>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs px-1">
                <button
                  type="button"
                  onClick={() => handleRequestHint(activeNoteModal.step, activeNoteModal.title, activeNoteModal.hint)}
                  className="text-amber-900 hover:text-black font-bold flex items-center gap-1.5 underline decoration-amber-600 hover:decoration-amber-900 cursor-pointer"
                >
                  <Lightbulb className="w-3.5 h-3.5 text-amber-800" />
                  <span>Request Tactical Hint (-10 PTS)</span>
                </button>
                <span className="text-[10px] text-amber-800/80 italic">No preview • Points deducted on confirmation</span>
              </div>
            )}

            {/* Verification & Input Form */}
            <form onSubmit={handleSolveNotePuzzle} className="space-y-3 pt-1">
              <div className="flex gap-2">
                <input
                  ref={noteInputRef}
                  type="text"
                  placeholder="Enter decoded answer..."
                  value={puzzleInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (suppressStrayERef.current && (val === 'e' || val === 'E' || val.trim() === 'e' || val.trim() === 'E')) {
                      setPuzzleInput('');
                      return;
                    }
                    setPuzzleInput(val);
                  }}
                  className="flex-1 bg-white/90 border-2 border-amber-900/40 focus:border-amber-900 rounded-xl px-4 py-2 text-sm text-slate-900 font-mono font-bold outline-none"
                />
                <button
                  type="submit"
                  onClick={(e) => e.stopPropagation()}
                  className="px-5 py-2 rounded-xl bg-amber-900 hover:bg-amber-950 active:scale-95 text-amber-100 font-heading font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md hover:shadow-lg disabled:opacity-50"
                  disabled={!puzzleInput.trim()}
                >
                  VERIFY
                </button>
              </div>

              {puzzleFeedback && (
                <div
                  className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2 ${
                    puzzleFeedback.success
                      ? 'bg-emerald-100 border-emerald-600 text-emerald-950'
                      : 'bg-red-100 border-red-600 text-red-950'
                  }`}
                >
                  {puzzleFeedback.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-700 flex-shrink-0" />
                  )}
                  <span>{puzzleFeedback.message}</span>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: KEY BOX TERMINAL & TECHNICAL QUESTION
      ===================================================================== */}
      {activeKeyBoxTerminal && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in overflow-y-auto"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl max-h-[92vh] overflow-y-auto my-auto p-5 sm:p-7 rounded-3xl bg-[#030712] border-2 border-cyan-500 shadow-2xl space-y-4 font-mono text-slate-100"
          >
            {/* Terminal Header */}
            <div className="flex items-center justify-between border-b border-cyan-900/60 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-6 h-6 text-cyan-400 animate-pulse" />
                <div>
                  <h3 className="font-heading font-black text-cyan-300 text-base sm:text-lg uppercase">
                    {roomConfig.keyBox.name}
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    STATUS:{' '}
                    {progress.roomStates[roomConfig.roomId]?.techSolved
                      ? 'UNLOCKED / VERIFIED'
                      : 'LOCKED (Requires Fragment Authorization)'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveKeyBoxTerminal(false)}
                className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Fragment Indicators with direct modal click */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  escapeAudio.playPaperRustle();
                  setActiveNoteModal({
                    step: 'LETTER_1',
                    title: roomConfig.letter1.title,
                    storyLocation: roomConfig.letter1.storyLocation,
                    code: roomConfig.letter1.engravedCode,
                    paperText: roomConfig.letter1.paperText,
                    puzzleQuestion: roomConfig.letter1.puzzleQuestion,
                    revealClue: roomConfig.letter1.revealClue,
                    hint: roomConfig.letter1.hint,
                  });
                  setPuzzleInput('');
                  setPuzzleFeedback(null);
                }}
                className={`p-3 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition-colors ${
                  progress.roomStates[roomConfig.roomId]?.letter1Solved
                    ? 'bg-emerald-950/40 border-emerald-600 text-emerald-300 hover:bg-emerald-900/50'
                    : 'bg-red-950/30 border-red-800 text-red-400 hover:bg-red-900/40'
                }`}
                title="Inspect Fragment Note 1"
              >
                <div className="flex items-center gap-2">
                  {progress.roomStates[roomConfig.roomId]?.letter1Solved ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <Lock className="w-4 h-4 text-red-400 flex-shrink-0" />
                  )}
                  <span>FRAGMENT 1: {progress.roomStates[roomConfig.roomId]?.letter1Solved ? 'HOLDING' : 'MISSING'}</span>
                </div>
                <span className="text-[10px] text-cyan-400 font-bold underline">OPEN [1]</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  escapeAudio.playPaperRustle();
                  setActiveNoteModal({
                    step: 'LETTER_2',
                    title: roomConfig.letter2.title,
                    storyLocation: roomConfig.letter2.storyLocation,
                    code: 'CLUE-2',
                    paperText: roomConfig.letter2.paperText,
                    puzzleQuestion: roomConfig.letter2.puzzleQuestion,
                    revealClue: roomConfig.letter2.revealClue,
                    hint: roomConfig.letter2.hint,
                  });
                  setPuzzleInput('');
                  setPuzzleFeedback(null);
                }}
                className={`p-3 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition-colors ${
                  progress.roomStates[roomConfig.roomId]?.letter2Solved
                    ? 'bg-emerald-950/40 border-emerald-600 text-emerald-300 hover:bg-emerald-900/50'
                    : 'bg-red-950/30 border-red-800 text-red-400 hover:bg-red-900/40'
                }`}
                title="Inspect Fragment Note 2"
              >
                <div className="flex items-center gap-2">
                  {progress.roomStates[roomConfig.roomId]?.letter2Solved ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <Lock className="w-4 h-4 text-red-400 flex-shrink-0" />
                  )}
                  <span>FRAGMENT 2: {progress.roomStates[roomConfig.roomId]?.letter2Solved ? 'HOLDING' : 'MISSING'}</span>
                </div>
                <span className="text-[10px] text-cyan-400 font-bold underline">OPEN [2]</span>
              </button>
            </div>

            {/* Venue Mode Keycard Input (If active) */}
            {progress.physicalVenueMode && !progress.roomStates[roomConfig.roomId]?.physicalKeyVerified && (
              <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-600/60 space-y-2">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Key className="w-4 h-4" /> PHYSICAL VENUE KEYCARD REQUIRED
                </span>
                <p className="text-xs text-slate-300">
                  Retrieve keycard from <strong>{roomConfig.venue.locationName}</strong> and enter code:
                </p>
                <input
                  type="text"
                  placeholder="e.g. DOOR-KEY-91"
                  value={venueKeyInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (suppressStrayERef.current && (val === 'e' || val === 'E' || val.trim() === 'e' || val.trim() === 'E')) {
                      setVenueKeyInput('');
                      return;
                    }
                    setVenueKeyInput(val);
                  }}
                  className="w-full bg-slate-900 border border-amber-600 rounded-lg px-3 py-1.5 text-xs text-amber-200 outline-none"
                />
              </div>
            )}

            {/* Technical Question Display */}
            <div className="p-4 rounded-xl bg-slate-900/95 border border-cyan-900/60 shadow-lg space-y-2.5">
              <div className="flex items-center justify-between text-xs text-cyan-400 font-bold">
                <span>{roomConfig.keyBox.techTitle}</span>
                <span className="text-[10px] bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                  {roomConfig.keyBox.techTopic}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-100 font-medium leading-relaxed tracking-wide">
                {roomConfig.keyBox.techQuestion}
              </p>

              {roomConfig.keyBox.techCodeSnippet && (
                <pre className="p-3 rounded-lg bg-black/80 border border-slate-800 text-[11px] text-cyan-300 overflow-x-auto">
                  <code>{roomConfig.keyBox.techCodeSnippet}</code>
                </pre>
              )}
            </div>

            {/* Tactical Tech Hint (Zero preview if locked) */}
            {progress.unlockedHints[`${roomConfig.roomId}_TECH`] ? (
              <div className="p-3.5 rounded-xl bg-cyan-950/60 border border-cyan-500/60 text-xs text-cyan-200 font-mono space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-cyan-300">
                  <Lightbulb className="w-4 h-4 text-cyan-400" /> UNLOCKED TECHNICAL HINT:
                </span>
                <p className="italic text-cyan-100">{roomConfig.keyBox.techHint}</p>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs px-1">
                <button
                  type="button"
                  onClick={() => handleRequestHint('TECH', roomConfig.keyBox.techTitle, roomConfig.keyBox.techHint)}
                  className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1.5 cursor-pointer underline decoration-amber-500/50 hover:decoration-amber-300"
                >
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                  <span>Request Technical Hint (-10 PTS)</span>
                </button>
                <span className="text-[10px] text-slate-500">No preview • Points deducted on confirmation</span>
              </div>
            )}

            {/* Technical Answer Form */}
            <form onSubmit={handleSolveKeyBox} className="space-y-3">
              <div className="flex gap-2">
                <input
                  ref={keyBoxInputRef}
                  type="text"
                  placeholder="Transmit technical answer..."
                  value={keyBoxInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (suppressStrayERef.current && (val === 'e' || val === 'E' || val.trim() === 'e' || val.trim() === 'E')) {
                      setKeyBoxInput('');
                      return;
                    }
                    setKeyBoxInput(val);
                  }}
                  className="flex-1 bg-slate-900 border-2 border-cyan-900/60 focus:border-cyan-400 rounded-xl px-4 py-2 text-sm text-cyan-100 font-mono outline-none"
                />
                <button
                  type="submit"
                  onClick={(e) => e.stopPropagation()}
                  className="px-6 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-slate-950 font-heading font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md hover:shadow-lg disabled:opacity-50"
                  disabled={!keyBoxInput.trim()}
                >
                  TRANSMIT
                </button>
              </div>

              {keyBoxFeedback && (
                <div
                  className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2 ${
                    keyBoxFeedback.success
                      ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                      : 'bg-red-950/60 border-red-500 text-red-300'
                  }`}
                >
                  {keyBoxFeedback.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  )}
                  <span>{keyBoxFeedback.message}</span>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: HIGH-VOLTAGE CIRCUIT (ROOM 3)
      ===================================================================== */}
      {activeCircuitPanel && (
        <HighVoltageCircuit
          isRestored={Boolean(progress.roomStates[3]?.circuitSolved)}
          onRestoreSuccess={() => {
            setProgress((prev) => ({
              ...prev,
              roomStates: {
                ...prev.roomStates,
                3: { ...prev.roomStates[3], circuitSolved: true },
              },
              objectiveLog: [
                'Circuit restored! Ceiling floodlights and auxiliary relays energized.',
                ...prev.objectiveLog,
              ].slice(0, 10),
            }));
            setActiveCircuitPanel(false);
          }}
          onClose={() => setActiveCircuitPanel(false)}
        />
      )}


      {/* =====================================================================
          MODAL: NOTES & OBJECTIVES LOG [N]
      ===================================================================== */}
      {activeNotesMenu && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg p-6 rounded-2xl bg-slate-950 border border-slate-700 shadow-2xl space-y-4 font-mono text-slate-200"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                <h3 className="font-heading font-black text-white text-base">
                  DISCOVERED NOTES & CLUE LOG
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveNotesMenu(false)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-2 text-xs">
              {progress.objectiveLog.map((log, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">•</span>
                  <span className="text-slate-300 leading-relaxed">{log}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: HINT CONFIRMATION (-10 PTS) - ZERO PREVIEW BEFORE UNLOCK
      ===================================================================== */}
      {activeHintConfirmModal && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md p-6 rounded-2xl bg-slate-950 border-2 border-amber-500 shadow-2xl space-y-4 font-mono text-slate-200"
          >
            <div className="flex items-center gap-2 text-amber-400 font-heading font-black text-base">
              <HelpCircle className="w-6 h-6 animate-pulse" />
              <span>REQUEST SURVEILLANCE HINT (-10 PTS)</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Unlocking this hint will deduct <strong>10 points</strong> from your squad's total score. The tactical hint will be revealed immediately after unlocking.
            </p>

            <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-600/50 text-xs text-amber-300 space-y-1">
              <span className="font-bold text-amber-400 block text-[11px] uppercase tracking-wider">
                TARGET PUZZLE:
              </span>
              <p className="font-semibold text-white">{activeHintConfirmModal.puzzleTitle}</p>
              <p className="text-[11px] text-amber-400/80 italic mt-1">
                🔒 Hint content is encrypted. Confirm to decrypt and reveal.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveHintConfirmModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleConfirmHint}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-heading font-black text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                ACCEPT & UNLOCK (-10 PTS)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: REVEALED HINT VIEWER
      ===================================================================== */}
      {revealedHintModal && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg p-6 rounded-2xl bg-slate-950 border-2 border-emerald-500 shadow-2xl space-y-4 font-mono text-slate-200"
          >
            <div className="flex items-center justify-between border-b border-emerald-900/60 pb-3">
              <div className="flex items-center gap-2 text-emerald-400 font-heading font-black text-base">
                <Lightbulb className="w-6 h-6 animate-pulse text-emerald-400" />
                <span>
                  {revealedHintModal.isNewUnlock ? '🎉 HINT UNLOCKED (-10 PTS)' : '💡 TACTICAL INTEL'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setRevealedHintModal(null)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-300">
              PUZZLE: <strong className="text-white">{revealedHintModal.puzzleTitle}</strong>
            </div>

            <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-500/70 text-xs sm:text-sm text-emerald-200 leading-relaxed font-mono shadow-inner">
              <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-1.5 tracking-wider">
                DECRYPTED SURVEILLANCE ADVICE:
              </span>
              "{revealedHintModal.hintText}"
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setRevealedHintModal(null)}
                className="px-6 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-heading font-black text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                GOT IT, BACK TO ROOM
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: TACTICAL SURVEILLANCE HINTS OVERVIEW [H]
      ===================================================================== */}
      {showHintsOverviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-2xl p-6 rounded-3xl bg-slate-950 border-2 border-amber-500/80 shadow-2xl space-y-5 font-mono text-slate-200">
            <div className="flex items-center justify-between border-b border-amber-900/50 pb-3">
              <div className="flex items-center gap-2.5 text-amber-400 font-heading font-black text-base sm:text-lg">
                <HelpCircle className="w-6 h-6 animate-pulse" />
                <span>ROOM {roomConfig.roomId} SURVEILLANCE HINTS</span>
              </div>
              <button
                type="button"
                onClick={() => setShowHintsOverviewModal(false)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Each hint unlock deducts <strong>10 points</strong> from your score. Once unlocked, a hint can be referenced repeatedly at zero cost. Hints have zero preview prior to unlocking.
            </p>

            <div className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
              {/* Hint 1: Letter 1 */}
              {(() => {
                const hintKey = `${roomConfig.roomId}_LETTER_1`;
                const isUnlocked = Boolean(progress.unlockedHints[hintKey]);
                return (
                  <div
                    className={`p-4 rounded-2xl border transition-all ${
                      isUnlocked
                        ? 'bg-emerald-950/30 border-emerald-600/70'
                        : 'bg-slate-900/80 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-amber-300">
                          1. HIDDEN LETTER 1 ({roomConfig.letter1.engravedCode})
                        </span>
                        <span className="text-[10px] text-slate-400 hidden sm:inline">
                          • {roomConfig.letter1.storyLocation}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                          isUnlocked
                            ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-700'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {isUnlocked ? '✓ REVEALED' : '🔒 LOCKED (-10 PTS)'}
                      </span>
                    </div>

                    {isUnlocked ? (
                      <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-xs text-emerald-200 italic">
                        "{roomConfig.letter1.hint}"
                      </div>
                    ) : (
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-slate-400 italic">
                          Tactical logic guide encrypted. No preview available.
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setShowHintsOverviewModal(false);
                            handleRequestHint(
                              'LETTER_1',
                              `Hidden Letter 1 (${roomConfig.letter1.engravedCode})`,
                              roomConfig.letter1.hint
                            );
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold font-heading transition-colors cursor-pointer"
                        >
                          UNLOCK HINT (-10 PTS)
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Hint 2: Letter 2 */}
              {(() => {
                const hintKey = `${roomConfig.roomId}_LETTER_2`;
                const isUnlocked = Boolean(progress.unlockedHints[hintKey]);
                return (
                  <div
                    className={`p-4 rounded-2xl border transition-all ${
                      isUnlocked
                        ? 'bg-emerald-950/30 border-emerald-600/70'
                        : 'bg-slate-900/80 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-amber-300">
                          2. HIDDEN LETTER 2 ({roomConfig.letter2.id})
                        </span>
                        <span className="text-[10px] text-slate-400 hidden sm:inline">
                          • {roomConfig.letter2.storyLocation}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                          isUnlocked
                            ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-700'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {isUnlocked ? '✓ REVEALED' : '🔒 LOCKED (-10 PTS)'}
                      </span>
                    </div>

                    {isUnlocked ? (
                      <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-xs text-emerald-200 italic">
                        "{roomConfig.letter2.hint}"
                      </div>
                    ) : (
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-slate-400 italic">
                          Mathematical deduction hint encrypted. No preview available.
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setShowHintsOverviewModal(false);
                            handleRequestHint(
                              'LETTER_2',
                              `Hidden Letter 2 (${roomConfig.letter2.id})`,
                              roomConfig.letter2.hint
                            );
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold font-heading transition-colors cursor-pointer"
                        >
                          UNLOCK HINT (-10 PTS)
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Hint 3: Key Box Terminal */}
              {(() => {
                const hintKey = `${roomConfig.roomId}_TECH`;
                const isUnlocked = Boolean(progress.unlockedHints[hintKey]);
                return (
                  <div
                    className={`p-4 rounded-2xl border transition-all ${
                      isUnlocked
                        ? 'bg-emerald-950/30 border-emerald-600/70'
                        : 'bg-slate-900/80 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-cyan-300">
                          3. KEY BOX TERMINAL ({roomConfig.keyBox.techTitle})
                        </span>
                        <span className="text-[10px] text-slate-400 hidden sm:inline">
                          • {roomConfig.keyBox.techTopic}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                          isUnlocked
                            ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-700'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {isUnlocked ? '✓ REVEALED' : '🔒 LOCKED (-10 PTS)'}
                      </span>
                    </div>

                    {isUnlocked ? (
                      <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-xs text-emerald-200 italic">
                        "{roomConfig.keyBox.techHint}"
                      </div>
                    ) : (
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-slate-400 italic">
                          Computer science algorithm hint encrypted. No preview available.
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setShowHintsOverviewModal(false);
                            handleRequestHint(
                              'TECH',
                              `Key Box: ${roomConfig.keyBox.techTitle}`,
                              roomConfig.keyBox.techHint
                            );
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold font-heading transition-colors cursor-pointer"
                        >
                          UNLOCK HINT (-10 PTS)
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowHintsOverviewModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer"
              >
                CLOSE HINTS DOSSIER
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: SETTINGS & CONTROLS GUIDE [O]
      ===================================================================== */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-slate-950 border border-slate-700 shadow-2xl space-y-4 font-mono text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-cyan-400" />
                <h3 className="font-heading font-black text-white text-base">
                  ESCAPE SIMULATOR SETTINGS & CONTROLS
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block text-slate-300">
                  Mouse Look Sensitivity: {mouseSensitivity.toFixed(1)}x
                </label>
                <input
                  type="range"
                  min="0.4"
                  max="2.5"
                  step="0.1"
                  value={mouseSensitivity}
                  onChange={(e) => setMouseSensitivity(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>

              <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <span className="text-cyan-400 font-bold block">Pine Studios Escape Simulator Controls:</span>
                <ul className="space-y-1 text-slate-300">
                  <li>• <strong>WASD / Arrows:</strong> Free roam move</li>
                  <li>• <strong>Shift:</strong> Sprint run</li>
                  <li>• <strong>Space:</strong> Jump over debris</li>
                  <li>• <strong>C:</strong> Crouch (look under beds, desks, ducts)</li>
                  <li>• <strong>E:</strong> Pick up object / Search container / Open drawer / Read note</li>
                  <li>• <strong>T (Hold & Release):</strong> Charge throw power & throw</li>
                  <li>• <strong>R (Hold + Move Mouse):</strong> Rotate held object in 3D</li>
                  <li>• <strong>Mouse Wheel:</strong> Carry distance closer / further</li>
                  <li>• <strong>Q:</strong> Drop object at feet</li>
                  <li>• <strong>F:</strong> Inspect mode in 3D</li>
                  <li>• <strong>H / N / M:</strong> Hint / Notes / Mute</li>
                </ul>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: ADMIN PANEL (Password Protected)
      ===================================================================== */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-950 border-2 border-red-500 shadow-2xl space-y-4 font-mono text-slate-200">
            <div className="flex items-center justify-between border-b border-red-900 pb-2">
              <div className="flex items-center gap-2 text-red-400 font-heading font-black">
                <Shield className="w-5 h-5 text-red-500" />
                <span>ADJUDICATOR ADMIN CONTROLS</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAdminModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!adminAuthenticated ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (adminPasswordInput === 'admin123' || adminPasswordInput === 'techquest2026') {
                    setAdminAuthenticated(true);
                  } else {
                    escapeAudio.playErrorBuzz();
                  }
                }}
                className="space-y-3"
              >
                <label className="text-xs text-slate-400">Admin Security Passcode:</label>
                <input
                  type="password"
                  placeholder="Enter passcode..."
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 px-3 py-2 rounded-lg text-xs text-white"
                />
                <button
                  type="submit"
                  className="w-full py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs"
                >
                  AUTHENTICATE
                </button>
              </form>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="text-slate-300">Jump to Room:</div>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        setProgress((prev) => ({ ...prev, currentRoomId: r }));
                        setShowAdminModal(false);
                      }}
                      className="p-2 bg-slate-900 hover:bg-cyan-950 border border-slate-700 rounded text-center text-cyan-300 font-bold"
                    >
                      Room {r}
                    </button>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Physical Venue Mode:</span>
                    <button
                      onClick={() =>
                        setProgress((prev) => ({
                          ...prev,
                          physicalVenueMode: !prev.physicalVenueMode,
                        }))
                      }
                      className={`px-3 py-1 rounded text-[11px] font-bold ${
                        progress.physicalVenueMode
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {progress.physicalVenueMode ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      localStorage.removeItem(STORAGE_KEY);
                      setProgress(DEFAULT_PROGRESS);
                      setShowAdminModal(false);
                    }}
                    className="w-full py-2 bg-red-950 border border-red-700 text-red-300 font-bold rounded-lg text-xs"
                  >
                    RESET ALL PROGRESS
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: CHAMPIONSHIP EXTRACTION VICTORY SCREEN
      ===================================================================== */}
      {/* =====================================================================
          FULL-SCREEN VICTORY SCREEN
      ===================================================================== */}
      {showVictoryModal && (
        <VictoryScreen
          teamName={teamName}
          finalScore={progress.netScore}
          timeSpentSeconds={round2ElapsedSeconds}
          hintsUsed={progress.hintsUsedCount}
          errorsCount={progress.cumulativeErrors}
          soundEnabled={soundEnabled}
          onNavigateToDashboard={() => onNavigate('/dashboard')}
        />
      )}
    </div>
  );
};
