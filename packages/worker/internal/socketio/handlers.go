package socketio

import (
	"log"

	"github.com/zishang520/socket.io/v2/socket"
)

// HandleConnection sets up event handlers for a connected Socket.IO client.
func HandleConnection(io *socket.Server, client *socket.Socket, auth *SocketAuth) {
	client.On("workspace:join", func(args ...any) {
		if len(args) < 3 {
			log.Printf("workspace:join missing args (need tenantId, workspaceId, token)")
			client.Emit("error", "workspace:join requires tenantId, workspaceId, and token")
			return
		}
		tenantId, ok1 := args[0].(string)
		workspaceId, ok2 := args[1].(string)
		token, ok3 := args[2].(string)
		if !ok1 || !ok2 || !ok3 || tenantId == "" || workspaceId == "" || token == "" {
			log.Printf("workspace:join invalid args")
			client.Emit("error", "invalid arguments")
			return
		}

		// Verify JWT and tenant membership
		if len(auth.JWTSecret) > 0 {
			userID, err := auth.VerifyToken(token)
			if err != nil {
				log.Printf("workspace:join auth failed for client %s: %v", client.Id(), err)
				client.Emit("error", "authentication failed")
				return
			}
			if !auth.CheckTenantMembership(userID, tenantId) {
				log.Printf("workspace:join tenant access denied for user %s tenant %s", userID, tenantId)
				client.Emit("error", "access denied")
				return
			}
		}

		room := BuildRoomName(tenantId, workspaceId)
		client.Join(socket.Room(room))
		client.Emit("workspace:joined", room)
		log.Printf("client %s joined room %s", client.Id(), room)
	})

	client.On("workspace:leave", func(args ...any) {
		if len(args) < 2 {
			return
		}
		tenantId, ok1 := args[0].(string)
		workspaceId, ok2 := args[1].(string)
		if !ok1 || !ok2 {
			return
		}
		room := BuildRoomName(tenantId, workspaceId)
		client.Leave(socket.Room(room))
		log.Printf("client %s left room %s", client.Id(), room)
	})

	client.On("disconnect", func(...any) {
		log.Printf("client %s disconnected", client.Id())
	})
}
