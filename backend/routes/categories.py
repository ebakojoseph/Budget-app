from flask import Blueprint, request, jsonify
from models import query, execute

categories_bp = Blueprint("categories", __name__)

@categories_bp.get("/categories")
def list_categories():
    month = request.args.get("month")
    rows = query("SELECT * FROM categories WHERE month = ?", (month,))
    return jsonify(rows)

@categories_bp.post("/categories")
def create_category():
    data = request.get_json()
    name = data["name"]
    type = data["type"]
    month = data["month"]
    planned = data.get("planned", 0)

    id = execute(
        "INSERT INTO categories (name, type, month, planned) VALUES (?, ?, ?, ?)",
        (name, type, month, planned)
    )
    return jsonify({"id": id, **data})

@categories_bp.put("/categories/<id>")
def update_category(id):
    data = request.get_json()
    execute(
        "UPDATE categories SET name=?, type=?, planned=? WHERE id=?",
        (data["name"], data["type"], data["planned"], id)
    )
    return jsonify({"id": id, **data})

@categories_bp.delete("/categories/<id>")
def delete_category(id):
    execute("DELETE FROM categories WHERE id=?", (id,))
    return jsonify({"status": "ok"})
