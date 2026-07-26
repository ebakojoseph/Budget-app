from flask import Blueprint, jsonify
from datetime import datetime

months_bp = Blueprint("months", __name__)

@months_bp.get("/months")
def get_months():
    now = datetime.now()
    months = []
    for i in range(12):
        y = now.year
        m = i + 1
        months.append(f"{y}-{str(m).zfill(2)}")
    return jsonify(months)
