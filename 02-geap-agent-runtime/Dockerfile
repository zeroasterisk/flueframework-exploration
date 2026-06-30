FROM node:22-alpine
WORKDIR /app

# Install deps as root
COPY package.json /app/package.json
RUN npm install

# Copy agent source
COPY agents/ /app/agents/

# Create non-root user and hand ownership
RUN adduser --disabled-password --gecos "" myuser && chown -R myuser:myuser /app
USER myuser

ENV GOOGLE_GENAI_USE_VERTEXAI=1

EXPOSE 8080

# Use npx to run the adk api_server with the agent directory
CMD ["npx", "adk", "api_server", "/app/agents", "--port=8080", "--host=0.0.0.0"]
