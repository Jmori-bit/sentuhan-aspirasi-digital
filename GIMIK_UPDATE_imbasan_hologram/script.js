
"use strict";

/* =========================================
   SENTUHAN ASPIRASI DIGITAL — VERSI 2.0
   Semua pemasa dikawal dari satu tempat.
========================================= */

// UBAH MAKLUMAT MAJLIS DI SINI
const CONFIG = {
  schoolName: "SMK TELOK DATOK",
  eventName: "MAJLIS GRADUASI 2026",
  year: "2026",
  countdownSeconds: 10
};


/* ======================================
   TETAPAN AUDIO SENTUHAN ASPIRASI DIGITAL
====================================== */

const AUDIO_CONFIG = {
  // Tukar nama ini kepada nama sebenar fail dalam assets
  countdownFile: "assets/countdown.mp3",

  // Muzik latar pilihan. Fail boleh ditambah kemudian.
  musicFile: "assets/background-music.mp3",

  // Kelantangan antara 0.0 hingga 1.0
  musicVolume: 0.70,
  countdownVolume: 1.00,
  scanVolume: 0.35,
  impactVolume: 0.65,

  // Muzik latar dimainkan berulang kali
  musicLoop: true
};


function setupAudioFiles() {
  backgroundMusic = new Audio(AUDIO_CONFIG.musicFile);
  backgroundMusic.loop = AUDIO_CONFIG.musicLoop;
  backgroundMusic.volume = AUDIO_CONFIG.musicVolume;
  backgroundMusic.preload = "auto";

  countdownAudio = new Audio(AUDIO_CONFIG.countdownFile);
  countdownAudio.volume = AUDIO_CONFIG.countdownVolume;
  countdownAudio.preload = "auto";

  backgroundMusic.addEventListener("error", () => {
    console.warn("Fail muzik latar tidak dapat dimuatkan.");
  });

  countdownAudio.addEventListener("error", () => {
    console.warn("Fail countdown tidak dapat dimuatkan.");
  });
}

function fadeAudioVolume(audio, targetVolume, duration = 1000) {
  if (!audio || !soundEnabled) return;

  const startVolume = audio.volume;
  const startTime = performance.now();

  function fadeStep(now) {
    if (!soundEnabled) return;

    const progress = Math.min((now - startTime) / duration, 1);

    audio.volume =
      startVolume + (targetVolume - startVolume) * progress;

    if (progress < 1) {
      requestAnimationFrame(fadeStep);
    }
  }

  requestAnimationFrame(fadeStep);
}

function startBackgroundMusic() {
  if (!soundEnabled || !backgroundMusic || musicStarted) return;

  backgroundMusic.volume = AUDIO_CONFIG.musicVolume;

  backgroundMusic.play()
    .then(() => {
      musicStarted = true;
    })
    .catch(error => {
      console.warn("Muzik latar gagal dimainkan:", error);
      showNotice("Muzik tidak dapat dimainkan. Semak fail audio.");
    });
}

function stopBackgroundMusic() {
  if (!backgroundMusic) return;

  backgroundMusic.pause();
  backgroundMusic.currentTime = 0;
  musicStarted = false;
}

function playCountdownFile() {
  if (!soundEnabled || !countdownAudio) return;

  countdownAudio.pause();
  countdownAudio.currentTime = 0;
  countdownAudio.volume = AUDIO_CONFIG.countdownVolume;

  countdownAudio.play().catch(error => {
    console.warn("Audio countdown gagal dimainkan:", error);
    showNotice("Audio countdown gagal. Countdown visual diteruskan.");
  });
}


let backgroundMusic = null;
let countdownAudio = null;
let musicStarted = false;


let finaleMusicStopTimer = null;
let finaleMusicFadeTimer = null;

function clearFinaleMusicTimers() {
  if (finaleMusicStopTimer !== null) {
    clearTimeout(finaleMusicStopTimer);
    finaleMusicStopTimer = null;
  }

  if (finaleMusicFadeTimer !== null) {
    clearTimeout(finaleMusicFadeTimer);
    finaleMusicFadeTimer = null;
  }
}

function scheduleFinaleMusicStop() {
  clearFinaleMusicTimers();

  if (!soundEnabled || !backgroundMusic) return;

  // Muzik berhenti selepas 35 saat dari paparan finale.
  // Tiga saat terakhir digunakan untuk fade-out.
  finaleMusicStopTimer = setTimeout(() => {
    if (!soundEnabled || !backgroundMusic) return;

    fadeAudioVolume(backgroundMusic, 0, 3000);

    finaleMusicFadeTimer = setTimeout(() => {
      stopBackgroundMusic();
      finaleMusicFadeTimer = null;
    }, 3000);

    finaleMusicStopTimer = null;
  }, 15000);
}


// ELEMEN HTML
const $ = (id) => document.getElementById(id);


const screens = {
  intro: $("introScreen"),
  signature: $("signatureScreen"),
  palm: $("palmScreen"),
  countdown: $("countdownScreen"),
  final: $("finalScreen")
};


const startButton = $("startButton");
const countdownNumber = $("countdownNumber");
const countdownCaption = $("countdownCaption");
const countdownStage = $("countdownStage");
const operatorPanel = $("operatorPanel");
const operatorToggle = $("operatorToggle");
const statusText = $("statusText");
const notice = $("notice");
const audioFallback = $("audioFallback");
const particleCanvas = $("particleCanvas");
const finaleFireworksCanvas = $("finaleFireworksCanvas");

const reducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

