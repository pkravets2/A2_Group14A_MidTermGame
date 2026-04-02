// ============================================================
// GARDEN CIRCUIT v2 — p5.js Multi-Level Progression
// A real-time greenhouse management game with symbolic
// mechanics representing disruption, uncertainty, and coping.
// ============================================================

// ============================================================
// TUNING CONSTANTS — edit these to balance difficulty
// ============================================================

const CANVAS_W = 1100;
const CANVAS_H = 750;

// Round / timing
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
const ACTION_LOCK_DURATION = 0.14;

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

// Plant image thresholds
const PLANT_IMG_GOOD_MIN = 67;
const PLANT_IMG_OKAY_MIN = 34;
const PLANT_IMG_BAD_MIN = 1;

// Scoring
const SCORE_PER_HEALTHY_SEC = 1;
const SCORE_RESTORE_BONUS = 15;
const SCORE_SURGE_SURVIVE = 20;
const COMBO_THRESHOLD = 6;
const COMBO_MULTIPLIER_STEP = 0.1;
const COMBO_MAX_MULTIPLIER = 3.0;

// Difficulty ramp
const DRAIN_RAMP_FACTOR = 0.5;
const SURGE_FREQ_RAMP = 0.6;

// Visual
const BED_MARGIN = 12;
const PANEL_WIDTH = 260;

// ============================================================
// LEVEL CONFIGURATION
// ============================================================
const LEVELS = [
  { level: 1, cols: 2, rows: 1, duration: 30, drainMult: 0.7, surgeMult: 0,    label: 'Level 1' },
  { level: 2, cols: 2, rows: 2, duration: 30, drainMult: 0.8, surgeMult: 0.5,  label: 'Level 2' },
  { level: 3, cols: 3, rows: 2, duration: 35, drainMult: 0.9, surgeMult: 0.7,  label: 'Level 3' },
  { level: 4, cols: 3, rows: 2, duration: 45, drainMult: 1.0, surgeMult: 0.85, label: 'Level 4' },
  { level: 5, cols: 3, rows: 3, duration: 60, drainMult: 1.1, surgeMult: 1.0,  label: 'Level 5' },
  { level: 6, cols: 4, rows: 3, duration: 90, drainMult: 1.3, surgeMult: 1.2,  label: 'Final Level' },
];

// ============================================================
// TITLE SCREEN CONSTANTS
// ============================================================
const TITLE_VIDEO_FILE = 'assets/title.mp4';
const TITLE_FALLBACK_IMG = 'assets/title_bg.png';

const TITLE_START_BTN = { x: 300, y: 595, w: 250, h: 95 };
const TITLE_INSTR_BTN = { x: 580, y: 595, w: 280, h: 95 };

// Instructions overlay layout
const INSTR_OVERLAY_X = 60;
const INSTR_OVERLAY_Y = 40;
const INSTR_OVERLAY_W = 980;
const INSTR_OVERLAY_H = 660;
const INSTR_OVERLAY_ALPHA = 240;
const INSTR_CLOSE_BTN = { x: 820, y: 620, w: 160, h: 44 };

// Pause menu layout
const PAUSE_BTN_W = 220;
const PAUSE_BTN_H = 48;
const PAUSE_BTN_GAP = 16;

// Debug
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
  combo:       [240, 200, 80],
  accent:      [100, 200, 150],
  falseAlert:  [220, 130, 60],
  buttonBg:    [50, 70, 60],
  buttonHover: [70, 100, 80],
  buttonText:  [230, 240, 230],
  // Per-action button colors
  waterBtn:     [35, 50, 75],
  waterBtnHov:  [50, 70, 110],
  lightBtn:     [70, 60, 30],
  lightBtnHov:  [100, 85, 40],
  airflowBtn:   [35, 60, 70],
  airflowBtnHov:[50, 85, 100],
};

// ============================================================
// GAME STATES
// ============================================================
const STATE = {
  TITLE: 'title',
  TUTORIAL: 'tutorial',
  COUNTDOWN: 'countdown',
  PLAYING: 'playing',
  LEVEL_COMPLETE: 'level_complete',
  CONGRATS: 'congrats',
  WIN: 'win',
  LOSE: 'lose',
  PAUSED: 'paused',
};

let gameState = STATE.TITLE;
let prevState = STATE.TITLE;

let showInstructionsOverlay = false;

// ============================================================
// LEVEL STATE
// ============================================================
let currentLevel = 0;
let levelConfig = LEVELS[0];
let currentGridCols = 2;
let currentGridRows = 1;
let currentLoseThreshold = 1;

// Game variables
let beds = [];
let selectedBed = 0;
let timer = 30;
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
  plantsWilted: 0,
  peakCombo: 0,
  totalRestores: 0,
};

let difficultyMult = 1.0;
let reducedEffects = false;

// ============================================================
// TUTORIAL STATE
// ============================================================
let tutorialActive = false;
let tutorialStep = 0;
let tutorialDrainEnabled = false;
let tutorialCompleted = false;

const TUTORIAL_STEPS = [
  { id: 'welcome',  text: 'Welcome to Garden Circuit! Keep these plants alive.', hint: 'Click to continue', highlight: 'board', advanceOn: 'click' },
  { id: 'bars',     text: 'Each plant has Health, Water, and Light. Watch them drain.', hint: 'Click to continue', highlight: 'beds', advanceOn: 'click', enableDrain: true },
  { id: 'select',   text: 'Click a plant or use WASD to select it.', hint: 'Select a plant', highlight: 'beds', advanceOn: 'select' },
  { id: 'water',    text: 'Press Q or click Water to hydrate the selected plant.', hint: 'Press Q to water', highlight: 'water_btn', advanceOn: 'water' },
  { id: 'light',    text: 'Press E or click Light to brighten the selected plant.', hint: 'Press E for light', highlight: 'light_btn', advanceOn: 'light' },
  { id: 'airflow',  text: 'Press R for Airflow \u2014 slows drain temporarily. Has a cooldown.', hint: 'Press R for airflow', highlight: 'airflow_btn', advanceOn: 'airflow' },
  { id: 'ready',    text: 'Keep plants alive until time runs out. Good luck!', hint: 'Click to continue', highlight: null, advanceOn: 'click' },
];

// ============================================================
// COUNTDOWN STATE
// ============================================================
let countdownTimer = 0;
let countdownPhase = 0; // 0=3, 1=2, 2=1, 3=GO!, 4=done

// ============================================================
// SOUND SYSTEM
// ============================================================
let soundMuted = false;
let soundInitialized = false;

function initSound() {
  soundInitialized = true;
}

function playTone(freq, duration, vol, type) {
  if (soundMuted || !soundInitialized) return;
  try {
    let osc = new p5.Oscillator(type || 'sine');
    osc.freq(freq);
    osc.amp(vol || 0.05);
    osc.start();
    setTimeout(() => { try { osc.stop(); } catch(e) {} }, duration || 100);
  } catch(e) {}
}

