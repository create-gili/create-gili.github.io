let visualAudio;
let visualFFT;
let visualPlaying = false;
let visualAudioReady = false;
let visualAudioError = false;

let visualTextParticles = [];
let visualFlowParticles = [];
let visualSparks = [];
let visualShockwaves = [];
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

// --------------------------------------------------
// REGLER (hier kannst du die Stärke einstellen)
// --------------------------------------------------
let TEXT_INTENSITY = 1.0;     // 1.0 = intensiv, 1.5 = extrem, 0.7 = dezenter
let SPARK_AMOUNT = 1.0;       // mehr = mehr Funken
let HARD_BASS_LIMIT = 0.5;    // ab diesem Bass-Wert gilt ein Schlag als "hart" (niedriger = öfter Funken)
let SHAKE_AMOUNT = 1.0;       // 0 = kein Wackeln

let visualMaxSparks = 1500;


// --------------------------------------------------
// SETUP
// --------------------------------------------------

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 1);

  createVisualTypography();

  console.log("p5.sound verfügbar:", typeof loadSound);

  if (typeof loadSound !== "function") {
    console.error("p5.sound ist nicht aktiviert!");
    visualAudioError = true;
    return;
  }

  loadVisualAudio();
}

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
      result
        .then((snd) => {
          visualAudio = snd;
          onOk();
        })
        .catch(onErr);
    } else {
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
      visualBassImpact = min(1, max(visualBassImpact, visualBassLevel * 1.4));
      visualBeatCooldown = 7;
      createVisualFlowBurst();

      // Harter Bass: Funken + Schockwelle
      if (visualBassLevel > HARD_BASS_LIMIT) {
        createVisualSparks(visualBassLevel);
        visualShockwaves.push({ r: 20, alpha: 0.9, weight: 2 + visualBassLevel * 4 });
      }
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
  visualBassImpact *= 0.92;
  if (visualBassImpact < 0.01) {
    visualBassImpact = 0;
  }

  if (visualBeatCooldown > 0) {
    visualBeatCooldown--;
  }

  // -----------------------------------------------
  // SCHRIFT + EFFEKTE (mit Wackeln bei hartem Bass)
  // -----------------------------------------------
  push();

  let shake = visualBassImpact * visualBassImpact * 7 * SHAKE_AMOUNT;
  if (shake > 0.1) {
    translate(random(-shake, shake), random(-shake, shake));
  }

  // Schockwellen
  drawVisualShockwaves();

  // Schriftpartikel
  for (let particle of visualTextParticles) {
    particle.update();
    particle.display();
  }

  // Ausströmende Partikel
  for (let i = visualFlowParticles.length - 1; i >= 0; i--) {
    let particle = visualFlowParticles[i];
    particle.update();
    particle.display();

    if (particle.life <= 0) {
      visualFlowParticles.splice(i, 1);
    }
  }

  // Funken (additiv, damit sie leuchten)
  blendMode(ADD);
  for (let i = visualSparks.length - 1; i >= 0; i--) {
    let spark = visualSparks[i];
    spark.update();
    spark.display();

    if (spark.life <= 0) {
      visualSparks.splice(i, 1);
    }
  }
  blendMode(BLEND);

  pop();

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
  visualTypographyLayer.textFont("Arial");
  visualTypographyLayer.textStyle(BOLD);

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

    this.size = random(1.6, 3.2);
    this.hue = random(185, 220);
    this.offset = random(TWO_PI);
    this.kick = random(0.6, 1.5); // jeder Punkt reagiert unterschiedlich stark
  }

  update() {
    let centerX = width / 2;
    let centerY = height / 2;

    let dx = this.targetX - centerX;
    let dy = this.targetY - centerY;
    let particleDistance = sqrt(dx * dx + dy * dy);

    let nx = particleDistance > 0 ? dx / particleDistance : 0;
    let ny = particleDistance > 0 ? dy / particleDistance : 0;

    let energy = (visualBassLevel * 1.0 + visualBassImpact * 1.3) * TEXT_INTENSITY;

    let waveSpeed = 0.05 + visualBassLevel * 0.2;
    let wave = sin(this.targetX * 0.02 + frameCount * waveSpeed + this.offset);
    let waveY = cos(this.targetX * 0.017 + frameCount * (waveSpeed * 0.85) + this.offset);

    let radialPush = energy * 70 * this.kick;
    let waveAmpX = 3 + energy * 30;
    let waveAmpY = 3 + energy * 28 + visualMidLevel * 16 * TEXT_INTENSITY;

    let desiredX = this.targetX + nx * radialPush + wave * waveAmpX;
    let desiredY = this.targetY + ny * radialPush + waveY * waveAmpY;

    // Zittern bei hartem Schlag
    let jitter = visualBassImpact * 7 * TEXT_INTENSITY;
    desiredX += random(-jitter, jitter);
    desiredY += random(-jitter, jitter);

    desiredX += sin(frameCount * 0.025 + this.offset) * 0.8;
    desiredY += cos(frameCount * 0.025 + this.offset) * 0.8;

    this.vx += (desiredX - this.x) * 0.09;
    this.vy += (desiredY - this.y) * 0.09;

    this.vx *= 0.8;
    this.vy *= 0.8;

    this.x += this.vx;
    this.y += this.vy;
  }

  display() {
    let energy = (visualBassLevel * 0.9 + visualBassImpact * 1.2) * TEXT_INTENSITY;
    let flash = constrain(visualBassImpact * 1.2, 0, 1);

    noStroke();

    // Farbe wandert mit dem Bass, bei Schlägen fast weiss
    fill(
      (this.hue + energy * 70 + visualMidLevel * 35) % 360,
      constrain(78 - flash * 65, 10, 100),
      100,
      0.95
    );

    circle(this.x, this.y, this.size + energy * 3.2);
  }
}


