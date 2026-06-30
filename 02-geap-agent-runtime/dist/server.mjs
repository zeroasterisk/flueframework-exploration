import { createRequire } from "node:module";
import { AsyncLocalStorage } from "node:async_hooks";
import { format } from "node:util";
import { local, sqlite } from "@flue/runtime/node";
import { Bash, InMemoryFs, admitDetachedWorkflow, assertWorkflowDefinition, bashFactoryToSessionEnv, configureFlueRuntime, createFlueContext, createInstrumentationOwner, createNodeAgentCoordinator, createNodeDispatchQueue, createRuntimeActivityGate, installDevLifecycleLogger, resolveModel, runWithInstrumentationOwner } from "@flue/runtime/internal";
import { defineAgent, defineAgentProfile, defineTool } from "@flue/runtime";
import * as v from "valibot";
//#region \0rolldown/runtime.js
var __defProp = Object.defineProperty;
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
var __require = /* #__PURE__ */ (() => createRequire(import.meta.url))();
//#endregion
//#region node_modules/@hono/node-server/dist/constants-BXAKTxRC.cjs
var require_constants_BXAKTxRC = /* @__PURE__ */ __commonJSMin(((exports) => {
	var X_ALREADY_SENT = "x-hono-already-sent";
	Object.defineProperty(exports, "X_ALREADY_SENT", {
		enumerable: true,
		get: function() {
			return X_ALREADY_SENT;
		}
	});
}));
//#endregion
//#region node_modules/hono/dist/cjs/helper/websocket/index.js
var require_websocket = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var websocket_exports = {};
	__export(websocket_exports, {
		WSContext: () => WSContext,
		createWSMessageEvent: () => createWSMessageEvent,
		defineWebSocketHelper: () => defineWebSocketHelper
	});
	module.exports = __toCommonJS(websocket_exports);
	var WSContext = class {
		#init;
		constructor(init) {
			this.#init = init;
			this.raw = init.raw;
			this.url = init.url ? new URL(init.url) : null;
			this.protocol = init.protocol ?? null;
		}
		send(source, options) {
			this.#init.send(source, options ?? {});
		}
		raw;
		binaryType = "arraybuffer";
		get readyState() {
			return this.#init.readyState;
		}
		url;
		protocol;
		close(code, reason) {
			this.#init.close(code, reason);
		}
	};
	var createWSMessageEvent = (source) => {
		return new MessageEvent("message", { data: source });
	};
	var defineWebSocketHelper = (handler) => {
		return ((...args) => {
			if (typeof args[0] === "function") {
				const [createEvents, options] = args;
				return async function upgradeWebSocket(c, next) {
					const result = await handler(c, await createEvents(c), options);
					if (result) return result;
					await next();
				};
			} else {
				const [c, events, options] = args;
				return (async () => {
					const upgraded = await handler(c, events, options);
					if (!upgraded) throw new Error("Failed to upgrade WebSocket");
					return upgraded;
				})();
			}
		});
	};
	0 && (module.exports = {
		WSContext,
		createWSMessageEvent,
		defineWebSocketHelper
	});
}));
//#endregion
//#region src/agents/explorer.ts
var import_dist = (/* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
	var require_constants = require_constants_BXAKTxRC();
	var node_http = __require("node:http");
	var node_http2 = __require("node:http2");
	var node_stream = __require("node:stream");
	var hono_ws = require_websocket();
	var RequestError = class extends Error {
		constructor(message, options) {
			super(message, options);
			this.name = "RequestError";
		}
	};
	var reValidRequestUrl = /^\/[!#$&-;=?-\[\]_a-z~]*$/;
	var reDotSegment = /\/\.\.?(?:[/?#]|$)/;
	var reValidHost = /^[a-z0-9._-]+(?::(?:[1-5]\d{3,4}|[6-9]\d{3}))?$/;
	var buildUrl = (scheme, host, incomingUrl) => {
		const url = `${scheme}://${host}${incomingUrl}`;
		if (!reValidHost.test(host)) {
			const urlObj = new URL(url);
			if (urlObj.hostname.length !== host.length && urlObj.hostname !== (host.includes(":") ? host.replace(/:\d+$/, "") : host).toLowerCase()) throw new RequestError("Invalid host header");
			return urlObj.href;
		} else if (incomingUrl.length === 0) return url + "/";
		else {
			if (incomingUrl.charCodeAt(0) !== 47) throw new RequestError("Invalid URL");
			if (!reValidRequestUrl.test(incomingUrl) || reDotSegment.test(incomingUrl)) return new URL(url).href;
			return url;
		}
	};
	var toRequestError = (e) => {
		if (e instanceof RequestError) return e;
		return new RequestError(e.message, { cause: e });
	};
	var GlobalRequest = global.Request;
	var Request$1 = class extends GlobalRequest {
		constructor(input, options) {
			if (typeof input === "object" && getRequestCache in input) {
				const hasReplacementBody = options !== void 0 && "body" in options && options.body != null;
				if (input[bodyConsumedDirectlyKey] && !hasReplacementBody) throw new TypeError("Cannot construct a Request with a Request object that has already been used.");
				input = input[getRequestCache]();
			}
			if (typeof (options?.body)?.getReader !== "undefined") options.duplex ??= "half";
			super(input, options);
		}
	};
	var newHeadersFromIncoming = (incoming) => {
		const headerRecord = [];
		const rawHeaders = incoming.rawHeaders;
		for (let i = 0, len = rawHeaders.length; i < len; i += 2) {
			const key = rawHeaders[i];
			if (key.charCodeAt(0) !== 58) headerRecord.push([key, rawHeaders[i + 1]]);
		}
		return new Headers(headerRecord);
	};
	var wrapBodyStream = Symbol("wrapBodyStream");
	var newRequestFromIncoming = (method, url, headers, incoming, abortController) => {
		const init = {
			method,
			headers,
			signal: abortController.signal
		};
		if (method === "TRACE") {
			init.method = "GET";
			const req = new Request$1(url, init);
			Object.defineProperty(req, "method", { get() {
				return "TRACE";
			} });
			return req;
		}
		if (!(method === "GET" || method === "HEAD")) if ("rawBody" in incoming && incoming.rawBody instanceof Buffer) init.body = new ReadableStream({ start(controller) {
			controller.enqueue(incoming.rawBody);
			controller.close();
		} });
		else if (incoming[wrapBodyStream]) {
			let reader;
			init.body = new ReadableStream({ async pull(controller) {
				try {
					reader ||= node_stream.Readable.toWeb(incoming).getReader();
					const { done, value } = await reader.read();
					if (done) controller.close();
					else controller.enqueue(value);
				} catch (error) {
					controller.error(error);
				}
			} });
		} else init.body = node_stream.Readable.toWeb(incoming);
		return new Request$1(url, init);
	};
	var getRequestCache = Symbol("getRequestCache");
	var requestCache = Symbol("requestCache");
	var incomingKey = Symbol("incomingKey");
	var urlKey = Symbol("urlKey");
	var methodKey = Symbol("methodKey");
	var headersKey = Symbol("headersKey");
	var abortControllerKey = Symbol("abortControllerKey");
	var getAbortController = Symbol("getAbortController");
	var abortRequest = Symbol("abortRequest");
	var bodyBufferKey = Symbol("bodyBuffer");
	var bodyReadPromiseKey = Symbol("bodyReadPromise");
	var bodyConsumedDirectlyKey = Symbol("bodyConsumedDirectly");
	var bodyLockReaderKey = Symbol("bodyLockReader");
	var abortReasonKey = Symbol("abortReason");
	var newBodyUnusableError = () => {
		return /* @__PURE__ */ new TypeError("Body is unusable");
	};
	var rejectBodyUnusable = () => {
		return Promise.reject(newBodyUnusableError());
	};
	var textDecoder = new TextDecoder();
	var consumeBodyDirectOnce = (request) => {
		if (request[bodyConsumedDirectlyKey]) return rejectBodyUnusable();
		request[bodyConsumedDirectlyKey] = true;
	};
	var toArrayBuffer = (buf) => {
		return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
	};
	var contentType = (request) => {
		return (request[headersKey] ||= newHeadersFromIncoming(request[incomingKey])).get("content-type") || "";
	};
	var methodTokenRegExp = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
	var normalizeIncomingMethod = (method) => {
		if (typeof method !== "string" || method.length === 0) return "GET";
		switch (method) {
			case "DELETE":
			case "GET":
			case "HEAD":
			case "OPTIONS":
			case "POST":
			case "PUT": return method;
		}
		const upper = method.toUpperCase();
		switch (upper) {
			case "DELETE":
			case "GET":
			case "HEAD":
			case "OPTIONS":
			case "POST":
			case "PUT": return upper;
			default: return method;
		}
	};
	var validateDirectReadMethod = (method) => {
		if (!methodTokenRegExp.test(method)) return /* @__PURE__ */ new TypeError(`'${method}' is not a valid HTTP method.`);
		const normalized = method.toUpperCase();
		if (normalized === "CONNECT" || normalized === "TRACK" || normalized === "TRACE" && method !== "TRACE") return /* @__PURE__ */ new TypeError(`'${method}' HTTP method is unsupported.`);
	};
	var readBodyWithFastPath = (request, method, fromBuffer) => {
		if (request[bodyConsumedDirectlyKey]) return rejectBodyUnusable();
		const methodName = request.method;
		if (methodName === "GET" || methodName === "HEAD") return request[getRequestCache]()[method]();
		const methodValidationError = validateDirectReadMethod(methodName);
		if (methodValidationError) return Promise.reject(methodValidationError);
		if (request[requestCache]) {
			if (methodName !== "TRACE") return request[requestCache][method]();
		}
		const alreadyUsedError = consumeBodyDirectOnce(request);
		if (alreadyUsedError) return alreadyUsedError;
		const raw = readRawBodyIfAvailable(request);
		if (raw) {
			const result = Promise.resolve(fromBuffer(raw, request));
			request[bodyBufferKey] = void 0;
			return result;
		}
		return readBodyDirect(request).then((buf) => {
			const result = fromBuffer(buf, request);
			request[bodyBufferKey] = void 0;
			return result;
		});
	};
	var readRawBodyIfAvailable = (request) => {
		const incoming = request[incomingKey];
		if ("rawBody" in incoming && incoming.rawBody instanceof Buffer) return incoming.rawBody;
	};
	var readBodyDirect = (request) => {
		if (request[bodyBufferKey]) return Promise.resolve(request[bodyBufferKey]);
		if (request[bodyReadPromiseKey]) return request[bodyReadPromiseKey];
		const incoming = request[incomingKey];
		if (node_stream.Readable.isDisturbed(incoming)) return rejectBodyUnusable();
		const promise = new Promise((resolve, reject) => {
			const chunks = [];
			let settled = false;
			const finish = (callback) => {
				if (settled) return;
				settled = true;
				cleanup();
				callback();
			};
			const onData = (chunk) => {
				chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
			};
			const onEnd = () => {
				finish(() => {
					const buffer = chunks.length === 1 ? chunks[0] : Buffer.concat(chunks);
					request[bodyBufferKey] = buffer;
					resolve(buffer);
				});
			};
			const onError = (error) => {
				finish(() => {
					reject(error);
				});
			};
			const onClose = () => {
				if (incoming.readableEnded) {
					onEnd();
					return;
				}
				finish(() => {
					if (incoming.errored) {
						reject(incoming.errored);
						return;
					}
					const reason = request[abortReasonKey];
					if (reason !== void 0) {
						reject(reason instanceof Error ? reason : new Error(String(reason)));
						return;
					}
					reject(/* @__PURE__ */ new Error("Client connection prematurely closed."));
				});
			};
			const cleanup = () => {
				incoming.off("data", onData);
				incoming.off("end", onEnd);
				incoming.off("error", onError);
				incoming.off("close", onClose);
				request[bodyReadPromiseKey] = void 0;
			};
			incoming.on("data", onData);
			incoming.on("end", onEnd);
			incoming.on("error", onError);
			incoming.on("close", onClose);
			queueMicrotask(() => {
				if (settled) return;
				if (incoming.readableEnded) onEnd();
				else if (incoming.errored) onError(incoming.errored);
				else if (incoming.destroyed) onClose();
			});
		});
		request[bodyReadPromiseKey] = promise;
		return promise;
	};
	var requestPrototype = {
		get method() {
			return this[methodKey];
		},
		get url() {
			return this[urlKey];
		},
		get headers() {
			return this[headersKey] ||= newHeadersFromIncoming(this[incomingKey]);
		},
		[abortRequest](reason) {
			if (this[abortReasonKey] === void 0) this[abortReasonKey] = reason;
			const abortController = this[abortControllerKey];
			if (abortController && !abortController.signal.aborted) abortController.abort(reason);
		},
		[getAbortController]() {
			this[abortControllerKey] ||= new AbortController();
			if (this[abortReasonKey] !== void 0 && !this[abortControllerKey].signal.aborted) this[abortControllerKey].abort(this[abortReasonKey]);
			return this[abortControllerKey];
		},
		[getRequestCache]() {
			const abortController = this[getAbortController]();
			if (this[requestCache]) return this[requestCache];
			const method = this.method;
			if (this[bodyConsumedDirectlyKey] && !(method === "GET" || method === "HEAD")) {
				this[bodyBufferKey] = void 0;
				const init = {
					method: method === "TRACE" ? "GET" : method,
					headers: this.headers,
					signal: abortController.signal
				};
				if (method !== "TRACE") {
					init.body = new ReadableStream({ start(c) {
						c.close();
					} });
					init.duplex = "half";
				}
				const req = new Request$1(this[urlKey], init);
				if (method === "TRACE") Object.defineProperty(req, "method", { get() {
					return "TRACE";
				} });
				return this[requestCache] = req;
			}
			return this[requestCache] = newRequestFromIncoming(this.method, this[urlKey], this.headers, this[incomingKey], abortController);
		},
		get body() {
			if (!this[bodyConsumedDirectlyKey]) return this[getRequestCache]().body;
			const request = this[getRequestCache]();
			if (!this[bodyLockReaderKey] && request.body) this[bodyLockReaderKey] = request.body.getReader();
			return request.body;
		},
		get bodyUsed() {
			if (this[bodyConsumedDirectlyKey]) return true;
			if (this[requestCache]) return this[requestCache].bodyUsed;
			return false;
		}
	};
	Object.defineProperty(requestPrototype, "signal", { get() {
		return this[getAbortController]().signal;
	} });
	[
		"cache",
		"credentials",
		"destination",
		"integrity",
		"mode",
		"redirect",
		"referrer",
		"referrerPolicy",
		"keepalive"
	].forEach((k) => {
		Object.defineProperty(requestPrototype, k, { get() {
			return this[getRequestCache]()[k];
		} });
	});
	["clone", "formData"].forEach((k) => {
		Object.defineProperty(requestPrototype, k, { value: function() {
			if (this[bodyConsumedDirectlyKey]) {
				if (k === "clone") throw newBodyUnusableError();
				return rejectBodyUnusable();
			}
			return this[getRequestCache]()[k]();
		} });
	});
	Object.defineProperty(requestPrototype, "text", { value: function() {
		return readBodyWithFastPath(this, "text", (buf) => textDecoder.decode(buf));
	} });
	Object.defineProperty(requestPrototype, "arrayBuffer", { value: function() {
		return readBodyWithFastPath(this, "arrayBuffer", (buf) => toArrayBuffer(buf));
	} });
	Object.defineProperty(requestPrototype, "blob", { value: function() {
		return readBodyWithFastPath(this, "blob", (buf, request) => {
			const type = contentType(request);
			return new Response(buf, type ? { headers: { "content-type": type } } : void 0).blob();
		});
	} });
	Object.defineProperty(requestPrototype, "json", { value: function() {
		if (this[bodyConsumedDirectlyKey]) return rejectBodyUnusable();
		return this.text().then(JSON.parse);
	} });
	Object.defineProperty(requestPrototype, Symbol.for("nodejs.util.inspect.custom"), { value: function(depth, options, inspectFn) {
		return `Request (lightweight) ${inspectFn({
			method: this.method,
			url: this.url,
			headers: this.headers,
			nativeRequest: this[requestCache]
		}, {
			...options,
			depth: depth == null ? null : depth - 1
		})}`;
	} });
	Object.setPrototypeOf(requestPrototype, Request$1.prototype);
	var newRequest = (incoming, defaultHostname) => {
		const req = Object.create(requestPrototype);
		req[incomingKey] = incoming;
		req[methodKey] = normalizeIncomingMethod(incoming.method);
		const incomingUrl = incoming.url || "";
		if (incomingUrl[0] !== "/" && (incomingUrl.startsWith("http://") || incomingUrl.startsWith("https://"))) {
			if (incoming instanceof node_http2.Http2ServerRequest) throw new RequestError("Absolute URL for :path is not allowed in HTTP/2");
			try {
				req[urlKey] = new URL(incomingUrl).href;
			} catch (e) {
				throw new RequestError("Invalid absolute URL", { cause: e });
			}
			return req;
		}
		const host = (incoming instanceof node_http2.Http2ServerRequest ? incoming.authority : incoming.headers.host) || defaultHostname;
		if (!host) throw new RequestError("Missing host header");
		let scheme;
		if (incoming instanceof node_http2.Http2ServerRequest) {
			scheme = incoming.scheme;
			if (!(scheme === "http" || scheme === "https")) throw new RequestError("Unsupported scheme");
		} else scheme = incoming.socket && incoming.socket.encrypted ? "https" : "http";
		try {
			req[urlKey] = buildUrl(scheme, host, incomingUrl);
		} catch (e) {
			if (e instanceof RequestError) throw e;
			else throw new RequestError("Invalid URL", { cause: e });
		}
		return req;
	};
	var defaultContentType = "text/plain; charset=UTF-8";
	var responseCache = Symbol("responseCache");
	var getResponseCache = Symbol("getResponseCache");
	var cacheKey = Symbol("cache");
	var GlobalResponse = global.Response;
	var Response$1 = class Response$1 {
		#body;
		#init;
		[getResponseCache]() {
			const cache = this[cacheKey];
			const liveHeaders = cache && cache[2] instanceof Headers ? cache[2] : void 0;
			delete this[cacheKey];
			return this[responseCache] ||= new GlobalResponse(this.#body, liveHeaders ? {
				status: this.#init?.status,
				statusText: this.#init?.statusText,
				headers: liveHeaders
			} : this.#init);
		}
		constructor(body, init) {
			let headers;
			this.#body = body;
			if (init instanceof Response$1) {
				const cachedGlobalResponse = init[responseCache];
				if (cachedGlobalResponse) {
					this.#init = cachedGlobalResponse;
					this[getResponseCache]();
					return;
				} else {
					this.#init = init.#init;
					headers = new Headers(init.headers);
				}
			} else this.#init = init;
			if (body == null || typeof body === "string" || typeof body?.getReader !== "undefined" || body instanceof Blob || body instanceof Uint8Array) this[cacheKey] = [
				init?.status || 200,
				body ?? null,
				headers || init?.headers
			];
		}
		get headers() {
			const cache = this[cacheKey];
			if (cache) {
				if (!(cache[2] instanceof Headers)) cache[2] = new Headers(cache[2] || (cache[1] === null ? void 0 : { "content-type": defaultContentType }));
				return cache[2];
			}
			return this[getResponseCache]().headers;
		}
		get status() {
			return this[cacheKey]?.[0] ?? this[getResponseCache]().status;
		}
		get ok() {
			const status = this.status;
			return status >= 200 && status < 300;
		}
	};
	[
		"body",
		"bodyUsed",
		"redirected",
		"statusText",
		"trailers",
		"type",
		"url"
	].forEach((k) => {
		Object.defineProperty(Response$1.prototype, k, { get() {
			return this[getResponseCache]()[k];
		} });
	});
	[
		"arrayBuffer",
		"blob",
		"clone",
		"formData",
		"json",
		"text"
	].forEach((k) => {
		Object.defineProperty(Response$1.prototype, k, { value: function() {
			return this[getResponseCache]()[k]();
		} });
	});
	Object.defineProperty(Response$1.prototype, Symbol.for("nodejs.util.inspect.custom"), { value: function(depth, options, inspectFn) {
		return `Response (lightweight) ${inspectFn({
			status: this.status,
			headers: this.headers,
			ok: this.ok,
			nativeResponse: this[responseCache]
		}, {
			...options,
			depth: depth == null ? null : depth - 1
		})}`;
	} });
	Object.setPrototypeOf(Response$1, GlobalResponse);
	Object.setPrototypeOf(Response$1.prototype, GlobalResponse.prototype);
	var validRedirectUrl = /^https?:\/\/[!#-;=?-[\]_a-z~A-Z]+$/;
	var parseRedirectUrl = (url) => {
		if (url instanceof URL) return url.href;
		if (validRedirectUrl.test(url)) return url;
		return new URL(url).href;
	};
	var validRedirectStatuses = /* @__PURE__ */ new Set([
		301,
		302,
		303,
		307,
		308
	]);
	Object.defineProperty(Response$1, "redirect", {
		value: function redirect(url, status = 302) {
			if (!validRedirectStatuses.has(status)) throw new RangeError("Invalid status code");
			return new Response$1(null, {
				status,
				headers: { location: parseRedirectUrl(url) }
			});
		},
		writable: true,
		configurable: true
	});
	Object.defineProperty(Response$1, "json", {
		value: function json(data, init) {
			const body = JSON.stringify(data);
			if (body === void 0) throw new TypeError("The data is not JSON serializable");
			const initHeaders = init?.headers;
			let headers;
			if (initHeaders) {
				headers = new Headers(initHeaders);
				if (!headers.has("content-type")) headers.set("content-type", "application/json");
			} else headers = { "content-type": "application/json" };
			return new Response$1(body, {
				status: init?.status ?? 200,
				statusText: init?.statusText,
				headers
			});
		},
		writable: true,
		configurable: true
	});
	async function readWithoutBlocking(readPromise) {
		return Promise.race([readPromise, Promise.resolve().then(() => Promise.resolve(void 0))]);
	}
	function writeFromReadableStreamDefaultReader(reader, writable, currentReadPromise) {
		const cancel = (error) => {
			reader.cancel(error).catch(() => {});
		};
		writable.on("close", cancel);
		writable.on("error", cancel);
		(currentReadPromise ?? reader.read()).then(flow, handleStreamError);
		return reader.closed.finally(() => {
			writable.off("close", cancel);
			writable.off("error", cancel);
		});
		function handleStreamError(error) {
			if (error) writable.destroy(error);
		}
		function onDrain() {
			reader.read().then(flow, handleStreamError);
		}
		function flow({ done, value }) {
			try {
				if (done) writable.end();
				else if (!writable.write(value)) writable.once("drain", onDrain);
				else return reader.read().then(flow, handleStreamError);
			} catch (e) {
				handleStreamError(e);
			}
		}
	}
	function writeFromReadableStream(stream, writable) {
		if (stream.locked) throw new TypeError("ReadableStream is locked.");
		else if (writable.destroyed) return;
		return writeFromReadableStreamDefaultReader(stream.getReader(), writable);
	}
	var buildOutgoingHttpHeaders = (headers, defaultContentType) => {
		const res = {};
		if (!(headers instanceof Headers)) headers = new Headers(headers ?? void 0);
		if (headers.has("set-cookie")) {
			const cookies = [];
			for (const [k, v] of headers) if (k === "set-cookie") cookies.push(v);
			else res[k] = v;
			if (cookies.length > 0) res["set-cookie"] = cookies;
		} else for (const [k, v] of headers) res[k] = v;
		if (defaultContentType) res["content-type"] ??= defaultContentType;
		return res;
	};
	var outgoingEnded = Symbol("outgoingEnded");
	var incomingDraining = Symbol("incomingDraining");
	var DRAIN_TIMEOUT_MS = 500;
	var MAX_DRAIN_BYTES = 64 * 1024 * 1024;
	var drainIncoming = (incoming) => {
		const incomingWithDrainState = incoming;
		if (incoming.destroyed || incomingWithDrainState[incomingDraining]) return;
		incomingWithDrainState[incomingDraining] = true;
		if (incoming instanceof node_http2.Http2ServerRequest) {
			try {
				incoming.stream?.close?.(node_http2.constants.NGHTTP2_NO_ERROR);
			} catch {}
			return;
		}
		let bytesRead = 0;
		const cleanup = () => {
			clearTimeout(timer);
			incoming.off("data", onData);
			incoming.off("end", cleanup);
			incoming.off("error", cleanup);
		};
		const forceClose = () => {
			cleanup();
			const socket = incoming.socket;
			if (socket && !socket.destroyed) socket.destroySoon();
		};
		const timer = setTimeout(forceClose, DRAIN_TIMEOUT_MS);
		timer.unref?.();
		const onData = (chunk) => {
			bytesRead += chunk.length;
			if (bytesRead > MAX_DRAIN_BYTES) forceClose();
		};
		incoming.on("data", onData);
		incoming.on("end", cleanup);
		incoming.on("error", cleanup);
		incoming.resume();
	};
	var makeCloseHandler = (req, incoming, outgoing, needsBodyCleanup) => () => {
		if (incoming.errored) req[abortRequest](incoming.errored.toString());
		else if (!outgoing.writableFinished) req[abortRequest]("Client connection prematurely closed.");
		if (needsBodyCleanup && !incoming.readableEnded) setTimeout(() => {
			if (!incoming.readableEnded) setTimeout(() => {
				drainIncoming(incoming);
			});
		});
	};
	var isImmediateCacheableResponse = (res) => {
		if (!(cacheKey in res)) return false;
		const body = res[cacheKey][1];
		return body === null || typeof body === "string" || body instanceof Uint8Array;
	};
	var handleRequestError = () => new Response(null, { status: 400 });
	var handleFetchError = (e) => new Response(null, { status: e instanceof Error && (e.name === "TimeoutError" || e.constructor.name === "TimeoutError") ? 504 : 500 });
	var handleResponseError = (e, outgoing) => {
		const err = e instanceof Error ? e : new Error("unknown error", { cause: e });
		if (err.code === "ERR_STREAM_PREMATURE_CLOSE") console.info("The user aborted a request.");
		else {
			console.error(e);
			if (!outgoing.headersSent) outgoing.writeHead(500, { "Content-Type": "text/plain" });
			outgoing.end(`Error: ${err.message}`);
			outgoing.destroy(err);
		}
	};
	var flushHeaders = (outgoing) => {
		if ("flushHeaders" in outgoing && outgoing.writable) outgoing.flushHeaders();
	};
	var responseViaCache = async (res, outgoing) => {
		let [status, body, header] = res[cacheKey];
		if (!header) {
			if (body === null) {
				outgoing.writeHead(status);
				outgoing.end();
			} else if (typeof body === "string") {
				outgoing.writeHead(status, {
					"Content-Type": defaultContentType,
					"Content-Length": Buffer.byteLength(body)
				});
				outgoing.end(body);
			} else if (body instanceof Uint8Array) {
				outgoing.writeHead(status, {
					"Content-Type": defaultContentType,
					"Content-Length": body.byteLength
				});
				outgoing.end(body);
			} else if (body instanceof Blob) {
				outgoing.writeHead(status, {
					"Content-Type": defaultContentType,
					"Content-Length": body.size
				});
				outgoing.end(new Uint8Array(await body.arrayBuffer()));
			} else {
				outgoing.writeHead(status, { "Content-Type": defaultContentType });
				flushHeaders(outgoing);
				await writeFromReadableStream(body, outgoing)?.catch((e) => handleResponseError(e, outgoing));
			}
			outgoing[outgoingEnded]?.();
			return;
		}
		let hasContentLength = false;
		if (header instanceof Headers) {
			hasContentLength = header.has("content-length");
			header = buildOutgoingHttpHeaders(header, body === null ? void 0 : defaultContentType);
		} else if (Array.isArray(header)) {
			const headerObj = new Headers(header);
			hasContentLength = headerObj.has("content-length");
			header = buildOutgoingHttpHeaders(headerObj, body === null ? void 0 : defaultContentType);
		} else for (const key in header) if (key.length === 14 && key.toLowerCase() === "content-length") {
			hasContentLength = true;
			break;
		}
		if (!hasContentLength) {
			if (typeof body === "string") header["Content-Length"] = Buffer.byteLength(body);
			else if (body instanceof Uint8Array) header["Content-Length"] = body.byteLength;
			else if (body instanceof Blob) header["Content-Length"] = body.size;
		}
		outgoing.writeHead(status, header);
		if (body == null) outgoing.end();
		else if (typeof body === "string" || body instanceof Uint8Array) outgoing.end(body);
		else if (body instanceof Blob) outgoing.end(new Uint8Array(await body.arrayBuffer()));
		else {
			flushHeaders(outgoing);
			await writeFromReadableStream(body, outgoing)?.catch((e) => handleResponseError(e, outgoing));
		}
		outgoing[outgoingEnded]?.();
	};
	var isPromise = (res) => typeof res.then === "function";
	var responseViaResponseObject = async (res, outgoing, options = {}) => {
		if (isPromise(res)) if (options.errorHandler) try {
			res = await res;
		} catch (err) {
			const errRes = await options.errorHandler(err);
			if (!errRes) return;
			res = errRes;
		}
		else res = await res.catch(handleFetchError);
		if (cacheKey in res) return responseViaCache(res, outgoing);
		const resHeaderRecord = buildOutgoingHttpHeaders(res.headers, res.body === null ? void 0 : defaultContentType);
		if (res.body) {
			const reader = res.body.getReader();
			const values = [];
			let done = false;
			let currentReadPromise = void 0;
			if (resHeaderRecord["transfer-encoding"] !== "chunked") {
				let maxReadCount = 2;
				for (let i = 0; i < maxReadCount; i++) {
					currentReadPromise ||= reader.read();
					const chunk = await readWithoutBlocking(currentReadPromise).catch((e) => {
						console.error(e);
						done = true;
					});
					if (!chunk) {
						if (i === 1) {
							await new Promise((resolve) => setTimeout(resolve));
							maxReadCount = 3;
							continue;
						}
						break;
					}
					currentReadPromise = void 0;
					if (chunk.value) values.push(chunk.value);
					if (chunk.done) {
						done = true;
						break;
					}
				}
				if (done && !("content-length" in resHeaderRecord)) resHeaderRecord["content-length"] = values.reduce((acc, value) => acc + value.length, 0);
			}
			outgoing.writeHead(res.status, resHeaderRecord);
			values.forEach((value) => {
				outgoing.write(value);
			});
			if (done) outgoing.end();
			else {
				if (values.length === 0) flushHeaders(outgoing);
				await writeFromReadableStreamDefaultReader(reader, outgoing, currentReadPromise);
			}
		} else if (resHeaderRecord[require_constants.X_ALREADY_SENT]) {} else {
			outgoing.writeHead(res.status, resHeaderRecord);
			outgoing.end();
		}
		outgoing[outgoingEnded]?.();
	};
	var getRequestListener = (fetchCallback, options = {}) => {
		const autoCleanupIncoming = options.autoCleanupIncoming ?? true;
		if (options.overrideGlobalObjects !== false && global.Request !== Request$1) {
			Object.defineProperty(global, "Request", { value: Request$1 });
			Object.defineProperty(global, "Response", { value: Response$1 });
		}
		return async (incoming, outgoing) => {
			let res, req;
			let needsBodyCleanup = false;
			let closeHandlerAttached = false;
			const ensureCloseHandler = () => {
				if (!req || closeHandlerAttached) return;
				closeHandlerAttached = true;
				outgoing.on("close", makeCloseHandler(req, incoming, outgoing, needsBodyCleanup));
			};
			try {
				req = newRequest(incoming, options.hostname);
				needsBodyCleanup = autoCleanupIncoming && !(incoming.method === "GET" || incoming.method === "HEAD");
				if (needsBodyCleanup) {
					incoming[wrapBodyStream] = true;
					if (incoming instanceof node_http2.Http2ServerRequest) outgoing[outgoingEnded] = () => {
						if (!incoming.readableEnded) setTimeout(() => {
							if (!incoming.readableEnded) setTimeout(() => {
								incoming.destroy();
								outgoing.destroy();
							});
						});
					};
				}
				res = fetchCallback(req, {
					incoming,
					outgoing
				});
				if (!isPromise(res) && isImmediateCacheableResponse(res)) {
					if (needsBodyCleanup && !incoming.readableEnded) outgoing.once("finish", () => {
						if (!incoming.readableEnded) drainIncoming(incoming);
					});
					return responseViaCache(res, outgoing);
				}
				ensureCloseHandler();
			} catch (e) {
				if (!res) if (options.errorHandler) {
					ensureCloseHandler();
					res = await options.errorHandler(req ? e : toRequestError(e));
					if (!res) return;
				} else if (!req) res = handleRequestError();
				else res = handleFetchError(e);
				else return handleResponseError(e, outgoing);
			}
			try {
				return await responseViaResponseObject(res, outgoing, options);
			} catch (e) {
				return handleResponseError(e, outgoing);
			}
		};
	};
	/**
	* @link https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent
	*/
	var CloseEvent = globalThis.CloseEvent ?? class extends Event {
		#eventInitDict;
		constructor(type, eventInitDict = {}) {
			super(type, eventInitDict);
			this.#eventInitDict = eventInitDict;
		}
		get wasClean() {
			return this.#eventInitDict.wasClean ?? false;
		}
		get code() {
			return this.#eventInitDict.code ?? 0;
		}
		get reason() {
			return this.#eventInitDict.reason ?? "";
		}
	};
	var generateConnectionSymbol = () => Symbol("connection");
	var CONNECTION_SYMBOL_KEY = Symbol("CONNECTION_SYMBOL_KEY");
	var WAIT_FOR_WEBSOCKET_SYMBOL = Symbol("WAIT_FOR_WEBSOCKET_SYMBOL");
	var responseHeadersToSkip = /* @__PURE__ */ new Set([
		"connection",
		"content-length",
		"keep-alive",
		"proxy-authenticate",
		"proxy-authorization",
		"te",
		"trailer",
		"transfer-encoding",
		"upgrade",
		"sec-websocket-accept",
		"sec-websocket-extensions",
		"sec-websocket-protocol"
	]);
	var appendResponseHeaders = (headers, responseHeaders) => {
		if (!responseHeaders) return;
		responseHeaders.forEach((value, key) => {
			if (responseHeadersToSkip.has(key.toLowerCase())) return;
			headers.push(`${key}: ${value}`);
		});
	};
	var rejectUpgradeRequest = (socket, status, responseHeaders) => {
		const responseLines = ["Connection: close", "Content-Length: 0"];
		appendResponseHeaders(responseLines, responseHeaders);
		socket.end(`HTTP/1.1 ${status.toString()} ${node_http.STATUS_CODES[status] ?? ""}\r\n${responseLines.join("\r\n")}\r\n\r
`);
	};
	var createUpgradeRequest = (request) => {
		const protocol = request.socket.encrypted ? "https" : "http";
		const url = new URL(request.url ?? "/", `${protocol}://${request.headers.host ?? "localhost"}`);
		const headers = new Headers();
		for (const key in request.headers) {
			const value = request.headers[key];
			if (!value) continue;
			headers.append(key, Array.isArray(value) ? value[0] : value);
		}
		return new Request(url, { headers });
	};
	var setupWebSocket = (options) => {
		const { server, fetchCallback, wss } = options;
		const waiterMap = /* @__PURE__ */ new Map();
		wss.on("connection", (ws, request) => {
			const waiter = waiterMap.get(request);
			if (waiter) {
				waiter.resolve(ws);
				waiterMap.delete(request);
			}
		});
		const waitForWebSocket = (request, connectionSymbol) => {
			return new Promise((resolve) => {
				waiterMap.set(request, {
					resolve,
					connectionSymbol
				});
			});
		};
		server.on("upgrade", async (request, socket, head) => {
			if (request.headers.upgrade?.toLowerCase() !== "websocket") return;
			const env = {
				incoming: request,
				outgoing: void 0,
				wss,
				[WAIT_FOR_WEBSOCKET_SYMBOL]: waitForWebSocket
			};
			let status = 400;
			let responseHeaders;
			try {
				const response = await fetchCallback(createUpgradeRequest(request), env);
				if (response instanceof Response) {
					status = response.status;
					responseHeaders = response.headers;
				}
			} catch {
				if (server.listenerCount("upgrade") === 1) rejectUpgradeRequest(socket, 500);
				return;
			}
			const waiter = waiterMap.get(request);
			if (!waiter || waiter.connectionSymbol !== env[CONNECTION_SYMBOL_KEY]) {
				waiterMap.delete(request);
				if (server.listenerCount("upgrade") === 1) rejectUpgradeRequest(socket, status, responseHeaders);
				return;
			}
			const addResponseHeaders = (headers) => {
				appendResponseHeaders(headers, responseHeaders);
			};
			wss.on("headers", addResponseHeaders);
			try {
				wss.handleUpgrade(request, socket, head, (ws) => {
					wss.emit("connection", ws, request);
				});
			} finally {
				wss.off("headers", addResponseHeaders);
			}
		});
		server.on("close", () => {
			wss.close();
		});
	};
	var upgradeWebSocket = (0, hono_ws.defineWebSocketHelper)(async (c, events, options) => {
		if (c.req.header("upgrade")?.toLowerCase() !== "websocket") return;
		const env = c.env;
		const waitForWebSocket = env[WAIT_FOR_WEBSOCKET_SYMBOL];
		if (!waitForWebSocket || !env.incoming) return new Response(null, { status: 500 });
		const connectionSymbol = generateConnectionSymbol();
		env[CONNECTION_SYMBOL_KEY] = connectionSymbol;
		(async () => {
			const ws = await waitForWebSocket(env.incoming, connectionSymbol);
			const messagesReceivedInStarting = [];
			const bufferMessage = (data, isBinary) => {
				messagesReceivedInStarting.push([data, isBinary]);
			};
			ws.on("message", bufferMessage);
			const ctx = {
				binaryType: "arraybuffer",
				close(code, reason) {
					ws.close(code, reason);
				},
				protocol: ws.protocol,
				raw: ws,
				get readyState() {
					return ws.readyState;
				},
				send(source, opts) {
					ws.send(source, { compress: opts?.compress });
				},
				url: new URL(c.req.url)
			};
			try {
				events?.onOpen?.(new Event("open"), ctx);
			} catch (e) {
				(options?.onError ?? console.error)(e);
			}
			const handleMessage = (data, isBinary) => {
				const datas = Array.isArray(data) ? data : [data];
				for (const data of datas) try {
					events?.onMessage?.(new MessageEvent("message", { data: isBinary ? data instanceof ArrayBuffer ? data : data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) : typeof data === "string" ? data : Buffer.from(data).toString("utf-8") }), ctx);
				} catch (e) {
					(options?.onError ?? console.error)(e);
				}
			};
			ws.off("message", bufferMessage);
			for (const message of messagesReceivedInStarting) handleMessage(...message);
			ws.on("message", (data, isBinary) => {
				handleMessage(data, isBinary);
			});
			ws.on("close", (code, reason) => {
				try {
					events?.onClose?.(new CloseEvent("close", {
						code,
						reason: reason.toString()
					}), ctx);
				} catch (e) {
					(options?.onError ?? console.error)(e);
				}
			});
			ws.on("error", (error) => {
				try {
					events?.onError?.(new ErrorEvent("error", { error }), ctx);
				} catch (e) {
					(options?.onError ?? console.error)(e);
				}
			});
		})();
		return new Response();
	});
	var createAdaptorServer = (options) => {
		const fetchCallback = options.fetch;
		const requestListener = getRequestListener(fetchCallback, {
			hostname: options.hostname,
			overrideGlobalObjects: options.overrideGlobalObjects,
			autoCleanupIncoming: options.autoCleanupIncoming
		});
		const server = (options.createServer || node_http.createServer)(options.serverOptions || {}, requestListener);
		if (options.websocket && options.websocket.server) {
			if (options.websocket.server.options.noServer !== true) throw new Error("WebSocket server must be created with { noServer: true } option");
			setupWebSocket({
				server,
				fetchCallback,
				wss: options.websocket.server
			});
		}
		return server;
	};
	var serve = (options, listeningListener) => {
		const server = createAdaptorServer(options);
		server.listen(options?.port ?? 3e3, options.hostname, () => {
			const serverInfo = server.address();
			listeningListener && listeningListener(serverInfo);
		});
		return server;
	};
	exports.RequestError = RequestError;
	exports.createAdaptorServer = createAdaptorServer;
	exports.getRequestListener = getRequestListener;
	exports.serve = serve;
	exports.upgradeWebSocket = upgradeWebSocket;
})))();
var explorer_exports = /* @__PURE__ */ __exportAll({
	default: () => explorer_default,
	route: () => route
});
var calculator = defineTool({
	name: "calculator",
	description: "Evaluate a mathematical expression. Supports basic arithmetic (+, -, *, /, **, %). Returns the numeric result as a string.",
	input: v.object({ expression: v.pipe(v.string(), v.description("A JavaScript arithmetic expression to evaluate, e.g. \"2 + 2\" or \"Math.sqrt(144)\"")) }),
	run: async ({ input }) => {
		const result = Function(`"use strict"; return (${input.expression})`)();
		return String(result);
	}
});
var explorerProfile = defineAgentProfile({ instructions: [
	"You are Explorer, a helpful assistant deployed on GEAP Agent Runtime.",
	"You run inside a managed sandbox with SPIFFE-based agent identity.",
	"You can perform calculations using the calculator tool.",
	"Be concise and direct in your responses."
].join("\n") });
/**
* Export a route middleware to opt the agent into HTTP transport.
* Without this, the Flue runtime does not expose POST /agents/explorer/:id
* in production builds (temporaryLocalExposure is false).
*/
var route = async (_c, next) => {
	await next();
};
var explorer_default = defineAgent(() => ({
	profile: explorerProfile,
	model: process.env["FLUE_MODEL"] ?? "google/gemini-3.1-flash-lite",
	tools: [calculator],
	sandbox: local()
}));
//#endregion
//#region .flue-vite/_entry_server.ts
function normalizeBuiltModules(agentModules, workflowModules, channelModules = {}) {
	const agents = [];
	const workflows = [];
	const channelHandlers = {};
	for (const [name, mod] of Object.entries(agentModules)) {
		if (!mod.default || mod.default.__flueAgentDefinition !== true || typeof mod.default.initialize !== "function") throw new Error("[flue] Agent \"" + name + "\" must default-export defineAgent(...).");
		if (mod.route !== void 0 && typeof mod.route !== "function") throw new Error("[flue] Agent \"" + name + "\" route export must be a callable Hono middleware value.");
		if (mod.attachments !== void 0 && typeof mod.attachments !== "function") throw new Error("[flue] Agent \"" + name + "\" attachments export must be a callable Hono middleware value.");
		if (mod.description !== void 0 && (typeof mod.description !== "string" || mod.description.trim().length === 0)) throw new Error("[flue] Agent \"" + name + "\" description export must be a non-empty string.");
		const previous = agents.find((agent) => agent.definition === mod.default);
		if (previous) throw new Error("[flue] Agents \"" + previous.name + "\" and \"" + name + "\" default-export the same agent definition value. Use distinct defineAgent(...) values for dispatchable agent modules.");
		const agent = {
			name,
			definition: mod.default
		};
		if (mod.description !== void 0) agent.description = mod.description;
		if (typeof mod.route === "function") agent.route = mod.route;
		if (typeof mod.attachments === "function") agent.attachments = mod.attachments;
		agents.push(agent);
	}
	for (const [name, mod] of Object.entries(workflowModules)) {
		assertWorkflowDefinition(mod.default, name);
		if (mod.route !== void 0 && typeof mod.route !== "function") throw new Error("[flue] Workflow \"" + name + "\" route export must be a callable Hono middleware value.");
		if (mod.runs !== void 0 && typeof mod.runs !== "function") throw new Error("[flue] Workflow \"" + name + "\" runs export must be a callable Hono middleware value.");
		const previous = workflows.find((workflow) => workflow.definition === mod.default);
		if (previous) throw new Error("[flue] Workflows \"" + previous.name + "\" and \"" + name + "\" default-export the same workflow definition value. Use distinct defineWorkflow(...) values for workflow modules.");
		const workflow = {
			name,
			definition: mod.default
		};
		if (typeof mod.route === "function") workflow.route = mod.route;
		if (typeof mod.runs === "function") workflow.runs = mod.runs;
		workflows.push(workflow);
	}
	for (const [name, mod] of Object.entries(channelModules)) {
		const channel = mod.channel;
		if (!channel || typeof channel !== "object" || Array.isArray(channel)) throw new Error("[flue] Channel \"" + name + "\" must export a created channel as the named \"channel\" binding.");
		if (!Array.isArray(channel.routes) || channel.routes.length === 0) throw new Error("[flue] Channel \"" + name + "\" must declare at least one route.");
		const routes = {};
		for (const route of channel.routes) {
			if (!route || typeof route !== "object" || Array.isArray(route)) throw new Error("[flue] Channel \"" + name + "\" contains an invalid route declaration.");
			if (typeof route.method !== "string" || !/^[A-Z]+$/.test(route.method)) throw new Error("[flue] Channel \"" + name + "\" route method must contain only uppercase ASCII letters.");
			if (typeof route.path !== "string" || route.path.length < 2 || !route.path.startsWith("/") || route.path.startsWith("//") || route.path.includes("?") || route.path.includes("#")) throw new Error("[flue] Channel \"" + name + "\" route path must be a non-empty absolute suffix without a query or fragment.");
			if (route.path.split("/").some((segment) => segment === "." || segment === "..")) throw new Error("[flue] Channel \"" + name + "\" route path must remain beneath its channel namespace.");
			if (typeof route.handler !== "function") throw new Error("[flue] Channel \"" + name + "\" route handler must be callable.");
			const key = route.method + " " + route.path;
			if (routes[key] !== void 0) throw new Error("[flue] Channel \"" + name + "\" declares duplicate route \"" + key + "\".");
			routes[key] = route.handler;
		}
		channelHandlers[name] = routes;
	}
	return {
		agents,
		workflows,
		channelHandlers
	};
}
var { agents, workflows, channelHandlers } = normalizeBuiltModules({ "explorer": explorer_exports }, {}, {});
/**
* Create an empty in-memory sandbox (default).
* Uses InMemoryFs (no real filesystem access) with sensible defaults:
* cwd = /home/user, /tmp exists, /bin and /usr/bin exist.
*/
async function createDefaultEnv() {
	const fs = new InMemoryFs();
	return bashFactoryToSessionEnv(() => new Bash({
		fs,
		network: { dangerouslyAllowFullInternetAccess: true }
	}));
}
async function loadFlueNodeApplication(options = {}) {
	const runtimeEnv = options.env ?? process.env;
	const isLocalMode = options.local === true;
	const outputContext = new AsyncLocalStorage();
	const originalConsole = /* @__PURE__ */ new Map();
	let outputRestored = false;
	const restoreOutput = () => {
		if (outputRestored) return;
		outputRestored = true;
		for (const [method, original] of originalConsole) console[method] = original;
	};
	if (options.onOutput) for (const method of [
		"log",
		"info",
		"debug",
		"warn",
		"error"
	]) {
		const original = console[method];
		originalConsole.set(method, original);
		console[method] = (...args) => {
			if (!outputContext.getStore()) return original.apply(console, args);
			outputContext.exit(() => options.onOutput({
				stream: method === "warn" || method === "error" ? "stderr" : "stdout",
				line: format(...args)
			}));
		};
	}
	const runInRuntime = (fn) => outputContext.run(true, fn);
	const instrumentationOwner = createInstrumentationOwner();
	let devLifecycle;
	let persistenceAdapter;
	let agentCoordinator;
	try {
		return await runInRuntime(() => runWithInstrumentationOwner(instrumentationOwner, async () => {
			devLifecycle = isLocalMode && options.internalDevLogs === true ? installDevLifecycleLogger() : void 0;
			const { default: userApp } = await import("./assets/app-BuwdxLBj.js");
			const defaultAdapter = sqlite(isLocalMode && runtimeEnv.FLUE_DEV_SQLITE_PATH ? runtimeEnv.FLUE_DEV_SQLITE_PATH : void 0);
			if (defaultAdapter.migrate) await defaultAdapter.migrate();
			const { executionStore, runStore, eventStreamStore, conversationStreamStore, attachmentStore } = await defaultAdapter.connect();
			persistenceAdapter = defaultAdapter;
			const activityGate = createRuntimeActivityGate();
			agentCoordinator = createNodeAgentCoordinator({
				submissions: executionStore.submissions,
				agents,
				createContext: createAgentContextForRequest,
				conversationStreamStore,
				attachmentStore,
				onInteractionStart: devLifecycle?.onAgentInteractionStart,
				activityGate
			});
			const dispatchQueue = createNodeDispatchQueue(agentCoordinator);
			function createAgentContextForRequest({ id, agentName, request, initialEventIndex, dispatchId }) {
				return createFlueContext({
					id,
					agentName,
					dispatchId,
					initialEventIndex,
					env: runtimeEnv,
					req: request,
					agentConfig: { resolveModel },
					createDefaultEnv,
					submissionStore: executionStore.submissions
				});
			}
			function createWorkflowContextForRequest({ runId, request, initialEventIndex }) {
				return createFlueContext({
					id: runId,
					runId,
					initialEventIndex,
					env: runtimeEnv,
					req: request,
					agentConfig: { resolveModel },
					createDefaultEnv,
					submissionStore: executionStore.submissions
				});
			}
			configureFlueRuntime({
				target: "node",
				devMode: isLocalMode,
				temporaryLocalExposure: false,
				agents,
				workflows,
				createAgentAdmission: (agentName, instanceId) => agentCoordinator.createAdmission(agentName, instanceId),
				abortAgentInstance: (agentName, instanceId) => agentCoordinator.abortInstance(agentName, instanceId),
				dispatchQueue,
				activityGate,
				admitWorkflow: ({ workflowName, input }) => {
					const workflow = workflows.find((record) => record.name === workflowName)?.definition;
					if (!workflow) throw new Error("[flue] Internal workflow admission target is not registered.");
					return admitDetachedWorkflow({
						workflowName,
						workflow,
						input,
						request: new Request("https://flue.invalid/_internal/workflows/" + encodeURIComponent(workflowName), { method: "POST" }),
						createContext: createWorkflowContextForRequest,
						runStore,
						eventStreamStore,
						activityGate
					});
				},
				channelHandlers,
				createWorkflowContext: createWorkflowContextForRequest,
				runStore,
				eventStreamStore,
				conversationStreamStore,
				attachmentStore
			});
			try {
				await runInRuntime(() => agentCoordinator.reconcileSubmissions());
			} catch (error) {
				runInRuntime(() => console.error("[flue] Startup submission reconciliation failed:", error));
			}
			const flueApp = userApp;
			if (!flueApp || typeof flueApp.fetch !== "function") throw new Error("[flue] app.ts default export must be a Hono app or an object with a fetch(request) method.");
			let disposing;
			return {
				fetch: (request, env) => runInRuntime(() => flueApp.fetch(request, env)),
				enterActivity() {
					return activityGate.enter();
				},
				pauseAdmissions() {
					activityGate.pause();
				},
				waitForIdle() {
					return activityGate.waitForIdle();
				},
				async stop(timeoutMs = 3e4) {
					if (disposing) return disposing;
					disposing = runInRuntime(async () => {
						const errors = [];
						try {
							await agentCoordinator.shutdown(timeoutMs);
						} catch (error) {
							errors.push(error);
						}
						try {
							await instrumentationOwner.dispose();
						} catch (error) {
							errors.push(error);
						}
						try {
							if (persistenceAdapter.close) await persistenceAdapter.close();
						} catch (error) {
							errors.push(error);
						}
						devLifecycle?.dispose();
						restoreOutput();
						if (errors.length === 1) throw errors[0];
						if (errors.length > 1) throw new AggregateError(errors, "[flue] Node application shutdown failed.");
					});
					return disposing;
				},
				closeSync() {
					devLifecycle?.dispose();
					restoreOutput();
				}
			};
		}));
	} catch (error) {
		const cleanupErrors = [];
		try {
			if (agentCoordinator) await agentCoordinator.shutdown(3e4);
		} catch (cleanupError) {
			cleanupErrors.push(cleanupError);
		}
		try {
			if (persistenceAdapter?.close) await persistenceAdapter.close();
		} catch (cleanupError) {
			cleanupErrors.push(cleanupError);
		}
		try {
			await instrumentationOwner.dispose();
		} catch (cleanupError) {
			cleanupErrors.push(cleanupError);
		}
		devLifecycle?.dispose();
		restoreOutput();
		if (cleanupErrors.length) throw new AggregateError([error, ...cleanupErrors], "[flue] Node application startup failed.");
		throw error;
	}
}
async function startFlueNodeServer(options = {}) {
	const application = await loadFlueNodeApplication(options);
	const port = options.port ?? 3e3;
	let resolveReady;
	let rejectReady;
	const ready = new Promise((resolve, reject) => {
		resolveReady = resolve;
		rejectReady = reject;
	});
	const server = (0, import_dist.serve)({
		fetch: application.fetch,
		port,
		...options.hostname ? { hostname: options.hostname } : {},
		serverOptions: { requestTimeout: 0 }
	}, () => {
		if (!options.quiet) console.log("[flue] Server listening on http://localhost:" + port);
		options.onReady?.();
		resolveReady();
	});
	const onServerError = (error) => rejectReady(error);
	const onAbort = () => {
		server.closeAllConnections();
		server.close();
		rejectReady(options.signal?.reason ?? new DOMException("Aborted", "AbortError"));
	};
	server.once("error", onServerError);
	options.signal?.addEventListener("abort", onAbort, { once: true });
	if (options.signal?.aborted) onAbort();
	try {
		await ready;
	} catch (error) {
		server.closeAllConnections();
		server.close();
		await application.stop();
		throw error;
	} finally {
		server.off("error", onServerError);
		options.signal?.removeEventListener("abort", onAbort);
	}
	let stopping;
	return {
		async stop() {
			if (stopping) return stopping;
			stopping = (async () => {
				const errors = [];
				const httpClosed = new Promise((resolve) => server.close((error) => {
					if (error) errors.push(error);
					resolve();
				}));
				try {
					await application.stop();
				} catch (error) {
					errors.push(error);
				}
				server.closeAllConnections();
				await httpClosed;
				if (errors.length === 1) throw errors[0];
				if (errors.length > 1) throw new AggregateError(errors, "[flue] Node server shutdown failed.");
			})();
			return stopping;
		},
		closeSync() {
			server.closeAllConnections();
			server.close();
			application.closeSync();
		}
	};
}
var lifecycle = await startFlueNodeServer({ port: parseInt(process.env.PORT || "3000", 10) });
async function stop(exitCode) {
	setTimeout(() => {
		console.error("[flue] Shutdown timed out, exiting.");
		process.exit(exitCode);
	}, 6e4).unref();
	await lifecycle.stop();
	process.exit(exitCode);
}
process.on("SIGINT", () => {
	stop(130);
});
process.on("SIGTERM", () => {
	stop(143);
});
process.on("disconnect", () => {
	stop(0);
});
//#endregion
export { loadFlueNodeApplication, startFlueNodeServer };

//# sourceMappingURL=server.mjs.map