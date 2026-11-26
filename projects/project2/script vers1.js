/* ==================================================================
   MÜLL-GLOBUS  –  p5.js 2.0.5 (WEBGL)

   • Globus mit Maus/Finger drehen, Mausrad = Zoom
   • Auf ein Land klicken  →  ein Müllberg wächst aus dem Land
   • Rechts: wie viel Siedlungsabfall das Land pro Jahr produziert
   • Unten:  Tipps zum Vermeiden + biologisch abbaubare Alternativen
   • Esc = Auswahl aufheben

   Die Länderumrisse werden beim Start als GeoJSON aus dem Netz geladen
   (Internetverbindung nötig). Alle Oberflächen-Elemente (HUD) werden
   per JavaScript erzeugt – du brauchst also nur die index.html + diese Datei.
   ================================================================== */

/* ---------- Daten ------------------------------------------------ */

const GEO_URLS = [
  'https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json',
  'https://cdn.jsdelivr.net/gh/johan/world.geo.json@master/countries.geo.json',
];

// ISO3: [Name, Siedlungsabfall in Mio. Tonnen pro Jahr, Einwohner in Mio.]
// Gerundete Näherungswerte (Grössenordnung nach World Bank «What a Waste 2.0»).
// Wenn du genauere Zahlen hast: einfach hier anpassen oder Länder ergänzen.
const WASTE = {
  USA: ['USA', 265, 335],           CHN: ['China', 220, 1410],
  IND: ['Indien', 168, 1420],       BRA: ['Brasilien', 80, 215],
  IDN: ['Indonesien', 65, 277],     RUS: ['Russland', 60, 144],
  MEX: ['Mexiko', 53, 128],         DEU: ['Deutschland', 52, 84],
  JPN: ['Japan', 43, 124],          FRA: ['Frankreich', 34, 68],
  CAN: ['Kanada', 34, 39],          GBR: ['Grossbritannien', 31, 67],
  TUR: ['Türkei', 32, 85],          NGA: ['Nigeria', 32, 220],
  PAK: ['Pakistan', 31, 230],       ITA: ['Italien', 30, 59],
  THA: ['Thailand', 27, 70],        BGD: ['Bangladesch', 22, 170],
  VNM: ['Vietnam', 22, 98],         EGY: ['Ägypten', 21, 105],
  IRN: ['Iran', 20, 88],            ZAF: ['Südafrika', 18, 60],
  KOR: ['Südkorea', 19, 52],        ESP: ['Spanien', 22, 48],
  SAU: ['Saudi-Arabien', 17, 36],   ARG: ['Argentinien', 17, 46],
  COL: ['Kolumbien', 12, 52],       POL: ['Polen', 12.5, 38],
  AUS: ['Australien', 14, 26],      MYS: ['Malaysia', 14, 33],
  UKR: ['Ukraine', 11, 41],         DZA: ['Algerien', 13, 45],
  IRQ: ['Irak', 13, 43],            NLD: ['Niederlande', 9, 17.5],
  SWE: ['Schweden', 4.4, 10.5],     CHE: ['Schweiz', 6, 8.8],
  AUT: ['Österreich', 5, 9],        BEL: ['Belgien', 4.9, 11.6],
  CZE: ['Tschechien', 3.5, 10.5],   GRC: ['Griechenland', 5.5, 10.4],
  PRT: ['Portugal', 5, 10.3],       HUN: ['Ungarn', 3.8, 9.7],
  ROU: ['Rumänien', 5, 19],         NOR: ['Norwegen', 2.4, 5.4],
  DNK: ['Dänemark', 4.5, 5.9],      FIN: ['Finnland', 2.8, 5.5],
  IRL: ['Irland', 2.9, 5.1],        ISR: ['Israel', 5.5, 9.5],
  ARE: ['Ver. Arab. Emirate', 7, 9.9], KAZ: ['Kasachstan', 5, 19.5],
  MAR: ['Marokko', 7, 37],          TUN: ['Tunesien', 2.8, 12],
  KEN: ['Kenia', 5.4, 54],          ETH: ['Äthiopien', 8, 120],
  TZA: ['Tansania', 8, 63],         COD: ['DR Kongo', 10, 95],
  GHA: ['Ghana', 3.3, 33],          CIV: ['Elfenbeinküste', 2, 28],
  AGO: ['Angola', 5, 35],           SDN: ['Sudan', 5, 45],
  PER: ['Peru', 7.5, 34],           CHL: ['Chile', 6.5, 19.5],
  VEN: ['Venezuela', 6, 28],        ECU: ['Ecuador', 5, 18],
  CUB: ['Kuba', 3, 11],             NZL: ['Neuseeland', 3.7, 5.1],
  MMR: ['Myanmar', 6, 54],          AFG: ['Afghanistan', 4, 40],
  NPL: ['Nepal', 3.5, 30],          LKA: ['Sri Lanka', 5, 22],
  UZB: ['Usbekistan', 4.5, 35],     BLR: ['Belarus', 3.5, 9.4],
  BGR: ['Bulgarien', 3, 6.8],       SRB: ['Serbien', 2.5, 6.8],
  HRV: ['Kroatien', 1.7, 3.9],      SVK: ['Slowakei', 2, 5.4],
  LTU: ['Litauen', 1.3, 2.8],       MNG: ['Mongolei', 1, 3.4],
  BOL: ['Bolivien', 2, 12],         PRY: ['Paraguay', 2, 7],
  URY: ['Uruguay', 1.5, 3.4],       GTM: ['Guatemala', 3, 17],
  DOM: ['Dominikanische Rep.', 3, 11], JOR: ['Jordanien', 2, 11],
  LBY: ['Libyen', 2.5, 7],      PHL: ['Philippinen', 15, 115],
};

