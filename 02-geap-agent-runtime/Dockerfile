FROM node:lts-alpine
WORKDIR /app

# Install deps as root first
COPY package.json /app/package.json
RUN npm install --production
RUN npm install @google/adk-devtools@latest

# Copy agent source
COPY agents/ /app/agents/

# Create non-root user and hand ownership
RUN adduser --disabled-password --gecos "" myuser && chown -R myuser:myuser /app
USER myuser

ENV PATH="/home/myuser/.local/bin:$PATH"
ENV GOOGLE_GENAI_USE_VERTEXAI=1

EXPOSE 8080

CMD ["npx", "adk", "api_server", "/app/agents/explorer", "--port=8080", "--host=0.0.0.0"]
