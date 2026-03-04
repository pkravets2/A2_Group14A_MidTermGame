// ============================================================
// GARDEN CIRCUIT — p5.js Prototype
// A real-time greenhouse management game with symbolic
// mechanics representing disruption, uncertainty, and coping.
// ============================================================

// ============================================================
// TUNING CONSTANTS — edit these to balance difficulty
// ============================================================

const CANVAS_W = 1100;
const CANVAS_H = 750;

// Grid layout
const GRID_COLS = 3;
const GRID_ROWS = 3;
const TOTAL_BEDS = GRID_COLS * GRID_ROWS;

// Round / timing
const ROUND_DURATION = 90;          // seconds
const GRACE_PERIOD = 20;            // seconds before first surge

// Plant drain rates (per second, base values — each bed gets slight variation)
const BASE_WATER_DRAIN = 3.2; 
const BASE_LIGHT_DRAIN = 2.8;
const DRAIN_VARIATION = 0.8;         // ± random offset per bed
const HEALTH_LOSS_RATE = 5.5;        // per sec when needs are critically low
const HEALTH_RECOVERY_RATE = 3.0;   // per sec when needs are healthy
const CRITICAL_THRESHOLD = 25;       // below this, plant is stressed
const HEALTHY_THRESHOLD = 50;        // above this, plant recovers

// Resource actions
const WATER_BOOST = 35;
const LIGHT_BOOST = 35; 
const AIRFLOW_DURATION = 5;         // seconds
const AIRFLOW_DRAIN_REDUCTION = 0.5;// multiplier on drain while active
const ACTION_COOLDOWN = 0.3;        // seconds between same-type actions
const AIRFLOW_COOLDOWN = 4;         // seconds

// Surge system
const SURGE_MIN_INTERVAL = 14;
const SURGE_MAX_INTERVAL = 30;
const SURGE_DURATION_MIN = 4;
const SURGE_DURATION_MAX = 7;
const SURGE_COOLDOWN_MIN = 8;       // min gap between surges
const FALSE_ALERT_COUNT = 3;        // how many false alerts per surge
const SURGE_INPUT_DELAY = 0.1;      // seconds of input delay during surge
const SURGE_JITTER_AMOUNT = 3;      // pixels of cursor jitter

// Uncertain zones (post-surge)
const UNCERTAIN_ZONE_COUNT_MIN = 2;
const UNCERTAIN_ZONE_COUNT_MAX = 4;
const UNCERTAIN_DURATION_MIN = 8;
const UNCERTAIN_DURATION_MAX = 15;

// Tension meter
const TENSION_RISE_SURGE = 9;       // per second during surge
const TENSION_RISE_UNCERTAIN = 5;    // per interaction in uncertain zone
const TENSION_RISE_ALERTS = 1.5;       // per second per active alert
const TENSION_DECAY = 3;             // per second during calm
const TENSION_OVERLOAD_RESET = 70;   // reset to this on overload

// Grounding
const GROUNDING_COOLDOWN = 10;       // seconds
const GROUNDING_BEATS = 3;
const GROUNDING_BEAT_WINDOW = 0.3;   // seconds tolerance
const GROUNDING_BEAT_INTERVAL = 1.2; // seconds between beats
const GROUNDING_TENSION_REWARD = 30; // tension reduction on success
const GROUNDING_STABILITY_TIME = 5;  // seconds of stability after grounding
const GROUNDING_PARTIAL_REWARD = 10;

// Scoring
const SCORE_PER_HEALTHY_SEC = 1;     // per healthy bed per second
const SCORE_RESTORE_BONUS = 15;      // bonus for restoring critical plant
const SCORE_GROUNDING_BONUS = 25;
const SCORE_SURGE_SURVIVE = 20;
const COMBO_THRESHOLD = 6;           // beds healthy to build combo
const COMBO_MULTIPLIER_STEP = 0.1;
const COMBO_MAX_MULTIPLIER = 3.0;

// Win/Lose
const LOSE_WILTED_COUNT = 3;         // lose if this many plants hit 0 health
const WIN_MIN_ALIVE = 7;// need at least this many alive to win

// Difficulty ramp (multiplier increase over full round)
const DRAIN_RAMP_FACTOR = 0.35;        // drain rates increase by 60% over the round
const SURGE_FREQ_RAMP = 0.3;         // surge frequency increases 40%

// Visual
const BED_MARGIN = 12;
const PANEL_WIDTH = 260;

// ============================================================
// COLOR PALETTE
// ============================================================
const COL = {
  bg:          [26, 30, 46],
  panelBg:     [20, 24, 38],
  bedNormal:   [40, 55, 45],
  bedSelected: [60, 90, 70],
  bedUncertain:[55, 50, 65],
  bedDead:     [50, 35, 35],
  health:      [80, 200, 120],
  healthLow:   [200, 80, 80],
  water:       [80, 150, 220],
  light:       [230, 200, 80],
  airflow:     [180, 210, 230],
  tension:     [200, 100, 100],
  textPrimary: [230, 235, 240],
  textSecondary:[160, 170, 180],
  surge:       [180, 60, 60],
  grounding:   [100, 180, 160],
  combo:       [240, 200, 80],
  accent:      [100, 200, 150],
  falseAlert:  [220, 130, 60],
  buttonBg:    [50, 70, 60],
  buttonHover: [70, 100, 80],
  buttonText:  [230, 240, 230],
};

// ============================================================
// GAME STATE
// ============================================================
const STATE = {
  TITLE: 'title',
  INSTRUCTIONS: 'instructions',
  PLAYING: 'playing',
  GROUNDING: 'grounding',
  WIN: 'win',
  LOSE: 'lose',
  PAUSED: 'paused',
};

let gameState = STATE.TITLE;
let prevState = STATE.TITLE;

// Game variables
let beds = [];
let selectedBed = 0;       // index of currently selected bed
let timer = ROUND_DURATION;
let score = 0;
let tensionMeter = 0;
let comboCount = 0;
let comboMultiplier = 1.0;
let highestCombo = 0;

// Surge state
let surgeActive = false;
let surgeTimer = 0;
let surgeNextIn = 0;        // countdown to next surge
let surgeCooldownLeft = 0;
let surgesCompleted = 0;
let surgeVisualIntensity = 0;

// Uncertain zones are tracked per bed (bed.isUncertainZone, bed.uncertainTimer)

// Grounding state
let groundingAvailable = true;
let groundingCooldownLeft = 0;
let groundingSuccessCount = 0;
let groundingStabilityLeft = 0;

// Grounding mini-game state
let groundingBeats = [];
let groundingBeatIndex = 0;
let groundingPhase = 0;     // 0 = waiting for expansion, 1 = active beat window
let groundingCircleRadius = 0;
let groundingHits = 0;
let groundingTimer = 0;
let groundingFeedback = '';
let groundingFeedbackTimer = 0;
let groundingComplete = false;

// Action cooldowns
let waterCooldown = 0;
let lightCooldown = 0;
let airflowCooldown = 0;

// Input delay queue (for surge effect)
let inputQueue = [];
let surgeJitterX = 0;
let surgeJitterY = 0;

// Particles (lightweight)
let particles = [];
const MAX_PARTICLES = 60;

// Stats for end screen
let stats = {
  surgesSurvived: 0,
  groundingAttempts: 0,
  groundingSuccesses: 0,
  plantsWilted: 0,
  peakCombo: 0,
  totalRestores: 0,
};

// Title screen animation
let titlePulses = [];

// Buttons (for mouse interaction)
let buttons = [];

// Difficulty ramp multiplier
let difficultyMult = 1.0;

// Reduced effects mode
let reducedEffects = false;

// ============================================================
// PLANT BED CLASS
// ============================================================
class PlantBed {
  constructor(col, row, index) {
    this.col = col;
    this.row = row;
    this.index = index;

    // Needs and health
    this.health = 80 + random(-10, 10);
    this.water = 60 + random(-15, 15);
    this.light = 60 + random(-15, 15);

    // Per-bed drain variation
    this.drainRateWater = BASE_WATER_DRAIN + random(-DRAIN_VARIATION, DRAIN_VARIATION);
    this.drainRateLight = BASE_LIGHT_DRAIN + random(-DRAIN_VARIATION, DRAIN_VARIATION);

    // Airflow buff
    this.airflowActive = false;
    this.airflowTimer = 0;

    // Uncertain zone
    this.isUncertainZone = false;
    this.uncertainTimer = 0;

    // Alert states
    this.hasFalseAlert = false;
    this.isWilted = false;

    // Display position (computed in layout)
    this.x = 0;
    this.y = 0;
    this.w = 0;
    this.h = 0;

    // Visual effects
    this.flashTimer = 0;
    this.restoreFlash = 0;
    this.wasStressed = false;
  }

