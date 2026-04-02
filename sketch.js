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

// Tension meter
const TENSION_RISE_SURGE = 8;
const TENSION_RISE_ALERTS = 0.7;
const TENSION_DECAY = 2;
const TENSION_OVERLOAD_RESET = 40;
const BREATHE_TENSION_REDUCE = 12;    // Tension reduced per second while breathing
const BREATHE_COOLDOWN = 5;           // Seconds between breathe uses
const BREATHE_DRAIN_REDUCTION = 0.25; // Drain multiplier while breathing (75% slower)
const TENSION_DRAIN_BONUS_START = 50; // Tension level where drain penalty begins
const TENSION_DRAIN_MAX_MULT = 1.5;   // Max drain multiplier at tension 100
const TENSION_OVERLOAD_FREEZE = 2.0;  // Seconds of freeze when tension hits 100
const TENSION_PASSIVE_RISE = 0.4;     // Tension gained per second just from existing
const BREATHE_TIMER_SLOW = 0.35;      // Timer runs at 35% speed while breathing

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
  { level: 1, cols: 2, rows: 1, duration: 15, drainMult: 0.7, surgeMult: 0,    label: 'Level 1' },
  { level: 2, cols: 2, rows: 2, duration: 30, drainMult: 0.8, surgeMult: 0.5,  label: 'Level 2' },
  { level: 3, cols: 3, rows: 2, duration: 40, drainMult: 0.9, surgeMult: 0.7,  label: 'Level 3' },
  { level: 4, cols: 3, rows: 3, duration: 60, drainMult: 1.1, surgeMult: 1.0,  label: 'Level 4' },
  { level: 5, cols: 4, rows: 3, duration: 90, drainMult: 1.3, surgeMult: 1.2,  label: 'Final Level' },
];

// ============================================================
// TITLE SCREEN CONSTANTS
// ============================================================
const TITLE_VIDEO_FILE = 'assets/title.mp4';
const TITLE_FALLBACK_IMG = 'assets/title_bg.png';

const TITLE_START_BTN = { x: 300, y: 615, w: 220, h: 75 };
const TITLE_INSTR_BTN = { x: 580, y: 615, w: 220, h: 75 };

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
  bg:          [22, 27, 34],
  panelBg:     [18, 22, 30],
  bedNormal:   [35, 50, 40],
  bedSelected: [60, 90, 70],
  bedDead:     [50, 35, 35],
  health:      [90, 210, 130],
  healthLow:   [220, 75, 75],
  water:       [70, 155, 235],
  light:       [245, 210, 70],
  airflow:     [120, 200, 140],
  tension:     [200, 100, 100],
  textPrimary: [240, 242, 238],
  textSecondary:[150, 165, 175],
  surge:       [180, 60, 60],
  combo:       [255, 210, 65],
  accent:      [95, 215, 155],
  falseAlert:  [220, 130, 60],
  buttonBg:    [45, 65, 55],
  buttonHover: [60, 90, 70],
  buttonText:  [230, 240, 230],
  // Per-action button colors
  waterBtn:     [30, 50, 85],
  waterBtnHov:  [40, 65, 120],
  lightBtn:     [80, 65, 25],
  lightBtnHov:  [110, 90, 35],
  airflowBtn:   [30, 65, 45],
  airflowBtnHov:[40, 90, 60],
};

// ============================================================
// GAME STATES
// ============================================================
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
let isBreathing = false;
let breatheCooldown = 0;
let overwhelmTimer = 0;   // freeze timer when tension overloads

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
let tutorialDrainTimer = 0;
let tutorialSurgeActive = false;

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

  { id: 'surge_intro',    text: 'Sometimes a SURGE will happen!\nEverything gets harder for a moment.\nLet\'s see what it looks like...',
    hint: '[ Click to trigger a surge ]', highlight: 'tension_meter', advanceOn: 'click' },

  { id: 'surge_forced',   text: 'A surge is happening!\nWatch the screen — things get intense!',
    hint: 'Wait for the surge to end...', highlight: 'board', advanceOn: 'surge_end', triggerSurge: true },

  { id: 'surge_explain',  text: 'That was a surge! During surges,\nplants drain faster and tension goes up.\nJust focus on your most thirsty plants.',
    hint: '[ Click to continue ]', highlight: null, advanceOn: 'click' },

  { id: 'tension_explain',text: 'See the Tension meter? It slowly builds up\nover time. When it gets high, plants drain\nfaster! Let\'s see what happens when it fills up...',
    hint: '[ Click to continue ]', highlight: 'tension_meter', advanceOn: 'click' },

  { id: 'tension_forced', text: 'Tension is rising!\nWatch what happens when it gets too high...',
    hint: 'Wait for the overwhelm...', highlight: 'tension_meter', advanceOn: 'overwhelm_end', forceTension: true },

  { id: 'breathe_explain',text: 'You froze up! That happens when tension\nhits max. But you can stop it!\nHold SPACE to Breathe and lower tension.',
    hint: 'Hold the SPACE bar now!', highlight: 'breathe_btn', advanceOn: 'breathe', forceTensionHigh: true },

  { id: 'breathe_done',   text: 'Great job! Breathing lowers tension\nAND slows everything down.\nYou can only breathe when you have tension.',
    hint: '[ Click to continue ]', highlight: null, advanceOn: 'click' },

  { id: 'ready',          text: 'You\'re ready! Keep all plants alive\nuntil the timer runs out. Good luck!',
    hint: '[ Click to start playing! ]', highlight: null, advanceOn: 'click' },
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
let audioMuted = false;
let bgm = null;
let bgmLoaded = false;
let sfxLose = null;
let sfxNextLevel = null;
let sfxFinalComplete = null;

const MUSIC_BTN = { x: CANVAS_W - 44, y: 6, w: 36, h: 36 };

function initSound() {
  soundInitialized = true;
}

function initBGM() {
  try {
    bgm = createAudio('assets/royalty_free_farm_music.mp3');
    bgm.loop();
    bgm.volume(0.3);
    if (audioMuted) bgm.pause();
    bgmLoaded = true;
  } catch (e) {
    console.warn('BGM could not be loaded.', e);
    bgm = null;
    bgmLoaded = false;
  }
  // Load sound effects
  try {
    sfxLose = createAudio('assets/you_lose.wav');
    sfxLose.volume(0.5);
  } catch (e) { sfxLose = null; }
  try {
    sfxNextLevel = createAudio('assets/next_level.wav');
    sfxNextLevel.volume(0.5);
  } catch (e) { sfxNextLevel = null; }
  try {
    sfxFinalComplete = createAudio('assets/final_level_complete.wav');
    sfxFinalComplete.volume(0.5);
  } catch (e) { sfxFinalComplete = null; }
}

function toggleAudio() {
  audioMuted = !audioMuted;
  soundMuted = audioMuted;
  if (!bgm) return;
  if (audioMuted) {
    try { bgm.pause(); } catch (e) {}
  } else {
    try { bgm.loop(); } catch (e) {}
  }
}

function pauseBGM() {
  if (bgm && bgmLoaded) {
    try { bgm.pause(); } catch (e) {}
  }
}

function resumeBGM() {
  if (bgm && bgmLoaded && !audioMuted) {
    try { bgm.loop(); } catch (e) {}
  }
}

function playSFX(sfx) {
  if (!sfx || audioMuted) return;
  try {
    sfx.stop();
    sfx.play();
  } catch (e) {}
}

function drawMusicToggle() {
  let mx = MUSIC_BTN.x, my = MUSIC_BTN.y, mw = MUSIC_BTN.w, mh = MUSIC_BTN.h;
  let hovered = mouseX >= mx && mouseX <= mx + mw && mouseY >= my && mouseY <= my + mh;

  // Background
  fill(hovered ? 50 : 30, hovered ? 55 : 35, hovered ? 50 : 30, 180);
  noStroke();
  rect(mx, my, mw, mh, 8);

  // Speaker icon
  fill(audioMuted ? [180, 80, 80] : COL.accent);
  textAlign(CENTER, CENTER);
  textSize(18);
  textStyle(NORMAL);
  if (audioMuted) {
    text('\u{1F507}', mx + mw / 2, my + mh / 2);
  } else {
    text('\u{1F50A}', mx + mw / 2, my + mh / 2);
  }

  // Strikethrough line when muted
  if (audioMuted) {
    stroke(220, 75, 75, 200);
    strokeWeight(2);
    line(mx + 6, my + 6, mx + mw - 6, my + mh - 6);
    noStroke();
  }
}

let audioCtx = null;

