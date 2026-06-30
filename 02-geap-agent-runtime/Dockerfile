FROM node:22-alpine
WORKDIR /app

# Install deps as root
COPY package.json /app/package.json
RUN npm install

# Copy agent source — use a subdirectory structure ADK expects
# ADK agent_loader looks for files/subdirectories in the agents dir
# Each subdirectory should contain one agent file
COPY agents/explorer.js /app/agents/explorer/index.js

# Create non-root user and hand ownership
RUN adduser --disabled-password --gecos "" myuser && chown -R myuser:myuser /app
USER myuser

ENV GOOGLE_GENAI_USE_VERTEXAI=1

EXPOSE 8080

# Debug: list what's available at startup
CMD echo "=== /app/agents contents ===" && ls -laR /app/agents/ && echo "=== Starting ADK ===" && npx adk api_server /app/agents --port=8080 --host=0.0.0.0
