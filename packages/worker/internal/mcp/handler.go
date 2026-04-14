package mcp

import (
	"crypto/subtle"
	"fmt"
	"log"
	"net/http"

	"github.com/byteworthy/sovra-worker/internal/config"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

// internalAuthMiddleware wraps an http.Handler with shared-secret auth.
// If secret is empty, all requests pass through (local dev mode).
func internalAuthMiddleware(next http.Handler, secret string) http.Handler {
	if secret == "" {
		return next
	}
	secretBytes := []byte("Bearer " + secret)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		auth := r.Header.Get("Authorization")
		if subtle.ConstantTimeCompare([]byte(auth), secretBytes) != 1 {
			http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// NewMCPHandler creates an HTTP handler that serves the MCP server via Streamable HTTP transport.
// Applies shared-secret auth when INTERNAL_API_SECRET is configured.
func NewMCPHandler(server *mcp.Server, internalSecret string) http.Handler {
	handler := mcp.NewStreamableHTTPHandler(func(req *http.Request) *mcp.Server {
		return server
	}, nil)

	mux := http.NewServeMux()
	mux.Handle("/mcp", internalAuthMiddleware(handler, internalSecret))
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
	handler := NewMCPHandler(server, cfg.InternalAPISecret)

	addr := fmt.Sprintf(":%d", port)
	log.Printf("mcp server listening on %s", addr)
	if err := http.ListenAndServe(addr, handler); err != nil { //nolint:gosec // internal network only, TLS at edge
		log.Fatalf("mcp server failed: %v", err)
	}
}
