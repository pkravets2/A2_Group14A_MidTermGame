# Tutorial Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the tutorial into a fully guided, step-by-step walkthrough with paused time, action-gated progression, visual highlighting, a forced surge demo, a mode-select screen, proper plant image scaling, and removal of uncertain zones.

**Architecture:** All changes are in the single `sketch.js` file. We modify the tutorial step definitions, the tutorial drawing/input system, add a MODE_SELECT state, remove uncertain zone code throughout, and fix image scaling in `drawBed()`.

**Tech Stack:** p5.js (browser-based canvas game), vanilla JavaScript

---

### Task 1: Remove Uncertain Zone System

**Files:**
- Modify: `sketch.js:46-50` (constants)
- Modify: `sketch.js:54` (TENSION_RISE_UNCERTAIN constant)
- Modify: `sketch.js:379-398` (PlantBed constructor)
- Modify: `sketch.js:408-413` (displayUrgency getter)
- Modify: `sketch.js:440-475` (PlantBed update method)
- Modify: `sketch.js:604-622` (endSurge function)
- Modify: `sketch.js:690-694` (doAction function)
- Modify: `sketch.js:1174-1292` (drawBed function)
- Modify: `sketch.js:1357-1371` (drawPanel selected bed info)

- [ ] **Step 1: Remove uncertain zone constants (lines 46-50)**

Delete these lines:
```javascript
// Uncertain zones
const UNCERTAIN_ZONE_COUNT_MIN = 2;
const UNCERTAIN_ZONE_COUNT_MAX = 4;
const UNCERTAIN_DURATION_MIN = 8;
const UNCERTAIN_DURATION_MAX = 15;
```

Also delete `TENSION_RISE_UNCERTAIN` from line 54:
```javascript
const TENSION_RISE_UNCERTAIN = 4;
```

- [ ] **Step 2: Remove uncertain zone properties from PlantBed constructor (lines 379-398)**

In the `constructor()`, remove these two lines:
```javascript
    this.isUncertainZone = false;
    this.uncertainTimer = 0;
```

- [ ] **Step 3: Simplify displayUrgency getter (lines 408-413)**

Replace the entire `get displayUrgency()` getter:
```javascript
  get displayUrgency() {
    if (this.hasFalseAlert) return 'critical';
    if (this.isUncertainZone && surgeActive) {
      if (random() < 0.2) return random() < 0.5 ? 'warning' : 'healthy';
    }
    return this.trueUrgency;
  }
```

With:
```javascript
  get displayUrgency() {
    if (this.hasFalseAlert) return 'critical';
    return this.trueUrgency;
  }
```

- [ ] **Step 4: Remove uncertain zone update logic from PlantBed.update()**

In the `update(dt)` method, find and remove the uncertain zone timer block (around lines 450-455). Look for:
```javascript
    if (this.isUncertainZone) {
      this.uncertainTimer -= dt;
      if (this.uncertainTimer <= 0) this.isUncertainZone = false;
    }
```

Delete those lines entirely.

- [ ] **Step 5: Remove uncertain zone creation from endSurge() (lines 604-622)**

In `endSurge()`, remove the block that creates uncertain zones after a surge ends. Find and delete:
```javascript
  let available = beds.filter(b => !b.isWilted);
  shuffle(available, true);
  let count = floor(random(UNCERTAIN_ZONE_COUNT_MIN, UNCERTAIN_ZONE_COUNT_MAX + 1));
  count = min(count, available.length);
  for (let i = 0; i < count; i++) {
    available[i].isUncertainZone = true;
    available[i].uncertainTimer = random(UNCERTAIN_DURATION_MIN, UNCERTAIN_DURATION_MAX);
  }
```

- [ ] **Step 6: Remove uncertain zone tension penalty from doAction() (line 694)**

In `doAction()`, remove this line:
```javascript
  if (bed.isUncertainZone) tensionMeter += TENSION_RISE_UNCERTAIN;
```

- [ ] **Step 7: Remove uncertain zone rendering from drawBed() (lines 1178-1181, 1280-1287)**

In `drawBed()`, replace the background fill logic:
```javascript
  if (bed.isWilted) fill(COL.bedDead);
  else if (bed.isUncertainZone) {
    let s = sin(millis()/300 + bed.index)*10;
    fill(COL.bedUncertain[0]+s, COL.bedUncertain[1]+s, COL.bedUncertain[2]+s);
  } else fill(COL.bedNormal);
```

With:
```javascript
  if (bed.isWilted) fill(COL.bedDead);
  else fill(COL.bedNormal);
```

Also remove the uncertain zone border/label block at lines 1280-1287:
```javascript
  if (bed.isUncertainZone) {
    noFill();
    stroke(COL.bedUncertain[0]+40,COL.bedUncertain[1]+40,COL.bedUncertain[2]+40,
      100+sin(millis()/400+bed.index)*50);
    strokeWeight(2); rect(bx+2, by+2, bw-4, bh-4, 3); noStroke();
    fill(180,160,220,180); textAlign(LEFT,TOP); textSize(8);
    text('uncertain', bx+5, by+5);
  }
```

