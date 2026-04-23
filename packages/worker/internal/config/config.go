package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

// Config holds all runtime configuration loaded from environment variables.
type Config struct {
	DatabaseURL            string
	HTTPPort               int
	GRPCPort               int
	MCPPort                int
	SocketIOPort           int
	SocketIOAllowedOrigins string
	InternalAPISecret      string
	SupabaseJWTSecret      string
	Environment            string
	AgentWorkspacePath     string
	BraveSearchAPIKey      string
	OpenAIAPIKey           string
}

// Load reads configuration from environment variables with safe defaults.
func Load() *Config {
	return &Config{
		DatabaseURL:            getEnv("DATABASE_URL", "postgresql://postgres:postgres@localhost:54322/postgres"),
		HTTPPort:               getEnvInt("HTTP_PORT", 8080),
		GRPCPort:               getEnvInt("GRPC_PORT", 50051),
		MCPPort:                getEnvInt("MCP_PORT", 3001),
		SocketIOPort:           getEnvInt("SOCKETIO_PORT", 3002),
		SocketIOAllowedOrigins: getEnv("SOCKETIO_ALLOWED_ORIGINS", "http://localhost:3000"),
		InternalAPISecret:      getEnv("INTERNAL_API_SECRET", ""),
		SupabaseJWTSecret:      getEnv("SUPABASE_JWT_SECRET", ""),
		Environment:            getEnv("GO_ENV", "development"),
		AgentWorkspacePath:     getEnv("AGENT_WORKSPACE_PATH", "/tmp/agent-workspace"),
		BraveSearchAPIKey:      getEnv("BRAVE_SEARCH_API_KEY", ""),
		OpenAIAPIKey:           getEnv("OPENAI_API_KEY", ""),
	}
}

// IsProduction reports whether the worker is running in production mode.
func (c *Config) IsProduction() bool {
	return strings.EqualFold(strings.TrimSpace(c.Environment), "production")
}

// ValidateAuthConfig enforces required auth settings for production startup.
func (c *Config) ValidateAuthConfig() error {
	if !c.IsProduction() {
		return nil
	}

	missing := make([]string, 0, 2)
	if strings.TrimSpace(c.InternalAPISecret) == "" {
		missing = append(missing, "INTERNAL_API_SECRET")
	}
	if strings.TrimSpace(c.SupabaseJWTSecret) == "" {
		missing = append(missing, "SUPABASE_JWT_SECRET")
	}
	if len(missing) == 0 {
		return nil
	}

	return fmt.Errorf("missing required auth secrets in production: %s", strings.Join(missing, ", "))
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	}
	return fallback
}
