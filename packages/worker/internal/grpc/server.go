package grpc

import (
	"fmt"
	"log"
	"net"

	"github.com/jackc/pgx/v5/pgxpool"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/health"
	"google.golang.org/grpc/health/grpc_health_v1"
)

// StartServer starts the gRPC server stub on the given port.
// Phase 1 registers only the standard health service.
// Real agent services added in Phase 4 (APIK-03).
//
// TLS NOTE: This server uses explicit insecure credentials because it operates
// exclusively within a private Docker network (not exposed to the public internet).
// Before any external exposure, replace insecure.NewCredentials() with
// credentials.NewServerTLSFromFile("cert.pem", "cert.key").
// Returns a stop function for graceful termination.
func StartServer(port int, _ *pgxpool.Pool) func() {
	lis, err := net.Listen("tcp", fmt.Sprintf(":%d", port))
	if err != nil {
		log.Fatalf("grpc listen failed: %v", err)
	}

	// Explicit insecure credentials — internal Docker network only.
	// Replace with TLS credentials before any external exposure.
	s := grpc.NewServer(grpc.Creds(insecure.NewCredentials()))

	healthServer := health.NewServer()
	grpc_health_v1.RegisterHealthServer(s, healthServer)
	healthServer.SetServingStatus("", grpc_health_v1.HealthCheckResponse_SERVING)

	go func() {
		log.Printf("grpc server listening on :%d", port)
		if err := s.Serve(lis); err != nil {
			log.Fatalf("grpc serve failed: %v", err)
		}
	}()

	return s.GracefulStop
}