function playSoundWater() { playTone(440, 100, 0.04); }
function playSoundLight() { playTone(650, 100, 0.04); }
function playSoundAirflow() { playTone(200, 150, 0.03); }
function playSoundSurgeStart() { playTone(160, 200, 0.06); }
function playSoundSurgeEnd() { playTone(500, 100, 0.04); }
function playSoundCountdownTick() { playTone(300, 80, 0.04); }
function playSoundCountdownGo() { playTone(500, 120, 0.05); }

function playSoundLevelComplete() {
  if (soundMuted || !soundInitialized) return;
  try {
    let notes = [400, 500, 600];
    notes.forEach((f, i) => {
      setTimeout(() => playTone(f, 100, 0.05), i * 120);
    });
  } catch(e) {}
}

function playSoundLose() {
  if (soundMuted || !soundInitialized) return;
  try {
    playTone(400, 150, 0.05);
    setTimeout(() => playTone(300, 150, 0.05), 170);
  } catch(e) {}
}

// ============================================================
// TITLE VIDEO + PLANT IMAGE VARIABLES
// ============================================================
let titleVideo = null;
let titleVideoReady = false;
let titleFallbackImg = null;

let plantGoodImg = null;
let plantOkayImg = null;
let plantBadImg = null;
let plantDeadImg = null;
let imagesLoaded = false;

// ============================================================
// PRELOAD
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
  try {
    titleFallbackImg = loadImage(TITLE_FALLBACK_IMG, () => {}, () => { titleFallbackImg = null; });
  } catch (e) {
    titleFallbackImg = null;
  }
}

function checkImagesLoaded() {
  imagesLoaded = (plantGoodImg !== null && plantOkayImg !== null &&
                  plantBadImg !== null && plantDeadImg !== null);
  if (!imagesLoaded) console.warn('One or more plant images missing \u2014 using fallback shapes.');
}

function getPlantImage(health) {
  if (health <= 0) return plantDeadImg;
  if (health < PLANT_IMG_OKAY_MIN) return plantBadImg;
  if (health < PLANT_IMG_GOOD_MIN) return plantOkayImg;
  return plantGoodImg;
}

// ============================================================
// TITLE VIDEO SETUP
// ============================================================
function initTitleVideo() {
  try {
    titleVideo = createVideo(TITLE_VIDEO_FILE);
    titleVideo.hide();
    titleVideo.volume(0);
    titleVideo.loop();
    titleVideoReady = true;
  } catch (e) {
    console.warn('Title video could not be loaded, using fallback.', e);
    titleVideo = null;
    titleVideoReady = false;
  }
}

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
    let drainMult = difficultyMult * levelConfig.drainMult;
    if (this.airflowActive) drainMult *= AIRFLOW_DRAIN_REDUCTION;

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
  bedW = (boardW - BED_MARGIN * (currentGridCols + 1)) / currentGridCols;
  bedH = (boardH - BED_MARGIN * (currentGridRows + 1)) / currentGridRows;
  for (let bed of beds) {
    bed.x = boardX + BED_MARGIN + bed.col * (bedW + BED_MARGIN);
    bed.y = boardY + BED_MARGIN + bed.row * (bedH + BED_MARGIN);
    bed.w = bedW; bed.h = bedH;
  }
}

// ============================================================
// INIT GAME — accepts level index
// ============================================================
function initGame(lvlIndex) {
  if (lvlIndex === undefined) lvlIndex = 0;
  currentLevel = lvlIndex;
  levelConfig = LEVELS[currentLevel];
  currentGridCols = levelConfig.cols;
  currentGridRows = levelConfig.rows;

  // Calculate lose threshold: ~30% of beds, min 1
  let totalBeds = currentGridCols * currentGridRows;
  currentLoseThreshold = max(1, floor(totalBeds * 0.3));

  beds = [];
  for (let r = 0; r < currentGridRows; r++)
    for (let c = 0; c < currentGridCols; c++)
      beds.push(new PlantBed(c, r, r * currentGridCols + c));
  computeLayout();

  selectedBed = 0; timer = levelConfig.duration;
  score = 0; tensionMeter = 0;
  comboCount = 0; comboMultiplier = 1.0; highestCombo = 0;
  difficultyMult = 1.0;
  surgeActive = false; surgeTimer = 0;
  surgeNextIn = GRACE_PERIOD + random(3, 8);
  surgeCooldownLeft = 0; surgesCompleted = 0; surgeVisualIntensity = 0;
  waterCooldown = 0; lightCooldown = 0; airflowCooldown = 0;
  actionLockTimer = 0;
  inputQueue = []; particles = [];
  stats = { surgesSurvived: 0, plantsWilted: 0, peakCombo: 0, totalRestores: 0 };
}

// ============================================================
// SURGE SYSTEM
// ============================================================
function startSurge() {
  if (levelConfig.surgeMult <= 0) return;
  surgeActive = true;
  surgeTimer = random(SURGE_DURATION_MIN, SURGE_DURATION_MAX);
  surgeVisualIntensity = 1.0;
  playSoundSurgeStart();
  let available = beds.filter(b => !b.isWilted && b.trueUrgency !== 'critical');
  shuffle(available, true);
  let count = min(FALSE_ALERT_COUNT, available.length);
  for (let i = 0; i < count; i++) available[i].hasFalseAlert = true;
}

function endSurge() {
  surgeActive = false; surgesCompleted++; stats.surgesSurvived++;
  score += SCORE_SURGE_SURVIVE * comboMultiplier;
  playSoundSurgeEnd();
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
    (levelConfig.duration - timer) / levelConfig.duration * SURGE_FREQ_RAMP);
  // Scale interval by surgeMult (higher = more frequent)
  if (levelConfig.surgeMult > 0) interval /= levelConfig.surgeMult;
  surgeNextIn = random(interval * 0.8, interval * 1.2);
  surgeCooldownLeft = SURGE_COOLDOWN_MIN;
}

function updateSurge(dt) {
  // No surges if surgeMult is 0
  if (levelConfig.surgeMult <= 0) {
    surgeActive = false;
    tensionMeter = 0;
    return;
  }
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
    if (surgeNextIn <= 0 && surgeCooldownLeft <= 0 && timer < (levelConfig.duration - GRACE_PERIOD))
      startSurge();
  }
  surgeVisualIntensity = surgeActive ? lerp(surgeVisualIntensity, 1, 0.1) : lerp(surgeVisualIntensity, 0, 0.05);
}

// ============================================================
// TENSION / COMBO / SCORE / DIFFICULTY
// ============================================================
function updateTension(dt) {
  if (levelConfig.surgeMult <= 0) { tensionMeter = 0; return; }
  let activeAlerts = beds.filter(b => !b.isWilted && b.trueUrgency === 'critical').length;
  tensionMeter += activeAlerts * TENSION_RISE_ALERTS * dt * 0.3;
  if (!surgeActive && activeAlerts < 2) tensionMeter -= TENSION_DECAY * dt;
  tensionMeter = constrain(tensionMeter, 0, 100);
  if (tensionMeter >= 100) {
    tensionMeter = TENSION_OVERLOAD_RESET;
    comboMultiplier = max(1.0, comboMultiplier - 0.5);
  }
}

