package socketio

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// SocketAuth handles JWT verification and tenant membership checks for WebSocket connections.
type SocketAuth struct {
	JWTSecret []byte
	Pool      *pgxpool.Pool
}

// Claims represents the Supabase JWT claims we care about.
type Claims struct {
	Sub string `json:"sub"`
	jwt.RegisteredClaims
}

// VerifyToken validates a Supabase access token and returns the user ID.
// Returns empty string if verification fails.
func (a *SocketAuth) VerifyToken(tokenStr string) (string, error) {
	if len(a.JWTSecret) == 0 {
		return "", fmt.Errorf("JWT secret not configured")
	}

	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return a.JWTSecret, nil
	})

	if err != nil {
		return "", fmt.Errorf("invalid token: %w", err)
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return "", fmt.Errorf("invalid token claims")
	}

	return claims.Sub, nil
}

// CheckTenantMembership verifies the user belongs to the given tenant.
func (a *SocketAuth) CheckTenantMembership(userID, tenantID string) bool {
	if a.Pool == nil {
		log.Printf("[socket-auth] no database pool — skipping membership check")
		return false
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var exists bool
	err := a.Pool.QueryRow(ctx,
		"SELECT EXISTS(SELECT 1 FROM tenant_users WHERE user_id = $1 AND tenant_id = $2)",
		userID, tenantID,
	).Scan(&exists)

	if err != nil {
		log.Printf("[socket-auth] membership check failed: %v", err)
		return false
	}

	return exists
}
