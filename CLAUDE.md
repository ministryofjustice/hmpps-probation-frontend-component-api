# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚀 Development Setup & Commands

The project is a full-stack application involving a Node.js/Express backend, a proxy layer, and a React/SCSS frontend component.

### 1. Building and Running

*   **Development Environment:** Use `docker-compose.dev.yml` to spin up all services (API, DB, Proxy) locally.
    ```bash
    docker-compose -f docker-compose.dev.yml up --build
    ```
*   **Running the App:** Once services are up, the API service should be accessible via the configured proxy.
*   **Linting:** Run linters to maintain code quality across the stack.
    ```bash
    npm run lint
    ```
*   **Building Frontend Assets:** Compile SASS/SCSS and JS assets.
    ```bash
    npm run build:assets
    ```

### 2. Testing

*   **Full Test Suite:** Run all unit, integration, and e2e tests. The primary `Makefile` target should cover this.
    ```bash
    make test
    ```
*   **Running Single Test:** For focused debugging, target the specific test file or suite.
    ```bash
    # Example for a specific integration test suite
    npm run test:integration ./integration_tests/
    ```
*   **E2E Testing:** The `cypress.config.ts` file defines the Cypress setup for end-to-end testing.

### 3. Code Structure & Architecture (Big Picture)

The application has three primary layers:

1.  **API/Backend (`server/`):**
    *   **Role:** Handles core business logic, data persistence, and exposes RESTful endpoints.
    *   **Structure:** Contains `server.ts` and various modules (`controllers`, `services`, `data`).
    *   **Dependencies:** Interacts with the database (via Docker Compose) and is fronted by the `hmpps-auth-proxy`.

2.  **Authentication Proxy (`hmpps-auth-proxy`):**
    *   **Role:** Acts as a gateway, mediating all external requests to the core API. It handles initial request validation, authentication checks, and routing before passing the request to the backend.

3.  **Client/Frontend (`assets/`, `content/`):**
    *   **Role:** The user-facing component, responsible for rendering policy information and capturing user interactions.
    *   **Content Management:** Policies and content are managed within the `content/` directory. The front-end reads and displays these structured markdown assets.

**Key Interactions:**
*   The client communicates with the `hmpps-auth-proxy`.
*   The proxy validates credentials and forwards requests to the `server/` API.
*   The API processes requests using business logic defined in `services/` and persists data.

### 💡 Development Tips
*   Always check the `Makefile` for the most up-to-date set of commands.
*   New features typically require changes across `assets/scss/`, `content/`, and adding new methods to `server/services/`.
*   When modifying API routes, remember that the `hmpps-auth-proxy` acts as the entry point and must be considered.