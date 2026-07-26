from flask import Flask
from flask_cors import CORS
from database import init_db

from routes.months import months_bp
from routes.summary import summary_bp
from routes.categories import categories_bp
from routes.transactions import transactions_bp
from routes.accounts import accounts_bp
from routes.allocations import allocations_bp
from routes.snapshots import snapshots_bp
from routes.budgets import budgets_bp
from routes.auth import auth_bp

app = Flask(__name__)
CORS(app)
init_db()

# Register blueprints
app.register_blueprint(auth_bp, url_prefix="/session")
app.register_blueprint(months_bp, url_prefix="/api")
app.register_blueprint(summary_bp, url_prefix="/api")
app.register_blueprint(categories_bp, url_prefix="/api")
app.register_blueprint(transactions_bp, url_prefix="/api")
app.register_blueprint(accounts_bp, url_prefix="/api")
app.register_blueprint(allocations_bp, url_prefix="/api")
app.register_blueprint(snapshots_bp, url_prefix="/api")
app.register_blueprint(budgets_bp, url_prefix="/api")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
