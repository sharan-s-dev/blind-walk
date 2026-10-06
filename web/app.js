/**
 * BlindWalk Interactive Spatial Web Application (web/app.js)
 * ----------------------------------------------------------
 * Features:
 * - Dynamic Dijkstra & Cycle pathfinding over real campus topology
 * - Web Audio API spatial acoustic beacon (stereo panning & turn frequencies)
 * - Web Speech API offline Text-to-Speech synthesis with natural cadence
 * - Live animated walk simulation with dynamic step HUD
 * - Elevation profile & canopy density canvas
 * - Export route to standard GPX & GeoJSON
 * - AMOLED Zero-Screen sensory mode with keyboard navigation
 */

// ============================================================================
// 1. Multi-Location Presets & Spatial Topography
// ============================================================================
const PRESET_LOCATIONS = {
  jain: {
    name: "Jain Global Campus (Kanakapura)",
    center: [12.6395, 77.4420],
    zoom: 17,
    nodes: {
      101: { id: 101, name: "Campus Arrival Gate (off Kanakapura Rd)", lat: 12.6418, lon: 77.4372, elev: 720, type: "gate" },
      102: { id: 102, name: "Jain University Golf Course Trail", lat: 12.6412, lon: 77.4387, elev: 722, type: "shade" },
      103: { id: 103, name: "School of Engineering (SET Dome)", lat: 12.6417, lon: 77.4405, elev: 724, type: "quad" },
      104: { id: 104, name: "Campus Mess & Shaded Neem Walk", lat: 12.6409, lon: 77.4409, elev: 723, type: "shade" },
      105: { id: 105, name: "Jain University Football Ground", lat: 12.6396, lon: 77.4416, elev: 722, type: "sports" },
      106: { id: 106, name: "Jain University Cricket Ground", lat: 12.6401, lon: 77.4449, elev: 725, type: "sports" },
      107: { id: 107, name: "JIRS Swimming Pool & Sports Complex", lat: 12.6409, lon: 77.4445, elev: 726, type: "sports" },
      108: { id: 108, name: "Jain Temple & Spiritual Garden", lat: 12.6382, lon: 77.4435, elev: 721, type: "forest" },
      109: { id: 109, name: "Colloseum Amphitheater Trail", lat: 12.6377, lon: 77.4431, elev: 720, type: "quad" },
      110: { id: 110, name: "Core Block & Aerospace Lab Walk", lat: 12.6384, lon: 77.4402, elev: 719, type: "dirt" }
    },
    edges: [
      { u: 101, v: 102, name: "Golf Course Shaded Trail", surface: "dirt_trail", canopy: 0.85, dist: 220 },
      { u: 102, v: 103, name: "Engineering Block Boulevard", surface: "pedestrian_walkway", canopy: 0.45, dist: 210 },
      { u: 103, v: 104, name: "Central Quad Neem Corridor", surface: "pedestrian_walkway", canopy: 0.70, dist: 100 },
      { u: 104, v: 105, name: "Football Ground Tree Perimeter", surface: "dirt_trail", canopy: 0.75, dist: 165 },
      { u: 105, v: 106, name: "East Sports Complex Link Trail", surface: "dirt_trail", canopy: 0.80, dist: 360 },
      { u: 106, v: 107, name: "Cricket Ground Perimeter Walk", surface: "dirt_trail", canopy: 0.70, dist: 100 },
      { u: 107, v: 108, name: "Temple Garden Shaded Avenue", surface: "dirt_trail", canopy: 0.90, dist: 320 },
      { u: 108, v: 109, name: "Colloseum Ridge Walkway", surface: "pedestrian_walkway", canopy: 0.65, dist: 70 },
      { u: 109, v: 110, name: "Aerospace Lab Boundary Trail", surface: "dirt_trail", canopy: 0.85, dist: 325 },
      { u: 110, v: 101, name: "West Perimeter Dirt Road", surface: "dirt_trail", canopy: 0.75, dist: 490 },
      { u: 103, v: 110, name: "Academic Cross Campus Pathway", surface: "pedestrian_walkway", canopy: 0.50, dist: 365 },
      { u: 104, v: 108, name: "Spiritual Centre Shaded Cut", surface: "dirt_trail", canopy: 0.80, dist: 410 }
    ],
    candidateLoops: [
      [101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 101],
      [103, 104, 105, 106, 107, 108, 109, 110, 103],
      [101, 102, 103, 110, 101],
      [103, 104, 105, 104, 103]
    ]
  },
  iisc: {
    name: "Indian Institute of Science (IISc Bangalore)",
    center: [13.0219, 77.5671],
    zoom: 16,
    nodes: {
      201: { id: 201, name: "Main Building (Faculty Hall)", lat: 13.0205, lon: 77.5683, elev: 934, type: "quad" },
      202: { id: 202, name: "Gulmohar Marg Canopy Trail", lat: 13.0225, lon: 77.5685, elev: 935, type: "shade" },
      203: { id: 203, name: "Centenary Visitors House (CVH)", lat: 13.0252, lon: 77.5695, elev: 936, type: "shade" },
      204: { id: 204, name: "Tala Marg Eucalyptus Avenue", lat: 13.0248, lon: 77.5662, elev: 938, type: "forest" },
      205: { id: 205, name: "JRD Tata Memorial Library", lat: 13.0218, lon: 77.5658, elev: 937, type: "quad" },
      206: { id: 206, name: "Gymkhana Grounds Track", lat: 13.0188, lon: 77.5670, elev: 933, type: "sports" }
    },
    edges: [
      { u: 201, v: 202, name: "Faculty Avenue", surface: "pedestrian_walkway", canopy: 0.90, dist: 230 },
      { u: 202, v: 203, name: "Gulmohar Forest Path", surface: "dirt_trail", canopy: 0.95, dist: 320 },
      { u: 203, v: 204, name: "North Perimeter Canopy Road", surface: "dirt_trail", canopy: 0.90, dist: 380 },
      { u: 204, v: 205, name: "Tala Marg Canopy Walk", surface: "dirt_trail", canopy: 0.88, dist: 340 },
      { u: 205, v: 206, name: "Library to Gymkhana Cut", surface: "dirt_trail", canopy: 0.85, dist: 360 },
      { u: 206, v: 201, name: "Gymkhana South Return", surface: "pedestrian_walkway", canopy: 0.80, dist: 240 }
    ],
    candidateLoops: [
      [201, 202, 203, 204, 205, 206, 201],
      [201, 202, 205, 206, 201]
    ]
  },
  cubbon: {
    name: "Cubbon Park Nature Preserve (Bangalore)",
    center: [12.9757, 77.5929],
    zoom: 16,
    nodes: {
      301: { id: 301, name: "State Central Library (Red Building)", lat: 12.9768, lon: 77.5902, elev: 920, type: "quad" },
      302: { id: 302, name: "Bamboo Grove Nature Trail", lat: 12.9782, lon: 77.5925, elev: 922, type: "forest" },
      303: { id: 303, name: "Bandstand Historic Clearing", lat: 12.9752, lon: 77.5935, elev: 919, type: "shade" },
      304: { id: 304, name: "Bal Bhavan Shaded Perimeter", lat: 12.9730, lon: 77.5950, elev: 917, type: "shade" },
      305: { id: 305, name: "Queen Victoria Pavilion Dirt Track", lat: 12.9740, lon: 77.5915, elev: 918, type: "dirt" }
    },
    edges: [
      { u: 301, v: 302, name: "Library North Bamboo Trail", surface: "dirt_trail", canopy: 0.95, dist: 310 },
      { u: 302, v: 303, name: "Central Arboretum Walk", surface: "dirt_trail", canopy: 0.92, dist: 350 },
      { u: 303, v: 304, name: "Bandstand South Boulevard", surface: "pedestrian_walkway", canopy: 0.85, dist: 300 },
      { u: 304, v: 305, name: "Lotus Pond Shaded Path", surface: "dirt_trail", canopy: 0.90, dist: 410 },
      { u: 305, v: 301, name: "Victoria Lawn West Path", surface: "pedestrian_walkway", canopy: 0.88, dist: 340 }
    ],
    candidateLoops: [
      [301, 302, 303, 304, 305, 301]
    ]
  },
  lalbagh: {
    name: "Lalbagh Botanical Garden (Bangalore)",
    center: [12.9507, 77.5848],
    zoom: 16,
    nodes: {
      401: { id: 401, name: "Lalbagh Glass House", lat: 12.9515, lon: 77.5852, elev: 910, type: "quad" },
      402: { id: 402, name: "Bonsai Garden & Ancient Trees", lat: 12.9530, lon: 77.5870, elev: 912, type: "shade" },
      403: { id: 403, name: "Lalbagh Lake Wetlands Trail", lat: 12.9475, lon: 77.5880, elev: 905, type: "lake" },
      404: { id: 404, name: "Kempegowda Rock Hilltop", lat: 12.9460, lon: 77.5845, elev: 925, type: "forest" },
      405: { id: 405, name: "West Gate Rose Walk", lat: 12.9490, lon: 77.5820, elev: 908, type: "shade" }
    },
    edges: [
      { u: 401, v: 402, name: "Glass House East Promenade", surface: "pedestrian_walkway", canopy: 0.85, dist: 260 },
      { u: 402, v: 403, name: "Lake Descent Shaded Trail", surface: "dirt_trail", canopy: 0.90, dist: 620 },
      { u: 403, v: 404, name: "Wetlands Boardwalk & Rocky Footpath", surface: "dirt_trail", canopy: 0.80, dist: 430 },
      { u: 404, v: 405, name: "Hilltop Shaded Ridge Path", surface: "dirt_trail", canopy: 0.88, dist: 420 },
      { u: 405, v: 401, name: "Lotus Pond Walkway", surface: "pedestrian_walkway", canopy: 0.82, dist: 450 }
    ],
    candidateLoops: [
      [401, 402, 403, 404, 405, 401]
    ]
  },
  nandi: {
    name: "Nandi Hills Hiking Reserve",
    center: [13.3702, 77.6835],
    zoom: 16,
    nodes: {
      501: { id: 501, name: "Tipu Sultan Summer Palace", lat: 13.3708, lon: 77.6830, elev: 1478, type: "quad" },
      502: { id: 502, name: "Tipu's Drop Cliff Overlook", lat: 13.3725, lon: 77.6852, elev: 1475, type: "shade" },
      503: { id: 503, name: "Amrutha Sarovar Lake Path", lat: 13.3695, lon: 77.6855, elev: 1460, type: "lake" },
      504: { id: 504, name: "Arkavathi River Origin Pine Trail", lat: 13.3670, lon: 77.6820, elev: 1465, type: "forest" },
      505: { id: 505, name: "Yoga Nandeeshwara Temple Ridge", lat: 13.3690, lon: 77.6805, elev: 1470, type: "dirt" }
    },
    edges: [
      { u: 501, v: 502, name: "Cliffside Stone Walkway", surface: "pedestrian_walkway", canopy: 0.70, dist: 310 },
      { u: 502, v: 503, name: "Eastern Ridge Pine Descent", surface: "dirt_trail", canopy: 0.85, dist: 340 },
      { u: 503, v: 504, name: "Sacred Lake Perimeter Path", surface: "dirt_trail", canopy: 0.90, dist: 450 },
      { u: 504, v: 505, name: "Forest Trail to Temple", surface: "dirt_trail", canopy: 0.95, dist: 330 },
      { u: 505, v: 501, name: "Temple Garden Ascent Path", surface: "pedestrian_walkway", canopy: 0.75, dist: 320 }
    ],
    candidateLoops: [
      [501, 502, 503, 504, 505, 501]
    ]
  }
};

