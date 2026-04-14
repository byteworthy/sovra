package http_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	workerhttp "github.com/byteworthy/sovra-worker/internal/http"
)

func TestHealthEndpoint(t *testing.T) {
	router := workerhttp.NewRouter(nil)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/health", nil)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	var body map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("failed to parse response body: %v", err)
	}

	if body["status"] != "ok" {
		t.Errorf("expected status 'ok', got '%s'", body["status"])
	}
}
