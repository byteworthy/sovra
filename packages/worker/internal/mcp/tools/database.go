package tools

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

// RegisterDatabaseTools registers the semantic_search tool on the MCP server.
func RegisterDatabaseTools(server *mcp.Server, pool *pgxpool.Pool) {
	server.AddTool(
		&mcp.Tool{
			Name:        "semantic_search",
			Description: "Search documents by semantic similarity with tenant isolation",
			InputSchema: json.RawMessage(`{"type":"object","properties":{"query_text":{"type":"string","description":"Text query for semantic search"},"query_embedding":{"type":"array","items":{"type":"number"},"description":"Pre-computed embedding vector (optional if query_text provided)"},"tenant_id":{"type":"string","description":"Tenant ID for isolation (required)"},"limit":{"type":"integer","description":"Max results (default 10, max 50)"}},"required":["tenant_id"]}`),
		},
		func(ctx context.Context, req *mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			tctx, cancel := context.WithTimeout(ctx, toolTimeout)
			defer cancel()

			var args struct {
				QueryText      string    `json:"query_text"`
				QueryEmbedding []float64 `json:"query_embedding"`
				TenantID       string    `json:"tenant_id"`
				Limit          int       `json:"limit"`
			}
			if err := json.Unmarshal(req.Params.Arguments, &args); err != nil {
				return errorResult("invalid arguments: " + err.Error())
			}

			if args.TenantID == "" {
				return errorResult("tenant_id is required for all database queries")
			}

			if pool == nil {
				return errorResult("database not connected")
			}

			limit := args.Limit
			if limit <= 0 {
				limit = 10
			}
			if limit > 50 {
				limit = 50
			}

			if len(args.QueryEmbedding) == 0 && args.QueryText == "" {
				return errorResult("either query_text or query_embedding is required")
			}

			// If no embedding provided, we need the text for a basic content search fallback
			if len(args.QueryEmbedding) == 0 {
				return textSearchFallback(tctx, pool, args.QueryText, args.TenantID, limit)
			}

			return semanticSearch(tctx, pool, args.QueryEmbedding, args.TenantID, limit)
		},
	)
}

func semanticSearch(ctx context.Context, pool *pgxpool.Pool, embedding []float64, tenantID string, limit int) (*mcp.CallToolResult, error) {
	// Format embedding as pgvector literal
	embeddingStr := formatEmbedding(embedding)

	query := `SELECT id, content, metadata, 1 - (embedding <=> $1::vector) AS similarity
FROM vector_documents
WHERE tenant_id = $2
ORDER BY embedding <=> $1::vector
LIMIT $3`

	rows, err := pool.Query(ctx, query, embeddingStr, tenantID, limit)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			return errorResult("tool execution timed out after 30s")
		}
		return errorResult("query failed: " + err.Error())
	}
	defer rows.Close()

	type result struct {
		ID         string         `json:"id"`
		Content    string         `json:"content"`
		Metadata   map[string]any `json:"metadata"`
		Similarity float64        `json:"similarity"`
	}

	var results []result
	for rows.Next() {
		var r result
		var metadataJSON []byte
		if err := rows.Scan(&r.ID, &r.Content, &metadataJSON, &r.Similarity); err != nil {
			return errorResult("scan failed: " + err.Error())
		}
		json.Unmarshal(metadataJSON, &r.Metadata)
		results = append(results, r)
	}
	if err := rows.Err(); err != nil {
		return errorResult("row iteration error: " + err.Error())
	}

	output, err := json.Marshal(results)
	if err != nil {
		return errorResult("failed to marshal results: " + err.Error())
	}
	return textResult(string(output))
}

func textSearchFallback(ctx context.Context, pool *pgxpool.Pool, queryText, tenantID string, limit int) (*mcp.CallToolResult, error) {
	query := `SELECT id, content, metadata,
       ts_rank(to_tsvector('english', content), plainto_tsquery('english', $1)) AS rank
FROM vector_documents
WHERE tenant_id = $2
  AND to_tsvector('english', content) @@ plainto_tsquery('english', $1)
ORDER BY rank DESC
LIMIT $3`

	rows, err := pool.Query(ctx, query, queryText, tenantID, limit)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			return errorResult("tool execution timed out after 30s")
		}
		return errorResult("query failed: " + err.Error())
	}
	defer rows.Close()

	type result struct {
		ID       string         `json:"id"`
		Content  string         `json:"content"`
		Metadata map[string]any `json:"metadata"`
		Rank     float64        `json:"rank"`
	}

	var results []result
	for rows.Next() {
		var r result
		var metadataJSON []byte
		if err := rows.Scan(&r.ID, &r.Content, &metadataJSON, &r.Rank); err != nil {
			return errorResult("scan failed: " + err.Error())
		}
		json.Unmarshal(metadataJSON, &r.Metadata)
		results = append(results, r)
	}
	if err := rows.Err(); err != nil {
		return errorResult("row iteration error: " + err.Error())
	}

	output, err := json.Marshal(results)
	if err != nil {
		return errorResult("failed to marshal results: " + err.Error())
	}
	return textResult(string(output))
}

func formatEmbedding(embedding []float64) string {
	parts := make([]string, len(embedding))
	for i, v := range embedding {
		parts[i] = fmt.Sprintf("%f", v)
	}
	return "[" + strings.Join(parts, ",") + "]"
}
