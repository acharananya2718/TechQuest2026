# TECH QUEST: ESCAPE SIMULATOR EDITION

A physical, free-roam, physics-driven 3D escape room game in the style of **Pine Studios' "Escape Simulator"**. Players explore a gritty cyberpunk prison facility, pick up, carry, rotate in 3D, drop and throw objects with rigid-body physics, search drawers, mattress, conduits, and clocks, and solve multi-stage technical and logic puzzles to escape.

---

## 1. TECH STACK & ENGINE ARCHITECTURE

- **Framework:** React 18/19 + Vite + TypeScript.
- **3D Graphics:** Plain Three.js (`three` v0.186+) mounted inside a `useEffect` canvas (zero `@react-three/fiber` reconciler issues).
- **Rigid-Body Physics:** `cannon-es` rigid-body physics simulation:
  - Dynamic rigid bodies fall, tumble, slide, stack, and collide with walls and furniture.
  - Kinetic pick-up attachment floats objects in front of the camera with variable distance.
  - Impulse physics launch objects on throw, bouncing off surfaces with procedural impact sounds.
- **Sound Synthesis:** 100% Web Audio procedural sound generation (no external mp3/wav files):
  - Dynamic footsteps synchronized with WASD movement (walk vs sprint rates).
  - Material-specific collision impacts: metal clank, wood thud, paper rustle, glass clink.
  - Throw whooshes, grab clicks, dial ticks, keypad beeps, unbolt clunks, electric sparks, and victory fanfare.
- **Authoritative Answer Verification:** Centralized in `src/game/verify.ts` with salted SHA-256 fallback and backend Express verification.
- **State Persistence:** Local storage (`TECH_QUEST_ESCAPE_SIMULATOR_PROGRESS_V2`) retains room, score, errors, hints, and inventory across refresh.

---

## 2. PINE STUDIOS ESCAPE SIMULATOR MECHANICS & CONTROLS

| Control | Action | Details |
|---|---|---|
| **W, A, S, D / Arrows** | Free Roam Movement | Move player in 3D space with bounding wall collisions |
| **Mouse Look** | Camera Pitch & Yaw | Click canvas to capture pointer lock |
| **Shift** | Sprint | Accelerate movement speed from 3.2 m/s to 5.5 m/s |
| **Space** | Jump | Jump over obstacles and debris |
| **C** | Crouch | Lower eye height to 0.75m to look under beds, desks, and ducts |
| **E** | Pick Up / Interact | Pick up physical objects, flip mattress, search containers, read notes |
| **LMB (Hold & Release)** | Charge Throw & Throw | Hold left mouse button to charge power meter (0–100%), release to throw object with physics force |
| **R (Hold + Move Mouse)** | 3D Object Rotation | Freely spin and rotate held object around all axes to inspect underside, back, and engravings |
| **Mouse Wheel** | Carry Distance | Adjust held object distance closer (0.6m) or further (2.4m) |
| **Q** | Drop | Gently drop held object in front of player |
| **F** | Inspect Mode | Pull object to center screen for full-view 3D inspection |
| **H** | Hint (-10 pts) | Open confirmation dialog to unlock puzzle hint |
| **N** | Notes Log | Review all discovered letters and objective clues |
| **M** | Mute Audio | Toggle synthesized Web Audio sound effects and ambience |
| **O** | Settings | Adjust mouse sensitivity, volume, and view controls |
| **Esc** | Close / Exit | Close modals, notes, terminals, or release pointer lock |
| **Ctrl + Shift + A** | Admin Panel | Passcode `admin123` to jump rooms or toggle venue mode |

---

## 3. HOW TO CONFIGURE QUESTIONS, KEYS & VENUE LOCATIONS

All room puzzles, hints, codes, and coordinates are completely data-driven in `src/game/roomsData.ts`. You can change questions or venue cards without touching the 3D game engine:

1. Open `src/game/roomsData.ts`.
2. Locate `ROOMS_CONFIG[1]`, `[2]`, `[3]`, or `[4]`.
3. To customize letters and puzzles:
   - Modify `letter1.puzzleQuestion`, `letter1.engravedCode`, `letter1.revealClue`, and `letter1.hint`.
   - Modify `letter2.puzzleQuestion`, `letter2.revealClue`, and `letter2.hint`.
4. To customize technical terminal questions:
   - Edit `keyBox.techTitle`, `keyBox.techQuestion`, `keyBox.techCodeSnippet`, and `keyBox.techExplanation`.
5. To change physical venue stations:
   - Edit `venue.locationName` and `venue.code` (e.g. `DOOR-KEY-91`, `DECODER-CHIP-42`, `SYSTEM-RELAY-88`, `VAULT-FLAG-777`).
