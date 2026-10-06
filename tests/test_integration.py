"""
Integration tests for BlindWalk Zero-Screen Suppressor and End-to-End flow.
"""

import sys
import unittest
import tempfile
from pathlib import Path
from engine.audio_output import ZeroScreenSuppressor
from engine.spatial import SpatialRouter
from engine.llm_agent import RoutingLLMAgent
from cache_map import generate_synthetic_campus_graph

class TestIntegration(unittest.TestCase):

    def test_zero_screen_suppressor(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            log_file = Path(tmp_dir) / "test_audit.log"
            suppressor = ZeroScreenSuppressor(log_file)

            orig_stdout = sys.stdout
            suppressor.engage()

            # Any printed text should NOT go to terminal stdout
            print("Zero screen secret visual text")

            suppressor.release()
            self.assertEqual(sys.stdout, orig_stdout)

            # Verify text was diverted to log file
            content = log_file.read_text(encoding="utf-8")
            self.assertIn("Zero screen secret visual text", content)

    def test_end_to_end_pipeline(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            G = generate_synthetic_campus_graph()
            graph_file = Path(tmp_dir) / "campus_grid.graphml"
            import networkx as nx
            nx.write_graphml(G, graph_file)

            # 1. Router loads graph
            router = SpatialRouter(graph_file)
            query = "Calculate a 2-kilometer loop maximizing tree canopy exposure"

            # 2. Constraints parsed
            constraints = router.parse_query_constraints(query)
            self.assertTrue(constraints["is_loop"])

            # 3. Path generated
            path = router.generate_route(constraints)
            self.assertGreater(len(path), 2)
            self.assertEqual(path[0], path[-1])

            # 4. Segments converted
            segments = router.convert_path_to_segments(path)
            total_m = sum(s["distance_m"] for s in segments)
            self.assertGreater(total_m, 0)

            # 5. LLM agent synthesizes commands
            agent = RoutingLLMAgent()
            commands = agent.synthesize_routing_plan(query, segments, total_m)

            self.assertEqual(len(commands), len(segments))
            for cmd in commands:
                self.assertNotEqual(cmd.audio_cue, "")
                self.assertGreater(cmd.distance_m, 0)

if __name__ == "__main__":
    unittest.main()
