import os
import re
import json
from datetime import date
from dotenv import load_dotenv
from openai import OpenAI
from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
from tools import price_function, weather_function, handle_tool_calls
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

    def complete(msgs):
        if 'gemini' in model_id:
            return gemini.chat.completions.create(model="gemini-3-flash-preview", messages=msgs, tools=tools)
        return claude.chat.completions.create(model="claude-haiku-4-5", messages=msgs, tools=tools)

    def complete_stream(msgs):
        if 'gemini' in model_id:
            return gemini.chat.completions.create(model="gemini-3-flash-preview", messages=msgs, tools=tools, stream=True)
        return claude.chat.completions.create(model="claude-haiku-4-5", messages=msgs, tools=tools, stream=True)

    try:
        response = complete(messages)

        while response.choices[0].finish_reason == "tool_calls":
            message = response.choices[0].message
            responses = handle_tool_calls(message)
            messages.append(message)
            messages.extend(responses)
            response = complete(messages)

        # Extract card from the already-fetched non-streaming response
        full_text = response.choices[0].message.content or ""
        card = None
        card_match = re.search(r'TRIP_CARD:(\{.*\})', full_text, re.DOTALL)
        if card_match:
            try:
                card = json.loads(card_match.group(1))
            except Exception:
                pass

        def generate():
            marker = "TRIP_CARD:"
            buffer = ""
            stop_streaming = False

            if card:
                yield f"data: {json.dumps({'card': card})}\n\n"

            for chunk in complete_stream(messages):
                if stop_streaming:
                    break
                delta = chunk.choices[0].delta.content or ""
                if not delta:
                    continue

                buffer += delta
                pos = buffer.find(marker)
                if pos != -1:
                    text_before = buffer[:pos]
                    if text_before:
                        yield f"data: {json.dumps({'token': text_before})}\n\n"
                    stop_streaming = True
                elif len(buffer) > len(marker):
                    safe = buffer[:-len(marker)]
                    yield f"data: {json.dumps({'token': safe})}\n\n"
                    buffer = buffer[-len(marker):]

            if not stop_streaming and buffer:
                yield f"data: {json.dumps({'token': buffer})}\n\n"

            yield "data: [DONE]\n\n"

        resp = Response(stream_with_context(generate()), mimetype="text/event-stream")
        resp.headers["Cache-Control"] = "no-cache"
        resp.headers["X-Accel-Buffering"] = "no"
        return resp
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(port=5000, debug=False)