from flask import Blueprint, request, jsonify
from models import query
from auth_middleware import require_auth

summary_bp = Blueprint("summary", __name__)

@summary_bp.get("/summary")
@require_auth
def summary():
    month = request.args.get("month")
    income = query(
        "SELECT SUM(amount) AS total FROM transactions WHERE month=? AND type='income'",
        (month,)
    )[0]["total"] or 0

    expense = query(
        "SELECT SUM(amount) AS total FROM transactions WHERE month=? AND type='expense'",
        (month,)
    )[0]["total"] or 0

    starting = query(
        "SELECT SUM(brought_forward) AS total FROM accounts",
    )[0]["total"] or 0

    end_balance = starting + income - expense

    return jsonify({
        "month": month,
        "starting_balance": starting,
        "end_balance": end_balance,
        "saved_this_month": income - expense,
        "planned_expense": 0,
        "actual_expense": expense,
        "planned_income": 0,
        "actual_income": income,
        "categories": query("SELECT * FROM categories WHERE month=?", (month,))
    })
