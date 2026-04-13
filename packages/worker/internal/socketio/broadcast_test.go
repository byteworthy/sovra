package socketio_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/byteswarm/worker/internal/socketio"
	"github.com/zishang520/socket.io/v2/socket"
)

// newTestRouter creates a Gin router with the broadcast routes for testing.
func newTestRouter(io *socket.Server) *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	socketio.MountBroadcastRoutes(router, io, "")
	return router
}

func TestBroadcastHandler_MissingFields(t *testing.T) {
	io, _ := socketio.MountSocketIO("*", &socketio.SocketAuth{})
	router := newTestRouter(io)

	tests := []struct {
		name    string
		body    map[string]any
		wantStatus int
	}{
		{
			name:       "missing tenant_id",
			body:       map[string]any{"workspace_id": "ws-1", "event": "test"},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "missing workspace_id",
			body:       map[string]any{"tenant_id": "t-1", "event": "test"},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "missing event",
			body:       map[string]any{"tenant_id": "t-1", "workspace_id": "ws-1"},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "empty body",
			body:       map[string]any{},
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			bodyBytes, _ := json.Marshal(tc.body)
			req := httptest.NewRequest(http.MethodPost, "/internal/broadcast", bytes.NewReader(bodyBytes))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			if w.Code != tc.wantStatus {
				t.Errorf("expected status %d, got %d (body: %s)", tc.wantStatus, w.Code, w.Body.String())
			}
		})
	}
}

func TestBroadcastHandler_EmptyTenantOrWorkspace(t *testing.T) {
	io, _ := socketio.MountSocketIO("*", &socketio.SocketAuth{})
	router := newTestRouter(io)

	tests := []struct {
		name    string
		body    map[string]any
		wantStatus int
	}{
		{
			name:       "empty tenant_id",
			body:       map[string]any{"tenant_id": "", "workspace_id": "ws-1", "event": "test"},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "empty workspace_id",
			body:       map[string]any{"tenant_id": "t-1", "workspace_id": "", "event": "test"},
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			bodyBytes, _ := json.Marshal(tc.body)
			req := httptest.NewRequest(http.MethodPost, "/internal/broadcast", bytes.NewReader(bodyBytes))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			if w.Code != tc.wantStatus {
				t.Errorf("expected status %d, got %d (body: %s)", tc.wantStatus, w.Code, w.Body.String())
			}
		})
	}
}

func TestBroadcastHandler_ValidPayload(t *testing.T) {
	io, _ := socketio.MountSocketIO("*", &socketio.SocketAuth{})
	router := newTestRouter(io)

	body := map[string]any{
		"tenant_id":    "tenant-abc",
		"workspace_id": "workspace-xyz",
		"event":        "agent:status",
		"data":         map[string]any{"status": "running"},
	}
	bodyBytes, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/internal/broadcast", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d (body: %s)", w.Code, w.Body.String())
	}

	var resp map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("response is not valid JSON: %v", err)
	}
	if ok, _ := resp["ok"].(bool); !ok {
		t.Errorf("expected {ok: true}, got %v", resp)
	}
}
