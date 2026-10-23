// ============================================================================
// TECH QUEST: ROUND 2 — COMPLETE DATA CONFIGURATION FOR ALL 4 ROOMS & 3 SETS
// ============================================================================

import {
  ROUND2_FIELD_GUIDE_HINTS,
  ROUND2_FIELD_GUIDE_TITLE,
  type QuestionSetId,
} from './questionSets.ts';


export interface RoomInteractableDef {
  id: string;
  name: string;
  prompt: string; // e.g. "[E] Search Drawer" or "[E] Inspect"
  category:
    | 'LETTER_1'
    | 'LETTER_2'
    | 'KEY_BOX'
    | 'TECH_TERMINAL'
    | 'CIRCUIT_PANEL'
    | 'PHYSICAL_PROP'
    | 'TOOL_PICKUP'
    | 'DECOY'
    | 'EXIT_DOOR'
    | 'FLAG';
  requiredTool?: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  closeUpCameraPosition?: [number, number, number];
  closeUpLookAt?: [number, number, number];
  clueRevealedOnSuccess?: string;
}

export interface SetTrackDef {
  setId: QuestionSetId;
  code: 'SET_1' | 'SET_2' | 'SET_3';
  name: string;
  teamTrack: string;
  color: string;
  borderClass: string;
  bgClass: string;
  textClass: string;
  accentClass: string;
  badgeClass: string;
  description: string;
}

export const SET_TRACKS: Record<number, SetTrackDef> = {
  1: {
    setId: 1,
    code: 'SET_1',
    name: 'Set 1 (Blue Team)',
    teamTrack: 'Blue Team',
    color: '#3b82f6',
    borderClass: 'border-blue-500/50',
    bgClass: 'bg-blue-950/40',
    textClass: 'text-blue-400',
    accentClass: 'hover:border-blue-400 hover:bg-blue-900/30',
    badgeClass: 'bg-blue-950/80 border border-blue-500/50 text-blue-300',
    description: 'Set 1: Handshakes (n=7), Ages (Sum=72), Prime squares from 2², CALIFORNIA Cipher.',
  },
  2: {
    setId: 2,
    code: 'SET_2',
    name: 'Set 2 (Red Team)',
    teamTrack: 'Red Team',
    color: '#ef4444',
    borderClass: 'border-red-500/50',
    bgClass: 'bg-red-950/40',
    textClass: 'text-red-400',
    accentClass: 'hover:border-red-400 hover:bg-red-900/30',
    badgeClass: 'bg-red-950/80 border border-red-500/50 text-red-300',
    description: 'Set 2: Handshakes (n=8), Ages (Sum=66), Prime squares from 5², TEXAS Cipher.',
  },
  3: {
    setId: 3,
    code: 'SET_3',
    name: 'Set 3 (Green Team)',
    teamTrack: 'Green Team',
    color: '#10b981',
    borderClass: 'border-emerald-500/50',
    bgClass: 'bg-emerald-950/40',
    textClass: 'text-emerald-400',
    accentClass: 'hover:border-emerald-400 hover:bg-emerald-900/30',
    badgeClass: 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300',
    description: 'Set 3: Handshakes (n=6), Ages (Sum=54), Prime squares from 3², NEWJERSEY Cipher.',
  },
};

export interface RoomConfig {
  roomId: number;
  roomName: string;
  subtitle: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'VERY_HARD';
  accentColor: string;
  accentName: 'CYAN' | 'MAGENTA' | 'AMBER' | 'BLUE';
  themeDescription: string;
  roomBounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  playerSpawn: [number, number, number];
  initialYaw?: number;

  // Hidden Letter 1
  letter1: {
    id: string;
    engravedCode: string;
    title: string;
    storyLocation: string;
    paperText: string;
    puzzleQuestion: string;
    revealClue: string;
    hint: string;
    fragment?: string;
  };

  // Hidden Letter 2
  letter2: {
    id: string;
    title: string;
    storyLocation: string;
    paperText: string;
    puzzleQuestion: string;
    revealClue: string;
    hint: string;
    fragment?: string;
  };

  // Physical Keycard (Venue Mode)
  venue: {
    locationName: string;
    code: string;
    description: string;
  };

  // Key Box & Technical Question
  keyBox: {
    name: string;
    storyLocation: string;
    unlockedKeyName: string;
    techTitle: string;
    techTopic: string;
    techQuestion: string;
    techCodeSnippet?: string;
    techExplanation: string;
    techHint: string;
    reward?: string;
  };

  interactables: RoomInteractableDef[];
}

// ============================================================================
// BASE INTERACTABLES PER ROOM (Shared across sets)
// ============================================================================

const ROOM1_INTERACTABLES: RoomInteractableDef[] = [
  {
    id: 'r1_bunk_mattress',
    name: 'Stained Bunk Mattress',
    prompt: '[E] Lift Mattress',
    category: 'PHYSICAL_PROP',
    position: [-2.5, 0.9, -2.5],
    closeUpCameraPosition: [-2.2, 1.4, -2.1],
    closeUpLookAt: [-2.5, 0.9, -2.5],
  },
  {
    id: 'r1_letter1',
    name: 'Hidden Note [L1]',
    prompt: '[E] Inspect Note',
    category: 'LETTER_1',
    position: [-2.5, 0.65, -2.5],
    closeUpCameraPosition: [-2.5, 1.1, -2.5],
    closeUpLookAt: [-2.5, 0.65, -2.5],
  },
  {
    id: 'r1_breaker_panel',
    name: 'Rusted Wall Breaker Box',
    prompt: '[E] Open Breaker Door',
    category: 'PHYSICAL_PROP',
    position: [3.4, 1.8, -1.0],
    closeUpCameraPosition: [2.5, 1.8, -1.0],
    closeUpLookAt: [3.4, 1.8, -1.0],
  },
  {
    id: 'r1_letter2',
    name: 'Maintenance Ticket #2',
    prompt: '[E] Inspect Ticket',
    category: 'LETTER_2',
    position: [1.5, 0.02, -1.72],
    closeUpCameraPosition: [1.5, 0.7, -1.3],
    closeUpLookAt: [1.5, 0.02, -1.72],
  },
  {
    id: 'r1_crt_tv',
    name: 'Flickering CRT Television',
    prompt: '[E] Tilt TV Forward',
    category: 'PHYSICAL_PROP',
    position: [-2.8, 1.2, 3.2],
    closeUpCameraPosition: [-2.2, 1.4, 2.7],
    closeUpLookAt: [-2.8, 1.2, 3.2],
  },
  {
    id: 'r1_keybox',
    name: 'Cell Key Box Terminal',
    prompt: '[E] Access Key Box',
    category: 'KEY_BOX',
    position: [-2.8, 1.1, 3.6],
    closeUpCameraPosition: [-2.4, 1.3, 3.2],
    closeUpLookAt: [-2.8, 1.1, 3.6],
  },
  {
    id: 'r1_rug',
    name: 'Torn Floor Rug',
    prompt: '[E] Pull Back Rug',
    category: 'PHYSICAL_PROP',
    position: [0.0, 0.05, 0.5],
  },
  {
    id: 'r1_exit_door',
    name: 'Heavy Reinforced Cell Gate',
    prompt: '[E] Unlock Gate',
    category: 'EXIT_DOOR',
    requiredTool: 'HEAVY_CELL_GATE_KEY',
    position: [0.0, 1.6, -4.6],
  },
];