// Länder ohne Messwert: Schätzung [Name, Einwohner in Mio., kg Müll pro Person und Jahr]
// (grob aus Region und Wirtschaftsniveau abgeleitet – nur zur Orientierung)
const EST = {
  ALB: ['Albanien', 2.8, 390],       ARM: ['Armenien', 2.8, 400],
  AZE: ['Aserbaidschan', 10.1, 350], BDI: ['Burundi', 12.9, 120],
  BEN: ['Benin', 13, 200],           BFA: ['Burkina Faso', 22, 160],
  BHS: ['Bahamas', 0.4, 700],        BIH: ['Bosnien-Herzegowina', 3.3, 330],
  BLZ: ['Belize', 0.4, 440],         BMU: ['Bermuda', 0.06, 700],
  BRN: ['Brunei', 0.45, 700],        BTN: ['Bhutan', 0.8, 250],
  BWA: ['Botswana', 2.6, 400],       CAF: ['Zentralafrikanische Rep.', 5.5, 150],
  CMR: ['Kamerun', 28, 230],         COG: ['Rep. Kongo', 6, 250],
  CRI: ['Costa Rica', 5.2, 480],     CYP: ['Zypern', 1.3, 640],
  DJI: ['Dschibuti', 1.1, 250],      ERI: ['Eritrea', 3.6, 150],
  EST: ['Estland', 1.4, 400],        FJI: ['Fidschi', 0.9, 300],
  FLK: ['Falklandinseln', 0.004, 500], GAB: ['Gabun', 2.4, 300],
  GEO: ['Georgien', 3.7, 340],       GIN: ['Guinea', 14, 200],
  GMB: ['Gambia', 2.7, 200],         GNB: ['Guinea-Bissau', 2.1, 180],
  GNQ: ['Äquatorialguinea', 1.7, 250], GRL: ['Grönland', 0.056, 500],
  GUF: ['Französisch-Guayana', 0.3, 450], GUY: ['Guyana', 0.8, 400],
  HND: ['Honduras', 10, 350],        HTI: ['Haiti', 11.5, 180],
  ISL: ['Island', 0.38, 600],        JAM: ['Jamaika', 2.8, 400],
  KGZ: ['Kirgisistan', 6.7, 200],    KHM: ['Kambodscha', 17, 300],
  KWT: ['Kuwait', 4.3, 700],         LAO: ['Laos', 7.5, 300],
  LBN: ['Libanon', 5.5, 500],        LBR: ['Liberia', 5.2, 280],
  LSO: ['Lesotho', 2.3, 200],        LUX: ['Luxemburg', 0.65, 790],
  LVA: ['Lettland', 1.9, 440],       MDA: ['Moldawien', 2.6, 300],
  MDG: ['Madagaskar', 29, 150],      MKD: ['Nordmazedonien', 2.1, 380],
  MLI: ['Mali', 22, 170],            MLT: ['Malta', 0.52, 640],
  MNE: ['Montenegro', 0.62, 500],    MOZ: ['Mosambik', 33, 200],
  MRT: ['Mauretanien', 4.8, 220],    MWI: ['Malawi', 20, 150],
  NAM: ['Namibia', 2.6, 350],        NCL: ['Neukaledonien', 0.27, 500],
  NER: ['Niger', 26, 150],           NIC: ['Nicaragua', 6.8, 330],
  OMN: ['Oman', 4.6, 550],           PAN: ['Panama', 4.4, 450],
  PNG: ['Papua-Neuguinea', 10, 250], PRI: ['Puerto Rico', 3.2, 700],
  PRK: ['Nordkorea', 26, 250],       QAT: ['Katar', 2.7, 800],
  RWA: ['Ruanda', 13.5, 200],        ESH: ['Westsahara', 0.6, 250],
  SSD: ['Südsudan', 11, 150],        SEN: ['Senegal', 17.5, 250],
  SLB: ['Salomonen', 0.7, 200],      SLE: ['Sierra Leone', 8.6, 200],
  SLV: ['El Salvador', 6.3, 400],    SOM: ['Somalia', 17, 150],
  SUR: ['Suriname', 0.6, 400],       SVN: ['Slowenien', 2.1, 490],
  SWZ: ['Eswatini', 1.2, 250],       SYR: ['Syrien', 22, 300],
  TCD: ['Tschad', 17, 170],          TGO: ['Togo', 8.8, 220],
  TJK: ['Tadschikistan', 10, 220],   TKM: ['Turkmenistan', 6.4, 400],
  TLS: ['Osttimor', 1.4, 200],       TTO: ['Trinidad und Tobago', 1.4, 560],
  TWN: ['Taiwan', 23.5, 400],        UGA: ['Uganda', 48, 200],
  VUT: ['Vanuatu', 0.33, 220],       PSE: ['Westjordanland', 3.2, 400],
  YEM: ['Jemen', 34, 200],           ZMB: ['Sambia', 20, 200],
  ZWE: ['Simbabwe', 16, 250],        'CS-KM': ['Kosovo', 1.8, 330],
};


// Tipps: tag = Kategorie (steuert die Farbe)
const TIPS = [
  { tag: 'Vermeiden', text: 'Mehrweg schlägt Einweg: Wer Trinkflasche, Stofftasche und Brotdose täglich nutzt, spart pro Jahr hunderte Wegwerfartikel.' },
  { tag: 'Vermeiden', text: 'Rund ein Drittel aller Lebensmittel wird weggeworfen. Einkaufsliste, richtige Lagerung und Resteküche verkleinern den Berg sofort.' },
  { tag: 'Kreislauf', text: 'Kompost statt Kehricht: Küchenabfälle werden zu Erde. Auf der Deponie entsteht aus Essensresten dagegen Methan, ein starkes Treibhausgas.' },
  { tag: 'Bio-Alternative', text: 'Bienenwachstücher statt Frischhaltefolie: wiederverwendbar und am Ende kompostierbar.' },
  { tag: 'Bio-Alternative', text: 'Bambus-Zahnbürste, festes Shampoo und Seife am Stück ersetzen Plastikflaschen im Bad – die Verpackung besteht oft nur aus Papier.' },
  { tag: 'Bio-Alternative', text: 'Verpackungen aus Pilzmyzel oder Maisstärke ersetzen Styropor. Achtung: PLA-Bioplastik braucht meist industrielle Kompostierung.' },
  { tag: 'Vermeiden', text: 'Reparieren statt ersetzen: In Repair-Cafés werden Toaster, Velos und Kleider wieder fit. Jedes reparierte Gerät spart Elektroschrott.' },
  { tag: 'Bio-Alternative', text: 'Strohhalme aus Papier, Edelstahl oder echtem Stroh und Besteck aus Holz ersetzen Einweg-Plastik bei Festen und Take-away.' },
  { tag: 'Kreislauf', text: 'Sauber trennen lohnt sich: PET, Glas, Alu und Papier werden zu neuen Rohstoffen – wenn sie nicht verschmutzt im Restmüll landen.' },
  { tag: 'Bio-Alternative', text: 'Kleidung aus Baumwolle, Leinen oder Hanf statt Polyester gibt beim Waschen kein Mikroplastik ab. Secondhand ist noch besser.' },
  { tag: 'Vermeiden', text: 'Unverpackt-Läden und Nachfüllstationen: Mit eigenen Behältern einkaufen spart Verpackung, bevor sie entsteht.' },
  { tag: 'Bio-Alternative', text: 'Lose Tees und Kaffee aus der Filterkanne statt Kapseln – der Kaffeesatz wird zum Dünger für Zimmerpflanzen.' },
  { tag: 'Bio-Alternative', text: 'Verpackungen aus Algen oder Agar lassen sich essen oder zerfallen in Wochen statt in Jahrhunderten.' },
  { tag: 'Vermeiden', text: 'Leitungswasser statt Flaschenwasser: Wo es trinkbar ist, spart der Hahn Flaschen, Transport und Verpackungsmüll.' },
  { tag: 'Vermeiden', text: 'Obst und Gemüse lose kaufen statt in Folienschalen und Plastiksäckli. Ein Netz aus Baumwolle tut es auch.' },
  { tag: 'Bio-Alternative', text: 'Spülbürste aus Holz und Luffa- oder Zellulose-Schwamm statt Plastikschwamm: kompostierbar und ohne Mikroplastik.' },
  { tag: 'Bio-Alternative', text: 'Biomüll-Beutel aus Maisstärke funktionieren nur, wenn deine Sammlung sie annimmt – sonst lieber Zeitungspapier verwenden.' },
  { tag: 'Kreislauf', text: 'Batterien, Elektrogeräte und Altkleider gehören an die Sammelstelle, nie in den Kehricht. So bleiben Metalle im Kreislauf.' },
  { tag: 'Vermeiden', text: 'Stopp-Werbung-Kleber am Briefkasten und digitale Rechnungen sparen Jahr für Jahr kiloweise Papier.' },
  { tag: 'Bio-Alternative', text: 'Geschenke in Stoff (Furoshiki) oder Zeitungspapier einpacken statt in glitzernde Plastikfolie.' },
  { tag: 'Vermeiden', text: 'Leihen statt kaufen: Bohrmaschine, Leiter oder Raclette-Set muss nicht jeder besitzen – Nachbarn und «Bibliotheken der Dinge» helfen.' },
  { tag: 'Bio-Alternative', text: 'Wattestäbchen mit Papierstiel, Rasierer aus Metall und Menstruationstasse sparen Einweg-Müll im Alltag.' },
  { tag: 'Kreislauf', text: 'Gartenabfälle häckseln und als Mulch nutzen: Das hält den Boden feucht und ersetzt Dünger.' },
  { tag: 'Vermeiden', text: 'Plastiktüten werden oft nur Minuten genutzt, brauchen aber Jahrhunderte zum Zerfallen. Eine Stofftasche lohnt sich nach wenigen Einsätzen.' },
];
const TAG_COLORS = { 'Vermeiden': '#ffb84d', 'Bio-Alternative': '#7bd88f', 'Kreislauf': '#78c0ff' };
const TIP_MS = 8000;

