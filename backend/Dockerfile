# NeuroSense backend API (FastAPI + uvicorn).
# CPU-only image: torch/torchvision come from the PyTorch CPU index (exact
# pins below = the versions the test suite and E2E were verified against);
# plain PyPI torch would pull ~2-3 GB of CUDA/NVIDIA packages this deployment
# can never use. Whisper/HF weights download at first use into /home/neuro/.cache
# (persisted via named volumes).
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# ffmpeg: required at runtime by speech transcription (librosa).
# libmagic1: shared library behind python-magic (imported by app.shared.validation).
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 10001 neuro

WORKDIR /app

# CPU-only ML wheels first (exact pins, reproducible), then the rest — the
# torch>=2.0.0 floor in requirements.txt is satisfied by the installed
# +cpu build, so pip leaves it alone. This layer only changes when the pins do.
RUN pip install --no-cache-dir \
    torch==2.14.0 \
    torchvision==0.29.0 \
    --extra-index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Never run the API as root: the app only needs write access to its
# data/uploads dirs (mounted as volumes). The MRI model is NOT in the image
# (backend/.dockerignore) — it is bind-mounted from the host at runtime.
# The HF/whisper cache dirs must exist (and be neuro-owned) in the image:
# compose mounts named volumes at these paths, and a mountpoint that is
# absent from the image is created root-owned, which breaks model download.
RUN mkdir -p /app/data /app/app/uploads /app/app/models \
    /home/neuro/.cache/huggingface /home/neuro/.cache/whisper \
    && chown -R neuro:neuro /app /home/neuro

USER neuro

EXPOSE 10000

# Apply the versioned schema (Alembic) if PostgreSQL DATABASE_URL is provided,
# then start single uvicorn process.
CMD ["sh", "-c", "if [ -n \"$DATABASE_URL\" ]; then alembic upgrade head; fi && exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000} --proxy-headers --no-server-header"]
