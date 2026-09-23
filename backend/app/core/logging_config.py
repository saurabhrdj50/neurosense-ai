import logging
import json
import sys
from datetime import datetime
from typing import Optional
from pathlib import Path


class StructuredFormatter(logging.Formatter):
    """JSON formatter for structured logging with request tracking."""
    
    def __init__(self):
        super().__init__()
        self.hostname = self._get_hostname()
    
    def _get_hostname(self) -> str:
        try:
            import socket
            return socket.gethostname()
        except Exception:
            return 'unknown'
    
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'hostname': self.hostname,
            'process_id': record.process,
            'thread_id': record.thread,
        }
        
        if hasattr(record, 'request_id'):
            log_data['request_id'] = record.request_id
        
        if record.exc_info:
            log_data['exception'] = {
                'type': record.exc_info[0].__name__ if record.exc_info[0] else None,
                'message': str(record.exc_info[1]) if record.exc_info[1] else None,
            }
        
        if hasattr(record, 'extra_fields'):
            log_data.update(record.extra_fields)
        
        try:
            return json.dumps(log_data, default=str)
        except Exception:
            return super().format(record)


class RequestContextFilter(logging.Filter):
    """Adds request context to log records."""
    
    def __init__(self):
        super().__init__()
        self._request_id = None
    
    def set_request_id(self, request_id: str):
        self._request_id = request_id
    
    def clear_request_id(self):
        self._request_id = None
    
    def filter(self, record: logging.LogRecord) -> bool:
        if self._request_id:
            record.request_id = self._request_id
        return True


class LogCapture:
    """Context manager for capturing logs during a request."""
    
    def __init__(self, logger_name: str = 'app', level: int = logging.INFO):
        self.logger_name = logger_name
        self.level = level
        self.handler = None
        self.records = []
    
    def __enter__(self):
        self.handler = CapturingHandler()
        self.handler.setLevel(self.level)
        logger = logging.getLogger(self.logger_name)
        logger.addHandler(self.handler)
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        logger = logging.getLogger(self.logger_name)
        logger.removeHandler(self.handler)
        self.records = self.handler.records


class CapturingHandler(logging.Handler):
    """Handler that captures log records for later inspection."""
    
    def __init__(self):
        super().__init__()
        self.records = []
    
    def emit(self, record: logging.LogRecord):
        self.records.append(record)


def setup_logging(
    level: str = 'INFO',
    log_file: Optional[Path] = None,
    json_format: bool = False
) -> None:
    """Configure application logging.
    
    Args:
        level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_file: Optional file path for log output
        json_format: Use JSON formatting for structured logging
    """
    numeric_level = getattr(logging, level.upper(), logging.INFO)
    
    handlers = []
    
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(numeric_level)
    handlers.append(console_handler)
    
    if log_file:
        log_file.parent.mkdir(parents=True, exist_ok=True)
        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(numeric_level)
        handlers.append(file_handler)
    
    if json_format:
        formatter = StructuredFormatter()
    else:
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
    
    for handler in handlers:
        handler.setFormatter(formatter)
    
    logging.basicConfig(
        level=numeric_level,
        handlers=handlers,
        force=True
    )
    
    logging.getLogger('werkzeug').setLevel(logging.WARNING)
    logging.getLogger('flask').setLevel(logging.INFO)


def get_logger(name: str) -> logging.Logger:
    """Get a logger instance with the given name."""
    return logging.getLogger(name)


class AuditLogger:
    """Specialized logger for audit events."""
    
    def __init__(self):
        self.logger = logging.getLogger('audit')
    
    def log_authentication(self, user_id: int, username: str, success: bool, ip_address: str):
        self.logger.info(
            "Authentication attempt",
            extra={
                'extra_fields': {
                    'event_type': 'authentication',
                    'user_id': user_id,
                    'username': username,
                    'success': success,
                    'ip_address': ip_address,
                }
            }
        )
    
    def log_patient_access(self, user_id: int, patient_id: str, action: str):
        self.logger.info(
            f"Patient {action}",
            extra={
                'extra_fields': {
                    'event_type': 'patient_access',
                    'user_id': user_id,
                    'patient_id': patient_id,
                    'action': action,
                }
            }
        )
    
    def log_analysis(self, user_id: int, patient_id: str, modality: str):
        self.logger.info(
            f"Analysis performed: {modality}",
            extra={
                'extra_fields': {
                    'event_type': 'analysis',
                    'user_id': user_id,
                    'patient_id': patient_id,
                    'modality': modality,
                }
            }
        )
    
    def log_data_export(self, user_id: int, patient_id: str, export_type: str):
        self.logger.info(
            f"Data export: {export_type}",
            extra={
                'extra_fields': {
                    'event_type': 'data_export',
                    'user_id': user_id,
                    'patient_id': patient_id,
                    'export_type': export_type,
                }
            }
        )


audit_logger = AuditLogger()
