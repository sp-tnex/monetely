# Monetely

Monetely is an expense-sharing application. It allows users to create groups, log expenses, split costs among members, view spending analytics, and settle balances.

## Tech Stack

### Frontend ([apps/web](apps/web))

- **Framework**: React 19, Vite, TypeScript
- **State Management & Querying**: Zustand, TanStack React Query, Axios
- **UI & Styling**: Tailwind CSS
- **Icons & Animation**: Lucide React, Framer Motion
- **Analytics**: Recharts (for charts and graphs)

### Backend ([apps/api](apps/api))

- **Runtime & Framework**: Node.js, Express, TypeScript, `tsx` (development runner)
- **Database & Caching**: MongoDB (Mongoose ODM), Redis (using `ioredis` for session caching/rate-limiting/queues)
- **Security & Middleware**: Helmet, HPP, Express Rate Limit, Express Mongo Sanitize, Cors, JSON Web Tokens (JWT), Cookie Parser, Bcryptjs
- **Logging**: Winston
- **Documentation**: Swagger UI (`swagger-jsdoc`, `swagger-ui-express`)
- **Testing**: Jest, Supertest, MongoDB Memory Server

### Shared Package ([packages/shared](packages/shared))

- **Validation**: Zod (defining common validation rules for endpoints, user registration, group creation, and expenses)

## Prerequisites

Before setting up the project locally, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v20+ or also works with v18)
- [npm](https://www.npmjs.com/) (v9 or higher)
- [Docker and Docker Compose](https://docs.docker.com/get-docker/) (optional, for containerized execution)

## Environment Setup

Both `apps/api` and `apps/web` require configuration files. Copy the example templates to create local env files:

```bash
# Set up backend env
cp apps/api/.env.example apps/api/.env

# Set up frontend env
cp apps/web/.env.example apps/web/.env
```

### Configuration Variables

## Running the Application

### Option A: Using Docker (Recommended)

To run the entire application along with MongoDB and Redis inside Docker containers:

1. Build and start the services:

   ```bash
   docker compose up --build
   ```

2. The services will be available at:
   - **Web Client**: `http://localhost:5173`
   - **API Server**: `http://localhost:5000`
   - **API Docs**: `http://localhost:5000/api-docs`

### Option B: Local Development Setup

To run the project on your host system:

1. **Install Dependencies**:
   Install all package and workspace dependencies at the root of the project:

   ```bash
   npm install
   ```

2. **Build Shared Packages**:
   Build `@monetely/shared` package first since both api and web workspaces depend on it:

   ```bash
   npm run build
   ```

3. **Run Services**:
   Ensure local MongoDB (port 27017) and Redis (port 6379) servers are running. Then, start both frontend and backend development servers concurrently:

   ```bash
   npm run dev
   ```

   Alternatively, run workspaces individually:
   - **Start Backend API only**:

     ```bash
     npm run dev:api
     ```

   - **Start Web Client only**:

     ```bash
     npm run dev:web
     ```

## Database Seeding

To populate the database with mock users, groups, expenses, settlements, and notifications:

```bash
npm run seed --workspace=api
```

This drops existing collections in your MongoDB instance and inserts sample data.

## Testing

The project uses Jest for API testing. To run the backend test suite:

```bash
npm run test --workspace=api
```

## API Documentation

When the API server is running, interactive Swagger API documentation is available at:

```text
http://localhost:5000/api-docs
```

This is generated dynamically from route annotations using `swagger-jsdoc` and `swagger-ui-express`.

## Available Scripts

Defined in the root [package.json](package.json):

- `npm run dev`: Runs development instances of both frontend and backend concurrently.
- `npm run dev:api`: Runs the backend Express app in watch mode using `tsx`.
- `npm run dev:web`: Runs the frontend React dev server using Vite.
- `npm run build`: Compiles all workspace packages and apps.
- `npm run lint`: Evaluates all codebases using ESLint.