// STATUS SISTEM
let currentScreen = "intro";
let running = false;
let soundEnabled = true;
let countdownTimer = null;
let countdownRunId = 0;
let noticeTimer = null;
let audioContext = null;
let masterGain = null;
let particleFrame = null;
let particles = [];
let lastParticleTime = 0;
let finaleStartedAt = 0;
let finaleEffectActive = false;
let resizeTimer = null;

// Teks countdown
const countdownMessages = {
  10: "MENYATUKAN HARAPAN",
  9: "MEMBINA KEYAKINAN",
  8: "MENYEMAI ASPIRASI",
  7: "MENGUKIR USAHA",
  6: "MENGHARGAI PERJUANGAN",
  5: "MELANGKAH DENGAN ILMU",
  4: "MEMBINA MASA DEPAN",
  3: "MENGGAPAI IMPIAN",
  2: "MENUJU KEJAYAAN",
  1: "DETIK PENENTUAN"
};

// MAKLUMAT MAJLIS
function applyConfiguration() {
  $("schoolName").textContent = CONFIG.schoolName;
  if ($("palmSchoolCaption")) $("palmSchoolCaption").textContent = CONFIG.schoolName;
  $("eventName").textContent = CONFIG.eventName;
  $("finalSchoolName").textContent = CONFIG.schoolName;
  $("finalYear").textContent = CONFIG.year;
  document.title = `Sentuhan Aspirasi Digital | ${CONFIG.year}`;
}

// TUKAR SKRIN
function showScreen(name) {
  if (!screens[name]) return;

  Object.entries(screens).forEach(([key, element]) => {
    element.classList.toggle("active", key === name);
  });

  currentScreen = name;
  updateStatus();
}

function updateStatus() {
  const labels = {
    intro: "Sedia",
    countdown: "Countdown berjalan",
    final: "Perasmian selesai"
  };

  statusText.textContent = labels[currentScreen] || "Sedia";
}

// NOTIS RINGKAS
function showNotice(message, duration = 2500) {
  clearTimeout(noticeTimer);

  notice.textContent = message;
  notice.classList.add("visible");

  noticeTimer = setTimeout(() => {
    notice.classList.remove("visible");
  }, duration);
}

// AUDIO — DIJANA SECARA LOKAL, TANPA INTERNET
async function initialiseAudio() {
  if (!soundEnabled) return false;

  try {
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      throw new Error("Web Audio API tidak disokong.");
    }

    if (!audioContext) {
      audioContext = new AudioContextClass();
      masterGain = audioContext.createGain();
      masterGain.gain.value = 1.0;
      masterGain.connect(audioContext.destination);
    }

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    if (audioContext.state !== "running") {
      throw new Error("Audio tidak dapat dimulakan.");
    }

    audioFallback.hidden = true;
    return true;
  } catch (error) {
    console.warn("Audio tidak tersedia:", error);
    audioFallback.hidden = false;
    return false;
  }
}

function playTone({
  frequency = 880,
  duration = 0.12,
  volume = 0.16,
  type = "sine",
  endFrequency = null
} = {}) {
  if (!soundEnabled || !audioContext || !masterGain) return;
  if (audioContext.state !== "running") return;

  try {
    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);

    if (endFrequency !== null) {
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(20, endFrequency),
        now + duration
      );
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(
      Math.max(0.0002, volume),
      now + 0.015
    );
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      now + duration
    );

    oscillator.connect(gain);
    gain.connect(masterGain);

    oscillator.start(now);
    oscillator.stop(now + duration + 0.03);

    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  } catch (error) {
    console.warn("Bunyi gagal dimainkan:", error);
  }
}

function playTick(number) {
  const isFinalTick = number === 1;

  playTone({
    frequency: isFinalTick ? 1046.5 : 660 + (10 - number) * 32,
    endFrequency: isFinalTick ? 784 : null,
    duration: isFinalTick ? 0.32 : 0.1,
    volume: isFinalTick ? 0.2 : 0.12,
    type: isFinalTick ? "triangle" : "sine"
  });
}

function playImpact() {
  if (!soundEnabled || !audioContext) return;

  playTone({
    frequency: 110,
    endFrequency: 42,
    duration: 0.8,
    volume: 0.28,
    type: "sine"
  });

  playTone({
    frequency: 523.25,
    endFrequency: 1046.5,
    duration: 0.65,
    volume: 0.12,
    type: "triangle"
  });

  // Lapisan bunyi lembut tambahan
  setTimeout(() => {
    playTone({
      frequency: 784,
      endFrequency: 1174,
      duration: 0.7,
      volume: 0.08,
      type: "sine"
    });
  }, 140);
}

// COUNTDOWN — SATU PEMASA AKTIF PADA SATU MASA
function clearCountdownTimer() {
  if (countdownTimer !== null) {
    clearTimeout(countdownTimer);
    countdownTimer = null;
  }
}


function startGimmick() {
  // Benarkan permulaan daripada skrin asal atau selepas imbasan
  if (
    running ||
    !["intro", "palm"].includes(currentScreen)
  ) {
    showNotice("Gimik sedang berjalan atau telah selesai.");
    return;
  }

  running = true;
  const runId = ++countdownRunId;

  clearCountdownTimer();
  stopParticles();

  void initialiseAudio();

  showScreen("countdown");

fadeAudioVolume(backgroundMusic, 0.20, 1200);

playCountdownFile();
  countdownCaption.textContent = countdownMessages[10];
  showCountdownNumber(10);

  let remaining = CONFIG.countdownSeconds;

  function tick() {
    if (runId !== countdownRunId || !running) return;

    remaining -= 1;

    if (remaining >= 1) {
      showCountdownNumber(remaining);
      countdownCaption.textContent =
        countdownMessages[remaining] || "MENUJU KEMUNCAK";

      
      countdownTimer = setTimeout(tick, 1000);
    } else {
      countdownTimer = null;
      revealFinale();
    }
  }

  countdownTimer = setTimeout(tick, 1000);
}


