FROM node:22-alpine
WORKDIR /app

COPY package.json /app/package.json
RUN npm install --production 2>/dev/null; true

COPY server.js /app/server.js

# Run as non-root for GKE security best practices
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 8080
CMD ["node", "server.js"]
