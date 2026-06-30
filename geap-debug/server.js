const http = require("http");
const port = process.env.PORT || 8080;

console.log("=== ENVIRONMENT ===");
Object.entries(process.env).sort().forEach(([k,v]) => {
  if (!k.startsWith("npm_")) console.log(`${k}=${v}`);
});

console.log(`\n=== STARTING SERVER ON PORT ${port} ===`);

const server = http.createServer((req, res) => {
  const body = [];
  req.on("data", chunk => body.push(chunk));
  req.on("end", () => {
    const bodyStr = Buffer.concat(body).toString();
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log(`  Headers: ${JSON.stringify(req.headers)}`);
    if (bodyStr) console.log(`  Body: ${bodyStr.substring(0, 500)}`);
    
    res.writeHead(200, {"Content-Type": "application/json"});
    res.end(JSON.stringify({output: "ok", path: req.url, method: req.method}));
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on 0.0.0.0:${port}`);
});
