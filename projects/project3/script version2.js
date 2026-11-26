// --------------------------------------------------
// SONGS
// --------------------------------------------------
const SONGS = [
  {
    label: "Arroyo",
    title: "ARROYO",
    audio: "media/arroyo.mp3",
    fontFile: "fonts/Sora-ExtraBold.otf",
    fontName: "Sora",
    sizeFactor: 0.17,
    hueMin: 185,
    hueMax: 220,
  },
  {
    label: "Caje",
    title: "CAJE",
    audio: "media/caje.mp3",
    fontFile: "fonts/Transcity-DEMO.otf",
    fontName: "Transcity",
    sizeFactor: 0.28,
    hueMin: 300,
    hueMax: 340,
  },
  {
    label: "Fruitopia",
    title: "UITOPIA",
    audio: "media/fruitopia.mp3",
    fontFile: "fonts/Funkymore.otf",
    fontName: "Funkymore",
    sizeFactor: 0.24,
    hueMin: 20,
    hueMax: 60,
  },
];

// --------------------------------------------------
// ZUSTAND
// --------------------------------------------------
let currentIndex = 0;
let switchToken = 0;
let isLoading = true;

let visualAudio = null;
let visualFFT = null;
let visualPlaying = false;
let visualAudioError = false;
let visualFontName = "Arial";

const audioCache = {};
const fontCache = {};

let visualTextParticles = [];
let visualFlowParticles = [];
let visualTypographyLayer;

let visualBassLevel = 0;
let visualMidLevel = 0;
let visualBassAvg = 0;
let visualBassImpact = 0;
let visualBeatCooldown = 0;

let visualRawBass = 0;
let visualPeakBass = 1;
let visualPeakMid = 1;

let visualParticleSpacing = 5;
let visualMaxFlowParticles = 1800;

// Zeitleiste
let seeking = false;
let seekBar, tCur, tDur;


// --------------------------------------------------
// SETUP
// --------------------------------------------------
function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 1);

  if (typeof loadSound !== "function") {
    console.error("p5.sound ist nicht aktiviert!");
    visualAudioError = true;
  }

  buildSwitcher();
  setupSeekBar();
  switchSong(0);
}


// --------------------------------------------------
// BUTTONS
// --------------------------------------------------
function buildSwitcher() {
  const box = document.getElementById("switcher");
  box.innerHTML = "";

  SONGS.forEach((song, i) => {
    const btn = document.createElement("button");
    btn.textContent = song.label;
    btn.dataset.index = i;
    btn.addEventListener("click", () => {
      if (i !== currentIndex) switchSong(i);
    });
    box.appendChild(btn);
  });
}

function updateSwitcher() {
  document.querySelectorAll("#switcher button").forEach((b) => {
    b.classList.toggle("active", Number(b.dataset.index) === currentIndex);
  });
}


// --------------------------------------------------
// ZEITLEISTE
// --------------------------------------------------
function setupSeekBar() {
  seekBar = document.getElementById("seekBar");
  tCur = document.getElementById("tCur");
  tDur = document.getElementById("tDur");

  seekBar.addEventListener("pointerdown", () => { seeking = true; });

  // Beim Ziehen nur die Zeit anzeigen
  seekBar.addEventListener("input", () => {
    if (visualAudio) {
      tCur.textContent = formatTime((seekBar.value / 1000) * visualAudio.duration());
    }
  });

  // Beim Loslassen an die Stelle springen
  seekBar.addEventListener("change", async () => {
    seeking = false;
    if (!visualAudio || isLoading) return;

    const dur = visualAudio.duration();
    const t = min((seekBar.value / 1000) * dur, dur - 0.1);

    await userStartAudio();
    ensureFFT();

    try {
      visualAudio.jump(max(t, 0));
      visualPlaying = true;
    } catch (e) {
      console.error("Springen nicht möglich:", e);
    }
  });
}

function updateSeekBar() {
  if (!seekBar) return;

  if (!visualAudio || isLoading || visualAudioError) {
    seekBar.disabled = true;
    return;
  }

  seekBar.disabled = false;
  if (seeking) return;

  const dur = visualAudio.duration();
  if (!dur) return;

  const cur = constrain(visualAudio.currentTime(), 0, dur);
  seekBar.value = (cur / dur) * 1000;
  tCur.textContent = formatTime(cur);
  tDur.textContent = formatTime(dur);
}

function formatTime(sec) {
  sec = max(0, floor(sec || 0));
  const m = floor(sec / 60);
  const s = sec % 60;
  return m + ":" + (s < 10 ? "0" : "") + s;
}


