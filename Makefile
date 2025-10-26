
.DEFAULT_GOAL := help
.PHONY: help build up down logs backend-shell frontend-shell clean rebuild

help:
	@echo "Usage: make [target]"
	@echo ""
	@echo "Common targets:"
	@echo "  help            Show this help message (default)"
	@echo "  build           Build backend and frontend Docker images" 
	@echo "  up              Start services in background (docker-compose up -d --build)" 
	@echo "  down            Stop services (docker-compose down)"
	@echo "  logs            Follow logs (docker-compose logs -f --tail=200)"
	@echo "  backend-shell   Open a shell in the backend container" 
	@echo "  frontend-shell  Open a shell in the frontend container"
	@echo "  clean           Prune unused docker resources"
	@echo ""
	@echo "Docker quick commands:" 
	@echo "  make up         # starts backend (http://localhost:8000) and frontend (http://localhost:3000)"
	@echo "  make down"
	@echo ""
	@echo "Note: 'make --help' shows Make's builtin help and cannot be overridden. Use 'make help' or just 'make' to see project-specific instructions."

build:
	@echo "Building backend and frontend images..."
	docker-compose build

up:
	@echo "Starting services (docker-compose up)..."
	docker-compose up -d --build

down:
	@echo "Stopping services..."
	docker-compose down

logs:
	@echo "Showing combined logs (backend+frontend)..."
	docker-compose logs -f --tail=200

backend-shell:
	@echo "Open shell into backend container (sh)"
	docker-compose exec backend /bin/sh

frontend-shell:
	@echo "Open shell into frontend container"
	docker-compose exec frontend /bin/sh

rebuild: down build up

clean:
	@echo "Removing unused images and dangling resources (local prune)..."
	# Be careful: these prune commands will free unused Docker resources
	docker system prune -f
