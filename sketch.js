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
const ROUND_DURATION = 90;
const GRACE_PERIOD = 15;

// Plant drain rates
const BASE_WATER_DRAIN = 5;
const BASE_LIGHT_DRAIN = 4;
const DRAIN_VARIATION = 1.5;
const HEALTH_LOSS_RATE = 7;
const HEALTH_RECOVERY_RATE = 2.5;
const CRITICAL_THRESHOLD = 25;
const HEALTHY_THRESHOLD = 50;

// Resource actions
const WATER_BOOST = 30;
const LIGHT_BOOST = 30;

// CHANGE #2 — Buffed airflow constants
const AIRFLOW_DURATION = 8;              // was 5 — lasts 60% longer
const AIRFLOW_DRAIN_REDUCTION = 0.3;     // was 0.5 — slows drain to 30% (stronger)
const AIRFLOW_HEALTH_RECOVERY = 1.5;     // NEW — heals 1.5 HP/sec while airflow active
const AIRFLOW_COOLDOWN = 3;              // was 4 — slightly shorter cooldown

const ACTION_COOLDOWN = 0.3;

// CHANGE #4 — Global action lock (anti-spam)
const ACTION_LOCK_DURATION = 0.2;        // NEW — 0.2s lockout after water/light

// Surge system
const SURGE_MIN_INTERVAL = 12;
const SURGE_MAX_INTERVAL = 25;
const SURGE_DURATION_MIN = 4;
const SURGE_DURATION_MAX = 7;
const SURGE_COOLDOWN_MIN = 8;
const FALSE_ALERT_COUNT = 3;
const SURGE_INPUT_DELAY = 0.1;
const SURGE_JITTER_AMOUNT = 3;

// Uncertain zones
const UNCERTAIN_ZONE_COUNT_MIN = 2;
const UNCERTAIN_ZONE_COUNT_MAX = 4;
const UNCERTAIN_DURATION_MIN = 8;
const UNCERTAIN_DURATION_MAX = 15;

// Tension meter
const TENSION_RISE_SURGE = 12;
const TENSION_RISE_UNCERTAIN = 4;
const TENSION_RISE_ALERTS = 1.2;
const TENSION_DECAY = 3;
const TENSION_OVERLOAD_RESET = 70;

// CHANGE #3 — More forgiving grounding constants
const GROUNDING_COOLDOWN = 10;
const GROUNDING_BEATS = 3;
const GROUNDING_BEAT_WINDOW = 0.45;      // was 0.3 — 50% wider timing window
const GROUNDING_BEAT_INTERVAL = 1.5;     // was 1.2 — slower rhythm, easier to read
const GROUNDING_SUCCESS_THRESHOLD = 1;   // NEW — only need 1/3 hits to succeed (was hardcoded 2)
const GROUNDING_TENSION_REWARD = 30;
const GROUNDING_STABILITY_TIME = 5;
const GROUNDING_PARTIAL_REWARD = 10;

// CHANGE #1 — Plant image health thresholds
const PLANT_IMG_GOOD_MIN = 67;           // NEW — health >= 67 shows good image
const PLANT_IMG_OKAY_MIN = 34;           // NEW — health >= 34 shows okay image
const PLANT_IMG_BAD_MIN = 1;             // NEW — health >= 1 shows bad image
                                          // health <= 0 shows dead image

// Scoring
const SCORE_PER_HEALTHY_SEC = 1;
const SCORE_RESTORE_BONUS = 15;
const SCORE_GROUNDING_BONUS = 25;
const SCORE_SURGE_SURVIVE = 20;
const COMBO_THRESHOLD = 6;
const COMBO_MULTIPLIER_STEP = 0.1;
const COMBO_MAX_MULTIPLIER = 3.0;

// Win/Lose
const LOSE_WILTED_COUNT = 3;
const WIN_MIN_ALIVE = 7;

// Difficulty ramp
const DRAIN_RAMP_FACTOR = 0.5;
const SURGE_FREQ_RAMP = 0.4;

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
let selectedBed = 0;
let timer = ROUND_DURATION;
let score = 0;
let tensionMeter = 0;
let comboCount = 0;
let comboMultiplier = 1.0;
let highestCombo = 0;

// Surge state
let surgeActive = false;
let surgeTimer = 0;
let surgeNextIn = 0;
let surgeCooldownLeft = 0;
let surgesCompleted = 0;
let surgeVisualIntensity = 0;

// Grounding state
let groundingAvailable = true;
let groundingCooldownLeft = 0;
let groundingSuccessCount = 0;
let groundingStabilityLeft = 0;

// Grounding mini-game state
let groundingBeats = [];
let groundingBeatIndex = 0;
let groundingPhase = 0;
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

// CHANGE #4 — Global action lock timer
let actionLockTimer = 0;

// Input delay queue (for surge effect)
let inputQueue = [];
let surgeJitterX = 0;
let surgeJitterY = 0;

// Particles
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

let titlePulses = [];
let buttons = [];
let difficultyMult = 1.0;
let reducedEffects = false;

// ============================================================
// CHANGE #1 — Plant image variables
// ============================================================
let plantGoodImg = null;
let plantOkayImg = null;
let plantBadImg = null;
let plantDeadImg = null;
let imagesLoaded = false;  // fallback flag if images fail

