package mcp

import (
	"context"
	"crypto/subtle"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/byteworthy/sovra-worker/internal/config"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

// internalAuthMiddleware wraps an http.Handler with shared-secret auth.
// If secret is empty, requests are only allowed in non-production.
func internalAuthMiddleware(next http.Handler, secret string) http.Handler {
	isProduction := strings.EqualFold(strings.TrimSpace(os.Getenv("GO_ENV")), "production")
	if secret == "" {
		if isProduction {
			return http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
				http.Error(w, `{"error":"server auth misconfigured: INTERNAL_API_SECRET is required"}`, http.StatusUnauthorized)
			})
		}
		log.Println("WARNING: INTERNAL_API_SECRET is empty; allowing unauthenticated /mcp in non-production")
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
// Returns a shutdown function for graceful termination.
//
// SECURITY: Plain HTTP is intentional -- this server runs on an internal Docker
// network only (port 3001 not exposed publicly). TLS termination happens at the
// edge/ingress layer. See threat model T-04-07.
func StartMCPServer(port int, pool *pgxpool.Pool, cfg *config.Config) func(context.Context) error {
	server := NewMCPServer(pool, cfg)
	handler := NewMCPHandler(server, cfg.InternalAPISecret)

	addr := fmt.Sprintf(":%d", port)
	srv := &http.Server{Addr: addr, Handler: handler} //nolint:gosec // internal network only, TLS at edge

	go func() {
		log.Printf("mcp server listening on %s", addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("mcp server failed: %v", err)
		}
	}()

	return srv.Shutdown
}
