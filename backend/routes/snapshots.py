from flask import Blueprint, request, jsonify
from models import query, execute

snapshots_bp = Blueprint("snapshots", __name__)

@snapshots_bp.get("/balance-snapshots")
def list_snapshots():
    month = request.args.get("month")
    if month:
        return jsonify(query("SELECT * FROM balance_snapshots WHERE month=?", (month,)))
    return jsonify(query("SELECT * FROM balance_snapshots"))

@snapshots_bp.post("/balance-snapshots")
def create_snapshot():
    data = request.get_json()
    id = execute(
        "INSERT INTO balance_snapshots (account_id, month, balance) VALUES (?, ?, ?)",
        (data["account_id"], data["month"], data["balance"])
    )
    return jsonify({"id": id, **data})
