from database import get_db

def query(sql, params=()):
    db = get_db()
    cur = db.execute(sql, params)
    rows = cur.fetchall()
    db.close()
    return [dict(r) for r in rows]

def execute(sql, params=()):
    db = get_db()
    cur = db.execute(sql, params)
    db.commit()
    last_id = cur.lastrowid
    db.close()
    return last_id
