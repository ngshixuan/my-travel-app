export const destinations = [
    {
        city: "Kyoto",
        country: "Japan",
        tags: ["Temples", "Cuisine", "Gardens"],
        gradient: "linear-gradient(160deg, #085041, #1D9E75)",
        accent: "#5DCAA5",
        emoji: "⛩️",
    },
    {
        city: "Lisbon",
        country: "Portugal",
        tags: ["Fado", "Seafood", "Hills"],
        gradient: "linear-gradient(160deg, #3C3489, #7F77DD)",
        accent: "#7F77DD",
        emoji: "🏛️",
    },
    {
        city: "Marrakech",
        country: "Morocco",
        tags: ["Souks", "Riads", "Spice"],
        gradient: "linear-gradient(160deg, #854F0B, #EF9F27)",
        accent: "#EF9F27",
        emoji: "🕌",
    },
    {
        city: "Santorini",
        country: "Greece",
        tags: ["Sunsets", "Wine", "Sea"],
        gradient: "linear-gradient(160deg, #185FA5, #85B7EB)",
        accent: "#378ADD",
        emoji: "🏝️",
    },
    {
        city: "Bali",
        country: "Indonesia",
        tags: ["Temples", "Rice Fields", "Surf"],
        gradient: "linear-gradient(160deg, #0F6E56, #5DCAA5)",
        accent: "#1D9E75",
        emoji: "🌴",
    },
];

export const chips = [
    { icon: "🏖️", label: "Beach getaway" },
    { icon: "🏛️", label: "Cultural cities" },
    { icon: "🏔️", label: "Adventure" },
    { icon: "🌸", label: "Honeymoon" },
    { icon: "👨‍👩‍👧", label: "Family trips" },
    { icon: "🍜", label: "Food & drink" },
];

export const features = [
    {
        icon: "🗺️",
        title: "Smart itinerary builder",
        desc: "Day-by-day plans with opening hours, travel times, and local hidden gems — all tailored to your style.",
        color: "#E1F5EE",
    },
    {
        icon: "💰",
        title: "Budget-aware planning",
        desc: "Set your budget once. Our AI optimises every choice from flights to street food stalls.",
        color: "#EEEDFE",
    },
    {
        icon: "✈️",
        title: "Live flight & hotel data",
        desc: "Real-time pricing and availability woven seamlessly into your trip conversation.",
        color: "#FAEEDA",
    },
    {
        icon: "🤖",
        title: "24/7 AI concierge",
        desc: "Ask anything before or during your trip. Instant answers, zero hold music.",
        color: "#FAECE7",
    },
];

export const testimonials = [
    {
        name: "Amara N.",
        trip: "10 days in Japan",
        text: "I gave wander.ai my budget and interests and it planned a trip I couldn't have dreamed up myself. Every single day was perfect.",
        avatar: "AN",
        color: "#E1F5EE",
        textColor: "#0F6E56",
    },
    {
        name: "Diego R.",
        trip: "Backpacking Southeast Asia",
        text: "As a solo traveller, having an AI that genuinely understands pace and energy was a game-changer. No fluff, just real picks.",
        avatar: "DR",
        color: "#EEEDFE",
        textColor: "#534AB7",
    },
    {
        name: "Priya K.",
        trip: "Family holiday in Greece",
        text: "It balanced the adults and kids perfectly — beach time, ancient ruins, great food. Everyone was happy.",
        avatar: "PK",
        color: "#FAEEDA",
        textColor: "#854F0B",
    },
];

export const chatMessages = [
    {
        role: "ai",
        text: "Hi! I'm your AI travel companion. Where are you dreaming of going? Tell me your dates, budget, and travel style.",
    },
    {
        role: "user",
        text: "I want to visit Bali for 10 days in August. Budget around $2500. I love temples and food.",
    },
    {
        role: "ai",
        text: "Perfect choice! August is lush and vibrant in Bali 🌿 I've built you a 10-day itinerary focused on Ubud's temple circuit, traditional cooking classes, and hidden warungs — all within $2,400.",
        pill: "📋 View your Bali itinerary",
    },
];

export const LLM_MODELS = [
    {
        id: "claude",
        name: "Claude Haiku 4.5",
        shortName: "Haiku 4.6",
        provider: "Anthropic",
        icon: "◆",
    },
    {
        id: "gemini",
        name: "Gemini 3.0 Flash",
        shortName: "Gemini 3 Flash",
        provider: "Google",
        icon: "✦",
    },
];
