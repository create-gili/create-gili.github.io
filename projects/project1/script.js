let visualFontName = "Arial";
let visualAudio;
let visualFFT;
let visualPlaying = false;
let visualAudioReady = false;
let visualAudioError = false;

let visualTextParticles = [];
let visualFlowParticles = [];
let visualTypographyLayer;

let visualBassLevel = 0;
let visualMidLevel = 0;
let visualBassAvg = 0;
let visualBassImpact = 0;
let visualBeatCooldown = 0;

// Rohwerte und automatische Skalierung
let visualRawBass = 0;
let visualPeakBass = 1;
let visualPeakMid = 1;

let visualParticleSpacing = 5;
let visualMaxFlowParticles = 1800;


// --------------------------------------------------
// SETUP
// --------------------------------------------------

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 1);

  // Zuerst mit Arial starten, damit immer etwas sichtbar ist
  createVisualTypography();

  // Eigenen Font laden, danach die Schrift neu aufbauen
  const sora = new FontFace("Sora", "url(fonts/Sora-ExtraBold.otf)");
  sora
    .load()  
    .then((loadedFont) => {
      document.fonts.add(loadedFont);
      visualFontName = "Sora";
      console.log("Font geladen!");
      createVisualTypography();
    })
    .catch((err) => {
      console.error("Font konnte nicht geladen werden:", err);
    });

  console.log("p5.sound verfügbar:", typeof loadSound);

  if (typeof loadSound !== "function") {
    console.error("p5.sound ist nicht aktiviert!");
    visualAudioError = true;
    return;
  }

  loadVisualAudio();
}


// --------------------------------------------------
// AUDIO LADEN
// --------------------------------------------------

function loadVisualAudio() {
  const onOk = () => {
    console.log("Audio erfolgreich geladen!");
    visualAudioReady = true;
    try {
      visualAudio.setVolume(0.8);
    } catch (e) {
      console.warn("setVolume nicht möglich:", e);
    }
  };

  const onErr = (err) => {
    console.error("Fehler beim Laden von media/Arroyo.mp3:", err);
    visualAudioError = true;
  };

  try {
    const result = loadSound("media/Arroyo.mp3", onOk, onErr);

    if (result && typeof result.then === "function") {
      // p5.js 2.x: loadSound liefert ein Promise
      result
        .then((snd) => {
          visualAudio = snd;
          onOk();
        })
        .catch(onErr);
    } else {
      // p5.js 1.x: loadSound liefert direkt das SoundFile
      visualAudio = result;
    }
  } catch (e) {
    onErr(e);
  }
}


// --------------------------------------------------
// DRAW
// --------------------------------------------------

function draw() {
  background(230, 40, 4, 0.22);

  // -----------------------------------------------
  // AUDIOANALYSE
  // -----------------------------------------------
  if (visualPlaying && visualAudioReady && visualFFT && visualAudio.isPlaying()) {
    let spectrum = visualFFT.analyze();

    // Skala erkennen: 0-255 (alt) oder sehr kleine Werte (neu)
    let maxValue = 0;
    for (let i = 0; i < spectrum.length; i++) {
      if (spectrum[i] > maxValue) maxValue = spectrum[i];
    }
    let unit = maxValue > 2 ? 255 : 1;

    // Bass ca. 20-150 Hz, Mid ca. 400-2500 Hz
    visualRawBass = readVisualBand(spectrum, 20, 150);
    let midRaw = readVisualBand(spectrum, 400, 2500);

    // Spitzenwerte langsam abklingen lassen
    visualPeakBass = max(visualPeakBass * 0.998, visualRawBass, unit * 0.03);
    visualPeakMid = max(visualPeakMid * 0.998, midRaw, unit * 0.03);

    // Normalisieren, Kontrast erhöhen
    let bassTarget = pow(constrain(visualRawBass / visualPeakBass, 0, 1), 3);
    let midTarget = constrain(midRaw / visualPeakMid, 0, 1);

    visualBassLevel = lerp(visualBassLevel, bassTarget, 0.4);
    visualMidLevel = lerp(visualMidLevel, midTarget, 0.25);

    // Beat: Bass liegt deutlich über seinem langsamen Durchschnitt
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

  // -----------------------------------------------
  // BASSREAKTION AUSKLINGEN
  // -----------------------------------------------
  visualBassImpact *= 0.91;
  if (visualBassImpact < 0.01) {
    visualBassImpact = 0;
  }

  if (visualBeatCooldown > 0) {
    visualBeatCooldown--;
  }

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

  visualTypographyLayer = createGraphics(width, height);
  visualTypographyLayer.pixelDensity(1);
  visualTypographyLayer.background(0);
  visualTypographyLayer.fill(255);
  visualTypographyLayer.noStroke();
  visualTypographyLayer.textAlign(CENTER, CENTER);
  visualTypographyLayer.textFont(visualFontName);

  let fontSize = min(width * 0.19, height * 0.42);
  fontSize = max(fontSize, 50);
  visualTypographyLayer.textSize(fontSize);

  visualTypographyLayer.text("ARROYO", width / 2, height / 2);
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

    this.size = random(1.4, 2.8);
    this.hue = random(185, 220);
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

    this.size = random(1.2, 3.6);
    this.life = random(45, 110);
    this.maxLife = this.life;
    this.hue = random(175, 290);
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
  textSize(11);

  if (visualAudioError) {
    text("AUDIO ERROR - CHECK media/Arroyo.mp3 / p5.sound", width / 2, height - 35);
  } else if (!visualAudioReady) {
    text("LOADING AUDIO...", width / 2, height - 35);
  } else if (visualPlaying) {
    text("ARROYO / AUDIO REACTIVE", width / 2, height - 35);
  } else {
    text("CLICK TO PLAY", width / 2, height - 35);
  }

  text(
    "BASS: " + visualBassLevel.toFixed(3) + "   RAW: " + visualRawBass.toFixed(3),
    width / 2,
    height - 60
  );
  pop();
}


// --------------------------------------------------
// AUDIO STEUERUNG
// --------------------------------------------------

async function mousePressed() {
  if (!visualAudioReady || visualAudioError || !visualAudio) {
    return;
  }

  await userStartAudio();

  if (!visualFFT) {
    try {
      visualFFT = new p5.FFT(0.8, 1024);
      visualFFT.setInput(visualAudio);
      console.log("FFT erfolgreich initialisiert!");
    } catch (e) {
      console.error("FFT-Fehler:", e);
      visualAudioError = true;
      return;
    }
  }

  if (!visualPlaying) {
    visualAudio.play();
    visualPlaying = true;
    console.log("Musik gestartet!");
  } else {
    visualAudio.pause();
    visualPlaying = false;
    console.log("Musik pausiert!");
  }
}


// --------------------------------------------------
// FENSTERGRÖSSE
// --------------------------------------------------

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  createVisualTypography();
}