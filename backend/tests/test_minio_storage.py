"""Unit tests for MinIO object storage integration."""
from unittest.mock import MagicMock, patch
from pathlib import Path
from app.shared.storage import StorageManager, get_minio_client


def test_get_minio_client_unconfigured():
    with patch('app.shared.storage.Config') as mock_config:
        mock_config.MINIO_ENDPOINT = ''
        with patch('app.shared.storage._MINIO_CHECKED', False):
            client = get_minio_client()
            assert client is None


def test_storage_manager_sync_to_minio_graceful_fallback():
    # When MinIO is not available, sync_to_minio returns False without raising an exception
    with patch('app.shared.storage.get_minio_client', return_value=None):
        result = StorageManager.sync_to_minio(Path('/tmp/nonexistent.pdf'), 'patients/test.pdf')
        assert result is False


def test_storage_manager_sync_to_minio_success():
    mock_client = MagicMock()
    with patch('app.shared.storage.get_minio_client', return_value=mock_client):
        result = StorageManager.sync_to_minio(Path('/tmp/test.pdf'), 'patients/test.pdf')
        assert result is True
        mock_client.fput_object.assert_called_once()