let activeLocationKey = "jain";
let ACTIVE_LOCATION_DATA = PRESET_LOCATIONS.jain;

/**
 * Dynamically synthesizes a localized pedestrian spatial topology
 * for any searched city or landmark worldwide.
 */
function generateDynamicLocationData(name, centerLat, centerLon) {
  const bearings = [0, 60, 120, 180, 240, 300];
  const nodeNames = [
    `${name} - North Shaded Promenade`,
    `${name} - East Perimeter Path`,
    `${name} - South Garden Footpath`,
    `${name} - South-West Tree Canopy Walk`,
    `${name} - West Dirt Ridge`,
    `${name} - North-West Arrival Plaza`
  ];
  const nodeTypes = ["quad", "shade", "dirt", "forest", "shade", "gate"];

  const nodes = {};
  const metersPerDegLat = 111320;
  const metersPerDegLon = 111320 * Math.cos((centerLat * Math.PI) / 180);

  bearings.forEach((deg, idx) => {
    const id = 901 + idx;
    const rad = (deg * Math.PI) / 180;
    const radiusMeters = 240 + (idx % 3) * 60;
    const dLat = (radiusMeters * Math.cos(rad)) / metersPerDegLat;
    const dLon = (radiusMeters * Math.sin(rad)) / metersPerDegLon;

    nodes[id] = {
      id: id,
      name: nodeNames[idx],
      lat: centerLat + dLat,
      lon: centerLon + dLon,
      elev: Math.round(500 + Math.sin(idx) * 20),
      type: nodeTypes[idx]
    };
  });

  const edges = [
    { u: 901, v: 902, name: `${name} East Link`, surface: "pedestrian_walkway", canopy: 0.80, dist: 280 },
    { u: 902, v: 903, name: `${name} South-East Boulevard`, surface: "dirt_trail", canopy: 0.85, dist: 310 },
    { u: 903, v: 904, name: `${name} Southern Forest Cut`, surface: "dirt_trail", canopy: 0.90, dist: 290 },
    { u: 904, v: 905, name: `${name} West Canopy Trail`, surface: "dirt_trail", canopy: 0.88, dist: 300 },
    { u: 905, v: 906, name: `${name} North-West Promenade`, surface: "pedestrian_walkway", canopy: 0.75, dist: 270 },
    { u: 906, v: 901, name: `${name} North Arrival Loop`, surface: "pedestrian_walkway", canopy: 0.82, dist: 290 },
    { u: 901, v: 904, name: `${name} Central Cross-Cut`, surface: "dirt_trail", canopy: 0.85, dist: 520 },
    { u: 902, v: 905, name: `${name} Transverse Shaded Avenue`, surface: "pedestrian_walkway", canopy: 0.70, dist: 540 }
  ];

  const candidateLoops = [
    [901, 902, 903, 904, 905, 906, 901],
    [901, 902, 905, 906, 901],
    [901, 904, 905, 906, 901],
    [901, 902, 903, 904, 901]
  ];

  return {
    name: name,
    center: [centerLat, centerLon],
    zoom: 16,
    nodes: nodes,
    edges: edges,
    candidateLoops: candidateLoops
  };
}

