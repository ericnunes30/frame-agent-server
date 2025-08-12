# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Architecture

This is a full-stack project management application with separate backend and frontend applications:

- **Backend**: AdonisJS 6 REST API with PostgreSQL database (`/backend`)  
- **Frontend**: React + Vite SPA with TypeScript and Tailwind CSS (`/frontend`)

The backend manages users, projects, tasks, comments, occupations, roles, and recurring tasks with role-based permissions and activity logging.

## Development Commands

### Backend (AdonisJS)
```bash
cd backend
npm install
node ace serve --hmr        # Development server with hot reload
node ace build              # Build for production
node ace test               # Run tests
node ace migration:run      # Run database migrations
node ace db:seed            # Seed database with sample data
node ace scheduler:work     # Start recurring task scheduler
npm run lint               # ESLint
npm run format             # Prettier formatting
npm run typecheck          # TypeScript type checking
```

### Frontend (React/Vite)
```bash
cd frontend
npm install
npm run dev                # Development server (port 8080)
npm run build              # Production build
npm run build:dev          # Development build
npm run preview           # Preview production build
npm run lint              # ESLint
```

## Backend Architecture (AdonisJS)

### Core Structure
- **Controllers**: Handle HTTP requests (`app/controllers/`)
- **Models**: Lucid ORM models with relationships (`app/models/`)
- **Validators**: Vine.js validation schemas (`app/validators/`)
- **Middleware**: Authentication and request processing (`app/middleware/`)
- **Routes**: API routes definition (`start/routes.ts`)
- **Database**: Migrations and seeders (`database/`)

### Key Models & Relationships
- **User**: Many-to-many with Role, Project, Task; belongs to Occupation
- **Project**: Has many Tasks; many-to-many with User, Occupation  
- **Task**: Belongs to Project; many-to-many with User, Occupation; has many Comments
- **Comment**: Nested comments with likes; belongs to Task and User
- **RecurringTask**: Template for generating tasks on schedule
- **ActivityLog**: Tracks all task and comment changes automatically

### Database
- PostgreSQL with Lucid ORM
- Comprehensive migration system with consolidated initial schema
- Seeders populate sample data for development
- Activity logging tracks all entity changes

### Authentication
- JWT-based authentication via AdonisJS Auth
- Token stored in localStorage on frontend
- Protected routes require Bearer token

### Scheduling
- Uses `adonisjs-scheduler` for recurring tasks
- Different intervals for dev (10s) vs production (16h)
- Run with `node ace scheduler:work`

## Frontend Architecture (React/Vite)

### Core Structure
- **Pages**: Main application screens (`src/pages/`)
- **Components**: Reusable UI components (`src/components/`)
- **Services**: API communication layer (`src/services/backend/`)
- **Hooks**: Custom React hooks (`src/hooks/`)
- **Context**: React Context for auth state (`src/contexts/`)
- **Types**: TypeScript definitions (`src/common/types.ts`)

### UI Framework
- **shadcn/ui**: Component library with Radix UI primitives
- **Tailwind CSS**: Utility-first styling
- **TipTap**: Rich text editor for task descriptions
- **React Hook Form**: Form handling with Zod validation
- **TanStack Query**: Server state management and caching

### Key Features
- **Kanban Board**: Drag-and-drop task management with `@dnd-kit`
- **Task Timer**: Built-in time tracking functionality
- **Rich Comments**: Nested comments with mentions and likes
- **Role-based Permissions**: UI adapts based on user roles
- **Responsive Design**: Mobile-friendly interface

### State Management
- **React Context**: Authentication state
- **TanStack Query**: Server state and caching
- **React Hook Form**: Form state management
- **Local Storage**: Token persistence

### API Integration
- Axios HTTP client with interceptors for authentication
- Custom hooks abstract API calls with proper error handling
- Environment variable for backend URL (`VITE_BACKEND_API_URL`)

## Environment Setup

### Backend Environment Variables
Create `.env` in `/backend`:
```env
PORT=3333
HOST=0.0.0.0
LOG_LEVEL=info
APP_KEY=your-app-key-here
NODE_ENV=development
DB_CONNECTION=pg
PG_HOST=127.0.0.1
PG_PORT=5432
PG_USER=postgres
PG_PASSWORD=your-password
PG_DB_NAME=manager_team2
```

### Frontend Environment Variables
Create `.env` in `/frontend`:
```env
VITE_BACKEND_API_URL=http://localhost:3333
```

## Testing

### Backend Testing
- Uses Japa test framework with API client
- Unit and functional test suites configured
- Run tests with `node ace test`

### Database Migrations
- Always run migrations before development: `node ace migration:run`
- Recent migrations add task detailed fields and reviewer functionality
- Migrations handle task status enums and activity logging setup

## Key Conventions

### API Design
- RESTful API with consistent resource endpoints
- JSON request/response format with proper HTTP status codes
- Bearer token authentication for protected routes
- Comprehensive error handling and validation

### Code Style
- ESLint and Prettier configured for both backend and frontend
- TypeScript strict mode enabled
- Consistent import aliases (`#` for backend, `@` for frontend)
- Enum definitions for status and priority values

### Task Management Features
- Task status flow: pendente → a_fazer → em_andamento → em_revisao → concluido
- Priority levels: baixa, media, alta, urgente
- Timer tracking in seconds with automatic serialization
- Activity logging for all task changes and assignments
- Detailed task fields: video_url, useful_links, observations

### Comments System
- Hierarchical comments with parent-child relationships  
- Like/unlike functionality with automatic count updates
- User mentions support in comment content
- Activity logging for comment lifecycle events