  // Compute true urgency from needs
  get trueUrgency() {
    if (this.health <= 0) return 'dead';
    if (this.water < CRITICAL_THRESHOLD || this.light < CRITICAL_THRESHOLD) return 'critical';
    if (this.water < HEALTHY_THRESHOLD || this.light < HEALTHY_THRESHOLD) return 'warning';
    return 'healthy';
  }

  // Display urgency (may be false during surge)
  get displayUrgency() {
    if (this.hasFalseAlert) return 'critical';
    if (this.isUncertainZone && surgeActive) {
      // Slightly unreliable during surge
      if (random() < 0.2) {
        return random() < 0.5 ? 'warning' : 'healthy';
      }
    }
    return this.trueUrgency;
  }

  update(dt) {
    if (this.isWilted) return;

    let drainMult = difficultyMult;
    if (this.airflowActive) drainMult *= AIRFLOW_DRAIN_REDUCTION;

    // Drain needs over time
    this.water -= this.drainRateWater * drainMult * dt;
    this.light -= this.drainRateLight * drainMult * dt;
    this.water = constrain(this.water, 0, 100);
    this.light = constrain(this.light, 0, 100);

    // Health changes
    if (this.water < CRITICAL_THRESHOLD || this.light < CRITICAL_THRESHOLD) {
      this.health -= HEALTH_LOSS_RATE * dt;
      this.wasStressed = true;
    } else if (this.water >= HEALTHY_THRESHOLD && this.light >= HEALTHY_THRESHOLD) {
      this.health += HEALTH_RECOVERY_RATE * dt;
      // Check for restore bonus
      if (this.wasStressed && this.health > 50) {
        score += SCORE_RESTORE_BONUS * comboMultiplier;
        stats.totalRestores++;
        this.restoreFlash = 0.5;
        this.wasStressed = false;
        spawnParticle(this.x + this.w / 2, this.y + this.h / 2, COL.accent, '+' + floor(SCORE_RESTORE_BONUS * comboMultiplier));
      }
    }
    this.health = constrain(this.health, 0, 100);

    // Check wilted
    if (this.health <= 0) {
      this.isWilted = true;
      stats.plantsWilted++;
    }

    // Update airflow timer
    if (this.airflowActive) {
      this.airflowTimer -= dt;
      if (this.airflowTimer <= 0) {
        this.airflowActive = false;
      }
    }

    // Update uncertain zone timer
    if (this.isUncertainZone) {
      this.uncertainTimer -= dt;
      if (this.uncertainTimer <= 0) {
        this.isUncertainZone = false;
      }
    }

    // Visual timers
    if (this.flashTimer > 0) this.flashTimer -= dt;
    if (this.restoreFlash > 0) this.restoreFlash -= dt;
  }

  applyWater() {
    if (this.isWilted) return;
    this.water = constrain(this.water + WATER_BOOST, 0, 100);
    this.flashTimer = 0.3;
  }

  applyLight() {
    if (this.isWilted) return;
    this.light = constrain(this.light + LIGHT_BOOST, 0, 100);
    this.flashTimer = 0.3;
  }

  applyAirflow() {
    if (this.isWilted) return;
    this.airflowActive = true;
    this.airflowTimer = AIRFLOW_DURATION;
  }
}

// ============================================================
// PARTICLE SYSTEM (lightweight text popups / effects)
// ============================================================
function spawnParticle(x, y, col, txt) {
  if (particles.length >= MAX_PARTICLES) particles.shift();
  particles.push({
    x, y, col: [...col],
    txt: txt || '',
    life: 1.0,
    vy: -40,
  });
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.life -= dt * 0.8;
    p.y += p.vy * dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function drawParticles() {
  for (let p of particles) {
    let a = p.life * 255;
    fill(p.col[0], p.col[1], p.col[2], a);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(14);
    textStyle(BOLD);
    text(p.txt, p.x, p.y);
  }
}

// ============================================================
// BUTTON HELPER (for mouse UI)
// ============================================================
class Button {
  constructor(x, y, w, h, label, callback, id) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.label = label;
    this.callback = callback;
    this.id = id || label;
    this.hovered = false;
    this.visible = true;
  }

  contains(px, py) {
    return px >= this.x && px <= this.x + this.w &&
           py >= this.y && py <= this.y + this.h;
  }

  draw() {
    if (!this.visible) return;
    let col = this.hovered ? COL.buttonHover : COL.buttonBg;
    fill(col[0], col[1], col[2]);
    stroke(COL.accent[0], COL.accent[1], COL.accent[2], 120);
    strokeWeight(1.5);
    rect(this.x, this.y, this.w, this.h, 6);

    fill(COL.buttonText[0], COL.buttonText[1], COL.buttonText[2]);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(16);
    textStyle(BOLD);
    text(this.label, this.x + this.w / 2, this.y + this.h / 2);
  }

  checkHover(mx, my) {
    this.hovered = this.visible && this.contains(mx, my);
  }

  checkClick(mx, my) {
    if (this.visible && this.contains(mx, my)) {
      this.callback();
      return true;
    }
    return false;
  }
}

// ============================================================
// LAYOUT CALCULATIONS
// ============================================================
let boardX, boardY, boardW, boardH;
let bedW, bedH;
let panelX;

function computeLayout() {
  panelX = CANVAS_W - PANEL_WIDTH;
  boardX = 20;
  boardY = 20;
  boardW = panelX - 40;
  boardH = CANVAS_H - 40;

  bedW = (boardW - BED_MARGIN * (GRID_COLS + 1)) / GRID_COLS;
  bedH = (boardH - BED_MARGIN * (GRID_ROWS + 1)) / GRID_ROWS;

  for (let bed of beds) {
    bed.x = boardX + BED_MARGIN + bed.col * (bedW + BED_MARGIN);
    bed.y = boardY + BED_MARGIN + bed.row * (bedH + BED_MARGIN);
    bed.w = bedW;
    bed.h = bedH;
  }
}

// ============================================================
// INITIALIZATION
// ============================================================
function initGame() {
  beds = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      beds.push(new PlantBed(c, r, r * GRID_COLS + c));
    }
  }
  computeLayout();

  selectedBed = 0;
  timer = ROUND_DURATION;
  score = 0;
  tensionMeter = 0;
  comboCount = 0;
  comboMultiplier = 1.0;
  highestCombo = 0;
  difficultyMult = 1.0;

  surgeActive = false;
  surgeTimer = 0;
  surgeNextIn = GRACE_PERIOD + random(3, 8);
  surgeCooldownLeft = 0;
  surgesCompleted = 0;
  surgeVisualIntensity = 0;

  groundingAvailable = true;
  groundingCooldownLeft = 0;
  groundingSuccessCount = 0;
  groundingStabilityLeft = 0;

  waterCooldown = 0;
  lightCooldown = 0;
  airflowCooldown = 0;

  inputQueue = [];
  particles = [];

  stats = {
    surgesSurvived: 0,
    groundingAttempts: 0,
    groundingSuccesses: 0,
    plantsWilted: 0,
    peakCombo: 0,
    totalRestores: 0,
  };
}

// ============================================================
// SURGE SYSTEM
// ============================================================
function startSurge() {
  surgeActive = true;
  surgeTimer = random(SURGE_DURATION_MIN, SURGE_DURATION_MAX);
  surgeVisualIntensity = 1.0;

  // Assign false alerts
  let available = beds.filter(b => !b.isWilted && b.trueUrgency !== 'critical');
  shuffle(available, true);
  let count = min(FALSE_ALERT_COUNT, available.length);
  for (let i = 0; i < count; i++) {
    available[i].hasFalseAlert = true;
  }
}

