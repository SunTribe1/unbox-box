# ADR 0002: One typed tool registry for every surface

**Status:** accepted · 2026-09-23

## Context

The same actions must be available to people (buttons), the built-in command engine,
browser agents (WebMCP) and, later, desktop agents (MCP server and Claude API).

## Decision

Tools live in `packages/tools`. Each has a Zod input schema, a description and an
`execute(input, ctx)` function. Tools never import React or stores; they receive a
`UnboxBoxContext` (dependency inversion) and act through the same commands the UI calls.
Zod generates the JSON Schema that WebMCP and LLM APIs need.

## Consequences

- Agent actions and UI actions can't drift apart.
- Tools are tested in Node against real data with a fake context.
- WebMCP spec churn is contained in `packages/webmcp` (one file).
