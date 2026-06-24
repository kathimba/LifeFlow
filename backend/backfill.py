import psycopg2
from sentence_transformers import SentenceTransformer
import os

model = SentenceTransformer("all-MiniLM-L6-v2")

DB_URL = "postgresql://lifeflow_user:lifeflow123@localhost:5432/lifeflow"

conn = psycopg2.connect(DB_URL)
cur = conn.cursor()

# Fetch journal entries without embeddings
cur.execute("""
    SELECT je.id, je.user_id, je.content
    FROM journal_entries je
    WHERE NOT EXISTS (
        SELECT 1 FROM embeddings e 
        WHERE e.entity_id = je.id AND e.entity_type = 'JOURNAL'
    )
""")
rows = cur.fetchall()

for row in rows:
    entry_id, user_id, content = row
    if not content:
        continue
    vector = model.encode(content, normalize_embeddings=True)
    vector_str = "[" + ",".join(map(str, vector)) + "]"
    cur.execute("""
        INSERT INTO embeddings (id, user_id, entity_type, entity_id, embedding, created_at)
        VALUES (gen_random_uuid(), %s::uuid, 'JOURNAL', %s::uuid, %s::vector(384), NOW())
    """, (user_id, entry_id, vector_str))
    print(f"Embedded: {content[:50]}...")

# Tasks
cur.execute("""
    SELECT t.id, t.user_id, t.title, t.description
    FROM tasks t
    WHERE NOT EXISTS (
        SELECT 1 FROM embeddings e WHERE e.entity_id = t.id AND e.entity_type = 'TASK'
    )
""")
for row in cur.fetchall():
    eid, uid, title, desc = row
    text = " ".join(filter(None, [title, desc]))
    if not text: continue
    vec = model.encode(text, normalize_embeddings=True)
    vec_str = "[" + ",".join(map(str, vec)) + "]"
    cur.execute("""
        INSERT INTO embeddings (id, user_id, entity_type, entity_id, embedding, created_at)
        VALUES (gen_random_uuid(), %s::uuid, 'TASK', %s::uuid, %s::vector(384), NOW())
    """, (uid, eid, vec_str))
    print(f"Task: {title[:50]}")

# Goals
cur.execute("""
    SELECT g.id, g.user_id, g.title, g.description
    FROM goals g
    WHERE NOT EXISTS (
        SELECT 1 FROM embeddings e WHERE e.entity_id = g.id AND e.entity_type = 'GOAL'
    )
""")
for row in cur.fetchall():
    eid, uid, title, desc = row
    text = " ".join(filter(None, [title, desc]))
    if not text: continue
    vec = model.encode(text, normalize_embeddings=True)
    vec_str = "[" + ",".join(map(str, vec)) + "]"
    cur.execute("""
        INSERT INTO embeddings (id, user_id, entity_type, entity_id, embedding, created_at)
        VALUES (gen_random_uuid(), %s::uuid, 'GOAL', %s::uuid, %s::vector(384), NOW())
    """, (uid, eid, vec_str))
    print(f"Goal: {title[:50]}")


conn.commit()
cur.close()
conn.close()
print("Done!")