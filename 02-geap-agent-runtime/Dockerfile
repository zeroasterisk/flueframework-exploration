FROM node:lts-alpine
WORKDIR /app

RUN adduser --disabled-password --gecos "" myuser
USER myuser

ENV PATH="/home/myuser/.local/bin:$PATH"
ENV GOOGLE_GENAI_USE_VERTEXAI=1

COPY --chown=myuser:myuser agents/ /app/agents/
COPY --chown=myuser:myuser package.json /app/package.json

RUN npm install @google/adk-devtools@latest
RUN npm install --production

EXPOSE 8080

CMD npx adk api_server /app/agents/explorer --port=8080 --host=0.0.0.0