6. Update the authoritative validator in `src/game/verify.ts` if correct answers are changed, and run `npx tsx tests/verify_test.ts` to ensure all tests pass.

---

## 4. COMPLETE ROOM CHEAT SHEET & TEST CHECKLIST

### Room 1: The Discovery (Detention Cell / Front Gate - Cyan)
- **Search Mechanic:** Flip the mattress on the bunk bed (`[E]` or `[LMB]`) to reveal Hidden Letter 1 taped to the bed slats.
- **Letter 1 ("L1"):** Handshakes among people:
  - Set 1 (Blue): 7 people $\binom{7}{2} = 21$. Answer: `21`
  - Set 2 (Red): 8 people $\binom{8}{2} = 28$. Answer: `28`
  - Set 3 (Green): 6 people $\binom{6}{2} = 15$. Answer: `15`
  - **Clue:** *"Look beneath the loose red brick on the cell floor."* (Points to loose brick)
- **Search Mechanic:** Move the loose red brick on the cell floor to discover Letter 2.
- **Letter 2:** Ages problem ($A = 2B$):
  - Set 1 (Blue): Sum = 72 $\implies B = 24$. Answer: `24`
  - Set 2 (Red): Sum = 66 $\implies B = 22$. Answer: `22`
  - Set 3 (Green): Sum = 54 $\implies B = 18$. Answer: `18`
  - **Clue:** *"The old television screen still hums in the corner. Look behind where it sits."* (Points to corner CRT TV)
- **Search Mechanic:** Push or tilt the CRT TV forward on the table in the corner to reveal the recessed Key Box behind it.
- **Physical Keycard (Venue Mode):** `DOOR-KEY-91` (Set 1), `DOOR-KEY-92` (Set 2), `DOOR-KEY-93` (Set 3)
- **Technical Q1:** Prime squares sequence:
  - Set 1: $2^2, 3^2, 5^2, 7^2, 11^2, 13^2, 17^2, ?$ $\implies 19^2 = 361$. Answer: `361`
  - Set 2: $5^2, 7^2, 11^2, 13^2, 17^2, 19^2, 23^2, ?$ $\implies 29^2 = 841$. Answer: `841`
  - Set 3: $3^2, 5^2, 7^2, 11^2, 13^2, 17^2, 19^2, ?$ $\implies 23^2 = 529$. Answer: `529`
- **Exit:** Unlocks `HEAVY_CELL_GATE_KEY` to open cell gate.

### Room 2: The Decoder (Guard Comms Station - Magenta)
- **Search Mechanic:** Slide open the officer desk drawer on the west side to access the secret false bottom.
- **Letter 1 ("S2"):** Father and son ages:
  - Set 1 (Blue): Father 50, son 14 $\implies x = 22$. Answer: `22`
  - Set 2 (Red): Father 36, son 12 $\implies x = 12$. Answer: `12`
  - Set 3 (Green): Father 40, son 10 $\implies x = 20$. Answer: `20`
  - **Clue:** *"Signals rest where rubber meets steel on the oscilloscope workbench."* (Oscilloscope rubber mat)
- **Search Mechanic:** Pick up or lift the rubber insulating mat on the oscilloscope workbench (east side) to uncover Letter 2.
- **Letter 2:** Minute, moment, thousand years riddle.
  - **Answer:** `M` (or `m`)
  - **Clue:** *"The clock keeps count, but not the hours. Check the wall recess behind its face on the west wall."* (Points to wall clock)
- **Search Mechanic:** Take the heavy wall clock off the west wall to uncover the Comms Key Box in the wall cavity recess.
- **Physical Keycard (Venue Mode):** `DECODER-CHIP-42` (Set 1), `DECODER-CHIP-43` (Set 2), `DECODER-CHIP-44` (Set 3)
- **Technical Q2:** C code precedence & short-circuit evaluation:
  - Set 1: Answer: `1 0` (or `5 -1 0 1`)
  - Set 2: Answer: `6 -1 0 1`
  - Set 3: Answer: `4 -1 1 1`
- **Exit:** Unlocks `UTILITY_TUNNEL_PASSKEY` for blast portal.

### Room 3: The System (Utility Tunnels / PLC Relay - Amber)
- **Search Mechanic:** Lift the loose diamond-plate cable duct cover off the center floor walkway to uncover Letter 1.
- **Letter 1 ("P3"):** Two fathers and two sons catch fish $\implies$ Grandfather, Father, Son (3 people).
  - **Answer:** `3`
  - **Clue:** *"Cold air breathes where the blades stand still on the east ventilation fan."* (Ventilation fan)
