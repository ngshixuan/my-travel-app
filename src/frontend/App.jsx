import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./App.css";
import {
    destinations,
    chips,
    features,
    testimonials,
    chatMessages,
    LLM_MODELS,
} from "./data";

const DEFAULT_HERO_CARD = {
    city: "Kyoto",
    country: "Japan",
    emoji: "⛩️",
    days: 12,
    tags: ["Temples", "Cuisine", "Gardens"],
    highlights: [
        { day: "Day 1–2", activity: "Fushimi Inari & Gion" },
        { day: "Day 3–4", activity: "Arashiyama & tea ceremony" },
        { day: "Day 5", activity: "Nishiki Market food tour" },
        { day: "Day 6–8", activity: "Philosopher's Path & Nanzenji" },
        { day: "Day 9–12", activity: "Day trip to Nara & Osaka" },
    ],
    budget: "$2,840",
};

const ChatMessage = React.memo(({ msg }) => (
    <div className={`hero-thread-bubble hero-thread-bubble--${msg.role}`}>
        {msg.role === "ai" ? (
            <div className="md">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
            </div>
        ) : (
            msg.text
        )}
    </div>
));

export default function LandingPage() {
    const [query, setQuery] = useState("");
    const [activeChip, setActiveChip] = useState(null);
    const [chatVisible, setChatVisible] = useState(false);
    const [visibleMsgs, setVisibleMsgs] = useState(1);
    const [heroVisible, setHeroVisible] = useState(false);
    const [selectedModel, setSelectedModel] = useState(LLM_MODELS[0]);
    const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [generatingCard, setGeneratingCard] = useState(false);
    const [heroCard, setHeroCard] = useState(DEFAULT_HERO_CARD);
    const [heroCardVersion, setHeroCardVersion] = useState(0);
    const [copied, setCopied] = useState(false);
    const [lastUserMsg, setLastUserMsg] = useState(null);
    const [demoInput, setDemoInput] = useState("");

    const chatRef = useRef(null);
    const modelSelectorRef = useRef(null);
    const heroThreadRef = useRef(null);
    const searchInputRef = useRef(null);

    const [location, setLocation] = useState(null);

    useEffect(() => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(async (pos) => {
            const { latitude: lat, longitude: lng } = pos.coords;
            try {
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
                    { headers: { "Accept-Language": "en" } },
                );
                const data = await res.json();
                const city =
                    data.address.city ||
                    data.address.town ||
                    data.address.village ||
                    data.address.state ||
                    "Unknown";
                setLocation({ lat, lng, city });
            } catch {
                setLocation({ lat, lng });
            }
        });
    }, []);

    useEffect(() => {
        const el = searchInputRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${el.scrollHeight}px`;
    }, [query]);

    // overrideText: optional text to send instead of the query state
    // historyOverride: optional history to use instead of messages state (for retry)
    const handleLLMCall = async (overrideText, historyOverride) => {
        const userText = (overrideText !== undefined ? overrideText : query).trim();
        if (!userText || loading) return;
        const currentHistory = historyOverride !== undefined ? historyOverride : messages;
        setLastUserMsg(userText);
        setMessages((prev) => [...prev, { role: "user", text: userText }]);
        setQuery("");
        setLoading(true);
        setGeneratingCard(true);
        try {
            const apiUrl =
                import.meta.env.VITE_API_URL || "http://localhost:5000";
            const response = await fetch(`${apiUrl}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query: userText,
                    model_id: selectedModel.id,
                    history: currentHistory.filter((m) => !m.isError),
                    location: location,
                }),
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let firstToken = true;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop();

                for (const line of lines) {
                    if (!line.startsWith("data: ")) continue;
                    const data = line.slice(6);
                    if (data === "[DONE]") break;

                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.token !== undefined) {
                            if (firstToken) {
                                setLoading(false);
                                setMessages((prev) => [
                                    ...prev,
                                    { role: "ai", text: parsed.token },
                                ]);
                                firstToken = false;
                            } else {
                                setMessages((prev) => [
                                    ...prev.slice(0, -1),
                                    {
                                        role: "ai",
                                        text:
                                            prev[prev.length - 1].text +
                                            parsed.token,
                                    },
                                ]);
                            }
                        }
                        if (parsed.card) {
                            setHeroCard(parsed.card);
                            setHeroCardVersion((v) => v + 1);
                            setGeneratingCard(false);
                        }
                    } catch {
                        // ignore malformed SSE lines
                    }
                }
            }

            if (firstToken) {
                setMessages((prev) => [...prev, { role: "ai", text: "" }]);
            }
        } catch {
            setMessages((prev) => [
                ...prev,
                { role: "ai", text: "Something went wrong. Please try again.", isError: true },
            ]);
        } finally {
            setLoading(false);
            setGeneratingCard(false);
        }
    };

    const handleRetry = () => {
        if (!lastUserMsg) return;
        const cleanHistory = messages.slice(0, -2);
        setMessages(cleanHistory);
        handleLLMCall(lastUserMsg, cleanHistory);
    };

    const handleNewTrip = () => {
        setMessages([]);
        setQuery("");
        setHeroCard(DEFAULT_HERO_CARD);
        setHeroCardVersion(0);
        setLastUserMsg(null);
        setActiveChip(null);
    };

    const handleCopyCard = async () => {
        const text = [
            `${heroCard.emoji} ${heroCard.city}, ${heroCard.country} — ${heroCard.days} days`,
            `Tags: ${heroCard.tags.join(", ")}`,
            "",
            "AI Generated Plan:",
            ...heroCard.highlights.map((h) => `${h.day}: ${h.activity}`),
            "",
            `Estimated budget: ${heroCard.budget}`,
        ].join("\n");
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDemoSearch = () => {
        const text = demoInput.trim();
        if (text) setQuery(text);
        setDemoInput("");
        window.scrollTo({ top: 0, behavior: "smooth" });
        setTimeout(() => searchInputRef.current?.focus(), 500);
    };

    useEffect(() => {
        if (heroThreadRef.current) {
            heroThreadRef.current.scrollTop =
                heroThreadRef.current.scrollHeight;
        }
    }, [messages, loading]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                modelSelectorRef.current &&
                !modelSelectorRef.current.contains(e.target)
            ) {
                setModelDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const t = setTimeout(() => setHeroVisible(true), 100);
        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        const obs = new IntersectionObserver(
            ([e]) => {
                if (e.isIntersecting) {
                    setChatVisible(true);
                    obs.disconnect();
                }
            },
            { threshold: 0.3 },
        );
        if (chatRef.current) obs.observe(chatRef.current);
        return () => obs.disconnect();
    }, []);

    useEffect(() => {
        if (!chatVisible) return;
        if (visibleMsgs < chatMessages.length) {
            const t = setTimeout(() => setVisibleMsgs((v) => v + 1), 900);
            return () => clearTimeout(t);
        }
    }, [chatVisible, visibleMsgs]);

    return (
        <div className="page-root">
            {/* NAV */}
            <nav>
                <div className="nav-logo">
                    wander<span className="nav-logo-dot">.</span>ai
                </div>
                <div className="nav-links">
                    {["Explore", "My trips", "Inspiration", "Pricing"].map(
                        (l) => (
                            <span key={l} className="nav-link">
                                {l}
                            </span>
                        ),
                    )}
                    <button className="cta-btn">Plan a trip</button>
                </div>
            </nav>

            {/* HERO */}
            <section className="hero-section">
                <div>
                    {messages.length > 0 || loading ? (
                        <>
                            <div className="hero-thread-topbar">
                                <button
                                    className="new-trip-btn"
                                    onClick={handleNewTrip}
                                >
                                    ← New trip
                                </button>
                            </div>
                            <div className="hero-thread" ref={heroThreadRef}>
                                {messages.map((msg, i) => (
                                    <div
                                        key={i}
                                        className={`hero-thread-msg${msg.role === "user" ? " hero-thread-msg--user" : ""}`}
                                    >
                                        {msg.role === "ai" && (
                                            <div className="hero-thread-avatar">✦</div>
                                        )}
                                        <div className="hero-thread-msg-inner">
                                            <ChatMessage msg={msg} />
                                            {msg.isError && (
                                                <button
                                                    className="retry-btn"
                                                    onClick={handleRetry}
                                                >
                                                    ↻ Retry
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {loading && (
                                    <div className="hero-thread-msg">
                                        <div className="hero-thread-avatar">✦</div>
                                        <div className="hero-thread-bubble hero-thread-bubble--ai hero-thread-typing">
                                            <span className="ai-reply-dot" />
                                            <span className="ai-reply-dot" />
                                            <span className="ai-reply-dot" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="headings">
                            <div
                                className={`fade-up ${heroVisible ? "visible" : ""}`}
                                style={{ transitionDelay: "0ms" }}
                            >
                                <span className="hero-badge">
                                    AI-powered travel planning
                                </span>
                            </div>
                            <div
                                className={`fade-up ${heroVisible ? "visible" : ""}`}
                                style={{ transitionDelay: "100ms" }}
                            >
                                <h1 className="hero-title">
                                    Your next trip,{" "}
                                    <em className="hero-title-em">designed</em>
                                    <br />
                                    just for you.
                                </h1>
                            </div>
                            <div
                                className={`fade-up ${heroVisible ? "visible" : ""}`}
                                style={{ transitionDelay: "200ms" }}
                            >
                                <p className="hero-subtitle">
                                    Tell us where you dream of going. Our AI
                                    builds a personalised itinerary — flights,
                                    hotels, day plans — in seconds.
                                </p>
                            </div>
                        </div>
                    )}

                    <div
                        className={`fade-up ${heroVisible ? "visible" : ""}`}
                        style={{ transitionDelay: "300ms" }}
                    >
                        <div className="hero-search-box">
                            <textarea
                                ref={searchInputRef}
                                rows={1}
                                className="search-input"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleLLMCall();
                                    }
                                }}
                                placeholder={
                                    messages.length > 0
                                        ? "Ask a follow-up..."
                                        : 'Try "10 days in Japan"'
                                }
                            />
                            <div className="model-selector-divider" />
                            <div
                                className="model-selector"
                                ref={modelSelectorRef}
                            >
                                <button
                                    className={`model-selector-trigger${modelDropdownOpen ? " model-selector-trigger--open" : ""}`}
                                    onClick={() =>
                                        setModelDropdownOpen((o) => !o)
                                    }
                                    onKeyDown={(e) => {
                                        if (e.key === "Escape") setModelDropdownOpen(false);
                                        if (e.key === "ArrowDown") { e.preventDefault(); setModelDropdownOpen(true); }
                                    }}
                                    aria-haspopup="listbox"
                                    aria-expanded={modelDropdownOpen}
                                >
                                    <span className="model-selector-icon">
                                        {selectedModel.icon}
                                    </span>
                                    <span>{selectedModel.shortName}</span>
                                    <span
                                        className={`model-selector-chevron${modelDropdownOpen ? " model-selector-chevron--open" : ""}`}
                                    >
                                        ▾
                                    </span>
                                </button>
                                {modelDropdownOpen && (
                                    <div className="model-dropdown" role="listbox">
                                        {LLM_MODELS.map((model) => (
                                            <button
                                                key={model.id}
                                                role="option"
                                                aria-selected={selectedModel.id === model.id}
                                                className={`model-option${selectedModel.id === model.id ? " model-option--active" : ""}`}
                                                onClick={() => {
                                                    setSelectedModel(model);
                                                    setModelDropdownOpen(false);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Escape") setModelDropdownOpen(false);
                                                }}
                                            >
                                                <span className="model-option-icon">
                                                    {model.icon}
                                                </span>
                                                <div>
                                                    <div className="model-option-name">
                                                        {model.name}
                                                    </div>
                                                    <div className="model-option-provider">
                                                        {model.provider}
                                                    </div>
                                                </div>
                                                {selectedModel.id ===
                                                    model.id && (
                                                    <span className="model-option-check">
                                                        ✓
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => handleLLMCall()}
                                className="cta-btn cta-btn--search"
                            >
                                {messages.length > 0
                                    ? "Send"
                                    : "Plan my trip →"}
                            </button>
                        </div>
                        <div className="chip-row">
                            {chips.map((c, i) => (
                                <button
                                    key={i}
                                    className={`chip-btn${activeChip === i ? " chip-btn--active" : ""}`}
                                    onClick={() => {
                                        setActiveChip(i);
                                        handleLLMCall(c.label);
                                    }}
                                >
                                    <span className="chip-icon">{c.icon}</span>
                                    {c.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Hero visual */}
                <div
                    className={`fade-up hero-visual ${heroVisible ? "visible" : ""}`}
                    style={{ transitionDelay: "400ms" }}
                >
                    {/* Main card */}
                    <div key={heroCardVersion} className="hero-main-card">
                        {generatingCard ? (
                            <>
                                <div>
                                    <div className="card-skel" style={{ width: 48, height: 48, borderRadius: 10, marginBottom: 14 }} />
                                    <div className="card-skel" style={{ width: "65%", height: 34, marginBottom: 8 }} />
                                    <div className="card-skel" style={{ width: "42%", height: 12, marginBottom: 18 }} />
                                    <div style={{ display: "flex", gap: 6 }}>
                                        <div className="card-skel" style={{ width: 58, height: 22, borderRadius: 100 }} />
                                        <div className="card-skel" style={{ width: 68, height: 22, borderRadius: 100 }} />
                                        <div className="card-skel" style={{ width: 50, height: 22, borderRadius: 100 }} />
                                    </div>
                                </div>
                                <div className="hero-card-divider" />
                                <div>
                                    <div className="card-skel" style={{ width: "35%", height: 10, marginBottom: 14 }} />
                                    <div className="hero-ai-items">
                                        {[55, 70, 45, 65, 50].map((w, i) => (
                                            <div key={i} className="hero-ai-item">
                                                <div className="card-skel" style={{ width: 52, height: 20, borderRadius: 100, flexShrink: 0 }} />
                                                <div className="card-skel" style={{ width: `${w}%`, height: 12 }} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <button
                                    className="card-copy-btn"
                                    onClick={handleCopyCard}
                                    title="Copy itinerary"
                                >
                                    {copied ? "✓" : "⎘"}
                                </button>
                                <div>
                                    <div className="hero-main-card-emoji">{heroCard.emoji}</div>
                                    <div className="hero-card-city">{heroCard.city}</div>
                                    <div className="hero-card-country">{heroCard.country} · {heroCard.days} days</div>
                                    <div className="hero-card-tags">
                                        {heroCard.tags.map((t) => (
                                            <span key={t} className="hero-card-tag">{t}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="hero-card-divider" />
                                <div>
                                    <div className="hero-ai-label">AI generated plan</div>
                                    <div className="hero-ai-items">
                                        {heroCard.highlights.map((item) => (
                                            <div key={item.day} className="hero-ai-item">
                                                <span className="hero-ai-day">{item.day}</span>
                                                <span className="hero-ai-activity">{item.activity}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                    {/* Price badge */}
                    <div className="hero-price-badge">
                        <div className="hero-price-label">estimated budget</div>
                        <div className="hero-price-value">
                            {generatingCard
                                ? <div className="card-skel card-skel--badge" />
                                : heroCard.budget}
                        </div>
                    </div>
                </div>
            </section>

            {/* STATS BAR */}
            <div className="stats-bar">
                {[
                    { n: "50+", label: "Destinations" },
                    { n: "120K+", label: "Trips planned" },
                    { n: "4.9★", label: "Average rating" },
                    { n: "< 30s", label: "To your itinerary" },
                ].map((s) => (
                    <div key={s.label} className="stat-item">
                        <div className="stat-number">{s.n}</div>
                        <div className="stat-label">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* DESTINATIONS */}
            <section className="destinations-section">
                <div className="destinations-header">
                    <div>
                        <p className="destinations-eyebrow">
                            explore the world
                        </p>
                        <h2 className="destinations-title">
                            Trending destinations
                        </h2>
                    </div>
                    <span className="destinations-browse">
                        Browse all 50+ →
                    </span>
                </div>
                <div className="destinations-grid">
                    {destinations.slice(0, 5).map((d, i) => (
                        <div
                            key={d.city}
                            className={`dest-card${i === 0 ? " dest-card--featured" : ""}`}
                            style={{ background: d.gradient }}
                            onClick={() => handleLLMCall(`Plan a trip to ${d.city}, ${d.country}`)}
                        >
                            <div
                                className={`dest-card-emoji${i === 0 ? " dest-card-emoji--featured" : ""}`}
                            >
                                {d.emoji}
                            </div>
                            <div>
                                <div
                                    className={`dest-card-city${i === 0 ? " dest-card-city--featured" : ""}`}
                                >
                                    {d.city}
                                </div>
                                <div className="dest-card-country">
                                    {d.country}
                                </div>
                                <div className="dest-card-tags">
                                    {d.tags.map((t) => (
                                        <span key={t} className="dest-card-tag">
                                            {t}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* AI CHAT */}
            <section ref={chatRef} className="chat-section">
                <div className="chat-section-inner">
                    <div>
                        <p className="chat-eyebrow">how it works</p>
                        <h2 className="chat-title">
                            Just talk to your
                            <br />
                            <em className="chat-title-em">travel agent</em>
                        </h2>
                        <p className="chat-description">
                            No forms. No dropdowns. Just tell us in your own
                            words where you want to go, what you love, and how
                            much you want to spend. We'll handle everything
                            else.
                        </p>
                        <div className="chat-steps">
                            {[
                                "Describe your dream trip in plain language",
                                "Get a full itinerary in under 30 seconds",
                                "Refine, adjust, and book — all in one chat",
                            ].map((s, i) => (
                                <div key={i} className="chat-step">
                                    <div className="chat-step-number">
                                        {i + 1}
                                    </div>
                                    <p className="chat-step-text">{s}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Chat window */}
                    <div className="chat-window">
                        <div className="chat-header">
                            <div className="chat-header-avatar">🌍</div>
                            <div>
                                <div className="chat-header-name">
                                    wander.ai
                                </div>
                                <div className="chat-header-status">
                                    <span className="chat-status-dot" /> online
                                </div>
                            </div>
                        </div>
                        <div className="chat-messages">
                            {chatMessages
                                .slice(0, visibleMsgs)
                                .map((msg, i) => (
                                    <div
                                        key={i}
                                        className={`msg-bubble${msg.role === "user" ? " msg-bubble--user" : ""}`}
                                    >
                                        {msg.role === "ai" && (
                                            <div className="msg-ai-avatar">
                                                🌍
                                            </div>
                                        )}
                                        <div className="msg-content">
                                            <div
                                                className={`msg-inner msg-inner--${msg.role}`}
                                            >
                                                {msg.text}
                                                {msg.pill && (
                                                    <div className="pill-btn">
                                                        {msg.pill}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                        </div>
                        <div className="chat-input-row">
                            <input
                                className="chat-input"
                                placeholder="Try it — type your dream trip..."
                                value={demoInput}
                                onChange={(e) => setDemoInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleDemoSearch();
                                }}
                            />
                            <button
                                className="chat-send-btn"
                                onClick={handleDemoSearch}
                            >
                                ↑
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* FEATURES */}
            <section className="features-section">
                <div className="features-header">
                    <p className="features-eyebrow">why wander.ai</p>
                    <h2 className="features-title">
                        Everything a travel agent does,{" "}
                        <em className="features-title-em">times ten</em>
                    </h2>
                </div>
                <div className="features-grid">
                    {features.map((f, i) => (
                        <div key={i} className="feat-card">
                            <div
                                className="feat-icon"
                                style={{ background: f.color }}
                            >
                                {f.icon}
                            </div>
                            <div className="feat-title">{f.title}</div>
                            <div className="feat-desc">{f.desc}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* TESTIMONIALS */}
            <section className="testimonials-section">
                <div className="testimonials-inner">
                    <div className="testimonials-header">
                        <p className="testimonials-eyebrow">
                            traveller stories
                        </p>
                        <h2 className="testimonials-title">
                            Trips people actually loved
                        </h2>
                    </div>
                    <div className="testimonials-grid">
                        {testimonials.map((t, i) => (
                            <div key={i} className="testimonial-card">
                                <div className="testimonial-text">
                                    "{t.text}"
                                </div>
                                <div className="testimonial-author">
                                    <div
                                        className="testimonial-avatar"
                                        style={{
                                            background: t.color,
                                            color: t.textColor,
                                        }}
                                    >
                                        {t.avatar}
                                    </div>
                                    <div>
                                        <div className="testimonial-name">
                                            {t.name}
                                        </div>
                                        <div className="testimonial-trip">
                                            {t.trip}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA FOOTER */}
            <section className="cta-section">
                <p className="cta-eyebrow">ready to go?</p>
                <h2 className="cta-title">Where will you go next?</h2>
                <p className="cta-description">
                    Join 120,000 travellers who've discovered smarter, more
                    personal travel planning.
                </p>
                <button className="cta-btn cta-btn--lg">
                    Start planning for free →
                </button>
            </section>

            {/* FOOTER */}
            <footer className="page-footer">
                <div className="footer-logo">
                    wander<span className="footer-logo-dot">.</span>ai
                </div>
                <div className="footer-links">
                    {["About", "Privacy", "Terms", "Contact"].map((l) => (
                        <span key={l} className="footer-link">
                            {l}
                        </span>
                    ))}
                </div>
                <div className="footer-copy">© 2026 wander.ai</div>
            </footer>
        </div>
    );
}
