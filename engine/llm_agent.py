"""
BlindWalk LLM Routing Agent (engine/llm_agent.py)
------------------------------------------------
Leverages LangChain and local Ollama inference (quantized 1B-3B model)
to synthesize spatial topological metadata and natural language user constraints
into a strictly-formatted JSON array of physical acoustic routing commands.
"""

import json
import re
import logging
from typing import List, Dict, Any, Optional

try:
    from pydantic import BaseModel, Field

    class RoutingCommand(BaseModel):
        """Schema for individual physical navigation command."""
        step: int = Field(description="Sequential step number starting from 1")
        instruction: str = Field(description="Full natural language navigational direction")
        distance_m: float = Field(description="Distance for this segment in meters")
        turn: str = Field(description="Turn direction: straight, slight_left, turn_left, sharp_left, slight_right, turn_right, sharp_right, u_turn")
        surface: str = Field(description="Surface texture (e.g. dirt_trail, unpaved, paved_walkway)")
        canopy: str = Field(description="Canopy exposure level (dense, moderate, open)")
        audio_cue: str = Field(description="Crisp, direct sentence formulated specifically for acoustic speech output")
except ImportError:
    from dataclasses import dataclass

    @dataclass
    class RoutingCommand:
        """Schema fallback for environments without pydantic installed."""
        step: int
        instruction: str
        distance_m: float
        turn: str
        surface: str
        canopy: str
        audio_cue: str

from config import OLLAMA_HOST, OLLAMA_MODEL, OLLAMA_TIMEOUT

logger = logging.getLogger("blindwalk.llm")