And fix the bed index label that references `isUncertainZone` at line 1291:
```javascript
  text('#'+(bed.index+1), bx+4, by+(bed.isUncertainZone ? 15 : 4));
```
Change to:
```javascript
  text('#'+(bed.index+1), bx+4, by+4);
```

- [ ] **Step 8: Remove uncertain zone display from panel (line 1367)**

In `drawPanel()`, remove:
```javascript
    if (sb.isUncertainZone) { fill(180,160,220); py += 16; text('\u2B21 Uncertain Zone', px, py); }
```

- [ ] **Step 9: Remove bedUncertain from color palette (line 125)**

Delete:
```javascript
  bedUncertain:[55, 50, 65],
```

- [ ] **Step 10: Test in browser**

Open `index.html` in a browser. Verify:
- Game loads without console errors
- Plants display normally without uncertain zone visuals
- Surges still work (start at Level 2) but no uncertain zones appear after
- No references to "uncertain" appear anywhere on screen

- [ ] **Step 11: Commit**

```bash
git add sketch.js
git commit -m "refactor: remove uncertain zone system entirely"
```

---

### Task 2: Fix Plant Image Aspect Ratio Scaling

**Files:**
- Modify: `sketch.js` — `drawBed()` function (around line 1191-1197)

- [ ] **Step 1: Replace stretched image rendering**

In `drawBed()`, find the image drawing block:
```javascript
  if (imagesLoaded) {
    let img = getPlantImage(bed.health);
    if (img) {
      push(); imageMode(CORNER);
      if (bed.isWilted) tint(80,50,50,200);
      image(img, bx+1, by+1, bw-2, bh-2);
      noTint(); pop();
    }
```

Replace with aspect-ratio-preserving scaling:
```javascript
  if (imagesLoaded) {
    let img = getPlantImage(bed.health);
    if (img) {
      push(); imageMode(CORNER);
      if (bed.isWilted) tint(80,50,50,200);
      let availW = bw - 2;
      let availH = bh - 2;
      let scale = min(availW / img.width, availH / img.height);
      let drawW = img.width * scale;
      let drawH = img.height * scale;
      let drawX = bx + 1 + (availW - drawW) / 2;
      let drawY = by + 1 + (availH - drawH) / 2;
      image(img, drawX, drawY, drawW, drawH);
      noTint(); pop();
    }
```

- [ ] **Step 2: Test in browser**

Open `index.html`. Verify:
- Plant images are not stretched — they maintain their natural aspect ratio
- Images are centered within each plant bed
- Different grid sizes (Level 1 = 2x1, Level 2 = 2x2, Level 6 = 4x3) all look correct

- [ ] **Step 3: Commit**

```bash
git add sketch.js
git commit -m "fix: preserve plant image aspect ratio in drawBed"
```

---

### Task 3: Add MODE_SELECT State and Screen

**Files:**
- Modify: `sketch.js` — STATE object (line 154), `startGameFromTitle()` (line 1825), draw loop (line 1667), keyPressed (line 1747), mousePressed (line 1877)

- [ ] **Step 1: Add MODE_SELECT to STATE enum (line 154)**

Add `MODE_SELECT` to the STATE object:
```javascript
const STATE = {
  TITLE: 'title',
  MODE_SELECT: 'mode_select',
  TUTORIAL: 'tutorial',
  COUNTDOWN: 'countdown',
  PLAYING: 'playing',
  LEVEL_COMPLETE: 'level_complete',
  CONGRATS: 'congrats',
  WIN: 'win',
  LOSE: 'lose',
  PAUSED: 'paused',
};
```

- [ ] **Step 2: Add mode select buttons and draw function**

After the `startGameFromTitle()` function (around line 1835), add:

```javascript
// ============================================================
// MODE SELECT SCREEN
// ============================================================
let modeSelectButtons = [];

function initModeSelectButtons() {
  modeSelectButtons = [];
  let cx = CANVAS_W / 2;
  let btnW = 280, btnH = 60, gap = 24;
  let startY = CANVAS_H / 2 - 20;

  modeSelectButtons.push(new Button(cx - btnW/2, startY, btnW, btnH,
    'Tutorial', () => {
      hideTitleVideo();
      actionBtns = [];
      initGame(0);
      startTutorial();
      gameState = STATE.TUTORIAL;
    }, 'mode_tutorial'));

  modeSelectButtons.push(new Button(cx - btnW/2, startY + btnH + gap, btnW, btnH,
    'Play Game', () => {
      hideTitleVideo();
      actionBtns = [];
      tutorialCompleted = true;
      initGame(1);
      startCountdown();
    }, 'mode_play'));
}

function drawModeSelect() {
  background(COL.bg[0], COL.bg[1], COL.bg[2]);

  textAlign(CENTER, CENTER);
  textStyle(BOLD); textSize(42);
  fill(COL.accent[0], COL.accent[1], COL.accent[2]);
  text('Garden Circuit', CANVAS_W / 2, CANVAS_H / 2 - 140);

  textStyle(NORMAL); textSize(18);
  fill(COL.textSecondary);
  text('Choose how to start:', CANVAS_W / 2, CANVAS_H / 2 - 80);

  for (let btn of modeSelectButtons) {
    btn.checkHover(mouseX, mouseY);
    btn.draw();
  }

  // Subtitle hints under buttons
  textSize(13); fill(COL.textSecondary[0], COL.textSecondary[1], COL.textSecondary[2], 140);
  let btnY1 = CANVAS_H / 2 - 20;
  text('Learn every mechanic step by step', CANVAS_W / 2, btnY1 + 70);
  text('Jump straight into Level 2', CANVAS_W / 2, btnY1 + 60 + 24 + 70);
}
```

