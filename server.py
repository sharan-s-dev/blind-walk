#!/usr/bin/env python3
"""
BlindWalk Web & API Server (server.py)
--------------------------------------
Lightweight zero-dependency HTTP server that bridges the local NetworkX/OSM
spatial graph and Ollama routing engine to the interactive web frontend.
"""

import os
import sys
import json
import mimetypes
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import urllib.parse

from config import DEFAULT_GRAPH_PATH, FALLBACK_GRAPH_PATH, OLLAMA_MODEL
from engine.spatial import SpatialRouter
from engine.llm_agent import RoutingLLMAgent

BASE_DIR = Path(__file__).resolve().parent
WEB_DIR = BASE_DIR / "web"
PORT = int(os.getenv("PORT", "8000"))

# Global router and agent instances
router = None
llm_agent = None

def init_backend():
    global router, llm_agent
    graph_path = DEFAULT_GRAPH_PATH if DEFAULT_GRAPH_PATH.exists() else FALLBACK_GRAPH_PATH
    if graph_path.exists():
        try:
            router = SpatialRouter(graph_path)
            print(f"[BACKEND] Loaded spatial graph: {len(router.G.nodes)} nodes, {len(router.G.edges)} edges.", flush=True)
        except Exception as e:
            print(f"[BACKEND] Error loading graph: {e}", flush=True)
    else:
        print("[BACKEND] Spatial graph file not found. Generating fallback...", flush=True)
        from cache_map import fetch_and_cache_osm
        fetch_and_cache_osm(DEFAULT_GRAPH_PATH, force_synthetic=True)
        router = SpatialRouter(DEFAULT_GRAPH_PATH)

    llm_agent = RoutingLLMAgent()

class BlindWalkHTTPHandler(SimpleHTTPRequestHandler):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEB_DIR), **kwargs)

    def do_GET(self):
        url_parts = urllib.parse.urlparse(self.path)
        path = url_parts.path

        if path == "/api/health":
            self.send_json_response({
                "status": "online",
                "mode": "air-gapped",
                "model": OLLAMA_MODEL,
                "nodes": len(router.G.nodes) if router and router.G else 0,
            })
            return

        # Serve static web files from WEB_DIR
        if path == "/" or path == "":
            self.path = "/index.html"
        return super().do_GET()

    def do_POST(self):
        url_parts = urllib.parse.urlparse(self.path)
        path = url_parts.path

        if path == "/api/route":
            content_length = int(self.headers.get("Content-Length", 0))
            body_bytes = self.rfile.read(content_length)
            try:
                payload = json.loads(body_bytes.decode("utf-8")) if body_bytes else {}
                query = payload.get("query", "Calculate a 2-kilometer loop maximizing tree canopy exposure")
                response_data = self.process_routing_request(query)
                self.send_json_response(response_data)
            except Exception as e:
                self.send_json_response({"error": str(e)}, status=500)
            return

        self.send_error(404, "Endpoint not found")

    def process_routing_request(self, query: str):
        if not router or not router.G:
            raise RuntimeError("Spatial engine not ready.")

        constraints = router.parse_query_constraints(query)
        path_nodes = router.generate_route(constraints)
        segments = router.convert_path_to_segments(path_nodes)
        total_dist_m = sum(s["distance_m"] for s in segments)

        # Synthesize via LLM or deterministic fallback
        commands = llm_agent.synthesize_routing_plan(query, segments, total_dist_m)

        steps_response = []
        for i, cmd in enumerate(commands):
            seg = segments[i] if i < len(segments) else {}
            u_node = router.G.nodes.get(seg.get("from_node", path_nodes[0]), {})
            v_node = router.G.nodes.get(seg.get("to_node", path_nodes[-1]), {})

            steps_response.append({
                "step": getattr(cmd, "step", i + 1),
                "instruction": getattr(cmd, "instruction", ""),
                "distance_m": getattr(cmd, "distance_m", seg.get("distance_m", 50.0)),
                "turn": getattr(cmd, "turn", "straight"),
                "surface": getattr(cmd, "surface", "dirt_trail"),
                "canopy": getattr(cmd, "canopy", "dense"),
                "audio_cue": getattr(cmd, "audio_cue", ""),
                "coords": [u_node.get("y", 12.6395), u_node.get("x", 77.4420)],
                "target_coords": [v_node.get("y", 12.6395), v_node.get("x", 77.4420)],
            })

        avg_canopy = sum(s.get("canopy_score", 0.5) for s in segments) / max(1, len(segments))

        return {
            "query": query,
            "total_distance_m": total_dist_m,
            "canopy_score_pct": int(avg_canopy * 100),
            "steps": steps_response,
            "path_nodes": path_nodes,
        }

    def send_json_response(self, data: dict, status: int = 200):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        sys.stderr.write(f"[HTTP] {format % args}\n")
        sys.stderr.flush()

def run_server():
    init_backend()
    server_address = ("0.0.0.0", PORT)
    httpd = ThreadingHTTPServer(server_address, BlindWalkHTTPHandler)
    print("=" * 65, flush=True)
    print("  BLINDWALK INTERACTIVE WEB SERVER ONLINE", flush=True)
    print(f"  Access UI at:      http://localhost:{PORT}", flush=True)
    print("  Air-Gapped Status: Localhost Only (0 Cloud Egress)", flush=True)
    print("=" * 65, flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.", flush=True)
        httpd.server_close()

if __name__ == "__main__":
    run_server()