const ROOM2_INTERACTABLES: RoomInteractableDef[] = [
  {
    id: 'r2_desk_drawer',
    name: 'Officer Desk Drawer',
    prompt: '[E] Slide Open Drawer',
    category: 'PHYSICAL_PROP',
    position: [-2.0, 0.72, -1.8],
    closeUpCameraPosition: [-2.0, 1.2, -1.5],
    closeUpLookAt: [-2.0, 0.72, -1.8],
  },
  {
    id: 'r2_letter1',
    name: 'Comms Memo [S2]',
    prompt: '[E] Read Memo',
    category: 'LETTER_1',
    position: [-2.0, 0.68, -1.8],
    closeUpCameraPosition: [-2.0, 1.1, -1.8],
    closeUpLookAt: [-2.0, 0.68, -1.8],
  },
  {
    id: 'r2_scope_mat',
    name: 'Oscilloscope Rubber Mat',
    prompt: '[E] Lift Rubber Mat',
    category: 'PHYSICAL_PROP',
    position: [2.2, 0.95, -2.2],
    closeUpCameraPosition: [2.2, 1.35, -1.8],
    closeUpLookAt: [2.2, 0.95, -2.2],
  },
  {
    id: 'r2_letter2',
    name: 'Calibration Slip',
    prompt: '[E] Read Calibration Slip',
    category: 'LETTER_2',
    position: [2.2, 0.96, -2.2],
    closeUpCameraPosition: [2.2, 1.35, -2.0],
    closeUpLookAt: [2.2, 0.96, -2.2],
  },
  {
    id: 'r2_wall_clock',
    name: 'Guard Station Wall Clock',
    prompt: '[E] Inspect Behind Clock',
    category: 'PHYSICAL_PROP',
    position: [-4.12, 2.4, 0.0],
    closeUpCameraPosition: [-3.2, 2.4, 0.0],
    closeUpLookAt: [-4.12, 2.4, 0.0],
  },
  {
    id: 'r2_keybox',
    name: 'Comms Station Key Box',
    prompt: '[E] Access Key Box',
    category: 'KEY_BOX',
    position: [-4.15, 2.4, 0.0],
    closeUpCameraPosition: [-3.2, 2.4, 0.0],
    closeUpLookAt: [-4.15, 2.4, 0.0],
  },
  {
    id: 'r2_exit_door',
    name: 'Blast Barrier to Utility Tunnels',
    prompt: '[E] Unlock Barrier',
    category: 'EXIT_DOOR',
    requiredTool: 'UTILITY_TUNNEL_PASSKEY',
    position: [3.9, 1.6, 2.2],
  },
];

const ROOM3_INTERACTABLES: RoomInteractableDef[] = [
  {
    id: 'r3_circuit_panel',
    name: 'High-Voltage Breaker Panel',
    prompt: '[E] Route Circuit Power',
    category: 'CIRCUIT_PANEL',
    position: [-2.0, 2.1, -5.35],
    closeUpCameraPosition: [-2.0, 2.0, -4.3],
    closeUpLookAt: [-2.0, 2.1, -5.35],
  },
  {
    id: 'r3_cable_cover',
    name: 'Loose Floor Cable Duct Cover',
    prompt: '[E] Slide Cable Cover',
    category: 'PHYSICAL_PROP',
    position: [0.0, 0.05, -1.5],
    closeUpCameraPosition: [0.0, 0.8, -1.0],
    closeUpLookAt: [0.0, 0.05, -1.5],
  },
  {
    id: 'r3_letter1',
    name: 'PLC Schematic [P3]',
    prompt: '[E] Inspect Schematic',
    category: 'LETTER_1',
    position: [0.0, 0.08, -1.5],
    closeUpCameraPosition: [0.0, 0.7, -1.5],
    closeUpLookAt: [0.0, 0.08, -1.5],
  },
  {
    id: 'r3_fan_guard',
    name: 'Ventilation Fan Cowling',
    prompt: '[E] Open Fan Grating',
    category: 'PHYSICAL_PROP',
    position: [4.25, 2.4, -2.0],
    closeUpCameraPosition: [3.3, 2.4, -2.0],
    closeUpLookAt: [4.25, 2.4, -2.0],
  },
  {
    id: 'r3_letter2',
    name: 'Fan Intake Notice',
    prompt: '[E] Read Intake Notice',
    category: 'LETTER_2',
    position: [4.25, 2.4, -2.0],
    closeUpCameraPosition: [3.4, 2.4, -2.0],
    closeUpLookAt: [4.25, 2.4, -2.0],
  },
  {
    id: 'r3_locker',
    name: 'Maintenance Tool Locker',
    prompt: '[E] Search Locker',
    category: 'PHYSICAL_PROP',
    position: [-3.8, 1.2, -3.5],
    closeUpCameraPosition: [-2.6, 1.3, -3.5],
    closeUpLookAt: [-3.8, 1.2, -3.5],
  },
  {
    id: 'r3_knife_item',
    name: 'Rusty Utility Knife',
    prompt: '[E] Pick Up Knife',
    category: 'TOOL_PICKUP',
    position: [-3.6, 0.9, -3.5],
  },
  {
    id: 'r3_ladder_item',
    name: 'Heavy Wooden Ladder',
    prompt: '[E] Pick Up Ladder',
    category: 'TOOL_PICKUP',
    position: [3.2, 1.0, 2.5],
  },
  {
    id: 'r3_ceiling_hatch',
    name: 'Ceiling Hatch (Tied with Rope)',
    prompt: '[E] Access Ceiling Hatch',
    category: 'PHYSICAL_PROP',
    requiredTool: 'WOODEN_LADDER',
    position: [2.0, 4.15, 2.0],
    closeUpCameraPosition: [2.0, 3.0, 2.0],
    closeUpLookAt: [2.0, 4.15, 2.0],
  },
  {
    id: 'r3_keybox',
    name: 'Ceiling Hatch Key Box',
    prompt: '[E] Access Key Box',
    category: 'KEY_BOX',
    position: [2.0, 4.15, 2.0],
    closeUpCameraPosition: [2.0, 3.2, 2.0],
    closeUpLookAt: [2.0, 4.15, 2.0],
  },
  {
    id: 'r3_exit_door',
    name: 'Pressure Bulkhead to Master SCADA Vault',
    prompt: '[E] Unlock Bulkhead',
    category: 'EXIT_DOOR',
    requiredTool: 'MASTER_SCADA_VAULT_KEYCARD',
    position: [4.4, 1.6, 2.0],
  },
];

