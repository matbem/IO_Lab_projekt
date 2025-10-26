from flask import Flask
from flask_cors import CORS

def create_app():
    app = Flask(__name__)
    
    # Konfiguracja CORS
    CORS(app, resources={r"/*": {"origins": "*"}})
    
    # Konfiguracja aplikacji
    app.config['SECRET_KEY'] = 'your-secret-key-here'
    
    # Rejestracja tras
    from .routes import bp
    app.register_blueprint(bp)
    
    return app