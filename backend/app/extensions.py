try:
    from flask_login import LoginManager
    HAS_LOGIN = True
    login_manager = LoginManager()
except ImportError:
    HAS_LOGIN = False
    login_manager = None