// ============================================================
// CHANGE #1 — Preload plant images from assets/ folder
// ============================================================
function preload() {
  // Attempt to load all 4 plant state images.
  // If any fail, imagesLoaded stays false and we fall back
  // to the old rectangle rendering (no crash).
  try {
    plantGoodImg = loadImage('assets/plant_good.png',
      () => {}, // success callback (no-op)
      () => { plantGoodImg = null; } // failure callback
    );
    plantOkayImg = loadImage('assets/plant_okay.png',
      () => {},
      () => { plantOkayImg = null; }
    );
    plantBadImg = loadImage('assets/plant_bad.png',
      () => {},
      () => { plantBadImg = null; }
    );
    plantDeadImg = loadImage('assets/plant_dead.png',
      () => {},
      () => { plantDeadImg = null; }
    );
  } catch (e) {
    console.warn('Plant images could not be loaded, using fallback rendering.', e);
  }
}

// Helper: check after setup whether all images loaded successfully
function checkImagesLoaded() {
  imagesLoaded = (plantGoodImg !== null && plantOkayImg !== null &&
                  plantBadImg !== null && plantDeadImg !== null);
  if (!imagesLoaded) {
    console.warn('One or more plant images missing — using fallback shapes.');
  }
}

// Helper: get the correct image for a given health value
function getPlantImage(health) {
  if (health <= 0) return plantDeadImg;
  if (health < PLANT_IMG_OKAY_MIN) return plantBadImg;
  if (health < PLANT_IMG_GOOD_MIN) return plantOkayImg;
  return plantGoodImg;
}

// ============================================================
// PLANT BED CLASS
// ============================================================
class PlantBed {
  constructor(col, row, index) {
    this.col = col;
    this.row = row;
    this.index = index;

    this.health = 80 + random(-10, 10);
    this.water = 60 + random(-15, 15);
    this.light = 60 + random(-15, 15);

    this.drainRateWater = BASE_WATER_DRAIN + random(-DRAIN_VARIATION, DRAIN_VARIATION);
    this.drainRateLight = BASE_LIGHT_DRAIN + random(-DRAIN_VARIATION, DRAIN_VARIATION);

    this.airflowActive = false;
    this.airflowTimer = 0;

    this.isUncertainZone = false;
    this.uncertainTimer = 0;

    this.hasFalseAlert = false;
    this.isWilted = false;

    this.x = 0;
    this.y = 0;
    this.w = 0;
    this.h = 0;

    this.flashTimer = 0;
    this.restoreFlash = 0;
    this.wasStressed = false;
  }

  get trueUrgency() {
    if (this.health <= 0) return 'dead';
    if (this.water < CRITICAL_THRESHOLD || this.light < CRITICAL_THRESHOLD) return 'critical';
    if (this.water < HEALTHY_THRESHOLD || this.light < HEALTHY_THRESHOLD) return 'warning';
    return 'healthy';
  }

