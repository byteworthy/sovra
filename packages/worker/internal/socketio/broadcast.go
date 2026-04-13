package socketio

import (
	"crypto/subtle"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/zishang520/socket.io/v2/socket"
)

// BroadcastPayload is the JSON body expected by the /internal/broadcast endpoint.
type BroadcastPayload struct {
	TenantId    string `json:"tenant_id" binding:"required"`
	WorkspaceId string `json:"workspace_id" binding:"required"`
	Event       string `json:"event" binding:"required"`
	Data        any    `json:"data"`
}

// BroadcastHandler emits Socket.IO events to workspace rooms via HTTP.
type BroadcastHandler struct {
	IO *socket.Server
}

// Handle processes POST /internal/broadcast requests.
// Validates tenant_id, workspace_id, and event fields, then emits to the composite room.
func (h *BroadcastHandler) Handle(c *gin.Context) {
	var payload BroadcastPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	// Extra guard: binding:"required" catches missing fields, but not empty strings after binding.
	if payload.TenantId == "" || payload.WorkspaceId == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenant_id and workspace_id required"})
		return
	}
	room := BuildRoomName(payload.TenantId, payload.WorkspaceId)
	h.IO.To(socket.Room(room)).Emit(payload.Event, payload.Data)
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// InternalAuthMiddleware validates the Authorization header against a shared secret.
// If no secret is configured, all requests are allowed (local dev mode).
func InternalAuthMiddleware(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if secret == "" {
			c.Next()
			return
		}
		token := c.GetHeader("Authorization")
		if token == "" || subtle.ConstantTimeCompare([]byte(token), []byte("Bearer "+secret)) != 1 {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			c.Abort()
			return
		}
		c.Next()
	}
}

// MountBroadcastRoutes adds the /internal/broadcast endpoint to the given router.
// Requires INTERNAL_API_SECRET for authentication when configured.
func MountBroadcastRoutes(router *gin.Engine, io *socket.Server, secret string) {
	handler := &BroadcastHandler{IO: io}
	internal := router.Group("/internal")
	internal.Use(InternalAuthMiddleware(secret))
	internal.POST("/broadcast", handler.Handle)
}