const ROOM4_INTERACTABLES: RoomInteractableDef[] = [
  // 1. Mainframe Rack 02 & HIDDEN LETTER 1 (Relocated: Inside Modular Blade Drive Sled)
  {
    id: 'r4_rack2_sled',
    name: 'Mainframe Rack 02 Modular Drive Sled',
    prompt: '[E] Eject Blade Drive Sled',
    category: 'PHYSICAL_PROP',
    position: [-2.5, 1.4, -3.5],
    closeUpCameraPosition: [-1.7, 1.5, -3.5],
    closeUpLookAt: [-2.5, 1.4, -3.5],
  },
  {
    id: 'r4_letter1',
    name: 'Vault Interlock Log [V4] (Inside Drive Sled)',
    prompt: '[E] Read Interlock Log',
    category: 'LETTER_1',
    position: [-2.5, 1.45, -3.5],
    closeUpCameraPosition: [-1.8, 1.5, -3.5],
    closeUpLookAt: [-2.5, 1.45, -3.5],
  },

  // 2. Emergency Wall Safety Cabinet & HIDDEN LETTER 2 (Relocated: Inside Wall Safety Enclosure)
  {
    id: 'r4_safety_cabinet',
    name: 'Wall-Mounted Emergency Safety & Fire Cabinet',
    prompt: '[E] Swing Open Safety Cabinet',
    category: 'PHYSICAL_PROP',
    position: [-0.6, 1.6, -5.5],
    closeUpCameraPosition: [-0.6, 1.6, -4.4],
    closeUpLookAt: [-0.6, 1.6, -5.5],
  },
  {
    id: 'r4_letter2',
    name: 'Cryptographic Dispatch Slip (Inside Safety Cabinet)',
    prompt: '[E] Read Dispatch Slip',
    category: 'LETTER_2',
    position: [-0.6, 1.65, -5.45],
    closeUpCameraPosition: [-0.6, 1.65, -4.5],
    closeUpLookAt: [-0.6, 1.65, -5.45],
  },
  {
    id: 'r4_extinguisher_item',
    name: 'Heavy Industrial Fire Extinguisher',
    prompt: '[E] Grab Fire Extinguisher  [T] Throw',
    category: 'TOOL_PICKUP',
    position: [-0.6, 1.35, -5.35],
  },

  // 3. Quantum Optical Laser Interlock Collimator Station
  {
    id: 'r4_laser_emitter',
    name: 'Quantum Optical Laser Collimator Pedestal',
    prompt: '[E] Calibrate Laser Collimator',
    category: 'PHYSICAL_PROP',
    position: [-3.4, 1.2, 3.2],
    closeUpCameraPosition: [-2.7, 1.4, 3.2],
    closeUpLookAt: [-3.4, 1.2, 3.2],
  },

  // 4. Biometric Hand & Retinal Scanner Pedestal
  {
    id: 'r4_biometric_pod',
    name: 'Biometric Hand & Retinal Scanner Pedestal',
    prompt: '[E] Scan Biometric ID',
    category: 'PHYSICAL_PROP',
    position: [-1.8, 1.2, 5.0],
    closeUpCameraPosition: [-1.4, 1.4, 4.6],
    closeUpLookAt: [-1.8, 1.2, 5.0],
  },

  // 5. High-Pressure Hydraulic Accumulators & Analog Gauges
  {
    id: 'r4_hydraulic_gauge',
    name: 'High-Pressure Hydraulic Accumulator Bank',
    prompt: '[E] Inspect Hydraulic Gauges',
    category: 'PHYSICAL_PROP',
    position: [3.6, 1.5, 0.2],
    closeUpCameraPosition: [2.8, 1.5, 0.2],
    closeUpLookAt: [3.6, 1.5, 0.2],
  },

  // 6. Rolling Multi-Tier Maintenance Tool Trolley & Multimeter
  {
    id: 'r4_tool_trolley',
    name: 'Rolling Multi-Tier Maintenance Tool Trolley',
    prompt: '[E] Inspect Tool Cart',
    category: 'PHYSICAL_PROP',
    position: [1.8, 0.8, -3.8],
  },
  {
    id: 'r4_multimeter_item',
    name: 'Digital Multimeter & Signal Analyzer',
    prompt: '[E] Pick Up Multimeter  [T] Throw',
    category: 'TOOL_PICKUP',
    position: [1.8, 0.9, -3.8],
  },

  // 7. Industrial Heavy Cable Reel
  {
    id: 'r4_cable_spool',
    name: 'Heavy Industrial Wire Cable Reel',
    prompt: '[E] Pick Up Cable Reel  [T] Throw',
    category: 'PHYSICAL_PROP',
    position: [-3.6, 0.35, 4.2],
  },

  // 8. Supercomputer Server Rack 03 Optical Fiber Node
  {
    id: 'r4_server_rack3',
    name: 'Supercomputing Cluster Optical Fiber Node',
    prompt: '[E] Inspect Optical Fiber Patch Bay',
    category: 'PHYSICAL_PROP',
    position: [-2.5, 1.6, -1.8],
  },

  // 9. Existing Props in Room 4
  {
    id: 'r4_diagnostic_drawer',
    name: 'Diagnostic Workbench Tool Drawer',
    prompt: '[E] Slide Open Tool Drawer',
    category: 'PHYSICAL_PROP',
    position: [3.4, 0.85, -2.5],
    closeUpCameraPosition: [2.6, 1.2, -2.5],
    closeUpLookAt: [3.4, 0.85, -2.5],
  },
  {
    id: 'r4_spanner_item',
    name: 'Heavy Titanium Service Spanner',
    prompt: '[E] Pick Up Spanner  [T] Throw',
    category: 'TOOL_PICKUP',
    position: [3.2, 0.95, -2.2],
  },
  {
    id: 'r4_trench_hatch',
    name: 'Sub-Floor Hydraulic Conduit Trench Hatch',
    prompt: '[E] Slide Trench Hatch',
    category: 'PHYSICAL_PROP',
    position: [-1.8, 0.05, 2.4],
    closeUpCameraPosition: [-1.8, 0.9, 1.8],
    closeUpLookAt: [-1.8, 0.05, 2.4],
  },
  {
    id: 'r4_server_drawer',
    name: 'Server Rack 04 Battery Tray',
    prompt: '[E] Slide Open Battery Tray',
    category: 'PHYSICAL_PROP',
    position: [-2.5, 0.7, 0.0],
    closeUpCameraPosition: [-1.7, 1.0, 0.0],
    closeUpLookAt: [-2.5, 0.7, 0.0],
  },
  {
    id: 'r4_cryo_valve',
    name: 'Cryo-Coolant Pressure Vent Valve',
    prompt: '[E] Turn Pressure Relief Valve',
    category: 'PHYSICAL_PROP',
    position: [3.6, 1.4, 1.8],
  },
  {
    id: 'r4_cryo_canister',
    name: 'Pressurized Cryo Canister',
    prompt: '[E] Pick Up Canister  [T] Throw',
    category: 'PHYSICAL_PROP',
    position: [3.2, 0.35, 1.2],
  },
  {
    id: 'r4_keybox',
    name: 'Vault Core Pedestal Terminal',
    prompt: '[E] Access Terminal',
    category: 'KEY_BOX',
    position: [0.0, 1.25, -1.8],
    closeUpCameraPosition: [0.0, 1.4, -1.0],
    closeUpLookAt: [0.0, 1.25, -1.8],
  },
  {
    id: 'r4_vault_door',
    name: 'Monumental Circular Vault Door',
    prompt: '[E] Disengage Hydraulic Bolts',
    category: 'EXIT_DOOR',
    requiredTool: 'CHAMPIONSHIP_EXTRACTION_PASS',
    position: [0.0, 2.2, 5.75],
  },
  {
    id: 'r4_flag',
    name: 'THE CHAMPIONSHIP FLAG',
    prompt: '[E] Capture Championship Flag!',
    category: 'FLAG',
    position: [0.0, 1.8, 8.0],
    closeUpCameraPosition: [0.0, 1.8, 6.8],
    closeUpLookAt: [0.0, 1.8, 8.0],
  },
];