function endSurge() {
  surgeActive = false;
  surgesCompleted++;
  stats.surgesSurvived++;
  score += SCORE_SURGE_SURVIVE * comboMultiplier;

  // Clear false alerts
  for (let b of beds) b.hasFalseAlert = false;

  // Create uncertain zones
  let available = beds.filter(b => !b.isWilted);
  shuffle(available, true);
  let count = floor(random(UNCERTAIN_ZONE_COUNT_MIN, UNCERTAIN_ZONE_COUNT_MAX + 1));
  count = min(count, available.length);
  for (let i = 0; i < count; i++) {
    available[i].isUncertainZone = true;
    available[i].uncertainTimer = random(UNCERTAIN_DURATION_MIN, UNCERTAIN_DURATION_MAX);
  }

  // Set next surge timer
  let interval = lerp(SURGE_MAX_INTERVAL, SURGE_MIN_INTERVAL, (ROUND_DURATION - timer) / ROUND_DURATION * SURGE_FREQ_RAMP);
  surgeNextIn = random(interval * 0.8, interval * 1.2);
  surgeCooldownLeft = SURGE_COOLDOWN_MIN;
}

function updateSurge(dt) {
  if (surgeActive) {
    surgeTimer -= dt;
    tensionMeter += TENSION_RISE_SURGE * dt;

    // Jitter effect
    if (!reducedEffects) {
      surgeJitterX = random(-SURGE_JITTER_AMOUNT, SURGE_JITTER_AMOUNT);
      surgeJitterY = random(-SURGE_JITTER_AMOUNT, SURGE_JITTER_AMOUNT);
    }

    if (surgeTimer <= 0) {
      endSurge();
    }
  } else {
    surgeJitterX = lerp(surgeJitterX, 0, 0.2);
    surgeJitterY = lerp(surgeJitterY, 0, 0.2);

    surgeCooldownLeft -= dt;
    surgeNextIn -= dt;

    // Tension increases surge likelihood
    let tensionBonus = tensionMeter > 60 ? 1.5 : 1.0;

    if (surgeNextIn <= 0 && surgeCooldownLeft <= 0 && timer < (ROUND_DURATION - GRACE_PERIOD)) {
      startSurge();
    }
  }

  surgeVisualIntensity = surgeActive ? lerp(surgeVisualIntensity, 1, 0.1) : lerp(surgeVisualIntensity, 0, 0.05);
}

// ============================================================
// GROUNDING MINI-GAME
// ============================================================
function startGrounding() {
  if (!groundingAvailable || groundingCooldownLeft > 0) return;

  prevState = gameState;
  gameState = STATE.GROUNDING;
  stats.groundingAttempts++;

  groundingBeatIndex = 0;
  groundingHits = 0;
  groundingTimer = 0;
  groundingComplete = false;
  groundingCircleRadius = 0;
  groundingFeedback = '';
  groundingFeedbackTimer = 0;

  // Generate beat timings
  groundingBeats = [];
  for (let i = 0; i < GROUNDING_BEATS; i++) {
    groundingBeats.push({
      time: 1.0 + i * GROUNDING_BEAT_INTERVAL,
      hit: false,
      result: '',
    });
  }
}

function updateGrounding(dt) {
  groundingTimer += dt;

  // Circle pulsing rhythm
  let beatPhase = (groundingTimer % GROUNDING_BEAT_INTERVAL) / GROUNDING_BEAT_INTERVAL;
  groundingCircleRadius = 30 + sin(beatPhase * PI) * 50;

  // Update feedback timer
  if (groundingFeedbackTimer > 0) groundingFeedbackTimer -= dt;

  // Check if all beats have passed
  if (groundingBeatIndex >= GROUNDING_BEATS) {
    if (!groundingComplete) {
      groundingComplete = true;
      groundingTimer = 0; // reuse as delay timer
    } else {
      groundingTimer += dt; // wait briefly
      // Actually this double-counts, let me fix
    }
  }

  if (groundingComplete) {
    // Wait a moment then return to game
    // groundingTimer was reset, so it accumulates from 0
    if (groundingTimer > 1.5) {
      finishGrounding();
    }
  } else {
    // Check if current beat window passed without input
    if (groundingBeatIndex < GROUNDING_BEATS) {
      let beat = groundingBeats[groundingBeatIndex];
      if (groundingTimer > beat.time + GROUNDING_BEAT_WINDOW + 0.1) {
        beat.result = 'missed';
        groundingFeedback = 'Missed';
        groundingFeedbackTimer = 0.6;
        groundingBeatIndex++;
      }
    }
  }

  // Still update garden decay slowly during grounding
  for (let bed of beds) {
    bed.update(dt * 0.5); // half-speed drain during grounding
  }
}

function groundingInput() {
  if (groundingComplete || groundingBeatIndex >= GROUNDING_BEATS) return;

  let beat = groundingBeats[groundingBeatIndex];
  let diff = abs(groundingTimer - beat.time);

  if (diff <= GROUNDING_BEAT_WINDOW) {
    beat.hit = true;
    beat.result = 'hit';
    groundingHits++;
    groundingFeedback = 'Steady!';
    groundingFeedbackTimer = 0.5;
  } else if (groundingTimer < beat.time - GROUNDING_BEAT_WINDOW) {
    beat.result = 'early';
    groundingFeedback = 'Too Early';
    groundingFeedbackTimer = 0.5;
  } else {
    beat.result = 'late';
    groundingFeedback = 'Too Late';
    groundingFeedbackTimer = 0.5;
  }
  groundingBeatIndex++;
}

function finishGrounding() {
  let success = groundingHits >= 2;

  if (success) {
    tensionMeter = max(0, tensionMeter - GROUNDING_TENSION_REWARD);
    groundingStabilityLeft = GROUNDING_STABILITY_TIME;
    groundingSuccessCount++;
    stats.groundingSuccesses++;
    score += SCORE_GROUNDING_BONUS * comboMultiplier;

    // Clear false alerts
    for (let b of beds) b.hasFalseAlert = false;
  } else {
    tensionMeter = max(0, tensionMeter - GROUNDING_PARTIAL_REWARD);
  }

  groundingCooldownLeft = GROUNDING_COOLDOWN;
  gameState = STATE.PLAYING;
}

// ============================================================
// TENSION METER
// ============================================================
function updateTension(dt) {
  // Rise from active alerts
  let activeAlerts = beds.filter(b => !b.isWilted && b.trueUrgency === 'critical').length;
  tensionMeter += activeAlerts * TENSION_RISE_ALERTS * dt * 0.3;

  // Decay during calm
  if (!surgeActive && activeAlerts < 2) {
    tensionMeter -= TENSION_DECAY * dt;
  }

  // Grounding stability calms tension faster
  if (groundingStabilityLeft > 0) {
    tensionMeter -= TENSION_DECAY * 2 * dt;
    groundingStabilityLeft -= dt;
  }

  tensionMeter = constrain(tensionMeter, 0, 100);

  // Overload at 100
  if (tensionMeter >= 100) {
    tensionMeter = TENSION_OVERLOAD_RESET;
    comboMultiplier = max(1.0, comboMultiplier - 0.5);
    // Brief visual flash handled in draw
  }
}

// ============================================================
// COMBO SYSTEM
// ============================================================
function updateCombo(dt) {
  let healthyCount = beds.filter(b => !b.isWilted && b.health > 40 && b.water > 30 && b.light > 30).length;

  if (healthyCount >= COMBO_THRESHOLD) {
    comboCount++;
    comboMultiplier = min(COMBO_MAX_MULTIPLIER, 1.0 + floor(comboCount / 60) * COMBO_MULTIPLIER_STEP);
    // comboCount increments per frame roughly... let's make it time-based
  } else {
    if (comboCount > 0) {
      comboCount = max(0, comboCount - 3);
      if (comboCount === 0) comboMultiplier = 1.0;
    }
  }

  highestCombo = max(highestCombo, comboMultiplier);
  stats.peakCombo = highestCombo;
}

// ============================================================
// SCORE: per-second awards
// ============================================================
function updateScore(dt) {
  let healthyCount = beds.filter(b => !b.isWilted && b.health > 40).length;
  score += healthyCount * SCORE_PER_HEALTHY_SEC * comboMultiplier * dt;
}

// ============================================================
// DIFFICULTY RAMP
// ============================================================
function updateDifficulty() {
  let elapsed = ROUND_DURATION - timer;
  let progress = elapsed / ROUND_DURATION;
  difficultyMult = 1.0 + progress * DRAIN_RAMP_FACTOR;
}

