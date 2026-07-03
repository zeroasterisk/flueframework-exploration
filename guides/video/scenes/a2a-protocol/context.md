Video type: animated-explainer

Title: A2A Protocol Explainer — How Agents Talk to Each Other

Target audience: Developers building or evaluating AI agent frameworks (ADK, CrewAI,
Flue, LangChain, etc.) who know what agents are but may not know the A2A protocol
exists or why it matters. They are framework-pragmatic and skeptical of new "standards."

Purpose / intended message:
A2A (Agent-to-Agent) is an open protocol that lets any agent talk to any other agent,
regardless of framework. Three concepts: Agent Cards (discovery), message:send
(communication), and the task lifecycle (progress/state). The payoff is a mesh of
five different framework agents all connected — frameworks stop mattering at the boundary.
Call to action: visit a2a-protocol.org.

Script / narration notes:
- Opens on three isolated agents (ADK, CrewAI, Flue) in separate "silos"
- "Agents are islands" — each framework speaks its own dialect
- Agent Cards: a public JSON card at /.well-known/agent-card.json identifies the agent
- message:send: one HTTP call, JSON in, task out; lifecycle strip shows submitted→working→completed
- Ecosystem: five framework agents connected in a mesh via yellow lines
- Closes with A2A badge + "a2a-protocol.org" + "A2A Integration Factory" CTA
- Tone: explanatory and confident — not technical deep-dive, but substantive

Visual style (3Blue1Brown-influenced):
- Dark background (#1C1C1C)
- YELLOW_ACC (#FFFF00) for A2A connections (consistent across the video)
- Framework nodes use distinct colors: ADK=blue, CrewAI=orange, Flue=green, Agno=purple, Mastra=teal
- No Manim-specific artifacts should be visible

Duration target: ~26–30 seconds. 5 chapters.

Auto-detected video metadata:
Duration: 26.6s  |  h264 1920×1080 @ 60fps
