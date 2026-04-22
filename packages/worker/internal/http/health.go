package http

import (
	"context"
	"fmt"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

// NewRouter creates a minimal Gin router with a health endpoint.
// SECURITY: Health endpoint exposes only {"status":"ok"} or {"status":"degraded"} —
// no version, environment, or internal details.
func NewRouter(pool *pgxpool.Pool) *gin.Engine {
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Recovery())

	r.GET("/health", healthHandler(pool))

	return r
}

func healthHandler(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		status := "ok"
		httpStatus := http.StatusOK

		if pool != nil {
			if err := pool.Ping(c.Request.Context()); err != nil {
				status = "degraded"
				httpStatus = http.StatusServiceUnavailable
			}
		}

		c.JSON(httpStatus, gin.H{"status": status})
	}
}

// StartHealthServer starts the HTTP health server on the given port.
// Returns a shutdown function for graceful termination.
func StartHealthServer(port int, pool *pgxpool.Pool) func(context.Context) error {
	router := NewRouter(pool)
	addr := fmt.Sprintf(":%d", port)
	srv := &http.Server{Addr: addr, Handler: router}

	go func() {
		log.Printf("health server listening on %s", addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("health server failed: %v", err)
		}
	}()

	return srv.Shutdown
}
