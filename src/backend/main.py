import os
import re
import json
from datetime import date
from dotenv import load_dotenv
from openai import OpenAI
from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
from tools import price_function, weather_function, get_ticket_details, get_weather
from prompts import SYSTEM_PROMPT

load_dotenv(override=True)

google_api_key = os.getenv('GEMINI_API_KEY')
anthropic_api_key = os.getenv('ANTHROPIC_API_KEY')

google_base_url = os.getenv('GEMINI_BASE_URL')
anthropic_base_url = os.getenv('ANTHROPIC_BASE_URL')

if anthropic_api_key:
    print(f"Anthropic API Key exists and begins {anthropic_api_key[:7]}")
else:
    print("Anthropic API Key not set")

if google_api_key:
    print(f"Google API Key exists and begins {google_api_key[:8]}")
else:
    print("Google API Key not set")

gemini = OpenAI(base_url=google_base_url, api_key=google_api_key)
claude = OpenAI(base_url=anthropic_base_url, api_key=anthropic_api_key)

tools = [
    {"type": "function", "function": price_function},
    {"type": "function", "function": weather_function}
]

app = Flask(__name__)
cors_origins = os.getenv('FRONTEND_URL', 'http://localhost:5173').split(',')
CORS(app, origins=cors_origins)

@app.route("/chat", methods=['POST'])
def handle_chat_request():
    body = request.get_json()
    query = body.get("query", "").strip()
    model_id = body.get("model_id", "claude")
    history = body.get("history", [])
    location = body.get("location")

    if not query:
        return jsonify({"error": "query is required"}), 400

    location_context = ""
    if location:
        city = location.get("city")
        if city:
            location_context = f"\n\nUser's departure city: {city}. Use this as the origin for all flight estimates."
        else:
            location_context = f"\n\nUser's current location: lat={location['lat']}, lng={location['lng']}. Infer the nearest major city and use it as the flight origin."

    messages = [
        {"role": "system", "content": f"{SYSTEM_PROMPT}\n\nToday's date is {date.today().isoformat()}.{location_context}"}
    ]

    print("location: " + location_context)
    for msg in history:
        role = "user" if msg["role"] == "user" else "assistant"
        messages.append({"role": role, "content": msg["text"]})

    messages.append({"role": "user", "content": query})

    def complete_stream(msgs):
        if 'gemini' in model_id:
            return gemini.chat.completions.create(model="gemini-3-flash-preview", messages=msgs, tools=tools, stream=True)
        return claude.chat.completions.create(model="claude-sonnet-4-6", messages=msgs, tools=tools, stream=True)

    def generate():
        try:
            current_messages = list(messages)
            marker = "TRIP_CARD:"

            while True:
                accumulated_tool_calls = {}
                content_buffer = ""
                yielded_up_to = 0
                stop_content = False
                finish_reason = None

                for chunk in complete_stream(current_messages):
                    choice = chunk.choices[0]
                    if choice.finish_reason:
                        finish_reason = choice.finish_reason

                    delta = choice.delta

                    if delta.content:
                        content_buffer += delta.content.replace('\r\n', '\n').replace('\r', '\n')
                        if stop_content:
                            continue
                        pos = content_buffer.find(marker)
                        if pos != -1:
                            new_text = content_buffer[yielded_up_to:pos]
                            if new_text:
                                yield f"data: {json.dumps({'token': new_text})}\n\n"
                            stop_content = True
                        else:
                            safe_end = max(yielded_up_to, len(content_buffer) - len(marker))
                            new_text = content_buffer[yielded_up_to:safe_end]
                            if new_text:
                                yield f"data: {json.dumps({'token': new_text})}\n\n"
                                yielded_up_to = safe_end

                    if hasattr(delta, 'tool_calls') and delta.tool_calls:
                        for tc_chunk in delta.tool_calls:
                            idx = tc_chunk.index
                            if idx not in accumulated_tool_calls:
                                accumulated_tool_calls[idx] = {"id": "", "type": "function", "function": {"name": "", "arguments": ""}}
                            if tc_chunk.id:
                                accumulated_tool_calls[idx]["id"] = tc_chunk.id
                            if tc_chunk.function:
                                if tc_chunk.function.name:
                                    accumulated_tool_calls[idx]["function"]["name"] += tc_chunk.function.name
                                if tc_chunk.function.arguments:
                                    accumulated_tool_calls[idx]["function"]["arguments"] += tc_chunk.function.arguments

                if finish_reason == "tool_calls":
                    if not stop_content and len(content_buffer) > yielded_up_to:
                        tail = content_buffer[yielded_up_to:]
                        print("=== TOOL CALL TAIL ===", repr(tail))
                        yield f"data: {json.dumps({'token': tail})}\n\n"

                    tool_call_list = [accumulated_tool_calls[i] for i in sorted(accumulated_tool_calls.keys())]
                    current_messages.append({"role": "assistant", "content": None, "tool_calls": tool_call_list})

                    for tc in tool_call_list:
                        name = tc["function"]["name"]
                        args = json.loads(tc["function"]["arguments"])
                        if name == "get_ticket_details":
                            result = get_ticket_details(args.get("origin_city"), args.get("destination_city"), args.get("outbound_date"), args.get("return_date"), args.get("trip-type"))
                        elif name == "get_weather":
                            result = get_weather(args.get("city"), args.get("date"))
                        else:
                            result = json.dumps({"error": f"Unknown tool: {name}"})
                        current_messages.append({"role": "tool", "content": result, "tool_call_id": tc["id"]})
                else:
                    if not stop_content and len(content_buffer) > yielded_up_to:
                        yield f"data: {json.dumps({'token': content_buffer[yielded_up_to:]})}\n\n"

                    card_match = re.search(r'TRIP_CARD:(\{.*\})', content_buffer, re.DOTALL)
                    if card_match:
                        try:
                            yield f"data: {json.dumps({'card': json.loads(card_match.group(1))})}\n\n"
                        except Exception:
                            pass
                    break

            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            yield "data: [DONE]\n\n"

    resp = Response(stream_with_context(generate()), mimetype="text/event-stream")
    resp.headers["Cache-Control"] = "no-cache"
    resp.headers["X-Accel-Buffering"] = "no"
    return resp

if __name__ == "__main__":
    app.run(port=5000, debug=False)