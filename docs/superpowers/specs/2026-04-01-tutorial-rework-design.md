# Tutorial Rework Design

## Goal
Completely rework the tutorial into a fully guided, step-by-step walkthrough that a 5-year-old could follow. Every mechanic is taught one at a time, with time paused between steps, action-gated progression, and clear visual highlighting.

## Additional Changes
- Remove uncertain plant zones entirely from the game
- Fix plant image scaling to maintain aspect ratio (no stretching)

---

## 1. Start Menu Flow

New game state `STATE.MODE_SELECT` added between TITLE and TUTORIAL/COUNTDOWN.

After pressing Play on the title screen, a mode select screen appears with two buttons:
- **"Tutorial"** - starts the full guided tutorial (Level 1 board: 2x1 grid)
- **"Play Game"** - skips to Level 2 (2x2 grid, surges enabled), sets `tutorialCompleted = true`

## 2. Core Tutorial Rules

- **Time is always paused** during tutorial. No drain happens until the player completes the required action. Drain only ticks briefly during the "watch drain" step, then stops.
- **Action-gated progression** - every step defines what the player must do. Tutorial does not advance until that input happens.
- **Larger dialog box** - ~140px tall (up from 90px), main text 24px (up from 17px), hint text 16px (up from 12px).
- **"Click to continue" prompts** get a pulsing highlight with arrow indicator.

## 3. Tutorial Steps

| # | ID | Text | Advance On | Highlight |
|---|-----|------|------------|-----------|
| 1 | welcome | "Welcome to Garden Circuit! Let's learn how to play." | click | board |
| 2 | explain_hp | "Each plant has a Health bar (HP). If it reaches zero, the plant dies!" | click | hp_bars |
| 3 | explain_water | "Plants need water. See the blue water bar? It drains over time." | click | water_bars |
| 4 | explain_light | "Plants also need light. The yellow light bar drains too." | click | light_bars |
| 5 | watch_drain | "Watch - the bars are draining! You need to act fast to keep plants alive." | auto (3s drain then click) | beds |
| 6 | select_plant | "Click on a plant to select it. You can also use WASD or arrow keys." | select | beds |
| 7 | water_action | "Great! Now press Q or click the Water button to water your plant." | water | water_btn |
| 8 | light_action | "Nice! Now press E or click Light to give your plant light." | light | light_btn |
| 9 | airflow_action | "Press R or click Airflow. It slows drain for a few seconds and has a cooldown." | airflow | airflow_btn |
| 10 | explain_panel | "This side panel shows your level, timer, score, and combo meter." | click | panel |
| 11 | explain_wilted | "If too many plants die, you lose! Watch the Wilted counter here." | click | wilted |
| 12 | surge_intro | "Sometimes a SURGE event will strike! Let's see one now..." | click | tension_meter |
| 13 | surge_forced | (Force-trigger surge, let it play ~4s, auto-pause when done) | surge_end | board |
| 14 | surge_explain | "That was a surge! During surges: drains speed up, fake warnings appear, and controls lag slightly. Stay calm and focus on the most critical plants." | click | none |
| 15 | tension_explain | "The Tension meter rises during surges. If it maxes out, your combo drops. Keep plants healthy to lower it." | click | tension_meter |
| 16 | ready | "You're ready! Keep all plants alive until the timer runs out. Good luck!" | click | none |

## 4. Visual Highlighting System

When a step highlights a UI element:
- Dark overlay covers the entire screen
- Highlighted element is redrawn on top at full brightness
- Pulsing accent border (4px thick) around the highlighted element
- New highlight regions added: `hp_bars`, `water_bars`, `light_bars`, `panel`, `wilted`, `tension_meter`

## 5. Surge Demo (Step 13)

- Temporarily enable surge mechanics (`surgeMult` forced > 0)
- Force-trigger `startSurge()` with a fixed short duration (~4s)
- Let time run so player sees visual effects (jitter, false alerts, tension rising)
- Auto-advance to step 14 when surge ends
- After surge explanation steps, clear all surge state

## 6. Remove Uncertain Zones

Remove all uncertain zone logic from the game:
- Remove `isUncertainZone`, `uncertainTimer` from PlantBed
- Remove uncertain zone creation in `endSurge()`
- Remove uncertain zone rendering in `drawBed()`
- Remove uncertain zone tension penalty in `doAction()`
- Remove related constants
- Remove uncertain zone display in selected bed panel info
- Remove `displayUrgency` flickering for uncertain zones

## 7. Plant Image Scaling

Fix `drawBed()` to use aspect-ratio-preserving scaling:
- Calculate scale factor from `min(availableWidth / imgWidth, availableHeight / imgHeight)`
- Center the image within the plant bed
- Never stretch beyond natural aspect ratio

## 8. Skip to Game

When player picks "Play Game" from mode select:
- `tutorialCompleted = true`
- `initGame(1)` (Level 2, 0-indexed)
- Straight to countdown -> playing
