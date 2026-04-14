# Features Research - Sovra

**Research Type:** Project Research - Features dimension
**Date:** 2026-04-11

## Feature Categories

### Table Stakes (Must Have)

These features are expected by users building AI SaaS products. Absence = users leave.

| Feature | Description | Complexity |
|---------|-------------|------------|
| Multi-tenant isolation | Database-level tenant separation with RLS | High |
| User authentication | Email/password, magic links, OAuth providers | Medium |
| Agent CRUD | Create, read, update, delete AI agents | Medium |
| Chat interface | Real-time chat with streaming responses | Medium |
| Conversation history | Persist and retrieve past conversations | Medium |
| Vector storage | Store document embeddings for semantic search | Medium |
| API keys | Programmatic access with rate limiting | Medium |

### Differentiators (Competitive Advantage)

These features make Sovra stand out from other boilerplates.

| Feature | Description | Complexity |
|---------|-------------|------------|
| MCP-native tool ecosystem | Full client/server MCP implementation | High |
| Multi-agent workspaces | Multiple agents collaborating in real-time | High |
| Conflict resolution | Vote, hierarchy, consensus strategies | Medium |
| Memory strategies | Conversation, summary, vector, hybrid modes | High |
| Built-in tools | File ops, web search, code execution, webhooks | Medium |
| Self-hosted all-in-one | Single docker-compose for immediate use | Medium |

### Anti-Features (Deliberately NOT Building)

| Feature | Why Excluded |
|---------|--------------|
| SaaS hosting | Self-hosted only, community-driven |
| Pre-configured paid APIs | Users bring own API keys |
| Mobile app | Web-first, later phases |
| Real-time video | Out of scope for boilerplate |
| Built-in LLM fine-tuning | External services only |

## Dependencies Between Features

```
Authentication
    └── Multi-tenancy (depends on auth)
            └── Agent CRUD (depends on tenant isolation)
                    └── Chat interface (depends on agents)
                            └── Streaming responses (depends on chat)
                            └── Conversation history (depends on chat)

Vector storage
    └── Semantic search (depends on vector)
            └── Memory strategies (depends on search)

MCP tools
    └── Built-in tools (part of MCP server)
            └── Tool execution tracking (depends on tools)

Workspaces
    └── Multi-agent collaboration (depends on workspaces)
            └── Real-time sync (depends on collaboration)
            └── Conflict resolution (depends on collaboration)

Billing
    └── API keys (depends on billing)
            └── Usage tracking ( depends on keys)
```

## Feature Complexity Notes

- **Multi-tenant RLS**: Most complex feature, requires careful schema design
- **MCP implementation**: Protocol evolving, need to stay current
- **Memory strategies**: Vector search requires pgvector setup
- **Multi-agent coordination**: Real-time state management complexity
- **Self-hosted deployment**: Docker Compose needs careful orchestration

---
*Researcher: gsd-project-researcher*
*Output: .planning/research/FEATURES.md*