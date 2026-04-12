package config

import (
	"os"
	"strconv"
)

// Config holds all runtime configuration loaded from environment variables.
type Config struct {
	DatabaseURL        string
	HTTPPort           int
	GRPCPort           int
	MCPPort            int
	Environment        string
	AgentWorkspacePath string
	BraveSearchAPIKey  string
	OpenAIAPIKey       string
}

// Load reads configuration from environment variables with safe defaults.
func Load() *Config {
	return &Config{
		DatabaseURL:        getEnv("DATABASE_URL", "postgresql://postgres:postgres@localhost:54322/postgres"),
		HTTPPort:           getEnvInt("HTTP_PORT", 8080),
		GRPCPort:           getEnvInt("GRPC_PORT", 50051),
		MCPPort:            getEnvInt("MCP_PORT", 3001),
		Environment:        getEnv("GO_ENV", "development"),
		AgentWorkspacePath: getEnv("AGENT_WORKSPACE_PATH", "/tmp/agent-workspace"),
		BraveSearchAPIKey:  getEnv("BRAVE_SEARCH_API_KEY", ""),
		OpenAIAPIKey:       getEnv("OPENAI_API_KEY", ""),
	}
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