function showCountdownNumber(number) {
  countdownNumber.textContent = String(number);

  // Mulakan semula animasi nombor
  countdownNumber.classList.remove("tick");
  void countdownNumber.offsetWidth;
  countdownNumber.classList.add("tick");
}

function skipCountdown() {
  if (currentScreen !== "countdown" || !running) {
    showNotice("Tiada countdown untuk dilangkau.");
    return;
  }

  // Batalkan countdown asal sebelum membuka kemuncak
  ++countdownRunId;
  clearCountdownTimer();

  showNotice("Countdown dilangkau oleh operator.");
  revealFinale();
}

// KEMUNCAK
function revealFinale() {
  clearCountdownTimer();
  running = false;

  showScreen("final");
  finaleStartedAt = performance.now();
  finaleEffectActive = true;

fadeAudioVolume(backgroundMusic, 0.70, 1500);
fadeAudioVolume(countdownAudio, 0.35, 1000);

// Hentikan muzik latar secara automatik selepas 35 saat.
scheduleFinaleMusicStop();


  if (soundEnabled) {
    playImpact();
  }

  startParticles();
  startParticles();
startFinaleFireworks();

  showNotice("Perasmian selesai. Paparan dikekalkan untuk fotografi.", 4000);
}


/* =========================================
   ROYAL MIDNIGHT FIREWORKS ENGINE
   Canvas khusus untuk animasi finale
   ========================================= */

const finaleFireworksCtx = finaleFireworksCanvas
  ? finaleFireworksCanvas.getContext("2d")
  : null;

let finaleFireworksFrame = null;
let finaleFireworksActive = false;
let finaleFireworksStartTime = 0;
let finaleFireworksLastTime = 0;
let finaleFireworksNextLaunch = 0;
let finaleFireworksRockets = [];
let finaleFireworksSparks = [];
let finaleAmbientLights = [];

const FINALE_FIREWORKS_DURATION = 18000;

const FINALE_FIREWORKS_COLORS = [
  "#E8C878", // Champagne gold
  "#FFF0B5", // Emas cerah
  "#D8E3ED", // Titanium silver
  "#79CFE0"  // Soft cyan
];

function resizeFinaleFireworksCanvas() {
  if (!finaleFireworksCtx || !finaleFireworksCanvas) return;

  const width = window.innerWidth;
  const height = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

  finaleFireworksCanvas.width = Math.round(width * dpr);
  finaleFireworksCanvas.height = Math.round(height * dpr);

  finaleFireworksCanvas.style.width = `${width}px`;
  finaleFireworksCanvas.style.height = `${height}px`;

  finaleFireworksCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function createFinaleAmbientLights() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  finaleAmbientLights = [];

  const count = 32;

  for (let i = 0; i < count; i++) {
    finaleAmbientLights.push({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: 0.6 + Math.random() * 1.3,
      speed: 7 + Math.random() * 15,
      drift: (Math.random() - 0.5) * 10,
      phase: Math.random() * Math.PI * 2,
      color: Math.random() < 0.75
        ? "#E8C878"
        : "#79CFE0"
    });
  }
}

function launchFinaleFirework() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  // Pelancaran dari kawasan sisi untuk melindungi teks tengah.
  const leftSide = Math.random() < 0.5;

  const x = leftSide
    ? width * (0.12 + Math.random() * 0.20)
    : width * (0.68 + Math.random() * 0.20);

  finaleFireworksRockets.push({
    x,
    y: height * 0.90,
    targetY: height * (0.15 + Math.random() * 0.27),
    speed: height * (0.40 + Math.random() * 0.16),
    trail: [],
    color: FINALE_FIREWORKS_COLORS[
      Math.floor(Math.random() * FINALE_FIREWORKS_COLORS.length)
    ]
  });
}

function burstFinaleFirework(x, y, baseColor) {
  const count = 48 + Math.floor(Math.random() * 20);
  const spread = Math.random() * Math.PI * 2;

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + spread;
    const speed = 45 + Math.random() * 145;

    finaleFireworksSparks.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 0.8 + Math.random() * 1.5,
      age: 0,
      life: 1.0 + Math.random() * 1.0,
      color: Math.random() < 0.25
        ? FINALE_FIREWORKS_COLORS[
            Math.floor(Math.random() * FINALE_FIREWORKS_COLORS.length)
          ]
        : baseColor
    });
  }
}

function startFinaleFireworks() {
  stopFinaleFireworks();

  if (
    !finaleFireworksCtx ||
    reducedMotion ||
    !screens.final.classList.contains("active")
  ) {
    return;
  }

  resizeFinaleFireworksCanvas();
  createFinaleAmbientLights();

  finaleFireworksRockets = [];
  finaleFireworksSparks = [];

  finaleFireworksActive = true;
  finaleFireworksStartTime = performance.now();
  finaleFireworksLastTime = 0;
  finaleFireworksNextLaunch = 400;

  finaleFireworksFrame = requestAnimationFrame(
    animateFinaleFireworks
  );
}