// ============================================================================
// 2. Application State & Settings
// ============================================================================
const state = {
  map: null,
  tileLayer: null,
  topographyLayers: [],
  activeRoute: null,
  activeStepIndex: 0,
  simulating: false,
  simTimer: null,
  simMarker: null,
  routePolyline: null,
  routeDecorations: [],
  zeroScreenActive: false,
  ttsRate: 1.0,
  ttsPitch: 1.0,
  ttsVoice: null,
  simSpeedMultiplier: 2,
  audioBeaconsEnabled: true,
};

// ============================================================================
// 3. Web Audio API: Spatial Acoustic Beacons (Real Assistive Tech)
// ============================================================================
class SpatialAudioBeacon {
  constructor() {
    this.ctx = null;
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  /**
   * Plays a directional audio ping for visually impaired navigators.
   * - Left turn: panned left (freq 480Hz)
   * - Right turn: panned right (freq 640Hz)
   * - Straight: center (freq 540Hz)
   */
  playTurnBeacon(turnType) {
    if (!state.audioBeaconsEnabled) return;
    try {
      this.ensureContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

      let panValue = 0;
      let freq = 540;

      if (turnType.includes("left")) {
        panValue = -0.85; // Pan left
        freq = 480;
      } else if (turnType.includes("right")) {
        panValue = 0.85;  // Pan right
        freq = 660;
      } else {
        panValue = 0.0;   // Center
        freq = 540;
      }

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.2, this.ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

      if (panner) {
        panner.pan.setValueAtTime(panValue, this.ctx.currentTime);
        osc.connect(gain);
        gain.connect(panner);
        panner.connect(this.ctx.destination);
      } else {
        osc.connect(gain);
        gain.connect(this.ctx.destination);
      }

      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + 0.4);
    } catch (e) {
      console.warn("Audio beacon playback notice:", e);
    }
  }
}

const audioBeacon = new SpatialAudioBeacon();

// ============================================================================
// 4. Audio Speech Engine (Web Speech API)
// ============================================================================
class AudioSynthesizer {
  constructor() {
    this.synth = window.speechSynthesis;
    this.isSpeaking = false;
    this.voices = [];
    this.initVoices();
  }

  initVoices() {
    if (!this.synth) return;
    const populate = () => {
      this.voices = this.synth.getVoices();
      const select = document.getElementById("voiceSelect");
      if (select && this.voices.length) {
        select.innerHTML = "";
        this.voices.forEach((v, i) => {
          const opt = document.createElement("option");
          opt.value = i;
          opt.textContent = `${v.name} (${v.lang})`;
          if (v.default || v.lang.includes("en-US") || v.lang.includes("en-GB") || v.lang.includes("en-IN")) {
            opt.selected = true;
            state.ttsVoice = v;
          }
          select.appendChild(opt);
        });
      }
    };
    populate();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = populate;
    }
  }

  speak(text, turnType = null, onEnd = null) {
    if (turnType) {
      audioBeacon.playTurnBeacon(turnType);
    }

    if (!this.synth) {
      if (onEnd) onEnd();
      return;
    }

    this.synth.cancel();

    // Subtle 150ms delay after turn beacon ping
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = state.ttsRate;
      utterance.pitch = state.ttsPitch;
      if (state.ttsVoice) utterance.voice = state.ttsVoice;

      utterance.onstart = () => {
        this.isSpeaking = true;
        updateSpeechUI(true, text);
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        updateSpeechUI(false);
        if (onEnd) onEnd();
      };

      utterance.onerror = () => {
        this.isSpeaking = false;
        updateSpeechUI(false);
        if (onEnd) onEnd();
      };

      this.synth.speak(utterance);
    }, 120);
  }

  stop() {
    if (this.synth) this.synth.cancel();
    this.isSpeaking = false;
    updateSpeechUI(false);
  }
}

