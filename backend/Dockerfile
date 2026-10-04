# NeuroSense backend API.
# CPU-only PyTorch image. Whisper downloads its weights on first
# transcription into /home/neuro/.cache (mount a volume to persist it).
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# ffmpeg is required at runtime by speech transcription (librosa fallback).
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 10001 neuro

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && pip install --no-cache-dir gunicorn

COPY . .

# Never run the API as root: the app only needs write access to its
# data/uploads dirs (mounted as volumes, chown'd at runtime entrypoint or
# pre-created here).
RUN mkdir -p /app/data /app/app/uploads /home/neuro/.cache \
    && chown -R neuro:neuro /app /home/neuro

USER neuro

EXPOSE 10000

# Trained checkpoint, SQLite DB, uploads and Whisper cache live in volumes;
# see docker-compose.yml. Never bake secrets into the image.
CMD ["gunicorn", "--config", "gunicorn.conf.py", "run:app"]