function animateFinaleFireworks(timestamp) {
  if (!finaleFireworksActive || !finaleFireworksCtx) {
    finaleFireworksFrame = null;
    return;
  }

  if (!finaleFireworksLastTime) {
    finaleFireworksLastTime = timestamp;
  }

  const dt = Math.min(
    (timestamp - finaleFireworksLastTime) / 1000,
    0.035
  );

  finaleFireworksLastTime = timestamp;

  const elapsed = timestamp - finaleFireworksStartTime;
  const width = window.innerWidth;
  const height = window.innerHeight;
  const ctx = finaleFireworksCtx;

  ctx.clearRect(0, 0, width, height);

  /* Partikel cahaya bergerak sepanjang paparan */
  for (const light of finaleAmbientLights) {
    light.y -= light.speed * dt;
    light.x += light.drift * dt;

    if (light.y < -5) {
      light.y = height + 5;
      light.x = Math.random() * width;
    }

    const alpha = 0.18
      + (Math.sin(timestamp / 700 + light.phase) + 1) * 0.12;

    ctx.globalAlpha = alpha;
    ctx.fillStyle = light.color;
    ctx.beginPath();
    ctx.arc(light.x, light.y, light.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;

  /* Lancarkan bunga api secara berperingkat */
  if (
    elapsed < FINALE_FIREWORKS_DURATION &&
    timestamp >= finaleFireworksNextLaunch
  ) {
    launchFinaleFirework();

    finaleFireworksNextLaunch = timestamp
      + 1200
      + Math.random() * 800;
  }

  /* Roket naik dan meletus */
  for (let i = finaleFireworksRockets.length - 1; i >= 0; i--) {
    const rocket = finaleFireworksRockets[i];

    rocket.trail.push({ x: rocket.x, y: rocket.y });

    if (rocket.trail.length > 7) {
      rocket.trail.shift();
    }

    rocket.y -= rocket.speed * dt;

    ctx.strokeStyle = rocket.color;
    ctx.lineWidth = 1.3;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();

    rocket.trail.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });

    ctx.lineTo(rocket.x, rocket.y);
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.fillStyle = "#FFF0B5";
    ctx.beginPath();
    ctx.arc(rocket.x, rocket.y, 1.7, 0, Math.PI * 2);
    ctx.fill();

    if (rocket.y <= rocket.targetY) {
      burstFinaleFirework(rocket.x, rocket.y, rocket.color);
      finaleFireworksRockets.splice(i, 1);
    }
  }

  /* Serpihan bunga api menyebar, jatuh dan pudar */
  for (let i = finaleFireworksSparks.length - 1; i >= 0; i--) {
    const spark = finaleFireworksSparks[i];

    spark.age += dt;
    spark.x += spark.vx * dt;
    spark.y += spark.vy * dt;

    spark.vx *= Math.pow(0.985, dt * 60);
    spark.vy = spark.vy * Math.pow(0.985, dt * 60)
      + 34 * dt;

    ctx.globalAlpha = Math.max(0, 1 - spark.age / spark.life);
    ctx.fillStyle = spark.color;
    ctx.beginPath();
    ctx.arc(spark.x, spark.y, spark.radius, 0, Math.PI * 2);
    ctx.fill();

    if (spark.age >= spark.life) {
      finaleFireworksSparks.splice(i, 1);
    }
  }

  ctx.globalAlpha = 1;

  /* Tamatkan selepas pelancaran terakhir dan semua letusan pudar */
  if (
    elapsed >= FINALE_FIREWORKS_DURATION &&
    finaleFireworksRockets.length === 0 &&
    finaleFireworksSparks.length === 0
  ) {
    stopFinaleFireworks();
    return;
  }

  finaleFireworksFrame = requestAnimationFrame(
    animateFinaleFireworks
  );
}

function stopFinaleFireworks() {
  finaleFireworksActive = false;

  if (finaleFireworksFrame !== null) {
    cancelAnimationFrame(finaleFireworksFrame);
    finaleFireworksFrame = null;
  }

  finaleFireworksRockets = [];
  finaleFireworksSparks = [];
  finaleAmbientLights = [];

  if (finaleFireworksCtx && finaleFireworksCanvas) {
    finaleFireworksCtx.clearRect(
      0,
      0,
      window.innerWidth,
      window.innerHeight
    );
  }
}


// RESET PENUH

function resetGimmick() {
  clearFinaleMusicTimers();
  stopBackgroundMusic();
  ++countdownRunId;
  clearCountdownTimer();

  resetNewScreens();

  running = false;
  finaleEffectActive = false;

  stopParticles();
stopFinaleFireworks();

  countdownNumber.textContent = String(CONFIG.countdownSeconds);
  countdownNumber.classList.remove("tick");
  countdownCaption.textContent = countdownMessages[10];

  showScreen("signature");
  resizeSignatureCanvas();

  showNotice("Gimik ditetapkan semula. Sila mulakan tandatangan baharu.");
}


// SKRIN PENUH
async function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      showNotice("Mod skrin penuh diaktifkan.");
    } else {
      await document.exitFullscreen();
      showNotice("Mod skrin penuh ditutup.");
    }
  } catch (error) {
    console.warn("Skrin penuh tidak tersedia:", error);
    showNotice("Skrin penuh gagal. Tekan F11 pada papan kekunci.");
  }
}

// PANEL OPERATOR
function toggleOperator(forceOpen = null) {
  const shouldOpen = forceOpen === null
    ? operatorPanel.hidden
    : forceOpen;

  operatorPanel.hidden = !shouldOpen;
  operatorToggle.hidden = shouldOpen;
}


