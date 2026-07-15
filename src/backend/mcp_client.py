"""Synchronous wrapper around the async MCP Streamable-HTTP client.

Flask is synchronous but the MCP client API is asyncio-based, so this module hides
the bridge behind two plain sync methods that main.py can call directly:

- get_openai_tools() -> list: the MCP server's tools converted to OpenAI tool schema
  (cached after the first successful fetch).
- call_tool(name, args) -> str: invoke a tool and return its text result.

Each call opens a short-lived connection to the MCP server (asyncio.run). Tool calls
are infrequent, so the reconnect cost is negligible, and it keeps things robust: no
stale sessions, and a server that is down surfaces as an exception the caller can
handle rather than a hung persistent connection.
"""
import asyncio
import os

from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

MCP_SERVER_URL = os.getenv("MCP_SERVER_URL", "http://127.0.0.1:8000/mcp")


class MCPClient:
    def __init__(self, url: str = MCP_SERVER_URL):
        self._url = url
        self._openai_tools = None

    async def _alist_tools(self):
        async with streamablehttp_client(self._url) as (read, write, _):
            async with ClientSession(read, write) as session:
                await session.initialize()
                resp = await session.list_tools()
                return [
                    {
                        "type": "function",
                        "function": {
                            "name": tool.name,
                            "description": tool.description or "",
                            "parameters": tool.inputSchema,
                        },
                    }
                    for tool in resp.tools
                ]

    async def _acall_tool(self, name: str, args: dict):
        async with streamablehttp_client(self._url) as (read, write, _):
            async with ClientSession(read, write) as session:
                await session.initialize()
                result = await session.call_tool(name, args)
                parts = [
                    block.text
                    for block in result.content
                    if getattr(block, "type", None) == "text"
                ]
                return "".join(parts)

    def get_openai_tools(self):
        """Return the MCP tools as an OpenAI `tools` list (cached after first fetch)."""
        if self._openai_tools is None:
            self._openai_tools = asyncio.run(self._alist_tools())
        return self._openai_tools

    def call_tool(self, name: str, args: dict) -> str:
        """Invoke an MCP tool by name and return its text result (a JSON string)."""
        return asyncio.run(self._acall_tool(name, args))


mcp_client = MCPClient()
