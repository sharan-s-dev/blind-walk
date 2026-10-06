"""
BlindWalk Acoustic Navigator (engine/audio_output.py)
-----------------------------------------------------
Handles 100% offline acoustic text-to-speech output using pyttsx3.
Enforces the Zero-Screen parameter by clearing and suppressing all terminal output,
directing execution feedback exclusively through auditory channels.
"""

import os
import sys
import time
import logging
from pathlib import Path
from typing import Optional, List

from config import TTS_RATE, TTS_VOLUME, TTS_VOICE_ID, AUDIT_LOG_FILE

logger = logging.getLogger("blindwalk.audio")

class ZeroScreenSuppressor:
    """
    Suppresses all terminal stdout and stderr to enforce zero-screen operation,
    diverting operational logs into an offline audit file.
    """
    def __init__(self, log_path: Path = AUDIT_LOG_FILE):
        self.log_path = log_path
        self._orig_stdout = None
        self._orig_stderr = None
        self._log_file = None

    def engage(self):
        """Clears screen and diverts visual streams to audit log."""
        # Clear terminal screen
        os.system("cls" if os.name == "nt" else "clear")

        # Open audit log file
        self.log_path.parent.mkdir(parents=True, exist_ok=True)
        self._log_file = open(self.log_path, "a", encoding="utf-8")

        # Save original file descriptors
        self._orig_stdout = sys.stdout
        self._orig_stderr = sys.stderr

        # Redirect to log file
        sys.stdout = self._log_file
        sys.stderr = self._log_file

    def release(self):
        """Restores terminal stdout/stderr upon exit."""
        if self._orig_stdout:
            sys.stdout = self._orig_stdout
        if self._orig_stderr:
            sys.stderr = self._orig_stderr
        if self._log_file and not self._log_file.closed:
            self._log_file.close()

class AcousticNavigator:
    """Offline Text-to-Speech audio navigation engine."""

    def __init__(self):
        self.engine = None
        self.audio_available = False
        self._init_tts()

    def _init_tts(self):
        """Initializes pyttsx3 offline TTS engine with fallback safety."""
        try:
            import pyttsx3
            self.engine = pyttsx3.init()
            self.engine.setProperty("rate", TTS_RATE)
            self.engine.setProperty("volume", TTS_VOLUME)

            if TTS_VOICE_ID:
                self.engine.setProperty("voice", TTS_VOICE_ID)

            self.audio_available = True
            logger.info("pyttsx3 TTS engine initialized successfully.")
        except Exception as e:
            logger.warning(f"Audio hardware or pyttsx3 initialization notice: {e}")
            self.audio_available = False

    def speak(self, text: str, pause_after_sec: float = 0.8):
        """Speaks the provided text through offline audio driver."""
        if not text:
            return

        logger.info(f"[ACOUSTIC OUTPUT] Spoken: {text}")

        if self.audio_available and self.engine:
            try:
                self.engine.say(text)
                self.engine.runAndWait()
            except Exception as e:
                logger.error(f"TTS playback exception: {e}")
        else:
            # Fallback if container running in headless audio-less environment
            pass

        if pause_after_sec > 0:
            time.sleep(pause_after_sec)

    def announce_activation(self):
        """Acoustic cue confirming zero-screen state engagement."""
        cue = (
            "BlindWalk zero screen mode engaged. "
            "All visual terminal output is suppressed. "
            "Offline spatial routing active."
        )
        self.speak(cue, pause_after_sec=0.5)

    def announce_route_overview(self, total_m: float, step_count: int, prefer_canopy: bool):
        """Speaks introductory spatial route summary."""
        km = round(total_m / 1000.0, 2)
        canopy_text = "with maximum tree canopy exposure" if prefer_canopy else "standard path"
        overview = (
            f"Route calculated for Jain University Kanakapura campus. "
            f"Total distance is {km} kilometers across {step_count} waypoints, {canopy_text}. "
            f"Beginning turn by turn acoustic navigation now."
        )
        self.speak(overview, pause_after_sec=1.0)

    def execute_commands(self, commands: List[Any], pacing_delay_sec: float = 2.0):
        """
        Sequentially executes navigation commands through acoustic output,
        pacing instructions for pedestrian movement.
        """
        for cmd in commands:
            cue = getattr(cmd, "audio_cue", None) or getattr(cmd, "instruction", "")
            step_num = getattr(cmd, "step", 1)
            dist = getattr(cmd, "distance_m", 0)

            # Announce step
            announcement = f"Step {step_num}. {cue}"
            self.speak(announcement, pause_after_sec=pacing_delay_sec)

    def announce_completion(self, total_m: float):
        """Speaks final arrival and completion audio cue."""
        km = round(total_m / 1000.0, 2)
        completion_msg = (
            f"Navigation complete. You have arrived back at your starting point. "
            f"Total distance walked: {km} kilometers. "
            f"Shutting down BlindWalk."
        )
        self.speak(completion_msg, pause_after_sec=1.0)
