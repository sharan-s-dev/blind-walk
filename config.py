"""
Configuration settings for BlindWalk air-gapped zero-GUI spatial routing agent.
"""

import os
from pathlib import Path

# Base Paths
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

# Graph Storage Paths
GRAPH_FILENAME = "campus_grid.graphml"
DEFAULT_GRAPH_PATH = DATA_DIR / GRAPH_FILENAME
FALLBACK_GRAPH_PATH = BASE_DIR / GRAPH_FILENAME

# Target Geographic Location: Jain University Kanakapura Global Campus, Karnataka, India
# Topography: Campus grounds, forest tracts, pedestrian paths, dirt roads
JAIN_UNIVERSITY_COORDS = {
    "center_lat": 12.6568,
    "center_lon": 77.4428,
    "north": 12.6680,
    "south": 12.6450,
    "east": 77.4580,
    "west": 77.4280,
    "buffer_dist_m": 1200,  # Buffer radius in meters
}

# Network Filter for Pedestrian Paths, Trails, Dirt Roads & Natural Enclaves
CUSTOM_PEDESTRIAN_FILTER = (
    '["highway"~"footway|path|pedestrian|track|steps|living_street|service|unclassified|residential"]'
)

# Ollama Inference Configuration
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")
OLLAMA_TIMEOUT = int(os.getenv("OLLAMA_TIMEOUT", "60"))

# Offline Acoustic (TTS) Configuration
TTS_RATE = int(os.getenv("TTS_RATE", "150"))        # Natural speaking pace (words per min)
TTS_VOLUME = float(os.getenv("TTS_VOLUME", "1.0"))  # Master volume 0.0 - 1.0
TTS_VOICE_ID = os.getenv("TTS_VOICE_ID", None)

# Zero-Screen Audit Log
AUDIT_LOG_FILE = DATA_DIR / "blindwalk_audit.log"
