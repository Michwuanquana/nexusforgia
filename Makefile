.PHONY: help build deploy-dev logs shell stop restart

# Default target
help:
	@echo "Available commands:"
	@echo "  make build        - Build Docker images"
	@echo "  make deploy-dev   - Deploy to development (dev.nexumforgia.org)"
	@echo "  make logs         - Show container logs"
	@echo "  make shell        - Open shell in www container"
	@echo "  make shell-api    - Open shell in backend container"
	@echo "  make stop         - Stop all containers"
	@echo "  make restart      - Restart all containers"

# Build
build:
	docker compose build

# Deploy development
deploy-dev:
	docker compose up -d --build
	@echo "Deployed to https://dev.nexumforgia.org"
	@echo "API available at https://api.nexumforgia.org"

# Logs
logs:
	docker compose logs -f

logs-www:
	docker compose logs -f udmf-www

logs-api:
	docker compose logs -f udmf-backend

# Shell access
shell:
	docker compose exec udmf-www sh

shell-api:
	docker compose exec udmf-backend sh

# Stop
stop:
	docker compose down

# Restart
restart:
	docker compose restart