function playTone(freq, duration, vol, type) {
  if (soundMuted || !soundInitialized) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    let osc = audioCtx.createOscillator();
    let gain = audioCtx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.value = vol || 0.05;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + (duration || 100) / 1000);
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
    return this.trueUrgency;
  }

  update(dt) {
    if (this.isWilted) return;
    let drainMult = difficultyMult * levelConfig.drainMult;
    // Breathing slows all drain
    if (isBreathing) drainMult *= BREATHE_DRAIN_REDUCTION;
    // High tension speeds up drain
    if (tensionMeter > TENSION_DRAIN_BONUS_START) {
      let tensionPenalty = map(tensionMeter, TENSION_DRAIN_BONUS_START, 100, 1.0, TENSION_DRAIN_MAX_MULT);
      drainMult *= tensionPenalty;
    }
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
    // Hover glow effect
    if (this.hovered) {
      noStroke();
      fill(COL.accent[0], COL.accent[1], COL.accent[2], 25);
      rect(this.x - 3, this.y - 3, this.w + 6, this.h + 6, 9);
    }
    fill(col[0], col[1], col[2]);
    stroke(COL.accent[0], COL.accent[1], COL.accent[2], this.hovered ? 180 : 120);
    strokeWeight(1.5);
    rect(this.x, this.y, this.w, this.h, 6);
    fill(COL.buttonText[0], COL.buttonText[1], COL.buttonText[2]);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(17);
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

  // Lose threshold: how many plants can wilt before you lose
  let totalBeds = currentGridCols * currentGridRows;
  if (totalBeds <= 2) currentLoseThreshold = 1;
  else if (totalBeds <= 4) currentLoseThreshold = 2;
  else if (totalBeds <= 6) currentLoseThreshold = 2;
  else if (totalBeds <= 9) currentLoseThreshold = 3;
  else currentLoseThreshold = 4;

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
  isBreathing = false;
  breatheCooldown = 0;
  overwhelmTimer = 0;
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

  // Overwhelm freeze — can't act, tension stays frozen
  if (overwhelmTimer > 0) {
    overwhelmTimer -= dt;
    if (overwhelmTimer <= 0) {
      tensionMeter = TENSION_OVERLOAD_RESET;
    }
    return;
  }

  // Breathing reduces tension
  if (isBreathing) {
    tensionMeter -= BREATHE_TENSION_REDUCE * dt;
  }

  // Passive tension rise — tension builds just from existing
  tensionMeter += TENSION_PASSIVE_RISE * dt;

  // Surge raises tension
  if (surgeActive) {
    tensionMeter += TENSION_RISE_SURGE * dt;
  }

  // Critical plants slowly raise tension
  let activeAlerts = beds.filter(b => !b.isWilted && b.trueUrgency === 'critical').length;
  tensionMeter += activeAlerts * TENSION_RISE_ALERTS * dt;

  // Natural decay (only when not surging and few critical plants, not breathing)
  if (!surgeActive && activeAlerts < 2 && !isBreathing) {
    tensionMeter -= TENSION_DECAY * dt;
  }

  tensionMeter = constrain(tensionMeter, 0, 100);

  // Overload — freeze the player briefly
  if (tensionMeter >= 100) {
    overwhelmTimer = TENSION_OVERLOAD_FREEZE;
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
  if (overwhelmTimer > 0) return;
  if (isBreathing) return;
  let bed = beds[selectedBed];
  if (!bed || bed.isWilted) return;
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
    pauseBGM();
    playSFX(sfxLose);
    gameState = STATE.LOSE;
    hideTitleVideo();
    return;
  }
  if (timer <= 0) {
    // Survived the round
    if (currentLevel >= LEVELS.length - 1) {
      // Final level beaten
      pauseBGM();
      playSFX(sfxFinalComplete);
      gameState = STATE.CONGRATS;
    } else {
      pauseBGM();
      playSFX(sfxNextLevel);
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
  tutorialDrainTimer = 0;
  tutorialSurgeActive = false;
  // Temporarily enable surge display for tutorial
  levelConfig = Object.assign({}, LEVELS[0], { surgeMult: 0.5 });
}

function advanceTutorial() {
  // Clean up previous step state
  tutorialDrainEnabled = false;
  tutorialDrainTimer = 0;
  isBreathing = false;
  breatheCooldown = 0;
  overwhelmTimer = 0;

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
    let available = beds.filter(b => !b.isWilted && b.trueUrgency !== 'critical');
    shuffle(available, true);
    let count = min(FALSE_ALERT_COUNT, available.length);
    for (let i = 0; i < count; i++) available[i].hasFalseAlert = true;
  }
  // Force tension to start ramping for the tension demo
  if (step.forceTension) {
    tensionMeter = 30; // Start partway up so it fills faster
  }
}

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
  // Reset to Level 1 and let the player finish it
  levelConfig = LEVELS[0];
  actionBtns = [];
  initGame(0);
  startCountdown();
}

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

  // Smart dialog positioning based on what's highlighted
  let dlgW = 560, dlgH = 130;
  let dlgX, dlgY;
  let arrowDir = null; // 'down', 'up', 'left', 'right' — points TOWARD the highlighted element
  let arrowTargetX, arrowTargetY;

  let hl = step.highlight;
  let boardCenterX = boardX + boardW / 2;
  let boardCenterY = boardY + boardH / 2;

  if (hl === 'hp_bars' || hl === 'water_bars' || hl === 'light_bars') {
    // Bars are at the bottom of beds — put dialog at top
    dlgX = boardCenterX - dlgW / 2;
    dlgY = 20;
    arrowDir = 'down';
    // Compute actual bar Y position using same math as drawBed/highlight
    let bed = beds[0];
    let bBarH = 8, bLabelH = 11, bBarGap = 4, bBottomPad = 6;
    let bTotalBarArea = 3 * (bBarH + bLabelH + bBarGap);
    let bBarAreaTop = bed.y + bed.h - bBottomPad - bTotalBarArea;
    if (hl === 'hp_bars') {
      arrowTargetY = bBarAreaTop + (bLabelH + bBarH) / 2;
    } else if (hl === 'water_bars') {
      arrowTargetY = bBarAreaTop + (bLabelH + bBarH + bBarGap) + (bLabelH + bBarH) / 2;
    } else {
      arrowTargetY = bBarAreaTop + 2 * (bLabelH + bBarH + bBarGap) + (bLabelH + bBarH) / 2;
    }
    arrowTargetX = bed.x + bed.w / 2;
  } else if (hl === 'beds' || hl === 'board') {
    // Beds fill the board — put dialog at top
    dlgX = boardCenterX - dlgW / 2;
    dlgY = 20;
    arrowDir = 'down';
    arrowTargetX = boardCenterX;
    arrowTargetY = boardCenterY;
  } else if (hl === 'panel') {
    // Panel is on right — put dialog on left
    dlgX = 30;
    dlgY = CANVAS_H / 2 - dlgH / 2;
    arrowDir = 'right';
    arrowTargetX = panelX;
    arrowTargetY = CANVAS_H / 2;
  } else if (hl === 'wilted') {
    // Wilted counter is at bottom right of panel
    dlgX = 30;
    dlgY = CANVAS_H - dlgH - 80;
    arrowDir = 'right';
    arrowTargetX = panelX;
    arrowTargetY = CANVAS_H - 40;
  } else if (hl === 'tension_meter') {
    // Tension meter is mid-right panel
    dlgX = 30;
    dlgY = 180;
    arrowDir = 'right';
    arrowTargetX = panelX;
    arrowTargetY = 255;
  } else if (hl === 'breathe_btn') {
    // Breathe button — use tracked Y from drawActionButtons
    dlgX = 30;
    let bBtnY = lastBreatheButtonY > 0 ? lastBreatheButtonY : CANVAS_H - 120;
    dlgY = bBtnY - dlgH / 2 + 19;
    dlgY = constrain(dlgY, 20, CANVAS_H - dlgH - 60);
    arrowDir = 'right';
    arrowTargetX = panelX;
    arrowTargetY = bBtnY + 19;
  } else if (hl === 'water_btn' || hl === 'light_btn' || hl === 'airflow_btn') {
    // Action buttons are on right panel — put dialog on left
    let btnIndex = hl === 'water_btn' ? 0 : hl === 'light_btn' ? 1 : 2;
    let btn = actionBtns.length > btnIndex ? actionBtns[btnIndex] : null;
    dlgX = 30;
    dlgY = btn ? btn.y - dlgH / 2 + 16 : CANVAS_H / 2 - dlgH / 2;
    // Clamp so dialog stays on screen
    dlgY = constrain(dlgY, 20, CANVAS_H - dlgH - 60);
    arrowDir = 'right';
    arrowTargetX = btn ? btn.x : panelX;
    arrowTargetY = btn ? btn.y + btn.h / 2 : CANVAS_H / 2;
  } else {
    // No highlight or null — center the dialog
    dlgX = (CANVAS_W - PANEL_WIDTH) / 2 - dlgW / 2 + 10;
    dlgY = CANVAS_H / 2 - dlgH / 2;
  }

  // Clamp dialog to screen bounds
  dlgX = constrain(dlgX, 10, CANVAS_W - dlgW - 10);
  dlgY = constrain(dlgY, 10, CANVAS_H - dlgH - 50);

  // Draw arrow line from dialog edge toward highlighted element
  if (arrowDir && arrowTargetX !== undefined) {
    let lineStartX, lineStartY;
    if (arrowDir === 'down') {
      lineStartX = dlgX + dlgW / 2;
      lineStartY = dlgY + dlgH;
    } else if (arrowDir === 'up') {
      lineStartX = dlgX + dlgW / 2;
      lineStartY = dlgY;
    } else if (arrowDir === 'right') {
      lineStartX = dlgX + dlgW;
      lineStartY = dlgY + dlgH / 2;
    } else {
      lineStartX = dlgX;
      lineStartY = dlgY + dlgH / 2;
    }
    // Draw dashed-style arrow line
    stroke(COL.accent[0], COL.accent[1], COL.accent[2], 120);
    strokeWeight(2);
    line(lineStartX, lineStartY, arrowTargetX, arrowTargetY);
    // Arrowhead
    let angle = atan2(arrowTargetY - lineStartY, arrowTargetX - lineStartX);
    let ahSize = 10;
    fill(COL.accent[0], COL.accent[1], COL.accent[2], 150);
    noStroke();
    push();
    translate(arrowTargetX, arrowTargetY);
    rotate(angle);
    triangle(0, 0, -ahSize, -ahSize / 2, -ahSize, ahSize / 2);
    pop();
  }

  // Dialog dims when breathing during tutorial so focus is on the breathe
  let dlgAlpha = (isBreathing && step.advanceOn === 'breathe') ? 80 : 240;
  let textAlpha = (isBreathing && step.advanceOn === 'breathe') ? 60 : 255;

  // Dialog background
  fill(12, 16, 30, dlgAlpha);
  stroke(COL.accent[0], COL.accent[1], COL.accent[2], dlgAlpha * 0.75);
  strokeWeight(3);
  rect(dlgX, dlgY, dlgW, dlgH, 12);
  noStroke();

  // Main text — large and bold
  fill(COL.textPrimary[0], COL.textPrimary[1], COL.textPrimary[2], textAlpha);
  textAlign(CENTER, CENTER);
  textSize(20);
  textStyle(BOLD);
  let lines = step.text.split('\n');
  let lineHeight = 26;
  let totalTextH = lines.length * lineHeight;
  let startTextY = dlgY + dlgH / 2 - totalTextH / 2 - 10;
  for (let i = 0; i < lines.length; i++) {
    text(lines[i], dlgX + dlgW / 2, startTextY + i * lineHeight);
  }
  textStyle(NORMAL);

  // Hint text — pulsing
  let hintAlpha = isBreathing && step.advanceOn === 'breathe' ? 40 : 160 + sin(millis() / 400) * 80;
  fill(COL.accent[0], COL.accent[1], COL.accent[2], hintAlpha);
  textSize(15);
  textStyle(BOLD);
  text(step.hint, dlgX + dlgW / 2, dlgY + dlgH - 22);
  textStyle(NORMAL);

  // Pulsing down arrow for click-to-continue steps
  if (step.advanceOn === 'click') {
    let clickArrowY = dlgY + dlgH + 6 + sin(millis() / 300) * 5;
    fill(COL.accent[0], COL.accent[1], COL.accent[2], hintAlpha);
    textSize(18);
    textAlign(CENTER, CENTER);
    text('\u25BC', dlgX + dlgW / 2, clickArrowY);
  }

  // Step indicator dots
  let dotY2 = dlgY + dlgH + 24;
  let dotSpacing = 14;
  let totalDotsW = TUTORIAL_STEPS.length * dotSpacing;
  for (let i = 0; i < TUTORIAL_STEPS.length; i++) {
    let dotX = dlgX + dlgW / 2 - totalDotsW / 2 + i * dotSpacing + dotSpacing / 2;
    if (i < tutorialStep) fill(COL.accent[0], COL.accent[1], COL.accent[2], 180);
    else if (i === tutorialStep) fill(COL.accent[0], COL.accent[1], COL.accent[2], 200 + sin(millis() / 300) * 55);
    else fill(60, 70, 60);
    noStroke();
    ellipse(dotX, dotY2, 7, 7);
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
      let barH = 8, barW = bed.w - 16, barX = bed.x + 8, labelH = 11, barGap = 4;
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
      let barH = 8, barW = bed.w - 16, barX = bed.x + 8, labelH = 11, barGap = 4;
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
      let barH = 8, barW = bed.w - 16, barX = bed.x + 8, labelH = 11, barGap = 4;
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
    let tensionY = 220;
    noFill();
    stroke(COL.tension[0], COL.tension[1], COL.tension[2], pulseAlpha);
    strokeWeight(3);
    rect(px - 6, tensionY - 6, pw + 12, 70, 6);
    pop();
  }

  if (hl === 'breathe_btn') {
    push();
    drawPanel();
    let px2 = panelX + 20, pw2 = PANEL_WIDTH - 40;
    let bBtnY2 = lastBreatheButtonY > 0 ? lastBreatheButtonY : CANVAS_H - 120;
    let btnH2 = 38;
    noFill();
    stroke(160, 170, 180, pulseAlpha);
    strokeWeight(4);
    rect(px2 - 4, bBtnY2 - 4, pw2 + 8, btnH2 + 8, 8);
    pop();
  }
}