// ============================================================================
// SET 1: BLUE TEAM CONFIGURATION
// ============================================================================

export const SET_1_ROOMS: Record<number, RoomConfig> = {
  // Sector 1: Detention Cell Block
  1: {
    roomId: 1,
    roomName: 'Detention Cell Block',
    subtitle: 'Sector 1: Intake & Detention',
    difficulty: 'EASY',
    accentColor: '#3b82f6',
    accentName: 'CYAN',
    themeDescription:
      'Damp concrete detention cell block with barred windows, iron bunk bed, rusted metal breaker box, and cracked CRT monitor.',
    roomBounds: { minX: -3.8, maxX: 3.8, minZ: -4.8, maxZ: 4.8 },
    playerSpawn: [0, 1.65, 2.0],
    initialYaw: 0,

    letter1: {
      id: 'R1-L1',
      engravedCode: 'L1',
      title: 'Hidden Note #1: Handshakes',
      storyLocation: 'Taped beneath the bunk bed mattress on the bed frame slats',
      paperText:
        'A yellowed prisoner log stamped with a faded intake seal. In the margin, the code "L1" is scratched into the paper.',
      puzzleQuestion:
        'Seven people are in a room. Each person shakes hands with every other person exactly once. How many handshakes take place?',
      revealClue: 'Look beneath the loose red brick on the cell floor.',
      hint: ROUND2_FIELD_GUIDE_HINTS[1].letter1,
    },

    letter2: {
      id: 'R1-L2',
      title: 'Hidden Note #2: Ages',
      storyLocation: 'Tucked beneath the loose brick on the cell floor',
      paperText: 'A scorched maintenance ticket discovered beneath the loose brick on the cell floor.',
      puzzleQuestion:
        'Person A is twice as old as Person B. Their ages add up to 72 years. How old is Person B?',
      revealClue: 'The old television screen still hums in the corner. Look behind where it sits.',
      hint: ROUND2_FIELD_GUIDE_HINTS[1].letter2,
    },

    venue: {
      locationName: 'Lab Bench 1',
      code: 'DOOR-KEY-91',
      description: 'Physical keycard hidden at Lab Bench 1 near the intake junction.',
    },

    keyBox: {
      name: 'Terminal 1: Square Progression',
      storyLocation: 'Concealed behind the flickering CRT television on the corner table',
      unlockedKeyName: 'Sector 1 Cell Gate Passkey',
      techTitle: 'Terminal 1: Prime Square Series',
      techTopic: 'Consecutive Prime Squares',
      techQuestion:
        'Find the next number in this series:\n4, 9, 25, 49, 121, 169, 289, ?',
      techExplanation:
        'Consecutive prime squares starting from 2: 2²=4, 3²=9, 5²=25, 7²=49, 11²=121, 13²=169, 17²=289. The next prime after 17 is 19. Therefore: 19² = 361.',
      techHint: ROUND2_FIELD_GUIDE_HINTS[1].tech,
    },

    interactables: ROOM1_INTERACTABLES,
  },

  // Sector 2: Surveillance & Security Hub
  2: {
    roomId: 2,
    roomName: 'Surveillance & Security Hub',
    subtitle: 'Sector 2: Guard Comms Station',
    difficulty: 'MEDIUM',
    accentColor: '#d946ef',
    accentName: 'MAGENTA',
    themeDescription:
      'Security checkpoint comms hub with radio receiver racks, dual-channel oscilloscope bench, wall clock, and officer desk.',
    roomBounds: { minX: -4.2, maxX: 4.2, minZ: -4.8, maxZ: 4.8 },
    playerSpawn: [0, 1.65, 2.0],
    initialYaw: 0,

    letter1: {
      id: 'R2-L1',
      engravedCode: 'S2',
      title: 'Hidden Note #1: Time & Ages',
      storyLocation: 'Concealed in the false bottom of the officer desk drawer on the west side',
      paperText: 'An encrypted dispatch note. The code "S2" is punched into the bottom corner.',
      puzzleQuestion:
        'A father is 50 years old and his son is 14 years old. After how many years will the father be twice as old as his son?',
      revealClue: 'Signals rest where rubber meets steel on the oscilloscope workbench.',
      hint: ROUND2_FIELD_GUIDE_HINTS[2].letter1,
    },

    letter2: {
      id: 'R2-L2',
      title: 'Hidden Note #2: Riddle',
      storyLocation: 'Under the oscilloscope rubber insulation mat on the east workbench',
      paperText: 'A carbon-copy instrument calibration sheet damp with hydraulic oil.',
      puzzleQuestion:
        '"Once in every minute, twice in every moment, never in thousand years."',
      revealClue: 'The clock keeps count, but not the hours. Check the wall recess behind its face on the west wall.',
      hint: ROUND2_FIELD_GUIDE_HINTS[2].letter2,
    },

    venue: {
      locationName: 'Scope Station 2',
      code: 'DECODER-CHIP-42',
      description: 'Physical card attached to Scope Station 2 near the oscilloscope rack.',
    },

    keyBox: {
      name: 'Terminal 2: C Code Output',
      storyLocation: 'Concealed in the wall recess behind the wall clock on the west wall',
      unlockedKeyName: 'Utility Tunnel Passkey',
      techTitle: 'Terminal 2: C Code Execution Trace',
      techTopic: 'Operator Precedence & Short-Circuit Evaluation',
      techQuestion:
        'Predict the output of this C program.',
      techCodeSnippet: `#include <stdio.h>\nint main() {\nint i = 0;\nint j = i++ && printf("Geeks");\nprintf("%d %d", i, j);\nreturn 0;\n}`,
      techExplanation:
        '1. i starts at 0. Post-increment i++ evaluates to 0 (false) and then increments i to 1.\n2. In logical AND (&&), short-circuiting stops evaluation when the left operand is false (0), so printf("Geeks") does NOT execute!\n3. The logical expression result is 0, assigned to j.\n4. printf("%d %d", i, j) prints: 1 0.',
      techHint: ROUND2_FIELD_GUIDE_HINTS[2].tech,
    },

    interactables: ROOM2_INTERACTABLES,
  },

  // Sector 3: Sub-Level Utility Tunnel
  3: {
    roomId: 3,
    roomName: 'Sub-Level Utility Tunnel',
    subtitle: 'Sector 3: PLC Relay Station',
    difficulty: 'HARD',
    accentColor: '#f59e0b',
    accentName: 'AMBER',
    themeDescription:
      'Cavernous utility maintenance tunnel with steam pipes, relay racks, floor cable duct, ventilation fan, lockers, and ceiling access hatch.',
    roomBounds: { minX: -4.5, maxX: 4.5, minZ: -5.5, maxZ: 5.5 },
    playerSpawn: [0, 1.65, 2.4],
    initialYaw: 0,

    letter1: {
      id: 'R3-L1',
      engravedCode: 'P3',
      title: 'Hidden Note #1: Fathers & Sons',
      storyLocation: 'Under the loose floor cable-duct cover plate along the center walkway',
      paperText: 'A scorched ladder logic diagram retrieved from the cable tray with code "P3".',
      puzzleQuestion:
        'Two fathers and two sons went fishing. each caught one fish. how many fishes they got?',
      revealClue: 'Cold air breathes where the blades stand still on the east ventilation fan.',
      hint: ROUND2_FIELD_GUIDE_HINTS[3].letter1,
    },

    letter2: {
      id: 'R3-L2',
      title: 'Hidden Note #2: Bridge Crossing',
      storyLocation: 'Behind the ventilation fan blades on the east wall',
      paperText: 'An industrial health & safety warning card wedged behind the fan cowl.',
      puzzleQuestion:
        'Four people need to cross a bridge at night. Their individual crossing times are 1, 3, 6, and 11 minutes. Only two can cross at a time, and they need a torch. When two people cross together, they move at the slower person\'s speed. What is the minimum total time?',
      revealClue: 'Climb above the pipes where the rope secures the overhead ceiling hatch.',
      hint: ROUND2_FIELD_GUIDE_HINTS[3].letter2,
    },

    venue: {
      locationName: '3D Printer Enclosure',
      code: 'SYSTEM-RELAY-88',
      description: 'Physical tag on acrylic safety visor at Workbench 03.',
    },

    keyBox: {
      name: 'Terminal 3: Weighted Cipher',
      storyLocation: 'Mounted inside the overhead ceiling hatch accessible by ladder',
      unlockedKeyName: 'Master SCADA Vault Keycard',
      techTitle: 'Terminal 3: Weighted Alphabet Cipher',
      techTopic: 'Positional Character Encoding',
      techQuestion:
        'Letters map to A=1 … Z=26. Multiply by weights 1, 2, 1, 2, … by position and sum. Compute the coded value of CALIFORNIA.',
      techExplanation:
        'C(3×1) + A(1×2) + L(12×1) + I(9×2) + F(6×1) + O(15×2) + R(18×1) + N(14×2) + I(9×1) + A(1×2) = 3 + 2 + 12 + 18 + 6 + 30 + 18 + 28 + 9 + 2 = 128.',
      techHint: ROUND2_FIELD_GUIDE_HINTS[3].tech,
    },

    interactables: ROOM3_INTERACTABLES,
  },

  // Sector 4: Exterior Extraction Perimeter
  4: {
    roomId: 4,
    roomName: 'Exterior Extraction Perimeter',
    subtitle: 'Sector 4: SCADA Core & Extraction Point',
    difficulty: 'VERY_HARD',
    accentColor: '#3b82f6',
    accentName: 'BLUE',
    themeDescription:
      'Imposing subterranean SCADA mainframe fortress with a monumental circular vault door with interlocking cogs and extraction portal.',
    roomBounds: { minX: -5.0, maxX: 5.0, minZ: -6.0, maxZ: 6.0 },
    playerSpawn: [0, 1.65, 2.6],
    initialYaw: 0,

    letter1: {
      id: 'R4-L1',
      engravedCode: 'V4',
      title: 'Hidden Note #1: Hat Color Deduction',
      storyLocation: 'Concealed within the modular blade drive sled of Mainframe Rack 02 on the west wall',
      paperText: 'A micro-printed security protocol strip stamped with the vault master code "V4", recovered from the mainframe blade chassis.',
      puzzleQuestion:
        'Three prisoners stand in a row facing the same direction. Hats are drawn from 3 black and 2 white. The back prisoner sees two hats, the middle sees one, and the front sees none. The back prisoner stays silent. The middle prisoner stays silent. Who can deduce their own hat color, and what is it? (Format: POSITION COLOR)',
      revealClue: 'Look inside the red emergency safety cabinet mounted on the north wall.',
      hint: ROUND2_FIELD_GUIDE_HINTS[4].letter1,
    },

    letter2: {
      id: 'R4-L2',
      title: 'Hidden Note #2: Stacked Boxes',
      storyLocation: 'Secured inside the wall-mounted emergency safety cabinet on the north wall',
      paperText: 'A cryptographic packing manifest located inside the red emergency safety enclosure behind the fire extinguisher.',
      puzzleQuestion:
        'Eight boxes A to H are stacked on top of each other in an unknown order. Two boxes are between A and F. Two between C and G. Three between D and B. H is right below B. Two between A and H. Two between E and B. If C is at the bottom, which box is on top?',
      revealClue: 'Enter your final calculation into the central SCADA console terminal in the vault core.',
      hint: ROUND2_FIELD_GUIDE_HINTS[4].letter2,
    },

    venue: {
      locationName: 'Vault Control Desk',
      code: 'VAULT-FLAG-777',
      description: 'Master Physical Authorization Key from Chief Proctor at Vault Control Desk.',
    },

    keyBox: {
      name: "Terminal 4: Two's Complement",
      storyLocation: 'Mounted on the central SCADA console desk in the vault core',
      unlockedKeyName: 'Championship Extraction Pass',
      techTitle: "Terminal 4: Stack Operations & Two's Complement",
      techTopic: 'Stack Data Structures & Binary Representations',
      techQuestion:
        'Perform these stack operations in order:\n- Push 12\n- Push 6\n- Pop\n- Push 18\n- Push 4\n- Pop\n- Push 9\n\nCalculate the sum of the remaining stack elements, subtract 42, and represent the result in 16-bit two\'s complement binary.',
      techExplanation:
        'Remaining elements: 12, 18, 9. Sum = 39. Subtract 42: 39 - 42 = -3. In 16-bit two\'s complement binary: 1111 1111 1111 1101.',
      techHint: ROUND2_FIELD_GUIDE_HINTS[4].tech,
    },

    interactables: ROOM4_INTERACTABLES,
  },
};

