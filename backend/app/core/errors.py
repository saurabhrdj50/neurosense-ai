import logging
from flask import jsonify

logger = logging.getLogger(__name__)

def register_error_handlers(app):
    """Register robust error handlers to catch ML exceptions and internal errors gracefully."""
    
    @app.errorhandler(Exception)
    def handle_global_exception(e):
        logger.exception(f"Unhandled exception caught by global handler: {str(e)}")
        
        return jsonify({
            'success': False,
            'message': 'An unexpected error occurred processing your request.',
            'error_type': e.__class__.__name__
        }), 500

    @app.errorhandler(401)
    def unauthorized_handler(e):
        return jsonify({
            'success': False,
            'message': 'Authentication required. Please log in.',
        }), 401

    @app.errorhandler(403)
    def forbidden_handler(e):
        return jsonify({
            'success': False,
            'message': 'Access denied. Insufficient permissions.',
        }), 403

    @app.errorhandler(404)
    def page_not_found(e):
        return jsonify({
            'success': False,
            'message': 'The requested URL was not found on the server.',
        }), 404

    @app.errorhandler(429)
    def ratelimit_handler(e):
        return jsonify({
            'success': False,
            'message': f"Rate limit exceeded: {e.description}",
        }), 429