/* ---------- Zustand ---------------------------------------------- */

const TEX_W = 2048, TEX_H = 1024;
const LAT_SEG = 40, LON_SEG = 80;
const KG_MIN = 100, KG_MAX = 750;   // Farbskala «Müll pro Kopf»

let geo = null;               // Länder (nach dem Laden)
let tex, texImg;              // Textur der Weltkarte
let sphereV;                  // vorberechnete Kugel-Vertices
let selIdx = -1;              // gewähltes Land
let heap = null;              // Müllberg des gewählten Landes
let rankTotal = [], rankPC = [];

let baseR = 250, R = 250, gx = 0, gy = 0;   // Globus-Radius (R = baseR · Zoom) und Verschiebung
let camZ = 1600, zoom = 1, zoomT = 1;       // Zoom skaliert den Globus, die Kamera bleibt stehen → Globus bleibt zentriert
let latC = 0.35, lonC = 0.3;  // Blickzentrum (Radiant)
let flyTo = null;             // { lon, lat } Zielblick
let autoRotate = true;
let dragging = false, dragDist = 0;

let ui = {};
let tipIdx = 0, tipTimer = null, tipToken = 0;
let selStart = 0;

/* ---------- p5: setup / draw ------------------------------------- */

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  textureMode(NORMAL);

  tex = createGraphics(TEX_W, TEX_H);
  tex.pixelDensity(1);

  buildSphereData();
  paintTexture();
  refreshTexture();

  injectStyles();
  buildUI();
  layout();
  makeBackdrop();
  tipIdx = Math.floor(Math.random() * TIPS.length);
  goTip(0);
  loadGeo();
}

function draw() {
  clear();
  updateView();

  perspective(2 * Math.atan((height / 2) / camZ), width / height, camZ * 0.1, camZ * 4);
  camera(0, 0, camZ, 0, 0, 0, 0, 1, 0);

  ambientLight(110, 115, 130);
  directionalLight(255, 244, 226, 0.55, 0.45, -0.7);
  directionalLight(60, 85, 140, -0.6, -0.2, 0.5);

  push();
  translate(gx, gy, 0);
  rotateX(-latC);
  rotateY(-lonC);
  drawGlobe();
  drawHeap();
  pop();

  updateHalo();
  tickUI();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  layout();
  makeBackdrop();
}

function layout() {
  const wide = width > 820;
  baseR = Math.min(height * 0.30, width * (wide ? 0.26 : 0.38));
  gx = wide ? -width * 0.13 : 0;
  gy = wide ? 0 : height * 0.06;
}

function updateView() {
  if (flyTo) {
    lonC += wrapDiff(flyTo.lon - lonC) * 0.07;
    latC += (flyTo.lat - latC) * 0.07;
    if (Math.abs(wrapDiff(flyTo.lon - lonC)) < 0.002 && Math.abs(flyTo.lat - latC) < 0.002) flyTo = null;
  } else if (autoRotate && !dragging) {
    lonC += 0.0022;
  }
  if (lonC > Math.PI) lonC -= 2 * Math.PI;
  if (lonC < -Math.PI) lonC += 2 * Math.PI;
  zoom += (zoomT - zoom) * 0.12;
  R = baseR * zoom;
}

function wrapDiff(d) {
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

/* ---------- Globus ------------------------------------------------ */

function buildSphereData() {
  sphereV = new Float32Array((LAT_SEG + 1) * (LON_SEG + 1) * 5);
  let k = 0;
  for (let i = 0; i <= LAT_SEG; i++) {
    const lat = Math.PI / 2 - Math.PI * i / LAT_SEG;
    for (let j = 0; j <= LON_SEG; j++) {
      const lon = -Math.PI + 2 * Math.PI * j / LON_SEG;
      sphereV[k++] = Math.cos(lat) * Math.sin(lon);   // x
      sphereV[k++] = -Math.sin(lat);                  // y (p5: y zeigt nach unten)
      sphereV[k++] = Math.cos(lat) * Math.cos(lon);   // z
      sphereV[k++] = j / LON_SEG;                     // u
      sphereV[k++] = i / LAT_SEG;                     // v
    }
  }
}

function drawGlobe() {
  noStroke();
  texture(texImg || tex);
  const row = (LON_SEG + 1) * 5;
  for (let i = 0; i < LAT_SEG; i++) {
    beginShape(TRIANGLE_STRIP);
    for (let j = 0; j <= LON_SEG; j++) {
      const a = i * row + j * 5, b = a + row;
      normal(sphereV[a], sphereV[a + 1], sphereV[a + 2]);
      vertex(sphereV[a] * R, sphereV[a + 1] * R, sphereV[a + 2] * R, sphereV[a + 3], sphereV[a + 4]);
      normal(sphereV[b], sphereV[b + 1], sphereV[b + 2]);
      vertex(sphereV[b] * R, sphereV[b + 1] * R, sphereV[b + 2] * R, sphereV[b + 3], sphereV[b + 4]);
    }
    endShape();
  }
}

/* ---------- Weltkarte als Textur --------------------------------- */

function paintTexture() {
  const ctx = tex.drawingContext;
  const cv = tex.canvas || tex.elt;
  ctx.save();
  ctx.setTransform(cv.width / TEX_W, 0, 0, cv.height / TEX_H, 0, 0);
  ctx.lineJoin = 'round';

  // Ozean: Verlauf, zu den Polen etwas heller
  const g = ctx.createLinearGradient(0, 0, 0, TEX_H);
  g.addColorStop(0, '#15507f'); g.addColorStop(0.25, '#0e3d69'); g.addColorStop(0.5, '#0b3158');
  g.addColorStop(0.75, '#0e3d69'); g.addColorStop(1, '#15507f');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  // Gradnetz
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let lon = -180; lon <= 180; lon += 30) { ctx.moveTo(texX(lon), 0); ctx.lineTo(texX(lon), TEX_H); }
  for (let lat = -60; lat <= 60; lat += 30) { ctx.moveTo(0, texY(lat)); ctx.lineTo(TEX_W, texY(lat)); }
  ctx.stroke();

  if (geo) {
    // 1) heller Küstensaum im Wasser (Schelf-Glühen)
    ctx.strokeStyle = 'rgba(100,185,240,0.10)';
    for (const w of [14, 8]) {
      ctx.lineWidth = w;
      for (const c of geo) { pathCountry(ctx, c); ctx.stroke(); }
    }
    // 2) Länder, das gewählte zuletzt
    for (let i = 0; i < geo.length; i++) if (i !== selIdx) paintCountry(ctx, geo[i], false);
    if (selIdx >= 0) paintCountry(ctx, geo[selIdx], true);
  }
  ctx.restore();
}

