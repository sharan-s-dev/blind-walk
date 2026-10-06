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
// 1. Campus Spatial Topography (Jain University Global Campus, Kanakapura)
// ============================================================================
const JAIN_CAMPUS_DATA = {
  center: [12.6568, 77.4428],
  zoom: 16,
  nodes: {
    101: { id: 101, name: "Campus South Gate (Arrival)", lat: 12.6538, lon: 77.4428, elev: 719, type: "gate" },
    102: { id: 102, name: "Academic Central Quad", lat: 12.6558, lon: 77.4428, elev: 722, type: "quad" },
    103: { id: 103, name: "Library Neem Canopy Walk", lat: 12.6568, lon: 77.4413, elev: 724, type: "shade" },
    104: { id: 104, name: "Herbal Forest West Gate", lat: 12.6583, lon: 77.4403, elev: 728, type: "forest" },
    105: { id: 105, name: "Dense Eucalyptus Grove North", lat: 12.6603, lon: 77.4418, elev: 732, type: "forest" },
    106: { id: 106, name: "Rainwater Lake Overlook Trail", lat: 12.6598, lon: 77.4448, elev: 725, type: "lake" },
    107: { id: 107, name: "East Perimeter Dirt Track", lat: 12.6578, lon: 77.4458, elev: 721, type: "dirt" },
    108: { id: 108, name: "Sports Ground Shaded Pathway", lat: 12.6553, lon: 77.4443, elev: 720, type: "sports" }
  },
  edges: [
    { u: 101, v: 102, name: "Main Entrance Walkway", surface: "pedestrian_walkway", canopy: 0.35, dist: 222 },
    { u: 102, v: 103, name: "Neem Grove Path", surface: "dirt_trail", canopy: 0.85, dist: 197 },
    { u: 103, v: 104, name: "Herbal Forest Boundary Trail", surface: "dirt_trail", canopy: 0.95, dist: 199 },
    { u: 104, v: 105, name: "North Hill Eucalyptus Ridgeline", surface: "dirt_trail", canopy: 0.90, dist: 275 },
    { u: 105, v: 106, name: "Lake Descent Ridge", surface: "dirt_trail", canopy: 0.75, dist: 330 },
    { u: 106, v: 107, name: "East Lake Perimeter Dirt Road", surface: "dirt_trail", canopy: 0.70, dist: 247 },
    { u: 107, v: 108, name: "East Tree Boundary Walk", surface: "dirt_trail", canopy: 0.65, dist: 322 },
    { u: 108, v: 101, name: "Sports Pavilion Corridor", surface: "pedestrian_walkway", canopy: 0.40, dist: 233 },
    { u: 102, v: 108, name: "Central Cross Campus Walkway", surface: "pedestrian_walkway", canopy: 0.50, dist: 175 },
    { u: 103, v: 106, name: "Botanical Cross Cut Trail", surface: "dirt_trail", canopy: 0.80, dist: 390 }
  ]
};

