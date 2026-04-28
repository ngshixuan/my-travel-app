import serpapi
import os
from dotenv import load_dotenv

load_dotenv(override=True)

serp_api_key = os.getenv('SERP_API_KEY')

price_function = {
    "name": "get_ticket_price",
    "description": "Get the price of a round-trip ticket between two cities for a given trip duration.",
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
            "trip_duration_days": {
                "type": "integer",
                "description": "The number of days for the round trip (used to determine the return date)",
                "minimum": 1,
            },
        },
        "required": ["origin_city", "destination_city"],
        "additionalProperties": False,
    },
}

def handle_get_ticket_price():
    return

def get_ticket_price(origin_city, destination_city):
    client = serpapi.Client(api_key=serp_api_key)
    results = client.search({
        "engine": "google_flights",
        "departure_id": origin_city,
        "arrival_id": destination_city,
        "currency": "USD",
        "type": "2",
    })

    best_flights = results["best_flights"]

    print(best_flights)