package tools_test

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/byteworthy/sovra-worker/internal/mcp/tools"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

func setupWebServer(t *testing.T, braveAPIKey string) *mcp.Server {
	t.Helper()
	server := mcp.NewServer(&mcp.Implementation{Name: "test", Version: "0.1"}, nil)
	tools.RegisterWebTools(server, braveAPIKey)
	return server
}

func TestWebSearch_ErrorWhenNoAPIKey(t *testing.T) {
	server := setupWebServer(t, "")

	result := callTool(t, server, "web_search", map[string]any{"query": "test query"})
	if !result.IsError {
		t.Fatal("expected error when BRAVE_SEARCH_API_KEY is empty")
	}
	text := result.Content[0].(*mcp.TextContent).Text
	if !strings.Contains(text, "BRAVE_SEARCH_API_KEY") {
		t.Fatalf("error should mention BRAVE_SEARCH_API_KEY, got: %s", text)
	}
}

func TestWebSearch_ReturnsParsedResults(t *testing.T) {
	mockBrave := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("X-Subscription-Token") != "test-key" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		resp := map[string]any{
			"web": map[string]any{
				"results": []map[string]any{
					{"title": "Result 1", "url": "https://example.com/1", "description": "First result"},
					{"title": "Result 2", "url": "https://example.com/2", "description": "Second result"},
				},
			},
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	}))
	defer mockBrave.Close()

	server := mcp.NewServer(&mcp.Implementation{Name: "test", Version: "0.1"}, nil)
	tools.RegisterWebToolsWithURL(server, "test-key", mockBrave.URL)

	result := callTool(t, server, "web_search", map[string]any{"query": "test"})
	if result.IsError {
		t.Fatalf("unexpected error: %v", result.Content)
	}
	text := result.Content[0].(*mcp.TextContent).Text
	if !strings.Contains(text, "Result 1") || !strings.Contains(text, "Result 2") {
		t.Fatalf("expected search results in output, got: %s", text)
	}
}

func TestWebFetch_BlocksPrivateIPs(t *testing.T) {
	privateIPs := []string{
		"http://127.0.0.1/test",
		"http://10.0.0.1/test",
		"http://172.16.0.1/test",
		"http://192.168.1.1/test",
	}

	server := setupWebServer(t, "")

	for _, testURL := range privateIPs {
		t.Run(testURL, func(t *testing.T) {
			result := callTool(t, server, "web_fetch", map[string]any{"url": testURL})
			if !result.IsError {
				t.Fatalf("expected SSRF block for %s", testURL)
			}
			text := result.Content[0].(*mcp.TextContent).Text
			if !strings.Contains(text, "blocked") && !strings.Contains(text, "private") {
				t.Fatalf("error should mention blocked/private IP, got: %s", text)
			}
		})
	}
}

func TestWebFetch_ReturnsContent(t *testing.T) {
	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, "Hello from mock server")
	}))
	defer mockServer.Close()

	// Disable SSRF check for this test since httptest binds to 127.0.0.1
	tools.SSRFCheckEnabled = false
	t.Cleanup(func() { tools.SSRFCheckEnabled = true })

	server := setupWebServer(t, "")

	result := callTool(t, server, "web_fetch", map[string]any{"url": mockServer.URL})
	if result.IsError {
		t.Fatalf("unexpected error: %v", result.Content)
	}
	text := result.Content[0].(*mcp.TextContent).Text
	if !strings.Contains(text, "Hello from mock server") {
		t.Fatalf("expected mock content, got: %s", text)
	}
}