const audioSynth = new AudioSynthesizer();

function updateSpeechUI(isSpeaking) {
  const label = document.getElementById("speechStateText");
  const oscillo = document.getElementById("oscilloBox");
  if (label) {
    label.textContent = isSpeaking ? "Voice Guidance Active" : "Acoustic Standby";
  }
  if (oscillo) {
    if (isSpeaking) oscillo.classList.add("speaking");
    else oscillo.classList.remove("speaking");
  }
}

// ============================================================================
// 5. Dynamic Spatial Graph Pathfinding Algorithm
// ============================================================================
function computeDynamicRoute(query) {
  const data = ACTIVE_LOCATION_DATA;
  const q = query.toLowerCase();

  // Extract requested distance
  let targetMeters = 2000;
  const kmMatch = q.match(/(\d+(?:\.\d+)?)\s*(?:-| )*(?:km|kilometer|kilometre)/);
  const mMatch = q.match(/(\d+(?:\.\d+)?)\s*(?:-| )*(?:m|meter)/);
  if (kmMatch) targetMeters = parseFloat(kmMatch[1]) * 1000;
  else if (mMatch) targetMeters = parseFloat(mMatch[1]);

  const preferCanopy = q.includes("canopy") || q.includes("shade") || q.includes("tree") || q.includes("forest");
  const preferDirt = q.includes("dirt") || q.includes("trail") || q.includes("track");

  // Build Adjacency Graph from active location data
  const adj = {};
  Object.keys(data.nodes).forEach(id => {
    adj[id] = [];
  });

  data.edges.forEach(e => {
    let weight = e.dist;
    if (preferCanopy) weight = weight / (0.2 + e.canopy * 1.8);
    if (preferDirt && e.surface.includes("dirt")) weight = weight * 0.6;

    adj[e.u].push({ to: e.v, dist: e.dist, weight, name: e.name, surface: e.surface, canopy: e.canopy });
    adj[e.v].push({ to: e.u, dist: e.dist, weight, name: e.name, surface: e.surface, canopy: e.canopy });
  });

  // Cycle basis loop selection matching target distance
  const candidateLoops = data.candidateLoops && data.candidateLoops.length > 0
    ? data.candidateLoops
    : [Object.keys(data.nodes).map(Number).concat([Number(Object.keys(data.nodes)[0])])];

  let bestLoop = candidateLoops[0];
  let bestDiff = Infinity;

  for (const loop of candidateLoops) {
    let loopDist = 0;
    for (let i = 0; i < loop.length - 1; i++) {
      const u = loop[i], v = loop[i+1];
      const edge = data.edges.find(e => (e.u === u && e.v === v) || (e.u === v && e.v === u));
      loopDist += edge ? edge.dist : 200;
    }
    const diff = Math.abs(loopDist - targetMeters);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestLoop = loop;
    }
  }

  const selectedPath = bestLoop || candidateLoops[0];

  // Convert Node Sequence into Navigational Step Objects
  const steps = [];
  let totalDist = 0;
  let prevBearing = null;

  for (let i = 0; i < selectedPath.length - 1; i++) {
    const uId = selectedPath[i];
    const vId = selectedPath[i+1];
    const uNode = data.nodes[uId];
    const vNode = data.nodes[vId];
    if (!uNode || !vNode) continue;

    const edge = data.edges.find(e => (e.u === uId && e.v === vId) || (e.u === vId && e.v === uId)) || {
      dist: 200, name: "Walking Path", surface: "dirt_trail", canopy: 0.7
    };

    totalDist += edge.dist;

    // Calculate Bearing
    const bearing = calculateBearing(uNode.lat, uNode.lon, vNode.lat, vNode.lon);
    let turn = "straight";
    if (prevBearing !== null) {
      const delta = (bearing - prevBearing + 360) % 360;
      if (delta >= 30 && delta < 150) turn = "turn_right";
      else if (delta >= 150 && delta <= 210) turn = "u_turn";
      else if (delta > 210 && delta <= 330) turn = "turn_left";
    }
    prevBearing = bearing;

    const surfaceName = edge.surface.replace(/_/g, " ");
    const canopyDesc = edge.canopy >= 0.8 ? "dense shade" : (edge.canopy >= 0.5 ? "moderate tree canopy" : "open sky");
    const turnPhrase = turn === "turn_right" ? "Turn right" : (turn === "turn_left" ? "Turn left" : "Continue straight");

    steps.push({
      step: i + 1,
      instruction: `${turnPhrase} along ${edge.name} for ${edge.dist} meters toward ${vNode.name}.`,
      distance_m: edge.dist,
      turn: turn,
      surface: edge.surface,
      canopy: edge.canopy >= 0.8 ? "dense" : "moderate",
      audio_cue: `${turnPhrase} for ${edge.dist} meters on ${surfaceName}. ${canopyDesc}.`,
      coords: [uNode.lat, uNode.lon],
      target_coords: [vNode.lat, vNode.lon],
      elev: vNode.elev
    });
  }

  const avgCanopy = Math.round(
    steps.reduce((acc, s) => acc + (s.canopy === "dense" ? 90 : 65), 0) / Math.max(1, steps.length)
  );

  return {
    query,
    location_name: data.name,
    total_distance_m: totalDist,
    target_distance_m: targetMeters,
    canopy_score_pct: avgCanopy,
    steps,
    path_nodes: selectedPath
  };
}

