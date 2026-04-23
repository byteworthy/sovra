# Build stage
FROM golang:1.26-alpine@sha256:f85330846cde1e57ca9ec309382da3b8e6ae3ab943d2739500e08c86393a21b1 AS builder

WORKDIR /build

# Cache dependencies before copying source
COPY go.mod go.sum ./
RUN go mod download

# Build binary — CGO disabled for minimal static image
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /worker ./cmd/worker

# Runtime stage — minimal Alpine, non-root user
FROM alpine:3.20@sha256:d9e853e87e55526f6b2917df91a2115c36dd7c696a35be12163d44e6e2a4b6bc

RUN apk --no-cache add ca-certificates tzdata

COPY --from=builder /worker /usr/local/bin/worker

# Run as non-root user (uid 1000)
RUN adduser -D -u 1000 worker
USER worker

EXPOSE 8080 50051

ENTRYPOINT ["worker"]
