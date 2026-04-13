package socketio

import (
	"fmt"
	"log"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/zishang520/engine.io/v2/types"
	"github.com/zishang520/socket.io/v2/socket"
)

// BuildRoomName constructs a composite room name to prevent cross-tenant collisions.
// Format: "tenantId:workspaceId" — UUID pairs are computationally infeasible to guess.
func BuildRoomName(tenantId, workspaceId string) string {
	return fmt.Sprintf("%s:%s", tenantId, workspaceId)
}

// MountSocketIO creates a Socket.IO server and mounts it on a new Gin router.
// Returns the server instance and router for further route registration.
func MountSocketIO(allowedOrigins string, auth *SocketAuth) (*socket.Server, *gin.Engine) {
	gin.SetMode(gin.ReleaseMode)
	router := gin.New()
	router.Use(gin.Recovery())

	opts := socket.DefaultServerOptions()
	opts.SetCors(&types.Cors{
		Origin:      allowedOrigins,
		Credentials: true,
	})

	io := socket.NewServer(nil, opts)

	io.On("connection", func(clients ...any) {
		client := clients[0].(*socket.Socket)
		HandleConnection(io, client, auth)
	})

	router.GET("/socket.io/*f", gin.WrapH(io.ServeHandler(nil)))
	router.POST("/socket.io/*f", gin.WrapH(io.ServeHandler(nil)))

	return io, router
}

// StartSocketIOServer starts the Socket.IO server on the given port.
// Mounts broadcast routes internally and starts listening in the background.
// Returns the Socket.IO server instance for use by callers.
func StartSocketIOServer(port int, allowedOrigins string, internalSecret string, jwtSecret string, pool *pgxpool.Pool) *socket.Server {
	auth := &SocketAuth{
		JWTSecret: []byte(jwtSecret),
		Pool:      pool,
	}
	io, router := MountSocketIO(allowedOrigins, auth)
	MountBroadcastRoutes(router, io, internalSecret)

	addr := fmt.Sprintf(":%d", port)
	log.Printf("socket.io server listening on %s", addr)
	go func() {
		if err := router.Run(addr); err != nil {
			log.Printf("socket.io server error: %v", err)
		}
	}()

	return io
}
