package mcp_test

import (
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/byteworthy/sovra-worker/internal/config"
	mcpserver "github.com/byteworthy/sovra-worker/internal/mcp"
)

func TestNewMCPServer_ReturnsNonNil(t *testing.T) {
	srv := mcpserver.NewMCPServer(nil, &config.Config{
		AgentWorkspacePath: t.TempDir(),
	})
	if srv == nil {
		t.Fatal("expected non-nil server")
	}
}

func TestHTTPHandler_MCPEndpointResponds(t *testing.T) {
	srv := mcpserver.NewMCPServer(nil, &config.Config{
		AgentWorkspacePath: t.TempDir(),
	})
	handler := mcpserver.NewMCPHandler(srv, "")

	// POST to /mcp with empty body should get a response (not 404).
	// The MCP handler will return 400 for invalid JSON-RPC, which proves the endpoint is wired.
	req := httptest.NewRequest(http.MethodPost, "/mcp", nil)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code == http.StatusNotFound {
		t.Fatal("expected /mcp endpoint to be registered, got 404")
	}

	// GET to /nonexistent should return 404 (proving routing works).
	req2 := httptest.NewRequest(http.MethodGet, "/nonexistent", nil)
	w2 := httptest.NewRecorder()
	handler.ServeHTTP(w2, req2)

	if w2.Code != http.StatusNotFound {
		t.Fatalf("expected 404 for /nonexistent, got %d", w2.Code)
	}
}

func TestHTTPHandler_MCPAuthFailsClosedInProduction(t *testing.T) {
	t.Setenv("GO_ENV", "production")

	srv := mcpserver.NewMCPServer(nil, &config.Config{
		AgentWorkspacePath: t.TempDir(),
	})
	handler := mcpserver.NewMCPHandler(srv, "")

	req := httptest.NewRequest(http.MethodPost, "/mcp", nil)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", w.Code)
	}
}

func TestHTTPHandler_MCPAuthAcceptsValidBearerSecret(t *testing.T) {
	t.Setenv("GO_ENV", "production")

	srv := mcpserver.NewMCPServer(nil, &config.Config{
		AgentWorkspacePath: t.TempDir(),
	})
	handler := mcpserver.NewMCPHandler(srv, "mcp-secret")

	req := httptest.NewRequest(http.MethodPost, "/mcp", nil)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer mcp-secret")
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code == http.StatusUnauthorized || w.Code == http.StatusNotFound {
		t.Fatalf("expected authenticated MCP route response, got %d", w.Code)
	}
}

func TestConfigLoad_MCPPort_Default(t *testing.T) {
	os.Unsetenv("MCP_PORT")
	cfg := config.Load()
	if cfg.MCPPort != 3001 {
		t.Fatalf("expected MCPPort=3001, got %d", cfg.MCPPort)
	}
}

func TestConfigLoad_MCPPort_FromEnv(t *testing.T) {
	t.Setenv("MCP_PORT", "4001")
	cfg := config.Load()
	if cfg.MCPPort != 4001 {
		t.Fatalf("expected MCPPort=4001, got %d", cfg.MCPPort)
	}
}

func TestConfigLoad_AgentWorkspacePath_Default(t *testing.T) {
	os.Unsetenv("AGENT_WORKSPACE_PATH")
	cfg := config.Load()
	if cfg.AgentWorkspacePath != "/tmp/agent-workspace" {
		t.Fatalf("expected /tmp/agent-workspace, got %s", cfg.AgentWorkspacePath)
	}
}

func TestConfigLoad_AgentWorkspacePath_FromEnv(t *testing.T) {
	t.Setenv("AGENT_WORKSPACE_PATH", "/custom/path")
	cfg := config.Load()
	if cfg.AgentWorkspacePath != "/custom/path" {
		t.Fatalf("expected /custom/path, got %s", cfg.AgentWorkspacePath)
	}
}

func TestConfigLoad_BraveSearchAPIKey_Default(t *testing.T) {
	os.Unsetenv("BRAVE_SEARCH_API_KEY")
	cfg := config.Load()
	if cfg.BraveSearchAPIKey != "" {
		t.Fatalf("expected empty BraveSearchAPIKey, got %s", cfg.BraveSearchAPIKey)
	}
}

func TestConfigLoad_BraveSearchAPIKey_FromEnv(t *testing.T) {
	t.Setenv("BRAVE_SEARCH_API_KEY", "test-key-123")
	cfg := config.Load()
	if cfg.BraveSearchAPIKey != "test-key-123" {
		t.Fatalf("expected test-key-123, got %s", cfg.BraveSearchAPIKey)
	}
}