- [ ] **Step 3: Modify startGameFromTitle() to go to MODE_SELECT**

Replace `startGameFromTitle()` (line 1825):
```javascript
function startGameFromTitle() {
  hideTitleVideo();
  actionBtns = [];
  initGame(0);
  if (!tutorialCompleted) {
    startTutorial();
    gameState = STATE.TUTORIAL;
  } else {
    startCountdown();
  }
}
```

With:
```javascript
function startGameFromTitle() {
  initModeSelectButtons();
  gameState = STATE.MODE_SELECT;
}
```

- [ ] **Step 4: Add MODE_SELECT to draw loop (line 1670)**

In the `draw()` function's switch statement, add after the TITLE case:
```javascript
    case STATE.MODE_SELECT:
      drawModeSelect();
      break;
```

- [ ] **Step 5: Add MODE_SELECT to keyPressed (line 1753)**

In the `keyPressed()` switch statement, add after the TITLE case:
```javascript
    case STATE.MODE_SELECT:
      if (keyCode === ESCAPE) {
        gameState = STATE.TITLE;
        showTitleVideo();
      }
      break;
```

- [ ] **Step 6: Add MODE_SELECT to mousePressed (line 1877)**

In the `mousePressed()` switch statement, add after the TITLE case:
```javascript
    case STATE.MODE_SELECT:
      for (let btn of modeSelectButtons) { if (btn.checkClick(mouseX, mouseY)) return; }
      break;
```

- [ ] **Step 7: Initialize mode select buttons in setup()**

In `setup()` (line 1594), add after `initPauseButtons()`:
```javascript
  initModeSelectButtons();
```

- [ ] **Step 8: Test in browser**

Verify:
- Pressing Play on title goes to mode select screen
- "Tutorial" button starts the tutorial
- "Play Game" button starts Level 2 with countdown
- ESC on mode select goes back to title

- [ ] **Step 9: Commit**

```bash
git add sketch.js
git commit -m "feat: add mode select screen with Tutorial and Play Game options"
```

---

### Task 4: Expand Tutorial Steps and Add Drain Timer

**Files:**
- Modify: `sketch.js` — TUTORIAL_STEPS (line 232), tutorial state variables (line 227)

- [ ] **Step 1: Add tutorial drain timer variable**

After `let tutorialDrainEnabled = false;` (line 229), add:
```javascript
let tutorialDrainTimer = 0;
let tutorialSurgeActive = false;
```

- [ ] **Step 2: Replace TUTORIAL_STEPS array (lines 232-240)**

Replace the entire `TUTORIAL_STEPS` array with the expanded version:

