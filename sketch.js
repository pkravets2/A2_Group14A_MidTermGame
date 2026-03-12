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
const AIRFLOW_DURATION = 8;
const AIRFLOW_DRAIN_REDUCTION = 0.3;
const AIRFLOW_HEALTH_RECOVERY = 1.5;
const AIRFLOW_COOLDOWN = 3;
const ACTION_COOLDOWN = 0.3;
const ACTION_LOCK_DURATION = 0.17;

// Surge system
const SURGE_MIN_INTERVAL = 12;
const SURGE_MAX_INTERVAL = 25;
const SURGE_DURATION_MIN = 4;
const SURGE_DURATION_MAX = 7;
const SURGE_COOLDOWN_MIN = 8;
const FALSE_ALERT_COUNT = 3;
const SURGE_INPUT_DELAY = 0.1;
const SURGE_JITTER_AMOUNT = 5;

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

// Grounding
const GROUNDING_COOLDOWN = 15;
const GROUNDING_SLOW_DURATION = 3;        // NEW — seconds of global drain slowdown
const GROUNDING_SLOW_MULTIPLIER = 0.3;    // NEW — drain runs at 30% speed during slow
const GROUNDING_BEATS = 3;
const GROUNDING_BEAT_WINDOW = 0.45;
const GROUNDING_BEAT_INTERVAL = 1.5;
const GROUNDING_SUCCESS_THRESHOLD = 1;
const GROUNDING_TENSION_REWARD = 30;
const GROUNDING_STABILITY_TIME = 5;
const GROUNDING_PARTIAL_REWARD = 10;

// Plant image thresholds
const PLANT_IMG_GOOD_MIN = 67;
const PLANT_IMG_OKAY_MIN = 34;
const PLANT_IMG_BAD_MIN = 1;

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
const SURGE_FREQ_RAMP = 0.6;

// Visual
const BED_MARGIN = 12;
const PANEL_WIDTH = 260;

// ============================================================
// TITLE SCREEN CONSTANTS — tweak hitbox positions here
// ============================================================
const TITLE_VIDEO_FILE = 'assets/title.mp4';          // CHANGE — video path
const TITLE_FALLBACK_IMG = 'assets/title_bg.png';     // optional fallback image

// Hitbox positions (estimated from 2000x1358 image → scaled to 1100x750)
// Tweak these if buttons don't line up with your video
const TITLE_START_BTN = { x: 300, y: 595, w: 250, h: 95 };
const TITLE_INSTR_BTN = { x: 580, y: 595, w: 280, h: 95 };

// Instructions overlay layout
const INSTR_OVERLAY_X = 60;        // left margin
const INSTR_OVERLAY_Y = 40;        // top margin
const INSTR_OVERLAY_W = 980;       // width (CANVAS_W - 2*margin)
const INSTR_OVERLAY_H = 660;       // height
const INSTR_OVERLAY_ALPHA = 240;   // background darkness (0-255)
const INSTR_CLOSE_BTN = { x: 820, y: 620, w: 160, h: 44 }; // Close button inside overlay

// Pause menu layout
const PAUSE_BTN_W = 220;
const PAUSE_BTN_H = 48;
const PAUSE_BTN_GAP = 16;

// Debug: press H to show hitbox outlines on title screen
let debugShowHitboxes = false;

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
  PLAYING: 'playing',
  GROUNDING: 'grounding',
  WIN: 'win',
  LOSE: 'lose',
  PAUSED: 'paused',
};

let gameState = STATE.TITLE;
let prevState = STATE.TITLE;

// CHANGE — Instructions overlay is now a flag on the title screen, not a separate state
let showInstructionsOverlay = false;

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
let groundingSlowLeft = 0;                // NEW — tracks remaining slow time

// Action cooldowns
let waterCooldown = 0;
let lightCooldown = 0;
let airflowCooldown = 0;
let actionLockTimer = 0;

// Input delay queue
let inputQueue = [];
let surgeJitterX = 0;
let surgeJitterY = 0;

// Particles
let particles = [];
const MAX_PARTICLES = 60;

// Stats
let stats = {
  surgesSurvived: 0,
  groundingAttempts: 0,
  groundingSuccesses: 0,
  plantsWilted: 0,
  peakCombo: 0,
  totalRestores: 0,
};

let difficultyMult = 1.0;
let reducedEffects = false;

// ============================================================
// TITLE VIDEO + PLANT IMAGE VARIABLES
// ============================================================
let titleVideo = null;
let titleVideoReady = false;
let titleFallbackImg = null;   // static fallback if video fails

let plantGoodImg = null;
let plantOkayImg = null;
let plantBadImg = null;
let plantDeadImg = null;
let imagesLoaded = false;

// ============================================================
// PRELOAD — load plant images (video loaded in setup)
// ============================================================
function preload() {
  try {
    plantGoodImg = loadImage('assets/plant_good.png', () => {}, () => { plantGoodImg = null; });
    plantOkayImg = loadImage('assets/plant_okay.png', () => {}, () => { plantOkayImg = null; });
    plantBadImg  = loadImage('assets/plant_bad.png',  () => {}, () => { plantBadImg = null; });
    plantDeadImg = loadImage('assets/plant_dead.png', () => {}, () => { plantDeadImg = null; });
  } catch (e) {
    console.warn('Plant images could not be loaded, using fallback rendering.', e);
  }

  // Try loading a static fallback for title screen (in case video fails)
  try {
    titleFallbackImg = loadImage(TITLE_FALLBACK_IMG, () => {}, () => { titleFallbackImg = null; });
  } catch (e) {
    titleFallbackImg = null;
  }
}

function checkImagesLoaded() {
  imagesLoaded = (plantGoodImg !== null && plantOkayImg !== null &&
                  plantBadImg !== null && plantDeadImg !== null);
  if (!imagesLoaded) {
    console.warn('One or more plant images missing — using fallback shapes.');
  }
}

function getPlantImage(health) {
  if (health <= 0) return plantDeadImg;
  if (health < PLANT_IMG_OKAY_MIN) return plantBadImg;
  if (health < PLANT_IMG_GOOD_MIN) return plantOkayImg;
  return plantGoodImg;
}

// ============================================================
// TITLE VIDEO SETUP — called once in setup()
// ============================================================
function initTitleVideo() {
  try {
    titleVideo = createVideo(TITLE_VIDEO_FILE);
    titleVideo.hide();         // hide the raw HTML element
    titleVideo.volume(0);      // mute (autoplay requires muted)
    titleVideo.loop();         // loop continuously
    titleVideoReady = true;
    console.log('Title video loaded successfully.');
  } catch (e) {
    console.warn('Title video could not be loaded, using fallback.', e);
    titleVideo = null;
    titleVideoReady = false;
  }
}

// Ensure video plays when entering title, pauses when leaving
function showTitleVideo() {
  if (titleVideo && titleVideoReady) {
    try { titleVideo.loop(); } catch (e) {}
  }
}

