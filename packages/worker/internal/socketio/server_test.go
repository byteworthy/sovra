package socketio_test

import (
	"testing"

	"github.com/byteswarm/worker/internal/socketio"
)

func TestMountSocketIO_ReturnsNonNilServer(t *testing.T) {
	io, router := socketio.MountSocketIO("*", &socketio.SocketAuth{})

	if io == nil {
		t.Fatal("expected non-nil *socket.Server, got nil")
	}
	if router == nil {
		t.Fatal("expected non-nil *gin.Engine, got nil")
	}
}

func TestBuildRoomName_CompositeFormat(t *testing.T) {
	tests := []struct {
		tenantId    string
		workspaceId string
		expected    string
	}{
		{"tenant-123", "workspace-456", "tenant-123:workspace-456"},
		{"abc", "def", "abc:def"},
		{"", "ws-1", ":ws-1"},
	}

	for _, tc := range tests {
		got := socketio.BuildRoomName(tc.tenantId, tc.workspaceId)
		if got != tc.expected {
			t.Errorf("BuildRoomName(%q, %q) = %q, want %q", tc.tenantId, tc.workspaceId, got, tc.expected)
		}
	}
}