```javascript
const TUTORIAL_STEPS = [
  { id: 'welcome',        text: 'Welcome to Garden Circuit!\nLet\'s learn how to play, one step at a time.',
    hint: '[ Click anywhere to continue ]', highlight: 'board', advanceOn: 'click' },

  { id: 'explain_hp',     text: 'Each plant has a Health bar (HP).\nIf HP reaches zero, the plant dies!',
    hint: '[ Click to continue ]', highlight: 'hp_bars', advanceOn: 'click' },

  { id: 'explain_water',  text: 'Plants need water!\nSee the blue Water bar? It drains over time.',
    hint: '[ Click to continue ]', highlight: 'water_bars', advanceOn: 'click' },

  { id: 'explain_light',  text: 'Plants also need light!\nThe yellow Light bar drains over time too.',
    hint: '[ Click to continue ]', highlight: 'light_bars', advanceOn: 'click' },

  { id: 'watch_drain',    text: 'Watch — the bars are draining!\nYou need to act fast to keep your plants alive.',
    hint: '[ Watch the bars, then click to continue ]', highlight: 'beds', advanceOn: 'click', enableDrain: true, drainDuration: 3 },

  { id: 'select_plant',   text: 'Click on a plant to select it.\nYou can also use WASD or the arrow keys.',
    hint: 'Select a plant to continue', highlight: 'beds', advanceOn: 'select' },

  { id: 'water_action',   text: 'Great! Now press Q or click the\nWater button to water your plant.',
    hint: 'Press Q or click the Water button', highlight: 'water_btn', advanceOn: 'water' },

  { id: 'light_action',   text: 'Nice! Now press E or click the\nLight button to give your plant light.',
    hint: 'Press E or click the Light button', highlight: 'light_btn', advanceOn: 'light' },

  { id: 'airflow_action', text: 'Press R or click Airflow to slow down\ndrain for a few seconds. It has a cooldown!',
    hint: 'Press R or click the Airflow button', highlight: 'airflow_btn', advanceOn: 'airflow' },

  { id: 'explain_panel',  text: 'This side panel shows your Level,\nTimer, Score, and Combo meter.',
    hint: '[ Click to continue ]', highlight: 'panel', advanceOn: 'click' },

  { id: 'explain_wilted', text: 'If too many plants die, you lose!\nKeep an eye on the Wilted counter.',
    hint: '[ Click to continue ]', highlight: 'wilted', advanceOn: 'click' },

  { id: 'surge_intro',    text: 'Sometimes a SURGE event will strike!\nLet\'s see what that looks like...',
    hint: '[ Click to trigger a surge ]', highlight: 'tension_meter', advanceOn: 'click' },

  { id: 'surge_forced',   text: 'A surge is happening! Watch the screen shake\nand fake warnings appear on plants.',
    hint: 'Wait for the surge to end...', highlight: 'board', advanceOn: 'surge_end', triggerSurge: true },

  { id: 'surge_explain',  text: 'That was a surge! During surges, drains speed up,\nfake warnings appear, and controls lag slightly.\nStay calm and focus on the most critical plants.',
    hint: '[ Click to continue ]', highlight: null, advanceOn: 'click' },

  { id: 'tension_explain',text: 'The Tension meter rises during surges.\nIf it maxes out, your combo drops!\nKeep plants healthy to lower tension.',
    hint: '[ Click to continue ]', highlight: 'tension_meter', advanceOn: 'click' },

  { id: 'ready',          text: 'You\'re ready! Keep all plants alive\nuntil the timer runs out. Good luck!',
    hint: '[ Click to start playing! ]', highlight: null, advanceOn: 'click' },
];
```

- [ ] **Step 3: Commit**

```bash
git add sketch.js
git commit -m "feat: expand tutorial to 16 guided steps with surge demo"
```

---

### Task 5: Rewrite Tutorial System Logic (startTutorial, advanceTutorial, endTutorial)

**Files:**
- Modify: `sketch.js` — tutorial functions (lines 773-794)

- [ ] **Step 1: Rewrite startTutorial()**

Replace lines 773-777:
```javascript
function startTutorial() {
  tutorialActive = true;
  tutorialStep = 0;
  tutorialDrainEnabled = false;
}
```

With:
```javascript
function startTutorial() {
  tutorialActive = true;
  tutorialStep = 0;
  tutorialDrainEnabled = false;
  tutorialDrainTimer = 0;
  tutorialSurgeActive = false;
  // Temporarily enable surge display for tutorial
  levelConfig = Object.assign({}, LEVELS[0], { surgeMult: 0.5 });
}
```

- [ ] **Step 2: Rewrite advanceTutorial()**

Replace lines 779-787:
```javascript
function advanceTutorial() {
  tutorialStep++;
  if (tutorialStep >= TUTORIAL_STEPS.length) {
    endTutorial();
    return;
  }
  let step = TUTORIAL_STEPS[tutorialStep];
  if (step.enableDrain) tutorialDrainEnabled = true;
}
```

With:
```javascript
function advanceTutorial() {
  // Stop drain from previous step
  tutorialDrainEnabled = false;
  tutorialDrainTimer = 0;

  tutorialStep++;
  if (tutorialStep >= TUTORIAL_STEPS.length) {
    endTutorial();
    return;
  }

  let step = TUTORIAL_STEPS[tutorialStep];
  if (step.enableDrain) {
    tutorialDrainEnabled = true;
    tutorialDrainTimer = step.drainDuration || 3;
  }
  if (step.triggerSurge) {
    tutorialSurgeActive = true;
    surgeActive = true;
    surgeTimer = 4;
    surgeVisualIntensity = 1.0;
    playSoundSurgeStart();
    // Set false alerts on available plants
    let available = beds.filter(b => !b.isWilted && b.trueUrgency !== 'critical');
    shuffle(available, true);
    let count = min(FALSE_ALERT_COUNT, available.length);
    for (let i = 0; i < count; i++) available[i].hasFalseAlert = true;
  }
}
```

- [ ] **Step 3: Rewrite endTutorial()**

Replace lines 789-794:
```javascript
function endTutorial() {
  tutorialActive = false;
  tutorialCompleted = true;
  tutorialDrainEnabled = false;
  startCountdown();
}
```

