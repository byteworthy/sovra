package mcp

import (
	"fmt"
	"log"
	"net/http"

	"github.com/byteswarm/worker/internal/config"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

// NewMCPHandler creates an HTTP handler that serves the MCP server via Streamable HTTP transport.
func NewMCPHandler(server *mcp.Server) http.Handler {
	handler := mcp.NewStreamableHTTPHandler(func(req *http.Request) *mcp.Server {
		return server
	}, nil)

	mux := http.NewServeMux()
	mux.Handle("/mcp", handler)
	return mux
}

// StartMCPServer creates and starts the MCP server on the given port.
// This function blocks until the server exits.
//
// SECURITY: Plain HTTP is intentional -- this server runs on an internal Docker
// network only (port 3001 not exposed publicly). TLS termination happens at the
// edge/ingress layer. See threat model T-04-07.
func StartMCPServer(port int, pool *pgxpool.Pool, cfg *config.Config) {
	server := NewMCPServer(pool, cfg)
	handler := NewMCPHandler(server)

	addr := fmt.Sprintf(":%d", port)
	log.Printf("mcp server listening on %s", addr)
	if err := http.ListenAndServe(addr, handler); err != nil { //nolint:gosec // internal network only, TLS at edge
		log.Fatalf("mcp server failed: %v", err)
	}
}