// ============================================================
// COUNTDOWN SYSTEM
// ============================================================
function startCountdown() {
  gameState = STATE.COUNTDOWN;
  countdownTimer = 0;
  countdownPhase = 0;
  resumeBGM();
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
  let displaySize = 96;

  if (countdownTimer < 1) { displayText = '3'; displayColor = COL.accent; }
  else if (countdownTimer < 2) { displayText = '2'; displayColor = COL.accent; }
  else if (countdownTimer < 3) { displayText = '1'; displayColor = COL.accent; }
  else { displayText = 'GO!'; displayColor = COL.combo; displaySize = 110; }

  let cx = (CANVAS_W - PANEL_WIDTH) / 2 + 10;
  let cy = CANVAS_H / 2;
  let t = millis() / 1000;

  // Circular pulse ring behind number
  let phase = countdownTimer % 1.0;
  let ringRadius = 40 + phase * 80;
  let ringAlpha = (1 - phase) * 120;
  noFill();
  stroke(displayColor[0], displayColor[1], displayColor[2], ringAlpha);
  strokeWeight(3);
  ellipse(cx, cy, ringRadius * 2, ringRadius * 2);
  // Second ring offset
  let phase2 = (countdownTimer + 0.5) % 1.0;
  let ringRadius2 = 40 + phase2 * 80;
  let ringAlpha2 = (1 - phase2) * 80;
  stroke(displayColor[0], displayColor[1], displayColor[2], ringAlpha2);
  strokeWeight(2);
  ellipse(cx, cy, ringRadius2 * 2, ringRadius2 * 2);
  noStroke();

  // Level name in accent color above
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(28);
  // Glow behind level name
  fill(COL.accent[0], COL.accent[1], COL.accent[2], 40);
  text(levelConfig.label, cx, cy - 100);
  fill(COL.accent[0], COL.accent[1], COL.accent[2]);
  text(levelConfig.label, cx, cy - 100);

  // Glow layers behind countdown number
  textSize(displaySize + 40);
  fill(displayColor[0], displayColor[1], displayColor[2], 20);
  text(displayText, cx, cy);
  textSize(displaySize + 18);
  fill(displayColor[0], displayColor[1], displayColor[2], 40);
  text(displayText, cx, cy);

  // Main countdown number
  textSize(displaySize);
  fill(displayColor[0], displayColor[1], displayColor[2]);
  text(displayText, cx, cy);
  textStyle(NORMAL);
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

  // Title with glow
  textAlign(CENTER, TOP); textStyle(BOLD);
  textSize(42);
  fill(COL.accent[0], COL.accent[1], COL.accent[2], 25);
  text('How to Play', cx, oy + 50);
  textSize(38);
  fill(COL.accent[0], COL.accent[1], COL.accent[2]);
  text('How to Play', cx, oy + 52);

  // === TOP SECTION: Action cards ===
  let cardW = 200, cardH = 120, cardGap = 30;
  let cardsStartX = cx - (3 * cardW + 2 * cardGap) / 2;
  let cardsY = oy + 108;

  let actions = [
    { icon: '\uD83D\uDCA7', key: 'Q', desc: 'Water the plant', col: COL.water },
    { icon: '\u2600', key: 'E', desc: 'Give it light', col: COL.light },
    { icon: '\uD83C\uDF2C', key: 'R', desc: 'Slow the drain', col: COL.airflow },
  ];

  for (let i = 0; i < actions.length; i++) {
    let ax = cardsStartX + i * (cardW + cardGap);
    let a = actions[i];

    // Card background
    fill(32, 36, 45, 210);
    stroke(a.col[0], a.col[1], a.col[2], 60);
    strokeWeight(1.5);
    rect(ax, cardsY, cardW, cardH, 8);
    noStroke();

    // Colored top border bar
    fill(a.col[0], a.col[1], a.col[2], 180);
    rect(ax + 8, cardsY, cardW - 16, 3, 2);

    // Icon
    textAlign(CENTER, CENTER); textSize(38);
    fill(a.col[0], a.col[1], a.col[2]);
    text(a.icon, ax + cardW / 2, cardsY + 34);

    // Key binding
    textSize(28); textStyle(BOLD);
    fill(COL.textPrimary);
    text(a.key, ax + cardW / 2, cardsY + 68);

    // Description
    textSize(18); textStyle(NORMAL);
    fill(COL.textSecondary);
    text(a.desc, ax + cardW / 2, cardsY + 98);
  }

  // Movement line
  textAlign(CENTER, TOP); textSize(17); textStyle(NORMAL);
  fill(COL.textSecondary);
  text('WASD / Arrows / Click to select a plant', cx, cardsY + cardH + 18);

  // === MIDDLE SECTION: Key concepts ===
  let conceptsY = cardsY + cardH + 55;
  let conceptItems = [
    { icon: '\u26A1', label: 'Surges', desc: 'Random disruptions \u2014 things drain faster', col: COL.surge },
    { icon: '\u2593', label: 'Tension', desc: 'High tension = faster drain. Overload = brief freeze', col: COL.tension },
    { icon: '\u{1F4A8}', label: 'Breathe', desc: 'Hold Space to calm down and slow everything', col: COL.water },
    { icon: '\u2605', label: 'Harmony', desc: 'Keep plants healthy for score bonus', col: COL.combo },
  ];

  for (let i = 0; i < conceptItems.length; i++) {
    let item = conceptItems[i];
    let iy = conceptsY + i * 44;
    let leftEdge = cx - 280;

    // Colored dot before label
    noStroke();
    fill(item.col[0], item.col[1], item.col[2], 200);
    ellipse(leftEdge + 4, iy + 10, 8, 8);

    // Icon
    textAlign(LEFT, CENTER); textSize(26);
    fill(item.col[0], item.col[1], item.col[2]);
    text(item.icon, leftEdge + 16, iy + 10);

    // Label
    textSize(19); textStyle(BOLD);
    fill(item.col[0], item.col[1], item.col[2]);
    text(item.label, leftEdge + 48, iy + 10);

    // Description
    textSize(17); textStyle(NORMAL);
    fill(COL.textSecondary);
    text(item.desc, leftEdge + 190, iy + 10);
  }

  // === BOTTOM SECTION: Design note ===
  let noteY = conceptsY + conceptItems.length * 44 + 30;
  textAlign(CENTER, CENTER); textSize(16); textStyle(ITALIC);
  fill(COL.textSecondary[0], COL.textSecondary[1], COL.textSecondary[2], 160);
  text('This game uses symbolic mechanics to respectfully represent disruption and coping.', cx, noteY);
  textStyle(NORMAL);

  // Close button — bigger
  let closeBtnW = 180, closeBtnH = 50;
  let closeBtnX = ox + INSTR_OVERLAY_W - closeBtnW - 20;
  let closeBtnY = oy + INSTR_OVERLAY_H - closeBtnH - 14;
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

  // Overwhelm freeze visual
  if (overwhelmTimer > 0) {
    fill(10, 5, 15, 140);
    noStroke();
    rect(0, 0, CANVAS_W, CANVAS_H);
    textAlign(CENTER, CENTER); textStyle(BOLD);
    textSize(32);
    fill(COL.textPrimary[0], COL.textPrimary[1], COL.textPrimary[2], 200);
    text('Overwhelmed...', boardX + boardW/2, CANVAS_H/2 - 20);
    textSize(18); textStyle(NORMAL);
    fill(COL.textSecondary);
    text('Take a moment.', boardX + boardW/2, CANVAS_H/2 + 15);
  }

  // Breathing visual overlay — soft grey calm
  if (isBreathing) {
    let breatheAlpha = 18 + sin(millis() / 500) * 8;
    fill(140, 150, 160, breatheAlpha);
    noStroke();
    rect(0, 0, CANVAS_W, CANVAS_H);
    // Calming pulse circle in center
    let pulseSize = 60 + sin(millis() / 600) * 20;
    fill(160, 170, 180, 20);
    ellipse(boardX + boardW/2, CANVAS_H/2, pulseSize, pulseSize);
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
  else fill(COL.bedNormal);

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
      let availW = bw - 2;
      let availH = bh - 2;
      let sc = min(availW / img.width, availH / img.height);
      let drawW = img.width * sc;
      let drawH = img.height * sc;
      let drawX = bx + 1 + (availW - drawW) / 2;
      let drawY = by + 1 + (availH - drawH) / 2;
      image(img, drawX, drawY, drawW, drawH);
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
  let barH = 8, barW = bw-16, barX = bx+8, barGap = 4, labelH = 11;
  let bottomPad = 6;
  let totalBarArea = 3*(barH+labelH+barGap);
  let barAreaTop = by + bh - bottomPad - totalBarArea;

  fill(0,0,0,120); noStroke();
  rect(bx+1, barAreaTop-6, bw-2, bh-(barAreaTop-by)+5, 4,4,4,4);
  // Slightly lighter inner background so bars pop
  fill(30,35,30,60);
  rect(bx+3, barAreaTop-4, bw-6, bh-(barAreaTop-by)+2, 3,3,4,4);

  let hc = bed.health > 50 ? COL.health :
    [lerp(COL.healthLow[0],COL.health[0],bed.health/50),
     lerp(COL.healthLow[1],COL.health[1],bed.health/50),
     lerp(COL.healthLow[2],COL.health[2],bed.health/50)];

  let curY = barAreaTop;

  textSize(9); textStyle(BOLD); fill(hc); textAlign(LEFT,TOP);
  text('HP '+floor(bed.health), barX, curY); textStyle(NORMAL);
  curY += labelH;
  fill(20,25,20); rect(barX, curY, barW, barH, 2);
  let hpW = barW*bed.health/100;
  fill(hc); rect(barX, curY, hpW, barH, 2);
  // Glow edge on top of filled bar
  if (hpW > 2) { fill(hc[0]+40,hc[1]+40,hc[2]+40,120); rect(barX, curY, hpW, 1, 1); }
  curY += barH + barGap;

  textSize(9); fill(COL.water); textAlign(LEFT,TOP);
  text('\uD83D\uDCA7 '+floor(bed.water), barX, curY); curY += labelH;
  fill(20,25,35); rect(barX, curY, barW, barH, 2);
  let wW = barW*bed.water/100;
  fill(COL.water); rect(barX, curY, wW, barH, 2);
  if (wW > 2) { fill(COL.water[0]+40,COL.water[1]+40,COL.water[2]+20,120); rect(barX, curY, wW, 1, 1); }
  curY += barH + barGap;

  textSize(9); fill(COL.light); textAlign(LEFT,TOP);
  text('\u2600 '+floor(bed.light), barX, curY);
  if (bed.airflowActive) {
    fill(COL.airflow[0],COL.airflow[1],COL.airflow[2],200);
    textAlign(RIGHT,TOP); text('\uD83C\uDF2C'+floor(bed.airflowTimer)+'s', barX+barW, curY);
    textAlign(LEFT,TOP);
  }
  curY += labelH;
  fill(20,25,20); rect(barX, curY, barW, barH, 2);
  let lW = barW*bed.light/100;
  fill(COL.light); rect(barX, curY, lW, barH, 2);
  if (lW > 2) { fill(COL.light[0]+10,COL.light[1]+20,COL.light[2]+40,120); rect(barX, curY, lW, 1, 1); }

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

  fill(COL.textSecondary[0],COL.textSecondary[1],COL.textSecondary[2],120);
  textAlign(LEFT,TOP); textSize(9);
  text('#'+(bed.index+1), bx+4, by+4);
}

// ============================================================
// SIDE PANEL
// ============================================================
function drawPanel() {
  fill(COL.panelBg); stroke(50,60,50); strokeWeight(1);
  rect(panelX, 0, PANEL_WIDTH, CANVAS_H); noStroke();

  // Subtle inner glow gradient at top
  for (let i = 0; i < 80; i++) {
    let a = map(i, 0, 80, 40, 0);
    fill(30, 45, 40, a);
    rect(panelX+1, i, PANEL_WIDTH-2, 1);
  }

  let px = panelX+20, py = 20, pw = PANEL_WIDTH-40;

  // Level indicator
  textAlign(LEFT,TOP); textStyle(BOLD); textSize(18);
  fill(COL.accent[0], COL.accent[1], COL.accent[2]);
  text('\u{1F33F} ' + levelConfig.label, px, py);

  // Level progress dots
  let dotStartX = px;
  let dotY = py + 26;
  for (let i = 0; i < LEVELS.length; i++) {
    let dx = dotStartX + i * 16;
    if (i < currentLevel) fill(COL.accent[0], COL.accent[1], COL.accent[2]);
    else if (i === currentLevel) fill(COL.accent[0], COL.accent[1], COL.accent[2], 200 + sin(millis()/300)*55);
    else fill(60, 70, 60);
    noStroke();
    ellipse(dx + 5, dotY + 4, 8, 8);
  }
  py += 46;

  // Timer with circular background and accent left border
  noStroke();
  fill(COL.accent[0], COL.accent[1], COL.accent[2], 160);
  rect(px - 6, py, 2, 14);
  textStyle(BOLD); textSize(14);
  fill(COL.textSecondary); text('TIME', px, py);
  let timerVal = floor(timer);
  // Subtle circular bg behind timer number
  fill(25, 30, 35, 80);
  noStroke();
  ellipse(px + 30, py + 36, 56, 56);
  textSize(36);
  // Pulse when timer < 10
  let timerAlpha = 255;
  if (timerVal < 10) { timerAlpha = 180 + sin(millis() / 200) * 75; }
  if (timer < 15) fill(COL.healthLow[0], COL.healthLow[1], COL.healthLow[2], timerAlpha);
  else fill(COL.textPrimary[0], COL.textPrimary[1], COL.textPrimary[2], timerAlpha);
  text(timerVal+'s', px, py+16); py += 68;

  // Score with accent left border
  noStroke();
  fill(COL.accent[0], COL.accent[1], COL.accent[2], 160);
  rect(px - 6, py, 2, 14);
  textSize(14); fill(COL.textSecondary); text('SCORE', px, py);
  textStyle(BOLD); textSize(30); fill(COL.textPrimary); text(floor(score), px, py+16); textStyle(NORMAL); py += 58;

  // Harmony with accent left border
  noStroke();
  fill(COL.accent[0], COL.accent[1], COL.accent[2], 160);
  rect(px - 6, py, 2, 14);
  textSize(14); fill(COL.combo);
  text('HARMONY  x'+nf(comboMultiplier,1,1), px, py); py += 20;
  // Inner shadow behind harmony bar
  fill(15,15,10); rect(px, py, pw, 12, 4);
  fill(30,30,20); rect(px+1, py+1, pw-2, 10, 3);
  fill(COL.combo); rect(px, py, pw*((comboMultiplier-1)/(COMBO_MAX_MULTIPLIER-1)), 12, 4);
  py += 28;

  // Tension (only show if surges are active for this level)
  if (levelConfig.surgeMult > 0) {
    noStroke();
    fill(COL.accent[0], COL.accent[1], COL.accent[2], 160);
    rect(px - 6, py, 2, 14);
    textSize(14); fill(COL.textSecondary); text('TENSION', px, py); py += 18;
    // Glow effect when tension > 60
    if (tensionMeter > 60) {
      fill(200, 60, 60, 20 + sin(millis()/200)*15);
      noStroke();
      rect(px-4, py-4, pw+8, 26, 6);
    }
    fill(25,20,20); rect(px, py, pw, 18, 5);
    fill(30,25,25); rect(px+1, py+1, pw-2, 16, 4);
    let tc = tensionMeter<30 ? [80,180,120] : tensionMeter<60 ? [200,180,60] :
             tensionMeter<80 ? [220,120,50] : [200,60,60];
    fill(tc); rect(px, py, pw*tensionMeter/100, 18, 5);
    fill(COL.textPrimary); textAlign(CENTER,CENTER); textSize(11);
    text(floor(tensionMeter), px+pw/2, py+9);
    textAlign(LEFT,TOP); py += 34;

    textSize(14);
    if (surgeActive) {
      // Pulsing red glow dot
      let surgeGlow = 180 + sin(millis() / 150) * 75;
      fill(COL.surge[0], COL.surge[1], COL.surge[2], surgeGlow);
      noStroke(); ellipse(px + 5, py + 7, 8, 8);
      fill(COL.surge[0], COL.surge[1], COL.surge[2], surgeGlow);
      textStyle(BOLD); text('  SURGE ACTIVE', px + 4, py); textStyle(NORMAL);
    } else if (isBreathing) {
      let breatheGlow = 180 + sin(millis() / 400) * 75;
      fill(80, 180, 220, breatheGlow);
      noStroke(); ellipse(px + 5, py + 7, 8, 8);
      fill(80, 180, 220, breatheGlow);
      textStyle(BOLD); text('  Breathing...', px + 4, py); textStyle(NORMAL);
    } else { fill(COL.textSecondary); text('System Stable', px, py); }
    py += 28;
  } else {
    py += 10;
  }

  // Gradient fade divider
  noStroke();
  for (let i = 0; i < pw; i++) {
    let a = sin(map(i, 0, pw, 0, PI)) * 80;
    fill(COL.accent[0], COL.accent[1], COL.accent[2], a);
    rect(px+i, py, 1, 1);
  }
  py += 14;

  let sb = beds[selectedBed];
  noStroke();
  fill(COL.accent[0], COL.accent[1], COL.accent[2], 160);
  rect(px - 6, py, 2, 14);
  textSize(14); fill(COL.textSecondary);
  text('SELECTED BED #'+(selectedBed+1), px, py); py += 22;

  if (sb && !sb.isWilted) {
    textSize(13);
    // Mini colored dots before each stat
    fill(COL.health); noStroke(); ellipse(px+4, py+7, 6, 6);
    fill(COL.textPrimary); textStyle(BOLD); text('  Health: '+floor(sb.health), px+6, py); textStyle(NORMAL); py += 18;
    fill(COL.water); ellipse(px+4, py+7, 6, 6);
    fill(COL.water); textStyle(BOLD); text('  Water:  '+floor(sb.water), px+6, py); textStyle(NORMAL); py += 18;
    fill(COL.light); ellipse(px+4, py+7, 6, 6);
    fill(COL.light); textStyle(BOLD); text('  Light:  '+floor(sb.light), px+6, py); textStyle(NORMAL); py += 18;
    if (sb.airflowActive) { fill(COL.airflow); ellipse(px+4, py+7, 6, 6); textStyle(BOLD); text('  Airflow: '+nf(sb.airflowTimer,1,1)+'s', px+6, py); textStyle(NORMAL); }
  } else if (sb && sb.isWilted) {
    fill(COL.healthLow); textSize(13); text('This plant has wilted.', px, py);
  }
  py += 30;

  drawActionButtons(px, py, pw);

  let wc = beds.filter(b => b.isWilted).length;
  let wiltNearThreshold = wc >= currentLoseThreshold - 1;
  // Background card when near threshold
  if (wiltNearThreshold) {
    noStroke();
    fill(COL.healthLow[0], COL.healthLow[1], COL.healthLow[2], 25);
    rect(px - 4, CANVAS_H - 56, pw + 8, 26, 6);
  }
  textAlign(LEFT,BOTTOM); textSize(15);
  fill(wiltNearThreshold ? COL.healthLow : COL.textSecondary);
  let wiltWarning = wiltNearThreshold ? '\u26A0 ' : '';
  textStyle(BOLD);
  text(wiltWarning+'Wilted: '+wc+' / '+currentLoseThreshold+' max', px, CANVAS_H-36);
  textStyle(NORMAL);
  textSize(11); fill(COL.textSecondary[0],COL.textSecondary[1],COL.textSecondary[2],140);
  text('Esc=Pause  Space=Breathe  M=Mute', px, CANVAS_H-18);
}

// ============================================================
// ACTION BUTTONS (color-coded)
// ============================================================
let actionBtns = [];
let lastBreatheButtonY = 0; // tracked for tutorial highlight

function drawActionButtons(px, py, pw) {
  let btnW = pw, btnH = 38, gap = 8;
  if (actionBtns.length === 0) {
    actionBtns.push(new Button(px, py, btnW, btnH, '\uD83D\uDCA7 Water  [Q]', () => queueAction(() => doAction('water')), 'water'));
    actionBtns.push(new Button(px, py+btnH+gap, btnW, btnH, '\u2600 Light  [E]', () => queueAction(() => doAction('light')), 'light'));
    actionBtns.push(new Button(px, py+2*(btnH+gap), btnW, btnH, '\uD83C\uDF2C Airflow  [R]', () => queueAction(() => doAction('airflow')), 'airflow'));
  }
  actionBtns[0].y = py;
  actionBtns[0].h = btnH;
  actionBtns[1].y = py + btnH + gap;
  actionBtns[1].h = btnH;
  actionBtns[2].y = py + 2*(btnH+gap);
  actionBtns[2].h = btnH;

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

    // Bottom shadow for all buttons
    noStroke();
    fill(8, 10, 8, 60);
    rect(btn.x, btn.y + 2, btn.w, btn.h, 6);

    if (!available) {
      fill(42,46,44); stroke(55,60,55); strokeWeight(1);
      rect(btn.x, btn.y, btn.w, btn.h, 6); noStroke();
      fill(COL.textSecondary[0],COL.textSecondary[1],COL.textSecondary[2],80);
      textAlign(CENTER,CENTER); textSize(15);
      text(btn.label, btn.x+btn.w/2, btn.y+btn.h/2);
    } else {
      // Use color-coded button
      let colors = btnColors[btn.id];
      let col = btn.hovered ? colors.hover : colors.base;
      fill(col[0], col[1], col[2]);
      stroke(COL.accent[0], COL.accent[1], COL.accent[2], btn.hovered ? 180 : 120);
      strokeWeight(1.5);
      rect(btn.x, btn.y, btn.w, btn.h, 6);
      // Inner glow along top edge
      noStroke();
      fill(255, 255, 255, 25);
      rect(btn.x+2, btn.y+1, btn.w-4, 1, 1);
      fill(COL.buttonText[0], COL.buttonText[1], COL.buttonText[2]);
      textAlign(CENTER, CENTER);
      textSize(15);
      textStyle(BOLD);
      text(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
      textStyle(NORMAL);
    }
  }

  // Breathe button (visual indicator, activated by holding Space)
  let breatheY = py + 3 * (btnH + gap) + gap;
  lastBreatheButtonY = breatheY;
  let breatheAvail = breatheCooldown <= 0 && overwhelmTimer <= 0 && !isBreathing && tensionMeter > 0;

  // Bottom shadow
  noStroke();
  fill(8, 10, 8, 60);
  rect(px, breatheY + 2, btnW, btnH, 6);

  if (isBreathing) {
    // Active breathing state — calming grey pulse
    let breathePulse = 0.7 + sin(millis() / 500) * 0.3;
    fill(70 * breathePulse, 75 * breathePulse, 80 * breathePulse);
    stroke(160, 170, 180, 180);
    strokeWeight(2);
    rect(px, breatheY, btnW, btnH, 6);
    noStroke();
    fill(220, 225, 230);
    textAlign(CENTER, CENTER); textSize(15); textStyle(BOLD);
    text('Breathing...', px + btnW/2, breatheY + btnH/2);
    textStyle(NORMAL);
  } else if (!breatheAvail) {
    // On cooldown or no tension
    fill(42, 46, 44); stroke(55, 60, 55); strokeWeight(1);
    rect(px, breatheY, btnW, btnH, 6); noStroke();
    fill(COL.textSecondary[0], COL.textSecondary[1], COL.textSecondary[2], 80);
    textAlign(CENTER, CENTER); textSize(15);
    text('\u{1F4A8} Breathe [Space] ' + (breatheCooldown > 0 ? nf(breatheCooldown, 1, 0) + 's' : ''), px + btnW/2, breatheY + btnH/2);
  } else {
    // Available — lighter grey so it's clearly active
    let hov = mouseX >= px && mouseX <= px + btnW && mouseY >= breatheY && mouseY <= breatheY + btnH;
    fill(hov ? [75, 82, 88] : [58, 64, 70]);
    stroke(180, 190, 200, hov ? 200 : 130);
    strokeWeight(1.5);
    rect(px, breatheY, btnW, btnH, 6);
    noStroke();
    // Inner glow
    fill(180, 190, 200, 50);
    rect(px + 1, breatheY + 1, btnW - 2, 1, 1);
    fill(COL.buttonText);
    textAlign(CENTER, CENTER); textSize(15); textStyle(BOLD);
    text('\u{1F4A8} Breathe  [Hold Space]', px + btnW/2, breatheY + btnH/2);
    textStyle(NORMAL);
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
      tutorialSurgeActive = false;
      surgeActive = false;
      surgeVisualIntensity = 0;
      tensionMeter = 0;
      for (let b of beds) b.hasFalseAlert = false;
      actionBtns = [];
      initGame(1);
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

  // Subtle vignette effect (darker edges)
  noStroke();
  for (let i = 0; i < 60; i++) {
    let a = map(i, 0, 60, 40, 0);
    fill(0, 0, 0, a);
    rect(0, i, CANVAS_W, 1);
    rect(0, CANVAS_H - i, CANVAS_W, 1);
    rect(i, 0, 1, CANVAS_H);
    rect(CANVAS_W - i, 0, 1, CANVAS_H);
  }

  textAlign(CENTER, CENTER);
  // Game title above PAUSED
  textStyle(BOLD); textSize(20);
  fill(COL.accent[0], COL.accent[1], COL.accent[2], 180);
  text('Garden Circuit', CANVAS_W/2, CANVAS_H/2 - 170);

  // "PAUSED" with glow
  textStyle(BOLD);
  textSize(48);
  fill(COL.textPrimary[0], COL.textPrimary[1], COL.textPrimary[2], 25);
  text('PAUSED', CANVAS_W/2, CANVAS_H/2 - 138);
  textSize(42);
  fill(COL.textPrimary);
  text('PAUSED', CANVAS_W/2, CANVAS_H/2 - 140);
  textStyle(NORMAL); textSize(16);
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

  // --- Botanical victory scene ---
  // Soft light rays from above
  for (let i = 0; i < 5; i++) {
    let rayX = cx - 200 + i * 100 + sin(t * 0.3 + i) * 20;
    let rayAlpha = 8 + sin(t * 0.5 + i * 0.7) * 4;
    fill(255, 240, 180, rayAlpha);
    beginShape();
    vertex(rayX - 15, 0);
    vertex(rayX + 15, 0);
    vertex(rayX + 60, CANVAS_H);
    vertex(rayX - 60, CANVAS_H);
    endShape(CLOSE);
  }

  // Ground line
  fill(40, 80, 50, 120);
  rect(0, CANVAS_H - 100, CANVAS_W, 100);
  stroke(60, 130, 70, 100); strokeWeight(2);
  line(0, CANVAS_H - 100, CANVAS_W, CANVAS_H - 100);
  noStroke();

  // Small plant silhouettes along the ground
  let plantPositions = [120, 280, 500, 720, 900];
  for (let i = 0; i < plantPositions.length; i++) {
    let px2 = plantPositions[i];
    let groundY = CANVAS_H - 100;
    let sway = sin(t * 0.8 + i * 1.3) * 3;
    // Stem
    stroke(50, 100, 60, 100); strokeWeight(2);
    line(px2, groundY, px2 + sway, groundY - 30 - i * 5);
    noStroke();
    // Leaf triangle
    fill(50, 120, 60, 80);
    triangle(px2 + sway - 10, groundY - 25 - i * 5,
             px2 + sway + 10, groundY - 25 - i * 5,
             px2 + sway, groundY - 50 - i * 5);
  }

  // Gentle floating leaf particles (small rotated squares drifting down)
  for (let i = 0; i < 8; i++) {
    let leafX = (cx + sin(t * 0.2 + i * 2.1) * 350 + i * 80) % CANVAS_W;
    let leafY = ((t * 15 + i * 90) % (CANVAS_H - 120));
    let leafRot = t * 0.5 + i * 1.5;
    let leafAlpha = 30 + sin(t + i) * 15;
    push();
    translate(leafX, leafY);
    rotate(leafRot);
    fill(70, 140, 80, leafAlpha);
    noStroke();
    rect(-4, -4, 8, 8);
    pop();
  }

  // --- Title with warm golden glow ---
  textAlign(CENTER,CENTER); textStyle(BOLD);
  // Glow layer
  textSize(58);
  fill(COL.combo[0], COL.combo[1], COL.combo[2], 20);
  text(levelConfig.label + ' Complete!', cx, 95);
  textSize(54);
  fill(COL.combo[0], COL.combo[1], COL.combo[2], 35);
  text(levelConfig.label + ' Complete!', cx, 95);
  // Main title
  textSize(52);
  fill(COL.combo[0], COL.combo[1], COL.combo[2]);
  text(levelConfig.label + ' Complete!', cx, 95);

  // Subtitle
  textStyle(NORMAL); textSize(20); fill(COL.textSecondary);
  text('Your garden thrives.', cx, 145);

  // Decorative gradient divider
  noStroke();
  for (let i = 0; i < 300; i++) {
    let divAlpha = sin(map(i, 0, 300, 0, PI)) * 120;
    fill(COL.combo[0], COL.combo[1], COL.combo[2], divAlpha);
    rect(cx - 150 + i, 170, 1, 2);
  }

  // Grade display with golden glow
  let grade = computeGrade();
  textStyle(BOLD);
  textSize(72);
  fill(COL.combo[0], COL.combo[1], COL.combo[2], 20);
  text(grade, cx, 220);
  textSize(68);
  fill(COL.combo[0], COL.combo[1], COL.combo[2], 40);
  text(grade, cx, 220);
  textSize(64);
  fill(COL.combo);
  text(grade, cx, 220);
  textStyle(NORMAL); textSize(16); fill(COL.textSecondary);
  text('Grade', cx, 260);

  // --- Stats in a semi-transparent dark card ---
  let cardX = cx - 180, cardY = 285, cardW2 = 360, cardPad = 20;
  let statLines = 3;
  if (levelConfig.surgeMult > 0) statLines = 4;
  let cardH2 = statLines * 36 + cardPad * 2;
  fill(15, 20, 25, 180);
  noStroke();
  rect(cardX, cardY, cardW2, cardH2, 10);
  // Subtle border
  noFill();
  stroke(COL.combo[0], COL.combo[1], COL.combo[2], 40);
  strokeWeight(1);
  rect(cardX, cardY, cardW2, cardH2, 10);
  noStroke();

  let sy = cardY + cardPad + 10;
  let slh = 36;
  textAlign(LEFT, CENTER); textSize(18);
  fill(COL.textPrimary); text('\uD83D\uDCCA  Score: '+floor(score), cardX + cardPad, sy); sy += slh;
  fill(COL.combo); text('\uD83C\uDFB5  Best Harmony: x'+nf(stats.peakCombo,1,1), cardX + cardPad, sy); sy += slh;
  if (levelConfig.surgeMult > 0) {
    fill(COL.surge); text('\u26A1  Surges Survived: '+stats.surgesSurvived, cardX + cardPad, sy); sy += slh;
  }
  fill(COL.healthLow); text('\uD83E\uDD40  Plants Wilted: '+stats.plantsWilted, cardX + cardPad, sy);
}

// ============================================================
// DRAW: CONGRATS SCREEN
// ============================================================
function drawCongrats() {
  background(COL.bg); let cx = CANVAS_W/2;
  let t = millis()/1000; noStroke();

  // --- Aurora / northern lights effect ---
  let auroraColors = [
    [60, 180, 120],   // green
    [200, 180, 60],   // gold
    [70, 120, 200],   // blue
    [140, 80, 180],   // purple
    [80, 200, 160],   // teal
  ];
  for (let band = 0; band < auroraColors.length; band++) {
    let ac = auroraColors[band];
    let baseY = 80 + band * 60;
    let bandAlpha = 12 + sin(t * 0.3 + band * 1.2) * 6;
    for (let x = 0; x < CANVAS_W; x += 4) {
      let waveY = baseY + sin(x * 0.008 + t * 0.4 + band * 1.5) * 40
                        + sin(x * 0.015 + t * 0.7 + band * 0.8) * 20;
      fill(ac[0], ac[1], ac[2], bandAlpha);
      rect(x, waveY, 5, 50);
    }
  }

  // --- "Congratulations!" with golden glow - 3 layers ---
  textAlign(CENTER,CENTER); textStyle(BOLD);
  textSize(60);
  fill(COL.combo[0], COL.combo[1], COL.combo[2], 20);
  text('Congratulations!', cx, 90);
  textSize(56);
  fill(COL.combo[0], COL.combo[1], COL.combo[2], 40);
  text('Congratulations!', cx, 90);
  textSize(52);
  fill(COL.combo[0], COL.combo[1], COL.combo[2]);
  text('Congratulations!', cx, 90);

  textStyle(NORMAL); textSize(18); fill(COL.textSecondary);
  text('You completed all levels of Garden Circuit.', cx, 140);

  // Decorative gradient divider
  noStroke();
  for (let i = 0; i < 300; i++) {
    let divAlpha = sin(map(i, 0, 300, 0, PI)) * 120;
    fill(COL.combo[0], COL.combo[1], COL.combo[2], divAlpha);
    rect(cx - 150 + i, 165, 1, 2);
  }

  // Grade display with golden glow
  let grade = computeGrade();
  textStyle(BOLD); textSize(68);
  fill(COL.combo[0], COL.combo[1], COL.combo[2], 20);
  text(grade, cx, 210);
  textSize(60);
  fill(COL.combo[0], COL.combo[1], COL.combo[2], 40);
  text(grade, cx, 210);
  textSize(54);
  fill(COL.combo);
  text(grade, cx, 210);
  textStyle(NORMAL); textSize(16); fill(COL.textSecondary);
  text('Final Grade', cx, 248);

  // --- Stats in polished card with golden border ---
  let cardX = cx - 180, cardY = 275, cardW2 = 360, cardPad = 20;
  let cardH2 = 4 * 36 + cardPad * 2;
  fill(15, 20, 25, 190);
  noStroke();
  rect(cardX, cardY, cardW2, cardH2, 10);
  // Golden border
  noFill();
  stroke(COL.combo[0], COL.combo[1], COL.combo[2], 60);
  strokeWeight(1.5);
  rect(cardX, cardY, cardW2, cardH2, 10);
  noStroke();

  let sy = cardY + cardPad + 10;
  let slh = 36;
  textAlign(LEFT, CENTER); textSize(18);
  fill(COL.textPrimary); text('\uD83D\uDCCA  Final Score: '+floor(score), cardX + cardPad, sy); sy += slh;
  fill(COL.combo); text('\uD83C\uDFB5  Best Harmony: x'+nf(stats.peakCombo,1,1), cardX + cardPad, sy); sy += slh;
  fill(COL.surge); text('\u26A1  Surges Survived: '+stats.surgesSurvived, cardX + cardPad, sy); sy += slh;
  fill(COL.healthLow); text('\uD83E\uDD40  Plants Wilted: '+stats.plantsWilted, cardX + cardPad, sy);

  // Thank you message
  let thankY = cardY + cardH2 + 30;
  textAlign(CENTER, CENTER);
  textSize(14); textStyle(ITALIC);
  fill(COL.textSecondary[0], COL.textSecondary[1], COL.textSecondary[2], 160);
  text('This game uses symbolic mechanics to represent disruption and coping.', cx, thankY);
  textSize(16);
  fill(COL.textSecondary[0], COL.textSecondary[1], COL.textSecondary[2], 200);
  text('Thank you for playing.', cx, thankY + 24);
  textStyle(NORMAL);
}

// ============================================================
// DRAW: LOSE SCREEN
// ============================================================
function drawLose() {
  let cx = CANVAS_W/2;
  let t = millis()/1000;

  // --- Dark gradient background (darker at top, lighter at bottom) ---
  noStroke();
  for (let i = 0; i < CANVAS_H; i++) {
    let r = lerp(12, 30, i / CANVAS_H);
    let g = lerp(8, 20, i / CANVAS_H);
    let b = lerp(14, 25, i / CANVAS_H);
    fill(r, g, b);
    rect(0, i, CANVAS_W, 1);
  }

  // Dark red tint
  fill(60, 15, 15, 30);
  rect(0, 0, CANVAS_W, CANVAS_H);

  // Faint rain effect
  stroke(150, 160, 180, 20);
  strokeWeight(1);
  for (let i = 0; i < 40; i++) {
    let rx = (i * 73 + t * 30) % CANVAS_W;
    let ry = ((t * 60 + i * 47) % CANVAS_H);
    line(rx, ry, rx - 1, ry + 12);
  }
  noStroke();

  // Wilted plant shapes (drooping curves)
  let wiltPositions = [150, 350, 550, 750, 950];
  for (let i = 0; i < wiltPositions.length; i++) {
    let wpx = wiltPositions[i];
    let groundY = CANVAS_H - 90;
    // Stem that droops
    stroke(60, 45, 40, 60);
    strokeWeight(2);
    noFill();
    beginShape();
    let droop = 15 + i * 3;
    vertex(wpx, groundY);
    quadraticVertex(wpx - 2, groundY - 25, wpx - droop, groundY - 20 - i * 3);
    endShape();
    noStroke();
    // Wilted leaf (drooping ellipse)
    fill(50, 40, 35, 50);
    push();
    translate(wpx - droop, groundY - 20 - i * 3);
    rotate(0.5 + i * 0.2);
    ellipse(0, 0, 14, 6);
    pop();
  }

  // Ground line (muted)
  fill(30, 25, 22, 80);
  rect(0, CANVAS_H - 90, CANVAS_W, 90);
  stroke(50, 40, 35, 60); strokeWeight(1);
  line(0, CANVAS_H - 90, CANVAS_W, CANVAS_H - 90);
  noStroke();

  // --- Title with dramatic red glow ---
  textAlign(CENTER,CENTER); textStyle(BOLD);
  // Red glow layers
  textSize(56);
  fill(COL.healthLow[0], COL.healthLow[1], COL.healthLow[2], 15);
  text('The Garden Faded', cx, 100);
  textSize(52);
  fill(COL.healthLow[0], COL.healthLow[1], COL.healthLow[2], 30);
  text('The Garden Faded', cx, 100);
  // Main title
  textSize(48);
  fill(COL.textPrimary);
  text('The Garden Faded', cx, 100);

  // Subtitle
  textStyle(NORMAL); textSize(20); fill(COL.textSecondary);
  text('Too many plants were lost \u2014 but every attempt is practice.', cx, 155);

  // Decorative divider
  noStroke();
  for (let i = 0; i < 200; i++) {
    let divAlpha = sin(map(i, 0, 200, 0, PI)) * 60;
    fill(COL.healthLow[0], COL.healthLow[1], COL.healthLow[2], divAlpha);
    rect(cx - 100 + i, 180, 1, 1);
  }

  // --- Stats in a dark, redder-tinted card ---
  let cardX = cx - 180, cardY = 205, cardW2 = 360, cardPad = 20;
  let statLines = 3;
  if (levelConfig.surgeMult > 0) statLines = 4;
  let cardH2 = (statLines + 1) * 36 + cardPad * 2;
  fill(25, 15, 18, 190);
  noStroke();
  rect(cardX, cardY, cardW2, cardH2, 10);
  // Subtle reddish border
  noFill();
  stroke(COL.healthLow[0], COL.healthLow[1], COL.healthLow[2], 35);
  strokeWeight(1);
  rect(cardX, cardY, cardW2, cardH2, 10);
  noStroke();

  let sy = cardY + cardPad + 10;
  let slh = 36;
  textAlign(LEFT, CENTER); textSize(18);
  fill(COL.textPrimary); text('\uD83D\uDCCA  Score: '+floor(score), cardX + cardPad, sy); sy += slh;
  fill(COL.combo); text('\uD83C\uDFB5  Best Harmony: x'+nf(stats.peakCombo,1,1), cardX + cardPad, sy); sy += slh;
  if (levelConfig.surgeMult > 0) {
    fill(COL.surge); text('\u26A1  Surges Survived: '+stats.surgesSurvived, cardX + cardPad, sy); sy += slh;
  }
  fill(COL.accent); text('\u2728  Plants Restored: '+stats.totalRestores, cardX + cardPad, sy); sy += slh;
  fill(COL.healthLow); text('\uD83E\uDD40  Plants Wilted: '+stats.plantsWilted, cardX + cardPad, sy);

  // Encouraging message at the bottom
  textAlign(CENTER, CENTER);
  textSize(16); textStyle(ITALIC);
  fill(COL.textSecondary[0], COL.textSecondary[1], COL.textSecondary[2], 180);
  text('Every garden teaches something.', cx, cardY + cardH2 + 30);
  textStyle(NORMAL);
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
  initModeSelectButtons();
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
    initModeSelectButtons();
    gameState = STATE.MODE_SELECT;
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

    case STATE.MODE_SELECT:
      drawModeSelect();
      break;

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

      // Forced tension demo: ramp tension to 100, trigger overwhelm, auto-advance
      if (step.forceTension) {
        tensionMeter += 25 * dt; // Ramp fast so player sees it fill
        tensionMeter = constrain(tensionMeter, 0, 100);
        if (tensionMeter >= 100 && overwhelmTimer <= 0) {
          overwhelmTimer = TENSION_OVERLOAD_FREEZE;
        }
        if (overwhelmTimer > 0) {
          overwhelmTimer -= dt;
          if (overwhelmTimer <= 0) {
            tensionMeter = 60; // Leave it high so they need to breathe
            overwhelmTimer = 0;
            advanceTutorial();
          }
        }
      }

      // Forced high tension for breathe step: keep tension at 60 until they breathe
      if (step.forceTensionHigh) {
        if (!isBreathing) {
          tensionMeter = max(tensionMeter, 60); // Keep it high
        }
        if (breatheCooldown > 0) breatheCooldown -= dt;
        // Advance once they've breathed it below 30
        if (isBreathing) {
          tensionMeter -= BREATHE_TENSION_REDUCE * dt;
          tensionMeter = max(tensionMeter, 0);
          if (tensionMeter <= 20) {
            isBreathing = false;
            breatheCooldown = 0;
            advanceTutorial();
          }
        }
      }

      drawTutorial();
      break;
    }

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

  // Music toggle icon — always visible on every screen
  drawMusicToggle();
}

// ============================================================
// GAME UPDATE
// ============================================================
function updateGame(dt) {
  let timerDt = isBreathing ? dt * BREATHE_TIMER_SLOW : dt;
  timer -= timerDt; timer = max(0, timer);
  updateDifficulty();
  if (waterCooldown > 0) waterCooldown -= dt;
  if (lightCooldown > 0) lightCooldown -= dt;
  if (airflowCooldown > 0) airflowCooldown -= dt;
  if (actionLockTimer > 0) actionLockTimer -= dt;
  if (breatheCooldown > 0) breatheCooldown -= dt;
  // Stop breathing if spacebar released (handled by keyReleased)
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
  // Start BGM on first interaction
  if (!bgmLoaded) initBGM();

  // Global toggles
  if (key === 'v' || key === 'V') { reducedEffects = !reducedEffects; return; }
  if (key === 'h' || key === 'H') { debugShowHitboxes = !debugShowHitboxes; return; }
  if (key === 'm' || key === 'M') { toggleAudio(); return; }

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

    case STATE.MODE_SELECT:
      if (keyCode === ESCAPE) {
        gameState = STATE.TITLE;
        showTitleVideo();
      }
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
        actionBtns = [];
        initModeSelectButtons();
        gameState = STATE.MODE_SELECT;
        hideTitleVideo();
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

function keyReleased() {
  if (key === ' ') {
    if (isBreathing) {
      isBreathing = false;
      // Don't set cooldown during tutorial breathe step
      if (!tutorialActive) {
        breatheCooldown = BREATHE_COOLDOWN;
      }
    }
  }
}

function startGameFromTitle() {
  initModeSelectButtons();
  gameState = STATE.MODE_SELECT;
  resumeBGM();
}

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

  // Subtle grid pattern background
  stroke(COL.accent[0], COL.accent[1], COL.accent[2], 10);
  strokeWeight(1);
  for (let gx = 0; gx < CANVAS_W; gx += 60) {
    line(gx, 0, gx, CANVAS_H);
  }
  for (let gy = 0; gy < CANVAS_H; gy += 60) {
    line(0, gy, CANVAS_W, gy);
  }
  noStroke();

  textAlign(CENTER, CENTER);
  // Title with glow
  textStyle(BOLD);
  textSize(54);
  fill(COL.accent[0], COL.accent[1], COL.accent[2], 25);
  text('Garden Circuit', CANVAS_W / 2, CANVAS_H / 2 - 138);
  textSize(48);
  fill(COL.accent[0], COL.accent[1], COL.accent[2]);
  text('Garden Circuit', CANVAS_W / 2, CANVAS_H / 2 - 140);

  // Decorative vine dots between title and subtitle
  noStroke();
  let vineCx = CANVAS_W / 2;
  let vineY = CANVAS_H / 2 - 105;
  for (let i = 0; i < 15; i++) {
    let vx = vineCx - 70 + i * 10;
    let vy = vineY + sin(i * 0.6) * 4;
    let dotSize = 3 + sin(i * 0.8) * 1;
    fill(COL.accent[0], COL.accent[1], COL.accent[2], 40 + sin(i * 0.5) * 15);
    ellipse(vx, vy, dotSize, dotSize);
  }

  textStyle(NORMAL); textSize(20);
  fill(COL.textSecondary);
  text('Choose how to start:', CANVAS_W / 2, CANVAS_H / 2 - 80);

  for (let btn of modeSelectButtons) {
    btn.checkHover(mouseX, mouseY);
    btn.draw();
  }

  // Subtitle hints under buttons
  textSize(15); fill(COL.textSecondary[0], COL.textSecondary[1], COL.textSecondary[2], 140);
  let btnY1 = CANVAS_H / 2 - 20;
  text('Learn every mechanic step by step', CANVAS_W / 2, btnY1 + 70);
  text('Jump straight into Level 2', CANVAS_W / 2, btnY1 + 60 + 24 + 70);

  // Back to main menu hint
  textAlign(LEFT, BOTTOM);
  textSize(13);
  fill(COL.textSecondary[0], COL.textSecondary[1], COL.textSecondary[2], 120);
  text('ESC \u2014 Back to Main Menu', 20, CANVAS_H - 16);
}

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

  // Breathe step — hold spacebar
  if (step.advanceOn === 'breathe' && key === ' ') {
    isBreathing = true;
  }
}

