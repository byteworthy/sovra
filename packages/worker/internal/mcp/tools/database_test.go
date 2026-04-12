package tools_test

import (
	"strings"
	"testing"

	"github.com/byteswarm/worker/internal/mcp/tools"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

func setupDatabaseServer(t *testing.T) *mcp.Server {
	t.Helper()
	server := mcp.NewServer(&mcp.Implementation{Name: "test", Version: "0.1"}, nil)
	tools.RegisterDatabaseTools(server, nil)
	return server
}

func TestSemanticSearch_RequiresTenantID(t *testing.T) {
	server := setupDatabaseServer(t)

	result := callTool(t, server, "semantic_search", map[string]any{
		"query_text": "test query",
		"tenant_id":  "",
	})
	if !result.IsError {
		t.Fatal("expected error when tenant_id is empty")
	}
	text := result.Content[0].(*mcp.TextContent).Text
	if !strings.Contains(text, "tenant_id") {
		t.Fatalf("error should mention tenant_id, got: %s", text)
	}
}

func TestSemanticSearch_ErrorsWhenPoolNil(t *testing.T) {
	server := setupDatabaseServer(t)

	result := callTool(t, server, "semantic_search", map[string]any{
		"query_text": "test query",
		"tenant_id":  "550e8400-e29b-41d4-a716-446655440000",
	})
	if !result.IsError {
		t.Fatal("expected error when database pool is nil")
	}
	text := result.Content[0].(*mcp.TextContent).Text
	if text != "database not connected" {
		t.Fatalf("expected 'database not connected', got: %s", text)
	}
}