function toggleSound() {
  soundEnabled = !soundEnabled;

  $("soundButton").textContent = soundEnabled
    ? "♫ Bunyi: Aktif"
    : "♫ Bunyi: Dimatikan";

  if (masterGain && audioContext) {
    masterGain.gain.setTargetAtTime(
      soundEnabled ? 0.7 : 0,
      audioContext.currentTime,
      0.025
    );
  }

  if (!soundEnabled) {
    if (backgroundMusic) backgroundMusic.pause();
    if (countdownAudio) countdownAudio.pause();
    musicStarted = false;
  } else {
    void initialiseAudio();

    if (currentScreen === "palm") {
      startBackgroundMusic();
    }
  }

  showNotice(soundEnabled
    ? "Bunyi diaktifkan."
    : "Semua bunyi dimatikan.");
}


// PARTIKEL EMAS — CANVAS TANPA LIBRARY
const ctx = particleCanvas.getContext("2d");

function resizeCanvas() {
  if (!ctx) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const width = window.innerWidth;
  const height = window.innerHeight;

  particleCanvas.width = Math.round(width * dpr);
  particleCanvas.height = Math.round(height * dpr);

  particleCanvas.style.width = `${width}px`;
  particleCanvas.style.height = `${height}px`;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function createParticle(burst = false) {
  const width = window.innerWidth;
  const height = window.innerHeight;

  const angle = Math.random() * Math.PI * 2;
  const speed = burst
    ? 80 + Math.random() * 250
    : 8 + Math.random() * 22;

  return {
    x: width * (0.2 + Math.random() * 0.6),
    y: burst ? height * 0.47 : height + Math.random() * 30,
    vx: burst ? Math.cos(angle) * speed : (Math.random() - 0.5) * 15,
    vy: burst ? Math.sin(angle) * speed : -(12 + Math.random() * 30),
    size: burst ? 1 + Math.random() * 3 : 0.7 + Math.random() * 1.7,
    life: burst ? 1.3 + Math.random() * 1.7 : 2 + Math.random() * 4,
    age: 0,
    alpha: 0.35 + Math.random() * 0.65,
    drift: (Math.random() - 0.5) * 10
  };
}


function startParticles() {
  stopParticles();

  // Aktifkan semula animasi selepas pembersihan
  finaleEffectActive = true;

  resizeCanvas();

  const count = reducedMotion ? 35 : 115;
  particles = [];

  for (let i = 0; i < count; i++) {
    particles.push(createParticle(true));
  }

  lastParticleTime = 0;
  particleFrame = requestAnimationFrame(animateParticles);
}

function animateParticles(timestamp) {
  if (!ctx || !finaleEffectActive) {
    particleFrame = null;
    return;
  }

  if (!lastParticleTime) lastParticleTime = timestamp;

  // Hadkan perubahan masa bagi mengelakkan lonjakan besar
  const dt = Math.min((timestamp - lastParticleTime) / 1000, 0.04);
  lastParticleTime = timestamp;

  const width = window.innerWidth;
  const height = window.innerHeight;

  ctx.clearRect(0, 0, width, height);

  particles.forEach((p) => {
    p.age += dt;
    p.x += (p.vx + p.drift) * dt;
    p.y += p.vy * dt;

    // Perlahankan partikel selepas letusan awal
    p.vx *= Math.pow(0.985, dt * 60);
    p.vy *= Math.pow(0.985, dt * 60);

    const fade = Math.max(0, 1 - p.age / p.life);
    ctx.globalAlpha = p.alpha * fade;

    ctx.fillStyle = Math.random() > 0.15
      ? "#e8c878"
      : "#fff0b5";

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();

    // Kilauan halus, bukan kesan strob
    if (p.size > 2.5) {
      ctx.beginPath();
      ctx.moveTo(p.x - 4, p.y);
      ctx.lineTo(p.x + 4, p.y);
      ctx.moveTo(p.x, p.y - 4);
      ctx.lineTo(p.x, p.y + 4);
      ctx.strokeStyle = "#fff0b5";
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }

    if (p.age >= p.life) {
      Object.assign(p, createParticle(false));
    }
  });

  ctx.globalAlpha = 1;

  // Hentikan kesan bergerak selepas tempoh kemuncak
  if (timestamp - finaleStartedAt > 12000) {
    stopParticles();
    return;
  }

  particleFrame = requestAnimationFrame(animateParticles);
}

function stopParticles() {
  finaleEffectActive = false;

  if (particleFrame !== null) {
    cancelAnimationFrame(particleFrame);
    particleFrame = null;
  }

  if (ctx) {
    ctx.clearRect(
      0,
      0,
      window.innerWidth,
      window.innerHeight
    );
  }

  particles = [];
}

// SAMBUNG SEMULA ANIMASI JIKA TETINGKAP DIUBAH
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);

  resizeTimer = setTimeout(() => {
    resizeCanvas();
    resizeFinaleFireworksCanvas();
  }, 120);
});

// KAWALAN BUTANG
startButton.addEventListener("click", startGimmick);

$("operatorStartButton").addEventListener("click", () => {
  toggleOperator(false);

  // Jika sudah di skrin akhir, operator perlu reset dahulu
  startGimmick();
});

$("skipButton").addEventListener("click", skipCountdown);
$("resetButton").addEventListener("click", resetGimmick);
$("fullscreenButton").addEventListener("click", toggleFullscreen);
$("soundButton").addEventListener("click", toggleSound);

operatorToggle.addEventListener("click", () => toggleOperator());
$("closeOperatorButton").addEventListener("click", () => {
  toggleOperator(false);
});