  get displayUrgency() {
    if (this.hasFalseAlert) return 'critical';
    if (this.isUncertainZone && surgeActive) {
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

    this.water -= this.drainRateWater * drainMult * dt;
    this.light -= this.drainRateLight * drainMult * dt;
    this.water = constrain(this.water, 0, 100);
    this.light = constrain(this.light, 0, 100);

    if (this.water < CRITICAL_THRESHOLD || this.light < CRITICAL_THRESHOLD) {
      // CHANGE #2 — Airflow reduces health loss when plant is stressed
      let healthLoss = HEALTH_LOSS_RATE;
      if (this.airflowActive) healthLoss *= 0.5; // halve health loss during airflow
      this.health -= healthLoss * dt;
      this.wasStressed = true;
    } else if (this.water >= HEALTHY_THRESHOLD && this.light >= HEALTHY_THRESHOLD) {
      this.health += HEALTH_RECOVERY_RATE * dt;
      if (this.wasStressed && this.health > 50) {
        score += SCORE_RESTORE_BONUS * comboMultiplier;
        stats.totalRestores++;
        this.restoreFlash = 0.5;
        this.wasStressed = false;
        spawnParticle(this.x + this.w / 2, this.y + this.h / 2, COL.accent, '+' + floor(SCORE_RESTORE_BONUS * comboMultiplier));
      }
    }

    // CHANGE #2 — Airflow grants passive health recovery while active
    if (this.airflowActive && this.health > 0 && this.health < 100) {
      this.health += AIRFLOW_HEALTH_RECOVERY * dt;
    }

    this.health = constrain(this.health, 0, 100);

    if (this.health <= 0) {
      this.isWilted = true;
      stats.plantsWilted++;
    }

    if (this.airflowActive) {
      this.airflowTimer -= dt;
      if (this.airflowTimer <= 0) {
        this.airflowActive = false;
      }
    }

    if (this.isUncertainZone) {
      this.uncertainTimer -= dt;
      if (this.uncertainTimer <= 0) {
        this.isUncertainZone = false;
      }
    }

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
// PARTICLE SYSTEM
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
// BUTTON HELPER
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
  actionLockTimer = 0;  // CHANGE #4 — reset action lock

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

  for (let b of beds) b.hasFalseAlert = false;

  let available = beds.filter(b => !b.isWilted);
  shuffle(available, true);
  let count = floor(random(UNCERTAIN_ZONE_COUNT_MIN, UNCERTAIN_ZONE_COUNT_MAX + 1));
  count = min(count, available.length);
  for (let i = 0; i < count; i++) {
    available[i].isUncertainZone = true;
    available[i].uncertainTimer = random(UNCERTAIN_DURATION_MIN, UNCERTAIN_DURATION_MAX);
  }

  let interval = lerp(SURGE_MAX_INTERVAL, SURGE_MIN_INTERVAL, (ROUND_DURATION - timer) / ROUND_DURATION * SURGE_FREQ_RAMP);
  surgeNextIn = random(interval * 0.8, interval * 1.2);
  surgeCooldownLeft = SURGE_COOLDOWN_MIN;
}

function updateSurge(dt) {
  if (surgeActive) {
    surgeTimer -= dt;
    tensionMeter += TENSION_RISE_SURGE * dt;

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
  // CHANGE #4 — Respect action lock
  if (actionLockTimer > 0) return;
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

  // CHANGE #3 — Slower pulse rhythm using GROUNDING_BEAT_INTERVAL
  let beatPhase = (groundingTimer % GROUNDING_BEAT_INTERVAL) / GROUNDING_BEAT_INTERVAL;
  groundingCircleRadius = 30 + sin(beatPhase * PI) * 50;

  if (groundingFeedbackTimer > 0) groundingFeedbackTimer -= dt;

  if (groundingBeatIndex >= GROUNDING_BEATS) {
    if (!groundingComplete) {
      groundingComplete = true;
      groundingTimer = 0;
    }
  }

  if (groundingComplete) {
    if (groundingTimer > 1.5) {
      finishGrounding();
    }
  } else {
    if (groundingBeatIndex < GROUNDING_BEATS) {
      let beat = groundingBeats[groundingBeatIndex];
      // CHANGE #3 — Use wider window constant for miss detection
      if (groundingTimer > beat.time + GROUNDING_BEAT_WINDOW + 0.15) {
        beat.result = 'missed';
        groundingFeedback = 'Missed';
        groundingFeedbackTimer = 0.6;
        groundingBeatIndex++;
      }
    }
  }

  // Grounding fully pauses plant decay (player isn't punished for coping)
  // (no bed.update call here)
}

function groundingInput() {
  if (groundingComplete || groundingBeatIndex >= GROUNDING_BEATS) return;

  let beat = groundingBeats[groundingBeatIndex];
  let diff = abs(groundingTimer - beat.time);

  // CHANGE #3 — Uses wider GROUNDING_BEAT_WINDOW for easier hits
  if (diff <= GROUNDING_BEAT_WINDOW) {
    beat.hit = true;
    beat.result = 'hit';
    groundingHits++;
    // CHANGE #3 — Extra positive feedback for timing quality
    if (diff <= GROUNDING_BEAT_WINDOW * 0.4) {
      groundingFeedback = 'Perfect!';
    } else {
      groundingFeedback = 'Steady!';
    }
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
  // CHANGE #3 — Use configurable success threshold (default 1/3 hits)
  let success = groundingHits >= GROUNDING_SUCCESS_THRESHOLD;

  if (success) {
    tensionMeter = max(0, tensionMeter - GROUNDING_TENSION_REWARD);
    groundingStabilityLeft = GROUNDING_STABILITY_TIME;
    groundingSuccessCount++;
    stats.groundingSuccesses++;
    score += SCORE_GROUNDING_BONUS * comboMultiplier;

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
  let activeAlerts = beds.filter(b => !b.isWilted && b.trueUrgency === 'critical').length;
  tensionMeter += activeAlerts * TENSION_RISE_ALERTS * dt * 0.3;

  if (!surgeActive && activeAlerts < 2) {
    tensionMeter -= TENSION_DECAY * dt;
  }

  if (groundingStabilityLeft > 0) {
    tensionMeter -= TENSION_DECAY * 2 * dt;
    groundingStabilityLeft -= dt;
  }

  tensionMeter = constrain(tensionMeter, 0, 100);

  if (tensionMeter >= 100) {
    tensionMeter = TENSION_OVERLOAD_RESET;
    comboMultiplier = max(1.0, comboMultiplier - 0.5);
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
  } else {
    if (comboCount > 0) {
      comboCount = max(0, comboCount - 3);
      if (comboCount === 0) comboMultiplier = 1.0;
    }
  }

  highestCombo = max(highestCombo, comboMultiplier);
  stats.peakCombo = highestCombo;
}

function updateScore(dt) {
  let healthyCount = beds.filter(b => !b.isWilted && b.health > 40).length;
  score += healthyCount * SCORE_PER_HEALTHY_SEC * comboMultiplier * dt;
}

function updateDifficulty() {
  let elapsed = ROUND_DURATION - timer;
  let progress = elapsed / ROUND_DURATION;
  difficultyMult = 1.0 + progress * DRAIN_RAMP_FACTOR;
}

// ============================================================
// ACTION HANDLING
// ============================================================
function doAction(type) {
  // CHANGE #4 — Block all actions during action lock
  if (actionLockTimer > 0) return;

  let bed = beds[selectedBed];
  if (!bed || bed.isWilted) return;

  if (bed.isUncertainZone) {
    tensionMeter += TENSION_RISE_UNCERTAIN;
  }

  if (type === 'water' && waterCooldown <= 0) {
    bed.applyWater();
    waterCooldown = ACTION_COOLDOWN;
    actionLockTimer = ACTION_LOCK_DURATION;  // CHANGE #4 — trigger global lock
    spawnParticle(bed.x + bed.w / 2, bed.y + 10, COL.water, 'Water');
  } else if (type === 'light' && lightCooldown <= 0) {
    bed.applyLight();
    lightCooldown = ACTION_COOLDOWN;
    actionLockTimer = ACTION_LOCK_DURATION;  // CHANGE #4 — trigger global lock
    spawnParticle(bed.x + bed.w / 2, bed.y + 10, COL.light, 'Light');
  } else if (type === 'airflow' && airflowCooldown <= 0) {
    bed.applyAirflow();
    airflowCooldown = AIRFLOW_COOLDOWN;
    // CHANGE #4 — No action lock for airflow (already has long cooldown)
    spawnParticle(bed.x + bed.w / 2, bed.y + 10, COL.airflow, 'Airflow');
  }
}

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

function computeGrade() {
  let maxPossible = TOTAL_BEDS * SCORE_PER_HEALTHY_SEC * ROUND_DURATION * 2;
  let ratio = score / maxPossible;
  if (ratio > 0.6) return 'A';
  if (ratio > 0.4) return 'B';
  if (ratio > 0.25) return 'C';
  return 'D';
}

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

function drawTitle() {
  background(COL.bg[0], COL.bg[1], COL.bg[2]);

  let t = millis() / 1000;
  noStroke();
  for (let i = 0; i < 8; i++) {
    let x = CANVAS_W / 2 + cos(t * 0.3 + i * 0.8) * 200;
    let y = CANVAS_H / 2 + sin(t * 0.4 + i * 1.1) * 120;
    let r = 40 + sin(t * 0.5 + i) * 15;
    fill(COL.accent[0], COL.accent[1], COL.accent[2], 15 + sin(t + i) * 8);
    ellipse(x, y, r * 2, r * 2);
  }

  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(52);
  fill(COL.accent[0], COL.accent[1], COL.accent[2]);
  text('Garden Circuit', CANVAS_W / 2, CANVAS_H / 2 - 120);

  textStyle(NORMAL);
  textSize(18);
  fill(COL.textSecondary[0], COL.textSecondary[1], COL.textSecondary[2]);
  text('Keep the greenhouse in balance', CANVAS_W / 2, CANVAS_H / 2 - 70);

  stroke(COL.accent[0], COL.accent[1], COL.accent[2], 60);
  strokeWeight(1);
  line(CANVAS_W / 2 - 120, CANVAS_H / 2 - 45, CANVAS_W / 2 + 120, CANVAS_H / 2 - 45);
  noStroke();
}

function drawInstructions() {
  background(COL.bg[0], COL.bg[1], COL.bg[2]);

  let cx = CANVAS_W / 2;
  let startY = 22;
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

  let leftX = 40;
  let rightX = CANVAS_W / 2 + 30;
  let lineH = 18;

  let y = startY + 45;

  let leftLines = [
    { t: '[ OBJECTIVE ]', style: 'header' },
    { t: 'Keep 9 plant beds healthy for 90 seconds.', style: 'normal' },
    { t: 'Plants need Water and Light — both drain over time.', style: 'normal' },
    { t: 'If needs drop too low, health decreases. Lose 3 plants = game over.', style: 'normal' },
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

  stroke(COL.accent[0], COL.accent[1], COL.accent[2], 40);
  strokeWeight(1);
  line(CANVAS_W / 2 + 10, startY + 50, CANVAS_W / 2 + 10, maxTextY - 10);
  noStroke();
}

// --- Gameplay Drawing ---
function drawGameplay() {
  if (!reducedEffects && surgeVisualIntensity > 0.1) {
    translate(surgeJitterX * surgeVisualIntensity, surgeJitterY * surgeVisualIntensity);
  }

  background(COL.bg[0], COL.bg[1], COL.bg[2]);

  if (surgeActive && !reducedEffects) {
    noStroke();
    fill(COL.surge[0], COL.surge[1], COL.surge[2], 15 + sin(millis() / 80) * 10);
    rect(0, 0, CANVAS_W, CANVAS_H);

    for (let i = 0; i < 3; i++) {
      let fx = random(boardX, boardX + boardW);
      let fy = random(boardY, boardY + boardH);
      fill(COL.surge[0], COL.surge[1], COL.surge[2], 30);
      textSize(12);
      textAlign(CENTER, CENTER);
      text('!', fx, fy);
    }
  }

  for (let bed of beds) {
    drawBed(bed);
  }

  if (beds[selectedBed]) {
    let sb = beds[selectedBed];
    noFill();
    stroke(COL.accent[0], COL.accent[1], COL.accent[2], 180 + sin(millis() / 200) * 60);
    strokeWeight(3);
    rect(sb.x - 3, sb.y - 3, sb.w + 6, sb.h + 6, 6);
    noStroke();
  }

  drawParticles();
  drawPanel();

  if (surgeActive) {
    fill(COL.surge[0], COL.surge[1], COL.surge[2], 180 + sin(millis() / 100) * 60);
    textAlign(CENTER, CENTER);
    textSize(20);
    textStyle(BOLD);
    text('⚡ SURGE ACTIVE ⚡', boardX + boardW / 2, boardY - 3);
    textStyle(NORMAL);
  }

  // CHANGE #4 — Subtle action lock overlay on the board area
  if (actionLockTimer > 0) {
    noStroke();
    fill(COL.bg[0], COL.bg[1], COL.bg[2], 30);
    rect(boardX, boardY, boardW, boardH);
  }
}

// ============================================================
// CHANGE #1 — Rewritten drawBed(): image fills box, bars at bottom
// ============================================================
function drawBed(bed) {
  let bx = bed.x;
  let by = bed.y;
  let bw = bed.w;
  let bh = bed.h;

  // --- Background rectangle (base, visible if no image) ---
  if (bed.isWilted) {
    fill(COL.bedDead[0], COL.bedDead[1], COL.bedDead[2]);
  } else if (bed.isUncertainZone) {
    let shimmer = sin(millis() / 300 + bed.index) * 10;
    fill(COL.bedUncertain[0] + shimmer, COL.bedUncertain[1] + shimmer, COL.bedUncertain[2] + shimmer);
  } else {
    fill(COL.bedNormal[0], COL.bedNormal[1], COL.bedNormal[2]);
  }

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

  // --- Draw plant image filling the entire bed box ---
  if (imagesLoaded) {
    let img = getPlantImage(bed.health);
    if (img) {
      push();
      imageMode(CORNER);
      // Clip to the bed rectangle (draw image filling entire box)
      // Dead plants get a dark desaturated tint
      if (bed.isWilted) {
        tint(80, 50, 50, 200);
      }
      image(img, bx + 1, by + 1, bw - 2, bh - 2);
      noTint();
      pop();
    }
  } else {
    // Fallback: old text icon rendering if images didn't load
    if (bed.isWilted) {
      fill(COL.textSecondary[0], COL.textSecondary[1], COL.textSecondary[2], 120);
      textAlign(CENTER, CENTER);
      textSize(28);
      text('✕', bx + bw / 2, by + bh / 2 - 10);
      textSize(12);
      text('Wilted', bx + bw / 2, by + bh / 2 + 18);
      return;
    }

    let healthColor = bed.health > 50 ?
      COL.health :
      [lerp(COL.healthLow[0], COL.health[0], bed.health / 50),
       lerp(COL.healthLow[1], COL.health[1], bed.health / 50),
       lerp(COL.healthLow[2], COL.health[2], bed.health / 50)];

    fill(healthColor[0], healthColor[1], healthColor[2]);
    textAlign(CENTER, CENTER);
    textSize(22);
    let plantIcon = bed.health > 60 ? '❋' : bed.health > 30 ? '❊' : '✿';
    text(plantIcon, bx + bw / 2, by + bh * 0.35);
  }

  // If wilted, show label and skip bars
  if (bed.isWilted) {
    // Dark overlay so "Wilted" text is readable over the image
    fill(0, 0, 0, 120);
    noStroke();
    rect(bx + 1, by + bh - 30, bw - 2, 29, 0, 0, 4, 4);
    fill(COL.textSecondary[0], COL.textSecondary[1], COL.textSecondary[2], 220);
    textAlign(CENTER, CENTER);
    textSize(13);
    textStyle(BOLD);
    text('Wilted', bx + bw / 2, by + bh - 16);
    textStyle(NORMAL);
    return;
  }

  // ===========================================================
  // BARS AT THE BOTTOM — positioned over the soil area
  // so they don't cover the plant in the upper portion
  // ===========================================================
  let barH = 6;
  let barW = bw - 16;
  let barX = bx + 8;
  let barGap = 4;       // gap between label and next bar
  let labelH = 10;      // height for tiny label text

  // Calculate bar area from bottom up
  // Layout from bottom: [light label] [light bar] [water label] [water bar] [hp label] [hp bar] [padding]
  let bottomPad = 6;
  let totalBarArea = 3 * (barH + labelH + barGap);
  let barAreaTop = by + bh - bottomPad - totalBarArea;

  // Semi-transparent dark backdrop behind bars so they're readable over soil
  fill(0, 0, 0, 140);
  noStroke();
  rect(bx + 1, barAreaTop - 4, bw - 2, bh - (barAreaTop - by) + 3, 0, 0, 4, 4);

  let healthColor = bed.health > 50 ?
    COL.health :
    [lerp(COL.healthLow[0], COL.health[0], bed.health / 50),
     lerp(COL.healthLow[1], COL.health[1], bed.health / 50),
     lerp(COL.healthLow[2], COL.health[2], bed.health / 50)];

  let curY = barAreaTop;

  // --- Health bar ---
  textSize(8);
  textStyle(BOLD);
  fill(healthColor[0], healthColor[1], healthColor[2]);
  textAlign(LEFT, TOP);
  text('HP ' + floor(bed.health), barX, curY);
  textStyle(NORMAL);
  curY += labelH;

  fill(20, 25, 20);
  rect(barX, curY, barW, barH, 2);
  fill(healthColor[0], healthColor[1], healthColor[2]);
  rect(barX, curY, barW * bed.health / 100, barH, 2);
  curY += barH + barGap;

  // --- Water bar ---
  textSize(8);
  fill(COL.water[0], COL.water[1], COL.water[2]);
  textAlign(LEFT, TOP);
  text('💧 ' + floor(bed.water), barX, curY);
  curY += labelH;

  fill(20, 25, 35);
  rect(barX, curY, barW, barH, 2);
  fill(COL.water[0], COL.water[1], COL.water[2]);
  rect(barX, curY, barW * bed.water / 100, barH, 2);
  curY += barH + barGap;

  // --- Light bar ---
  textSize(8);
  fill(COL.light[0], COL.light[1], COL.light[2]);
  textAlign(LEFT, TOP);
  text('☀ ' + floor(bed.light), barX, curY);

  // Airflow indicator next to light label
  if (bed.airflowActive) {
    fill(COL.airflow[0], COL.airflow[1], COL.airflow[2], 200);
    textAlign(RIGHT, TOP);
    text('🌬' + floor(bed.airflowTimer) + 's', barX + barW, curY);
    textAlign(LEFT, TOP);
  }
  curY += labelH;

  fill(20, 25, 20);
  rect(barX, curY, barW, barH, 2);
  fill(COL.light[0], COL.light[1], COL.light[2]);
  rect(barX, curY, barW * bed.light / 100, barH, 2);

  // ===========================================================
  // STATUS OVERLAYS — drawn on top of everything
  // ===========================================================

  // Surge flicker overlay
  if (surgeActive && !reducedEffects && random() < 0.15) {
    fill(COL.surge[0], COL.surge[1], COL.surge[2], 50);
    noStroke();
    rect(bx, by, bw, bh, 4);
  }

  // False alert / urgency indicators (top-right corner)
  if (bed.hasFalseAlert && !bed.isWilted) {
    fill(COL.falseAlert[0], COL.falseAlert[1], COL.falseAlert[2], 160 + sin(millis() / 150) * 60);
    textAlign(RIGHT, TOP);
    textSize(16);
    text('⚠', bx + bw - 4, by + 4);
  } else if (bed.displayUrgency === 'critical') {
    fill(COL.healthLow[0], COL.healthLow[1], COL.healthLow[2], 180);
    textAlign(RIGHT, TOP);
    textSize(14);
    text('!!', bx + bw - 6, by + 4);
  } else if (bed.displayUrgency === 'warning') {
    fill(COL.light[0], COL.light[1], COL.light[2], 140);
    textAlign(RIGHT, TOP);
    textSize(13);
    text('!', bx + bw - 6, by + 6);
  }

  // Uncertain zone border + label
  if (bed.isUncertainZone) {
    noFill();
    stroke(COL.bedUncertain[0] + 40, COL.bedUncertain[1] + 40, COL.bedUncertain[2] + 40, 100 + sin(millis() / 400 + bed.index) * 50);
    strokeWeight(2);
    rect(bx + 2, by + 2, bw - 4, bh - 4, 3);
    noStroke();

    // Label in top-left area (over the plant, not the bars)
    fill(180, 160, 220, 180);
    textAlign(LEFT, TOP);
    textSize(8);
    text('uncertain', bx + 5, by + 5);
  }

  // Bed index (small debug label, top-left)
  fill(COL.textSecondary[0], COL.textSecondary[1], COL.textSecondary[2], 80);
  textAlign(LEFT, TOP);
  textSize(8);
  text('#' + (bed.index + 1), bx + 4, by + (bed.isUncertainZone ? 15 : 4));
}

// --- Side Panel ---
function drawPanel() {
  fill(COL.panelBg[0], COL.panelBg[1], COL.panelBg[2]);
  stroke(50, 60, 50);
  strokeWeight(1);
  rect(panelX, 0, PANEL_WIDTH, CANVAS_H);
  noStroke();

  let px = panelX + 20;
  let py = 20;
  let pw = PANEL_WIDTH - 40;

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

  textSize(13);
  fill(COL.textSecondary[0], COL.textSecondary[1], COL.textSecondary[2]);
  text('SCORE', px, py);
  textSize(24);
  fill(COL.textPrimary[0], COL.textPrimary[1], COL.textPrimary[2]);
  text(floor(score), px, py + 16);
  py += 52;

  textSize(13);
  fill(COL.combo[0], COL.combo[1], COL.combo[2]);
  text('HARMONY  x' + nf(comboMultiplier, 1, 1), px, py);
  py += 20;
  fill(30, 30, 20);
  rect(px, py, pw, 8, 3);
  fill(COL.combo[0], COL.combo[1], COL.combo[2]);
  rect(px, py, pw * ((comboMultiplier - 1) / (COMBO_MAX_MULTIPLIER - 1)), 8, 3);
  py += 24;

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

  textSize(13);
  fill(COL.grounding[0], COL.grounding[1], COL.grounding[2]);
  text('GROUNDING', px, py);
  py += 18;
  if (groundingCooldownLeft > 0) {
    fill(COL.textSecondary[0], COL.textSecondary[1], COL.textSecondary[2]);
    textSize(12);
    text('Cooldown: ' + floor(groundingCooldownLeft) + 's', px, py);
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

  stroke(60, 70, 60, 80);
  strokeWeight(1);
  line(px, py, px + pw, py);
  noStroke();
  py += 14;

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

  drawActionButtons(px, py, pw);

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

  if (actionBtns.length === 0) {
    actionBtns.push(new Button(px, py, btnW, btnH, '💧 Water  [Q]', () => queueAction(() => doAction('water')), 'water'));
    actionBtns.push(new Button(px, py + btnH + gap, btnW, btnH, '☀ Light  [E]', () => queueAction(() => doAction('light')), 'light'));
    actionBtns.push(new Button(px, py + 2 * (btnH + gap), btnW, btnH, '🌬 Airflow  [R]', () => queueAction(() => doAction('airflow')), 'airflow'));
    actionBtns.push(new Button(px, py + 3 * (btnH + gap), btnW, btnH, '◉ Ground  [SPACE]', () => startGrounding(), 'ground'));
  }

  actionBtns[0].y = py;
  actionBtns[1].y = py + btnH + gap;
  actionBtns[2].y = py + 2 * (btnH + gap);
  actionBtns[3].y = py + 3 * (btnH + gap);

  for (let btn of actionBtns) {
    btn.checkHover(mouseX, mouseY);

    let available = true;
    if (btn.id === 'water') available = waterCooldown <= 0;
    if (btn.id === 'light') available = lightCooldown <= 0;
    if (btn.id === 'airflow') available = airflowCooldown <= 0;
    if (btn.id === 'ground') available = groundingCooldownLeft <= 0 && gameState === STATE.PLAYING;

    // CHANGE #4 — Action lock dims ALL action buttons
    if (actionLockTimer > 0) available = false;

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
  fill(COL.bg[0], COL.bg[1], COL.bg[2], 200);
  rect(0, 0, CANVAS_W, CANVAS_H);

  let cx = CANVAS_W / 2;
  let cy = CANVAS_H / 2;

  fill(COL.grounding[0], COL.grounding[1], COL.grounding[2]);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(24);
  text('Grounding Routine', cx, cy - 140);
  textStyle(NORMAL);

  // CHANGE #3 — Clearer instructions with hint about timing
  textSize(14);
  fill(COL.textSecondary[0], COL.textSecondary[1], COL.textSecondary[2]);
  text('Press SPACE when the circle is largest', cx, cy - 110);
  textSize(11);
  fill(COL.textSecondary[0], COL.textSecondary[1], COL.textSecondary[2], 150);
  text('(generous timing — just match the rhythm)', cx, cy - 92);

  let beatPhase;
  if (groundingBeatIndex < GROUNDING_BEATS && !groundingComplete) {
    let currentBeatTime = groundingBeats[groundingBeatIndex].time;
    let distToBeat = currentBeatTime - groundingTimer;
    beatPhase = 1.0 - constrain(abs(distToBeat) / (GROUNDING_BEAT_INTERVAL * 0.5), 0, 1);
  } else {
    beatPhase = 0.5;
  }

  let radius = 30 + beatPhase * 60;

  noFill();
  stroke(COL.grounding[0], COL.grounding[1], COL.grounding[2], 80);
  strokeWeight(2);
  ellipse(cx, cy, 180, 180);

  // CHANGE #3 — Show timing window ring to help players see when to press
  if (groundingBeatIndex < GROUNDING_BEATS && !groundingComplete) {
    stroke(COL.grounding[0], COL.grounding[1], COL.grounding[2], 40);
    strokeWeight(1);
    ellipse(cx, cy, 160, 160);  // inner "safe zone" ring
  }

  let alpha = 120 + beatPhase * 135;
  fill(COL.grounding[0], COL.grounding[1], COL.grounding[2], alpha);
  stroke(COL.grounding[0], COL.grounding[1], COL.grounding[2], 200);
  strokeWeight(2);
  ellipse(cx, cy, radius * 2, radius * 2);
  noStroke();

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

  // CHANGE #3 — Show hit count so player knows progress
  fill(COL.textSecondary[0], COL.textSecondary[1], COL.textSecondary[2], 140);
  textSize(11);
  text(groundingHits + '/' + GROUNDING_SUCCESS_THRESHOLD + ' needed', cx, cy + 150);

  if (groundingFeedbackTimer > 0 && groundingFeedback) {
    // CHANGE #3 — "Perfect!" gets a distinct gold color
    let feedCol;
    if (groundingFeedback === 'Perfect!') {
      feedCol = COL.combo;
    } else if (groundingFeedback === 'Steady!') {
      feedCol = COL.grounding;
    } else {
      feedCol = COL.falseAlert;
    }
    fill(feedCol[0], feedCol[1], feedCol[2], groundingFeedbackTimer / 0.6 * 255);
    textSize(20);
    textStyle(BOLD);
    text(groundingFeedback, cx, cy + 80);
    textStyle(NORMAL);
  }

  if (groundingComplete) {
    let success = groundingHits >= GROUNDING_SUCCESS_THRESHOLD;
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

// --- Win/Lose/Pause screens (unchanged) ---
function drawWin() {
  background(COL.bg[0], COL.bg[1], COL.bg[2]);
  let cx = CANVAS_W / 2;
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
  let grade = computeGrade();
  textSize(60);
  textStyle(BOLD);
  fill(COL.combo[0], COL.combo[1], COL.combo[2]);
  text(grade, cx, 230);
  textStyle(NORMAL);
  drawEndStats(cx, 290);
}

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
  text('Plants Wilted: ' + stats.plantsWilted, cx, y);
}

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
  checkImagesLoaded();  // CHANGE #1 — verify images after preload
  initGame();
  initMenuButtons();
}

// ============================================================
// MENU BUTTONS
// ============================================================
let menuButtons = [];

function initMenuButtons() {
  menuButtons = [];
  let cx = CANVAS_W / 2;
  let btnW = 200;
  let btnH = 48;

  menuButtons.push(new Button(cx - btnW / 2, CANVAS_H / 2 - 10, btnW, btnH, 'Start Game', () => {
    initGame();
    gameState = STATE.PLAYING;
  }, 'title_start'));

  menuButtons.push(new Button(cx - btnW / 2, CANVAS_H / 2 + 55, btnW, btnH, 'Instructions', () => {
    gameState = STATE.INSTRUCTIONS;
  }, 'title_instructions'));

  menuButtons.push(new Button(cx - btnW / 2, CANVAS_H - 55, btnW, btnH, 'Back to Title', () => {
    gameState = STATE.TITLE;
  }, 'instr_back'));

  menuButtons.push(new Button(cx - btnW / 2, CANVAS_H - 120, btnW, btnH, 'Play Again', () => {
    actionBtns = [];
    initGame();
    gameState = STATE.PLAYING;
  }, 'end_restart'));

  menuButtons.push(new Button(cx - btnW / 2, CANVAS_H - 60, btnW, btnH, 'Title Screen', () => {
    actionBtns = [];
    gameState = STATE.TITLE;
  }, 'end_title'));
}

// ============================================================
// DRAW LOOP
// ============================================================
function draw() {
  let dt = deltaTime / 1000;
  dt = min(dt, 0.05);

  for (let btn of menuButtons) {
    btn.visible = false;
    btn.checkHover(mouseX, mouseY);
  }

  switch (gameState) {
    case STATE.TITLE:
      drawTitle();
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
// MAIN UPDATE
// ============================================================
function updateGame(dt) {
  timer -= dt;
  timer = max(0, timer);

  updateDifficulty();

  if (waterCooldown > 0) waterCooldown -= dt;
  if (lightCooldown > 0) lightCooldown -= dt;
  if (airflowCooldown > 0) airflowCooldown -= dt;
  if (groundingCooldownLeft > 0) groundingCooldownLeft -= dt;

  // CHANGE #4 — Tick down action lock timer
  if (actionLockTimer > 0) actionLockTimer -= dt;

  processInputQueue(dt);

  for (let bed of beds) {
    bed.update(dt);
  }

  updateSurge(dt);
  updateTension(dt);
  updateCombo(dt);
  updateScore(dt);
  updateParticles(dt);
  checkEndConditions();
}

// ============================================================
// INPUT HANDLING
// ============================================================
function keyPressed() {
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
  // Movement still works during action lock (CHANGE #4)
  let col = selectedBed % GRID_COLS;
  let row = floor(selectedBed / GRID_COLS);

  if (key === 'w' || key === 'W' || keyCode === UP_ARROW) row = max(0, row - 1);
  if (key === 's' || key === 'S' || keyCode === DOWN_ARROW) row = min(GRID_ROWS - 1, row + 1);
  if (key === 'a' || key === 'A' || keyCode === LEFT_ARROW) col = max(0, col - 1);
  if (key === 'd' || key === 'D' || keyCode === RIGHT_ARROW) col = min(GRID_COLS - 1, col + 1);
  selectedBed = row * GRID_COLS + col;

  // Actions (will be blocked inside doAction/startGrounding if locked)
  if (key === 'q' || key === 'Q') queueAction(() => doAction('water'));
  if (key === 'e' || key === 'E') queueAction(() => doAction('light'));
  if (key === 'r' || key === 'R') queueAction(() => doAction('airflow'));
  if (key === ' ') startGrounding();
  if (key === 'p' || key === 'P') gameState = STATE.PAUSED;
}

function mousePressed() {
  for (let btn of menuButtons) {
    if (btn.checkClick(mouseX, mouseY)) return;
  }

  if (gameState === STATE.PLAYING) {
    for (let btn of actionBtns) {
      if (btn.checkClick(mouseX, mouseY)) return;
    }
    let idx = getBedAtMouse(mouseX, mouseY);
    if (idx >= 0) selectedBed = idx;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', function(e) {
    if ([32, 37, 38, 39, 40].includes(e.keyCode)) {
      e.preventDefault();
    }
  });
}