// --------------------------------------------------
// SONG WECHSELN
// --------------------------------------------------
async function switchSong(index) {
  const token = ++switchToken;
  const song = SONGS[index];

  if (visualAudio) {
    try { visualAudio.stop(); } catch (e) {}
  }
  const wasPlaying = visualPlaying;
  visualPlaying = false;

  currentIndex = index;
  isLoading = true;
  visualAudio = null;
  visualAudioError = typeof loadSound !== "function";

  visualTextParticles = [];
  visualFlowParticles = [];
  visualBassLevel = 0;
  visualMidLevel = 0;
  visualBassAvg = 0;
  visualBassImpact = 0;
  visualPeakBass = 1;
  visualPeakMid = 1;

  if (seekBar) {
    seekBar.value = 0;
    tCur.textContent = "0:00";
    tDur.textContent = "0:00";
  }
  updateSwitcher();

  // 1) Font laden
  await loadVisualFont(song);
  if (token !== switchToken) return;
  createVisualTypography();

  // 2) Audio laden
  if (!visualAudioError) {
    try {
      const snd = await loadVisualAudio(index);
      if (token !== switchToken) return;
      visualAudio = snd;

      if (wasPlaying) {
        ensureFFT();
        visualAudio.play();
        visualPlaying = true;
      }
    } catch (e) {
      console.error("Audio-Fehler:", e);
      visualAudioError = true;
    }
  }

  isLoading = false;
}

function loadVisualFont(song) {
  if (fontCache[song.fontName]) {
    visualFontName = song.fontName;
    return Promise.resolve();
  }

  const face = new FontFace(song.fontName, "url(" + song.fontFile + ")");
  return face
    .load()
    .then((loaded) => {
      document.fonts.add(loaded);
      fontCache[song.fontName] = true;
      visualFontName = song.fontName;
      console.log("Font geladen:", song.fontName);
    })
    .catch((err) => {
      console.error("Font konnte nicht geladen werden:", song.fontFile, err);
      visualFontName = "Arial";
    });
}

function loadVisualAudio(index) {
  if (audioCache[index]) return Promise.resolve(audioCache[index]);

  return new Promise((resolve, reject) => {
    const snd = loadSound(
      SONGS[index].audio,
      () => {
        try { snd.setVolume(0.8); } catch (e) {}
        audioCache[index] = snd;
        console.log("Audio geladen:", SONGS[index].audio);
        resolve(snd);
      },
      (err) => {
        console.error("Audio nicht gefunden:", SONGS[index].audio, err);
        reject(err);
      }
    );
  });
}

function ensureFFT() {
  if (!visualFFT) {
    visualFFT = new p5.FFT(0.8, 1024);
  }
  if (visualAudio) visualFFT.setInput(visualAudio);
}


// --------------------------------------------------
// DRAW
// --------------------------------------------------
function draw() {
  background(230, 40, 4, 0.22);

  // -----------------------------------------------
  // AUDIOANALYSE
  // -----------------------------------------------
  if (visualPlaying && visualFFT && visualAudio && visualAudio.isPlaying()) {
    let spectrum = visualFFT.analyze();

    let maxValue = 0;
    for (let i = 0; i < spectrum.length; i++) {
      if (spectrum[i] > maxValue) maxValue = spectrum[i];
    }
    let unit = maxValue > 2 ? 255 : 1;

    visualRawBass = readVisualBand(spectrum, 20, 150);
    let midRaw = readVisualBand(spectrum, 400, 2500);

    visualPeakBass = max(visualPeakBass * 0.998, visualRawBass, unit * 0.03);
    visualPeakMid = max(visualPeakMid * 0.998, midRaw, unit * 0.03);

    let bassTarget = pow(constrain(visualRawBass / visualPeakBass, 0, 1), 3);
    let midTarget = constrain(midRaw / visualPeakMid, 0, 1);

    visualBassLevel = lerp(visualBassLevel, bassTarget, 0.4);
    visualMidLevel = lerp(visualMidLevel, midTarget, 0.25);

    visualBassAvg = lerp(visualBassAvg, visualBassLevel, 0.05);

    if (
      visualBassLevel - visualBassAvg > 0.08 &&
      visualBassLevel > 0.15 &&
      visualBeatCooldown <= 0
    ) {
      visualBassImpact = min(1, max(visualBassImpact, visualBassLevel * 1.25));
      visualBeatCooldown = 7;
      createVisualFlowBurst();
    }
  } else {
    visualRawBass = 0;
    visualBassLevel = lerp(visualBassLevel, 0, 0.06);
    visualMidLevel = lerp(visualMidLevel, 0, 0.06);
    visualBassAvg = lerp(visualBassAvg, 0, 0.06);
  }

  visualBassImpact *= 0.91;
  if (visualBassImpact < 0.01) visualBassImpact = 0;
  if (visualBeatCooldown > 0) visualBeatCooldown--;

  // -----------------------------------------------
  // SCHRIFTPARTIKEL
  // -----------------------------------------------
  for (let particle of visualTextParticles) {
    particle.update();
    particle.display();
  }

  // -----------------------------------------------
  // AUSSTRÖMENDE PARTIKEL
  // -----------------------------------------------
  for (let i = visualFlowParticles.length - 1; i >= 0; i--) {
    let particle = visualFlowParticles[i];
    particle.update();
    particle.display();

    if (particle.life <= 0) {
      visualFlowParticles.splice(i, 1);
    }
  }

  updateSeekBar();
  drawVisualInterface();
}


