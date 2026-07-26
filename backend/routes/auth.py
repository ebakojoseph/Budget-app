from flask import Blueprint, request, jsonify
import google.oauth2.id_token
import google.auth.transport.requests

auth_bp = Blueprint("auth", __name__)

@auth_bp.post("/google")
def google_session():
    try:
        data = request.get_json()
        token = data.get("accessToken")

        if not token:
            return jsonify({"error": "Missing accessToken"}), 400

        req = google.auth.transport.requests.Request()
        info = google.oauth2.id_token.verify_oauth2_token(token, req)

        user_id = info["sub"]
        email = info.get("email")
        name = info.get("name")

        session_token = f"session-{user_id}"

        return jsonify({
            "session_token": session_token,
            "user": {
                "id": user_id,
                "email": email,
                "name": name,
            }
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 400
