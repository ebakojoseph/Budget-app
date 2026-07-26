from flask import Blueprint, request, jsonify
from models import query, execute

transactions_bp = Blueprint("transactions", __name__)

@transactions_bp.get("/transactions")
def list_transactions():
    params = []
    sql = "SELECT * FROM transactions WHERE 1=1"

    month = request.args.get("month")
    if month:
        sql += " AND month=?"
        params.append(month)

    type = request.args.get("type")
    if type:
        sql += " AND type=?"
        params.append(type)

    account_id = request.args.get("account_id")
    if account_id:
        sql += " AND account_id=?"
        params.append(account_id)

    rows = query(sql, tuple(params))
    return jsonify(rows)

@transactions_bp.post("/transactions")
def create_transaction():
    data = request.get_json()
    id = execute(
        "INSERT INTO transactions (date, amount, description, category, type, month) VALUES (?, ?, ?, ?, ?, ?)",
        (data["date"], data["amount"], data["description"], data["category"], data["type"], data["month"])
    )
    return jsonify({"id": id, **data})

@transactions_bp.put("/transactions/<id>")
def update_transaction(id):
    data = request.get_json()
    execute(
        "UPDATE transactions SET date=?, amount=?, description=?, category=?, type=? WHERE id=?",
        (data["date"], data["amount"], data["description"], data["category"], data["type"], id)
    )
    return jsonify({"id": id, **data})

@transactions_bp.delete("/transactions/<id>")
def delete_transaction(id):
    execute("DELETE FROM transactions WHERE id=?", (id,))
    return jsonify({"status": "ok"})