function handlePlayingInput() {
  let col = selectedBed % currentGridCols;
  let row = floor(selectedBed / currentGridCols);
  if (key === 'w' || key === 'W' || keyCode === UP_ARROW) row = max(0, row-1);
  if (key === 's' || key === 'S' || keyCode === DOWN_ARROW) row = min(currentGridRows-1, row+1);
  if (key === 'a' || key === 'A' || keyCode === LEFT_ARROW) col = max(0, col-1);
  if (key === 'd' || key === 'D' || keyCode === RIGHT_ARROW) col = min(currentGridCols-1, col+1);
  selectedBed = row * currentGridCols + col;

  if (key === ' ' && breatheCooldown <= 0 && overwhelmTimer <= 0 && tensionMeter > 0) {
    isBreathing = true;
  }
  if (key === 'q' || key === 'Q') queueAction(() => doAction('water'));
  if (key === 'e' || key === 'E') queueAction(() => doAction('light'));
  if (key === 'r' || key === 'R') queueAction(() => doAction('airflow'));
  if (key === 'p' || key === 'P') gameState = STATE.PAUSED;
}

// ============================================================
// INPUT: MOUSE
// ============================================================
function mousePressed() {
  // Music toggle icon — works on every screen
  if (isInRect(mouseX, mouseY, MUSIC_BTN)) {
    toggleAudio();
    return;
  }

  // Start BGM on first interaction if not yet loaded
  if (!bgmLoaded) initBGM();

  switch (gameState) {
    case STATE.TITLE:
      if (showInstructionsOverlay) {
        let closeBtnW2 = 180, closeBtnH2 = 50;
        let closeBtnX = INSTR_OVERLAY_X + INSTR_OVERLAY_W - closeBtnW2 - 20;
        let closeBtnY = INSTR_OVERLAY_Y + INSTR_OVERLAY_H - closeBtnH2 - 14;
        if (isInRect(mouseX, mouseY, {x:closeBtnX, y:closeBtnY, w:closeBtnW2, h:closeBtnH2})) {
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

    case STATE.MODE_SELECT:
      for (let btn of modeSelectButtons) { if (btn.checkClick(mouseX, mouseY)) return; }
      break;

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