// PINTASAN PAPAN KEKUNCI
document.addEventListener("keydown", (event) => {
  if (event.repeat) return;

  const key = event.key.toLowerCase();

  if (key === "o") {
    toggleOperator();
  }

  if (key === "f") {
    event.preventDefault();
    void toggleFullscreen();
  }

  if (event.key === "Escape" && !operatorPanel.hidden) {
    toggleOperator(false);
  }
});

// PAPARAN RALAT YANG MUNASABAH
window.addEventListener("error", (event) => {
  console.error("Ralat aplikasi:", event.message);
  showNotice("Ralat dikesan. Operator boleh reset gimik.", 4000);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Operasi gagal:", event.reason);
  showNotice("Operasi tidak berjaya. Cuba semula jika perlu.", 4000);
});

// PERMULAAN APLIKASI



function initialiseApp() {
  applyConfiguration();
  resizeCanvas();

  setupAudioFiles();

  showScreen("signature");

  requestAnimationFrame(() => {
    resizeSignatureCanvas();
  });

  updateStatus();
}

initialiseApp();




/* ==========================================
   VERSI 2.1 — TANDATANGAN DAN IMBASAN
========================================== */

// RUANG TANDATANGAN
const signatureCanvas = $("signatureCanvas");
const signatureCtx = signatureCanvas.getContext("2d");
const finishSignatureButton = $("finishSignatureButton");
const signatureHint = $("signatureHint");

let signatureDrawing = false;
let signatureHasInk = false;
let signatureLastPoint = null;
let signatureColor = "#17233b";
let signatureDpr = 1;
let palmScanTimer = null;
let palmScanRunId = 0;
let signatureHasResized = false;

// Sesuaikan canvas dengan saiz sebenar paparan.
// Tandatangan dikekalkan semasa perubahan saiz jika boleh.
function resizeSignatureCanvas() {
  if (!signatureCanvas || !signatureCtx) return;

  const rect = signatureCanvas.getBoundingClientRect();

  if (rect.width <= 0 || rect.height <= 0) return;

  let savedSignature = null;

  if (signatureHasResized && signatureHasInk) {
    try {
      savedSignature = document.createElement("canvas");
      savedSignature.width = signatureCanvas.width;
      savedSignature.height = signatureCanvas.height;

      savedSignature.getContext("2d").drawImage(signatureCanvas, 0, 0);
    } catch (error) {
      console.warn("Tandatangan tidak dapat disimpan sementara:", error);
    }
  }

  signatureDpr = Math.min(window.devicePixelRatio || 1, 2);

  signatureCanvas.width = Math.round(rect.width * signatureDpr);
  signatureCanvas.height = Math.round(rect.height * signatureDpr);

  signatureCtx.setTransform(
    signatureDpr, 0, 0, signatureDpr, 0, 0
  );

  signatureCtx.lineWidth = 2.4;
  signatureCtx.lineCap = "round";
  signatureCtx.lineJoin = "round";
  signatureCtx.strokeStyle = signatureColor;

  if (savedSignature) {
    signatureCtx.drawImage(
      savedSignature,
      0, 0, savedSignature.width, savedSignature.height,
      0, 0, rect.width, rect.height
    );
  }

  signatureHasResized = true;
}


function getSignaturePoint(event) {
  const rect = signatureCanvas.getBoundingClientRect();

  return {
    x: (event.clientX - rect.left) * (signatureCanvas.width / signatureDpr / rect.width),
    y: (event.clientY - rect.top) * (signatureCanvas.height / signatureDpr / rect.height)
  };
}

function beginSignature(event) {
  if (currentScreen !== "signature") return;
  if (event.pointerType === "mouse" && event.button !== 0) return;

  event.preventDefault();

  // Pastikan canvas mempunyai saiz lukisan yang sah.
  if (signatureCanvas.width === 0 || signatureCanvas.height === 0) {
    resizeSignatureCanvas();
  }

  const point = getSignaturePoint(event);

  signatureDrawing = true;
  signatureLastPoint = point;

  try {
    signatureCanvas.setPointerCapture(event.pointerId);
  } catch (error) {
    console.warn("Pointer capture tidak tersedia:", error);
  }

  signatureCtx.beginPath();
  signatureCtx.arc(point.x, point.y, 1.2, 0, Math.PI * 2);
  signatureCtx.fillStyle = signatureColor;
  signatureCtx.fill();

  signatureHasInk = true;
  finishSignatureButton.disabled = false;
  signatureHint.textContent =
    "Tandatangan direkodkan. Sila sahkan apabila selesai.";
}

function drawSignature(event) {
  if (!signatureDrawing || currentScreen !== "signature") return;

  event.preventDefault();

  const point = getSignaturePoint(event);

  signatureCtx.beginPath();
  signatureCtx.moveTo(signatureLastPoint.x, signatureLastPoint.y);
  signatureCtx.lineTo(point.x, point.y);
  signatureCtx.strokeStyle = signatureColor;
  signatureCtx.lineWidth = 2.4;
  signatureCtx.lineCap = "round";
  signatureCtx.lineJoin = "round";
  signatureCtx.stroke();

  signatureLastPoint = point;
}

function endSignature(event) {
  signatureDrawing = false;
  signatureLastPoint = null;

  if (
    event &&
    signatureCanvas.hasPointerCapture &&
    signatureCanvas.hasPointerCapture(event.pointerId)
  ) {
    try {
      signatureCanvas.releasePointerCapture(event.pointerId);
    } catch (error) {
      console.warn("Pointer capture tidak dapat dilepaskan:", error);
    }
  }
}


