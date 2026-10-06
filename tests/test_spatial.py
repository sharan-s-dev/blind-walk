"""
Unit tests for BlindWalk spatial routing engine.
"""

import unittest
import tempfile
from pathlib import Path
from engine.spatial import SpatialRouter
from cache_map import generate_synthetic_campus_graph, calculate_bearing, calculate_haversine_distance

class TestSpatialEngine(unittest.TestCase):

    def test_haversine_distance(self):
        dist = calculate_haversine_distance(12.0, 77.0, 13.0, 77.0)
        self.assertTrue(110000 < dist < 112000)

    def test_calculate_bearing(self):
        # Due North
        b_north = calculate_bearing(12.0, 77.0, 13.0, 77.0)
        self.assertTrue(abs(b_north - 0.0) < 1.0 or abs(b_north - 360.0) < 1.0)

        # Due East
        b_east = calculate_bearing(12.0, 77.0, 12.0, 78.0)
        self.assertTrue(abs(b_east - 90.0) < 1.0)

    def test_query_constraints_parsing(self):
        q1 = "Calculate a 2-kilometer loop maximizing tree canopy exposure"
        c1 = SpatialRouter.parse_query_constraints(q1)
        self.assertEqual(c1["target_distance_m"], 2000.0)
        self.assertTrue(c1["is_loop"])
        self.assertTrue(c1["prefer_canopy"])

        q2 = "Find a 1.5 km dirt trail walk"
        c2 = SpatialRouter.parse_query_constraints(q2)
        self.assertEqual(c2["target_distance_m"], 1500.0)
        self.assertTrue(c2["prefer_dirt"])

        q3 = "800m shaded path"
        c3 = SpatialRouter.parse_query_constraints(q3)
        self.assertEqual(c3["target_distance_m"], 800.0)
        self.assertTrue(c3["prefer_canopy"])

    def test_synthetic_graph_generation_and_loop_routing(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            G = generate_synthetic_campus_graph()
            self.assertGreaterEqual(len(G.nodes), 8)
            self.assertGreaterEqual(len(G.edges), 10)

            graphml_file = Path(tmp_dir) / "test_campus.graphml"
            import networkx as nx
            nx.write_graphml(G, graphml_file)

            router = SpatialRouter(graphml_file)
            self.assertIsNotNone(router.G)
            self.assertEqual(len(router.G.nodes), len(G.nodes))

            constraints = router.parse_query_constraints("Calculate a 2-kilometer loop maximizing tree canopy exposure")
            path = router.generate_route(constraints)

            self.assertGreaterEqual(len(path), 3)
            # Check closed loop: start node equals end node
            self.assertEqual(path[0], path[-1])

            segments = router.convert_path_to_segments(path)
            self.assertEqual(len(segments), len(path) - 1)

            first_seg = segments[0]
            self.assertIn("distance_m", first_seg)
            self.assertIn("turn_type", first_seg)
            self.assertIn("canopy_desc", first_seg)
            self.assertIn("surface", first_seg)
            self.assertGreater(first_seg["distance_m"], 0)

if __name__ == "__main__":
    unittest.main()
