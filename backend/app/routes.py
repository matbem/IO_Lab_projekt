from query_engine import SemanticCache
from flask import Blueprint, request
import requests
bp = Blueprint('chat', __name__)
from dotenv import load_dotenv
import os
load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY") 
GOOGLE_MODEL = "gemini-2.5-flash"
@bp.route('/getAnswer', methods=['GET'])
def getAnswer():
    question = request.args.get("question")
    if not question:
        return {"error": "Question parameter is required."}, 400
    answer = _call_external_api(question)
    _save_question_to_db(question, answer)
    return {"answer": answer}
# def postQuestion()
#     body = request.get_json()
#
def _call_external_api(question):
    url = f"https://generativelanguage.googleapis.com/v1/models/{GOOGLE_MODEL}:generateContent?key={GOOGLE_API_KEY}"
    payload = {
        "contents": [{
            "parts": [{"text": question+" Please explain like to a little child in 2-3 simple sentences."}]
        }],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 1024
        }
    }
    headers = {"Content-Type": "application/json"}
    resp = requests.post(url, headers=headers, json=payload, timeout=30)
    
    if resp.status_code != 200:
        print("❌ API error:", resp.text)
        return f"Error: {resp.status_code} - {resp.text}"

    data = resp.json()
    try:
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except (KeyError, IndexError):
        print("❌ Brak kandydata lub błąd struktury:", data)
        return "Sorry, I couldn't generate a response."


def _save_question_to_db(question, answer):
    # Placeholder function to save question and answer to the database
    SemanticCache().add_to_cache(question, answer)

if __name__ == "__main__":
    from flask import Flask

    app = Flask(__name__)
    app.register_blueprint(bp)

    app.run(debug=True)
