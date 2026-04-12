package tools

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

const toolTimeout = 30 * time.Second

func errorResult(msg string) (*mcp.CallToolResult, error) {
	return &mcp.CallToolResult{
		IsError: true,
		Content: []mcp.Content{&mcp.TextContent{Text: msg}},
	}, nil
}

func textResult(msg string) (*mcp.CallToolResult, error) {
	return &mcp.CallToolResult{
		Content: []mcp.Content{&mcp.TextContent{Text: msg}},
	}, nil
}

// resolveSandboxedPath validates and resolves a path within the workspace root.
// Returns an error if the resolved path escapes the workspace.
func resolveSandboxedPath(workspacePath, userPath string) (string, error) {
	cleaned := filepath.Clean(userPath)
	resolved := filepath.Join(workspacePath, cleaned)
	absWorkspace, err := filepath.Abs(workspacePath)
	if err != nil {
		return "", fmt.Errorf("invalid workspace path: %w", err)
	}
	absResolved, err := filepath.Abs(resolved)
	if err != nil {
		return "", fmt.Errorf("invalid path: %w", err)
	}
	if !strings.HasPrefix(absResolved, absWorkspace) {
		return "", fmt.Errorf("path traversal blocked: %s escapes workspace root", userPath)
	}
	return absResolved, nil
}

// RegisterFileTools registers file_read, file_write, and file_list tools on the MCP server.
func RegisterFileTools(server *mcp.Server, workspacePath string) {
	server.AddTool(
		&mcp.Tool{
			Name:        "file_read",
			Description: "Read contents of a file within the agent workspace",
			InputSchema: json.RawMessage(`{"type":"object","properties":{"path":{"type":"string","description":"File path relative to workspace root"}},"required":["path"]}`),
		},
		func(ctx context.Context, req *mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			tctx, cancel := context.WithTimeout(ctx, toolTimeout)
			defer cancel()

			var args struct{ Path string }
			if err := json.Unmarshal(req.Params.Arguments, &args); err != nil {
				return errorResult("invalid arguments: " + err.Error())
			}

			resolved, err := resolveSandboxedPath(workspacePath, args.Path)
			if err != nil {
				return errorResult(err.Error())
			}

			doneCh := make(chan struct{})
			var content []byte
			var readErr error
			go func() {
				content, readErr = os.ReadFile(resolved)
				close(doneCh)
			}()

			select {
			case <-tctx.Done():
				if errors.Is(tctx.Err(), context.DeadlineExceeded) {
					return errorResult("tool execution timed out after 30s")
				}
				return errorResult(tctx.Err().Error())
			case <-doneCh:
				if readErr != nil {
					return errorResult(readErr.Error())
				}
				return textResult(string(content))
			}
		},
	)

	server.AddTool(
		&mcp.Tool{
			Name:        "file_write",
			Description: "Write content to a file within the agent workspace",
			InputSchema: json.RawMessage(`{"type":"object","properties":{"path":{"type":"string","description":"File path relative to workspace root"},"content":{"type":"string","description":"Content to write"}},"required":["path","content"]}`),
		},
		func(ctx context.Context, req *mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			tctx, cancel := context.WithTimeout(ctx, toolTimeout)
			defer cancel()

			var args struct {
				Path    string
				Content string
			}
			if err := json.Unmarshal(req.Params.Arguments, &args); err != nil {
				return errorResult("invalid arguments: " + err.Error())
			}

			resolved, err := resolveSandboxedPath(workspacePath, args.Path)
			if err != nil {
				return errorResult(err.Error())
			}

			doneCh := make(chan struct{})
			var writeErr error
			go func() {
				writeErr = os.MkdirAll(filepath.Dir(resolved), 0755)
				if writeErr == nil {
					writeErr = os.WriteFile(resolved, []byte(args.Content), 0644)
				}
				close(doneCh)
			}()

			select {
			case <-tctx.Done():
				if errors.Is(tctx.Err(), context.DeadlineExceeded) {
					return errorResult("tool execution timed out after 30s")
				}
				return errorResult(tctx.Err().Error())
			case <-doneCh:
				if writeErr != nil {
					return errorResult(writeErr.Error())
				}
				return textResult(fmt.Sprintf("wrote %d bytes to %s", len(args.Content), args.Path))
			}
		},
	)

	server.AddTool(
		&mcp.Tool{
			Name:        "file_list",
			Description: "List directory contents within the agent workspace",
			InputSchema: json.RawMessage(`{"type":"object","properties":{"path":{"type":"string","description":"Directory path relative to workspace root"}},"required":["path"]}`),
		},
		func(ctx context.Context, req *mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			tctx, cancel := context.WithTimeout(ctx, toolTimeout)
			defer cancel()

			var args struct{ Path string }
			if err := json.Unmarshal(req.Params.Arguments, &args); err != nil {
				return errorResult("invalid arguments: " + err.Error())
			}

			resolved, err := resolveSandboxedPath(workspacePath, args.Path)
			if err != nil {
				return errorResult(err.Error())
			}

			doneCh := make(chan struct{})
			var entries []os.DirEntry
			var listErr error
			go func() {
				entries, listErr = os.ReadDir(resolved)
				close(doneCh)
			}()

			select {
			case <-tctx.Done():
				if errors.Is(tctx.Err(), context.DeadlineExceeded) {
					return errorResult("tool execution timed out after 30s")
				}
				return errorResult(tctx.Err().Error())
			case <-doneCh:
				if listErr != nil {
					return errorResult(listErr.Error())
				}
				var sb strings.Builder
				for _, entry := range entries {
					info, _ := entry.Info()
					kind := "file"
					if entry.IsDir() {
						kind = "dir"
					}
					size := int64(0)
					if info != nil {
						size = info.Size()
					}
					fmt.Fprintf(&sb, "%s\t%s\t%d\n", entry.Name(), kind, size)
				}
				return textResult(sb.String())
			}
		},
	)
}