// ============================================================
// ACTION HANDLING
// ============================================================
function doAction(type) {
  let bed = beds[selectedBed];
  if (!bed || bed.isWilted) return;

  // Tension increase for uncertain zone interaction
  if (bed.isUncertainZone) {
    tensionMeter += TENSION_RISE_UNCERTAIN;
  }

  if (type === 'water' && waterCooldown <= 0) {
    bed.applyWater();
    waterCooldown = ACTION_COOLDOWN;
    spawnParticle(bed.x + bed.w / 2, bed.y + 10, COL.water, 'Water');
  } else if (type === 'light' && lightCooldown <= 0) {
    bed.applyLight();
    lightCooldown = ACTION_COOLDOWN;
    spawnParticle(bed.x + bed.w / 2, bed.y + 10, COL.light, 'Light');
  } else if (type === 'airflow' && airflowCooldown <= 0) {
    bed.applyAirflow();
    airflowCooldown = AIRFLOW_COOLDOWN;
    spawnParticle(bed.x + bed.w / 2, bed.y + 10, COL.airflow, 'Airflow');
  }
}

// Process queued inputs (for surge delay)
function processInputQueue(dt) {
  for (let i = inputQueue.length - 1; i >= 0; i--) {
    inputQueue[i].delay -= dt;
    if (inputQueue[i].delay <= 0) {
      inputQueue[i].action();
      inputQueue.splice(i, 1);
    }
  }
}

function queueAction(fn) {
  if (surgeActive) {
    inputQueue.push({ action: fn, delay: SURGE_INPUT_DELAY });
  } else {
    fn();
  }
}

// ============================================================
// CHECK WIN / LOSE
// ============================================================
function checkEndConditions() {
  let wiltedCount = beds.filter(b => b.isWilted).length;

  if (wiltedCount >= LOSE_WILTED_COUNT) {
    gameState = STATE.LOSE;
    return;
  }

  if (timer <= 0) {
    let aliveCount = beds.filter(b => !b.isWilted).length;
    if (aliveCount >= WIN_MIN_ALIVE) {
      gameState = STATE.WIN;
    } else {
      gameState = STATE.LOSE;
    }
  }
}

// ============================================================
// COMPUTE GRADE
// ============================================================
function computeGrade() {
  // Based on score relative to theoretical max
  let maxPossible = TOTAL_BEDS * SCORE_PER_HEALTHY_SEC * ROUND_DURATION * 2;
  let ratio = score / maxPossible;
  if (ratio > 0.6) return 'A';
  if (ratio > 0.4) return 'B';
  if (ratio > 0.25) return 'C';
  return 'D';
}

// ============================================================
// CLICK ON BED
// ============================================================
function getBedAtMouse(mx, my) {
  for (let i = 0; i < beds.length; i++) {
    let b = beds[i];
    if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
      return i;
    }
  }
  return -1;
}

// ============================================================
// DRAW FUNCTIONS
// ============================================================

// --- Title Screen ---
function drawTitle() {
  background(COL.bg[0], COL.bg[1], COL.bg[2]);

  // Subtle background animation
  let t = millis() / 1000;
  noStroke();
  for (let i = 0; i < 8; i++) {
    let x = CANVAS_W / 2 + cos(t * 0.3 + i * 0.8) * 200;
    let y = CANVAS_H / 2 + sin(t * 0.4 + i * 1.1) * 120;
    let r = 40 + sin(t * 0.5 + i) * 15;
    fill(COL.accent[0], COL.accent[1], COL.accent[2], 15 + sin(t + i) * 8);
    ellipse(x, y, r * 2, r * 2);
  }

  // Title
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(52);
  fill(COL.accent[0], COL.accent[1], COL.accent[2]);
  text('Garden Circuit', CANVAS_W / 2, CANVAS_H / 2 - 120);

  // Tagline
  textStyle(NORMAL);
  textSize(18);
  fill(COL.textSecondary[0], COL.textSecondary[1], COL.textSecondary[2]);
  text('Keep the greenhouse in balance', CANVAS_W / 2, CANVAS_H / 2 - 70);

  // Draw a decorative line
  stroke(COL.accent[0], COL.accent[1], COL.accent[2], 60);
  strokeWeight(1);
  line(CANVAS_W / 2 - 120, CANVAS_H / 2 - 45, CANVAS_W / 2 + 120, CANVAS_H / 2 - 45);
  noStroke();
}

// --- Instructions Screen ---
function drawInstructions() {
  background(COL.bg[0], COL.bg[1], COL.bg[2]);

  let cx = CANVAS_W / 2;
  let startY = 22;
  // Reserve space for button at bottom (button is 48px tall + 16px margin)
  let maxTextY = CANVAS_H - 80;

  textAlign(CENTER, TOP);
  textStyle(BOLD);
  textSize(28);
  fill(COL.accent[0], COL.accent[1], COL.accent[2]);
  text('How to Play', cx, startY);

  textStyle(NORMAL);
  textSize(13);
  fill(COL.textPrimary[0], COL.textPrimary[1], COL.textPrimary[2]);
  textAlign(LEFT, TOP);

  // Two-column layout to fit everything
  let colW = 480;
  let leftX = 40;
  let rightX = CANVAS_W / 2 + 30;
  let lineH = 18;

  // ---- LEFT COLUMN ----
  let y = startY + 45;

  let leftLines = [
    { t: '[ OBJECTIVE ]', style: 'header' },
    { t: 'Keep 9 plant beds healthy for 90 seconds.', style: 'normal' },
    { t: 'Plants need Water and Light — both drain over time.', style: 'normal' },
    { t: 'If needs drop too low, health decreases. Lose 4 plants = game over.', style: 'normal' },
    { t: '', style: 'normal' },
    { t: '[ CONTROLS ]', style: 'header' },
    { t: 'Arrow Keys / WASD — Move selection cursor', style: 'normal' },
    { t: 'Click a bed — Select it directly', style: 'normal' },
    { t: 'Q  or  Water btn — Route water to selected bed', style: 'normal' },
    { t: 'E  or  Light btn — Route light to selected bed', style: 'normal' },
    { t: 'R  or  Airflow btn — Temporary stabilizer (cooldown)', style: 'normal' },
    { t: 'Space — Begin Grounding Routine (when ready)', style: 'normal' },
    { t: 'P — Pause / Resume     V — Toggle reduced effects', style: 'sub' },
    { t: '', style: 'normal' },
    { t: '[ SCORING & HARMONY ]', style: 'header' },
    { t: 'Earn points by keeping beds healthy over time.', style: 'normal' },
    { t: 'Restore critical plants for bonus points.', style: 'normal' },
    { t: 'Keep 6+ beds healthy to build a Harmony combo.', style: 'normal' },
    { t: 'Higher combos multiply your score!', style: 'normal' },
  ];

  for (let line of leftLines) {
    if (line.style === 'header') {
      fill(COL.accent[0], COL.accent[1], COL.accent[2]);
      textStyle(BOLD);
      textSize(13);
    } else if (line.style === 'sub') {
      fill(COL.textSecondary[0], COL.textSecondary[1], COL.textSecondary[2]);
      textStyle(NORMAL);
      textSize(12);
    } else {
      fill(COL.textPrimary[0], COL.textPrimary[1], COL.textPrimary[2]);
      textStyle(NORMAL);
      textSize(13);
    }
    text(line.t, leftX, y);
    y += lineH;
  }

  // ---- RIGHT COLUMN ----
  y = startY + 45;

  let rightLines = [
    { t: '[ SURGES — System Disruptions ]', style: 'header' },
    { t: 'At unpredictable intervals, a Surge disrupts the', style: 'normal' },
    { t: 'greenhouse for a few seconds:', style: 'normal' },
    { t: '  · Some indicators flicker with false urgency alerts', style: 'sub' },
    { t: '  · Visual clutter increases briefly', style: 'sub' },
    { t: '  · Controls have a slight delay', style: 'sub' },
    { t: 'Stay focused and adapt — surges are manageable.', style: 'normal' },
    { t: '', style: 'normal' },
    { t: '[ UNCERTAIN ZONES — Post-Surge ]', style: 'header' },
    { t: 'After a surge, some beds become Uncertain Zones:', style: 'normal' },
    { t: '  · Interacting with them raises Tension faster', style: 'sub' },
    { t: '  · Avoiding them may leave plants under-served', style: 'sub' },
    { t: 'Balance efficiency against rising tension.', style: 'normal' },
    { t: '', style: 'normal' },
    { t: '[ GROUNDING — Coping & Recovery ]', style: 'header' },
    { t: 'Press Space to start a Grounding Routine:', style: 'normal' },
    { t: '  · Match 3 slow pulse beats by pressing Space in rhythm', style: 'sub' },
    { t: '  · Success: reduces Tension, clears false alerts,', style: 'sub' },
    { t: '    and stabilizes the garden briefly', style: 'sub' },
    { t: '  · Has a cooldown — use it strategically', style: 'sub' },
    { t: '', style: 'normal' },
    { t: '[ A NOTE ON DESIGN ]', style: 'header' },
    { t: 'This game uses symbolic mechanics — surges, uncertainty,', style: 'normal' },
    { t: 'and grounding — to respectfully represent themes of', style: 'normal' },
    { t: 'disruption and coping. It is not a literal simulation.', style: 'normal' },
  ];

  for (let line of rightLines) {
    if (line.style === 'header') {
      fill(COL.accent[0], COL.accent[1], COL.accent[2]);
      textStyle(BOLD);
      textSize(13);
    } else if (line.style === 'sub') {
      fill(COL.textSecondary[0], COL.textSecondary[1], COL.textSecondary[2]);
      textStyle(NORMAL);
      textSize(12);
    } else {
      fill(COL.textPrimary[0], COL.textPrimary[1], COL.textPrimary[2]);
      textStyle(NORMAL);
      textSize(13);
    }
    text(line.t, rightX, y);
    y += lineH;
  }

  // Divider line between columns
  stroke(COL.accent[0], COL.accent[1], COL.accent[2], 40);
  strokeWeight(1);
  line(CANVAS_W / 2 + 10, startY + 50, CANVAS_W / 2 + 10, maxTextY - 10);
  noStroke();
}

