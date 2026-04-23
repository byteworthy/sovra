package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/byteworthy/sovra-worker/internal/config"
	"github.com/byteworthy/sovra-worker/internal/db"
	workergrpc "github.com/byteworthy/sovra-worker/internal/grpc"
	workerhttp "github.com/byteworthy/sovra-worker/internal/http"
	mcpserver "github.com/byteworthy/sovra-worker/internal/mcp"
	socketioserver "github.com/byteworthy/sovra-worker/internal/socketio"
)

func main() {
	cfg := config.Load()

	if err := cfg.ValidateAuthConfig(); err != nil {
		log.Fatalf("FATAL: %v", err)
	}

	if !cfg.IsProduction() && cfg.InternalAPISecret == "" {
		log.Println("WARNING: INTERNAL_API_SECRET not set — internal endpoints are unauthenticated in non-production")
	}
	if !cfg.IsProduction() && cfg.SupabaseJWTSecret == "" {
		log.Println("WARNING: SUPABASE_JWT_SECRET not set — socket join auth is disabled in non-production")
	}

	// A wildcard origin in production allows any website to establish a WebSocket
	// connection to this worker and receive real-time tenant data.
	for _, origin := range strings.Split(cfg.SocketIOAllowedOrigins, ",") {
		if strings.TrimSpace(origin) == "*" {
			if cfg.IsProduction() {
				log.Fatal("FATAL: SOCKETIO_ALLOWED_ORIGINS contains '*' — wildcard is not permitted in production")
			}
			log.Println("WARNING: SOCKETIO_ALLOWED_ORIGINS contains '*' — this is insecure outside local development")
			break
		}
	}

	log.Printf("starting sovra worker (env=%s)", cfg.Environment)

	// Connect to database.
	// SECURITY: Never log cfg.DatabaseURL — only log connection status.
	pool, err := db.NewPool(context.Background(), cfg.DatabaseURL)
	if err != nil {
		log.Printf("warning: database connection failed: %v", err)
		log.Println("worker starting without database — health checks will report degraded")
		// Start without DB — allows container health checks to work during Supabase startup.
		pool = nil
	} else {
		log.Println("database connected")
		defer pool.Close()
	}

	// Start all servers. Each returns a shutdown handle.
	shutdownHealth := workerhttp.StartHealthServer(cfg.HTTPPort, pool)
	stopGRPC := workergrpc.StartServer(cfg.GRPCPort, pool)
	shutdownMCP := mcpserver.StartMCPServer(cfg.MCPPort, pool, cfg)
	_, shutdownSocketIO := socketioserver.StartSocketIOServer(
		cfg.SocketIOPort,
		cfg.SocketIOAllowedOrigins,
		cfg.InternalAPISecret,
		cfg.SupabaseJWTSecret,
		pool,
	)

	// Wait for SIGINT or SIGTERM, then stop services gracefully.
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	sig := <-quit
	log.Printf("received signal %s, shutting down gracefully (30s timeout)", sig)

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := shutdownHealth(ctx); err != nil {
		log.Printf("health server shutdown error: %v", err)
	}
	if err := shutdownMCP(ctx); err != nil {
		log.Printf("mcp server shutdown error: %v", err)
	}
	if err := shutdownSocketIO(ctx); err != nil {
		log.Printf("socket.io server shutdown error: %v", err)
	}

	stopGRPC()

	log.Println("all servers stopped - exiting")
}
