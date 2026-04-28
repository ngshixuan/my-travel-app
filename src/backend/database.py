import sqlite3

def init_db(DB):
    conn = sqlite3.connect(DB)
    cursor = conn.cursor()

    chat_history_table = """
        CREATE TABLE IF NOT EXISTS chat_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL, 
            user_query TEXT NOT NULL,
            ai_response TEXT NOT NULL,
            model_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """
    cursor.execute(chat_history_table)
    conn.commit()