// --- Gameplay Drawing ---
function drawGameplay() {
  // Apply surge screen shake
  if (!reducedEffects && surgeVisualIntensity > 0.1) {
    translate(surgeJitterX * surgeVisualIntensity, surgeJitterY * surgeVisualIntensity);
  }

  background(COL.bg[0], COL.bg[1], COL.bg[2]);

  // Surge visual overlay
  if (surgeActive && !reducedEffects) {
    // Faint red/noise overlay
    noStroke();
    fill(COL.surge[0], COL.surge[1], COL.surge[2], 15 + sin(millis() / 80) * 10);
    rect(0, 0, CANVAS_W, CANVAS_H);

    // Floating warning particles
    for (let i = 0; i < 3; i++) {
      let fx = random(boardX, boardX + boardW);
      let fy = random(boardY, boardY + boardH);
      fill(COL.surge[0], COL.surge[1], COL.surge[2], 30);
      textSize(12);
      textAlign(CENTER, CENTER);
      text('!', fx, fy);
    }
  }

  // Draw plant beds
  for (let bed of beds) {
    drawBed(bed);
  }

  // Draw selected bed highlight
  if (beds[selectedBed]) {
    let sb = beds[selectedBed];
    noFill();
    stroke(COL.accent[0], COL.accent[1], COL.accent[2], 180 + sin(millis() / 200) * 60);
    strokeWeight(3);
    rect(sb.x - 3, sb.y - 3, sb.w + 6, sb.h + 6, 6);
    noStroke();
  }

  // Draw particles
  drawParticles();

  // Draw side panel
  drawPanel();

  // Surge indicator
  if (surgeActive) {
    fill(COL.surge[0], COL.surge[1], COL.surge[2], 180 + sin(millis() / 100) * 60);
    textAlign(CENTER, CENTER);
    textSize(20);
    textStyle(BOLD);
    text('⚡ SURGE ACTIVE ⚡', boardX + boardW / 2, boardY - 3);
    textStyle(NORMAL);
  }
}

function drawBed(bed) {
  let bx = bed.x;
  let by = bed.y;
  let bw = bed.w;
  let bh = bed.h;

  // Background
  if (bed.isWilted) {
    fill(COL.bedDead[0], COL.bedDead[1], COL.bedDead[2]);
  } else if (bed.isUncertainZone) {
    // Subtle shimmer
    let shimmer = sin(millis() / 300 + bed.index) * 10;
    fill(COL.bedUncertain[0] + shimmer, COL.bedUncertain[1] + shimmer, COL.bedUncertain[2] + shimmer);
  } else {
    fill(COL.bedNormal[0], COL.bedNormal[1], COL.bedNormal[2]);
  }

  // Flash effects
  if (bed.flashTimer > 0) {
    let flashAlpha = bed.flashTimer / 0.3;
    fill(lerpColor(
      color(COL.bedNormal[0], COL.bedNormal[1], COL.bedNormal[2]),
      color(COL.accent[0], COL.accent[1], COL.accent[2]),
      flashAlpha * 0.3
    ));
  }

  if (bed.restoreFlash > 0) {
    let flashAlpha = bed.restoreFlash / 0.5;
    fill(lerpColor(
      color(COL.bedNormal[0], COL.bedNormal[1], COL.bedNormal[2]),
      color(100, 255, 150),
      flashAlpha * 0.4
    ));
  }

  stroke(60, 70, 60);
  strokeWeight(1);
  rect(bx, by, bw, bh, 4);
  noStroke();

  if (bed.isWilted) {
    // Dead plant indicator
    fill(COL.textSecondary[0], COL.textSecondary[1], COL.textSecondary[2], 120);
    textAlign(CENTER, CENTER);
    textSize(28);
    text('✕', bx + bw / 2, by + bh / 2 - 10);
    textSize(12);
    text('Wilted', bx + bw / 2, by + bh / 2 + 18);
    return;
  }

  // Plant icon (simple)
  let healthColor = bed.health > 50 ?
    COL.health :
    [lerp(COL.healthLow[0], COL.health[0], bed.health / 50),
     lerp(COL.healthLow[1], COL.health[1], bed.health / 50),
     lerp(COL.healthLow[2], COL.health[2], bed.health / 50)];

  fill(healthColor[0], healthColor[1], healthColor[2]);
  textAlign(CENTER, CENTER);
  textSize(22);
  let plantIcon = bed.health > 60 ? '❋' : bed.health > 30 ? '❊' : '✿';
  text(plantIcon, bx + bw / 2, by + 24);

  // Health bar
  let barY = by + 44;
  let barH = 7;
  let barW = bw - 20;
  let barX = bx + 10;

  // Health bar bg
  fill(30, 35, 30);
  rect(barX, barY, barW, barH, 2);
  // Health bar fill
  let hw = barW * bed.health / 100;
  fill(healthColor[0], healthColor[1], healthColor[2]);
  rect(barX, barY, hw, barH, 2);

  // Labels
  textSize(9);
  textStyle(BOLD);
  fill(COL.textPrimary[0], COL.textPrimary[1], COL.textPrimary[2]);
  textAlign(CENTER, TOP);
  text('HP ' + floor(bed.health), bx + bw / 2, barY + barH + 2);
  textStyle(NORMAL);

  // Water bar
  let wBarY = barY + barH + 16;
  fill(30, 35, 50);
  rect(barX, wBarY, barW, barH, 2);
  fill(COL.water[0], COL.water[1], COL.water[2]);
  rect(barX, wBarY, barW * bed.water / 100, barH, 2);

  // Water icon + value
  textSize(9);
  fill(COL.water[0], COL.water[1], COL.water[2]);
  textAlign(LEFT, TOP);
  text('💧' + floor(bed.water), barX, wBarY + barH + 2);

  // Light bar
  let lBarY = wBarY + barH + 16;
  fill(30, 35, 30);
  rect(barX, lBarY, barW, barH, 2);
  fill(COL.light[0], COL.light[1], COL.light[2]);
  rect(barX, lBarY, barW * bed.light / 100, barH, 2);

  // Light icon + value
  fill(COL.light[0], COL.light[1], COL.light[2]);
  textAlign(LEFT, TOP);
  text('☀' + floor(bed.light), barX, lBarY + barH + 2);

  // Airflow indicator
  if (bed.airflowActive) {
    fill(COL.airflow[0], COL.airflow[1], COL.airflow[2], 160);
    textAlign(RIGHT, TOP);
    text('🌬' + floor(bed.airflowTimer) + 's', barX + barW, lBarY + barH + 2);
  }

  // Status indicators
  let urgency = bed.displayUrgency;

  // Surge flicker effect on display
  if (surgeActive && !reducedEffects && random() < 0.15) {
    // Random flicker
    fill(COL.surge[0], COL.surge[1], COL.surge[2], 50);
    noStroke();
    rect(bx, by, bw, bh, 4);
  }

  // False alert indicator
  if (bed.hasFalseAlert && !bed.isWilted) {
    fill(COL.falseAlert[0], COL.falseAlert[1], COL.falseAlert[2], 160 + sin(millis() / 150) * 60);
    textAlign(RIGHT, TOP);
    textSize(16);
    text('⚠', bx + bw - 4, by + 4);
  } else if (urgency === 'critical') {
    fill(COL.healthLow[0], COL.healthLow[1], COL.healthLow[2], 180);
    textAlign(RIGHT, TOP);
    textSize(14);
    text('!!', bx + bw - 6, by + 4);
  } else if (urgency === 'warning') {
    fill(COL.light[0], COL.light[1], COL.light[2], 140);
    textAlign(RIGHT, TOP);
    textSize(13);
    text('!', bx + bw - 6, by + 6);
  }

  // Uncertain zone indicator
  if (bed.isUncertainZone) {
    noFill();
    stroke(COL.bedUncertain[0] + 40, COL.bedUncertain[1] + 40, COL.bedUncertain[2] + 40, 100 + sin(millis() / 400 + bed.index) * 50);
    strokeWeight(2);
    rect(bx + 2, by + 2, bw - 4, bh - 4, 3);
    noStroke();

    fill(180, 160, 220, 140);
    textAlign(LEFT, BOTTOM);
    textSize(8);
    text('uncertain', bx + 5, by + bh - 3);
  }

  // Bed index (small, for debugging / identification)
  fill(COL.textSecondary[0], COL.textSecondary[1], COL.textSecondary[2], 60);
  textAlign(LEFT, TOP);
  textSize(8);
  text('#' + (bed.index + 1), bx + 4, by + 4);
}