function clearSignature() {
  signatureDrawing = false;
  signatureLastPoint = null;
  signatureCtx.clearRect(
    0, 0, signatureCanvas.width, signatureCanvas.height
  );

  signatureHasInk = false;
  finishSignatureButton.disabled = true;
  signatureHint.textContent =
    "Sila tandatangan di ruang ini menggunakan pen tablet atau jari.";

  showNotice("Ruang tandatangan telah dipadam.");
}

function selectSignatureColor(color) {
  signatureColor = color;
  signatureCtx.strokeStyle = color;

  document.querySelectorAll(".signature-color").forEach((button) => {
    button.classList.toggle(
      "selected",
      button.dataset.color === color
    );
  });
}

function finishSignature() {
  if (!signatureHasInk || currentScreen !== "signature") {
    showNotice("Sila lengkapkan tandatangan dahulu.");
    return;
  }

  // Kunci input tandatangan sebelum bertukar skrin.
  signatureDrawing = false;
  showScreen("palm");
  startBackgroundMusic();
  showNotice("Tandatangan diterima. Sila teruskan ke imbasan.");
}



let digitalParticleFrame = null;
let digitalDisintegrationStarted = false;
let digitalParticleCanvas = null;
let digitalParticleContext = null;
let digitalParticles = [];
let digitalParticleStartTime = 0;

function createDigitalParticles(palmScreen) {
  removeDigitalParticles();

  const canvas = document.createElement("canvas");
  canvas.id = "digitalDisintegrationCanvas";
  canvas.setAttribute("aria-hidden", "true");

  Object.assign(canvas.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: "999",
  });

  if (getComputedStyle(palmScreen).position === "static") {
    palmScreen.style.position = "relative";
  }

  palmScreen.appendChild(canvas);

  digitalParticleCanvas = canvas;
  digitalParticleContext = canvas.getContext("2d");

  if (!digitalParticleContext) {
    removeDigitalParticles();
    return;
  }

  const rect = palmScreen.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);

  digitalParticleContext.setTransform(dpr, 0, 0, dpr, 0, 0);

  const targets = [
    ".palm-scan-panel",
    ".palm-event-panel",
    ".palm-tech-grid"
  ];

  const areas = targets
    .map((selector) => palmScreen.querySelector(selector))
    .filter(Boolean)
    .map((element) => {
      const bounds = element.getBoundingClientRect();

      return {
        element,
        x: bounds.left - rect.left,
        y: bounds.top - rect.top,
        width: bounds.width,
        height: bounds.height,
        originalOpacity: element.style.opacity
      };
    })
    .filter((area) => area.width > 0 && area.height > 0);

  const count = reducedMotion ? 100 : 350;

  digitalParticles = [];

  for (let i = 0; i < count; i++) {
    const area = areas[Math.floor(Math.random() * areas.length)];

    if (!area) continue;

    const x = area.x + Math.random() * area.width;
    const y = area.y + Math.random() * area.height;
    const angle = Math.random() * Math.PI * 2;
    const speed = 100 + Math.random() * 260;

    digitalParticles.push({
      x,
      y,
      startX: x,
      startY: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 1 + Math.random() * 2.2,
      delay: Math.random() * 0.75,
      life: 1.8 + Math.random() * 0.8,
      age: 0,
      alpha: 0.45 + Math.random() * 0.55,
      area
    });
  }

  digitalDisintegrationStarted = false;
  digitalParticleStartTime = performance.now();

  // Mulakan animasi lapisan digital yang berasingan.
  digitalParticleFrame = requestAnimationFrame(
    animateDigitalDisintegration
  );
}


function animateDigitalDisintegration(timestamp) {
  if (!digitalParticleContext || !digitalParticleCanvas) return;

  const ctx = digitalParticleContext;
  const canvas = digitalParticleCanvas;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const elapsed = (timestamp - digitalParticleStartTime) / 1000;

  ctx.clearRect(0, 0, width, height);

  digitalParticles.forEach((p) => {
    const particleAge = elapsed - p.delay;

    if (particleAge < 0 || particleAge > p.life) return;

    // Partikel mula bergerak, kemudian meletus dengan pantas.
    const burstStart = 0.48;
    const burstTime = Math.max(0, particleAge - burstStart);
    const burstProgress = Math.min(burstTime / 0.55, 1);

    const travel = Math.pow(burstTime, 1.15);

    p.x = p.startX + p.vx * travel;
    p.y = p.startY + p.vy * travel;

    // Hilangkan partikel secara beransur-ansur.
    const fadeIn = Math.min(particleAge / 0.1, 1);
    const fadeOut = Math.max(0, 1 - particleAge / p.life);

    ctx.globalAlpha = p.alpha * fadeIn * fadeOut;

    // Warna tenaga digital.
    ctx.fillStyle = p.size > 2 ? "#55eaff" : "#fff4c2";
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();

    // Garisan cahaya ketika letusan berlaku.
    if (burstProgress > 0.1 && p.size > 1.5) {
      ctx.globalAlpha *= 0.7;
      ctx.fillRect(
        p.x - p.vx * 0.025,
        p.y - p.vy * 0.025,
        p.vx * 0.05,
        Math.max(1, p.size * 0.45)
      );
    }
  });

  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;

  // Panel imbasan dan maklumat perasmi turut terurai.
  if (elapsed > 0.55 && !digitalDisintegrationStarted) {
  digitalDisintegrationStarted = true;

  document
    .querySelectorAll(
      "#palmScreen .palm-scan-panel, #palmScreen .palm-event-panel"
    )
    .forEach((element) => {
      element.classList.add("digital-disintegrating");
    });
}

  if (elapsed < 2.2) {
    digitalParticleFrame = requestAnimationFrame(
      animateDigitalDisintegration
    );
  } else {
    digitalParticleFrame = null;
  }
}


