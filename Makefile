.PHONY: go-build go-test go-dev go-lint go-tidy

WORKER_DIR := packages/worker

go-build:
	cd $(WORKER_DIR) && go build -o bin/worker ./cmd/worker

go-test:
	cd $(WORKER_DIR) && go test ./... -v

go-dev:
	cd $(WORKER_DIR) && air -c .air.toml

go-lint:
	cd $(WORKER_DIR) && go vet ./...

go-tidy:
	cd $(WORKER_DIR) && go mod tidy