With:
```javascript
function endTutorial() {
  tutorialActive = false;
  tutorialCompleted = true;
  tutorialDrainEnabled = false;
  tutorialDrainTimer = 0;
  tutorialSurgeActive = false;
  surgeActive = false;
  surgeVisualIntensity = 0;
  tensionMeter = 0;
  for (let b of beds) b.hasFalseAlert = false;
  // Reset to Level 1 config (no surges)
  levelConfig = LEVELS[0];
  // Re-initialize for actual gameplay
  actionBtns = [];
  initGame(0);
  startCountdown();
}
```

- [ ] **Step 4: Commit**

```bash
git add sketch.js
git commit -m "feat: rewrite tutorial logic with drain timer and forced surge support"
```

---

### Task 6: Rewrite Tutorial Update Logic in Draw Loop

**Files:**
- Modify: `sketch.js` — draw loop TUTORIAL case (lines 1676-1693)

- [ ] **Step 1: Replace TUTORIAL case in draw()**

Replace the entire `case STATE.TUTORIAL:` block (lines 1676-1693):

```javascript
    case STATE.TUTORIAL:
      // Update drain if enabled in current step
      if (tutorialDrainEnabled) {
        // Minimal update — drain only, no surges, no end conditions, keep plants alive
        if (waterCooldown > 0) waterCooldown -= dt;
        if (lightCooldown > 0) lightCooldown -= dt;
        if (airflowCooldown > 0) airflowCooldown -= dt;
        if (actionLockTimer > 0) actionLockTimer -= dt;
        for (let bed of beds) {
          bed.update(dt);
          // Prevent death during tutorial
          bed.health = max(bed.health, 15);
          bed.isWilted = false;
        }
        updateParticles(dt);
      }
      drawTutorial();
      break;
```

With:

```javascript
    case STATE.TUTORIAL: {
      let step = TUTORIAL_STEPS[tutorialStep];

      // Always tick cooldowns so actions work immediately
      if (waterCooldown > 0) waterCooldown -= dt;
      if (lightCooldown > 0) lightCooldown -= dt;
      if (airflowCooldown > 0) airflowCooldown -= dt;
      if (actionLockTimer > 0) actionLockTimer -= dt;
      updateParticles(dt);

      // Drain only during drain-enabled steps
      if (tutorialDrainEnabled) {
        for (let bed of beds) {
          bed.update(dt);
          bed.health = max(bed.health, 15);
          bed.isWilted = false;
        }
        // Auto-stop drain after timer expires (but keep step open for click)
        if (step.drainDuration) {
          tutorialDrainTimer -= dt;
          if (tutorialDrainTimer <= 0) tutorialDrainEnabled = false;
        }
      }

      // Surge demo step: run surge update, auto-advance when done
      if (tutorialSurgeActive) {
        surgeTimer -= dt;
        tensionMeter += TENSION_RISE_SURGE * dt;
        tensionMeter = constrain(tensionMeter, 0, 80);
        if (!reducedEffects) {
          surgeJitterX = random(-SURGE_JITTER_AMOUNT, SURGE_JITTER_AMOUNT);
          surgeJitterY = random(-SURGE_JITTER_AMOUNT, SURGE_JITTER_AMOUNT);
        }
        surgeVisualIntensity = lerp(surgeVisualIntensity, 1, 0.1);
        // Drain plants during surge for realism
        for (let bed of beds) {
          bed.update(dt);
          bed.health = max(bed.health, 15);
          bed.isWilted = false;
        }
        if (surgeTimer <= 0) {
          surgeActive = false;
          tutorialSurgeActive = false;
          surgeVisualIntensity = 0;
          surgeJitterX = 0;
          surgeJitterY = 0;
          for (let b of beds) b.hasFalseAlert = false;
          playSoundSurgeEnd();
          advanceTutorial();
        }
      }

      drawTutorial();
      break;
    }
```

- [ ] **Step 2: Test in browser**

Verify:
- Tutorial starts with time paused (no drain)
- Step 5 (watch_drain) enables drain for 3 seconds then stops
- Actions (Q/E/R) work when prompted
- Surge demo plays out visually then auto-advances
- Plants never die during tutorial

- [ ] **Step 3: Commit**

```bash
git add sketch.js
git commit -m "feat: rewrite tutorial update loop with paused time, timed drain, surge demo"
```

---

### Task 7: Rewrite drawTutorial() with Larger UI and Extended Highlights

**Files:**
- Modify: `sketch.js` — `drawTutorial()` function (lines 796-874)

- [ ] **Step 1: Replace entire drawTutorial() function**

Replace lines 796-874 with:

