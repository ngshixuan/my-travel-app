"""Standalone MCP server exposing wander.ai's travel tools.

Runs as its own process over Streamable HTTP (default http://127.0.0.1:8000/mcp).
The Flask backend connects to it as an MCP client; the same URL can also be used
by any other MCP client (Claude Desktop, Cursor, Claude Code).

The actual implementations live in tools.py and are reused unchanged; this module
only registers them as MCP tools. FastMCP derives each tool's JSON schema from the
type hints and docstring below.
"""
import os

from mcp.server.fastmcp import FastMCP

import tools

host = os.getenv("MCP_HOST", "127.0.0.1")
port = int(os.getenv("MCP_PORT", "8000"))

mcp = FastMCP("wander-travel-tools", host=host, port=port)


@mcp.tool()
def get_weather(city: str, date: str) -> str:
    """Get the weather and condition for a specific city on a specific date.

    Args:
        city: The name of the city (e.g., Tokyo, Paris, New York).
        date: The date for the forecast in YYYY-MM-DD format.
    """
    return tools.get_weather(city, date)


@mcp.tool()
def get_ticket_details(
    origin_city: str,
    destination_city: str,
    outbound_date: str,
    return_date: str = "",
    trip_type: str = "1",
) -> str:
    """Get the price of a ticket between two cities for a given departure date.

    Args:
        origin_city: 3-letter IATA airport code to depart from (e.g., JFK, LHR, SYD).
        destination_city: 3-letter IATA airport code to travel to (e.g., CDG, NRT, LAX).
        outbound_date: Departure date in YYYY-MM-DD format.
        return_date: Return date in YYYY-MM-DD format for round trips. Omit for one-way.
        trip_type: '1' for round-trip, '2' for one-way. Defaults to '1'.
    """
    return tools.get_ticket_details(
        origin_city, destination_city, outbound_date, return_date or None, trip_type
    )


if __name__ == "__main__":
    mcp.run(transport="streamable-http")
