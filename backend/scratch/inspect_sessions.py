import sqlite3
import json

conn = sqlite3.connect('sessions.db')
cursor = conn.cursor()
tables = cursor.execute("SELECT name FROM sqlite_master WHERE type='table';").fetchall()
print('SQLite tables:', tables)

for t in tables:
    name = t[0]
    count = cursor.execute(f"SELECT count(*) FROM {name}").fetchone()[0]
    print(f"Table '{name}' count: {count}")
    if 'checkpoint' in name:
        rows = cursor.execute(f"SELECT thread_id, checkpoint_id FROM {name} ORDER BY rowid DESC LIMIT 10").fetchall()
        for r in rows:
            print(f"  thread: {r[0]} | cp: {r[1]}")