```javascript
function drawTutorial() {
  // Draw the gameplay board underneath
  drawGameplayBoard();

  let step = TUTORIAL_STEPS[tutorialStep];

  // Don't dim during surge demo — let it be visible
  if (!tutorialSurgeActive) {
    // Dim overlay
    fill(10, 14, 24, 140);
    noStroke();
    rect(0, 0, CANVAS_W, CANVAS_H);
  } else {
    // Lighter dim during surge so effects are visible
    fill(10, 14, 24, 60);
    noStroke();
    rect(0, 0, CANVAS_W, CANVAS_H);
  }

  // Highlight specific areas by redrawing them on top
  drawTutorialHighlight(step);

  // Dialog box at bottom center — much larger
  let dlgW = 620, dlgH = 140;
  let dlgX = (CANVAS_W - PANEL_WIDTH) / 2 - dlgW / 2 + 10;
  let dlgY = CANVAS_H - 170;

  // Background with thicker border
  fill(12, 16, 30, 235);
  stroke(COL.accent[0], COL.accent[1], COL.accent[2], 180);
  strokeWeight(3);
  rect(dlgX, dlgY, dlgW, dlgH, 12);
  noStroke();

  // Main text — much larger
  fill(COL.textPrimary);
  textAlign(CENTER, CENTER);
  textSize(22);
  textStyle(BOLD);
  let textY = dlgY + dlgH / 2 - 18;
  // Handle multiline text
  let lines = step.text.split('\n');
  let lineHeight = 28;
  let totalTextH = lines.length * lineHeight;
  let startTextY = dlgY + dlgH / 2 - totalTextH / 2 - 8;
  for (let i = 0; i < lines.length; i++) {
    text(lines[i], dlgX + dlgW / 2, startTextY + i * lineHeight);
  }
  textStyle(NORMAL);

  // Hint text — larger and more visible with pulsing
  let hintAlpha = 160 + sin(millis() / 400) * 80;
  fill(COL.accent[0], COL.accent[1], COL.accent[2], hintAlpha);
  textSize(16);
  textStyle(BOLD);
  text(step.hint, dlgX + dlgW / 2, dlgY + dlgH - 24);
  textStyle(NORMAL);

  // Pulsing down arrow for click-to-continue steps
  if (step.advanceOn === 'click') {
    let arrowY = dlgY + dlgH + 8 + sin(millis() / 300) * 5;
    fill(COL.accent[0], COL.accent[1], COL.accent[2], hintAlpha);
    textSize(20);
    textAlign(CENTER, CENTER);
    text('\u25BC', dlgX + dlgW / 2, arrowY);
  }

  // Step indicator dots
  let dotY = dlgY + dlgH + 28;
  let dotSpacing = 14;
  let totalDotsW = TUTORIAL_STEPS.length * dotSpacing;
  for (let i = 0; i < TUTORIAL_STEPS.length; i++) {
    let dotX = dlgX + dlgW / 2 - totalDotsW / 2 + i * dotSpacing + dotSpacing / 2;
    if (i < tutorialStep) fill(COL.accent[0], COL.accent[1], COL.accent[2], 180);
    else if (i === tutorialStep) fill(COL.accent[0], COL.accent[1], COL.accent[2], 200 + sin(millis() / 300) * 55);
    else fill(60, 70, 60);
    noStroke();
    ellipse(dotX, dotY, 7, 7);
  }
}

function drawTutorialHighlight(step) {
  if (!step.highlight) return;

  let hl = step.highlight;
  let pulseAlpha = 150 + sin(millis() / 250) * 80;

  if (hl === 'board' || hl === 'beds') {
    for (let bed of beds) {
      push();
      drawBed(bed);
      noFill();
      stroke(COL.accent[0], COL.accent[1], COL.accent[2], pulseAlpha);
      strokeWeight(4);
      rect(bed.x - 3, bed.y - 3, bed.w + 6, bed.h + 6, 6);
      pop();
    }
  }

  if (hl === 'hp_bars') {
    for (let bed of beds) {
      push();
      drawBed(bed);
      // Highlight HP bar area specifically
      let barH = 6, barW = bed.w - 16, barX = bed.x + 8, labelH = 10, barGap = 4;
      let bottomPad = 6;
      let totalBarArea = 3 * (barH + labelH + barGap);
      let barAreaTop = bed.y + bed.h - bottomPad - totalBarArea;
      noFill();
      stroke(COL.health[0], COL.health[1], COL.health[2], pulseAlpha);
      strokeWeight(3);
      rect(barX - 4, barAreaTop - 2, barW + 8, labelH + barH + 4, 4);
      pop();
    }
  }

  if (hl === 'water_bars') {
    for (let bed of beds) {
      push();
      drawBed(bed);
      let barH = 6, barW = bed.w - 16, barX = bed.x + 8, labelH = 10, barGap = 4;
      let bottomPad = 6;
      let totalBarArea = 3 * (barH + labelH + barGap);
      let barAreaTop = bed.y + bed.h - bottomPad - totalBarArea;
      let waterBarY = barAreaTop + (labelH + barH + barGap);
      noFill();
      stroke(COL.water[0], COL.water[1], COL.water[2], pulseAlpha);
      strokeWeight(3);
      rect(barX - 4, waterBarY - 2, barW + 8, labelH + barH + 4, 4);
      pop();
    }
  }

  if (hl === 'light_bars') {
    for (let bed of beds) {
      push();
      drawBed(bed);
      let barH = 6, barW = bed.w - 16, barX = bed.x + 8, labelH = 10, barGap = 4;
      let bottomPad = 6;
      let totalBarArea = 3 * (barH + labelH + barGap);
      let barAreaTop = bed.y + bed.h - bottomPad - totalBarArea;
      let lightBarY = barAreaTop + 2 * (labelH + barH + barGap);
      noFill();
      stroke(COL.light[0], COL.light[1], COL.light[2], pulseAlpha);
      strokeWeight(3);
      rect(barX - 4, lightBarY - 2, barW + 8, labelH + barH + 4, 4);
      pop();
    }
  }

  if (hl === 'water_btn' || hl === 'light_btn' || hl === 'airflow_btn') {
    let btnIndex = hl === 'water_btn' ? 0 : hl === 'light_btn' ? 1 : 2;
    if (actionBtns.length > btnIndex) {
      let btn = actionBtns[btnIndex];
      push();
      fill(COL.panelBg);
      noStroke();
      rect(btn.x - 6, btn.y - 6, btn.w + 12, btn.h + 12, 10);
      btn.draw();
      noFill();
      stroke(COL.accent[0], COL.accent[1], COL.accent[2], pulseAlpha);
      strokeWeight(4);
      rect(btn.x - 3, btn.y - 3, btn.w + 6, btn.h + 6, 8);
      pop();
    }
  }

  if (hl === 'panel') {
    push();
    // Redraw the panel on top
    drawPanel();
    noFill();
    stroke(COL.accent[0], COL.accent[1], COL.accent[2], pulseAlpha);
    strokeWeight(4);
    rect(panelX + 2, 2, PANEL_WIDTH - 4, CANVAS_H - 4, 4);
    pop();
  }

  if (hl === 'wilted') {
    push();
    drawPanel();
    // Highlight wilted counter area at bottom of panel
    let px = panelX + 20;
    noFill();
    stroke(COL.healthLow[0], COL.healthLow[1], COL.healthLow[2], pulseAlpha);
    strokeWeight(3);
    rect(px - 6, CANVAS_H - 52, PANEL_WIDTH - 40 + 12, 28, 6);
    pop();
  }

  if (hl === 'tension_meter') {
    push();
    drawPanel();
    // Highlight tension meter area — approximate position in panel
    let px = panelX + 20, pw = PANEL_WIDTH - 40;
    // Tension meter is after combo bar, approximate y position
    let tensionY = 220;
    noFill();
    stroke(COL.tension[0], COL.tension[1], COL.tension[2], pulseAlpha);
    strokeWeight(3);
    rect(px - 6, tensionY - 6, pw + 12, 70, 6);
    pop();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add sketch.js
git commit -m "feat: rewrite drawTutorial with larger text, extended highlights, pulsing prompts"
```