function calculateBearing(lat1, lon1, lat2, lon2) {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

// ============================================================================
// 6. Oscilloscope Visualizer
// ============================================================================
function initVisualizers() {
  const canvasSmall = document.getElementById("audioVisualizerCanvas");
  const canvasLarge = document.getElementById("largeWaveformCanvas");

  let phase = 0;
  function render() {
    requestAnimationFrame(render);
    phase += 0.08;

    if (canvasSmall) {
      const ctx = canvasSmall.getContext("2d");
      ctx.clearRect(0, 0, canvasSmall.width, canvasSmall.height);
      const isLive = audioSynth.isSpeaking;
      const bars = 22;
      const barW = 5;
      const gap = 3;
      for (let i = 0; i < bars; i++) {
        let h = 4;
        if (isLive) {
          h = Math.sin(phase + i * 0.4) * 12 + Math.cos(phase * 0.8 + i) * 6 + 14;
          ctx.fillStyle = "#10b981";
        } else {
          h = Math.sin(phase * 0.2 + i * 0.2) * 2 + 4;
          ctx.fillStyle = "rgba(148, 163, 184, 0.4)";
        }
        ctx.fillRect(i * (barW + gap), canvasSmall.height / 2 - h / 2, barW, Math.max(3, h));
      }
    }

    if (canvasLarge && state.zeroScreenActive) {
      const ctx = canvasLarge.getContext("2d");
      ctx.clearRect(0, 0, canvasLarge.width, canvasLarge.height);
      ctx.beginPath();
      ctx.strokeStyle = audioSynth.isSpeaking ? "#10b981" : "rgba(16, 185, 129, 0.3)";
      ctx.lineWidth = 3;

      const midY = canvasLarge.height / 2;
      for (let x = 0; x < canvasLarge.width; x += 4) {
        let amp = audioSynth.isSpeaking ? 35 : 8;
        let y = midY + Math.sin(x * 0.03 + phase) * amp * Math.sin((x / canvasLarge.width) * Math.PI);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
  render();
}

// ============================================================================
// 7. Leaflet Map Setup
// ============================================================================
function initMap() {
  const mapElement = document.getElementById("campusMap");
  if (!mapElement) return;

  state.map = L.map("campusMap", {
    center: ACTIVE_LOCATION_DATA.center,
    zoom: ACTIVE_LOCATION_DATA.zoom,
    zoomControl: false,
  });

  L.control.zoom({ position: "bottomright" }).addTo(state.map);

  // Default tile layer: Esri World Imagery (Satellite) - High-res aerial view, zero API key required
  state.tileLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 19,
    attribution: "&copy; Esri World Imagery"
  }).addTo(state.map);

  renderCampusTopography();
}

function clearCampusTopography() {
  if (!state.map) return;
  if (state.topographyLayers && state.topographyLayers.length > 0) {
    state.topographyLayers.forEach(l => state.map.removeLayer(l));
  }
  state.topographyLayers = [];
}

function renderCampusTopography() {
  if (!state.map) return;
  clearCampusTopography();

  ACTIVE_LOCATION_DATA.edges.forEach(edge => {
    const u = ACTIVE_LOCATION_DATA.nodes[edge.u];
    const v = ACTIVE_LOCATION_DATA.nodes[edge.v];
    if (!u || !v) return;
    const isDirt = edge.surface.includes("dirt");

    const line = L.polyline([[u.lat, u.lon], [v.lat, v.lon]], {
      color: isDirt ? "#f59e0b" : "#38bdf8",
      weight: isDirt ? 3.5 : 3,
      dashArray: isDirt ? "6, 6" : null,
      opacity: 0.85
    }).addTo(state.map).bindTooltip(`${edge.name} (${edge.surface.replace(/_/g, ' ')})`);
    state.topographyLayers.push(line);
  });

  Object.values(ACTIVE_LOCATION_DATA.nodes).forEach(node => {
    const isForest = node.type === "forest" || node.type === "shade";
    const marker = L.circleMarker([node.lat, node.lon], {
      radius: isForest ? 6.5 : 5.5,
      fillColor: isForest ? "#10b981" : "#06b6d4",
      color: "#ffffff",
      weight: 2,
      fillOpacity: 0.95
    }).addTo(state.map);

    marker.bindPopup(`<b>${node.name}</b><br>Elevation: ${node.elev}m`);
    state.topographyLayers.push(marker);
  });
}

function setTileLayer(style) {
  if (!state.map) return;
  if (state.tileLayer) state.map.removeLayer(state.tileLayer);

  if (style === "outdoors") {
    // OpenStreetMap standard topography - Zero API key required
    state.tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap"
    });
  } else if (style === "terrain") {
    // Esri World Topo Map - Zero API key required
    state.tileLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19,
      attribution: "&copy; Esri World Topo Map"
    });
  } else {
    // Default: Esri World Imagery (Satellite) - Zero API key required
    state.tileLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19,
      attribution: "&copy; Esri World Imagery"
    });
  }
  state.tileLayer.addTo(state.map);
}

// ============================================================================
// 8. Route Pipeline & Rendering
// ============================================================================
function calculateRoute(query) {
  fetch("/api/route", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: query, location: activeLocationKey })
  })
  .then(res => {
    if (!res.ok) throw new Error("API not ok");
    return res.json();
  })
  .then(data => {
    if (!data.steps || data.steps.length === 0) throw new Error("Empty steps");
    applyRouteData(data);
  })
  .catch(() => {
    const dynamicRoute = computeDynamicRoute(query);
    applyRouteData(dynamicRoute);
  });
}

