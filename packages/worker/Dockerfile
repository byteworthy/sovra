# Build stage
FROM golang:1.26-alpine AS builder

WORKDIR /build

# Cache dependencies before copying source
COPY go.mod go.sum ./
RUN go mod download

# Build binary — CGO disabled for minimal static image
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /worker ./cmd/worker

# Runtime stage — minimal Alpine, non-root user
FROM alpine:3.23

RUN apk --no-cache add ca-certificates tzdata

COPY --from=builder /worker /usr/local/bin/worker

# Run as non-root user (uid 1000)
RUN adduser -D -u 1000 worker
USER worker

EXPOSE 8080 50051

ENTRYPOINT ["worker"]