---

### Task 8: Rewrite Tutorial Input Handling

**Files:**
- Modify: `sketch.js` — `handleTutorialInput()` (lines 1837-1857), mousePressed TUTORIAL case (lines 1895-1908)

- [ ] **Step 1: Replace handleTutorialInput() (lines 1837-1857)**

Replace with:

```javascript
function handleTutorialInput() {
  let step = TUTORIAL_STEPS[tutorialStep];

  // During surge demo, block all input — wait for auto-advance
  if (tutorialSurgeActive) return;

  // Movement keys always work for selection steps
  if (step.advanceOn === 'select' || step.advanceOn === 'water' || step.advanceOn === 'light' || step.advanceOn === 'airflow') {
    let col = selectedBed % currentGridCols;
    let row = floor(selectedBed / currentGridCols);
    let prevSelected = selectedBed;

    if (key === 'w' || key === 'W' || keyCode === UP_ARROW) row = max(0, row - 1);
    if (key === 's' || key === 'S' || keyCode === DOWN_ARROW) row = min(currentGridRows - 1, row + 1);
    if (key === 'a' || key === 'A' || keyCode === LEFT_ARROW) col = max(0, col - 1);
    if (key === 'd' || key === 'D' || keyCode === RIGHT_ARROW) col = min(currentGridCols - 1, col + 1);
    selectedBed = row * currentGridCols + col;

    if (selectedBed !== prevSelected && step.advanceOn === 'select') advanceTutorial();
  }

  // Action keys — only respond to the action the current step requires
  if (step.advanceOn === 'water' && (key === 'q' || key === 'Q')) doAction('water');
  if (step.advanceOn === 'light' && (key === 'e' || key === 'E')) doAction('light');
  if (step.advanceOn === 'airflow' && (key === 'r' || key === 'R')) doAction('airflow');
}
```

- [ ] **Step 2: Replace mousePressed TUTORIAL case (lines 1895-1908)**

Replace with:

