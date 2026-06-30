FROM node:22-alpine
WORKDIR /app

# Pre-install ALL deps at build time (not runtime)
COPY package.json /app/package.json
RUN npm install --production 2>/dev/null; npm install

# Copy the lightweight server
COPY server.js /app/server.js

# No user switch needed — GEAP runs as root by default
EXPOSE 8080
CMD ["node", "server.js"]
