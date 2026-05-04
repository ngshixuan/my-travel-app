import serpapi
import os
import json
import requests
from dotenv import load_dotenv

load_dotenv(override=True)

serp_api_key = os.getenv('SERP_API_KEY')
weather_api_key = os.getenv('WEATHER_API_KEY')

price_function = {
    "name": "get_ticket_details",
    "description": "Get the price of a round-trip ticket between two cities for a given departure date.",
    "parameters": {
        "type": "object",
        "properties": {
            "origin_city": {
                "type": "string",
                "description": "The 3-letter IATA airport code for the city the customer is departing from (e.g., JFK, LHR, SYD).",
            },
            "destination_city": {
                "type": "string",
                "description": "The 3-letter IATA airport code for the city the customer wants to travel to (e.g., CDG, NRT, LAX).",
            },
            "trip-type": {
                "type": "string",
                "description": "The type of trip (1 for round-trip, 2 for one-way). Defaults to 1 if not specified.",
                "default": "1"
            },
            "outbound_date": {
                "type": "string",
                "description": "Departure date in YYYY-MM-DD format (e.g., 2025-06-15).",
            },
            "return_date": {
                "type": "string",
                "description": "Return date in YYYY-MM-DD format for round trips. Omit for one-way.",
            },
        },
        "required": ["origin_city", "destination_city", "outbound_date"],
        "additionalProperties": False,
    },
}

weather_function = {
    "name": "get_weather",
    "description": "Get the weather and condition for a specific city on a specific date.",
    "parameters": {
        "type": "object",
        "properties": {
            "city": {
                "type": "string",
                "description": "The name of the city to get the weather for (e.g., Tokyo, Paris, New York).",
            },
            "date": {
                "type": "string",
                "description": "The date for the weather forecast in yyyy-MM-dd format (e.g., 2026-06-15).",
            }
        },
        "required": ["city", "date"],
        "additionalProperties": False,
    },
}

def get_ticket_details(origin_city, destination_city, outbound_date, return_date, trip_type):
    trip_type = trip_type or "1"
    
    print(f"Tool called for city {origin_city} to {destination_city} and {trip_type} at {outbound_date}")

    if not serp_api_key:
        return json.dumps({"error": "SERP_API_KEY is not configured"})
    
    params = {
        "engine": "google_flights",
        "departure_id": origin_city,
        "arrival_id": destination_city,
        "outbound_date": outbound_date,
        "currency": "USD",
        "type": trip_type,
    }

    if return_date:
        params["return_date"] = return_date
    
    client = serpapi.Client(api_key=serp_api_key)
    results = client.search(params)

    flights = results.get("best_flights") or results.get("other_flights")
    if not flights:
        return json.dumps({"error": f"No flights found from {origin_city} to {destination_city} on {outbound_date}"})

    best = flights[0]

    print(results)
    price = best["price"]
    departure_airport = best["flights"][0]["departure_airport"]["name"]
    arrival_airport = best["flights"][-1]["arrival_airport"]["name"]

    return json.dumps({"price": price, "departure_airport": departure_airport, "arrival_airport": arrival_airport})

def get_weather(city, date):

    print(f"Tool called to get weather for {city} at {date}")

    url = f"http://api.weatherapi.com/v1/future.json?key={weather_api_key}&q={city}&dt={date}"
    response = requests.get(url)

    if response.status_code != 200:
        return json.dumps({"error": f"Could not find weather for {city}"})

    data = response.json()

    location_name = data["location"]["name"]
    country = data["location"]["country"]

    day = data["forecast"]["forecastday"][0]["day"]
    temp_c = day["avgtemp_c"]
    temp_f = day["avgtemp_f"]
    condition = day["condition"]["text"]

    return json.dumps({
        "location": f"{location_name}, {country}",
        "temperature_celsius": temp_c,
        "temperature_fahrenheit": temp_f,
        "condition": condition
    })