function hideTitleVideo() {
  if (titleVideo && titleVideoReady) {
    try { titleVideo.pause(); } catch (e) {}
  }
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
    this.x = 0; this.y = 0; this.w = 0; this.h = 0;
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
      if (random() < 0.2) return random() < 0.5 ? 'warning' : 'healthy';
    }
    return this.trueUrgency;
  }

  update(dt) {
    if (this.isWilted) return;
    let drainMult = difficultyMult;
    if (this.airflowActive) drainMult *= AIRFLOW_DRAIN_REDUCTION;
    if (groundingSlowLeft > 0) drainMult *= GROUNDING_SLOW_MULTIPLIER;  // NEW — global slow after grounding

    this.water -= this.drainRateWater * drainMult * dt;
    this.light -= this.drainRateLight * drainMult * dt;
    this.water = constrain(this.water, 0, 100);
    this.light = constrain(this.light, 0, 100);

    if (this.water < CRITICAL_THRESHOLD || this.light < CRITICAL_THRESHOLD) {
      let healthLoss = HEALTH_LOSS_RATE;
      if (this.airflowActive) healthLoss *= 0.5;
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

    if (this.airflowActive && this.health > 0 && this.health < 100) {
      this.health += AIRFLOW_HEALTH_RECOVERY * dt;
    }

    this.health = constrain(this.health, 0, 100);
    if (this.health <= 0) { this.isWilted = true; stats.plantsWilted++; }

    if (this.airflowActive) {
      this.airflowTimer -= dt;
      if (this.airflowTimer <= 0) this.airflowActive = false;
    }
    if (this.isUncertainZone) {
      this.uncertainTimer -= dt;
      if (this.uncertainTimer <= 0) this.isUncertainZone = false;
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
// PARTICLES
// ============================================================
function spawnParticle(x, y, col, txt) {
  if (particles.length >= MAX_PARTICLES) particles.shift();
  particles.push({ x, y, col: [...col], txt: txt || '', life: 1.0, vy: -40 });
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
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.label = label; this.callback = callback;
    this.id = id || label; this.hovered = false; this.visible = true;
  }
  contains(px, py) {
    return px >= this.x && px <= this.x + this.w && py >= this.y && py <= this.y + this.h;
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
  checkHover(mx, my) { this.hovered = this.visible && this.contains(mx, my); }
  checkClick(mx, my) {
    if (this.visible && this.contains(mx, my)) { this.callback(); return true; }
    return false;
  }
}

// ============================================================
// LAYOUT
// ============================================================
let boardX, boardY, boardW, boardH, bedW, bedH, panelX;

function computeLayout() {
  panelX = CANVAS_W - PANEL_WIDTH;
  boardX = 20; boardY = 20;
  boardW = panelX - 40; boardH = CANVAS_H - 40;
  bedW = (boardW - BED_MARGIN * (GRID_COLS + 1)) / GRID_COLS;
  bedH = (boardH - BED_MARGIN * (GRID_ROWS + 1)) / GRID_ROWS;
  for (let bed of beds) {
    bed.x = boardX + BED_MARGIN + bed.col * (bedW + BED_MARGIN);
    bed.y = boardY + BED_MARGIN + bed.row * (bedH + BED_MARGIN);
    bed.w = bedW; bed.h = bedH;
  }
}

// ============================================================
// INIT GAME
// ============================================================
function initGame() {
  beds = [];
  for (let r = 0; r < GRID_ROWS; r++)
    for (let c = 0; c < GRID_COLS; c++)
      beds.push(new PlantBed(c, r, r * GRID_COLS + c));
  computeLayout();

  selectedBed = 0; timer = ROUND_DURATION;
  score = 0; tensionMeter = 0;
  comboCount = 0; comboMultiplier = 1.0; highestCombo = 0;
  difficultyMult = 1.0;
  surgeActive = false; surgeTimer = 0;
  surgeNextIn = GRACE_PERIOD + random(3, 8);
  surgeCooldownLeft = 0; surgesCompleted = 0; surgeVisualIntensity = 0;
  groundingAvailable = true; groundingCooldownLeft = 0;
  groundingSuccessCount = 0; groundingStabilityLeft = 0;
  groundingSlowLeft = 0;    // NEW — reset grounding slow timer
  waterCooldown = 0; lightCooldown = 0; airflowCooldown = 0;
  actionLockTimer = 0;
  inputQueue = []; particles = [];
  stats = { surgesSurvived:0, groundingAttempts:0, groundingSuccesses:0,
            plantsWilted:0, peakCombo:0, totalRestores:0 };
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
  for (let i = 0; i < count; i++) available[i].hasFalseAlert = true;
}

function endSurge() {
  surgeActive = false; surgesCompleted++; stats.surgesSurvived++;
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
  let interval = lerp(SURGE_MAX_INTERVAL, SURGE_MIN_INTERVAL,
    (ROUND_DURATION - timer) / ROUND_DURATION * SURGE_FREQ_RAMP);
  surgeNextIn = random(interval * 0.8, interval * 1.2);
  surgeCooldownLeft = SURGE_COOLDOWN_MIN;
}

function updateSurge(dt) {
  if (surgeActive) {
    surgeTimer -= dt; tensionMeter += TENSION_RISE_SURGE * dt;
    if (!reducedEffects) {
      surgeJitterX = random(-SURGE_JITTER_AMOUNT, SURGE_JITTER_AMOUNT);
      surgeJitterY = random(-SURGE_JITTER_AMOUNT, SURGE_JITTER_AMOUNT);
    }
    if (surgeTimer <= 0) endSurge();
  } else {
    surgeJitterX = lerp(surgeJitterX, 0, 0.2);
    surgeJitterY = lerp(surgeJitterY, 0, 0.2);
    surgeCooldownLeft -= dt; surgeNextIn -= dt;
    if (surgeNextIn <= 0 && surgeCooldownLeft <= 0 && timer < (ROUND_DURATION - GRACE_PERIOD))
      startSurge();
  }
  surgeVisualIntensity = surgeActive ? lerp(surgeVisualIntensity, 1, 0.1) : lerp(surgeVisualIntensity, 0, 0.05);
}

// ============================================================
// GROUNDING
// ============================================================
function startGrounding() {
  if (actionLockTimer > 0) return;
  if (!groundingAvailable || groundingCooldownLeft > 0) return;
  prevState = gameState; gameState = STATE.GROUNDING;
  stats.groundingAttempts++;
  groundingBeatIndex = 0; groundingHits = 0; groundingTimer = 0;
  groundingComplete = false; groundingCircleRadius = 0;
  groundingFeedback = ''; groundingFeedbackTimer = 0;
  groundingBeats = [];
  for (let i = 0; i < GROUNDING_BEATS; i++)
    groundingBeats.push({ time: 1.0 + i * GROUNDING_BEAT_INTERVAL, hit: false, result: '' });
}

function updateGrounding(dt) {
  groundingTimer += dt;
  let beatPhase = (groundingTimer % GROUNDING_BEAT_INTERVAL) / GROUNDING_BEAT_INTERVAL;
  groundingCircleRadius = 30 + sin(beatPhase * PI) * 50;
  if (groundingFeedbackTimer > 0) groundingFeedbackTimer -= dt;
  if (groundingBeatIndex >= GROUNDING_BEATS) {
    if (!groundingComplete) { groundingComplete = true; groundingTimer = 0; }
  }
  if (groundingComplete) {
    if (groundingTimer > 1.5) finishGrounding();
  } else {
    if (groundingBeatIndex < GROUNDING_BEATS) {
      let beat = groundingBeats[groundingBeatIndex];
      if (groundingTimer > beat.time + GROUNDING_BEAT_WINDOW + 0.15) {
        beat.result = 'missed'; groundingFeedback = 'Missed';
        groundingFeedbackTimer = 0.6; groundingBeatIndex++;
      }
    }
  }
}

function groundingInput() {
  if (groundingComplete || groundingBeatIndex >= GROUNDING_BEATS) return;
  let beat = groundingBeats[groundingBeatIndex];
  let diff = abs(groundingTimer - beat.time);
  if (diff <= GROUNDING_BEAT_WINDOW) {
    beat.hit = true; beat.result = 'hit'; groundingHits++;
    groundingFeedback = diff <= GROUNDING_BEAT_WINDOW * 0.4 ? 'Perfect!' : 'Steady!';
    groundingFeedbackTimer = 0.5;
  } else if (groundingTimer < beat.time - GROUNDING_BEAT_WINDOW) {
    beat.result = 'early'; groundingFeedback = 'Too Early'; groundingFeedbackTimer = 0.5;
  } else {
    beat.result = 'late'; groundingFeedback = 'Too Late'; groundingFeedbackTimer = 0.5;
  }
  groundingBeatIndex++;
}

function finishGrounding() {
  let success = groundingHits >= GROUNDING_SUCCESS_THRESHOLD;
  if (success) {
    tensionMeter = max(0, tensionMeter - GROUNDING_TENSION_REWARD);
    groundingStabilityLeft = GROUNDING_STABILITY_TIME;
    groundingSuccessCount++; stats.groundingSuccesses++;
    score += SCORE_GROUNDING_BONUS * comboMultiplier;
    for (let b of beds) b.hasFalseAlert = false;
    groundingSlowLeft = GROUNDING_SLOW_DURATION;   // NEW — activate global drain slow
  } else {
    tensionMeter = max(0, tensionMeter - GROUNDING_PARTIAL_REWARD);
  }
  groundingCooldownLeft = GROUNDING_COOLDOWN;
  gameState = STATE.PLAYING;
}

// ============================================================
// TENSION / COMBO / SCORE / DIFFICULTY
// ============================================================
function updateTension(dt) {
  let activeAlerts = beds.filter(b => !b.isWilted && b.trueUrgency === 'critical').length;
  tensionMeter += activeAlerts * TENSION_RISE_ALERTS * dt * 0.3;
  if (!surgeActive && activeAlerts < 2) tensionMeter -= TENSION_DECAY * dt;
  if (groundingStabilityLeft > 0) {
    tensionMeter -= TENSION_DECAY * 2 * dt; groundingStabilityLeft -= dt;
  }
  tensionMeter = constrain(tensionMeter, 0, 100);
  if (tensionMeter >= 100) {
    tensionMeter = TENSION_OVERLOAD_RESET;
    comboMultiplier = max(1.0, comboMultiplier - 0.5);
  }
}

function updateCombo(dt) {
  let healthyCount = beds.filter(b => !b.isWilted && b.health > 40 && b.water > 30 && b.light > 30).length;
  if (healthyCount >= COMBO_THRESHOLD) {
    comboCount++;
    comboMultiplier = min(COMBO_MAX_MULTIPLIER, 1.0 + floor(comboCount / 60) * COMBO_MULTIPLIER_STEP);
  } else {
    if (comboCount > 0) { comboCount = max(0, comboCount - 3); if (comboCount === 0) comboMultiplier = 1.0; }
  }
  highestCombo = max(highestCombo, comboMultiplier);
  stats.peakCombo = highestCombo;
}

function updateScore(dt) {
  let healthyCount = beds.filter(b => !b.isWilted && b.health > 40).length;
  score += healthyCount * SCORE_PER_HEALTHY_SEC * comboMultiplier * dt;
}

function updateDifficulty() {
  let progress = (ROUND_DURATION - timer) / ROUND_DURATION;
  difficultyMult = 1.0 + progress * DRAIN_RAMP_FACTOR;
}

// ============================================================
// ACTIONS
// ============================================================
function doAction(type) {
  if (actionLockTimer > 0) return;
  let bed = beds[selectedBed];
  if (!bed || bed.isWilted) return;
  if (bed.isUncertainZone) tensionMeter += TENSION_RISE_UNCERTAIN;
  if (type === 'water' && waterCooldown <= 0) {
    bed.applyWater(); waterCooldown = ACTION_COOLDOWN;
    actionLockTimer = ACTION_LOCK_DURATION;
    spawnParticle(bed.x + bed.w/2, bed.y+10, COL.water, 'Water');
  } else if (type === 'light' && lightCooldown <= 0) {
    bed.applyLight(); lightCooldown = ACTION_COOLDOWN;
    actionLockTimer = ACTION_LOCK_DURATION;
    spawnParticle(bed.x + bed.w/2, bed.y+10, COL.light, 'Light');
  } else if (type === 'airflow' && airflowCooldown <= 0) {
    bed.applyAirflow(); airflowCooldown = AIRFLOW_COOLDOWN;
    spawnParticle(bed.x + bed.w/2, bed.y+10, COL.airflow, 'Airflow');
  }
}

function processInputQueue(dt) {
  for (let i = inputQueue.length - 1; i >= 0; i--) {
    inputQueue[i].delay -= dt;
    if (inputQueue[i].delay <= 0) { inputQueue[i].action(); inputQueue.splice(i, 1); }
  }
}

function queueAction(fn) {
  if (surgeActive) inputQueue.push({ action: fn, delay: SURGE_INPUT_DELAY });
  else fn();
}

// ============================================================
// WIN / LOSE / GRADE
// ============================================================
function checkEndConditions() {
  let wiltedCount = beds.filter(b => b.isWilted).length;
  if (wiltedCount >= LOSE_WILTED_COUNT) { gameState = STATE.LOSE; hideTitleVideo(); return; }
  if (timer <= 0) {
    let aliveCount = beds.filter(b => !b.isWilted).length;
    gameState = aliveCount >= WIN_MIN_ALIVE ? STATE.WIN : STATE.LOSE;
    hideTitleVideo();
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
    if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) return i;
  }
  return -1;
}

// ============================================================
// DRAW: TITLE SCREEN — video background + invisible hitboxes
// ============================================================
function drawTitle() {
  background(0);

  // Draw video frame (or fallback image, or solid background)
  if (titleVideo && titleVideoReady) {
    try {
      image(titleVideo, 0, 0, CANVAS_W, CANVAS_H);
    } catch (e) {
      drawTitleFallback();
    }
  } else {
    drawTitleFallback();
  }

  // Debug: show hitbox outlines when H is toggled
  if (debugShowHitboxes) {
    noFill();
    stroke(0, 255, 0);
    strokeWeight(2);
    rect(TITLE_START_BTN.x, TITLE_START_BTN.y, TITLE_START_BTN.w, TITLE_START_BTN.h);
    rect(TITLE_INSTR_BTN.x, TITLE_INSTR_BTN.y, TITLE_INSTR_BTN.w, TITLE_INSTR_BTN.h);
    noStroke();

    // Labels
    fill(0, 255, 0);
    textAlign(CENTER, CENTER);
    textSize(11);
    textStyle(NORMAL);
    text('START hitbox', TITLE_START_BTN.x + TITLE_START_BTN.w/2, TITLE_START_BTN.y - 10);
    text('INSTR hitbox', TITLE_INSTR_BTN.x + TITLE_INSTR_BTN.w/2, TITLE_INSTR_BTN.y - 10);
  }

  // Hover highlight (subtle glow over button area)
  if (!showInstructionsOverlay) {
    if (isInRect(mouseX, mouseY, TITLE_START_BTN)) {
      fill(255, 255, 255, 30);
      noStroke();
      rect(TITLE_START_BTN.x, TITLE_START_BTN.y, TITLE_START_BTN.w, TITLE_START_BTN.h, 8);
    }
    if (isInRect(mouseX, mouseY, TITLE_INSTR_BTN)) {
      fill(255, 255, 255, 30);
      noStroke();
      rect(TITLE_INSTR_BTN.x, TITLE_INSTR_BTN.y, TITLE_INSTR_BTN.w, TITLE_INSTR_BTN.h, 8);
    }
  }
}

// Fallback if video doesn't load: static image or old-style title
function drawTitleFallback() {
  if (titleFallbackImg) {
    image(titleFallbackImg, 0, 0, CANVAS_W, CANVAS_H);
  } else {
    // Original animated title background
    background(COL.bg[0], COL.bg[1], COL.bg[2]);
    let t = millis() / 1000;
    noStroke();
    for (let i = 0; i < 8; i++) {
      let x = CANVAS_W/2 + cos(t*0.3 + i*0.8) * 200;
      let y = CANVAS_H/2 + sin(t*0.4 + i*1.1) * 120;
      let r = 40 + sin(t*0.5 + i) * 15;
      fill(COL.accent[0], COL.accent[1], COL.accent[2], 15 + sin(t+i)*8);
      ellipse(x, y, r*2, r*2);
    }
    textAlign(CENTER, CENTER);
    textStyle(BOLD); textSize(52);
    fill(COL.accent[0], COL.accent[1], COL.accent[2]);
    text('Garden Circuit', CANVAS_W/2, CANVAS_H/2 - 120);
    textStyle(NORMAL); textSize(18);
    fill(COL.textSecondary[0], COL.textSecondary[1], COL.textSecondary[2]);
    text('Keep the greenhouse in balance', CANVAS_W/2, CANVAS_H/2 - 70);

    // Draw visible buttons in fallback mode
    stroke(COL.accent[0], COL.accent[1], COL.accent[2], 60);
    strokeWeight(1);
    line(CANVAS_W/2-120, CANVAS_H/2-45, CANVAS_W/2+120, CANVAS_H/2-45);
    noStroke();

    // Fallback visible buttons
    let btnW = 200, btnH = 48;
    let cx = CANVAS_W/2;
    drawStyledButton(cx - btnW/2, CANVAS_H/2 - 10, btnW, btnH, 'Start Game',
      isInRect(mouseX, mouseY, {x:cx-btnW/2, y:CANVAS_H/2-10, w:btnW, h:btnH}));
    drawStyledButton(cx - btnW/2, CANVAS_H/2 + 55, btnW, btnH, 'Instructions',
      isInRect(mouseX, mouseY, {x:cx-btnW/2, y:CANVAS_H/2+55, w:btnW, h:btnH}));
  }
}

// Helper: styled button drawing
function drawStyledButton(x, y, w, h, label, hovered) {
  fill(hovered ? COL.buttonHover : COL.buttonBg);
  stroke(COL.accent[0], COL.accent[1], COL.accent[2], 120);
  strokeWeight(1.5);
  rect(x, y, w, h, 6);
  fill(COL.buttonText); noStroke();
  textAlign(CENTER, CENTER); textSize(16); textStyle(BOLD);
  text(label, x + w/2, y + h/2);
}

// Helper: point in rect
function isInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

// ============================================================
// DRAW: INSTRUCTIONS OVERLAY (on top of title video)
// ============================================================
function drawInstructionsOverlay() {
  // Semi-transparent dark backdrop (leaves edges of title visible)
  fill(10, 14, 24, INSTR_OVERLAY_ALPHA);
  noStroke();
  rect(INSTR_OVERLAY_X, INSTR_OVERLAY_Y, INSTR_OVERLAY_W, INSTR_OVERLAY_H, 12);

  // Border
  noFill();
  stroke(COL.accent[0], COL.accent[1], COL.accent[2], 80);
  strokeWeight(2);
  rect(INSTR_OVERLAY_X, INSTR_OVERLAY_Y, INSTR_OVERLAY_W, INSTR_OVERLAY_H, 12);
  noStroke();

  let ox = INSTR_OVERLAY_X; // overlay origin
  let oy = INSTR_OVERLAY_Y;
  let cx = ox + INSTR_OVERLAY_W / 2;

  // Title
  textAlign(CENTER, TOP);
  textStyle(BOLD); textSize(26);
  fill(COL.accent[0], COL.accent[1], COL.accent[2]);
  text('How to Play', cx, oy + 18);

  textStyle(NORMAL); textAlign(LEFT, TOP);
  let lineH = 18;

  // Two-column layout inside the overlay
  let leftX = ox + 35;
  let rightX = cx + 20;
  let colStartY = oy + 60;

 // Left column
  let y = colStartY;
  let leftLines = [
    { t: '[ OBJECTIVE ]', s: 'h' },
    { t: 'Keep your 9 plants alive for 90 seconds.', s: 'n' },
    { t: 'Plants drain Water and Light over time.', s: 'n' },
    { t: 'If 3 plants die, you lose.', s: 'n' },
    { t: '', s: 'n' },
    { t: '[ CONTROLS ]', s: 'h' },
    { t: 'WASD / Arrows — Select a plant bed', s: 'n' },
    { t: 'Click — Select a bed directly', s: 'n' },
    { t: 'Q — Water        E — Light', s: 'n' },
    { t: 'R — Airflow (stabilizer, has cooldown)', s: 'n' },
    { t: 'Space — Grounding (coping routine)', s: 'n' },
    { t: 'P / Esc — Pause', s: 'sub' },
    { t: '', s: 'n' },
    { t: '[ SCORING ]', s: 'h' },
    { t: 'Keep 6+ beds healthy → Harmony combo', s: 'n' },
    { t: 'Restore dying plants → bonus points', s: 'n' },
    { t: 'Higher combo = higher score multiplier', s: 'n' },
  ];
  for (let line of leftLines) {
    applyLineStyle(line.s);
    text(line.t, leftX, y);
    y += lineH;
  }

 // Right column
  y = colStartY;
  let rightLines = [
    { t: '[ SURGES ]', s: 'h' },
    { t: 'Random disruptions that last a few seconds:', s: 'n' },
    { t: '  · False alerts appear on healthy plants', s: 'sub' },
    { t: '  · Controls get slightly delayed', s: 'sub' },
    { t: '  · Visual clutter increases', s: 'sub' },
    { t: 'Stay calm — they pass.', s: 'n' },
    { t: '', s: 'n' },
    { t: '[ UNCERTAIN ZONES ]', s: 'h' },
    { t: 'After a surge, some beds get marked.', s: 'n' },
    { t: 'Tending them raises your Tension faster.', s: 'n' },
    { t: 'Ignoring them lets plants suffer.', s: 'n' },
    { t: '', s: 'n' },
    { t: '[ GROUNDING ]', s: 'h' },
    { t: 'Press Space → match 3 rhythm beats.', s: 'n' },
    { t: 'Success: lowers Tension, slows drain,', s: 'n' },
    { t: 'and clears false alerts.', s: 'n' },
    { t: 'Has a cooldown — use wisely.', s: 'sub' },
    { t: '', s: 'n' },
    { t: '[ NOTE ]', s: 'h' },
    { t: 'This game uses symbolic mechanics to', s: 'n' },
    { t: 'respectfully represent disruption and coping.', s: 'n' },
    { t: 'It is not a literal simulation.', s: 'n' },
  ];
  for (let line of rightLines) {
    applyLineStyle(line.s);
    text(line.t, rightX, y);
    y += lineH;
  }

  // Divider line between columns
  stroke(COL.accent[0], COL.accent[1], COL.accent[2], 40);
  strokeWeight(1);
  line(cx + 5, colStartY, cx + 5, colStartY + 19 * lineH);
  noStroke();

  // Close button
  let cb = INSTR_CLOSE_BTN;
  // Adjust close button position relative to overlay
  let closeBtnX = ox + INSTR_OVERLAY_W - 200;
  let closeBtnY = oy + INSTR_OVERLAY_H - 60;
  let closeBtnW = 160;
  let closeBtnH = 44;

  let hovered = isInRect(mouseX, mouseY, {x:closeBtnX, y:closeBtnY, w:closeBtnW, h:closeBtnH});
  drawStyledButton(closeBtnX, closeBtnY, closeBtnW, closeBtnH, 'Close [Esc]', hovered);
}

// Helper: apply text style for instruction lines
function applyLineStyle(s) {
  if (s === 'h') {
    fill(COL.accent[0], COL.accent[1], COL.accent[2]);
    textStyle(BOLD); textSize(13);
  } else if (s === 'sub') {
    fill(COL.textSecondary[0], COL.textSecondary[1], COL.textSecondary[2]);
    textStyle(NORMAL); textSize(12);
  } else {
    fill(COL.textPrimary[0], COL.textPrimary[1], COL.textPrimary[2]);
    textStyle(NORMAL); textSize(13);
  }
}

// ============================================================
// DRAW: GAMEPLAY
// ============================================================
function drawGameplay() {
  if (!reducedEffects && surgeVisualIntensity > 0.1)
    translate(surgeJitterX * surgeVisualIntensity, surgeJitterY * surgeVisualIntensity);

  background(COL.bg[0], COL.bg[1], COL.bg[2]);

  if (surgeActive && !reducedEffects) {
    noStroke();
    fill(COL.surge[0], COL.surge[1], COL.surge[2], 15 + sin(millis()/80)*10);
    rect(0, 0, CANVAS_W, CANVAS_H);
    for (let i = 0; i < 3; i++) {
      fill(COL.surge[0], COL.surge[1], COL.surge[2], 30);
      textSize(12); textAlign(CENTER, CENTER);
      text('!', random(boardX, boardX+boardW), random(boardY, boardY+boardH));
    }
  }

  for (let bed of beds) drawBed(bed);

  if (beds[selectedBed]) {
    let sb = beds[selectedBed];
    noFill();
    stroke(COL.accent[0], COL.accent[1], COL.accent[2], 180 + sin(millis()/200)*60);
    strokeWeight(3);
    rect(sb.x-3, sb.y-3, sb.w+6, sb.h+6, 6);
    noStroke();
  }

  drawParticles();
  drawPanel();

  if (surgeActive) {
    fill(COL.surge[0], COL.surge[1], COL.surge[2], 180 + sin(millis()/100)*60);
    textAlign(CENTER, CENTER); textSize(20); textStyle(BOLD);
    text('⚡ SURGE ACTIVE ⚡', boardX + boardW/2, boardY - 3);
    textStyle(NORMAL);
  }

  if (actionLockTimer > 0) {
    noStroke(); fill(COL.bg[0], COL.bg[1], COL.bg[2], 30);
    rect(boardX, boardY, boardW, boardH);
  }
}

// ============================================================
// DRAW: PLANT BED (image fills box, bars at bottom over soil)
// ============================================================
function drawBed(bed) {
  let bx = bed.x, by = bed.y, bw = bed.w, bh = bed.h;

  // Background
  if (bed.isWilted) fill(COL.bedDead);
  else if (bed.isUncertainZone) {
    let s = sin(millis()/300 + bed.index)*10;
    fill(COL.bedUncertain[0]+s, COL.bedUncertain[1]+s, COL.bedUncertain[2]+s);
  } else fill(COL.bedNormal);

  if (bed.flashTimer > 0)
    fill(lerpColor(color(COL.bedNormal), color(COL.accent), (bed.flashTimer/0.3)*0.3));
  if (bed.restoreFlash > 0)
    fill(lerpColor(color(COL.bedNormal), color(100,255,150), (bed.restoreFlash/0.5)*0.4));

  stroke(60,70,60); strokeWeight(1);
  rect(bx, by, bw, bh, 4); noStroke();

  // Plant image (fills entire box)
  if (imagesLoaded) {
    let img = getPlantImage(bed.health);
    if (img) {
      push(); imageMode(CORNER);
      if (bed.isWilted) tint(80,50,50,200);
      image(img, bx+1, by+1, bw-2, bh-2);
      noTint(); pop();
    }
  } else {
    // Fallback icons
    if (bed.isWilted) {
      fill(COL.textSecondary[0],COL.textSecondary[1],COL.textSecondary[2],120);
      textAlign(CENTER,CENTER); textSize(28);
      text('✕', bx+bw/2, by+bh/2-10);
      textSize(12); text('Wilted', bx+bw/2, by+bh/2+18);
      return;
    }
    let hc = bed.health > 50 ? COL.health :
      [lerp(COL.healthLow[0],COL.health[0],bed.health/50),
       lerp(COL.healthLow[1],COL.health[1],bed.health/50),
       lerp(COL.healthLow[2],COL.health[2],bed.health/50)];
    fill(hc); textAlign(CENTER,CENTER); textSize(22);
    text(bed.health > 60 ? '❋' : bed.health > 30 ? '❊' : '✿', bx+bw/2, by+bh*0.35);
  }

  if (bed.isWilted) {
    fill(0,0,0,120); noStroke();
    rect(bx+1, by+bh-30, bw-2, 29, 0,0,4,4);
    fill(COL.textSecondary[0],COL.textSecondary[1],COL.textSecondary[2],220);
    textAlign(CENTER,CENTER); textSize(13); textStyle(BOLD);
    text('Wilted', bx+bw/2, by+bh-16); textStyle(NORMAL);
    return;
  }

  // Bars at bottom (over soil area)
  let barH = 6, barW = bw-16, barX = bx+8, barGap = 4, labelH = 10;
  let bottomPad = 6;
  let totalBarArea = 3*(barH+labelH+barGap);
  let barAreaTop = by + bh - bottomPad - totalBarArea;

  fill(0,0,0,140); noStroke();
  rect(bx+1, barAreaTop-4, bw-2, bh-(barAreaTop-by)+3, 0,0,4,4);

  let hc = bed.health > 50 ? COL.health :
    [lerp(COL.healthLow[0],COL.health[0],bed.health/50),
     lerp(COL.healthLow[1],COL.health[1],bed.health/50),
     lerp(COL.healthLow[2],COL.health[2],bed.health/50)];

  let curY = barAreaTop;

  // HP bar
  textSize(8); textStyle(BOLD); fill(hc); textAlign(LEFT,TOP);
  text('HP '+floor(bed.health), barX, curY); textStyle(NORMAL);
  curY += labelH;
  fill(20,25,20); rect(barX, curY, barW, barH, 2);
  fill(hc); rect(barX, curY, barW*bed.health/100, barH, 2);
  curY += barH + barGap;

  // Water bar
  textSize(8); fill(COL.water); textAlign(LEFT,TOP);
  text('💧 '+floor(bed.water), barX, curY); curY += labelH;
  fill(20,25,35); rect(barX, curY, barW, barH, 2);
  fill(COL.water); rect(barX, curY, barW*bed.water/100, barH, 2);
  curY += barH + barGap;

  // Light bar
  textSize(8); fill(COL.light); textAlign(LEFT,TOP);
  text('☀ '+floor(bed.light), barX, curY);
  if (bed.airflowActive) {
    fill(COL.airflow[0],COL.airflow[1],COL.airflow[2],200);
    textAlign(RIGHT,TOP); text('🌬'+floor(bed.airflowTimer)+'s', barX+barW, curY);
    textAlign(LEFT,TOP);
  }
  curY += labelH;
  fill(20,25,20); rect(barX, curY, barW, barH, 2);
  fill(COL.light); rect(barX, curY, barW*bed.light/100, barH, 2);

  // Overlays
  if (surgeActive && !reducedEffects && random() < 0.15) {
    fill(COL.surge[0],COL.surge[1],COL.surge[2],50); noStroke();
    rect(bx, by, bw, bh, 4);
  }

  if (bed.hasFalseAlert && !bed.isWilted) {
    fill(COL.falseAlert[0],COL.falseAlert[1],COL.falseAlert[2], 160+sin(millis()/150)*60);
    textAlign(RIGHT,TOP); textSize(16); text('⚠', bx+bw-4, by+4);
  } else if (bed.displayUrgency === 'critical') {
    fill(COL.healthLow[0],COL.healthLow[1],COL.healthLow[2],180);
    textAlign(RIGHT,TOP); textSize(14); text('!!', bx+bw-6, by+4);
  } else if (bed.displayUrgency === 'warning') {
    fill(COL.light[0],COL.light[1],COL.light[2],140);
    textAlign(RIGHT,TOP); textSize(13); text('!', bx+bw-6, by+6);
  }

  if (bed.isUncertainZone) {
    noFill();
    stroke(COL.bedUncertain[0]+40,COL.bedUncertain[1]+40,COL.bedUncertain[2]+40,
      100+sin(millis()/400+bed.index)*50);
    strokeWeight(2); rect(bx+2, by+2, bw-4, bh-4, 3); noStroke();
    fill(180,160,220,180); textAlign(LEFT,TOP); textSize(8);
    text('uncertain', bx+5, by+5);
  }

  fill(COL.textSecondary[0],COL.textSecondary[1],COL.textSecondary[2],80);
  textAlign(LEFT,TOP); textSize(8);
  text('#'+(bed.index+1), bx+4, by+(bed.isUncertainZone ? 15 : 4));
}

// ============================================================
// SIDE PANEL
// ============================================================
function drawPanel() {
  fill(COL.panelBg); stroke(50,60,50); strokeWeight(1);
  rect(panelX, 0, PANEL_WIDTH, CANVAS_H); noStroke();

  let px = panelX+20, py = 20, pw = PANEL_WIDTH-40;

  textAlign(LEFT,TOP); textStyle(BOLD); textSize(13);
  fill(COL.textSecondary); text('TIME', px, py);
  textSize(30);
  fill(timer < 15 ? COL.healthLow : COL.textPrimary);
  text(floor(timer)+'s', px, py+16); py += 60;

  textSize(13); fill(COL.textSecondary); text('SCORE', px, py);
  textSize(24); fill(COL.textPrimary); text(floor(score), px, py+16); py += 52;

  textSize(13); fill(COL.combo);
  text('HARMONY  x'+nf(comboMultiplier,1,1), px, py); py += 20;
  fill(30,30,20); rect(px, py, pw, 8, 3);
  fill(COL.combo); rect(px, py, pw*((comboMultiplier-1)/(COMBO_MAX_MULTIPLIER-1)), 8, 3);
  py += 24;

  textSize(13); fill(COL.textSecondary); text('TENSION', px, py); py += 18;
  fill(30,25,25); rect(px, py, pw, 14, 4);
  let tc = tensionMeter<30 ? [80,180,120] : tensionMeter<60 ? [200,180,60] :
           tensionMeter<80 ? [220,120,50] : [200,60,60];
  fill(tc); rect(px, py, pw*tensionMeter/100, 14, 4);
  fill(COL.textPrimary); textAlign(CENTER,CENTER); textSize(10);
  text(floor(tensionMeter), px+pw/2, py+7);
  textAlign(LEFT,TOP); py += 30;

  textSize(13);
  if (surgeActive) { fill(COL.surge); textStyle(BOLD); text('⚡ SURGE ACTIVE', px, py); textStyle(NORMAL); }
  else { fill(COL.textSecondary); text('System Stable', px, py); }
  py += 28;

  textSize(13); fill(COL.grounding); text('GROUNDING', px, py); py += 18;
  if (groundingCooldownLeft > 0) {
    fill(COL.textSecondary); textSize(12);
    text('Cooldown: '+floor(groundingCooldownLeft)+'s', px, py); py += 16;
    fill(30,30,30); rect(px, py, pw, 8, 3);
    fill(COL.grounding[0],COL.grounding[1],COL.grounding[2],120);
    rect(px, py, pw*(1-groundingCooldownLeft/GROUNDING_COOLDOWN), 8, 3);
  } else {
    fill(COL.grounding); textSize(13); textStyle(BOLD);
    text('Ready [SPACE]', px, py); textStyle(NORMAL); py += 16;
  }
  py += 24;

  stroke(60,70,60,80); strokeWeight(1); line(px, py, px+pw, py); noStroke(); py += 14;

  let sb = beds[selectedBed];
  textSize(13); fill(COL.textSecondary);
  text('SELECTED BED #'+(selectedBed+1), px, py); py += 20;

  if (sb && !sb.isWilted) {
    textSize(12);
    fill(COL.textPrimary); text('Health: '+floor(sb.health), px, py); py += 16;
    fill(COL.water); text('Water:  '+floor(sb.water), px, py); py += 16;
    fill(COL.light); text('Light:  '+floor(sb.light), px, py); py += 16;
    if (sb.airflowActive) { fill(COL.airflow); text('Airflow: '+nf(sb.airflowTimer,1,1)+'s', px, py); }
    if (sb.isUncertainZone) { fill(180,160,220); py += 16; text('⬡ Uncertain Zone', px, py); }
  } else if (sb && sb.isWilted) {
    fill(COL.healthLow); textSize(12); text('This plant has wilted.', px, py);
  }
  py += 30;

  drawActionButtons(px, py, pw);

  let wc = beds.filter(b => b.isWilted).length;
  textAlign(LEFT,BOTTOM); textSize(12);
  fill(wc >= LOSE_WILTED_COUNT-1 ? COL.healthLow : COL.textSecondary);
  text('Wilted: '+wc+' / '+LOSE_WILTED_COUNT+' max', px, CANVAS_H-38);
  textSize(10); fill(COL.textSecondary[0],COL.textSecondary[1],COL.textSecondary[2],100);
  text('Esc/P=Pause  V=Effects  H=Hitboxes', px, CANVAS_H-18);
}

// ============================================================
// ACTION BUTTONS
// ============================================================
let actionBtns = [];

function drawActionButtons(px, py, pw) {
  let btnW = pw, btnH = 32, gap = 8;
  if (actionBtns.length === 0) {
    actionBtns.push(new Button(px, py, btnW, btnH, '💧 Water  [Q]', () => queueAction(() => doAction('water')), 'water'));
    actionBtns.push(new Button(px, py+btnH+gap, btnW, btnH, '☀ Light  [E]', () => queueAction(() => doAction('light')), 'light'));
    actionBtns.push(new Button(px, py+2*(btnH+gap), btnW, btnH, '🌬 Airflow  [R]', () => queueAction(() => doAction('airflow')), 'airflow'));
    actionBtns.push(new Button(px, py+3*(btnH+gap), btnW, btnH, '◉ Ground  [SPACE]', () => startGrounding(), 'ground'));
  }
  actionBtns[0].y = py;
  actionBtns[1].y = py + btnH + gap;
  actionBtns[2].y = py + 2*(btnH+gap);
  actionBtns[3].y = py + 3*(btnH+gap);

  for (let btn of actionBtns) {
    btn.checkHover(mouseX, mouseY);
    let available = true;
    if (btn.id === 'water') available = waterCooldown <= 0;
    if (btn.id === 'light') available = lightCooldown <= 0;
    if (btn.id === 'airflow') available = airflowCooldown <= 0;
    if (btn.id === 'ground') available = groundingCooldownLeft <= 0 && gameState === STATE.PLAYING;
    if (actionLockTimer > 0) available = false;

    if (!available) {
      fill(35,40,38); stroke(50,55,50); strokeWeight(1);
      rect(btn.x, btn.y, btn.w, btn.h, 6); noStroke();
      fill(COL.textSecondary[0],COL.textSecondary[1],COL.textSecondary[2],100);
      textAlign(CENTER,CENTER); textSize(14);
      text(btn.label, btn.x+btn.w/2, btn.y+btn.h/2);
    } else btn.draw();
  }
}

// ============================================================
// DRAW: GROUNDING MINI-GAME OVERLAY
// ============================================================
function drawGrounding() {
  fill(COL.bg[0],COL.bg[1],COL.bg[2],200);
  rect(0,0,CANVAS_W,CANVAS_H);
  let cx = CANVAS_W/2, cy = CANVAS_H/2;

  fill(COL.grounding); textAlign(CENTER,CENTER);
  textStyle(BOLD); textSize(24);
  text('Grounding Routine', cx, cy-140); textStyle(NORMAL);

  textSize(14); fill(COL.textSecondary);
  text('Press SPACE when the circle is largest', cx, cy-110);
  textSize(11); fill(COL.textSecondary[0],COL.textSecondary[1],COL.textSecondary[2],150);
  text('(generous timing — just match the rhythm)', cx, cy-92);

  let beatPhase;
  if (groundingBeatIndex < GROUNDING_BEATS && !groundingComplete) {
    let dist = groundingBeats[groundingBeatIndex].time - groundingTimer;
    beatPhase = 1.0 - constrain(abs(dist)/(GROUNDING_BEAT_INTERVAL*0.5), 0, 1);
  } else beatPhase = 0.5;

  let radius = 30 + beatPhase*60;
  noFill();
  stroke(COL.grounding[0],COL.grounding[1],COL.grounding[2],80);
  strokeWeight(2); ellipse(cx, cy, 180, 180);

  if (groundingBeatIndex < GROUNDING_BEATS && !groundingComplete) {
    stroke(COL.grounding[0],COL.grounding[1],COL.grounding[2],40);
    strokeWeight(1); ellipse(cx, cy, 160, 160);
  }

  let alpha = 120 + beatPhase*135;
  fill(COL.grounding[0],COL.grounding[1],COL.grounding[2],alpha);
  stroke(COL.grounding[0],COL.grounding[1],COL.grounding[2],200);
  strokeWeight(2); ellipse(cx, cy, radius*2, radius*2); noStroke();

  for (let i = 0; i < GROUNDING_BEATS; i++) {
    let bx = cx - 40 + i*40, by = cy+120;
    if (groundingBeats[i]?.result === 'hit') fill(COL.grounding);
    else if (groundingBeats[i]?.result && groundingBeats[i].result !== '') fill(COL.healthLow[0],COL.healthLow[1],COL.healthLow[2],150);
    else if (i === groundingBeatIndex) fill(COL.textPrimary[0],COL.textPrimary[1],COL.textPrimary[2],180+sin(millis()/200)*60);
    else fill(COL.textSecondary[0],COL.textSecondary[1],COL.textSecondary[2],80);
    ellipse(bx, by, 20, 20);
  }

  fill(COL.textSecondary[0],COL.textSecondary[1],COL.textSecondary[2],140);
  textSize(11); text(groundingHits+'/'+GROUNDING_SUCCESS_THRESHOLD+' needed', cx, cy+150);

  if (groundingFeedbackTimer > 0 && groundingFeedback) {
    let fc = groundingFeedback==='Perfect!' ? COL.combo : groundingFeedback==='Steady!' ? COL.grounding : COL.falseAlert;
    fill(fc[0],fc[1],fc[2],groundingFeedbackTimer/0.6*255);
    textSize(20); textStyle(BOLD); text(groundingFeedback, cx, cy+80); textStyle(NORMAL);
  }

  if (groundingComplete) {
    let success = groundingHits >= GROUNDING_SUCCESS_THRESHOLD;
    if (success) { fill(COL.grounding); textSize(22); textStyle(BOLD); text('Grounded — Clarity Restored', cx, cy-170); }
    else { fill(COL.textSecondary); textSize(18); text('Partial focus — keep going', cx, cy-170); }
    textStyle(NORMAL);
  }
}

// ============================================================
// DRAW: PAUSE MENU — overlay with Resume / Restart / Main Menu
// ============================================================
let pauseButtons = [];

function initPauseButtons() {
  pauseButtons = [];
  let cx = CANVAS_W / 2;
  let startY = CANVAS_H / 2 - 40;

  pauseButtons.push(new Button(cx - PAUSE_BTN_W/2, startY, PAUSE_BTN_W, PAUSE_BTN_H,
    'Resume', () => { gameState = STATE.PLAYING; }, 'pause_resume'));

  pauseButtons.push(new Button(cx - PAUSE_BTN_W/2, startY + PAUSE_BTN_H + PAUSE_BTN_GAP, PAUSE_BTN_W, PAUSE_BTN_H,
    'Restart', () => { actionBtns = []; initGame(); gameState = STATE.PLAYING; }, 'pause_restart'));

  pauseButtons.push(new Button(cx - PAUSE_BTN_W/2, startY + 2*(PAUSE_BTN_H + PAUSE_BTN_GAP), PAUSE_BTN_W, PAUSE_BTN_H,
    'Back to Main Menu', () => {
      actionBtns = [];
      initGame();           // reset all game state
      gameState = STATE.TITLE;
      showInstructionsOverlay = false;
      showTitleVideo();      // restart the title video
    }, 'pause_menu'));
}

function drawPause() {
  // Darken gameplay underneath
  fill(COL.bg[0], COL.bg[1], COL.bg[2], 190);
  rect(0, 0, CANVAS_W, CANVAS_H);

  textAlign(CENTER, CENTER);
  textStyle(BOLD); textSize(36);
  fill(COL.textPrimary);
  text('PAUSED', CANVAS_W/2, CANVAS_H/2 - 110);
  textStyle(NORMAL); textSize(14);
  fill(COL.textSecondary);
  text('Press Esc or P to resume', CANVAS_W/2, CANVAS_H/2 - 75);

  // Draw pause menu buttons
  for (let btn of pauseButtons) {
    btn.visible = true;
    btn.checkHover(mouseX, mouseY);
    btn.draw();
  }
}

// ============================================================
// DRAW: WIN / LOSE SCREENS
// ============================================================
function drawWin() {
  background(COL.bg); let cx = CANVAS_W/2;
  let t = millis()/1000; noStroke();
  for (let i = 0; i < 12; i++) {
    fill(COL.accent[0],COL.accent[1],COL.accent[2],12);
    ellipse(cx+cos(t*0.2+i*0.5)*300, CANVAS_H/2+sin(t*0.3+i*0.7)*200, 60, 60);
  }
  textAlign(CENTER,CENTER); textStyle(BOLD); textSize(42);
  fill(COL.accent); text('Greenhouse Stabilized', cx, 100);
  textStyle(NORMAL); textSize(18); fill(COL.textSecondary);
  text('You kept the garden in balance.', cx, 150);
  textSize(60); textStyle(BOLD); fill(COL.combo);
  text(computeGrade(), cx, 230); textStyle(NORMAL);
  drawEndStats(cx, 290);
}

function drawLose() {
  background(COL.bg); let cx = CANVAS_W/2;
  textAlign(CENTER,CENTER); textStyle(BOLD); textSize(36);
  fill(COL.textPrimary); text('The Garden Faded', cx, 100);
  textStyle(NORMAL); textSize(16); fill(COL.textSecondary);
  text('Too many plants were lost — but every attempt is practice.', cx, 145);
  text('Adjust your strategy and try again.', cx, 168);
  drawEndStats(cx, 230);
}

function drawEndStats(cx, y) {
  let lh = 30; textSize(16); textAlign(CENTER,CENTER);
  fill(COL.textPrimary); text('Score: '+floor(score), cx, y); y += lh;
  fill(COL.combo); text('Best Harmony: x'+nf(stats.peakCombo,1,1), cx, y); y += lh;
  fill(COL.surge); text('Surges Survived: '+stats.surgesSurvived, cx, y); y += lh;
  fill(COL.grounding); text('Grounding: '+stats.groundingSuccesses+' / '+stats.groundingAttempts+' successful', cx, y); y += lh;
  fill(COL.accent); text('Plants Restored: '+stats.totalRestores, cx, y); y += lh;
  fill(COL.healthLow); text('Plants Wilted: '+stats.plantsWilted, cx, y);
}

// ============================================================
// P5 SETUP
// ============================================================
function setup() {
  createCanvas(CANVAS_W, CANVAS_H);
  textFont('monospace');
  checkImagesLoaded();
  initTitleVideo();      // CHANGE — load title video
  initGame();
  initEndButtons();
  initPauseButtons();    // CHANGE — create pause menu buttons
}

// ============================================================
// END-SCREEN BUTTONS (win/lose)
// ============================================================
let endButtons = [];

function initEndButtons() {
  endButtons = [];
  let cx = CANVAS_W/2, btnW = 200, btnH = 48;

  endButtons.push(new Button(cx - btnW/2, CANVAS_H - 120, btnW, btnH, 'Play Again', () => {
    actionBtns = []; initGame(); gameState = STATE.PLAYING; hideTitleVideo();
  }, 'end_restart'));

  endButtons.push(new Button(cx - btnW/2, CANVAS_H - 60, btnW, btnH, 'Title Screen', () => {
    actionBtns = []; initGame();
    gameState = STATE.TITLE; showInstructionsOverlay = false;
    showTitleVideo();
  }, 'end_title'));
}

// ============================================================
// DRAW LOOP
// ============================================================
function draw() {
  let dt = min(deltaTime / 1000, 0.05);

  switch (gameState) {
    case STATE.TITLE:
      drawTitle();
      // Draw instructions overlay on top if active
      if (showInstructionsOverlay) drawInstructionsOverlay();
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
      for (let btn of endButtons) { btn.visible = true; btn.checkHover(mouseX, mouseY); btn.draw(); }
      break;

    case STATE.LOSE:
      drawLose();
      for (let btn of endButtons) { btn.visible = true; btn.checkHover(mouseX, mouseY); btn.draw(); }
      break;

    case STATE.PAUSED:
      drawGameplay(); // frozen gameplay underneath
      drawPause();
      break;
  }
}

// ============================================================
// GAME UPDATE
// ============================================================
function updateGame(dt) {
  timer -= dt; timer = max(0, timer);
  updateDifficulty();
  if (waterCooldown > 0) waterCooldown -= dt;
  if (lightCooldown > 0) lightCooldown -= dt;
  if (airflowCooldown > 0) airflowCooldown -= dt;
  if (groundingCooldownLeft > 0) groundingCooldownLeft -= dt;
  if (actionLockTimer > 0) actionLockTimer -= dt;
  if (groundingSlowLeft > 0) groundingSlowLeft -= dt;   // NEW — tick down grounding slow
  processInputQueue(dt);
  for (let bed of beds) bed.update(dt);
  updateSurge(dt); updateTension(dt);
  updateCombo(dt); updateScore(dt);
  updateParticles(dt); checkEndConditions();
}

// ============================================================
// INPUT: KEYBOARD
// ============================================================
function keyPressed() {
  // Global toggles
  if (key === 'v' || key === 'V') { reducedEffects = !reducedEffects; return; }
  if (key === 'h' || key === 'H') { debugShowHitboxes = !debugShowHitboxes; return; }

  switch (gameState) {
    case STATE.TITLE:
      // CHANGE — Esc / I close the instructions overlay
      if (showInstructionsOverlay) {
        if (keyCode === ESCAPE || key === 'i' || key === 'I') {
          showInstructionsOverlay = false;
        }
        return; // don't process other title keys while overlay is open
      }
      // Start game with Enter/Space
      if (keyCode === ENTER || key === ' ') {
        initGame(); gameState = STATE.PLAYING; hideTitleVideo();
      }
      if (key === 'i' || key === 'I') showInstructionsOverlay = true;
      break;

    case STATE.PLAYING:
      // CHANGE — Esc also pauses (in addition to P)
      if (keyCode === ESCAPE) { gameState = STATE.PAUSED; return; }
      handlePlayingInput();
      break;

    case STATE.GROUNDING:
      if (key === ' ') groundingInput();
      break;

    case STATE.WIN:
    case STATE.LOSE:
      if (keyCode === ENTER || key === ' ') {
        actionBtns = []; initGame(); gameState = STATE.PLAYING; hideTitleVideo();
      }
      if (keyCode === ESCAPE) {
        actionBtns = []; initGame(); gameState = STATE.TITLE;
        showInstructionsOverlay = false; showTitleVideo();
      }
      break;

    case STATE.PAUSED:
      // CHANGE — Esc or P to resume
      if (key === 'p' || key === 'P' || keyCode === ESCAPE) gameState = STATE.PLAYING;
      break;
  }
}

function handlePlayingInput() {
  let col = selectedBed % GRID_COLS;
  let row = floor(selectedBed / GRID_COLS);
  if (key === 'w' || key === 'W' || keyCode === UP_ARROW) row = max(0, row-1);
  if (key === 's' || key === 'S' || keyCode === DOWN_ARROW) row = min(GRID_ROWS-1, row+1);
  if (key === 'a' || key === 'A' || keyCode === LEFT_ARROW) col = max(0, col-1);
  if (key === 'd' || key === 'D' || keyCode === RIGHT_ARROW) col = min(GRID_COLS-1, col+1);
  selectedBed = row * GRID_COLS + col;

  if (key === 'q' || key === 'Q') queueAction(() => doAction('water'));
  if (key === 'e' || key === 'E') queueAction(() => doAction('light'));
  if (key === 'r' || key === 'R') queueAction(() => doAction('airflow'));
  if (key === ' ') startGrounding();
  if (key === 'p' || key === 'P') gameState = STATE.PAUSED;
}

// ============================================================
// INPUT: MOUSE
// ============================================================
function mousePressed() {
  switch (gameState) {
    case STATE.TITLE:
      if (showInstructionsOverlay) {
        // Check close button inside overlay
        let closeBtnX = INSTR_OVERLAY_X + INSTR_OVERLAY_W - 200;
        let closeBtnY = INSTR_OVERLAY_Y + INSTR_OVERLAY_H - 60;
        if (isInRect(mouseX, mouseY, {x:closeBtnX, y:closeBtnY, w:160, h:44})) {
          showInstructionsOverlay = false;
        }
        // Block clicks from reaching title buttons while overlay is open
        return;
      }
      // Check title screen hitboxes
      if (isInRect(mouseX, mouseY, TITLE_START_BTN)) {
        initGame(); gameState = STATE.PLAYING; hideTitleVideo();
      } else if (isInRect(mouseX, mouseY, TITLE_INSTR_BTN)) {
        showInstructionsOverlay = true;
      }
      break;

    case STATE.PLAYING:
      for (let btn of actionBtns) { if (btn.checkClick(mouseX, mouseY)) return; }
      let idx = getBedAtMouse(mouseX, mouseY);
      if (idx >= 0) selectedBed = idx;
      break;

    case STATE.WIN:
    case STATE.LOSE:
      for (let btn of endButtons) { if (btn.checkClick(mouseX, mouseY)) return; }
      break;

    case STATE.PAUSED:
      for (let btn of pauseButtons) { if (btn.checkClick(mouseX, mouseY)) return; }
      break;
  }
}

// Prevent scroll on arrow keys and space
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', function(e) {
    if ([32,37,38,39,40].includes(e.keyCode)) e.preventDefault();
  });
}