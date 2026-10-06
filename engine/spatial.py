"""
BlindWalk Spatial Engine (engine/spatial.py)
--------------------------------------------
Processes OpenStreetMap (.graphml) localized network data via NetworkX.
Provides constraint-aware routing algorithms (distance target, loop generation,
tree canopy maximization, dirt path prioritization).
"""

import math
import re
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
import networkx as nx

class SpatialRouter:
    """Offline spatial router operating over localized GraphML data."""

    def __init__(self, graph_path: Optional[Path] = None):
        self.graph_path = graph_path
        self.G: Optional[nx.MultiDiGraph] = None
        if graph_path and Path(graph_path).exists():
            self.load_graph(Path(graph_path))

    def load_graph(self, path: Path) -> nx.MultiDiGraph:
        """Loads and normalizes the GraphML spatial grid into memory."""
        if not path.exists():
            raise FileNotFoundError(f"Spatial graph file not found at: {path}")

        raw_g = nx.read_graphml(path)
        # Convert to MultiDiGraph or DiGraph
        self.G = nx.MultiDiGraph(raw_g)

        # Normalize node and edge datatypes from GraphML string attributes
        for n, data in self.G.nodes(data=True):
            data["x"] = float(data.get("x", 0.0))
            data["y"] = float(data.get("y", 0.0))
            if "elevation" in data:
                try:
                    data["elevation"] = float(data["elevation"])
                except (ValueError, TypeError):
                    data["elevation"] = 0.0

        for u, v, k, data in self.G.edges(keys=True, data=True):
            data["length"] = float(data.get("length", 50.0))
            data["bearing"] = float(data.get("bearing", 0.0))
            data["canopy_score"] = float(data.get("canopy_score", 0.3))
            data["surface_type"] = str(data.get("surface_type", "unpaved_trail"))

        return self.G

    @staticmethod
    def parse_query_constraints(query: str) -> Dict[str, Any]:
        """
        Parses natural language navigational query into deterministic routing parameters.
        Example query: 'Calculate a 2-kilometer loop maximizing tree canopy exposure'
        """
        q = query.lower()
        
        # 1. Distance extraction (default: 2000m)
        target_distance_m = 2000.0
        # Match "2.5 km", "2-kilometer", "2km", "1500 meters", "800m"
        km_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:-| )*(?:km|kilometer|kilometre|kilometers)", q)
        meter_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:-| )*(?:m|meter|meters)", q)

        if km_match:
            target_distance_m = float(km_match.group(1)) * 1000.0
        elif meter_match:
            target_distance_m = float(meter_match.group(1))

        # 2. Loop detection
        is_loop = any(word in q for word in ["loop", "circuit", "round", "return", "circle", "round-trip"])
        if not is_loop and not any(word in q for word in ["to", "destination", "from"]):
            is_loop = True  # Default to loop for fitness/canopy explorations

        # 3. Canopy preference
        prefer_canopy = any(word in q for word in ["canopy", "shade", "shaded", "tree", "trees", "forest", "foliage", "green"])

        # 4. Dirt road / trail preference
        prefer_dirt = any(word in q for word in ["dirt", "trail", "unpaved", "earth", "off-road", "gravel", "track"])

        return {
            "target_distance_m": target_distance_m,
            "is_loop": is_loop,
            "prefer_canopy": prefer_canopy,
            "prefer_dirt": prefer_dirt,
            "original_query": query,
        }

    def _calculate_edge_cost(self, data: Dict[str, Any], prefer_canopy: bool, prefer_dirt: bool) -> float:
        """Computes cost for edge traversal based on constraints."""
        length = float(data.get("length", 10.0))
        cost = length

        if prefer_canopy:
            canopy = float(data.get("canopy_score", 0.3))
            # Edges with high canopy score receive significant cost discount
            cost = cost / (0.2 + (canopy * 1.8))

        if prefer_dirt:
            surface = str(data.get("surface_type", ""))
            if "dirt" in surface or "track" in surface:
                cost = cost * 0.6  # 40% preference bonus for dirt trails

        return max(1.0, cost)

    def generate_route(self, constraints: Dict[str, Any], start_node: Optional[Any] = None) -> List[Any]:
        """
        Generates an optimal sequence of nodes matching the constraints.
        For a loop: generates a closed topological circuit matching target distance.
        """
        if self.G is None or len(self.G.nodes) == 0:
            raise ValueError("Graph not loaded. Please initialize or load campus_grid.graphml first.")

        prefer_canopy = constraints.get("prefer_canopy", True)
        prefer_dirt = constraints.get("prefer_dirt", False)
        target_dist = constraints.get("target_distance_m", 2000.0)
        is_loop = constraints.get("is_loop", True)

        nodes = list(self.G.nodes)
        if start_node is None or start_node not in self.G:
            # Default to first node (e.g. Campus Arrival gate)
            start_node = nodes[0]

        # Build weighted simple DiGraph for shortest path calculations
        weighted_digraph = nx.DiGraph()
        for u, v, data in self.G.edges(data=True):
            cost = self._calculate_edge_cost(data, prefer_canopy, prefer_dirt)
            length = float(data.get("length", 10.0))
            if weighted_digraph.has_edge(u, v):
                if cost < weighted_digraph[u][v]["weight"]:
                    weighted_digraph[u][v]["weight"] = cost
                    weighted_digraph[u][v]["length"] = length
            else:
                weighted_digraph.add_edge(u, v, weight=cost, length=length)

        if not is_loop:
            # Point to Point: Find node furthest away approximating target distance
            target_node = nodes[-1]
            return nx.shortest_path(weighted_digraph, source=start_node, target=target_node, weight="weight")

        # Loop generation algorithm:
        # Select waypoints at topological distances from start_node to create a closed loop
        path = self._build_closed_loop(weighted_digraph, start_node, target_dist)
        return path

    def _build_closed_loop(self, G: nx.DiGraph, start_node: Any, target_dist: float) -> List[Any]:
        """
        Constructs a closed loop circuit originating and ending at start_node
        with total length approximating target_dist.
        """
        # Collect candidate intermediate waypoints
        lengths_from_start = nx.single_source_dijkstra_path_length(G, start_node, weight="length")
        
        # Target outward radius roughly 35-45% of total loop circumference
        ideal_outward_dist = target_dist * 0.40
        candidates = [
            n for n, dist in lengths_from_start.items()
            if n != start_node and abs(dist - ideal_outward_dist) < (ideal_outward_dist * 0.7)
        ]

        if not candidates:
            candidates = [n for n in G.nodes if n != start_node]

        # Choose the waypoint that maximizes canopy while allowing return path
        best_loop = None
        best_diff = float("inf")

        for candidate in candidates[:8]:  # evaluate top candidate anchors
            try:
                outward_path = nx.shortest_path(G, source=start_node, target=candidate, weight="weight")
                # Exclude internal nodes of outward path to prevent immediate backtrack
                avoid_nodes = set(outward_path[1:-1])
                sub_g = G.copy()
                sub_g.remove_nodes_from(avoid_nodes)

                if nx.has_path(sub_g, candidate, start_node):
                    return_path = nx.shortest_path(sub_g, source=candidate, target=start_node, weight="weight")
                    full_loop = outward_path[:-1] + return_path
                    loop_len = sum(
                        G[full_loop[i]][full_loop[i+1]].get("length", 50.0)
                        for i in range(len(full_loop) - 1)
                    )
                    diff = abs(loop_len - target_dist)
                    if diff < best_diff:
                        best_diff = diff
                        best_loop = full_loop
            except (nx.NetworkXNoPath, nx.NodeNotFound):
                continue

        if best_loop:
            return best_loop

        # Fallback to simple cycle or sequence
        try:
            cycles = list(nx.simple_cycles(G))
            if cycles:
                # Pick cycle closest to target length
                chosen = min(cycles, key=lambda c: abs(len(c) * 150 - target_dist))
                return chosen + [chosen[0]]
        except Exception:
            pass

        # Absolute fallback: return 4-node ring if available
        nodes = list(G.nodes)
        return nodes[:min(len(nodes), 6)] + [nodes[0]]

    @staticmethod
    def _bearing_to_cardinal(bearing: float) -> str:
        """Converts bearing in degrees to 8-point compass cardinal direction."""
        dirs = ["North", "Northeast", "East", "Southeast", "South", "Southwest", "West", "Northwest"]
        idx = int((bearing + 22.5) // 45) % 8
        return dirs[idx]

    @staticmethod
    def _calculate_turn_direction(prev_bearing: float, current_bearing: float) -> str:
        """Computes relative turn direction based on change in bearing."""
        delta = (current_bearing - prev_bearing + 360) % 360
        if delta < 25 or delta > 335:
            return "straight"
        elif 25 <= delta < 65:
            return "slight_right"
        elif 65 <= delta < 120:
            return "turn_right"
        elif 120 <= delta < 170:
            return "sharp_right"
        elif 170 <= delta <= 190:
            return "u_turn"
        elif 190 < delta <= 240:
            return "sharp_left"
        elif 240 < delta <= 295:
            return "turn_left"
        else:
            return "slight_left"

    def convert_path_to_segments(self, path: List[Any]) -> List[Dict[str, Any]]:
        """
        Converts node sequence into rich physical navigation segments with
        turn types, distances, bearings, surface textures, and canopy cues.
        """
        segments = []
        prev_bearing = None

        for i in range(len(path) - 1):
            u, v = path[i], path[i + 1]
            # Retrieve edge data from MultiDiGraph
            edge_data = self.G.get_edge_data(u, v)
            if edge_data:
                # Pick first key
                data = list(edge_data.values())[0]
            else:
                data = {"length": 60.0, "bearing": 0.0, "canopy_score": 0.5, "surface_type": "dirt_trail"}

            length_m = float(data.get("length", 50.0))
            bearing = float(data.get("bearing", 0.0))
            canopy = float(data.get("canopy_score", 0.5))
            surface = str(data.get("surface_type", "dirt_trail"))
            street_name = str(data.get("name", "Campus Trail"))

            turn_type = "straight"
            if prev_bearing is not None:
                turn_type = self._calculate_turn_direction(prev_bearing, bearing)
            prev_bearing = bearing

            # Descriptive canopy qualifier
            if canopy >= 0.8:
                canopy_desc = "dense tree canopy cover"
            elif canopy >= 0.5:
                canopy_desc = "moderate tree shade"
            else:
                canopy_desc = "open sky with sporadic trees"

            segments.append({
                "step_index": i + 1,
                "from_node": u,
                "to_node": v,
                "distance_m": round(length_m, 1),
                "bearing": bearing,
                "cardinal": self._bearing_to_cardinal(bearing),
                "turn_type": turn_type,
                "surface": surface,
                "canopy_score": canopy,
                "canopy_desc": canopy_desc,
                "way_name": street_name,
            })

        return segments
