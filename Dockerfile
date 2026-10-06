# BlindWalk Container - Production Dockerfile
FROM python:3.11-slim

# Prevent Python from writing .pyc files and buffer stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive

# Install system audio, ALSA, eSpeak-NG, and spatial build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    espeak-ng \
    libespeak-dev \
    alsa-utils \
    libasound2 \
    libasound2-plugins \
    build-essential \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Configure default ALSA sound output for container environment
RUN echo 'pcm.!default { type hw card 0 }' > /etc/asound.conf && \
    echo 'ctl.!default { type hw card 0 }' >> /etc/asound.conf

WORKDIR /app

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code, web UI, and default data directory
COPY config.py .
COPY cache_map.py .
COPY blindwalk.py .
COPY server.py .
COPY engine/ ./engine/
COPY data/ ./data/
COPY web/ ./web/

# Expose web server port
EXPOSE 8000

# Default entrypoint launches the interactive web application & REST API
CMD ["python", "server.py"]
