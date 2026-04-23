package config

import "testing"

func TestIsProduction(t *testing.T) {
	cfg := &Config{Environment: "production"}
	if !cfg.IsProduction() {
		t.Fatal("expected IsProduction to return true")
	}

	cfg.Environment = "Production"
	if !cfg.IsProduction() {
		t.Fatal("expected IsProduction to be case-insensitive")
	}

	cfg.Environment = "development"
	if cfg.IsProduction() {
		t.Fatal("expected IsProduction to return false for development")
	}
}

func TestValidateAuthConfig_DevelopmentAllowsEmptySecrets(t *testing.T) {
	cfg := &Config{
		Environment:       "development",
		InternalAPISecret: "",
		SupabaseJWTSecret: "",
	}

	if err := cfg.ValidateAuthConfig(); err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
}

func TestValidateAuthConfig_ProductionRequiresSecrets(t *testing.T) {
	cfg := &Config{
		Environment:       "production",
		InternalAPISecret: "",
		SupabaseJWTSecret: "",
	}

	if err := cfg.ValidateAuthConfig(); err == nil {
		t.Fatal("expected error when required secrets are missing in production")
	}
}

func TestValidateAuthConfig_ProductionPassesWhenSecretsSet(t *testing.T) {
	cfg := &Config{
		Environment:       "production",
		InternalAPISecret: "internal-secret",
		SupabaseJWTSecret: "jwt-secret",
	}

	if err := cfg.ValidateAuthConfig(); err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
}
