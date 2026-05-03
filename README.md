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