function pathCountry(ctx, c) {
  ctx.beginPath();
  for (const poly of c.polys) {
    for (const ring of poly) {
      for (let i = 0; i < ring.length; i++) {
        const x = texX(ring[i][0]), y = texY(ring[i][1]);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
    }
  }
}

function paintCountry(ctx, c, selected) {
  pathCountry(ctx, c);
  ctx.fillStyle = landColor(c, selected);
  ctx.fill('evenodd');
  ctx.strokeStyle = selected ? '#ffffff' : 'rgba(6,16,28,0.55)';
  ctx.lineWidth = selected ? 3.5 : 1.1;
  ctx.stroke();
}

// Farbe nach Müll pro Kopf: grün → gelb → rot. Schätzwerte sind etwas blasser.
function intensity(kg) { return Math.max(0, Math.min(1, (kg - KG_MIN) / (KG_MAX - KG_MIN))); }
function hueOf(kg) { return Math.round(120 * (1 - intensity(kg))); }

function landColor(c, selected) {
  if (c.id === 'ATA') return selected ? '#ffffff' : '#d6e3ee';
  if (c.data) {
    const sat = c.data.est ? 30 : 50;
    return 'hsl(' + hueOf(c.data.kg) + ' ' + (selected ? 74 : sat) + '% ' + (selected ? 58 : 41) + '%)';
  }
  return 'hsl(212 12% ' + (selected ? 58 : 34) + '%)';
}

const texX = lon => (lon + 180) / 360 * TEX_W;
const texY = lat => (90 - lat) / 180 * TEX_H;

function refreshTexture() {
  try { texImg = tex.get(); } catch (e) { texImg = null; }
}

/* ---------- Länderdaten laden ------------------------------------ */

async function loadGeo() {
  for (const url of GEO_URLS) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(res.status);
      prepareGeo(await res.json());
      return;
    } catch (e) { /* nächste URL versuchen */ }
  }
  showEmpty('Die Weltkarte konnte nicht geladen werden. Bitte Internetverbindung prüfen und die Seite neu laden.');
}


function prepareGeo(json) {
  geo = json.features.map(f => {
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    let minX = 999, minY = 999, maxX = -999, maxY = -999;
    for (const p of polys) for (const ring of p) for (const pt of ring) {
      if (pt[0] < minX) minX = pt[0]; if (pt[0] > maxX) maxX = pt[0];
      if (pt[1] < minY) minY = pt[1]; if (pt[1] > maxY) maxY = pt[1];
    }
    const w = WASTE[f.id], e = EST[f.id];
    let name = f.properties.name, data = null;
    if (w) { name = w[0]; data = { mt: w[1], pop: w[2], kg: w[1] / w[2] * 1000, est: false }; }
    else if (e) { name = e[0]; data = { mt: e[1] * e[2] / 1000, pop: e[1], kg: e[2], est: true }; }
    const c = { id: f.id, name, polys, bbox: [minX, minY, maxX, maxY], data };
    c.centroid = countryCenter(c);
    return c;
  });
  const withData = geo.filter(c => c.data);
  rankTotal = withData.slice().sort((a, b) => b.data.mt - a.data.mt).map(c => c.id);
  rankPC = withData.slice().sort((a, b) => b.data.kg - a.data.kg).map(c => c.id);
  paintTexture();
  refreshTexture();
  showEmpty();
}

function countryCenter(c) {
  let best = null;
  for (const poly of c.polys) {
    const r = ringCentroid(poly[0]);
    if (!best || r.area > best.area) best = { area: r.area, x: r.x, y: r.y, poly };
  }
  if (inPoly(best.poly, best.x, best.y)) return { lon: best.x, lat: best.y };
  // Schwerpunkt liegt ausserhalb (z. B. bei Sicheln): nächstgelegenen Punkt im Land suchen
  let minX = 999, minY = 999, maxX = -999, maxY = -999;
  for (const pt of best.poly[0]) {
    minX = Math.min(minX, pt[0]); maxX = Math.max(maxX, pt[0]);
    minY = Math.min(minY, pt[1]); maxY = Math.max(maxY, pt[1]);
  }
  let found = { lon: best.poly[0][0][0], lat: best.poly[0][0][1] }, bd = Infinity;
  for (let i = 0; i <= 24; i++) for (let j = 0; j <= 24; j++) {
    const x = minX + (maxX - minX) * i / 24, y = minY + (maxY - minY) * j / 24;
    const d = (x - best.x) ** 2 + (y - best.y) ** 2;
    if (d < bd && inPoly(best.poly, x, y)) { bd = d; found = { lon: x, lat: y }; }
  }
  return found;
}

function ringCentroid(r) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < r.length; i++) {
    const p = r[i], q = r[(i + 1) % r.length];
    const f = p[0] * q[1] - q[0] * p[1];
    a += f; cx += (p[0] + q[0]) * f; cy += (p[1] + q[1]) * f;
  }
  a *= 0.5;
  if (Math.abs(a) < 1e-9) return { area: 0, x: r[0][0], y: r[0][1] };
  return { area: Math.abs(a), x: cx / (6 * a), y: cy / (6 * a) };
}