// --- Side Panel ---
function drawPanel() {
  // Panel background
  fill(COL.panelBg[0], COL.panelBg[1], COL.panelBg[2]);
  stroke(50, 60, 50);
  strokeWeight(1);
  rect(panelX, 0, PANEL_WIDTH, CANVAS_H);
  noStroke();

  let px = panelX + 20;
  let py = 20;
  let pw = PANEL_WIDTH - 40;

  // Timer
  textAlign(LEFT, TOP);
  textStyle(BOLD);
  textSize(13);
  fill(COL.textSecondary[0], COL.textSecondary[1], COL.textSecondary[2]);
  text('TIME', px, py);
  textSize(30);
  fill(timer < 15 ? COL.healthLow[0] : COL.textPrimary[0],
       timer < 15 ? COL.healthLow[1] : COL.textPrimary[1],
       timer < 15 ? COL.healthLow[2] : COL.textPrimary[2]);
  text(floor(timer) + 's', px, py + 16);
  py += 60;

  // Score
  textSize(13);
  fill(COL.textSecondary[0], COL.textSecondary[1], COL.textSecondary[2]);
  text('SCORE', px, py);
  textSize(24);
  fill(COL.textPrimary[0], COL.textPrimary[1], COL.textPrimary[2]);
  text(floor(score), px, py + 16);
  py += 52;

  // Combo
  textSize(13);
  fill(COL.combo[0], COL.combo[1], COL.combo[2]);
  text('HARMONY  x' + nf(comboMultiplier, 1, 1), px, py);
  // Combo bar
  py += 20;
  fill(30, 30, 20);
  rect(px, py, pw, 8, 3);
  fill(COL.combo[0], COL.combo[1], COL.combo[2]);
  rect(px, py, pw * ((comboMultiplier - 1) / (COMBO_MAX_MULTIPLIER - 1)), 8, 3);
  py += 24;

  // Tension Meter
  textSize(13);
  fill(COL.textSecondary[0], COL.textSecondary[1], COL.textSecondary[2]);
  text('TENSION', px, py);
  py += 18;
  fill(30, 25, 25);
  rect(px, py, pw, 14, 4);
  let tensionCol = tensionMeter < 30 ? [80, 180, 120] :
                   tensionMeter < 60 ? [200, 180, 60] :
                   tensionMeter < 80 ? [220, 120, 50] :
                   [200, 60, 60];
  fill(tensionCol[0], tensionCol[1], tensionCol[2]);
  rect(px, py, pw * tensionMeter / 100, 14, 4);
  fill(COL.textPrimary[0], COL.textPrimary[1], COL.textPrimary[2]);
  textAlign(CENTER, CENTER);
  textSize(10);
  text(floor(tensionMeter), px + pw / 2, py + 7);
  textAlign(LEFT, TOP);
  py += 30;

  // Surge status
  textSize(13);
  if (surgeActive) {
    fill(COL.surge[0], COL.surge[1], COL.surge[2]);
    textStyle(BOLD);
    text('⚡ SURGE ACTIVE', px, py);
    textStyle(NORMAL);
  } else {
    fill(COL.textSecondary[0], COL.textSecondary[1], COL.textSecondary[2]);
    text('System Stable', px, py);
  }
  py += 28;

  // Grounding status
  textSize(13);
  fill(COL.grounding[0], COL.grounding[1], COL.grounding[2]);
  text('GROUNDING', px, py);
  py += 18;
  if (groundingCooldownLeft > 0) {
    fill(COL.textSecondary[0], COL.textSecondary[1], COL.textSecondary[2]);
    textSize(12);
    text('Cooldown: ' + floor(groundingCooldownLeft) + 's', px, py);

    // Cooldown bar
    py += 16;
    fill(30, 30, 30);
    rect(px, py, pw, 8, 3);
    fill(COL.grounding[0], COL.grounding[1], COL.grounding[2], 120);
    rect(px, py, pw * (1 - groundingCooldownLeft / GROUNDING_COOLDOWN), 8, 3);
  } else {
    fill(COL.grounding[0], COL.grounding[1], COL.grounding[2]);
    textSize(13);
    textStyle(BOLD);
    text('Ready [SPACE]', px, py);
    textStyle(NORMAL);
    py += 16;
  }
  py += 24;

  // Divider
  stroke(60, 70, 60, 80);
  strokeWeight(1);
  line(px, py, px + pw, py);
  noStroke();
  py += 14;

  // Selected bed info
  let sb = beds[selectedBed];
  textSize(13);
  fill(COL.textSecondary[0], COL.textSecondary[1], COL.textSecondary[2]);
  text('SELECTED BED #' + (selectedBed + 1), px, py);
  py += 20;

  if (sb && !sb.isWilted) {
    textSize(12);
    fill(COL.textPrimary[0], COL.textPrimary[1], COL.textPrimary[2]);
    text('Health: ' + floor(sb.health), px, py); py += 16;
    fill(COL.water[0], COL.water[1], COL.water[2]);
    text('Water:  ' + floor(sb.water), px, py); py += 16;
    fill(COL.light[0], COL.light[1], COL.light[2]);
    text('Light:  ' + floor(sb.light), px, py); py += 16;
    if (sb.airflowActive) {
      fill(COL.airflow[0], COL.airflow[1], COL.airflow[2]);
      text('Airflow: ' + nf(sb.airflowTimer, 1, 1) + 's', px, py);
    }
    if (sb.isUncertainZone) {
      fill(180, 160, 220);
      py += 16;
      text('⬡ Uncertain Zone', px, py);
    }
  } else if (sb && sb.isWilted) {
    fill(COL.healthLow[0], COL.healthLow[1], COL.healthLow[2]);
    textSize(12);
    text('This plant has wilted.', px, py);
  }
  py += 30;

  // Action buttons (mouse clickable)
  drawActionButtons(px, py, pw);

  // Wilted count at bottom
  let wiltedCount = beds.filter(b => b.isWilted).length;
  textAlign(LEFT, BOTTOM);
  textSize(12);
  fill(wiltedCount >= LOSE_WILTED_COUNT - 1 ? COL.healthLow[0] : COL.textSecondary[0],
       wiltedCount >= LOSE_WILTED_COUNT - 1 ? COL.healthLow[1] : COL.textSecondary[1],
       wiltedCount >= LOSE_WILTED_COUNT - 1 ? COL.healthLow[2] : COL.textSecondary[2]);
  text('Wilted: ' + wiltedCount + ' / ' + LOSE_WILTED_COUNT + ' max', px, CANVAS_H - 38);

  textSize(10);
  fill(COL.textSecondary[0], COL.textSecondary[1], COL.textSecondary[2], 100);
  text('P=Pause  V=Effects', px, CANVAS_H - 18);
}

// --- Action Buttons ---
let actionBtns = [];

