# Hindsight con un Claude Code recente: quello incluso nell'immagine (2.1.150) è troppo vecchio per Opus 5.5.
FROM ghcr.io/vectorize-io/hindsight:latest
COPY update-claude.py /tmp/update-claude.py
RUN python3 /tmp/update-claude.py
