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

# Verified Coordinates: Jain University Global Campus (Kanakapura Road, Karnataka)
# Matching the official grounds: Golf Course, Cricket Ground, SET Dome, Core Block, Colloseum
JAIN_UNIVERSITY_COORDS = {
    "center_lat": 12.6395,
    "center_lon": 77.4420,
    "north": 12.6445,
    "south": 12.6335,
    "east": 77.4475,
    "west": 77.4360,
    "buffer_dist_m": 1200,
}

# Multi-Campus & Park Presets
LOCATION_PRESETS = {
    "jain": JAIN_UNIVERSITY_COORDS,
    "iisc": {
        "name": "IISc Bangalore Campus",
        "center_lat": 13.0219,
        "center_lon": 77.5671,
        "north": 13.0300,
        "south": 13.0140,
        "east": 77.5750,
        "west": 77.5600,
    },
    "cubbon": {
        "name": "Cubbon Park Nature Preserve",
        "center_lat": 12.9763,
        "center_lon": 77.5929,
        "north": 12.9840,
        "south": 12.9690,
        "east": 77.6000,
        "west": 77.5860,
    },
    "lalbagh": {
        "name": "Lalbagh Botanical Garden",
        "center_lat": 12.9507,
        "center_lon": 77.5848,
        "north": 12.9580,
        "south": 12.9430,
        "east": 77.5920,
        "west": 77.5770,
    },
    "nandi": {
        "name": "Nandi Hills Hiking Reserve",
        "center_lat": 13.3702,
        "center_lon": 77.6835,
        "north": 13.3780,
        "south": 13.3630,
        "east": 77.6910,
        "west": 77.6760,
    }
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
