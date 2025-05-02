SHELL = '/bin/bash'
PROJECT_NAME = hmpps-probation-frontend-components-api
LOCAL_COMPOSE_FILES = -f docker-compose.yml
DEV_COMPOSE_FILES = -f docker-compose.yml -f docker-compose.dev.yml
export COMPOSE_PROJECT_NAME=${PROJECT_NAME}

default: help

help: ## The help text you're reading.
	@grep --no-filename -E '^[0-9a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

up: ## Starts/restarts the UI in a production container.
	docker compose ${LOCAL_COMPOSE_FILES} down app
	docker compose ${LOCAL_COMPOSE_FILES} up app --wait --no-recreate --build

down: ## Stops and removes all containers in the project.
	docker compose ${LOCAL_COMPOSE_FILES} down
	make dev-down

dev-up: ## Starts/restarts the UI in a development container. A remote debugger can be attached on port 9229.
	docker compose ${DEV_COMPOSE_FILES} down app
	docker compose ${DEV_COMPOSE_FILES} up app --wait --no-recreate --build

dev-down: ## Stops and removes all dev containers.
	docker compose ${DEV_COMPOSE_FILES} down

test: ## Runs the unit test suite.
	docker compose ${DEV_COMPOSE_FILES} run --rm --no-deps app npm run test

lint: ## Runs the linter.
	docker compose ${DEV_COMPOSE_FILES} run --rm --no-deps app npm run lint

lint-fix: ## Automatically fixes linting issues.
	docker compose ${DEV_COMPOSE_FILES} run --rm --no-deps app npm run lint:fix

clean: ## Stops and removes all project containers. Deletes local build/cache directories.
	docker compose down
	rm -rf dist node_modules test_results

update: ## Downloads the latest versions of container images.
	docker compose pull