function removeDigitalParticles() {
  if (digitalParticleFrame !== null) {
    cancelAnimationFrame(digitalParticleFrame);
    digitalParticleFrame = null;
  }

  if (digitalParticleCanvas) {
    digitalParticleCanvas.remove();
    digitalParticleCanvas = null;
  }

  // Bersihkan juga jika lapisan pernah dibina sebelum ini.
  const oldCanvas = document.getElementById(
    "digitalDisintegrationCanvas"
  );

  if (oldCanvas) oldCanvas.remove();

  const oldLayer = document.getElementById("digitalParticleLayer");

  if (oldLayer) oldLayer.remove();

  document.querySelectorAll(
    "#palmScreen .digital-disintegrating"
  ).forEach((element) => {
    element.classList.remove("digital-disintegrating");
  });

  digitalParticleContext = null;
  digitalParticles = [];
}


function removeDigitalParticles() {
  const layer = document.getElementById("digitalParticleLayer");

  if (layer) {
    layer.remove();
  }
}


// SIMULASI IMBASAN TAPAK TANGAN
function beginPalmScan() {
  if (currentScreen !== "palm" || palmScanTimer !== null) return;

  const runId = ++palmScanRunId;
  const palmScreen = $("palmScreen");
  const palmButton = $("palmScanButton");
  const palmStatus = $("palmStatus");

  palmScreen.classList.remove("scan-complete");
  palmScreen.classList.add("scanning");
  palmButton.disabled = true;

  palmStatus.innerHTML =
    '<span class="palm-status-dot"></span> MENGIMBAS ASPIRASI...';

  playTone({
    frequency: 520,
    endFrequency: 920,
    duration: 0.35,
    volume: 0.09,
    type: "sine"
  });

  let elapsed = 0;

  palmScanTimer = setInterval(() => {
    if (runId !== palmScanRunId || currentScreen !== "palm") {
      clearInterval(palmScanTimer);
      palmScanTimer = null;
      return;
    }

    elapsed += 1;

    if (elapsed >= 3) {
      clearInterval(palmScanTimer);
      palmScanTimer = null;

      palmScreen.classList.remove("scanning");
      palmScreen.classList.add("scan-complete");

      const palmScanningText = document.getElementById("palmScanningText");

if (palmScanningText) {
  palmScanningText.textContent = "IDENTITY VERIFIED";
}

      palmStatus.innerHTML =
        '<span class="palm-status-dot"></span> IMBASAN BERJAYA · PERASMIAN DIAKTIFKAN';

      palmButton.querySelector(".palm-button-label").textContent =
        "IMBASAN BERJAYA";

      playTone({
        frequency: 880,
        endFrequency: 1320,
        duration: 0.4,
        volume: 0.14,
        type: "triangle"
      });

      
        // Beri masa untuk perasmi melihat pengesahan.
        palmScanTimer = setTimeout(() => {
          palmScanTimer = null;

          if (runId !== palmScanRunId || currentScreen !== "palm") {
            return;
          }

          // Mulakan transisi ke countdown.
          createDigitalParticles($("palmScreen"));

          setTimeout(() => {
            if (runId !== palmScanRunId || currentScreen !== "palm") {
              $("palmScreen").classList.remove("palm-transition-out");
              return;
            }

            $("palmScreen").classList.remove("palm-transition-out");

            palmButton.disabled = false;
            palmButton.querySelector(".palm-button-label").textContent =
              "SENTUH UNTUK IMBAS";

            // Countdown sedia ada bermula di sini.
            startGimmick();
          }, 2300);
        }, 900);

    }
  }, 1000);
}

function resetNewScreens() {
  ++palmScanRunId;

  if (palmScanTimer !== null) {
    clearInterval(palmScanTimer);
    clearTimeout(palmScanTimer);
    palmScanTimer = null;
  }

  $("palmScreen").classList.remove("scanning", "scan-complete");
  $("palmScreen").classList.remove("palm-transition-out");
removeDigitalParticles();
  $("palmScanButton").disabled = false;
  $("palmScanButton").querySelector(".palm-button-label").textContent =
    "SENTUH UNTUK IMBAS";

  $("palmStatus").innerHTML =
    '<span class="palm-status-dot"></span> MENUNGGU SENTUHAN PERASMI';

  clearSignature();
}

// PASANG EVENT LISTENERS
signatureCanvas.addEventListener("pointerdown", beginSignature);
signatureCanvas.addEventListener("pointermove", drawSignature);
signatureCanvas.addEventListener("pointerup", endSignature);
signatureCanvas.addEventListener("pointercancel", endSignature);
signatureCanvas.addEventListener("lostpointercapture", () => {
  signatureDrawing = false;
  signatureLastPoint = null;
});

$("clearSignatureButton").addEventListener("click", clearSignature);
finishSignatureButton.addEventListener("click", finishSignature);

document.querySelectorAll(".signature-color").forEach((button) => {
  button.addEventListener("click", () => {
    selectSignatureColor(button.dataset.color);
  });
});

$("palmScanButton").addEventListener("click", beginPalmScan);

// Kemas kini ruang tandatangan apabila saiz paparan berubah.
window.addEventListener("resize", () => {
  if (currentScreen === "signature") {
    resizeSignatureCanvas();
  }
});
