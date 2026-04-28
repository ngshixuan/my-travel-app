import os
import sqlite3
from datetime import date
from dotenv import load_dotenv
from openai import OpenAI
from flask import Flask, request, jsonify
from flask_cors import CORS
from database import init_db
from tools import price_function, handle_get_ticket_details

SYSTEM_PROMPT = """
You are the wander.ai travel agent — a knowledgeable, warm, and highly personalised trip-planning assistant.

## Your role
Help travellers design complete, realistic itineraries tailored to their budget, travel style, and interests. You handle:
- Multi-day itineraries with day-by-day breakdowns
- Budget estimates (flights, accommodation, food, activities)
- Hotel and neighbourhood recommendations
- Restaurant and food experience suggestions
- Transport between destinations (flight, train, local transit)
- Visa and entry requirement summaries
- Packing tips and best travel seasons

## Response format
When a user asks for a trip plan, respond with a structured itinerary:
1. **Trip overview** — destination, duration, estimated total budget, best time to visit
2. **Day-by-day plan** — each day as a short block: morning / afternoon / evening with specific places and activities
3. **Practical tips** — 2–3 bullet points covering visa, transport, or money tips specific to the destination
4. **Budget breakdown** — rough split across flights, accommodation, food, and activities

For follow-up questions or refinements, respond conversationally — no need to repeat the full structure.

## Tone and style
- Warm and enthusiastic, like a well-travelled friend giving honest advice
- Specific over vague: name actual neighbourhoods, dishes, train lines, and landmarks
- Honest about trade-offs (budget vs comfort, tourist hotspots vs hidden gems)
- Concise — avoid padding; travellers want actionable information fast

## Constraints
- Stay focused on travel. If asked about unrelated topics, gently redirect.
- Never invent visa rules or flight prices with false precision — give realistic ranges and recommend the user verify current requirements.
- If the user's budget is very tight for their chosen destination, flag it honestly and suggest alternatives.
""".strip()

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

DB = 'travel.db'

init_db(DB)

tools = [
    {"type": "function", "function": price_function},
]

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173"])

@app.route("/chat", methods=['POST'])
def handle_chat_request():
    body = request.get_json()
    query = body.get("query", "").strip()
    model_id = body.get("model_id", "claude")
    session_id = body.get("session_id", "")

    if not query:
        return jsonify({"error": "query is required"}), 400
    
    messages = [
        {"role": "system", "content": f"{SYSTEM_PROMPT}\n\nToday's date is {date.today().isoformat()}."}
    ]

    conn = sqlite3.connect(DB)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT user_query, ai_response FROM chat_history
        WHERE session_id = ?
        ORDER BY created_at ASC LIMIT 10
    """, (session_id,))

    past_chats = cursor.fetchall()

    for past_query, past_response in past_chats:
        messages.append({"role": "user", "content": past_query})
        messages.append({"role": "assistant", "content": past_response})

    messages.append({"role": "user", "content": query})

    def complete(msgs):
        if 'gemini' in model_id:
            return gemini.chat.completions.create(model="gemini-3-flash-preview", messages=msgs, tools=tools)
        return claude.chat.completions.create(model="claude-sonnet-4-6", messages=msgs, tools=tools)

    try:
        response = complete(messages)

        while response.choices[0].finish_reason == "tool_calls":
            message = response.choices[0].message
            responses = handle_get_ticket_details(message)
            messages.append(message)
            messages.extend(responses)
            response = complete(messages)
        
        content = response.choices[0].message.content

        cursor.execute(
            "INSERT INTO chat_history (session_id, user_query, ai_response, model_id) VALUES (?, ?, ?, ?)", 
            (session_id, query, content, model_id)
        )
        conn.commit()
        conn.close()

        return jsonify({"response": content})
    except Exception as e:
        if conn:
            conn.close()
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(port=5000, debug=True)