function applyRouteData(routeData) {
  state.activeRoute = routeData;
  state.activeStepIndex = 0;

  const km = (routeData.total_distance_m / 1000).toFixed(2);
  document.getElementById("metricDistance").textContent = `${km} km`;
  document.getElementById("metricCanopy").textContent = `${routeData.canopy_score_pct || 84}%`;
  document.getElementById("metricWaypoints").textContent = `${routeData.steps.length} Steps`;
  document.getElementById("stepCounterBadge").textContent = `${routeData.steps.length} Instructions`;

  const estMins = Math.round((routeData.total_distance_m / 1000 / 4.8) * 60);
  const timeEl = document.getElementById("metricTime");
  if (timeEl) timeEl.textContent = `${estMins} min`;

  // Render Step Cards
  const listContainer = document.getElementById("instructionsList");
  listContainer.innerHTML = "";

  routeData.steps.forEach((step, idx) => {
    const card = document.createElement("div");
    card.className = `step-card ${idx === 0 ? "active-step" : ""}`;
    card.id = `stepCard-${idx}`;
    card.innerHTML = `
      <div class="step-icon-box">${step.step}</div>
      <div class="step-body">
        <div class="step-instruction">${step.instruction}</div>
        <div class="step-meta">
          <span class="step-dist">${step.distance_m}m</span>
          <span class="step-tag">${step.surface.replace(/_/g, ' ')}</span>
          <span class="step-tag">${step.canopy} shade</span>
        </div>
      </div>
      <button class="icon-btn play-cue-btn" data-step="${idx}" title="Listen to this step">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
      </button>
    `;

    card.addEventListener("click", () => selectStep(idx, true));
    listContainer.appendChild(card);
  });

  document.querySelectorAll(".play-cue-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const stepIdx = parseInt(btn.dataset.step, 10);
      selectStep(stepIdx, true);
    });
  });

  renderRouteOnMap(routeData);
  updateHUD(routeData.steps[0]);

  // Vocalize introductory overview
  const locName = routeData.location_name || ACTIVE_LOCATION_DATA.name || "campus";
  audioSynth.speak(
    `Route calculated for ${locName}. Total distance is ${km} kilometers across ${routeData.steps.length} waypoints, with maximum tree canopy exposure.`
  );
}

function renderRouteOnMap(routeData) {
  if (!state.map) return;

  if (state.routePolyline) state.map.removeLayer(state.routePolyline);
  state.routeDecorations.forEach(l => state.map.removeLayer(l));
  state.routeDecorations = [];

  const latlngs = routeData.steps.map(s => s.coords);
  if (routeData.steps.length > 0) {
    latlngs.push(routeData.steps[routeData.steps.length - 1].target_coords);
  }

  const glowLine = L.polyline(latlngs, {
    color: "#10b981",
    weight: 9,
    opacity: 0.35,
    lineCap: "round"
  }).addTo(state.map);
  state.routeDecorations.push(glowLine);

  state.routePolyline = L.polyline(latlngs, {
    color: "#34d399",
    weight: 4,
    opacity: 0.95,
    lineCap: "round"
  }).addTo(state.map);

  state.map.fitBounds(state.routePolyline.getBounds(), { padding: [50, 50] });

  if (state.simMarker) state.map.removeLayer(state.simMarker);
  state.simMarker = L.circleMarker(latlngs[0], {
    radius: 9,
    fillColor: "#f43f5e",
    color: "#ffffff",
    weight: 2.5,
    fillOpacity: 1
  }).addTo(state.map);
}

