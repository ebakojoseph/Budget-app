from flask import Blueprint, request, jsonify
from models import query, execute

allocations_bp = Blueprint("allocations", __name__)

@allocations_bp.get("/allocations")
def list_allocations():
    return jsonify(query("SELECT * FROM allocations"))

@allocations_bp.put("/allocations/<id>")
def update_allocation(id):
    data = request.get_json()
    execute("UPDATE allocations SET percent=? WHERE id=?", (data["percent"], id))
    return jsonify({"id": id, "percent": data["percent"]})
