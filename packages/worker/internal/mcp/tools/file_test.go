package tools_test

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/byteworthy/sovra-worker/internal/mcp/tools"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

func setupFileServer(t *testing.T) (*mcp.Server, string) {
	t.Helper()
	workspace := t.TempDir()
	server := mcp.NewServer(&mcp.Implementation{Name: "test", Version: "0.1"}, nil)
	tools.RegisterFileTools(server, workspace)
	return server, workspace
}

func callTool(t *testing.T, server *mcp.Server, name string, args map[string]any) *mcp.CallToolResult {
	t.Helper()
	ctx := context.Background()
	t1, t2 := mcp.NewInMemoryTransports()

	if _, err := server.Connect(ctx, t1, nil); err != nil {
		t.Fatalf("server connect failed: %v", err)
	}

	client := mcp.NewClient(&mcp.Implementation{Name: "test-client", Version: "0.1"}, nil)
	cs, err := client.Connect(ctx, t2, nil)
	if err != nil {
		t.Fatalf("client connect failed: %v", err)
	}
	t.Cleanup(func() { cs.Close() })

	result, err := cs.CallTool(ctx, &mcp.CallToolParams{
		Name:      name,
		Arguments: args,
	})
	if err != nil {
		t.Fatalf("CallTool(%s) error: %v", name, err)
	}
	return result
}

func TestFileRead_ReturnsContent(t *testing.T) {
	server, workspace := setupFileServer(t)

	testContent := "hello world"
	os.WriteFile(filepath.Join(workspace, "test.txt"), []byte(testContent), 0644)

	result := callTool(t, server, "file_read", map[string]any{"path": "test.txt"})
	if result.IsError {
		t.Fatalf("unexpected error: %v", result.Content)
	}
	text := result.Content[0].(*mcp.TextContent).Text
	if text != testContent {
		t.Fatalf("expected %q, got %q", testContent, text)
	}
}

func TestFileRead_RejectsPathTraversal(t *testing.T) {
	server, _ := setupFileServer(t)

	result := callTool(t, server, "file_read", map[string]any{"path": "../../../etc/passwd"})
	if !result.IsError {
		t.Fatal("expected error for path traversal, got success")
	}
}

func TestFileWrite_CreatesFile(t *testing.T) {
	server, workspace := setupFileServer(t)

	result := callTool(t, server, "file_write", map[string]any{
		"path":    "output.txt",
		"content": "written content",
	})
	if result.IsError {
		t.Fatalf("unexpected error: %v", result.Content)
	}

	data, err := os.ReadFile(filepath.Join(workspace, "output.txt"))
	if err != nil {
		t.Fatalf("file not created: %v", err)
	}
	if string(data) != "written content" {
		t.Fatalf("expected 'written content', got %q", string(data))
	}
}

func TestFileWrite_RejectsPathTraversal(t *testing.T) {
	server, _ := setupFileServer(t)

	result := callTool(t, server, "file_write", map[string]any{
		"path":    "../../etc/evil",
		"content": "bad",
	})
	if !result.IsError {
		t.Fatal("expected error for path traversal, got success")
	}
}

func TestFileList_ReturnsDirectoryContents(t *testing.T) {
	server, workspace := setupFileServer(t)

	os.WriteFile(filepath.Join(workspace, "a.txt"), []byte("a"), 0644)
	os.Mkdir(filepath.Join(workspace, "subdir"), 0755)

	result := callTool(t, server, "file_list", map[string]any{"path": "."})
	if result.IsError {
		t.Fatalf("unexpected error: %v", result.Content)
	}
	text := result.Content[0].(*mcp.TextContent).Text
	if len(text) == 0 {
		t.Fatal("expected non-empty listing")
	}
}

func TestFileRead_NonexistentReturnsError(t *testing.T) {
	server, _ := setupFileServer(t)

	result := callTool(t, server, "file_read", map[string]any{"path": "nonexistent.txt"})
	if !result.IsError {
		t.Fatal("expected error for nonexistent file")
	}
}
