# wander.ai

An AI-powered travel planning web app that generates personalized day-by-day itineraries in seconds — complete with real-time flight prices, weather forecasts, and budget breakdowns.

![React](https://img.shields.io/badge/React-19-blue?logo=react) ![Flask](https://img.shields.io/badge/Flask-3.1-lightgrey?logo=flask) ![Claude](https://img.shields.io/badge/Claude-Sonnet_4.6-orange) ![Gemini](https://img.shields.io/badge/Gemini-3.0_Flash-blue?logo=google)

## Features

- **AI itinerary generation** — instant 5–7 day trip plans with day-by-day activities, local tips, and highlights
- **Real-time flight pricing** — live ticket data via SerpAPI based on your current location
- **Weather forecasts** — destination weather integrated directly into trip plans
- **Budget breakdowns** — cost estimates for flights, accommodation, food, and activities
- **Multi-model support** — switch between Claude Sonnet 4.6 and Gemini 3.0 Flash
- **Streaming responses** — real-time AI output via Server-Sent Events
- **Geolocation detection** — automatically infers your departure city

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, React Markdown |
| Backend | Python Flask, Flask-CORS |
| AI | Anthropic Claude API, Google Gemini API |
| Flight data | SerpAPI |
| Weather | WeatherAPI |
| Geolocation | OpenStreetMap Nominatim |
| Production | Gunicorn |

## Project Structure
my-travel-app/
├── src/
│   ├── main.jsx
│   ├── frontend/
│   │   ├── App.jsx         # Main UI (hero, chat, destinations)
│   │   ├── App.css
│   │   └── data.js         # Static data (destinations, models, chips)
│   └── backend/
│       ├── main.py         # Flask server & /chat endpoint
│       ├── prompts.py      # AI system prompt
│       ├── tools.py        # Tool definitions (flights, weather)
│       └── requirements.txt
├── index.html
├── vite.config.js
└── package.json



## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+

### 1. Clone the repo

```bash
git clone https://github.com/ngshixuan/my-travel-app.git
cd my-travel-app
2. Set up the backend

cd src/backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
Create src/backend/.env:


ANTHROPIC_API_KEY=your_anthropic_api_key
GEMINI_API_KEY=your_gemini_api_key
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
SERP_API_KEY=your_serpapi_key
WEATHER_API_KEY=your_weatherapi_key
FRONTEND_URL=http://localhost:5173
Start the Flask server:


python main.py
# Runs on http://localhost:5000
3. Set up the frontend

# From the project root
npm install
npm run dev
# Runs on http://localhost:5173
Optionally create a .env.local in the project root to override the backend URL:


VITE_API_URL=http://localhost:5000
API Keys
Key	Where to get it
ANTHROPIC_API_KEY	console.anthropic.com
GEMINI_API_KEY	aistudio.google.com
SERP_API_KEY	serpapi.com
WEATHER_API_KEY	weatherapi.com
Scripts

npm run dev       # Start Vite dev server
npm run build     # Build for production (outputs to dist/)
npm run preview   # Preview production build
npm run lint      # Run ESLint
Production Deployment

# Build the frontend
npm run build

# Serve the dist/ folder via nginx or a CDN

# Run backend with Gunicorn
gunicorn -w 4 src.backend.main:app
License
MIT
