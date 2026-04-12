package mcp

import (
	"github.com/byteswarm/worker/internal/config"
	"github.com/byteswarm/worker/internal/mcp/tools"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

// NewMCPServer creates an MCP server with all built-in tools registered.
func NewMCPServer(pool *pgxpool.Pool, cfg *config.Config) *mcp.Server {
	server := mcp.NewServer(&mcp.Implementation{
		Name:    "byteswarm-worker",
		Version: "1.0.0",
	}, nil)

	tools.RegisterFileTools(server, cfg.AgentWorkspacePath)
	tools.RegisterWebTools(server, cfg.BraveSearchAPIKey)
	tools.RegisterDatabaseTools(server, pool)

	return server
}