class RoutingLLMAgent:
    """Agent orchestrating LangChain and local quantized Ollama inference."""

    def __init__(self, host: str = OLLAMA_HOST, model: str = OLLAMA_MODEL):
        self.host = host
        self.model = model
        self.llm = self._init_langchain_ollama()

    def _init_langchain_ollama(self):
        """Initializes LangChain Ollama connection."""
        try:
            # Try official langchain-ollama first
            from langchain_ollama import ChatOllama
            return ChatOllama(
                base_url=self.host,
                model=self.model,
                temperature=0.1,  # Low temperature for strict structural compliance
                format="json",
            )
        except Exception:
            try:
                # Fallback to langchain-community
                from langchain_community.chat_models import ChatOllama
                return ChatOllama(
                    base_url=self.host,
                    model=self.model,
                    temperature=0.1,
                    format="json",
                )
            except Exception as e:
                logger.warning(f"Could not initialize ChatOllama driver: {e}")
                return None

    def synthesize_routing_plan(
        self,
        query: str,
        segments: List[Dict[str, Any]],
        total_distance_m: float
    ) -> List[RoutingCommand]:
        """
        Submits topological segments and semantic constraints to Ollama.
        Enforces and validates strict JSON array output.
        """
        prompt_text = self._build_prompt(query, segments, total_distance_m)

        raw_response = None
        if self.llm:
            try:
                from langchain_core.messages import SystemMessage, HumanMessage
                messages = [
                    SystemMessage(content=(
                        "You are BlindWalk's offline spatial synthesis engine. "
                        "You take raw topological path segments and translate them into a strictly valid "
                        "JSON array of acoustic navigation commands for a pedestrian walking without a screen. "
                        "You MUST respond ONLY with a valid JSON array matching the required schema. "
                        "Do not include any conversational preamble or markdown code fences outside the JSON."
                    )),
                    HumanMessage(content=prompt_text),
                ]
                response = self.llm.invoke(messages)
                raw_response = response.content if hasattr(response, "content") else str(response)
            except Exception as e:
                logger.warning(f"Ollama inference encountered an issue or connection error: {e}")
                raw_response = None

        if raw_response:
            parsed = self._parse_json_response(raw_response)
            if parsed:
                return parsed

        # Deterministic offline synthesizer fallback
        logger.info("Using deterministic spatial acoustic synthesizer fallback.")
        return self._deterministic_synthesizer(segments)

    def _build_prompt(self, query: str, segments: List[Dict[str, Any]], total_distance_m: float) -> str:
        """Constructs prompt with strict JSON schema instructions."""
        segments_summary = json.dumps(segments, indent=2)
        return f"""USER CONSTRAINT: "{query}"
TOTAL CALCULATED DISTANCE: {round(total_distance_m, 1)} meters
PATH TOPOLOGY SEGMENTS:
{segments_summary}

TASK:
Convert these physical segments into a sequential navigation route tailored to the user's constraints.
Output a JSON array where each object has these exact fields:
[
  {{
    "step": 1,
    "instruction": "Full physical instruction with turn and distance.",
    "distance_m": 85.0,
    "turn": "straight",
    "surface": "dirt_trail",
    "canopy": "dense",
    "audio_cue": "Crisp acoustic instruction for audio output."
  }}
]

RULES:
1. Output MUST be a valid JSON array.
2. The 'audio_cue' field must be concise, punchy, and direct for offline speech synthesis.
3. Explicitly highlight canopy shade and surface texture in the audio cue.
"""

    def _parse_json_response(self, text: str) -> Optional[List[RoutingCommand]]:
        """Parses and validates LLM output into Pydantic RoutingCommand objects."""
        text = text.strip()
        # Remove markdown code fences if present
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
        text = text.strip()

        # Extract array portion if wrapped
        match = re.search(r"\[\s*\{.*\}\s*\]", text, re.DOTALL)
        if match:
            text = match.group(0)

        try:
            data = json.loads(text)
            if isinstance(data, dict) and "commands" in data:
                data = data["commands"]
            elif isinstance(data, dict) and "steps" in data:
                data = data["steps"]

            if not isinstance(data, list):
                return None

            commands = []
            for item in data:
                turn = str(item.get("turn", "straight")).lower().replace(" ", "_")
                cmd = RoutingCommand(
                    step=int(item.get("step", len(commands) + 1)),
                    instruction=str(item.get("instruction", "")),
                    distance_m=float(item.get("distance_m", 50.0)),
                    turn=turn,
                    surface=str(item.get("surface", "dirt_trail")),
                    canopy=str(item.get("canopy", "moderate")),
                    audio_cue=str(item.get("audio_cue", item.get("instruction", ""))),
                )
                commands.append(cmd)
            return commands
        except Exception as e:
            logger.warning(f"Failed to parse LLM response as JSON: {e}")
            return None

    @staticmethod
    def _deterministic_synthesizer(segments: List[Dict[str, Any]]) -> List[RoutingCommand]:
        """
        High-reliability deterministic synthesizer that produces compliant
        RoutingCommand objects directly from spatial topology segments.
        Ensures 100% operational continuity under zero-GPU or offline conditions.
        """
        turn_phrases = {
            "straight": "Continue straight ahead",
            "slight_right": "Bear slight right",
            "turn_right": "Turn right",
            "sharp_right": "Take a sharp right",
            "slight_left": "Bear slight left",
            "turn_left": "Turn left",
            "sharp_left": "Take a sharp left",
            "u_turn": "Make a full turn around",
        }

        commands = []
        for i, seg in enumerate(segments):
            turn = seg.get("turn_type", "straight")
            dist = round(float(seg.get("distance_m", 50.0)), 1)
            surface = seg.get("surface", "dirt_trail").replace("_", " ")
            canopy_desc = seg.get("canopy_desc", "shaded canopy")
            cardinal = seg.get("cardinal", "ahead")
            way_name = seg.get("way_name", "campus path")

            turn_str = turn_phrases.get(turn, "Continue ahead")
            instruction = (
                f"{turn_str} heading {cardinal} along {way_name} for {int(dist)} meters. "
                f"Surface is {surface} with {canopy_desc}."
            )
            
            # Formulate crisp acoustic cue for speech synthesis
            audio_cue = f"{turn_str} for {int(dist)} meters on the {surface}. {canopy_desc}."

            commands.append(RoutingCommand(
                step=i + 1,
                instruction=instruction,
                distance_m=dist,
                turn=turn,
                surface=surface,
                canopy=canopy_desc,
                audio_cue=audio_cue,
            ))

        return commands
