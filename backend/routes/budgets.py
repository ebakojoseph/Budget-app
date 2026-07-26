from flask import Blueprint, request, jsonify
from models import query, execute

budgets_bp = Blueprint("budgets", __name__)

@budgets_bp.get("/budgets")
def list_budgets():
    return jsonify(query("SELECT * FROM budgets"))

@budgets_bp.post("/budgets")
def create_budget():
    data = request.get_json()
    id = execute(
        "INSERT INTO budgets (month, name) VALUES (?, ?)",
        (data["month"], data["name"])
    )
    return jsonify({"id": id, **data})

@budgets_bp.delete("/budgets/<id>")
def delete_budget(id):
    execute("DELETE FROM budgets WHERE id=?", (id,))
    return jsonify({"status": "ok"})

@budgets_bp.post("/budgets/<id>/share")
def share_budget(id):
    data = request.get_json()
    write = data.get("write", False)
    token = f"share-{id}"
    execute("UPDATE budgets SET share_token=?, share_write=? WHERE id=?", (token, write, id))
    return jsonify({"share_token": token, "write": write})

@budgets_bp.delete("/budgets/<id>/share")
def unshare_budget(id):
    execute("UPDATE budgets SET share_token=NULL, share_write=NULL WHERE id=?", (id,))
    return jsonify({"status": "ok"})
