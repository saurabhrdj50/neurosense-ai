class NeuroSenseError(Exception):
    """Base exception for all NeuroSense errors."""
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class ValidationError(NeuroSenseError):
    """Raised when input validation fails."""
    def __init__(self, message: str):
        super().__init__(message, status_code=400)


class AuthenticationError(NeuroSenseError):
    """Raised when authentication fails."""
    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message, status_code=401)


class AuthorizationError(NeuroSenseError):
    """Raised when user lacks permission."""
    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(message, status_code=403)


class NotFoundError(NeuroSenseError):
    """Raised when a resource is not found."""
    def __init__(self, resource: str, identifier: str = ""):
        msg = f"{resource} not found"
        if identifier:
            msg += f": {identifier}"
        super().__init__(msg, status_code=404)


class AnalysisError(NeuroSenseError):
    """Raised when analysis processing fails."""
    def __init__(self, message: str, modality: str = ""):
        msg = f"Analysis failed"
        if modality:
            msg += f" ({modality})"
        msg += f": {message}"
        super().__init__(msg, status_code=500)


class FileProcessingError(NeuroSenseError):
    """Raised when file processing fails."""
    def __init__(self, message: str, file_type: str = ""):
        msg = f"File processing failed"
        if file_type:
            msg += f" ({file_type})"
        msg += f": {message}"
        super().__init__(msg, status_code=400)


class DatabaseError(NeuroSenseError):
    """Raised when database operations fail."""
    def __init__(self, message: str):
        super().__init__(f"Database error: {message}", status_code=500)
