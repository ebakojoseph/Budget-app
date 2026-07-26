from flask import Blueprint, request, jsonify
from models import query, execute

accounts_bp = Blueprint("accounts", __name__)

@accounts_bp.get("/accounts")
def list_accounts():
    return jsonify(query("SELECT * FROM accounts"))

@accounts_bp.post("/accounts")
def create_account():
    data = request.get_json()
    id = execute(
        "INSERT INTO accounts (name, group, balance, brought_forward) VALUES (?, ?, ?, ?)",
        (data["name"], data["group"], data["balance"], data["brought_forward"])
    )
    return jsonify({"id": id, **data})

@accounts_bp.put("/accounts/<id>")
def update_account(id):
    data = request.get_json()
    execute(
        "UPDATE accounts SET name=?, group=?, balance=?, brought_forward=? WHERE id=?",
        (data["name"], data["group"], data["balance"], data["brought_forward"], id)
    )
    return jsonify({"id": id, **data})

@accounts_bp.delete("/accounts/<id>")
def delete_account(id):
    execute("DELETE FROM accounts WHERE id=?", (id,))
    return jsonify({"status": "ok"})