// ============================================================================
// SET 2: RED TEAM CONFIGURATION
// ============================================================================

export const SET_2_ROOMS: Record<number, RoomConfig> = {
  // Sector 1: Detention Cell Block
  1: {
    ...SET_1_ROOMS[1],
    roomName: 'Detention Cell Block',
    accentColor: '#ef4444',
    letter1: {
      ...SET_1_ROOMS[1].letter1,
      puzzleQuestion:
        'Eight people are in a room. Each person shakes hands with every other person exactly once. How many handshakes take place?',
      hint: ROUND2_FIELD_GUIDE_HINTS[1].letter1,
    },
    letter2: {
      ...SET_1_ROOMS[1].letter2,
      puzzleQuestion:
        'Person A is twice as old as Person B. Their ages add up to 66 years. How old is Person B?',
      hint: ROUND2_FIELD_GUIDE_HINTS[1].letter2,
    },
    venue: {
      locationName: 'Station 2',
      code: 'DOOR-KEY-92',
      description: 'Physical keycard hidden at Station 2 in the venue room.',
    },
    keyBox: {
      ...SET_1_ROOMS[1].keyBox,
      techQuestion:
        'Find the next number in this series:\n25, 49, 121, 169, 289, 361, 529, ?',
      techExplanation:
        'Consecutive prime squares starting from 5: 5²=25, 7²=49, 11²=121, 13²=169, 17²=289, 19²=361, 23²=529. The next prime after 23 is 29. Therefore: 29² = 841.',
      techHint: ROUND2_FIELD_GUIDE_HINTS[1].tech,
    },
  },

  // Sector 2: Surveillance & Security Hub
  2: {
    ...SET_1_ROOMS[2],
    roomName: 'Surveillance & Security Hub',
    letter1: {
      ...SET_1_ROOMS[2].letter1,
      puzzleQuestion:
        'A father is 36 years old and his son is 12 years old. After how many years will the father be twice as old as his son?',
      hint: ROUND2_FIELD_GUIDE_HINTS[2].letter1,
    },
    letter2: {
      ...SET_1_ROOMS[2].letter2,
      puzzleQuestion:
        '"Once in every minute, twice in every moment, never in thousand years."',
      hint: ROUND2_FIELD_GUIDE_HINTS[2].letter2,
    },
    venue: {
      locationName: 'Scope Station 3',
      code: 'DECODER-CHIP-43',
      description: 'Physical card attached to Scope Station 3 near the oscilloscope rack.',
    },
    keyBox: {
      ...SET_1_ROOMS[2].keyBox,
      techQuestion:
        'Predict the output.\n\nint a = 4, b = 0;\nint c = (++a > 4) || (b++ && printf("Tech"));\nint d = (a++ && --b);\nprintf("%d %d %d %d", a, b, c, d);',
      techCodeSnippet:
        'int a = 4, b = 0;\nint c = (++a > 4) || (b++ && printf("Tech"));\nint d = (a++ && --b);\nprintf("%d %d %d %d", a, b, c, d);',
      techExplanation:
        '++a increments a from 4 to 5. (5 > 4) is true, so logical OR short-circuits. Next (a++ && --b) evaluates 5 and decrements b to -1. Output: "6 -1 0 1".',
      techHint: ROUND2_FIELD_GUIDE_HINTS[2].tech,
    },
  },

  // Sector 3: Sub-Level Utility Tunnel
  3: {
    ...SET_1_ROOMS[3],
    roomName: 'Sub-Level Utility Tunnel',
    letter1: {
      ...SET_1_ROOMS[3].letter1,
      puzzleQuestion:
        'Two fathers and two sons went fishing. each caught one fish. how many fishes they got?',
      hint: ROUND2_FIELD_GUIDE_HINTS[3].letter1,
    },
    letter2: {
      ...SET_1_ROOMS[3].letter2,
      puzzleQuestion:
        'Four people need to cross a bridge at night. Their individual crossing times are 2, 4, 7, and 12 minutes. Only two can cross at a time, and they need a torch. When two people cross together, they move at the slower person\'s speed. What is the minimum total time?',
      hint: ROUND2_FIELD_GUIDE_HINTS[3].letter2,
    },
    venue: {
      locationName: '3D Printer Enclosure',
      code: 'SYSTEM-RELAY-89',
      description: 'Physical tag at Workbench 02 in the venue.',
    },
    keyBox: {
      ...SET_1_ROOMS[3].keyBox,
      techQuestion:
        'Letters map to A=1 … Z=26. Multiply by weights 1, 2, 1, 2, … by position and sum. Compute the coded value of TEXAS.',
      techExplanation:
        'T(20×1) + E(5×2) + X(24×1) + A(1×2) + S(19×1) = 20 + 10 + 24 + 2 + 19 = 75.',
      techHint: ROUND2_FIELD_GUIDE_HINTS[3].tech,
    },
  },

  // Sector 4: Exterior Extraction Perimeter
  4: {
    ...SET_1_ROOMS[4],
    roomName: 'Exterior Extraction Perimeter',
    letter1: {
      ...SET_1_ROOMS[4].letter1,
      puzzleQuestion:
        'Three prisoners stand in a row facing the same direction. Hats are drawn from 3 black and 2 white. The back prisoner sees two hats, the middle sees one, and the front sees none. The back prisoner stays silent. The middle prisoner stays silent. Who can deduce their own hat color, and what is it? (Format: POSITION COLOR)',
      hint: ROUND2_FIELD_GUIDE_HINTS[4].letter1,
    },
    letter2: {
      ...SET_1_ROOMS[4].letter2,
      puzzleQuestion:
        'Eight boxes A to H are stacked on top of each other in an unknown order. Two boxes are between A and F. Two between C and G. Three between D and B. H is right below B. Two between A and H. Two between E and B. If C is at the bottom, which box is on top?',
      hint: ROUND2_FIELD_GUIDE_HINTS[4].letter2,
    },
    venue: {
      locationName: 'Vault Control Desk',
      code: 'VAULT-FLAG-778',
      description: 'Master Keycard Red from Chief Proctor in the venue.',
    },
    keyBox: {
      ...SET_1_ROOMS[4].keyBox,
      techQuestion:
        'Perform these stack operations in order:\n- Push 20\n- Push 7\n- Pop\n- Push 16\n- Push 3\n- Pop\n- Push 11\n\nCalculate the sum of the remaining stack elements, subtract 54, and represent the result in 16-bit two\'s complement binary.',
      techExplanation:
        'Remaining elements: 20, 16, 11. Sum = 47. Subtract 54: 47 - 54 = -7. In 16-bit two\'s complement binary: 1111 1111 1111 1001.',
      techHint: ROUND2_FIELD_GUIDE_HINTS[4].tech,
    },
  },
};

