from flask import Flask

def create_app():
    app = Flask(__name__)
    
    # Konfiguracja aplikacji
    app.config['SECRET_KEY'] = 'your-secret-key-here'
    
    # Rejestracja tras
    from .routes import bp
    app.register_blueprint(bp)
    
    return app