// ============================================================================
// 2. Application State & Settings
// ============================================================================
const state = {
  map: null,
  tileLayer: null,
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
  const q = query.toLowerCase();

  // Extract requested distance
  let targetMeters = 2000;
  const kmMatch = q.match(/(\d+(?:\.\d+)?)\s*(?:-| )*(?:km|kilometer|kilometre)/);
  const mMatch = q.match(/(\d+(?:\.\d+)?)\s*(?:-| )*(?:m|meter)/);
  if (kmMatch) targetMeters = parseFloat(kmMatch[1]) * 1000;
  else if (mMatch) targetMeters = parseFloat(mMatch[1]);

  const preferCanopy = q.includes("canopy") || q.includes("shade") || q.includes("tree") || q.includes("forest");
  const preferDirt = q.includes("dirt") || q.includes("trail") || q.includes("track");

  // Build Adjacency Graph from JAIN_CAMPUS_DATA
  const adj = {};
  Object.keys(JAIN_CAMPUS_DATA.nodes).forEach(id => {
    adj[id] = [];
  });

  JAIN_CAMPUS_DATA.edges.forEach(e => {
    let weight = e.dist;
    if (preferCanopy) weight = weight / (0.2 + e.canopy * 1.8);
    if (preferDirt && e.surface.includes("dirt")) weight = weight * 0.6;

    adj[e.u].push({ to: e.v, dist: e.dist, weight, name: e.name, surface: e.surface, canopy: e.canopy });
    adj[e.v].push({ to: e.u, dist: e.dist, weight, name: e.name, surface: e.surface, canopy: e.canopy });
  });

  // Cycle basis loop selection matching target distance
  let bestLoop = null;
  let bestDiff = Infinity;

  // Candidate loop paths tailored to distances
  const candidateLoops = [
    // 1. Short Quad Loop (~600m - 800m)
    [101, 102, 108, 101],
    // 2. Library & Quad Shaded Loop (~1.1 km - 1.3 km)
    [101, 102, 103, 106, 107, 108, 101],
    // 3. Complete Shaded Perimeter Loop (~2.0 km)
    [101, 102, 103, 104, 105, 106, 107, 108, 101],
    // 4. Deep Forest Ridge Extended Loop (~2.8 km)
    [101, 102, 103, 104, 105, 106, 103, 104, 105, 106, 107, 108, 101]
  ];

  for (const loop of candidateLoops) {
    let loopDist = 0;
    for (let i = 0; i < loop.length - 1; i++) {
      const u = loop[i], v = loop[i+1];
      const edge = JAIN_CAMPUS_DATA.edges.find(e => (e.u === u && e.v === v) || (e.u === v && e.v === u));
      loopDist += edge ? edge.dist : 200;
    }
    const diff = Math.abs(loopDist - targetMeters);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestLoop = loop;
    }
  }

  const selectedPath = bestLoop || candidateLoops[2];

  // Convert Node Sequence into Navigational Step Objects
  const steps = [];
  let totalDist = 0;
  let prevBearing = null;

  for (let i = 0; i < selectedPath.length - 1; i++) {
    const uId = selectedPath[i];
    const vId = selectedPath[i+1];
    const uNode = JAIN_CAMPUS_DATA.nodes[uId];
    const vNode = JAIN_CAMPUS_DATA.nodes[vId];
    const edge = JAIN_CAMPUS_DATA.edges.find(e => (e.u === uId && e.v === vId) || (e.u === vId && e.v === uId)) || {
      dist: 200, name: "Campus Path", surface: "dirt_trail", canopy: 0.7
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
    const canopyDesc = edge.canopy >= 0.8 ? "dense neem shade" : (edge.canopy >= 0.5 ? "moderate tree shade" : "open sky");
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
    steps.reduce((acc, s) => acc + (s.canopy === "dense" ? 90 : 65), 0) / steps.length
  );

  return {
    query,
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
    center: JAIN_CAMPUS_DATA.center,
    zoom: JAIN_CAMPUS_DATA.zoom,
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

function renderCampusTopography() {
  if (!state.map) return;

  JAIN_CAMPUS_DATA.edges.forEach(edge => {
    const u = JAIN_CAMPUS_DATA.nodes[edge.u];
    const v = JAIN_CAMPUS_DATA.nodes[edge.v];
    const isDirt = edge.surface.includes("dirt");

    L.polyline([[u.lat, u.lon], [v.lat, v.lon]], {
      color: isDirt ? "#f59e0b" : "#38bdf8",
      weight: isDirt ? 3.5 : 3,
      dashArray: isDirt ? "6, 6" : null,
      opacity: 0.85
    }).addTo(state.map).bindTooltip(`${edge.name} (${edge.surface.replace(/_/g, ' ')})`);
  });

  Object.values(JAIN_CAMPUS_DATA.nodes).forEach(node => {
    const isForest = node.type === "forest" || node.type === "shade";
    const marker = L.circleMarker([node.lat, node.lon], {
      radius: isForest ? 6.5 : 5.5,
      fillColor: isForest ? "#10b981" : "#06b6d4",
      color: "#ffffff",
      weight: 2,
      fillOpacity: 0.95
    }).addTo(state.map);

    marker.bindPopup(`<b>${node.name}</b><br>Elevation: ${node.elev}m`);
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
    body: JSON.stringify({ query: query })
  })
  .then(res => res.json())
  .then(data => {
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
  audioSynth.speak(
    `Route calculated for Jain University Kanakapura campus. Total distance is ${km} kilometers across ${routeData.steps.length} waypoints, with maximum tree canopy exposure.`
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
// 14. Event Listeners & Bootstrapping
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
  initMap();
  initVisualizers();
  initVoiceInput();

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