// --------------------------------------------------
// FREQUENZBAND AUSLESEN
// --------------------------------------------------
function readVisualBand(spectrum, minFreq, maxFreq) {
  let nyquist = getAudioContext().sampleRate / 2;

  let start = floor((minFreq / nyquist) * spectrum.length);
  let end = floor((maxFreq / nyquist) * spectrum.length);

  start = constrain(start, 0, spectrum.length - 1);
  end = constrain(end, start + 1, spectrum.length);

  let total = 0;
  for (let i = start; i < end; i++) {
    total += spectrum[i];
  }

  return total / (end - start);
}


// --------------------------------------------------
// TYPOGRAFIE ERSTELLEN
// --------------------------------------------------
function createVisualTypography() {
  visualTextParticles = [];

  if (visualTypographyLayer) {
    visualTypographyLayer.remove();
  }

  const song = SONGS[currentIndex];

  visualTypographyLayer = createGraphics(width, height);
  visualTypographyLayer.pixelDensity(1);
  visualTypographyLayer.background(0);
  visualTypographyLayer.fill(255);
  visualTypographyLayer.noStroke();
  visualTypographyLayer.textAlign(CENTER, CENTER);
  visualTypographyLayer.textFont(visualFontName);

  let fontSize = min(width * song.sizeFactor, height * 0.42);
  fontSize = max(fontSize, 50);
  visualTypographyLayer.textSize(fontSize);

  visualTypographyLayer.text(song.title, width / 2, height / 2);
  visualTypographyLayer.loadPixels();

  for (let y = 0; y < height; y += visualParticleSpacing) {
    for (let x = 0; x < width; x += visualParticleSpacing) {
      let pixelIndex = 4 * (floor(y) * width + floor(x));
      let pixelBrightness = visualTypographyLayer.pixels[pixelIndex];

      if (pixelBrightness > 100) {
        visualTextParticles.push(new VisualTextParticle(x, y));
      }
    }
  }

  console.log("Schriftpartikel erstellt:", visualTextParticles.length);
}


// --------------------------------------------------
// SCHRIFTPARTIKEL
// --------------------------------------------------
class VisualTextParticle {
  constructor(x, y) {
    this.x = x;
    this.y = y;

    this.targetX = x;
    this.targetY = y;

    this.vx = 0;
    this.vy = 0;

    const song = SONGS[currentIndex];
    this.size = random(1.4, 2.8);
    this.hue = random(song.hueMin, song.hueMax);
    this.offset = random(TWO_PI);
  }

  update() {
    let centerX = width / 2;
    let centerY = height / 2;

    let dx = this.targetX - centerX;
    let dy = this.targetY - centerY;
    let particleDistance = sqrt(dx * dx + dy * dy);

    let nx = particleDistance > 0 ? dx / particleDistance : 0;
    let ny = particleDistance > 0 ? dy / particleDistance : 0;

    let energy = visualBassLevel * 0.85 + visualBassImpact * 0.9;

    let waveSpeed = 0.04 + visualBassLevel * 0.12;
    let wave = sin(this.targetX * 0.018 + frameCount * waveSpeed + this.offset);
    let waveY = cos(this.targetX * 0.015 + frameCount * (waveSpeed * 0.85) + this.offset);

    let radialPush = energy * 38;
    let waveAmpX = 3 + energy * 18;
    let waveAmpY = 3 + energy * 16 + visualMidLevel * 10;

    let desiredX = this.targetX + nx * radialPush + wave * waveAmpX;
    let desiredY = this.targetY + ny * radialPush + waveY * waveAmpY;

    desiredX += sin(frameCount * 0.025 + this.offset) * 0.8;
    desiredY += cos(frameCount * 0.025 + this.offset) * 0.8;

    this.vx += (desiredX - this.x) * 0.06;
    this.vy += (desiredY - this.y) * 0.06;

    this.vx *= 0.82;
    this.vy *= 0.82;

    this.x += this.vx;
    this.y += this.vy;
  }