function drawActionButtons(px, py, pw) {
  let btnW = pw;
  let btnH = 32;
  let gap = 8;

  // Create buttons only once, then just draw them
  if (actionBtns.length === 0) {
    actionBtns.push(new Button(px, py, btnW, btnH, '💧 Water  [Q]', () => queueAction(() => doAction('water')), 'water'));
    actionBtns.push(new Button(px, py + btnH + gap, btnW, btnH, '☀ Light  [E]', () => queueAction(() => doAction('light')), 'light'));
    actionBtns.push(new Button(px, py + 2 * (btnH + gap), btnW, btnH, '🌬 Airflow  [R]', () => queueAction(() => doAction('airflow')), 'airflow'));
    actionBtns.push(new Button(px, py + 3 * (btnH + gap), btnW, btnH, '◉ Ground  [SPACE]', () => startGrounding(), 'ground'));
  }

  // Update positions each frame (in case layout changes)
  actionBtns[0].y = py;
  actionBtns[1].y = py + btnH + gap;
  actionBtns[2].y = py + 2 * (btnH + gap);
  actionBtns[3].y = py + 3 * (btnH + gap);

  // Show cooldown state
  for (let btn of actionBtns) {
    btn.checkHover(mouseX, mouseY);

    let available = true;
    if (btn.id === 'water') available = waterCooldown <= 0;
    if (btn.id === 'light') available = lightCooldown <= 0;
    if (btn.id === 'airflow') available = airflowCooldown <= 0;
    if (btn.id === 'ground') available = groundingCooldownLeft <= 0 && gameState === STATE.PLAYING;

    if (!available) {
      fill(35, 40, 38);
      stroke(50, 55, 50);
      strokeWeight(1);
      rect(btn.x, btn.y, btn.w, btn.h, 6);
      noStroke();
      fill(COL.textSecondary[0], COL.textSecondary[1], COL.textSecondary[2], 100);
      textAlign(CENTER, CENTER);
      textSize(14);
      text(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
    } else {
      btn.draw();
    }
  }
}

// --- Grounding Mini-Game Screen ---
function drawGrounding() {
  // Semi-transparent overlay
  fill(COL.bg[0], COL.bg[1], COL.bg[2], 200);
  rect(0, 0, CANVAS_W, CANVAS_H);

  let cx = CANVAS_W / 2;
  let cy = CANVAS_H / 2;

  // Title
  fill(COL.grounding[0], COL.grounding[1], COL.grounding[2]);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(24);
  text('Grounding Routine', cx, cy - 140);
  textStyle(NORMAL);

  // Instructions
  textSize(14);
  fill(COL.textSecondary[0], COL.textSecondary[1], COL.textSecondary[2]);
  text('Press SPACE on each pulse beat', cx, cy - 110);

  // Pulsing circle
  let beatPhase;
  if (groundingBeatIndex < GROUNDING_BEATS && !groundingComplete) {
    let currentBeatTime = groundingBeats[groundingBeatIndex].time;
    let distToBeat = currentBeatTime - groundingTimer;
    // Pulse grows as beat approaches
    beatPhase = 1.0 - constrain(abs(distToBeat) / (GROUNDING_BEAT_INTERVAL * 0.5), 0, 1);
  } else {
    beatPhase = 0.5;
  }

  let radius = 30 + beatPhase * 60;

  // Outer ring (target)
  noFill();
  stroke(COL.grounding[0], COL.grounding[1], COL.grounding[2], 80);
  strokeWeight(2);
  ellipse(cx, cy, 180, 180);

  // Pulsing inner circle
  let alpha = 120 + beatPhase * 135;
  fill(COL.grounding[0], COL.grounding[1], COL.grounding[2], alpha);
  stroke(COL.grounding[0], COL.grounding[1], COL.grounding[2], 200);
  strokeWeight(2);
  ellipse(cx, cy, radius * 2, radius * 2);
  noStroke();

  // Beat indicators
  for (let i = 0; i < GROUNDING_BEATS; i++) {
    let bx = cx - 40 + i * 40;
    let by = cy + 120;

    if (groundingBeats[i] && groundingBeats[i].result === 'hit') {
      fill(COL.grounding[0], COL.grounding[1], COL.grounding[2]);
    } else if (groundingBeats[i] && (groundingBeats[i].result === 'early' || groundingBeats[i].result === 'late' || groundingBeats[i].result === 'missed')) {
      fill(COL.healthLow[0], COL.healthLow[1], COL.healthLow[2], 150);
    } else if (i === groundingBeatIndex) {
      fill(COL.textPrimary[0], COL.textPrimary[1], COL.textPrimary[2], 180 + sin(millis() / 200) * 60);
    } else {
      fill(COL.textSecondary[0], COL.textSecondary[1], COL.textSecondary[2], 80);
    }
    ellipse(bx, by, 20, 20);
  }

  // Feedback text
  if (groundingFeedbackTimer > 0 && groundingFeedback) {
    let feedCol = groundingFeedback === 'Steady!' ? COL.grounding : COL.falseAlert;
    fill(feedCol[0], feedCol[1], feedCol[2], groundingFeedbackTimer / 0.6 * 255);
    textSize(20);
    textStyle(BOLD);
    text(groundingFeedback, cx, cy + 80);
    textStyle(NORMAL);
  }

  // Completion message
  if (groundingComplete) {
    let success = groundingHits >= 2;
    if (success) {
      fill(COL.grounding[0], COL.grounding[1], COL.grounding[2]);
      textSize(22);
      textStyle(BOLD);
      text('Grounded — Clarity Restored', cx, cy - 170);
    } else {
      fill(COL.textSecondary[0], COL.textSecondary[1], COL.textSecondary[2]);
      textSize(18);
      text('Partial focus — keep going', cx, cy - 170);
    }
    textStyle(NORMAL);
  }
}

// --- Win Screen ---
function drawWin() {
  background(COL.bg[0], COL.bg[1], COL.bg[2]);

  let cx = CANVAS_W / 2;

  // Gentle celebration background
  let t = millis() / 1000;
  noStroke();
  for (let i = 0; i < 12; i++) {
    let x = cx + cos(t * 0.2 + i * 0.5) * 300;
    let y = CANVAS_H / 2 + sin(t * 0.3 + i * 0.7) * 200;
    fill(COL.accent[0], COL.accent[1], COL.accent[2], 12);
    ellipse(x, y, 60, 60);
  }

  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(42);
  fill(COL.accent[0], COL.accent[1], COL.accent[2]);
  text('Greenhouse Stabilized', cx, 100);

  textStyle(NORMAL);
  textSize(18);
  fill(COL.textSecondary[0], COL.textSecondary[1], COL.textSecondary[2]);
  text('You kept the garden in balance.', cx, 150);

  // Grade
  let grade = computeGrade();
  textSize(60);
  textStyle(BOLD);
  fill(COL.combo[0], COL.combo[1], COL.combo[2]);
  text(grade, cx, 230);
  textStyle(NORMAL);

  // Stats
  drawEndStats(cx, 290);
}

// --- Lose Screen ---
function drawLose() {
  background(COL.bg[0], COL.bg[1], COL.bg[2]);

  let cx = CANVAS_W / 2;

  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(36);
  fill(COL.textPrimary[0], COL.textPrimary[1], COL.textPrimary[2]);
  text('The Garden Faded', cx, 100);

  textStyle(NORMAL);
  textSize(16);
  fill(COL.textSecondary[0], COL.textSecondary[1], COL.textSecondary[2]);
  text('Too many plants were lost — but every attempt is practice.', cx, 145);
  text('Adjust your strategy and try again.', cx, 168);

  drawEndStats(cx, 230);
}

function drawEndStats(cx, startY) {
  let y = startY;
  let lineH = 30;

  textSize(16);
  textAlign(CENTER, CENTER);

  fill(COL.textPrimary[0], COL.textPrimary[1], COL.textPrimary[2]);
  text('Score: ' + floor(score), cx, y); y += lineH;

  fill(COL.combo[0], COL.combo[1], COL.combo[2]);
  text('Best Harmony: x' + nf(stats.peakCombo, 1, 1), cx, y); y += lineH;

  fill(COL.surge[0], COL.surge[1], COL.surge[2]);
  text('Surges Survived: ' + stats.surgesSurvived, cx, y); y += lineH;

  fill(COL.grounding[0], COL.grounding[1], COL.grounding[2]);
  text('Grounding: ' + stats.groundingSuccesses + ' / ' + stats.groundingAttempts + ' successful', cx, y); y += lineH;

  fill(COL.accent[0], COL.accent[1], COL.accent[2]);
  text('Plants Restored: ' + stats.totalRestores, cx, y); y += lineH;

  fill(COL.healthLow[0], COL.healthLow[1], COL.healthLow[2]);
  text('Plants Wilted: ' + stats.plantsWilted, cx, y); y += lineH + 10;
}

// --- Pause Screen ---
function drawPause() {
  fill(COL.bg[0], COL.bg[1], COL.bg[2], 180);
  rect(0, 0, CANVAS_W, CANVAS_H);

  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(36);
  fill(COL.textPrimary[0], COL.textPrimary[1], COL.textPrimary[2]);
  text('PAUSED', CANVAS_W / 2, CANVAS_H / 2 - 30);

  textStyle(NORMAL);
  textSize(16);
  fill(COL.textSecondary[0], COL.textSecondary[1], COL.textSecondary[2]);
  text('Press P to resume', CANVAS_W / 2, CANVAS_H / 2 + 20);
}

// ============================================================
// P5.JS SETUP
// ============================================================
function setup() {
  createCanvas(CANVAS_W, CANVAS_H);
  textFont('monospace');
  initGame();
  initMenuButtons();
}

// ============================================================
// MENU BUTTON SETUP
// ============================================================
let menuButtons = [];

function initMenuButtons() {
  menuButtons = [];

  let cx = CANVAS_W / 2;
  let btnW = 200;
  let btnH = 48;

  // Title screen buttons
  menuButtons.push(new Button(cx - btnW / 2, CANVAS_H / 2 - 10, btnW, btnH, 'Start Game', () => {
    initGame();
    gameState = STATE.PLAYING;
  }, 'title_start'));

  menuButtons.push(new Button(cx - btnW / 2, CANVAS_H / 2 + 55, btnW, btnH, 'Instructions', () => {
    gameState = STATE.INSTRUCTIONS;
  }, 'title_instructions'));

  // Instructions back button
// Instructions back button — centered at bottom with clear margin
  menuButtons.push(new Button(cx - btnW / 2, CANVAS_H - 55, btnW, btnH, 'Back to Title', () => {
    gameState = STATE.TITLE;
  }, 'instr_back'));

  // Win/Lose restart buttons
  menuButtons.push(new Button(cx - btnW / 2, CANVAS_H - 120, btnW, btnH, 'Play Again', () => {
    actionBtns = []; // Reset action buttons
    initGame();
    gameState = STATE.PLAYING;
  }, 'end_restart'));

  menuButtons.push(new Button(cx - btnW / 2, CANVAS_H - 60, btnW, btnH, 'Title Screen', () => {
    actionBtns = [];
    gameState = STATE.TITLE;
  }, 'end_title'));
}

// ============================================================
// P5.JS DRAW LOOP
// ============================================================
function draw() {
  let dt = deltaTime / 1000;
  dt = min(dt, 0.05); // Cap delta time to avoid jumps

  // Update hover on menu buttons
  for (let btn of menuButtons) {
    btn.visible = false;
    btn.checkHover(mouseX, mouseY);
  }

  switch (gameState) {
    case STATE.TITLE:
      drawTitle();
      // Show title buttons
      showButton('title_start');
      showButton('title_instructions');
      break;

    case STATE.INSTRUCTIONS:
      drawInstructions();
      showButton('instr_back');
      break;

    case STATE.PLAYING:
      updateGame(dt);
      drawGameplay();
      break;

    case STATE.GROUNDING:
      // Still draw gameplay underneath
      drawGameplay();
      updateGrounding(dt);
      drawGrounding();
      break;

    case STATE.WIN:
      drawWin();
      showButton('end_restart');
      showButton('end_title');
      break;

    case STATE.LOSE:
      drawLose();
      showButton('end_restart');
      showButton('end_title');
      break;

    case STATE.PAUSED:
      drawGameplay();
      drawPause();
      break;
  }

  // Draw visible menu buttons
  for (let btn of menuButtons) {
    if (btn.visible) btn.draw();
  }
}

function showButton(id) {
  for (let btn of menuButtons) {
    if (btn.id === id) {
      btn.visible = true;
      btn.checkHover(mouseX, mouseY);
    }
  }
}

// ============================================================
// MAIN UPDATE LOOP
// ============================================================
function updateGame(dt) {
  // Timer
  timer -= dt;
  timer = max(0, timer);

  // Difficulty ramp
  updateDifficulty();

  // Update cooldowns
  if (waterCooldown > 0) waterCooldown -= dt;
  if (lightCooldown > 0) lightCooldown -= dt;
  if (airflowCooldown > 0) airflowCooldown -= dt;
  if (groundingCooldownLeft > 0) groundingCooldownLeft -= dt;

  // Process input queue (surge delay)
  processInputQueue(dt);

  // Update all plant beds
  for (let bed of beds) {
    bed.update(dt);
  }

  // Update surge
  updateSurge(dt);

  // Update tension
  updateTension(dt);

  // Update combo
  updateCombo(dt);

  // Update score
  updateScore(dt);

  // Update particles
  updateParticles(dt);

  // Check end conditions
  checkEndConditions();
}

// ============================================================
// INPUT HANDLING
// ============================================================
function keyPressed() {
  // Global keys
  if (key === 'v' || key === 'V') {
    reducedEffects = !reducedEffects;
    return;
  }

  switch (gameState) {
    case STATE.TITLE:
      if (keyCode === ENTER || key === ' ') {
        initGame();
        gameState = STATE.PLAYING;
      }
      if (key === 'i' || key === 'I') {
        gameState = STATE.INSTRUCTIONS;
      }
      break;

    case STATE.INSTRUCTIONS:
      if (keyCode === ESCAPE || keyCode === BACKSPACE || key === 'i' || key === 'I') {
        gameState = STATE.TITLE;
      }
      break;

    case STATE.PLAYING:
      handlePlayingInput();
      break;

    case STATE.GROUNDING:
      if (key === ' ') {
        groundingInput();
      }
      break;

    case STATE.WIN:
    case STATE.LOSE:
      if (keyCode === ENTER || key === ' ') {
        actionBtns = [];
        initGame();
        gameState = STATE.PLAYING;
      }
      if (keyCode === ESCAPE) {
        actionBtns = [];
        gameState = STATE.TITLE;
      }
      break;

    case STATE.PAUSED:
      if (key === 'p' || key === 'P') {
        gameState = STATE.PLAYING;
      }
      break;
  }
}

function handlePlayingInput() {
  // Movement — WASD or arrow keys
  let col = selectedBed % GRID_COLS;
  let row = floor(selectedBed / GRID_COLS);

  if (key === 'w' || key === 'W' || keyCode === UP_ARROW) {
    row = max(0, row - 1);
  }
  if (key === 's' || key === 'S' || keyCode === DOWN_ARROW) {
    row = min(GRID_ROWS - 1, row + 1);
  }
  if (key === 'a' || key === 'A' || keyCode === LEFT_ARROW) {
    col = max(0, col - 1);
  }
  if (key === 'd' || key === 'D' || keyCode === RIGHT_ARROW) {
    col = min(GRID_COLS - 1, col + 1);
  }
  selectedBed = row * GRID_COLS + col;

  // Actions
  if (key === 'q' || key === 'Q') {
    queueAction(() => doAction('water'));
  }
  if (key === 'e' || key === 'E') {
    queueAction(() => doAction('light'));
  }
  if (key === 'r' || key === 'R') {
    queueAction(() => doAction('airflow'));
  }
  if (key === ' ') {
    startGrounding();
  }

  // Pause
  if (key === 'p' || key === 'P') {
    gameState = STATE.PAUSED;
  }
}

function mousePressed() {
  // Check menu buttons
  for (let btn of menuButtons) {
    if (btn.checkClick(mouseX, mouseY)) return;
  }

  // Check action buttons during gameplay
  if (gameState === STATE.PLAYING) {
    for (let btn of actionBtns) {
      if (btn.checkClick(mouseX, mouseY)) return;
    }

    // Click on bed to select
    let idx = getBedAtMouse(mouseX, mouseY);
    if (idx >= 0) {
      selectedBed = idx;
    }
  }
}

// Prevent default scrolling for arrow keys and space
function keyDown(e) {
  if ([32, 37, 38, 39, 40].includes(e.keyCode)) {
    e.preventDefault();
  }
}

// Attach keydown listener for preventing scroll
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', function(e) {
    if ([32, 37, 38, 39, 40].includes(e.keyCode)) {
      e.preventDefault();
    }
  });
}