function updateCombo(dt) {
  let healthyCount = beds.filter(b => !b.isWilted && b.health > 40 && b.water > 30 && b.light > 30).length;
  let threshold = min(COMBO_THRESHOLD, beds.length);
  if (healthyCount >= threshold) {
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
  let progress = (levelConfig.duration - timer) / levelConfig.duration;
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
    playSoundWater();
    spawnParticle(bed.x + bed.w/2, bed.y+10, COL.water, 'Water');
    if (tutorialActive && TUTORIAL_STEPS[tutorialStep].advanceOn === 'water') advanceTutorial();
  } else if (type === 'light' && lightCooldown <= 0) {
    bed.applyLight(); lightCooldown = ACTION_COOLDOWN;
    actionLockTimer = ACTION_LOCK_DURATION;
    playSoundLight();
    spawnParticle(bed.x + bed.w/2, bed.y+10, COL.light, 'Light');
    if (tutorialActive && TUTORIAL_STEPS[tutorialStep].advanceOn === 'light') advanceTutorial();
  } else if (type === 'airflow' && airflowCooldown <= 0) {
    bed.applyAirflow(); airflowCooldown = AIRFLOW_COOLDOWN;
    playSoundAirflow();
    spawnParticle(bed.x + bed.w/2, bed.y+10, COL.airflow, 'Airflow');
    if (tutorialActive && TUTORIAL_STEPS[tutorialStep].advanceOn === 'airflow') advanceTutorial();
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
// WIN / LOSE / END CONDITIONS
// ============================================================
function checkEndConditions() {
  let wiltedCount = beds.filter(b => b.isWilted).length;
  if (wiltedCount >= currentLoseThreshold) {
    playSoundLose();
    gameState = STATE.LOSE;
    hideTitleVideo();
    return;
  }
  if (timer <= 0) {
    // Survived the round
    if (currentLevel >= LEVELS.length - 1) {
      // Final level beaten
      playSoundLevelComplete();
      gameState = STATE.CONGRATS;
    } else {
      playSoundLevelComplete();
      gameState = STATE.LEVEL_COMPLETE;
    }
    hideTitleVideo();
  }
}

function computeGrade() {
  let totalBeds = currentGridCols * currentGridRows;
  let maxPossible = totalBeds * SCORE_PER_HEALTHY_SEC * levelConfig.duration * 2;
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
// TUTORIAL SYSTEM
// ============================================================
function startTutorial() {
  tutorialActive = true;
  tutorialStep = 0;
  tutorialDrainEnabled = false;
}

function advanceTutorial() {
  tutorialStep++;
  if (tutorialStep >= TUTORIAL_STEPS.length) {
    endTutorial();
    return;
  }
  let step = TUTORIAL_STEPS[tutorialStep];
  if (step.enableDrain) tutorialDrainEnabled = true;
}

function endTutorial() {
  tutorialActive = false;
  tutorialCompleted = true;
  tutorialDrainEnabled = false;
  startCountdown();
}

function drawTutorial() {
  // Draw the gameplay board underneath
  drawGameplayBoard();

  // Dim overlay
  fill(10, 14, 24, 110);
  noStroke();
  rect(0, 0, CANVAS_W, CANVAS_H);

  let step = TUTORIAL_STEPS[tutorialStep];

  // Highlight specific areas by redrawing them on top
  if (step.highlight === 'board' || step.highlight === 'beds') {
    // Redraw beds on top at full brightness
    for (let bed of beds) {
      push();
      drawBed(bed);
      // Pulsing border
      noFill();
      stroke(COL.accent[0], COL.accent[1], COL.accent[2], 120 + sin(millis() / 300) * 60);
      strokeWeight(2);
      rect(bed.x - 2, bed.y - 2, bed.w + 4, bed.h + 4, 5);
      pop();
    }
  }

  if (step.highlight === 'water_btn' || step.highlight === 'light_btn' || step.highlight === 'airflow_btn') {
    // Redraw the panel actions area
    let btnIndex = step.highlight === 'water_btn' ? 0 : step.highlight === 'light_btn' ? 1 : 2;
    if (actionBtns.length > btnIndex) {
      let btn = actionBtns[btnIndex];
      push();
      // Clear area behind button
      fill(COL.panelBg);
      noStroke();
      rect(btn.x - 4, btn.y - 4, btn.w + 8, btn.h + 8, 8);
      btn.draw();
      // Pulse
      noFill();
      stroke(COL.accent[0], COL.accent[1], COL.accent[2], 150 + sin(millis() / 250) * 80);
      strokeWeight(2);
      rect(btn.x - 2, btn.y - 2, btn.w + 4, btn.h + 4, 8);
      pop();
    }
  }

  // Dialog box at bottom center
  let dlgW = 560, dlgH = 90;
  let dlgX = (CANVAS_W - PANEL_WIDTH) / 2 - dlgW / 2 + 10;
  let dlgY = CANVAS_H - 130;

  // Background
  fill(15, 20, 35, 220);
  stroke(COL.accent[0], COL.accent[1], COL.accent[2], 150);
  strokeWeight(2);
  rect(dlgX, dlgY, dlgW, dlgH, 10);
  noStroke();

  // Main text
  fill(COL.textPrimary);
  textAlign(CENTER, CENTER);
  textSize(17);
  textStyle(NORMAL);
  text(step.text, dlgX + dlgW / 2, dlgY + dlgH / 2 - 12);

  // Hint text
  fill(COL.textSecondary[0], COL.textSecondary[1], COL.textSecondary[2], 150);
  textSize(12);
  text(step.hint, dlgX + dlgW / 2, dlgY + dlgH / 2 + 18);

  // Step indicator dots
  let dotY = dlgY + dlgH + 12;
  for (let i = 0; i < TUTORIAL_STEPS.length; i++) {
    let dotX = dlgX + dlgW / 2 - (TUTORIAL_STEPS.length * 12) / 2 + i * 12 + 6;
    fill(i === tutorialStep ? COL.accent : [60, 70, 60]);
    noStroke();
    ellipse(dotX, dotY, 6, 6);
  }
}

// ============================================================
// COUNTDOWN SYSTEM
// ============================================================
function startCountdown() {
  gameState = STATE.COUNTDOWN;
  countdownTimer = 0;
  countdownPhase = 0;
}

function updateCountdown(dt) {
  countdownTimer += dt;
  let newPhase = floor(countdownTimer);
  if (newPhase > countdownPhase && newPhase <= 3) {
    countdownPhase = newPhase;
    if (newPhase < 3) playSoundCountdownTick();
    else playSoundCountdownGo();
  }
  if (countdownTimer >= 3.5) {
    // Start gameplay
    gameState = STATE.PLAYING;
  }
}

function drawCountdown() {
  drawGameplayBoard();

  // Slight dim
  fill(10, 14, 24, 80);
  noStroke();
  rect(0, 0, CANVAS_W, CANVAS_H);

  let displayText;
  let displayColor;
  let displaySize = 72;

  if (countdownTimer < 1) { displayText = '3'; displayColor = COL.accent; }
  else if (countdownTimer < 2) { displayText = '2'; displayColor = COL.accent; }
  else if (countdownTimer < 3) { displayText = '1'; displayColor = COL.accent; }
  else { displayText = 'GO!'; displayColor = COL.combo; displaySize = 80; }

  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(displaySize);
  fill(displayColor[0], displayColor[1], displayColor[2]);
  text(displayText, (CANVAS_W - PANEL_WIDTH) / 2 + 10, CANVAS_H / 2);
  textStyle(NORMAL);

  // Level label above countdown
  textSize(22);
  fill(COL.textSecondary);
  text(levelConfig.label, (CANVAS_W - PANEL_WIDTH) / 2 + 10, CANVAS_H / 2 - 80);
}

// ============================================================
// DRAW: TITLE SCREEN
// ============================================================
function drawTitle() {
  background(0);
  if (titleVideo && titleVideoReady) {
    try { image(titleVideo, 0, 0, CANVAS_W, CANVAS_H); }
    catch (e) { drawTitleFallback(); }
  } else {
    drawTitleFallback();
  }

  if (debugShowHitboxes) {
    noFill(); stroke(0, 255, 0); strokeWeight(2);
    rect(TITLE_START_BTN.x, TITLE_START_BTN.y, TITLE_START_BTN.w, TITLE_START_BTN.h);
    rect(TITLE_INSTR_BTN.x, TITLE_INSTR_BTN.y, TITLE_INSTR_BTN.w, TITLE_INSTR_BTN.h);
    noStroke();
    fill(0, 255, 0); textAlign(CENTER, CENTER); textSize(11); textStyle(NORMAL);
    text('START hitbox', TITLE_START_BTN.x + TITLE_START_BTN.w/2, TITLE_START_BTN.y - 10);
    text('INSTR hitbox', TITLE_INSTR_BTN.x + TITLE_INSTR_BTN.w/2, TITLE_INSTR_BTN.y - 10);
  }

  if (!showInstructionsOverlay) {
    if (isInRect(mouseX, mouseY, TITLE_START_BTN)) {
      fill(255, 255, 255, 30); noStroke();
      rect(TITLE_START_BTN.x, TITLE_START_BTN.y, TITLE_START_BTN.w, TITLE_START_BTN.h, 8);
    }
    if (isInRect(mouseX, mouseY, TITLE_INSTR_BTN)) {
      fill(255, 255, 255, 30); noStroke();
      rect(TITLE_INSTR_BTN.x, TITLE_INSTR_BTN.y, TITLE_INSTR_BTN.w, TITLE_INSTR_BTN.h, 8);
    }
  }
}

function drawTitleFallback() {
  if (titleFallbackImg) {
    image(titleFallbackImg, 0, 0, CANVAS_W, CANVAS_H);
  } else {
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

    stroke(COL.accent[0], COL.accent[1], COL.accent[2], 60); strokeWeight(1);
    line(CANVAS_W/2-120, CANVAS_H/2-45, CANVAS_W/2+120, CANVAS_H/2-45); noStroke();

    let btnW = 200, btnH = 48, cx = CANVAS_W/2;
    drawStyledButton(cx - btnW/2, CANVAS_H/2 - 10, btnW, btnH, 'Start Game',
      isInRect(mouseX, mouseY, {x:cx-btnW/2, y:CANVAS_H/2-10, w:btnW, h:btnH}));
    drawStyledButton(cx - btnW/2, CANVAS_H/2 + 55, btnW, btnH, 'Instructions',
      isInRect(mouseX, mouseY, {x:cx-btnW/2, y:CANVAS_H/2+55, w:btnW, h:btnH}));
  }
}

function drawStyledButton(x, y, w, h, label, hovered) {
  fill(hovered ? COL.buttonHover : COL.buttonBg);
  stroke(COL.accent[0], COL.accent[1], COL.accent[2], 120); strokeWeight(1.5);
  rect(x, y, w, h, 6);
  fill(COL.buttonText); noStroke();
  textAlign(CENTER, CENTER); textSize(16); textStyle(BOLD);
  text(label, x + w/2, y + h/2);
}

function isInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

// ============================================================
// DRAW: INSTRUCTIONS OVERLAY (redesigned - icon-forward)
// ============================================================
function drawInstructionsOverlay() {
  fill(10, 14, 24, INSTR_OVERLAY_ALPHA);
  noStroke();
  rect(INSTR_OVERLAY_X, INSTR_OVERLAY_Y, INSTR_OVERLAY_W, INSTR_OVERLAY_H, 12);

  noFill();
  stroke(COL.accent[0], COL.accent[1], COL.accent[2], 80);
  strokeWeight(2);
  rect(INSTR_OVERLAY_X, INSTR_OVERLAY_Y, INSTR_OVERLAY_W, INSTR_OVERLAY_H, 12);
  noStroke();

  let ox = INSTR_OVERLAY_X;
  let oy = INSTR_OVERLAY_Y;
  let cx = ox + INSTR_OVERLAY_W / 2;

  // Title
  textAlign(CENTER, TOP); textStyle(BOLD); textSize(26);
  fill(COL.accent[0], COL.accent[1], COL.accent[2]);
  text('How to Play', cx, oy + 18);

  // === TOP SECTION: Action cards ===
  let cardW = 200, cardH = 100, cardGap = 30;
  let cardsStartX = cx - (3 * cardW + 2 * cardGap) / 2;
  let cardsY = oy + 65;

  let actions = [
    { icon: '\uD83D\uDCA7', key: 'Q', desc: 'Water the plant', col: COL.water },
    { icon: '\u2600', key: 'E', desc: 'Give it light', col: COL.light },
    { icon: '\uD83C\uDF2C', key: 'R', desc: 'Slow the drain', col: COL.airflow },
  ];

  for (let i = 0; i < actions.length; i++) {
    let ax = cardsStartX + i * (cardW + cardGap);
    let a = actions[i];

    // Card background
    fill(30, 35, 50, 200);
    stroke(a.col[0], a.col[1], a.col[2], 100);
    strokeWeight(1.5);
    rect(ax, cardsY, cardW, cardH, 8);
    noStroke();

    // Icon
    textAlign(CENTER, CENTER); textSize(28);
    fill(a.col[0], a.col[1], a.col[2]);
    text(a.icon, ax + cardW / 2, cardsY + 28);

    // Key binding
    textSize(18); textStyle(BOLD);
    fill(COL.textPrimary);
    text(a.key, ax + cardW / 2, cardsY + 55);

    // Description
    textSize(13); textStyle(NORMAL);
    fill(COL.textSecondary);
    text(a.desc, ax + cardW / 2, cardsY + 78);
  }

  // Movement line
  textAlign(CENTER, TOP); textSize(13); textStyle(NORMAL);
  fill(COL.textSecondary);
  text('WASD / Arrows / Click to select a plant', cx, cardsY + cardH + 18);

  // === MIDDLE SECTION: Key concepts ===
  let conceptsY = cardsY + cardH + 55;
  let conceptItems = [
    { icon: '\u26A1', label: 'Surges', desc: 'Random disruptions \u2014 stay calm, they pass', col: COL.surge },
    { icon: '\u2593', label: 'Tension', desc: 'Rises during surges. Don\'t let it max out', col: COL.tension },
    { icon: '\u25C7', label: 'Uncertain Zones', desc: 'Risky to tend, costly to ignore', col: [180, 160, 220] },
    { icon: '\u2605', label: 'Harmony', desc: 'Keep plants healthy for score bonus', col: COL.combo },
  ];

  for (let i = 0; i < conceptItems.length; i++) {
    let item = conceptItems[i];
    let iy = conceptsY + i * 38;
    let leftEdge = cx - 280;

    // Icon
    textAlign(LEFT, CENTER); textSize(18);
    fill(item.col[0], item.col[1], item.col[2]);
    text(item.icon, leftEdge, iy + 10);

    // Label
    textSize(14); textStyle(BOLD);
    fill(item.col[0], item.col[1], item.col[2]);
    text(item.label, leftEdge + 30, iy + 10);

    // Description
    textSize(13); textStyle(NORMAL);
    fill(COL.textSecondary);
    text(item.desc, leftEdge + 180, iy + 10);
  }

  // === BOTTOM SECTION: Design note ===
  let noteY = conceptsY + conceptItems.length * 38 + 30;
  textAlign(CENTER, CENTER); textSize(12); textStyle(ITALIC);
  fill(COL.textSecondary[0], COL.textSecondary[1], COL.textSecondary[2], 160);
  text('This game uses symbolic mechanics to respectfully represent disruption and coping.', cx, noteY);
  textStyle(NORMAL);

  // Close button
  let closeBtnX = ox + INSTR_OVERLAY_W - 200;
  let closeBtnY = oy + INSTR_OVERLAY_H - 60;
  let closeBtnW = 160, closeBtnH = 44;
  let hovered = isInRect(mouseX, mouseY, {x:closeBtnX, y:closeBtnY, w:closeBtnW, h:closeBtnH});
  drawStyledButton(closeBtnX, closeBtnY, closeBtnW, closeBtnH, 'Close [Esc]', hovered);
}

// ============================================================
// DRAW: GAMEPLAY BOARD (shared by playing, tutorial, countdown)
// ============================================================
function drawGameplayBoard() {
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
    text('\u26A1 SURGE ACTIVE \u26A1', boardX + boardW/2, boardY - 3);
    textStyle(NORMAL);
  }

  if (actionLockTimer > 0) {
    noStroke(); fill(COL.bg[0], COL.bg[1], COL.bg[2], 30);
    rect(boardX, boardY, boardW, boardH);
  }
}

function drawGameplay() {
  drawGameplayBoard();
}

// ============================================================
// DRAW: PLANT BED
// ============================================================
function drawBed(bed) {
  let bx = bed.x, by = bed.y, bw = bed.w, bh = bed.h;

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

  if (imagesLoaded) {
    let img = getPlantImage(bed.health);
    if (img) {
      push(); imageMode(CORNER);
      if (bed.isWilted) tint(80,50,50,200);
      image(img, bx+1, by+1, bw-2, bh-2);
      noTint(); pop();
    }
  } else {
    if (bed.isWilted) {
      fill(COL.textSecondary[0],COL.textSecondary[1],COL.textSecondary[2],120);
      textAlign(CENTER,CENTER); textSize(28);
      text('\u2715', bx+bw/2, by+bh/2-10);
      textSize(12); text('Wilted', bx+bw/2, by+bh/2+18);
      return;
    }
    let hc = bed.health > 50 ? COL.health :
      [lerp(COL.healthLow[0],COL.health[0],bed.health/50),
       lerp(COL.healthLow[1],COL.health[1],bed.health/50),
       lerp(COL.healthLow[2],COL.health[2],bed.health/50)];
    fill(hc); textAlign(CENTER,CENTER); textSize(22);
    text(bed.health > 60 ? '\u275B' : bed.health > 30 ? '\u274A' : '\u273F', bx+bw/2, by+bh*0.35);
  }

  if (bed.isWilted) {
    fill(0,0,0,120); noStroke();
    rect(bx+1, by+bh-30, bw-2, 29, 0,0,4,4);
    fill(COL.textSecondary[0],COL.textSecondary[1],COL.textSecondary[2],220);
    textAlign(CENTER,CENTER); textSize(13); textStyle(BOLD);
    text('Wilted', bx+bw/2, by+bh-16); textStyle(NORMAL);
    return;
  }

  // Bars at bottom
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

  textSize(8); textStyle(BOLD); fill(hc); textAlign(LEFT,TOP);
  text('HP '+floor(bed.health), barX, curY); textStyle(NORMAL);
  curY += labelH;
  fill(20,25,20); rect(barX, curY, barW, barH, 2);
  fill(hc); rect(barX, curY, barW*bed.health/100, barH, 2);
  curY += barH + barGap;

  textSize(8); fill(COL.water); textAlign(LEFT,TOP);
  text('\uD83D\uDCA7 '+floor(bed.water), barX, curY); curY += labelH;
  fill(20,25,35); rect(barX, curY, barW, barH, 2);
  fill(COL.water); rect(barX, curY, barW*bed.water/100, barH, 2);
  curY += barH + barGap;

  textSize(8); fill(COL.light); textAlign(LEFT,TOP);
  text('\u2600 '+floor(bed.light), barX, curY);
  if (bed.airflowActive) {
    fill(COL.airflow[0],COL.airflow[1],COL.airflow[2],200);
    textAlign(RIGHT,TOP); text('\uD83C\uDF2C'+floor(bed.airflowTimer)+'s', barX+barW, curY);
    textAlign(LEFT,TOP);
  }
  curY += labelH;
  fill(20,25,20); rect(barX, curY, barW, barH, 2);
  fill(COL.light); rect(barX, curY, barW*bed.light/100, barH, 2);

  if (surgeActive && !reducedEffects && random() < 0.15) {
    fill(COL.surge[0],COL.surge[1],COL.surge[2],50); noStroke();
    rect(bx, by, bw, bh, 4);
  }

  if (bed.hasFalseAlert && !bed.isWilted) {
    fill(COL.falseAlert[0],COL.falseAlert[1],COL.falseAlert[2], 160+sin(millis()/150)*60);
    textAlign(RIGHT,TOP); textSize(16); text('\u26A0', bx+bw-4, by+4);
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

  // Level indicator
  textAlign(LEFT,TOP); textStyle(BOLD); textSize(16);
  fill(COL.accent[0], COL.accent[1], COL.accent[2]);
  text(levelConfig.label, px, py);

  // Level progress dots
  let dotStartX = px;
  let dotY = py + 22;
  for (let i = 0; i < LEVELS.length; i++) {
    let dx = dotStartX + i * 16;
    if (i < currentLevel) fill(COL.accent[0], COL.accent[1], COL.accent[2]);
    else if (i === currentLevel) fill(COL.accent[0], COL.accent[1], COL.accent[2], 200 + sin(millis()/300)*55);
    else fill(60, 70, 60);
    noStroke();
    ellipse(dx + 5, dotY + 4, 8, 8);
  }
  py += 42;

  textStyle(BOLD); textSize(13);
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

  // Tension (only show if surges are active for this level)
  if (levelConfig.surgeMult > 0) {
    textSize(13); fill(COL.textSecondary); text('TENSION', px, py); py += 18;
    fill(30,25,25); rect(px, py, pw, 14, 4);
    let tc = tensionMeter<30 ? [80,180,120] : tensionMeter<60 ? [200,180,60] :
             tensionMeter<80 ? [220,120,50] : [200,60,60];
    fill(tc); rect(px, py, pw*tensionMeter/100, 14, 4);
    fill(COL.textPrimary); textAlign(CENTER,CENTER); textSize(10);
    text(floor(tensionMeter), px+pw/2, py+7);
    textAlign(LEFT,TOP); py += 30;

    textSize(13);
    if (surgeActive) { fill(COL.surge); textStyle(BOLD); text('\u26A1 SURGE ACTIVE', px, py); textStyle(NORMAL); }
    else { fill(COL.textSecondary); text('System Stable', px, py); }
    py += 28;
  } else {
    py += 10;
  }

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
    if (sb.isUncertainZone) { fill(180,160,220); py += 16; text('\u2B21 Uncertain Zone', px, py); }
  } else if (sb && sb.isWilted) {
    fill(COL.healthLow); textSize(12); text('This plant has wilted.', px, py);
  }
  py += 30;

  drawActionButtons(px, py, pw);

  let wc = beds.filter(b => b.isWilted).length;
  textAlign(LEFT,BOTTOM); textSize(12);
  fill(wc >= currentLoseThreshold-1 ? COL.healthLow : COL.textSecondary);
  text('Wilted: '+wc+' / '+currentLoseThreshold+' max', px, CANVAS_H-38);
  textSize(10); fill(COL.textSecondary[0],COL.textSecondary[1],COL.textSecondary[2],100);
  text('Esc/P=Pause  V=Effects  M=Mute', px, CANVAS_H-18);
}

// ============================================================
// ACTION BUTTONS (color-coded)
// ============================================================
let actionBtns = [];

function drawActionButtons(px, py, pw) {
  let btnW = pw, btnH = 32, gap = 8;
  if (actionBtns.length === 0) {
    actionBtns.push(new Button(px, py, btnW, btnH, '\uD83D\uDCA7 Water  [Q]', () => queueAction(() => doAction('water')), 'water'));
    actionBtns.push(new Button(px, py+btnH+gap, btnW, btnH, '\u2600 Light  [E]', () => queueAction(() => doAction('light')), 'light'));
    actionBtns.push(new Button(px, py+2*(btnH+gap), btnW, btnH, '\uD83C\uDF2C Airflow  [R]', () => queueAction(() => doAction('airflow')), 'airflow'));
  }
  actionBtns[0].y = py;
  actionBtns[1].y = py + btnH + gap;
  actionBtns[2].y = py + 2*(btnH+gap);

  // Color mapping for each button
  let btnColors = {
    'water':   { base: COL.waterBtn,   hover: COL.waterBtnHov },
    'light':   { base: COL.lightBtn,   hover: COL.lightBtnHov },
    'airflow': { base: COL.airflowBtn, hover: COL.airflowBtnHov },
  };

  for (let btn of actionBtns) {
    btn.checkHover(mouseX, mouseY);
    let available = true;
    if (btn.id === 'water') available = waterCooldown <= 0;
    if (btn.id === 'light') available = lightCooldown <= 0;
    if (btn.id === 'airflow') available = airflowCooldown <= 0;
    if (actionLockTimer > 0) available = false;

    if (!available) {
      fill(35,40,38); stroke(50,55,50); strokeWeight(1);
      rect(btn.x, btn.y, btn.w, btn.h, 6); noStroke();
      fill(COL.textSecondary[0],COL.textSecondary[1],COL.textSecondary[2],100);
      textAlign(CENTER,CENTER); textSize(14);
      text(btn.label, btn.x+btn.w/2, btn.y+btn.h/2);
    } else {
      // Use color-coded button
      let colors = btnColors[btn.id];
      let col = btn.hovered ? colors.hover : colors.base;
      fill(col[0], col[1], col[2]);
      stroke(COL.accent[0], COL.accent[1], COL.accent[2], 120);
      strokeWeight(1.5);
      rect(btn.x, btn.y, btn.w, btn.h, 6);
      fill(COL.buttonText[0], COL.buttonText[1], COL.buttonText[2]);
      noStroke();
      textAlign(CENTER, CENTER);
      textSize(14);
      textStyle(BOLD);
      text(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
      textStyle(NORMAL);
    }
  }
}

// ============================================================
// DRAW: PAUSE MENU
// ============================================================
let pauseButtons = [];

function initPauseButtons() {
  pauseButtons = [];
  let cx = CANVAS_W / 2;
  let startY = CANVAS_H / 2 - 60;

  pauseButtons.push(new Button(cx - PAUSE_BTN_W/2, startY, PAUSE_BTN_W, PAUSE_BTN_H,
    'Resume', () => {
      if (tutorialActive) gameState = STATE.TUTORIAL;
      else gameState = STATE.PLAYING;
    }, 'pause_resume'));

  pauseButtons.push(new Button(cx - PAUSE_BTN_W/2, startY + PAUSE_BTN_H + PAUSE_BTN_GAP, PAUSE_BTN_W, PAUSE_BTN_H,
    'Restart Level', () => {
      actionBtns = [];
      initGame(currentLevel);
      startCountdown();
    }, 'pause_restart'));

  // Skip Tutorial (only visible during tutorial)
  pauseButtons.push(new Button(cx - PAUSE_BTN_W/2, startY + 2*(PAUSE_BTN_H + PAUSE_BTN_GAP), PAUSE_BTN_W, PAUSE_BTN_H,
    'Skip Tutorial', () => {
      tutorialActive = false;
      tutorialCompleted = true;
      actionBtns = [];
      initGame(0);
      startCountdown();
    }, 'pause_skip_tutorial'));

  pauseButtons.push(new Button(cx - PAUSE_BTN_W/2, startY + 3*(PAUSE_BTN_H + PAUSE_BTN_GAP), PAUSE_BTN_W, PAUSE_BTN_H,
    'Back to Main Menu', () => {
      actionBtns = [];
      tutorialActive = false;
      tutorialCompleted = false;
      gameState = STATE.TITLE;
      showInstructionsOverlay = false;
      showTitleVideo();
    }, 'pause_menu'));
}

function drawPause() {
  fill(COL.bg[0], COL.bg[1], COL.bg[2], 190);
  rect(0, 0, CANVAS_W, CANVAS_H);

  textAlign(CENTER, CENTER);
  textStyle(BOLD); textSize(36);
  fill(COL.textPrimary);
  text('PAUSED', CANVAS_W/2, CANVAS_H/2 - 140);
  textStyle(NORMAL); textSize(14);
  fill(COL.textSecondary);
  text('Press Esc or P to resume', CANVAS_W/2, CANVAS_H/2 - 105);

  for (let btn of pauseButtons) {
    // Show skip tutorial only during tutorial
    if (btn.id === 'pause_skip_tutorial') {
      btn.visible = tutorialActive;
    } else {
      btn.visible = true;
    }
    btn.checkHover(mouseX, mouseY);
    btn.draw();
  }
}

// ============================================================
// DRAW: LEVEL COMPLETE SCREEN
// ============================================================
function drawLevelComplete() {
  background(COL.bg); let cx = CANVAS_W/2;
  let t = millis()/1000; noStroke();
  for (let i = 0; i < 10; i++) {
    fill(COL.accent[0],COL.accent[1],COL.accent[2],15);
    ellipse(cx+cos(t*0.2+i*0.6)*280, CANVAS_H/2+sin(t*0.3+i*0.8)*180, 50, 50);
  }
  textAlign(CENTER,CENTER); textStyle(BOLD); textSize(40);
  fill(COL.accent); text(levelConfig.label + ' Complete!', cx, 120);
  textStyle(NORMAL); textSize(16); fill(COL.textSecondary);
  text('Well done! The garden holds.', cx, 170);

  let y = 230, lh = 30;
  textSize(16);
  fill(COL.textPrimary); text('Score: '+floor(score), cx, y); y += lh;
  fill(COL.combo); text('Best Harmony: x'+nf(stats.peakCombo,1,1), cx, y); y += lh;
  if (levelConfig.surgeMult > 0) {
    fill(COL.surge); text('Surges Survived: '+stats.surgesSurvived, cx, y); y += lh;
  }
  fill(COL.healthLow); text('Plants Wilted: '+stats.plantsWilted, cx, y);
}

// ============================================================
// DRAW: CONGRATS SCREEN
// ============================================================
function drawCongrats() {
  background(COL.bg); let cx = CANVAS_W/2;
  let t = millis()/1000; noStroke();
  // More particles for celebration
  for (let i = 0; i < 20; i++) {
    let pc = i % 3 === 0 ? COL.accent : i % 3 === 1 ? COL.combo : COL.water;
    fill(pc[0],pc[1],pc[2], 12 + sin(t*0.5+i)*6);
    ellipse(cx+cos(t*0.15+i*0.3)*350, CANVAS_H/2+sin(t*0.2+i*0.5)*250, 40+sin(t+i)*10, 40+sin(t+i)*10);
  }

  textAlign(CENTER,CENTER); textStyle(BOLD); textSize(48);
  // Gentle glow/pulse on title
  let pulse = 200 + sin(t*2)*55;
  fill(COL.combo[0], COL.combo[1], COL.combo[2], pulse);
  text('Congratulations!', cx, 100);

  textStyle(NORMAL); textSize(18); fill(COL.textSecondary);
  text('You completed all levels of Garden Circuit.', cx, 155);

  let y = 220, lh = 30;
  textSize(16);
  fill(COL.textPrimary); text('Final Score: '+floor(score), cx, y); y += lh;
  fill(COL.combo); text('Best Harmony: x'+nf(stats.peakCombo,1,1), cx, y); y += lh;
  fill(COL.surge); text('Surges Survived: '+stats.surgesSurvived, cx, y); y += lh;
  fill(COL.healthLow); text('Plants Wilted: '+stats.plantsWilted, cx, y); y += lh + 15;

  textSize(13); textStyle(ITALIC);
  fill(COL.textSecondary[0], COL.textSecondary[1], COL.textSecondary[2], 160);
  text('This game uses symbolic mechanics to represent disruption and coping.', cx, y);
  y += 20;
  text('Thank you for playing.', cx, y);
  textStyle(NORMAL);
}

// ============================================================
// DRAW: LOSE SCREEN
// ============================================================
function drawLose() {
  background(COL.bg); let cx = CANVAS_W/2;
  textAlign(CENTER,CENTER); textStyle(BOLD); textSize(36);
  fill(COL.textPrimary); text('The Garden Faded', cx, 100);
  textStyle(NORMAL); textSize(16); fill(COL.textSecondary);
  text('Too many plants were lost \u2014 but every attempt is practice.', cx, 145);
  text('Adjust your strategy and try again.', cx, 168);

  let y = 230, lh = 30;
  textSize(16);
  fill(COL.textPrimary); text('Score: '+floor(score), cx, y); y += lh;
  fill(COL.combo); text('Best Harmony: x'+nf(stats.peakCombo,1,1), cx, y); y += lh;
  if (levelConfig.surgeMult > 0) {
    fill(COL.surge); text('Surges Survived: '+stats.surgesSurvived, cx, y); y += lh;
  }
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
  initTitleVideo();
  initSound();
  initGame(0);
  initEndButtons();
  initPauseButtons();
}

// ============================================================
// END-SCREEN BUTTONS
// ============================================================
let endButtons = [];
let levelCompleteButtons = [];
let congratsButtons = [];

function initEndButtons() {
  endButtons = [];
  let cx = CANVAS_W/2, btnW = 200, btnH = 48;

  // Lose screen: Retry Level + Main Menu
  endButtons.push(new Button(cx - btnW/2, CANVAS_H - 120, btnW, btnH, 'Retry Level', () => {
    actionBtns = []; initGame(currentLevel); startCountdown(); hideTitleVideo();
  }, 'end_retry'));

  endButtons.push(new Button(cx - btnW/2, CANVAS_H - 60, btnW, btnH, 'Main Menu', () => {
    actionBtns = [];
    tutorialCompleted = false;
    gameState = STATE.TITLE; showInstructionsOverlay = false;
    showTitleVideo();
  }, 'end_title'));

  // Level Complete: Next Level + Main Menu
  levelCompleteButtons = [];
  levelCompleteButtons.push(new Button(cx - btnW/2, CANVAS_H - 120, btnW, btnH, 'Next Level', () => {
    actionBtns = [];
    let nextLvl = currentLevel + 1;
    initGame(nextLvl);
    startCountdown();
    hideTitleVideo();
  }, 'lc_next'));

  levelCompleteButtons.push(new Button(cx - btnW/2, CANVAS_H - 60, btnW, btnH, 'Main Menu', () => {
    actionBtns = [];
    tutorialCompleted = false;
    gameState = STATE.TITLE; showInstructionsOverlay = false;
    showTitleVideo();
  }, 'lc_menu'));

  // Congrats: Play Again + Main Menu
  congratsButtons = [];
  congratsButtons.push(new Button(cx - btnW/2, CANVAS_H - 120, btnW, btnH, 'Play Again', () => {
    actionBtns = [];
    tutorialCompleted = false;
    initGame(0);
    startTutorial();
    gameState = STATE.TUTORIAL;
    hideTitleVideo();
  }, 'cg_restart'));

  congratsButtons.push(new Button(cx - btnW/2, CANVAS_H - 60, btnW, btnH, 'Main Menu', () => {
    actionBtns = [];
    tutorialCompleted = false;
    gameState = STATE.TITLE; showInstructionsOverlay = false;
    showTitleVideo();
  }, 'cg_menu'));
}

// ============================================================
// DRAW LOOP
// ============================================================
function draw() {
  let dt = min(deltaTime / 1000, 0.05);

  switch (gameState) {
    case STATE.TITLE:
      drawTitle();
      if (showInstructionsOverlay) drawInstructionsOverlay();
      break;

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

    case STATE.COUNTDOWN:
      updateCountdown(dt);
      drawCountdown();
      break;

    case STATE.PLAYING:
      updateGame(dt);
      drawGameplay();
      break;

    case STATE.LEVEL_COMPLETE:
      drawLevelComplete();
      for (let btn of levelCompleteButtons) { btn.visible = true; btn.checkHover(mouseX, mouseY); btn.draw(); }
      break;

    case STATE.CONGRATS:
      drawCongrats();
      for (let btn of congratsButtons) { btn.visible = true; btn.checkHover(mouseX, mouseY); btn.draw(); }
      break;

    case STATE.LOSE:
      drawLose();
      for (let btn of endButtons) { btn.visible = true; btn.checkHover(mouseX, mouseY); btn.draw(); }
      break;

    case STATE.PAUSED:
      drawGameplayBoard();
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
  if (actionLockTimer > 0) actionLockTimer -= dt;
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
  if (key === 'm' || key === 'M') { soundMuted = !soundMuted; return; }

  switch (gameState) {
    case STATE.TITLE:
      if (showInstructionsOverlay) {
        if (keyCode === ESCAPE || key === 'i' || key === 'I') {
          showInstructionsOverlay = false;
        }
        return;
      }
      if (keyCode === ENTER || key === ' ') {
        startGameFromTitle();
      }
      if (key === 'i' || key === 'I') showInstructionsOverlay = true;
      break;

    case STATE.TUTORIAL:
      if (keyCode === ESCAPE) { prevState = STATE.TUTORIAL; gameState = STATE.PAUSED; return; }
      handleTutorialInput();
      break;

    case STATE.COUNTDOWN:
      if (keyCode === ESCAPE) { prevState = STATE.COUNTDOWN; gameState = STATE.PAUSED; return; }
      break;

    case STATE.PLAYING:
      if (keyCode === ESCAPE) { gameState = STATE.PAUSED; return; }
      handlePlayingInput();
      break;

    case STATE.LEVEL_COMPLETE:
      if (keyCode === ENTER || key === ' ') {
        actionBtns = [];
        let nextLvl = currentLevel + 1;
        initGame(nextLvl);
        startCountdown();
        hideTitleVideo();
      }
      if (keyCode === ESCAPE) {
        actionBtns = []; tutorialCompleted = false;
        gameState = STATE.TITLE; showInstructionsOverlay = false; showTitleVideo();
      }
      break;

    case STATE.CONGRATS:
      if (keyCode === ENTER || key === ' ') {
        actionBtns = []; tutorialCompleted = false;
        initGame(0); startTutorial(); gameState = STATE.TUTORIAL; hideTitleVideo();
      }
      if (keyCode === ESCAPE) {
        actionBtns = []; tutorialCompleted = false;
        gameState = STATE.TITLE; showInstructionsOverlay = false; showTitleVideo();
      }
      break;

    case STATE.LOSE:
      if (keyCode === ENTER || key === ' ') {
        actionBtns = []; initGame(currentLevel); startCountdown(); hideTitleVideo();
      }
      if (keyCode === ESCAPE) {
        actionBtns = []; tutorialCompleted = false;
        gameState = STATE.TITLE; showInstructionsOverlay = false; showTitleVideo();
      }
      break;

    case STATE.PAUSED:
      if (key === 'p' || key === 'P' || keyCode === ESCAPE) {
        if (tutorialActive) gameState = STATE.TUTORIAL;
        else gameState = STATE.PLAYING;
      }
      break;
  }
}

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

function handleTutorialInput() {
  let step = TUTORIAL_STEPS[tutorialStep];

  // Movement keys work during tutorial
  let col = selectedBed % currentGridCols;
  let row = floor(selectedBed / currentGridCols);
  let prevSelected = selectedBed;

  if (key === 'w' || key === 'W' || keyCode === UP_ARROW) row = max(0, row-1);
  if (key === 's' || key === 'S' || keyCode === DOWN_ARROW) row = min(currentGridRows-1, row+1);
  if (key === 'a' || key === 'A' || keyCode === LEFT_ARROW) col = max(0, col-1);
  if (key === 'd' || key === 'D' || keyCode === RIGHT_ARROW) col = min(currentGridCols-1, col+1);
  selectedBed = row * currentGridCols + col;

  if (selectedBed !== prevSelected && step.advanceOn === 'select') advanceTutorial();

  // Action keys
  if (key === 'q' || key === 'Q') doAction('water');
  if (key === 'e' || key === 'E') doAction('light');
  if (key === 'r' || key === 'R') doAction('airflow');
}

function handlePlayingInput() {
  let col = selectedBed % currentGridCols;
  let row = floor(selectedBed / currentGridCols);
  if (key === 'w' || key === 'W' || keyCode === UP_ARROW) row = max(0, row-1);
  if (key === 's' || key === 'S' || keyCode === DOWN_ARROW) row = min(currentGridRows-1, row+1);
  if (key === 'a' || key === 'A' || keyCode === LEFT_ARROW) col = max(0, col-1);
  if (key === 'd' || key === 'D' || keyCode === RIGHT_ARROW) col = min(currentGridCols-1, col+1);
  selectedBed = row * currentGridCols + col;

  if (key === 'q' || key === 'Q') queueAction(() => doAction('water'));
  if (key === 'e' || key === 'E') queueAction(() => doAction('light'));
  if (key === 'r' || key === 'R') queueAction(() => doAction('airflow'));
  if (key === 'p' || key === 'P') gameState = STATE.PAUSED;
}

// ============================================================
// INPUT: MOUSE
// ============================================================
function mousePressed() {
  switch (gameState) {
    case STATE.TITLE:
      if (showInstructionsOverlay) {
        let closeBtnX = INSTR_OVERLAY_X + INSTR_OVERLAY_W - 200;
        let closeBtnY = INSTR_OVERLAY_Y + INSTR_OVERLAY_H - 60;
        if (isInRect(mouseX, mouseY, {x:closeBtnX, y:closeBtnY, w:160, h:44})) {
          showInstructionsOverlay = false;
        }
        return;
      }
      if (isInRect(mouseX, mouseY, TITLE_START_BTN)) {
        startGameFromTitle();
      } else if (isInRect(mouseX, mouseY, TITLE_INSTR_BTN)) {
        showInstructionsOverlay = true;
      }
      break;

    case STATE.TUTORIAL: {
      let step = TUTORIAL_STEPS[tutorialStep];
      // Check action button clicks
      for (let btn of actionBtns) { if (btn.checkClick(mouseX, mouseY)) return; }
      // Bed selection
      let idx = getBedAtMouse(mouseX, mouseY);
      if (idx >= 0) {
        let prev = selectedBed;
        selectedBed = idx;
        if (prev !== selectedBed && step.advanceOn === 'select') advanceTutorial();
      }
      // Click-to-advance steps
      if (step.advanceOn === 'click') advanceTutorial();
      break;
    }

    case STATE.COUNTDOWN:
      // No input during countdown (except pause via ESC handled in keyPressed)
      break;

    case STATE.PLAYING:
      for (let btn of actionBtns) { if (btn.checkClick(mouseX, mouseY)) return; }
      let idx2 = getBedAtMouse(mouseX, mouseY);
      if (idx2 >= 0) selectedBed = idx2;
      break;

    case STATE.LEVEL_COMPLETE:
      for (let btn of levelCompleteButtons) { if (btn.checkClick(mouseX, mouseY)) return; }
      break;

    case STATE.CONGRATS:
      for (let btn of congratsButtons) { if (btn.checkClick(mouseX, mouseY)) return; }
      break;

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
