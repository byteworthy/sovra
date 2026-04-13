package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/byteswarm/worker/internal/config"
	"github.com/byteswarm/worker/internal/db"
	workergrpc "github.com/byteswarm/worker/internal/grpc"
	workerhttp "github.com/byteswarm/worker/internal/http"
	mcpserver "github.com/byteswarm/worker/internal/mcp"
	socketioserver "github.com/byteswarm/worker/internal/socketio"
)

func main() {
	cfg := config.Load()

	log.Printf("starting byteswarm worker (env=%s)", cfg.Environment)

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

	// Start HTTP health server in the background.
	go workerhttp.StartHealthServer(cfg.HTTPPort, pool)

	// Start gRPC server in the background.
	go workergrpc.StartServer(cfg.GRPCPort, pool)

	// Start MCP server in the background.
	go mcpserver.StartMCPServer(cfg.MCPPort, pool, cfg)

	// Start Socket.IO server for real-time workspace collaboration.
	// Serves on cfg.SocketIOPort (default 3002). Includes /internal/broadcast endpoint.
	// SECURITY: Never use "*" for allowed origins in production — use SOCKETIO_ALLOWED_ORIGINS env var.
	go func() {
		socketioserver.StartSocketIOServer(cfg.SocketIOPort, cfg.SocketIOAllowedOrigins, cfg.InternalAPISecret, cfg.SupabaseJWTSecret, pool)
	}()

	// Block until SIGINT or SIGTERM.
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	sig := <-quit
	log.Printf("received signal %s, shutting down", sig)
}