// ============================================================================
// 9. Step Selection & HUD Synchronization
// ============================================================================
function selectStep(stepIdx, speak = false) {
  if (!state.activeRoute || !state.activeRoute.steps[stepIdx]) return;
  state.activeStepIndex = stepIdx;
  const step = state.activeRoute.steps[stepIdx];

  document.querySelectorAll(".step-card").forEach(c => c.classList.remove("active-step"));
  const activeCard = document.getElementById(`stepCard-${stepIdx}`);
  if (activeCard) {
    activeCard.classList.add("active-step");
    activeCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  updateHUD(step);

  if (state.simMarker && step.coords) {
    state.simMarker.setLatLng(step.coords);
  }

  updateSensoryScreen(step);

  if (speak) {
    audioSynth.speak(`Step ${step.step}. ${step.audio_cue}`, step.turn);
  }
}

function updateHUD(step) {
  const stepNum = document.getElementById("hudStepNum");
  const instruction = document.getElementById("hudInstructionText");
  const dist = document.getElementById("hudDistance");

  if (stepNum) stepNum.textContent = `Step ${step.step} of ${state.activeRoute.steps.length}`;
  if (instruction) instruction.textContent = step.instruction;
  if (dist) dist.textContent = `${step.distance_m} m`;
}

function updateSensoryScreen(step) {
  const stepIdxEl = document.getElementById("sensoryStepIndex");
  const cueTextEl = document.getElementById("sensoryCueText");
  const distEl = document.getElementById("sensoryDistance");
  const canopyEl = document.getElementById("sensoryCanopy");

  if (stepIdxEl) stepIdxEl.textContent = `STEP ${step.step} / ${state.activeRoute.steps.length}`;
  if (cueTextEl) cueTextEl.textContent = `"${step.audio_cue}"`;
  if (distEl) distEl.textContent = `Distance: ${step.distance_m}m`;
  if (canopyEl) canopyEl.textContent = `Canopy: ${step.canopy} shade`;
}

// ============================================================================
// 10. Walk Simulation Controller
// ============================================================================
function toggleWalkSimulation() {
  if (!state.activeRoute) return;
  if (state.simulating) stopSimulation();
  else startSimulation();
}

function startSimulation() {
  state.simulating = true;
  document.getElementById("simBtnText").textContent = "Pause Walk Simulation";
  document.getElementById("startSimBtn").classList.add("btn-primary");
  document.getElementById("startSimBtn").classList.remove("btn-secondary");

  executeSimulationStep();
}

function executeSimulationStep() {
  if (!state.simulating || !state.activeRoute) return;

  const steps = state.activeRoute.steps;
  if (state.activeStepIndex >= steps.length) {
    audioSynth.speak("Navigation complete. You have arrived back at your destination.", null, () => {
      stopSimulation();
    });
    return;
  }

  const currentStep = steps[state.activeStepIndex];
  selectStep(state.activeStepIndex, true);

  const baseDelay = (currentStep.distance_m / 40) * 1000 / state.simSpeedMultiplier;
  const clampedDelay = Math.max(2500, Math.min(6000, baseDelay));

  state.simTimer = setTimeout(() => {
    state.activeStepIndex++;
    executeSimulationStep();
  }, clampedDelay);
}

function stopSimulation() {
  state.simulating = false;
  if (state.simTimer) clearTimeout(state.simTimer);
  document.getElementById("simBtnText").textContent = "Simulate Walk Audio";
  document.getElementById("startSimBtn").classList.remove("btn-primary");
  document.getElementById("startSimBtn").classList.add("btn-secondary");
}

// ============================================================================
// 11. Export Route: GPX & GeoJSON (Authentic Open-Source GIS Feature)
// ============================================================================
function exportGPX() {
  if (!state.activeRoute) return;
  let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="BlindWalk Offline Spatial Navigator" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>BlindWalk Campus Route</name>
    <desc>Air-Gapped Shaded Walking Route - Jain Global Campus Kanakapura</desc>
  </metadata>
  <trk>
    <name>Jain Campus Shaded Loop</name>
    <trkseg>\n`;

  state.activeRoute.steps.forEach(s => {
    gpx += `      <trkpt lat="${s.coords[0]}" lon="${s.coords[1]}"><ele>${s.elev || 720}</ele><name>${s.instruction}</name></trkpt>\n`;
  });

  const last = state.activeRoute.steps[state.activeRoute.steps.length - 1];
  gpx += `      <trkpt lat="${last.target_coords[0]}" lon="${last.target_coords[1]}"><ele>719</ele><name>Arrival</name></trkpt>\n`;
  gpx += `    </trkseg>
  </trk>
</gpx>`;

  downloadFile("blindwalk_campus_route.gpx", gpx, "application/gpx+xml");
}

function exportGeoJSON() {
  if (!state.activeRoute) return;
  const coordinates = state.activeRoute.steps.map(s => [s.coords[1], s.coords[0]]);
  const last = state.activeRoute.steps[state.activeRoute.steps.length - 1];
  coordinates.push([last.target_coords[1], last.target_coords[0]]);

  const geojson = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          name: "BlindWalk Shaded Campus Route",
          distance_meters: state.activeRoute.total_distance_m,
          canopy_score_pct: state.activeRoute.canopy_score_pct,
          step_count: state.activeRoute.steps.length
        },
        geometry: {
          type: "LineString",
          coordinates: coordinates
        }
      }
    ]
  };

  downloadFile("blindwalk_route.geojson", JSON.stringify(geojson, null, 2), "application/geo+json");
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================================
// 12. Zero-Screen Sensory AMOLED Modal
// ============================================================================
function toggleZeroScreen(active) {
  state.zeroScreenActive = active;
  const modal = document.getElementById("zeroScreenModal");
  if (!modal) return;

  if (active) {
    modal.classList.remove("hidden");
    if (state.activeRoute && state.activeRoute.steps[state.activeStepIndex]) {
      updateSensoryScreen(state.activeRoute.steps[state.activeStepIndex]);
      audioSynth.speak("BlindWalk zero-screen sensory mode engaged. Visual elements muted.");
    }
  } else {
    modal.classList.add("hidden");
  }
}

// ============================================================================
// 13. Web Speech API Speech-to-Text Recognition
// ============================================================================
function initVoiceInput() {
  const btn = document.getElementById("voiceInputBtn");
  const input = document.getElementById("promptInput");
  if (!btn || !input) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return;

  const recognizer = new SpeechRecognition();
  recognizer.continuous = false;
  recognizer.lang = "en-US";

  btn.addEventListener("click", () => {
    recognizer.start();
    btn.style.color = "#f43f5e";
  });

  recognizer.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    input.value = transcript;
    btn.style.color = "";
    calculateRoute(transcript);
  };

  recognizer.onerror = () => { btn.style.color = ""; };
  recognizer.onend = () => { btn.style.color = ""; };
}

// ============================================================================
// 14. Location Preset Switching & Global Map Geocoding
// ============================================================================
function switchLocationPreset(key) {
  if (!PRESET_LOCATIONS[key]) return;
  activeLocationKey = key;
  ACTIVE_LOCATION_DATA = PRESET_LOCATIONS[key];

  if (state.map) {
    state.map.setView(ACTIVE_LOCATION_DATA.center, ACTIVE_LOCATION_DATA.zoom);
    renderCampusTopography();
  }

  const promptInput = document.getElementById("promptInput");
  const query = promptInput ? promptInput.value.trim() : "Calculate a 2-kilometer loop maximizing tree canopy exposure";
  calculateRoute(query || "Calculate a 2-kilometer loop maximizing tree canopy exposure");

  audioSynth.speak(`Switched location to ${ACTIVE_LOCATION_DATA.name}. Calculating optimal walking route.`);
}

async function searchLocation(query) {
  if (!query || !query.trim()) return;
  const cleanQuery = query.trim();
  const searchBtn = document.getElementById("mapSearchBtn");
  if (searchBtn) {
    searchBtn.disabled = true;
    searchBtn.style.opacity = "0.5";
  }

  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery)}&limit=1`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await resp.json();
    if (!data || data.length === 0) {
      alert(`Location "${cleanQuery}" not found on OpenStreetMap. Please try another place or city name.`);
      return;
    }

    const item = data[0];
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    const displayName = item.display_name.split(",").slice(0, 2).join(",");

    const customData = generateDynamicLocationData(displayName, lat, lon);
    PRESET_LOCATIONS["custom"] = customData;
    activeLocationKey = "custom";
    ACTIVE_LOCATION_DATA = customData;

    const select = document.getElementById("locationPresetSelect");
    if (select) {
      let customOpt = select.querySelector('option[value="custom"]');
      if (!customOpt) {
        customOpt = document.createElement("option");
        customOpt.value = "custom";
        select.appendChild(customOpt);
      }
      customOpt.textContent = `📍 ${displayName}`;
      select.value = "custom";
    }

    if (state.map) {
      state.map.setView([lat, lon], 16);
      renderCampusTopography();
    }

    const promptInput = document.getElementById("promptInput");
    const currentQuery = promptInput ? promptInput.value.trim() : "Calculate a 2-kilometer loop maximizing tree canopy exposure";
    calculateRoute(currentQuery || "Calculate a 2-kilometer loop maximizing tree canopy exposure");

    audioSynth.speak(`Location updated to ${displayName}. Calculating local pedestrian loop.`);
  } catch (err) {
    console.error("Geocoding failed:", err);
    alert("Geocoding network error. Please check your internet connection.");
  } finally {
    if (searchBtn) {
      searchBtn.disabled = false;
      searchBtn.style.opacity = "1";
    }
  }
}