function inPoly(poly, x, y) {
  let inside = false;
  for (const ring of poly) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

function findCountry(lat, lon) {
  if (!geo) return -1;
  for (let i = 0; i < geo.length; i++) {
    const b = geo[i].bbox;
    if (lon < b[0] || lon > b[2] || lat < b[1] || lat > b[3]) continue;
    for (const poly of geo[i].polys) if (inPoly(poly, lon, lat)) return i;
  }
  return -1;
}

/* ---------- Picking: Bildschirm → Breite/Länge -------------------- */

function pickLatLon(mx, my) {
  // Strahl von der Kamera (0,0,camZ) durch den Pixel; Kugel liegt bei (gx,gy,0)
  const ox = -gx, oy = -gy, oz = camZ;
  let dx = (mx - width / 2) / camZ, dy = (my - height / 2) / camZ, dz = -1;
  const len = Math.hypot(dx, dy, dz);
  dx /= len; dy /= len; dz /= len;
  const b = ox * dx + oy * dy + oz * dz;
  const c = ox * ox + oy * oy + oz * oz - R * R;
  const disc = b * b - c;
  if (disc < 0) return null;
  const t = -b - Math.sqrt(disc);
  if (t < 0) return null;
  const px = ox + dx * t, py = oy + dy * t, pz = oz + dz * t;

  // Drehung des Globus rückgängig machen (Modell = Rx(-latC) · Ry(-lonC))
  const rx = -latC, ry = -lonC;
  let ca = Math.cos(-rx), sa = Math.sin(-rx);
  const y1 = py * ca - pz * sa, z1 = py * sa + pz * ca;
  ca = Math.cos(-ry); sa = Math.sin(-ry);
  const x2 = px * ca + z1 * sa, z2 = -px * sa + z1 * ca;

  return { lat: Math.asin(Math.max(-1, Math.min(1, -y1 / R))), lon: Math.atan2(x2, z2) };
}

const deg = r => r * 180 / Math.PI;
const rad = d => d * Math.PI / 180;

function countryAt(mx, my) {
  const hit = pickLatLon(mx, my);
  return hit ? findCountry(deg(hit.lat), deg(hit.lon)) : -1;
}

/* ---------- Maus / Touch ----------------------------------------- */

function mousePressed() {
  dragging = true;
  dragDist = 0;
  autoRotate = false;
  flyTo = null;
  hideTooltip();
}

function mouseDragged() {
  if (!dragging) return;
  const dx = mouseX - pmouseX, dy = mouseY - pmouseY;
  dragDist += Math.abs(dx) + Math.abs(dy);
  const k = 1 / R;
  lonC -= dx * k;
  latC = Math.max(-1.45, Math.min(1.45, latC + dy * k));
  document.body.style.cursor = 'grabbing';
}

function mouseReleased() {
  if (dragging && dragDist < 6) {
    const idx = countryAt(mouseX, mouseY);
    if (idx >= 0) selectCountry(idx);
  }
  dragging = false;
  document.body.style.cursor = 'grab';
}

function mouseMoved() {
  const idx = countryAt(mouseX, mouseY);
  document.body.style.cursor = idx >= 0 ? 'pointer' : 'grab';
  if (idx >= 0) showTooltip(geo[idx]); else hideTooltip();
}

function mouseWheel(event) {
  zoomT = Math.max(0.8, Math.min(2.0, zoomT * (event.delta > 0 ? 0.92 : 1.08)));
  return false;
}

function keyPressed() {
  if (keyCode === ESCAPE) clearSelection();
  else if (keyCode === RIGHT_ARROW) goTip(1);
  else if (keyCode === LEFT_ARROW) goTip(-1);
}

/* ---------- Auswahl ---------------------------------------------- */

function selectCountry(idx) {
  selIdx = idx;
  const c = geo[idx];
  paintTexture();
  refreshTexture();

  heap = c.data ? buildHeap(c) : null;
  selStart = millis();

  // Blick so drehen, dass das Land etwas oberhalb der Mitte liegt – dann sieht man den Berg im Profil
  flyTo = {
    lon: rad(c.centroid.lon),
    lat: Math.max(-1.2, Math.min(1.2, rad(c.centroid.lat) - rad(32))),
  };
  zoomT = Math.max(zoomT, 1.25);
  updatePanel(c);
  goTip(1);
}

function clearSelection() {
  selIdx = -1;
  heap = null;
  paintTexture();
  refreshTexture();
  showEmpty();
}

/* ---------- Müllberg --------------------------------------------- */

const PAL = {
  soil:  ['#3b2f26', '#4a3a2d', '#2f2822', '#554434', '#40342a'],
  dull:  ['#5d5349', '#6f675d', '#58616a', '#7b6a55', '#8b8378', '#4d5660'],
  vivid: ['#2f7fc1', '#d1453b', '#e0b93a', '#3f9b5a', '#d97b2a', '#9b59b6', '#2bb3b1', '#e66f9a'],
  light: ['#e8e4d8', '#cfd3d6', '#f0ead6', '#b9c4cc', '#dcd2b8'],
};

function hexToRgb(h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}

// Höhenprofil des Berges: rho = 0 (Spitze) … 1 (Fuss), danach flacher Platz
function heapProfile(rho, a) {
  if (rho >= 1) return 0;
  const nx = Math.cos(a), ny = Math.sin(a);
  const sm = Math.min(1, rho * 4);                       // Spitze bleibt für alle Winkel gleich hoch
  const ridge = noise(nx * 1.2 + 7, ny * 1.2 + 7, rho * 2.0);
  const bump = noise(nx * 3.5 + 30, ny * 3.5 + 30, rho * 5.5);
  const v = Math.pow(1 - rho, 1.3) * (1 + (ridge - 0.5) * 1.5 * sm) + (bump - 0.5) * 0.22 * sm * (1 - rho);
  return Math.max(0, v);
}

function buildHeap(c) {
  let seed = 7;
  for (const ch of c.id) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  noiseSeed(seed);
  randomSeed(seed);

  // Höhe und Breite wachsen mit der Müllmenge (alles relativ zum Globus-Radius)
  const hRel = Math.max(0.07, Math.min(0.64, 0.62 * Math.sqrt(c.data.mt / 270)));
  const baseRel = 0.075 + 0.42 * hRel;

  // Lokales System am Landesmittelpunkt: n = oben, e = Osten, t = Norden
  const phi = rad(c.centroid.lat), lam = rad(c.centroid.lon);
  const n = [Math.cos(phi) * Math.sin(lam), -Math.sin(phi), Math.cos(phi) * Math.cos(lam)];
  const e = [Math.cos(lam), 0, -Math.sin(lam)];
  const t = [-Math.sin(phi) * Math.sin(lam), -Math.cos(phi), -Math.sin(phi) * Math.cos(lam)];

  const surf = (dx, dy, out, o) => {
    const x = n[0] + e[0] * dx + t[0] * dy, y = n[1] + e[1] * dx + t[1] * dy, z = n[2] + e[2] * dx + t[2] * dy;
    const l = Math.hypot(x, y, z);
    out[o] = x / l; out[o + 1] = y / l; out[o + 2] = z / l;
  };

  // Gitter: Ringe von der Spitze (rho 0) bis über den Fuss hinaus (Erdplatte bis rho 1.2)
  const NR = 26, NS = 56, RHO_MAX = 1.2;
  const rhoOf = i => i / NR * RHO_MAX;
  const nv = (NR + 1) * NS;
  const s = new Float32Array(nv * 3), h = new Float32Array(nv);
  for (let i = 0; i <= NR; i++) {
    const rho = rhoOf(i);
    for (let j = 0; j < NS; j++) {
      const a = 2 * Math.PI * j / NS, k = i * NS + j;
      surf(Math.cos(a) * rho * baseRel, Math.sin(a) * rho * baseRel, s, k * 3);
      h[k] = hRel * heapProfile(rho, a);
    }
  }

  // Dreiecke und Farben: unten Erde und Organisches, in der Mitte grauer Mix, oben buntes Plastik und Papier
  const pick = arr => hexToRgb(random(arr));
  const tris = [], cols = [];
  for (let i = 0; i < NR; i++) {
    for (let j = 0; j < NS; j++) {
      const j2 = (j + 1) % NS;
      const v00 = i * NS + j, v10 = (i + 1) * NS + j, v11 = (i + 1) * NS + j2, v01 = i * NS + j2;
      const rhoM = (rhoOf(i) + rhoOf(i + 1)) / 2, aM = 2 * Math.PI * (j + 0.5) / NS;
      const hf = Math.min(1, heapProfile(rhoM, aM));
      const patch = noise(Math.cos(aM) * 3 + 50, Math.sin(aM) * 3 + 50, rhoM * 5);
      for (let q = 0; q < (i > 0 ? 2 : 1); q++) {
        const r = random();
        let col;
        if (rhoM >= 1 || hf < 0.08) col = pick(PAL.soil);
        else if (hf < 0.28) col = pick(r < 0.55 ? PAL.soil : PAL.dull);
        else if (hf < 0.62) col = pick(patch > 0.5 ? (r < 0.55 ? PAL.vivid : PAL.dull) : (r < 0.18 ? PAL.vivid : PAL.dull));
        else col = pick(r < 0.5 ? PAL.vivid : PAL.light);
        const shade = rhoM >= 1 ? 0.8 : 0.82 + 0.3 * hf;
        cols.push(col[0] * shade, col[1] * shade, col[2] * shade);
        if (q === 0) tris.push(v00, v10, v11); else tris.push(v00, v11, v01);
      }
    }
  }

  // Einzelne Müllteile auf dem Berg
  const items = [];
  const count = 44 + Math.floor(hRel * 120);
  for (let k = 0; k < count; k++) {
    const rho = 0.03 + 1.0 * Math.pow(random(), 0.85), a = random(2 * Math.PI);
    const pos = [0, 0, 0];
    surf(Math.cos(a) * rho * baseRel, Math.sin(a) * rho * baseRel, pos, 0);
    const type = Math.floor(random(5));       // 0 Karton, 1 Dose, 2 Sack, 3 Reifen, 4 Flasche
    items.push({
      s: pos, h: hRel * heapProfile(rho, a), type,
      size: (0.012 + 0.022 * random()) * (0.8 + hRel),
      rx: random(6.28), ry: random(6.28), rz: random(6.28),
      col: type === 3 ? [34, 34, 38] : hexToRgb(random(random() < 0.85 ? PAL.vivid.concat(PAL.light) : PAL.dull)),
    });
  }

  return {
    t0: millis(), nv, NS, s, h, hRel, n, e, t,
    tris: Int32Array.from(tris), cols: Float32Array.from(cols),
    px: new Float32Array(nv * 3), vn: new Float32Array(nv * 3), items,
  };
}

function drawHeap() {
  if (!heap) return;
  const p = Math.max(0, Math.min(1, (millis() - heap.t0) / 1600));
  const c1 = 1.70158, c3 = c1 + 1;
  const grow = p >= 1 ? 1 : 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);   // wächst mit leichtem Überschwingen

  const { s, h, px, vn, nv, NS } = heap;
  const T = heap.tris, C = heap.cols;
  for (let k = 0; k < nv; k++) {
    const sc = R * (1.003 + h[k] * grow);
    px[k * 3] = s[k * 3] * sc; px[k * 3 + 1] = s[k * 3 + 1] * sc; px[k * 3 + 2] = s[k * 3 + 2] * sc;
  }

  // weiche Normalen: Flächennormalen auf die Eckpunkte verteilen
  vn.fill(0);
  for (let f = 0; f < T.length; f += 3) {
    const a = T[f] * 3, b = T[f + 1] * 3, c = T[f + 2] * 3;
    const ux = px[b] - px[a], uy = px[b + 1] - px[a + 1], uz = px[b + 2] - px[a + 2];
    const vx = px[c] - px[a], vy = px[c + 1] - px[a + 1], vz = px[c + 2] - px[a + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    if (nx * px[a] + ny * px[a + 1] + nz * px[a + 2] < 0) { nx = -nx; ny = -ny; nz = -nz; }
    for (const q of [a, b, c]) { vn[q] += nx; vn[q + 1] += ny; vn[q + 2] += nz; }
  }
  let sx = 0, sy = 0, sz = 0;                       // Spitze: alle Kopien des Mittelpunkts teilen eine Normale
  for (let j = 0; j < NS; j++) { sx += vn[j * 3]; sy += vn[j * 3 + 1]; sz += vn[j * 3 + 2]; }
  for (let j = 0; j < NS; j++) { vn[j * 3] = sx; vn[j * 3 + 1] = sy; vn[j * 3 + 2] = sz; }
  for (let k = 0; k < nv; k++) {
    const l = Math.hypot(vn[k * 3], vn[k * 3 + 1], vn[k * 3 + 2]) || 1;
    vn[k * 3] /= l; vn[k * 3 + 1] /= l; vn[k * 3 + 2] /= l;
  }

  noStroke();
  beginShape(TRIANGLES);
  for (let f = 0; f < T.length; f += 3) {
    fill(C[f], C[f + 1], C[f + 2]);
    for (let q = 0; q < 3; q++) {
      const v = T[f + q] * 3;
      normal(vn[v], vn[v + 1], vn[v + 2]);
      vertex(px[v], px[v + 1], px[v + 2]);
    }
  }
  endShape();

  // Müllteile
  for (const it of heap.items) {
    const sz = it.size * R;
    const sc = R * (1.003 + it.h * grow) + sz * 0.2;
    push();
    translate(it.s[0] * sc, it.s[1] * sc, it.s[2] * sc);
    rotateX(it.rx); rotateY(it.ry); rotateZ(it.rz);
    fill(it.col[0], it.col[1], it.col[2]);
    if (it.type === 0) box(sz, sz * 0.7, sz * 0.5);
    else if (it.type === 1) cylinder(sz * 0.32, sz * 0.9, 8, 1);
    else if (it.type === 2) { scale(1, 0.55, 0.8); sphere(sz * 0.55, 7, 5); }
    else if (it.type === 3) torus(sz * 0.5, sz * 0.2, 10, 6);
    else { cylinder(sz * 0.26, sz * 1.0, 8, 1); translate(0, -sz * 0.65, 0); cylinder(sz * 0.11, sz * 0.4, 6, 1); }
    pop();
  }

  // Fliegen kreisen um die Spitze
  const tt = millis() / 1000;
  fill(20, 20, 20);
  for (let k = 0; k < 10; k++) {
    const ang = tt * (1.6 + k * 0.23) + k * 1.9, rr = R * (0.035 + 0.012 * (k % 3));
    const up = R * (1.003 + heap.hRel * grow + 0.05 + 0.02 * Math.sin(tt * 3 + k));
    const cx = Math.cos(ang) * rr, cy = Math.sin(ang * 1.3) * rr;
    push();
    translate(
      heap.n[0] * up + heap.e[0] * cx + heap.t[0] * cy,
      heap.n[1] * up + heap.e[1] * cx + heap.t[1] * cy,
      heap.n[2] * up + heap.e[2] * cx + heap.t[2] * cy
    );
    sphere(R * 0.006, 4, 3);
    pop();
  }
}

/* ---------- HUD (HTML-Overlay) ------------------------------------ */

function injectStyles() {
  const SERIF = '"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif';
  const SANS = '"Avenir Next","Segoe UI",system-ui,-apple-system,sans-serif';
  const css = `
  html,body{background:#050c15;}
  canvas{display:block;touch-action:none;}
  body{cursor:grab;}
  .hud{position:fixed;z-index:5;pointer-events:none;color:#e9eff7;font-family:${SANS};}
  .halo{position:fixed;z-index:-1;pointer-events:none;border-radius:50%;}

  .title{left:28px;top:22px;max-width:340px;}
  .title h1{margin:0;font:600 28px/1.1 ${SERIF};letter-spacing:.2px;}
  .title p{margin:6px 0 18px;color:#93a4b8;font-size:13.5px;line-height:1.4;}
  .legend{position:relative;width:230px;}
  .legend .bar{height:8px;border-radius:4px;
       background:linear-gradient(90deg,hsl(120 50% 41%),hsl(60 50% 41%),hsl(0 50% 41%));}
  .legend .lab{display:flex;justify-content:space-between;font-size:12px;color:#93a4b8;margin-bottom:6px;}
  .legend .track{position:relative;}
  .legend .note{margin-top:56px;font-size:11.5px;color:#6f8096;}
  .legend .mark{position:absolute;top:100%;margin-top:4px;left:0;transform:translateX(-50%);
       display:flex;flex-direction:column;align-items:center;opacity:0;
       transition:left .7s cubic-bezier(.2,.8,.2,1),opacity .4s;}
  .legend .mark.on{opacity:1;}
  .legend .mark span{white-space:nowrap;font-size:12.5px;font-weight:600;color:#fff;background:rgba(8,18,32,.85);
       border:1px solid rgba(180,205,235,.3);border-radius:7px;padding:3px 8px;}
  .legend .mark i{width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;
       border-bottom:7px solid #fff;margin-bottom:2px;}

  .panel{right:4vw;top:50%;transform:translateY(-50%);width:min(380px,38vw);min-width:290px;
       padding:20px 22px 18px;border-radius:14px;border-left:5px solid #3b4a5d;
       background:rgba(8,18,32,.76);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
       box-shadow:0 18px 50px rgba(0,0,0,.35);transition:border-color .4s;}
  .panel .name{font:600 25px/1.15 ${SERIF};margin:0 0 14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
  .panel .badge{font:600 11.5px ${SANS};color:#ffb84d;border:1px solid rgba(255,184,77,.5);border-radius:20px;padding:2px 9px;}
  .stats{display:grid;grid-template-columns:1.15fr 1fr;gap:12px;}
  .stat{padding-top:9px;border-top:3px solid rgba(180,205,235,.25);}
  .stat.pc{border-top-color:var(--c,#78c0ff);}
  .stat b{display:block;font:600 52px/1 ${SERIF};font-variant-numeric:lining-nums;white-space:nowrap;}
  .stat.tot b{font-size:44px;}
  .stat span{display:block;margin-top:6px;font-size:13px;line-height:1.3;color:#b4c3d6;}
  .stat.pc span{color:#e9eff7;font-weight:600;}
  .panel dl{margin:16px 0 0;display:grid;grid-template-columns:auto 1fr;gap:7px 14px;font-size:13.5px;}
  .panel dt{color:#93a4b8;}
  .panel dd{margin:0;text-align:right;}
  .panel .live{margin-top:15px;padding-top:12px;border-top:1px solid rgba(180,205,235,.16);font-size:13px;color:#b4c3d6;}
  .panel .live b{color:#ffb84d;font-variant-numeric:tabular-nums;}
  .panel .hint{font-size:14.5px;line-height:1.5;color:#b4c3d6;margin:0;}
  .panel .fine{margin-top:12px;font-size:11.5px;line-height:1.4;color:#6f8096;}

  .tip{left:0;right:0;bottom:0;pointer-events:auto;--c:#7bd88f;
       background:rgba(5,12,22,.9);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
       border-top:1px solid rgba(180,205,235,.18);padding:22px 4vw 26px;}
  .tip .prog{position:absolute;left:0;top:-1px;height:3px;width:100%;}
  .tip .prog i{display:block;height:100%;width:0;background:var(--c);}
  .tip .in{max-width:1180px;margin:0 auto;display:flex;align-items:center;gap:20px;}
  .tip .body{flex:1;min-width:0;transition:opacity .22s,transform .22s;}
  .tip .body.out{opacity:0;transform:translateY(8px);}
  .tip .head{display:flex;align-items:center;gap:10px;margin-bottom:8px;font-size:15px;font-weight:700;color:var(--c);}
  .tip .head i{width:11px;height:11px;border-radius:50%;background:var(--c);display:inline-block;}
  .tip .head em{font-style:normal;font-weight:500;color:#6f8096;margin-left:4px;font-size:13px;}
  .tip .txt{font:500 clamp(18px,1.7vw,24px)/1.4 ${SANS};color:#f2f6fb;cursor:pointer;}
  .tip button{flex:none;width:46px;height:46px;border-radius:50%;border:1px solid rgba(180,205,235,.3);
       background:rgba(180,205,235,.08);color:#e9eff7;font-size:26px;line-height:1;cursor:pointer;
       display:flex;align-items:center;justify-content:center;padding:0 0 3px;transition:background .2s;}
  .tip button:hover{background:rgba(180,205,235,.22);}
  .tip button:focus-visible{outline:2px solid var(--c);outline-offset:2px;}
  @keyframes tipprog{from{width:0}to{width:100%}}

  .tt{position:fixed;z-index:6;pointer-events:none;display:none;padding:6px 10px;border-radius:8px;
       background:rgba(8,18,32,.9);color:#e9eff7;font:13px/1.3 ${SANS};
       border:1px solid rgba(180,205,235,.2);white-space:nowrap;}
  .tt small{color:#93a4b8;margin-left:6px;}

  @media (max-width:820px){
    .title{left:16px;top:12px;}
    .title h1{font-size:22px;}
    .title p{display:none;}
    .legend{display:none;}
    .panel{top:56px;right:12px;left:12px;transform:none;width:auto;min-width:0;padding:12px 14px;}
    .stat b{font-size:34px;} .stat.tot b{font-size:30px;}
    .panel dl{display:none;}
    .tip{padding:16px 14px 18px;}
    .tip .in{gap:10px;}
    .tip button{width:38px;height:38px;font-size:22px;}
    .tip .txt{font-size:16px;}
  }
  @media (prefers-reduced-motion:reduce){.tip .body,.panel,.legend .mark{transition:none;}}
  `;
  const el = document.createElement('style');
  el.textContent = css;
  document.head.appendChild(el);
}

function mk(cls, html) {
  const d = document.createElement('div');
  d.className = cls;
  d.innerHTML = html;
  document.body.appendChild(d);
  return d;
}

function buildUI() {
  // weicher Lichtschein hinter dem Globus: viele Stufen mit ausklingender Deckkraft
  ui.halo = mk('halo', '');
  const stops = [];
  for (let i = 0; i <= 24; i++) {
    const r = i / 24 * 2;                                   // Abstand in Globus-Radien
    const a = r < 1 ? 0 : 0.40 * Math.pow(1 - (r - 1), 3);  // sanft ausklingend
    stops.push('rgba(110,180,255,' + a.toFixed(3) + ') ' + (r / 2 * 100).toFixed(1) + '%');
  }
  ui.halo.style.background = 'radial-gradient(circle closest-side,' + stops.join(',') + ')';

  const title = mk('hud title',
    '<h1>Müll-Globus</h1>' +
    '<p>Ziehen zum Drehen, Mausrad zum Zoomen. Klicke auf ein Land, dann wächst sein Müllberg aus dem Boden.</p>' +
    '<div class="legend">' +
    '<div class="lab"><span>wenig</span><span>Müll pro Kopf</span><span>viel</span></div>' +
    '<div class="track"><div class="bar"></div>' +
    '<div class="mark"><i></i><span></span></div></div>' +
    '<div class="note">Blasse Farbe = Schätzwert, grau = keine Daten</div></div>');
  ui.mark = title.querySelector('.mark');
  ui.markTxt = ui.mark.querySelector('span');

  ui.panel = mk('hud panel', '');
  ui.tip = mk('hud tip',
    '<div class="prog"><i></i></div>' +
    '<div class="in">' +
    '<button type="button" class="prev" aria-label="Vorheriger Tipp">‹</button>' +
    '<div class="body"><div class="head"><i></i><span class="tag"></span><em class="cnt"></em></div>' +
    '<div class="txt" title="Klicken für den nächsten Tipp"></div></div>' +
    '<button type="button" class="next" aria-label="Nächster Tipp">›</button>' +
    '</div>');
  ui.tt = mk('tt', '');
  ui.body = ui.tip.querySelector('.body');
  ui.progI = ui.tip.querySelector('.prog i');

  // Klicks auf die Tipp-Leiste sollen den Globus nicht auslösen
  const swallow = e => e.stopPropagation();
  ui.tip.addEventListener('mousedown', swallow);
  ui.tip.addEventListener('touchstart', swallow, { passive: true });
  ui.tip.querySelector('.prev').addEventListener('click', () => goTip(-1));
  ui.tip.querySelector('.next').addEventListener('click', () => goTip(1));
  ui.tip.querySelector('.txt').addEventListener('click', () => goTip(1));

  showEmpty('Weltkarte wird geladen …');
}

function updateHalo() {
  const key = Math.round(R) + '|' + width + '|' + height;
  if (key === ui.haloKey) return;
  ui.haloKey = key;
  const s = 4 * R;
  ui.halo.style.width = ui.halo.style.height = s + 'px';
  ui.halo.style.left = (width / 2 + gx - s / 2) + 'px';
  ui.halo.style.top = (height / 2 + gy - s / 2) + 'px';
}

const fmt = (n, d) => n.toLocaleString('de-CH', { maximumFractionDigits: d === undefined ? 0 : d });
const fmtMt = mt => fmt(mt, mt >= 10 ? 0 : mt >= 1 ? 1 : 2);
const fmtPop = p => fmt(p, p >= 10 ? 0 : p >= 1 ? 1 : 2);

function setMarker(kg, label) {
  if (kg === null) { ui.mark.classList.remove('on'); return; }
  const pct = 100 * intensity(kg);
  ui.mark.style.left = pct + '%';
  ui.markTxt.textContent = label;
  ui.mark.classList.add('on');
}

function showEmpty(msg) {
  ui.panel.style.borderLeftColor = '#3b4a5d';
  ui.panel.innerHTML =
    '<p class="hint">' + (msg || 'Wähle ein Land auf dem Globus. Du siehst dann, wie viel Siedlungsabfall dort jedes Jahr anfällt, insgesamt und pro Person.') + '</p>' +
    (msg ? '' : '<p class="fine">Farbe = Müll pro Kopf. Mengen sind gerundete Näherungswerte (Grössenordnung nach World Bank «What a Waste 2.0»); Länder ohne Messwert sind geschätzt.</p>');
  ui.live = null;
  setMarker(null);
}

function updatePanel(c) {
  if (!c.data) {
    ui.panel.style.borderLeftColor = '#3b4a5d';
    ui.panel.innerHTML = '<div class="name">' + c.name + '</div>' +
      '<p class="hint">' + (c.id === 'ATA'
        ? 'In der Antarktis lebt keine ständige Bevölkerung, darum gibt es keine Müllstatistik, nur Forschungsstationen.'
        : 'Für dieses Gebiet gibt es weder Messwert noch Schätzung, darum wächst hier kein Berg.') + '</p>';
    ui.live = null;
    setMarker(null);
    return;
  }
  const d = c.data;
  const perSec = d.mt * 1e6 / (365 * 86400);
  const color = 'hsl(' + hueOf(d.kg) + ' 62% 52%)';
  const approx = d.est ? '≈ ' : '';
  ui.panel.style.borderLeftColor = color;
  ui.panel.innerHTML =
    '<div class="name">' + c.name + (d.est ? '<span class="badge">Schätzwert</span>' : '') + '</div>' +
    '<div class="stats">' +
    '<div class="stat pc" style="--c:' + color + '"><b>' + approx + fmt(d.kg) + '</b><span>kg Müll pro Person<br>und Jahr</span></div>' +
    '<div class="stat tot"><b>' + approx + fmtMt(d.mt) + '</b><span>Mio. Tonnen<br>insgesamt pro Jahr</span></div>' +
    '</div>' +
    '<dl>' +
    '<dt>Bevölkerung</dt><dd>' + approx + fmtPop(d.pop) + ' Mio. Einwohner</dd>' +
    '<dt>Pro Person und Tag</dt><dd>' + fmt(d.kg / 365, 1) + ' kg</dd>' +
    '<dt>Pro Sekunde</dt><dd>' + fmt(perSec, perSec >= 1 ? 1 : 2) + ' Tonnen</dd>' +
    '<dt>Entspricht</dt><dd>' + fmt(d.mt * 1e6 / 10100) + ' Eiffeltürmen im Jahr</dd>' +
    '<dt>Rang gesamt</dt><dd>' + (rankTotal.indexOf(c.id) + 1) + ' von ' + rankTotal.length + '</dd>' +
    '<dt>Rang pro Kopf</dt><dd>' + (rankPC.indexOf(c.id) + 1) + ' von ' + rankPC.length + '</dd>' +
    '</dl>' +
    '<div class="live">Seit deiner Auswahl: <b id="liveNum">0</b> Tonnen mehr</div>' +
    (d.est ? '<div class="fine">Für dieses Land liegt kein Messwert vor: Einwohnerzahl und Müll pro Kopf sind grob aus Region und Wirtschaftsniveau geschätzt.</div>' : '');
  ui.live = { el: ui.panel.querySelector('#liveNum'), perSec, last: '' };
  setMarker(d.kg, c.name + ' · ' + approx + fmt(d.kg) + ' kg');
}

function tickUI() {
  if (!ui.live) return;
  const v = fmt(ui.live.perSec * (millis() - selStart) / 1000, 1);
  if (v !== ui.live.last) { ui.live.el.textContent = v; ui.live.last = v; }
}

function showTooltip(c) {
  ui.tt.innerHTML = c.name + (c.data ? '<small>' + (c.data.est ? '≈ ' : '') + fmt(c.data.kg) + ' kg pro Kopf</small>' : '');
  ui.tt.style.display = 'block';
  ui.tt.style.left = (mouseX + 16) + 'px';
  ui.tt.style.top = (mouseY + 16) + 'px';
}

function hideTooltip() {
  if (ui.tt) ui.tt.style.display = 'none';
}

/* ---------- Tipps unten ------------------------------------------ */

// delta: +1 nächster, -1 vorheriger, 0 aktueller Tipp. Wechselt automatisch alle TIP_MS Millisekunden.
function goTip(delta) {
  if (!ui.body) return;
  clearTimeout(tipTimer);
  tipIdx = (tipIdx + delta + TIPS.length) % TIPS.length;
  const tip = TIPS[tipIdx], token = ++tipToken;
  const color = TAG_COLORS[tip.tag] || '#fff';
  const apply = () => {
    if (token !== tipToken) return;
    ui.tip.style.setProperty('--c', color);
    ui.tip.querySelector('.tag').textContent = tip.tag;
    ui.tip.querySelector('.cnt').textContent = (tipIdx + 1) + ' / ' + TIPS.length;
    ui.tip.querySelector('.txt').textContent = tip.text;
    ui.body.classList.remove('out');
    ui.progI.style.animation = 'none';
    void ui.progI.offsetWidth;                                 // Animation neu starten
    ui.progI.style.animation = 'tipprog ' + TIP_MS + 'ms linear forwards';
  };
  if (!ui.tipReady) { ui.tipReady = true; apply(); }
  else { ui.body.classList.add('out'); setTimeout(apply, 200); }
  tipTimer = setTimeout(() => goTip(1), TIP_MS);
}

/* ---------- Hintergrund (Verlauf + Sterne) ------------------------ */

function makeBackdrop() {
  const c = document.createElement('canvas');
  c.width = windowWidth; c.height = windowHeight;
  const g = c.getContext('2d');
  const cx = windowWidth / 2 + gx, cy = windowHeight / 2 + gy;
  const far = Math.max(windowWidth, windowHeight);

  const bg = g.createRadialGradient(cx, cy, 0, cx, cy, far * 0.85);
  bg.addColorStop(0, '#102743'); bg.addColorStop(0.35, '#0b1c33');
  bg.addColorStop(0.7, '#060f1d'); bg.addColorStop(1, '#030710');
  g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height);

  for (let i = 0; i < 260; i++) {
    const x = Math.random() * c.width, y = Math.random() * c.height, s = Math.random() * 1.3 + 0.2;
    g.fillStyle = 'rgba(255,255,255,' + (0.25 + Math.random() * 0.6) + ')';
    g.beginPath(); g.arc(x, y, s, 0, 6.283); g.fill();
  }
  document.body.style.backgroundImage = 'url(' + c.toDataURL('image/jpeg', 0.9) + ')';
  document.body.style.backgroundSize = 'cover';
}
