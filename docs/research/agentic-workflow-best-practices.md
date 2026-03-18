# Best Practices for Building Agentic Workflows (2025 Edition)

**Date:** 2026-03-18
**Author:** Clio (Planning Agent)
**Status:** Research Artifact

## 1. Executive Summary

Building reliable agentic workflows has evolved from simple prompt engineering to complex systems engineering. The industry consensus for 2025 emphasizes **reliability, observability, and specialized collaboration** over raw model intelligence. The most robust systems treat agents as components in a deterministic state machine rather than open-ended chat bots.

## 2. Core Architectural Patterns

### 2.1 Orchestrator-Workers (The "Boss" Pattern)
A central "Orchestrator" (or Planner) breaks down a high-level goal into discrete subtasks and assigns them to specialized "Worker" agents.
-   **Why:** Reduces context window pollution. Workers only see what they need.
-   **Use Case:** Complex software development (e.g., one agent writes tests, another implements code).

### 2.2 Evaluator-Optimizer (The "Critic" Pattern)
A "Generator" agent produces a draft, and an "Evaluator" agent critiques it against specific criteria. The process loops until the output meets quality standards.
-   **Why:** LLMs are better at verifying than generating.
-   **Use Case:** Code generation, legal drafting, content creation.

### 2.3 Sequential Handoffs (The "Pipeline" Pattern)
Linear chains where the output of Agent A becomes the input of Agent B.
-   **Why:** Simple, predictable, easy to debug.
-   **Use Case:** Data processing pipelines (Extract -> Summarize -> Format).

### 2.4 Routing
A "Router" classifies the input and directs it to the most appropriate (and cost-effective) model or workflow path.
-   **Why:** Optimization. Use GPT-4 for reasoning, Claude 3 Haiku for simple extraction.

## 3. Reliability & Evaluation ("Evaluation-Driven Development")

Reliability is the primary challenge. Testing must happen at three levels:

1.  **Span Level:** Testing individual tool calls (e.g., "Did the SQL query syntax validate?").
2.  **Trace Level:** Testing the logic flow (e.g., "Did the agent search *before* answering?").
3.  **Session Level:** Testing the final outcome (e.g., "Did the user get the correct answer?").

**Key Technique: LLM-as-a-Judge**
Using a strong model to grade the outputs of weaker models or agents based on a rubric (e.g., correctness, tone, safety).

## 4. Operational Best Practices

### 4.1 Observability
You cannot fix what you cannot see.
-   **Tracing:** Log every step, thought, and tool output (e.g., LangSmith, Phoenix).
-   **Cost Tracking:** Monitor token usage per step to identify "runaway" loops.

### 4.2 State Management
-   **State Isolation:** Do not share the entire conversation history with every agent. Pass only the "brief" required for the specific task.
-   **Structured Handoffs:** Use strictly typed schemas (JSON/Pydantic) when agents pass data to each other.

### 4.3 Deterministic Guardrails
-   **State Machines:** Wrap agents in a finite state machine (e.g., LangGraph) to enforce valid transitions. An agent should not be able to "decide" to skip the testing phase.
-   **Fail-Safe:** Define explicit exit criteria. If an agent loops 3 times, escalation to a human or a fallback path is mandatory.

### 4.4 Tooling & Security
-   **Model Context Protocol (MCP):** Standardize how agents connect to data and tools.
-   **Sandboxing:** Execution of generated code must happen in isolated environments (Docker/WASM).
-   **Human-in-the-Loop (HITL):** High-stakes actions (deploying code, transferring funds) require explicit human approval.

## 5. Recommendations for CorBot-Empire

Based on this research, the following refinements are suggested for our `AGENTS.md` and architecture:

1.  **Reinforce the "Plan Node":** Our `WORKFLOW_ORCHESTRATION_BASELINE_V1` already mandates planning. We should strictly enforce that the *Plan* phase is a distinct "Orchestrator" step that produces a frozen spec for "Worker" execution.
2.  **Adopt "Evaluator" Steps:** For coding tasks, the "Test" phase should be treated as an antagonistic "Evaluator" agent that actively tries to break the code, rather than just running provided tests.
3.  **Strict Context Scoping:** When delegating to sub-agents (Sage -> Clio), ensure we are passing *only* the necessary context, not the full chat history, to save tokens and reduce confusion.
