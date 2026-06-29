/**
 * A2A protocol types for the HTTP+JSON/REST binding (v1.0).
 *
 * Self-contained — does not depend on @flue/a2a.
 * Field names use camelCase per the A2A JSON serialization convention.
 *
 * @see https://google.github.io/A2A/
 */

// ---------------------------------------------------------------------------
// Parts, Messages, Artifacts
// ---------------------------------------------------------------------------

export type A2APart =
	| { text: string; metadata?: Record<string, unknown> }
	| { data: unknown; mediaType?: string; metadata?: Record<string, unknown> };

export type A2ARole = 'ROLE_UNSPECIFIED' | 'ROLE_USER' | 'ROLE_AGENT';

export interface A2AMessage {
	messageId: string;
	contextId?: string;
	taskId?: string;
	role: A2ARole;
	parts: A2APart[];
	metadata?: Record<string, unknown>;
}

export interface A2AArtifact {
	artifactId: string;
	name?: string;
	description?: string;
	parts: A2APart[];
	metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Task
// ---------------------------------------------------------------------------

export type A2ATaskState =
	| 'TASK_STATE_UNSPECIFIED'
	| 'TASK_STATE_SUBMITTED'
	| 'TASK_STATE_WORKING'
	| 'TASK_STATE_COMPLETED'
	| 'TASK_STATE_FAILED'
	| 'TASK_STATE_CANCELED'
	| 'TASK_STATE_INPUT_REQUIRED'
	| 'TASK_STATE_REJECTED'
	| 'TASK_STATE_AUTH_REQUIRED';

export interface A2ATaskStatus {
	state: A2ATaskState;
	message?: A2AMessage;
	timestamp?: string;
}

export interface A2ATask {
	id: string;
	contextId?: string;
	status: A2ATaskStatus;
	artifacts?: A2AArtifact[];
	history?: A2AMessage[];
	metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Requests / Responses
// ---------------------------------------------------------------------------

export interface A2ASendMessageConfiguration {
	acceptedOutputModes?: string[];
	historyLength?: number;
	returnImmediately?: boolean;
}

export interface A2ASendMessageRequest {
	tenant?: string;
	message: A2AMessage;
	configuration?: A2ASendMessageConfiguration;
	metadata?: Record<string, unknown>;
}

export interface A2ASendMessageResponse {
	task?: A2ATask;
	message?: A2AMessage;
}

// ---------------------------------------------------------------------------
// Agent Card
// ---------------------------------------------------------------------------

export interface A2AAgentInterface {
	url: string;
	protocolBinding: string;
	protocolVersion: string;
}

export interface A2AAgentCapabilities {
	streaming?: boolean;
	pushNotifications?: boolean;
}

export interface A2AAgentSkill {
	id: string;
	name: string;
	description: string;
	tags: string[];
	examples?: string[];
}

export interface A2AAgentProvider {
	url: string;
	organization: string;
}

export interface A2AAgentCard {
	name: string;
	description: string;
	supportedInterfaces: A2AAgentInterface[];
	provider?: A2AAgentProvider;
	version: string;
	documentationUrl?: string;
	capabilities: A2AAgentCapabilities;
	defaultInputModes: string[];
	defaultOutputModes: string[];
	skills: A2AAgentSkill[];
}

// ---------------------------------------------------------------------------
// Error format (google.rpc.Status)
// ---------------------------------------------------------------------------

export interface A2ARpcStatus {
	error: {
		code: number;
		status: string;
		message: string;
		details: Array<{
			'@type': string;
			reason: string;
			domain: string;
		}>;
	};
}
