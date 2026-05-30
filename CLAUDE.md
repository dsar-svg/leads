# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development**: `npm run dev` (Starts `server.ts` via `tsx`, which integrates Vite middleware for the React frontend in dev mode)
- **Build**: `npm run build` (Builds the frontend via Vite and bundles the server into `dist/server.cjs` using esbuild)
- **Production Start**: `npm run start` (Runs the bundled server from `dist/server.cjs`)
- **Lint/Type Check**: `npm run lint` (Runs `tsc --noEmit`)
- **Clean**: `npm run clean` (Removes `dist` and `server.cjs`)

## Environment Setup

Copy `.env.example` to `.env` and fill in the required values:
- `DATABASE_URL`: MySQL connection string (e.g., `mysql://user:pass@host:port/db`)
- `GEMINI_API_KEY`: API key for Gemini AI (if applicable)
- `APP_URL`: The URL where the app is hosted (for self-referential links)

## Architecture & Structure

The project is a full-stack lead management application with a React frontend and a Node.js/Express backend.

### Frontend (React + Vite)
- **Core Logic**: Found in `src/`.
- **Components**: UI components are in `src/components/`, featuring a Kanban board implementation using `@dnd-kit` for drag-and-drop functionality.
- **API Client**: `src/api.ts` and `src/apiService.ts` handle communication with the backend.
- **Authentication**: Firebase is used for authentication, managed in `src/firebaseAuth.ts`.
- **Styling**: Tailwind CSS is used throughout the application.

### Backend (Node.js + Express)
- **Server**: `server.ts` is the main entry point. It provides a REST API for managing leads and sellers.
- **Database**: Uses `mysql2/promise` to interact with a MySQL database.
- **Deployment**: In production, the server serves static files from the `dist` directory.

### Data Model
- **Leads**: The primary entity, tracked through various statuses (e.g., 'NUEVO', 'CERRADO').
- **Sellers**: Entities assigned to leads.
- **Rotacion**: A table (`rotacion_caracas_y_carabobo`) used to track and update seller closure effectiveness (`efectividad_cierre`) whenever a lead is moved to a closed status.

### Key Flows
- **Lead Management**: Create, read, update, and delete leads via the `/api/leads` endpoints.
- **Status Updates**: Updating a lead's status to a closed state (e.g., 'CERRADO', 'CERRADO_VENTA', 'CERRADO_ABANDONADO') triggers an effectiveness calculation for the assigned seller in the `rotacion_caracas_y_carabobo` table.
- **Drag-and-Drop**: Kanban board columns are mapped to lead statuses; dragging a card triggers a status update via the API.

### API Endpoints (Reference)
- `GET /api/health` - Health check
- `GET /api/db-test` - Database connection test
- `GET /api/leads` - Retrieve all leads with seller information
- `POST /api/leads` - Create a new lead
- `PUT /api/leads/:id` - Update a lead (includes logic for status changes and seller effectiveness)
- `DELETE /api/leads/:id` - Delete a lead
- `GET /api/sellers` - Retrieve all sellers

## Notes
- The backend uses a MySQL database; ensure the database exists and the user has appropriate permissions.
- In development, the frontend is served by Vite middleware; in production, the built frontend is served by Express.
- When updating a lead to a closed status, the backend automatically updates the seller's effectiveness in the `rotacion_caracas_y_carabobo` table.