- **Search Mechanic:** Open the wire protective grating on the east ventilation fan to reveal Letter 2.
- **Letter 2:** Bridge crossing in the dark:
  - Set 1 (Blue): 1, 3, 6, 11 min $\implies 3 + 1 + 11 + 3 + 3 = 21$ min. Answer: `21 minutes` (or `21`)
  - Set 2 (Red): 2, 4, 7, 12 min $\implies 4 + 2 + 12 + 4 + 4 = 26$ min. Answer: `26 minutes` (or `26`)
  - Set 3 (Green): 1, 2, 5, 10 min $\implies 2 + 1 + 10 + 2 + 2 = 17$ min. Answer: `17 minutes` (or `17`)
  - **Clue:** *"Climb above the pipes where the rope secures the overhead ceiling hatch."* (Overhead ceiling hatch)
- **Mini-Puzzle:** Route the High-Voltage 480V circuit breaker switches (S1: ON, S2: OFF, S3: ON, S4: ON) to restore floodlight power.
- **Environmental Tool:** Place the wooden utility ladder under the ceiling hatch and cut the binding rope with the utility knife.
- **Physical Keycard (Venue Mode):** `SYSTEM-RELAY-88` (Set 1), `SYSTEM-RELAY-89` (Set 2), `SYSTEM-RELAY-90` (Set 3)
- **Technical Q3:** Alternating positional cipher:
  - Set 1 (Blue): CALIFORNIA $\implies$ Answer: `128`
  - Set 2 (Red): TEXAS $\implies$ Answer: `75`
  - Set 3 (Green): NEWJERSEY $\implies$ Answer: `162`
- **Exit:** Unlocks `MASTER_SCADA_VAULT_KEYCARD`.

### Room 4: The Final Vault (Master SCADA Core - Blue)
- **Search Mechanic:** Eject the modular blade drive sled on Mainframe Rack 02 on the west wall to reveal Letter 1.
- **Letter 1 ("V4"):** 3 prisoners with 3 black and 2 white hats. Back silent $\implies$ not seeing two whites. Middle silent $\implies$ front is not white. Front deduces:
  - **Answer:** `FRONT BLACK` (or `BLACK FRONT`)
  - **Clue:** *"Look inside the red emergency safety cabinet mounted on the north wall."* (Points to red emergency safety cabinet)
- **Search Mechanic:** Open the red emergency safety cabinet on the north wall to uncover Letter 2 and the fire extinguisher.
- **Letter 2:** 8 stacked boxes A to H with C at bottom:
  - Complete order bottom to top: C, H, B, G, A, E, D, F.
  - **Answer:** `F` (or `f`)
  - **Clue:** *"Enter your final calculation into the central SCADA console terminal in the vault core."* (SCADA control console desk)
- **Search Mechanic:** Access the SCADA terminal mounted on the central console desk in the vault core.
- **Physical Keycard (Venue Mode):** `VAULT-FLAG-777` (Set 1), `VAULT-FLAG-778` (Set 2), `VAULT-FLAG-779` (Set 3)
- **Technical Q4:** Stack simulation & Two's Complement:
  - Set 1 (Blue): Elements [12, 18, 9] $\implies$ Sum = 39. $39 - 42 = -3$. 16-bit Two's Complement: `1111 1111 1111 1101`
  - Set 2 (Red): Elements [20, 16, 11] $\implies$ Sum = 47. $47 - 54 = -7$. 16-bit Two's Complement: `1111 1111 1111 1001`
  - Set 3 (Green): Elements [12, 24, 11] $\implies$ Sum = 47. $47 - 50 = -3$. 16-bit Two's Complement: `1111 1111 1111 1101`
  - **Answer:** 16-bit binary string (accepts with or without spaces, or decimal)
- **Final:** Vault door rolls open, steam rises, klaxon sounds, capture the **CHAMPIONSHIP FLAG** on its pedestal to trigger the victory celebration!

---

## 5. SCORING RULES

- **Base Score:** 1000 points.
- **Wrong Submission Penalty:** Every 3 cumulative incorrect submissions deducts **15 points**. A warning appears after the 2nd wrong attempt.
- **Hint Penalty:** Each tactical hint unlocked deducts **10 points** (charged only once per hint, re-reading is free).
- **Ranking:** Leaderboards sort teams primarily by net score, then by shortest escape time.

---

## 6. RUNNING TESTS & DEV SERVER

```bash
# Run automated verification unit tests (checks all 39 mathematical & code recomputations)
npx tsx tests/verify_test.ts

# Run production build compilation
npm run build

# Run TypeScript linter
npm run lint

# Start development full-stack server
npm run dev
```