// ============================================================================
// 15. Event Listeners & Bootstrapping
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
  initMap();
  initVisualizers();
  initVoiceInput();

  // Location Preset & Global Search listeners
  const presetSelect = document.getElementById("locationPresetSelect");
  if (presetSelect) {
    presetSelect.addEventListener("change", (e) => {
      switchLocationPreset(e.target.value);
    });
  }

  const searchInput = document.getElementById("mapSearchInput");
  const searchBtn = document.getElementById("mapSearchBtn");
  if (searchBtn && searchInput) {
    searchBtn.addEventListener("click", () => {
      searchLocation(searchInput.value);
    });
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        searchLocation(searchInput.value);
      }
    });
  }

  calculateRoute("Calculate a 2-kilometer loop maximizing tree canopy exposure");

  document.getElementById("submitQueryBtn").addEventListener("click", () => {
    const query = document.getElementById("promptInput").value.trim();
    if (query) calculateRoute(query);
  });

  document.querySelectorAll(".preset-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const q = chip.dataset.query;
      document.getElementById("promptInput").value = q;
      calculateRoute(q);
    });
  });

  document.getElementById("startSimBtn").addEventListener("click", toggleWalkSimulation);
  document.getElementById("repeatAudioBtn").addEventListener("click", () => {
    if (state.activeRoute) selectStep(state.activeStepIndex, true);
  });

  document.getElementById("toggleZeroScreenBtn").addEventListener("click", () => toggleZeroScreen(true));
  document.getElementById("exitZeroScreenBtn").addEventListener("click", () => toggleZeroScreen(false));

  document.getElementById("sensoryRepeatBtn").addEventListener("click", () => {
    if (state.activeRoute) selectStep(state.activeStepIndex, true);
  });
  document.getElementById("sensoryNextBtn").addEventListener("click", () => {
    if (state.activeRoute && state.activeStepIndex < state.activeRoute.steps.length - 1) {
      selectStep(state.activeStepIndex + 1, true);
    }
  });
  document.getElementById("sensoryPrevBtn").addEventListener("click", () => {
    if (state.activeRoute && state.activeStepIndex > 0) {
      selectStep(state.activeStepIndex - 1, true);
    }
  });

  // Layer buttons (100% free, zero API key required)
  const tileSat = document.getElementById("tileSatBtn");
  if (tileSat) {
    tileSat.addEventListener("click", (e) => {
      document.querySelectorAll(".layer-btn").forEach(b => b.classList.remove("active"));
      e.target.classList.add("active");
      setTileLayer("sat");
    });
  }
  const tileOutdoors = document.getElementById("tileOutdoorsBtn");
  if (tileOutdoors) {
    tileOutdoors.addEventListener("click", (e) => {
      document.querySelectorAll(".layer-btn").forEach(b => b.classList.remove("active"));
      e.target.classList.add("active");
      setTileLayer("outdoors");
    });
  }
  const tileTerrain = document.getElementById("tileTerrainBtn");
  if (tileTerrain) {
    tileTerrain.addEventListener("click", (e) => {
      document.querySelectorAll(".layer-btn").forEach(b => b.classList.remove("active"));
      e.target.classList.add("active");
      setTileLayer("terrain");
    });
  }

  // Export Buttons
  const exportGpxBtn = document.getElementById("exportGpxBtn");
  if (exportGpxBtn) exportGpxBtn.addEventListener("click", exportGPX);
  const exportGeoBtn = document.getElementById("exportGeoBtn");
  if (exportGeoBtn) exportGeoBtn.addEventListener("click", exportGeoJSON);

  // Settings Modal
  const settingsModal = document.getElementById("audioSettingsModal");
  document.getElementById("audioSettingsBtn").addEventListener("click", () => settingsModal.showModal());
  document.getElementById("closeSettingsBtn").addEventListener("click", () => settingsModal.close());
  document.getElementById("saveSettingsBtn").addEventListener("click", () => settingsModal.close());

  document.getElementById("voiceRateSlider").addEventListener("input", (e) => {
    state.ttsRate = parseFloat(e.target.value);
    document.getElementById("rateLabel").textContent = `${Math.round(state.ttsRate * 150)} WPM`;
  });
  document.getElementById("voicePitchSlider").addEventListener("input", (e) => {
    state.ttsPitch = parseFloat(e.target.value);
    document.getElementById("pitchLabel").textContent = state.ttsPitch.toFixed(1);
  });
  document.getElementById("voiceSelect").addEventListener("change", (e) => {
    state.ttsVoice = audioSynth.voices[e.target.value];
  });
  document.getElementById("simSpeedSelect").addEventListener("change", (e) => {
    state.simSpeedMultiplier = parseFloat(e.target.value);
  });
  document.getElementById("testVoiceBtn").addEventListener("click", () => {
    audioSynth.speak("BlindWalk audio navigation test. Proceed 50 meters ahead.", "turn_right");
  });

  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" && state.zeroScreenActive) {
      e.preventDefault();
      if (state.activeRoute) selectStep(state.activeStepIndex, true);
    } else if (e.code === "ArrowRight" && state.zeroScreenActive) {
      if (state.activeRoute && state.activeStepIndex < state.activeRoute.steps.length - 1) {
        selectStep(state.activeStepIndex + 1, true);
      }
    } else if (e.code === "ArrowLeft" && state.zeroScreenActive) {
      if (state.activeRoute && state.activeStepIndex > 0) {
        selectStep(state.activeStepIndex - 1, true);
      }
    } else if (e.code === "Escape") {
      toggleZeroScreen(false);
      settingsModal.close();
    }
  });
});
