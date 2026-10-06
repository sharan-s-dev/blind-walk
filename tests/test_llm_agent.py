"""
Unit tests for BlindWalk LLM agent, JSON parsing, and command schema.
"""

import json
import unittest
from engine.llm_agent import RoutingLLMAgent, RoutingCommand

class TestLLMAgent(unittest.TestCase):

    def test_routing_command_model(self):
        cmd = RoutingCommand(
            step=1,
            instruction="Turn sharp left onto the dirt path under neem canopy.",
            distance_m=120.5,
            turn="sharp_left",
            surface="dirt_trail",
            canopy="dense",
            audio_cue="Turn sharp left onto dirt path. Walk 120 meters in shade.",
        )
        self.assertEqual(cmd.step, 1)
        self.assertEqual(cmd.distance_m, 120.5)
        self.assertEqual(cmd.turn, "sharp_left")
        self.assertIn("dirt", cmd.audio_cue)

    def test_json_parser_clean_json(self):
        agent = RoutingLLMAgent()
        raw = json.dumps([
            {
                "step": 1,
                "instruction": "Head north along neem tree avenue for 100 meters.",
                "distance_m": 100.0,
                "turn": "straight",
                "surface": "dirt",
                "canopy": "dense",
                "audio_cue": "Walk straight north 100 meters under dense trees.",
            },
            {
                "step": 2,
                "instruction": "Bear slight right toward herbal garden.",
                "distance_m": 85.0,
                "turn": "slight_right",
                "surface": "gravel",
                "canopy": "moderate",
                "audio_cue": "Bear slight right for 85 meters on gravel trail.",
            }
        ])

        parsed = agent._parse_json_response(raw)
        self.assertIsNotNone(parsed)
        self.assertEqual(len(parsed), 2)
        self.assertEqual(parsed[0].step, 1)
        self.assertEqual(parsed[1].turn, "slight_right")

    def test_json_parser_with_markdown_fences(self):
        agent = RoutingLLMAgent()
        raw = """```json
        [
          {
            "step": 1,
            "instruction": "Take sharp left onto shaded dirt track.",
            "distance_m": 150.0,
            "turn": "sharp_left",
            "surface": "dirt",
            "canopy": "dense",
            "audio_cue": "Sharp left onto shaded dirt track. 150 meters."
          }
        ]
        ```"""
        parsed = agent._parse_json_response(raw)
        self.assertIsNotNone(parsed)
        self.assertEqual(len(parsed), 1)
        self.assertEqual(parsed[0].turn, "sharp_left")

    def test_deterministic_synthesizer_fallback(self):
        agent = RoutingLLMAgent()
        segments = [
            {
                "step_index": 1,
                "distance_m": 120.0,
                "bearing": 45.0,
                "cardinal": "Northeast",
                "turn_type": "straight",
                "surface": "dirt_trail",
                "canopy_desc": "dense tree canopy cover",
                "way_name": "Neem Grove Path",
            },
            {
                "step_index": 2,
                "distance_m": 80.0,
                "bearing": 135.0,
                "cardinal": "Southeast",
                "turn_type": "turn_right",
                "surface": "pedestrian_walkway",
                "canopy_desc": "moderate tree shade",
                "way_name": "Herbal Boundary",
            }
        ]

        commands = agent._deterministic_synthesizer(segments)
        self.assertEqual(len(commands), 2)
        self.assertEqual(commands[0].step, 1)
        self.assertIn("Northeast", commands[0].instruction)
        self.assertIn("dirt trail", commands[0].audio_cue)
        self.assertEqual(commands[1].turn, "turn_right")

if __name__ == "__main__":
    unittest.main()