```javascript
    case STATE.TUTORIAL: {
      let step = TUTORIAL_STEPS[tutorialStep];

      // During surge demo, block input
      if (tutorialSurgeActive) return;

      // Check action button clicks — only for the current step's required action
      if (step.advanceOn === 'water' || step.advanceOn === 'light' || step.advanceOn === 'airflow') {
        for (let btn of actionBtns) { if (btn.checkClick(mouseX, mouseY)) return; }
      }

      // Bed selection
      if (step.advanceOn === 'select' || step.advanceOn === 'water' || step.advanceOn === 'light' || step.advanceOn === 'airflow') {
        let idx = getBedAtMouse(mouseX, mouseY);
        if (idx >= 0) {
          let prev = selectedBed;
          selectedBed = idx;
          if (prev !== selectedBed && step.advanceOn === 'select') advanceTutorial();
        }
      }

      // Click-to-advance steps
      if (step.advanceOn === 'click') advanceTutorial();
      break;
    }
```

- [ ] **Step 3: Test in browser**

Verify:
- Click-to-continue steps advance on click
- Select step only advances when a different plant is selected
- Water/Light/Airflow steps only respond to their specific key
- During surge demo, clicking does nothing
- After surge demo auto-completes, next step is clickable

- [ ] **Step 4: Commit**

```bash
git add sketch.js
git commit -m "feat: rewrite tutorial input handling with action-gated progression"
```

---

### Task 9: Update Skip Tutorial and Pause Menu for New Flow

**Files:**
- Modify: `sketch.js` — pause buttons (lines 1462-1470), congrats replay (line 1798)

- [ ] **Step 1: Update Skip Tutorial pause button (lines 1462-1470)**

In `initPauseButtons()`, update the Skip Tutorial button callback to skip to Level 2:

Find:
```javascript
    'Skip Tutorial', () => {
      tutorialActive = false;
      tutorialCompleted = true;
      actionBtns = [];
      initGame(0);
      startCountdown();
    }, 'pause_skip_tutorial'));
```

Replace callback with:
```javascript
    'Skip Tutorial', () => {
      tutorialActive = false;
      tutorialCompleted = true;
      tutorialSurgeActive = false;
      surgeActive = false;
      surgeVisualIntensity = 0;
      for (let b of beds) b.hasFalseAlert = false;
      actionBtns = [];
      initGame(1);
      startCountdown();
    }, 'pause_skip_tutorial'));
```

- [ ] **Step 2: Update congrats screen replay (line 1798)**

Find:
```javascript
      if (keyCode === ENTER || key === ' ') {
        actionBtns = []; tutorialCompleted = false;
        initGame(0); startTutorial(); gameState = STATE.TUTORIAL; hideTitleVideo();
      }
```

Replace with:
```javascript
      if (keyCode === ENTER || key === ' ') {
        actionBtns = [];
        initModeSelectButtons();
        gameState = STATE.MODE_SELECT;
        hideTitleVideo();
      }
```

- [ ] **Step 3: Commit**

```bash
git add sketch.js
git commit -m "fix: update skip tutorial to start Level 2, congrats replay goes to mode select"
```

---

### Task 10: Final Integration Testing and Polish

**Files:**
- Modify: `sketch.js` — minor fixes as needed

- [ ] **Step 1: Full playthrough test — Tutorial path**

Open `index.html` in browser. Walk through complete flow:
1. Title screen → Play → Mode Select screen appears
2. Click "Tutorial"
3. Step through all 16 tutorial steps:
   - Welcome (click)
   - HP explanation (click) — HP bars highlighted
   - Water explanation (click) — water bars highlighted
   - Light explanation (click) — light bars highlighted
   - Watch drain (bars drain 3s, then click)
   - Select plant (click a plant)
   - Water (press Q) — water button highlighted
   - Light (press E) — light button highlighted
   - Airflow (press R) — airflow button highlighted
   - Panel explanation (click) — side panel highlighted
   - Wilted explanation (click) — wilted counter highlighted
   - Surge intro (click) — tension meter highlighted
   - Surge demo (watch ~4s, auto-advances)
   - Surge explanation (click)
   - Tension explanation (click) — tension meter highlighted
   - Ready (click) — starts countdown → Level 1

Verify: time never advances except during drain demo and surge demo. Plants never die.

- [ ] **Step 2: Full playthrough test — Skip to Game path**

1. Title screen → Play → Mode Select
2. Click "Play Game"
3. Verify: starts Level 2 (2x2 grid) with countdown, surges enabled

- [ ] **Step 3: Test pause menu during tutorial**

1. During tutorial, press ESC
2. Verify "Skip Tutorial" button works (goes to Level 2 countdown)
3. Verify "Resume" returns to tutorial at same step
4. Verify "Back to Main Menu" returns to title

- [ ] **Step 4: Test plant images**

Verify plant images maintain aspect ratio across all grid sizes. Resize or use different levels to confirm no stretching.

- [ ] **Step 5: Check console for errors**

Open browser dev tools. Verify no JavaScript errors in console during any game state.

- [ ] **Step 6: Commit final state**

```bash
git add sketch.js
git commit -m "feat: complete tutorial rework with guided walkthrough, mode select, image fix"
```
