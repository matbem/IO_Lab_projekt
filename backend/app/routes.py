
from flask import request
import requests
bp = Blueprint('chat', __name__)

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
    prompt = f"Q: {question}. Please answer in 2-3 simple, sentences."
    url = f"https://generativelanguage.googleapis.com/v1beta2/models/{GOOGLE_MODEL}:generateText?key={GOOGLE_API_KEY}"
    payload = {
        "prompt": {"text": prompt},
        "temperature": 0.2,
        "maxOutputTokens": 700
    }
    headers = {"Content-Type": "application/json"}
    resp = requests.post(url, headers=headers, json=payload, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    candidates = data.get("candidates") or []
    return candidates[0].get("content", "").strip() if candidates else ""

def _save_question_to_db(question, answer):
    # Placeholder function to save question and answer to the database
    pass