// ============================================================================
// SET 3: GREEN TEAM CONFIGURATION
// ============================================================================

export const SET_3_ROOMS: Record<number, RoomConfig> = {
  // Sector 1: Detention Cell Block
  1: {
    ...SET_1_ROOMS[1],
    roomName: 'Detention Cell Block',
    accentColor: '#10b981',
    letter1: {
      ...SET_1_ROOMS[1].letter1,
      puzzleQuestion:
        'Six people are in a room. Each person shakes hands with every other person exactly once. How many handshakes take place?',
      hint: ROUND2_FIELD_GUIDE_HINTS[1].letter1,
    },
    letter2: {
      ...SET_1_ROOMS[1].letter2,
      puzzleQuestion:
        'Person A is twice as old as Person B. Their ages add up to 54 years. How old is Person B?',
      hint: ROUND2_FIELD_GUIDE_HINTS[1].letter2,
    },
    venue: {
      locationName: 'Station 3',
      code: 'DOOR-KEY-93',
      description: 'Physical keycard hidden at Station 3 in the venue room.',
    },
    keyBox: {
      ...SET_1_ROOMS[1].keyBox,
      techQuestion:
        'Find the next number in this series:\n9, 25, 49, 121, 169, 289, 361, ?',
      techExplanation:
        'Consecutive prime squares starting from 3: 3²=9, 5²=25, 7²=49, 11²=121, 13²=169, 17²=289, 19²=361. The prime following 19 is 23. Therefore: 23² = 529.',
      techHint: ROUND2_FIELD_GUIDE_HINTS[1].tech,
    },
  },

  // Sector 2: Surveillance & Security Hub
  2: {
    ...SET_1_ROOMS[2],
    roomName: 'Surveillance & Security Hub',
    letter1: {
      ...SET_1_ROOMS[2].letter1,
      puzzleQuestion:
        'A father is 40 years old and his son is 10 years old. After how many years will the father be twice as old as his son?',
      hint: ROUND2_FIELD_GUIDE_HINTS[2].letter1,
    },
    letter2: {
      ...SET_1_ROOMS[2].letter2,
      puzzleQuestion:
        '"Once in every minute, twice in every moment, never in thousand years."',
      hint: ROUND2_FIELD_GUIDE_HINTS[2].letter2,
    },
    venue: {
      locationName: 'Scope Station 4',
      code: 'DECODER-CHIP-44',
      description: 'Physical card attached to Scope Station 4 near the oscilloscope rack.',
    },
    keyBox: {
      ...SET_1_ROOMS[2].keyBox,
      techQuestion:
        'Predict the output.\n\nint a = 2, b = 0;\nint c = (++a > 2) || (b++ && printf("Tech"));\nint d = (a++ && --b);\nprintf("%d %d %d %d", a, b, c, d);',
      techCodeSnippet:
        'int a = 2, b = 0;\nint c = (++a > 2) || (b++ && printf("Tech"));\nint d = (a++ && --b);\nprintf("%d %d %d %d", a, b, c, d);',
      techExplanation:
        '++a increments a from 2 to 3. (3 > 2) is true, so logical OR short-circuits. Next (a++ && --b) evaluates 3 and decrements b to -1. Output: "4 -1 1 1".',
      techHint: ROUND2_FIELD_GUIDE_HINTS[2].tech,
    },
  },

  // Sector 3: Sub-Level Utility Tunnel
  3: {
    ...SET_1_ROOMS[3],
    roomName: 'Sub-Level Utility Tunnel',
    letter1: {
      ...SET_1_ROOMS[3].letter1,
      puzzleQuestion:
        'Two fathers and two sons went fishing. each caught one fish. how many fishes they got?',
      hint: ROUND2_FIELD_GUIDE_HINTS[3].letter1,
    },
    letter2: {
      ...SET_1_ROOMS[3].letter2,
      puzzleQuestion:
        'Four people need to cross a bridge at night. Their individual crossing times are 1, 2, 5, and 10 minutes. Only two can cross at a time, and they need a torch. When two people cross together, they move at the slower person\'s speed. What is the minimum total time?',
      hint: ROUND2_FIELD_GUIDE_HINTS[3].letter2,
    },
    venue: {
      locationName: '3D Printer Enclosure',
      code: 'SYSTEM-RELAY-90',
      description: 'Physical tag at Workbench 01 in the venue.',
    },
    keyBox: {
      ...SET_1_ROOMS[3].keyBox,
      techQuestion:
        'Letters map to A=1 … Z=26. Multiply by weights 1, 2, 1, 2, … by position and sum. Compute the coded value of NEWJERSEY',
      techExplanation:
        'N(14×1) + E(5×2) + W(23×1) + J(10×2) + E(5×1) + R(18×2) + S(19×1) + E(5×2) + Y(25×1) = 14 + 10 + 23 + 20 + 5 + 36 + 19 + 10 + 25 = 162.',
      techHint: ROUND2_FIELD_GUIDE_HINTS[3].tech,
    },
  },

  // Sector 4: Exterior Extraction Perimeter
  4: {
    ...SET_1_ROOMS[4],
    roomName: 'Exterior Extraction Perimeter',
    letter1: {
      ...SET_1_ROOMS[4].letter1,
      puzzleQuestion:
        'Three prisoners stand in a row facing the same direction. Hats are drawn from 3 black and 2 white. The back prisoner sees two hats, the middle sees one, and the front sees none. The back prisoner stays silent. The middle prisoner stays silent. Who can deduce their own hat color, and what is it? (Format: POSITION COLOR)',
      hint: ROUND2_FIELD_GUIDE_HINTS[4].letter1,
    },
    letter2: {
      ...SET_1_ROOMS[4].letter2,
      puzzleQuestion:
        'Eight boxes A to H are stacked on top of each other in an unknown order. Two boxes are between A and F. Two between C and G. Three between D and B. H is right below B. Two between A and H. Two between E and B. If C is at the bottom, which box is on top?',
      hint: ROUND2_FIELD_GUIDE_HINTS[4].letter2,
    },
    venue: {
      locationName: 'Vault Control Desk',
      code: 'VAULT-FLAG-779',
      description: 'Master Keycard Green from Chief Proctor in the venue.',
    },
    keyBox: {
      ...SET_1_ROOMS[4].keyBox,
      techQuestion:
        'Perform these stack operations in order:\n- Push 15\n- Push 8\n- Pop\n- Push 22\n- Push 5\n- Pop\n- Push 10\n\nCalculate the sum of the remaining stack elements, subtract 50, and represent the result in 16-bit two\'s complement binary.',
      techExplanation:
        'Remaining elements: 15, 22, 10. Sum = 47. Subtract 50: 47 - 50 = -3. In 16-bit two\'s complement binary: 1111 1111 1111 1101.',
      techHint: ROUND2_FIELD_GUIDE_HINTS[4].tech,
    },
  },
};

export const ROOMS_CONFIG: Record<number, RoomConfig> = SET_1_ROOMS;

export const ROOMS_CONFIG_BY_SET: Record<number, Record<number, RoomConfig>> = {
  1: SET_1_ROOMS,
  2: SET_2_ROOMS,
  3: SET_3_ROOMS,
};

export function getRoomsConfigForSet(setId: number = 1): Record<number, RoomConfig> {
  return ROOMS_CONFIG_BY_SET[setId] || ROOMS_CONFIG_BY_SET[1];
}

export { ROUND2_FIELD_GUIDE_TITLE };