  display() {
    let energy = visualBassLevel * 0.7 + visualBassImpact * 0.8;
    let glow = energy * 35;

    noStroke();
    fill(
      (this.hue + energy * 45 + visualMidLevel * 25) % 360,
      78,
      min(100, 82 + glow),
      0.92
    );

    circle(this.x, this.y, this.size + energy * 1.6);
  }
}


// --------------------------------------------------
// PARTIKEL AUS DER SCHRIFT FREISETZEN
// --------------------------------------------------
function createVisualFlowBurst() {
  let intensity = max(visualBassImpact, visualBassLevel);
  let amount = floor(map(intensity, 0, 1, 20, 80));

  for (let i = 0; i < amount; i++) {
    if (visualFlowParticles.length >= visualMaxFlowParticles) {
      break;
    }

    if (visualTextParticles.length === 0) {
      return;
    }

    let source = random(visualTextParticles);
    visualFlowParticles.push(new VisualFlowParticle(source.x, source.y));
  }
}


// --------------------------------------------------
// FLIESSENDE PARTIKEL
// --------------------------------------------------
class VisualFlowParticle {
  constructor(x, y) {
    this.x = x;
    this.y = y;

    let angle = atan2(y - height / 2, x - width / 2) + random(-0.8, 0.8);
    let speed = random(1.8, 5.8) * (0.7 + visualBassLevel);

    this.vx = cos(angle) * speed;
    this.vy = sin(angle) * speed;

    const song = SONGS[currentIndex];
    this.size = random(1.2, 3.6);
    this.life = random(45, 110);
    this.maxLife = this.life;
    this.hue = random(song.hueMin - 10, song.hueMax + 70) % 360;
    this.noiseOffset = random(1000);
  }

  update() {
    let flow = noise(
      this.x * 0.003,
      this.y * 0.003,
      this.noiseOffset + frameCount * 0.008
    );

    let angle = flow * TWO_PI * 2;

    this.vx += cos(angle) * 0.05;
    this.vy += sin(angle) * 0.05;

    this.vx *= 0.985;
    this.vy *= 0.985;

    this.x += this.vx;
    this.y += this.vy;

    this.life--;
  }

  display() {
    let particleOpacity = this.life / this.maxLife;

    noStroke();
    fill(this.hue, 80, 100, particleOpacity * 0.85);
    circle(this.x, this.y, this.size * particleOpacity);
  }
}


// --------------------------------------------------
// INTERFACE
// --------------------------------------------------
function drawVisualInterface() {
  push();
  colorMode(RGB, 255);
  noStroke();
  fill(160, 190, 210, 170);
  textAlign(CENTER, CENTER);
  textFont("Arial");
  textStyle(BOLD);
  textSize(16); 
  drawingContext.letterSpacing = "2px";

  const song = SONGS[currentIndex];

  // Zeile 1 (oben): BASS / RAW
  text(
    "BASS: " + visualBassLevel.toFixed(3) + "   RAW: " + visualRawBass.toFixed(3),
    width / 2,
    height - 95
  );

  // Zeile 2: Zeitleiste (HTML, bottom: 52px)

  // Zeile 3 (unten): Status
  if (visualAudioError) {
    text("AUDIO ERROR - CHECK " + song.audio, width / 2, height - 25);
  } else if (isLoading) {
    text("LOADING " + song.label.toUpperCase() + "...", width / 2, height - 25);
  } else if (visualPlaying) {
    text(song.label.toUpperCase() + " / AUDIO REACTIVE", width / 2, height - 25);
  } else {
    text("CLICK TO PLAY", width / 2, height - 25);
  }

  drawingContext.letterSpacing = "0px";
  pop();
}
// --------------------------------------------------
// AUDIO STEUERUNG
// --------------------------------------------------
async function mousePressed(event) {
  // Klicks auf Buttons oder Zeitleiste nicht als Play/Pause werten
  if (event && event.target && event.target.tagName !== "CANVAS") return;

  if (isLoading || visualAudioError || !visualAudio) return;

  await userStartAudio();
  ensureFFT();

  if (visualAudio.isPlaying()) {
    visualAudio.pause();
    visualPlaying = false;
  } else {
    visualAudio.play();
    visualPlaying = true;
  }
}


// --------------------------------------------------
// FENSTERGRÖSSE
// --------------------------------------------------
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  createVisualTypography();
}