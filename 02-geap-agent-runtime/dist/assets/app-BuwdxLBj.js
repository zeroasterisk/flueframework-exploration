import { flue } from "@flue/runtime/routing";
import { Hono } from "hono";
//#region src/geap-adapter.ts
/**
* GEAP Agent Runtime protocol adapter for Flue agents.
*
* GEAP (Google Enterprise Agent Platform) forwards queries to BYOC containers
* via POST /api/reasoning_engine. This adapter bridges that protocol to a Flue
* agent's HTTP API.
*
* Protocol reference:
*   Request:  { class_method?: string, input?: Record<string, any> }
*   Response: { output: any }
*
* The ADK Python source (google/adk-python, cli/fast_api.py) defines the
* canonical server; this adapter implements the container side in TypeScript.
*/
/**
* Creates a Hono sub-app with GEAP Reasoning Engine endpoints that bridge
* to a Flue agent via its HTTP API (POST /agents/:name/:id?wait=result).
*
* Routes:
* - POST /api/reasoning_engine       — non-streaming query
* - POST /api/stream_reasoning_engine — streaming query (stub, returns non-streaming)
*/
function createGeapAdapter(options) {
	const { agentName } = options;
	const fluePort = options.fluePort ?? 8080;
	const flueBaseUrl = `http://localhost:${String(fluePort)}`;
	const app = new Hono();
	app.post("/api/reasoning_engine", async (c) => {
		let body;
		try {
			body = await c.req.json();
		} catch {
			return c.json({ output: "Invalid JSON body." }, 400);
		}
		const classMethod = body.class_method ?? "query";
		const input = body.input ?? {};
		switch (classMethod) {
			case "query":
			case "async_stream_query":
			case "stream_query": return await handleQuery(c, agentName, flueBaseUrl, input);
			case "create_session":
			case "async_create_session": return c.json({ output: {
				session_id: input["session_id"] ?? crypto.randomUUID(),
				user_id: input["user_id"] ?? "default"
			} });
			case "list_sessions":
			case "async_list_sessions": return c.json({ output: [] });
			case "get_session":
			case "async_get_session": return c.json({ output: {
				session_id: input["session_id"] ?? "unknown",
				user_id: input["user_id"] ?? "default",
				state: {}
			} });
			case "delete_session":
			case "async_delete_session": return c.json({ output: null });
			default: return c.json({ output: `Unknown class_method: ${classMethod}` }, 400);
		}
	});
	app.post("/api/stream_reasoning_engine", async (c) => {
		let body;
		try {
			body = await c.req.json();
		} catch {
			return c.json({ output: "Invalid JSON body." }, 400);
		}
		const classMethod = body.class_method ?? "query";
		const input = body.input ?? {};
		if (classMethod === "query" || classMethod === "async_stream_query" || classMethod === "stream_query") {
			const result = await queryFlueAgent(agentName, flueBaseUrl, input);
			if (!result.ok) {
				const chunk = JSON.stringify({ output: result.error }) + "\n";
				return new Response(chunk, {
					status: 502,
					headers: { "Content-Type": "application/json" }
				});
			}
			const chunk = JSON.stringify({ output: result.text }) + "\n";
			return new Response(chunk, {
				status: 200,
				headers: { "Content-Type": "application/json" }
			});
		}
		return c.json({ output: `Streaming not supported for class_method: ${classMethod}` }, 400);
	});
	return app;
}
async function handleQuery(c, agentName, flueBaseUrl, input) {
	const result = await queryFlueAgent(agentName, flueBaseUrl, input);
	if (!result.ok) return c.json({ output: result.error }, 502);
	return c.json({ output: result.text });
}
async function queryFlueAgent(agentName, flueBaseUrl, input) {
	const prompt = input["prompt"] ?? input["message"];
	if (!prompt || typeof prompt !== "string") return {
		ok: false,
		error: "Missing \"prompt\" or \"message\" in input."
	};
	const sessionId = input["session_id"] ?? crypto.randomUUID();
	try {
		const flueUrl = `${flueBaseUrl}/agents/${agentName}/${sessionId}?wait=result`;
		const response = await fetch(flueUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ message: prompt })
		});
		if (!response.ok) {
			const errorText = await response.text();
			return {
				ok: false,
				error: `Flue agent error (${String(response.status)}): ${errorText}`
			};
		}
		return {
			ok: true,
			text: extractAgentText(await response.text())
		};
	} catch (err) {
		return {
			ok: false,
			error: `Failed to reach Flue agent: ${err instanceof Error ? err.message : "Unknown error"}`
		};
	}
}
/**
* Extract the assistant's text from a Flue ?wait=result response.
*
* The response may be:
* 1. A simple JSON object with a `text` or `message` field
* 2. A newline-delimited JSON event stream (Durable Streams format)
*/
function extractAgentText(responseBody) {
	try {
		const json = JSON.parse(responseBody);
		if (typeof json["text"] === "string") return json["text"];
		if (typeof json["message"] === "string") return json["message"];
		if (typeof json["output"] === "string") return json["output"];
	} catch {}
	const lines = responseBody.split("\n").filter((line) => line.trim().length > 0);
	const textParts = [];
	for (const line of lines) try {
		const event = JSON.parse(line);
		const data = event["data"] ?? event;
		if (typeof data["text"] === "string") textParts.push(data["text"]);
		else if (data["type"] === "text" && typeof data["content"] === "string") textParts.push(data["content"]);
		else if (data["type"] === "assistant" && Array.isArray(data["content"])) {
			for (const part of data["content"]) if (part["type"] === "text" && typeof part["text"] === "string") textParts.push(part["text"]);
		}
	} catch {}
	if (textParts.length > 0) return textParts.join("\n");
	return responseBody;
}
//#endregion
//#region src/app.ts
/**
* GEAP Agent Runtime BYOC container.
*
* Exposes both Flue agent routes (POST /agents/:name/:id) and the GEAP
* Reasoning Engine protocol (POST /api/reasoning_engine). The GEAP adapter
* bridges incoming queries to the Flue agent via internal HTTP on the same
* port.
*/
var PORT = Number(process.env["PORT"] ?? 8080);
var app = new Hono();
app.get("/health", (c) => c.json({ status: "ok" }));
app.get("/ready", (c) => c.json({ status: "ready" }));
app.route("/", flue());
var geap = createGeapAdapter({
	agentName: "explorer",
	fluePort: PORT
});
app.route("/", geap);
//#endregion
export { app as default };

//# sourceMappingURL=app-BuwdxLBj.js.map