#!/usr/bin/env python3
"""
BlindWalk - Core Navigational Engine (blindwalk.py)
==================================================
Air-gapped, zero-GUI spatial routing agent designed for DEV Hacktoberfest.

Flow:
1. Loads localized campus_grid.graphml into memory via NetworkX.
2. Accepts a single natural language terminal input.
3. IMMEDIATELY suppresses all visual terminal output (zero-screen parameter).
4. Employs LangChain + local quantized Ollama to synthesize spatial segments into strict JSON.
5. Sequentially executes instructions through pyttsx3 offline acoustic navigation.
"""

import sys
import argparse
import logging
from pathlib import Path

# Local configuration and engine components
from config import DEFAULT_GRAPH_PATH, FALLBACK_GRAPH_PATH, AUDIT_LOG_FILE
from engine.spatial import SpatialRouter
from engine.llm_agent import RoutingLLMAgent
from engine.audio_output import AcousticNavigator, ZeroScreenSuppressor
from cache_map import fetch_and_cache_osm

# Configure background file logger
logging.basicConfig(
    filename=AUDIT_LOG_FILE,
    filemode="a",
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger("blindwalk.main")


def resolve_graph_file() -> Path:
    """Finds or initializes campus_grid.graphml."""
    if DEFAULT_GRAPH_PATH.exists():
        return DEFAULT_GRAPH_PATH
    if FALLBACK_GRAPH_PATH.exists():
        return FALLBACK_GRAPH_PATH

    print("[NOTICE] campus_grid.graphml not detected. Initializing localized topology...")
    fetch_and_cache_osm(DEFAULT_GRAPH_PATH, force_synthetic=True)
    return DEFAULT_GRAPH_PATH


def run_blindwalk(query: str):
    """Executes the complete BlindWalk pipeline."""
    # 1. Load spatial grid
    graph_path = resolve_graph_file()
    router = SpatialRouter(graph_path)

    # 2. Initialize engines
    llm_agent = RoutingLLMAgent()
    navigator = AcousticNavigator()
    suppressor = ZeroScreenSuppressor(AUDIT_LOG_FILE)

    # 3. ZERO-SCREEN ENFORCEMENT
    # Immediately suppress all visual terminal output after user input
    suppressor.engage()

    try:
        logger.info(f"User Query Received: '{query}'")

        # Acoustic feedback confirming visual suppression
        navigator.announce_activation()

        # Parse query constraints
        constraints = router.parse_query_constraints(query)
        logger.info(f"Parsed Constraints: {constraints}")

        # Compute optimal route topology
        path_nodes = router.generate_route(constraints)
        segments = router.convert_path_to_segments(path_nodes)
        total_dist_m = sum(s["distance_m"] for s in segments)
        logger.info(f"Route Generated: {len(path_nodes)} nodes, {len(segments)} segments, {total_dist_m:.1f} meters")

        # Synthesize via LangChain + local Ollama instance into strict JSON array
        commands = llm_agent.synthesize_routing_plan(
            query=query,
            segments=segments,
            total_distance_m=total_dist_m,
        )
        logger.info(f"Synthesized {len(commands)} acoustic routing commands.")

        # Acoustic route overview
        navigator.announce_route_overview(
            total_m=total_dist_m,
            step_count=len(commands),
            prefer_canopy=constraints.get("prefer_canopy", True),
        )

        # Sequentially execute physical navigation commands through audio
        navigator.execute_commands(commands, pacing_delay_sec=1.5)

        # Announce arrival and completion
        navigator.announce_completion(total_m=total_dist_m)
        logger.info("Navigation session ended successfully.")

    except Exception as e:
        logger.error(f"Navigation exception: {e}", exc_info=True)
        navigator.speak("BlindWalk navigation encountered an unexpected spatial exception. Please verify your surroundings.")

    finally:
        suppressor.release()


def main():
    parser = argparse.ArgumentParser(description="BlindWalk: Zero-GUI Air-Gapped Spatial Routing Agent")
    parser.add_argument(
        "--query",
        type=str,
        default=None,
        help="Natural language routing query (if omitted, prompts interactively)",
    )
    args = parser.parse_args()

    if args.query:
        user_query = args.query.strip()
    else:
        # Initial terminal prompt prior to zero-screen enforcement
        print("=" * 65)
        print("  BLINDWALK: ZERO-GUI AIR-GAPPED SPATIAL NAVIGATOR")
        print("  Jain University Global Campus (Kanakapura Topography)")
        print("=" * 65)
        print("Enter navigational query (e.g. 'Calculate a 2-kilometer loop maximizing tree canopy exposure'):")
        try:
            user_query = input("> ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nExiting.")
            sys.exit(0)

    if not user_query:
        user_query = "Calculate a 2-kilometer loop maximizing tree canopy exposure"

    run_blindwalk(user_query)


if __name__ == "__main__":
    main()