// --------------------------------------------------
// PARTIKEL AUS DER SCHRIFT FREISETZEN
// --------------------------------------------------

function createVisualFlowBurst() {
  let intensity = max(visualBassImpact, visualBassLevel);
  let amount = floor(map(intensity, 0, 1, 30, 110));

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
    let speed = random(2.2, 7) * (0.7 + visualBassLevel);

    this.vx = cos(angle) * speed;
    this.vy = sin(angle) * speed;

    this.size = random(1.2, 3.8);
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
// FUNKEN (bei hartem Bass)
// --------------------------------------------------

function createVisualSparks(intensity) {
  if (visualTextParticles.length === 0) return;

  let amount = floor(map(intensity, HARD_BASS_LIMIT, 1, 40, 180) * SPARK_AMOUNT);
  amount = max(amount, 0);

  for (let i = 0; i < amount; i++) {
    if (visualSparks.length >= visualMaxSparks) break;

    let source = random(visualTextParticles);
    visualSparks.push(new VisualSpark(source.x, source.y, intensity));
  }
}

class VisualSpark {
  constructor(x, y, intensity) {
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.prevY = y;

    let angle = atan2(y - height / 2, x - width / 2) + random(-0.9, 0.9);
    let speed = random(4, 15) * (0.6 + intensity);

    this.vx = cos(angle) * speed;
    this.vy = sin(angle) * speed - random(0, 2); // leicht nach oben

    this.life = random(25, 65);
    this.maxLife = this.life;

    // Meist warm (gelb/orange), teils cyan/weiss
    this.hue = random() < 0.7 ? random(25, 60) : random(175, 200);
    this.weight = random(1, 2.6);
  }

  update() {
    this.prevX = this.x;
    this.prevY = this.y;

    this.vy += 0.15;   // Schwerkraft
    this.vx *= 0.975;  // Luftwiderstand
    this.vy *= 0.975;

    this.x += this.vx;
    this.y += this.vy;

    this.life--;
  }

  display() {
    let t = this.life / this.maxLife;

    // Leuchtspur
    stroke(this.hue, 100 - (1 - t) * 20, 100, t);
    strokeWeight(this.weight * t + 0.4);
    line(this.prevX, this.prevY, this.x, this.y);

    // Heller Kopf
    noStroke();
    fill(this.hue, 25, 100, t);
    circle(this.x, this.y, this.weight * 1.5 * t + 0.5);
  }
}


// --------------------------------------------------
// SCHOCKWELLE
// --------------------------------------------------

function drawVisualShockwaves() {
  noFill();

  for (let i = visualShockwaves.length - 1; i >= 0; i--) {
    let w = visualShockwaves[i];

    w.r += 22;
    w.alpha *= 0.93;

    stroke(190, 60, 100, w.alpha);
    strokeWeight(w.weight * w.alpha + 0.5);
    ellipse(width / 2, height / 2, w.r * 2.2, w.r * 1.1);

    if (w.alpha < 0.02) {
      visualShockwaves.splice(i, 1);
    }
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
  } else {
    visualAudio.pause();
    visualPlaying = false;
  }
}


// --------------------------------------------------
// FENSTERGRÖSSE
// --------------------------------------------------

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  createVisualTypography();
}