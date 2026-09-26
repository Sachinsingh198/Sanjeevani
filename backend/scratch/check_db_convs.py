import sys
sys.path.insert(0, ".")
from app.db import get_db_connection, conversation_index_table
from sqlalchemy import select, desc

with get_db_connection() as conn:
    stmt = select(conversation_index_table).order_by(desc(conversation_index_table.c.created_at)).limit(5)
    rows = conn.execute(stmt).fetchall()
    for r in rows:
        print(f"ID: {r.conversation_id} | Tier: {r.tier} | Summary: {r.summary} | Updated: {r.updated_at}")
