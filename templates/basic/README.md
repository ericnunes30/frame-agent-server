# __PROJECT_NAME__

__PROJECT_NAME__ - Agent built with Frame Agent SDK

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0

### Installation

```bash
# Install dependencies
npm install
```

### Development

```bash
# Start development server with hot reload
npm run dev
```

### Production

```bash
# Build the project
npm run build

# Start production server
npm start
```

## Project Structure

```
__PROJECT_NAME__/
├── src/
│   ├── index.ts         # Main entry point
│   ├── graph.ts         # Graph definition
│   └── graph.factory.ts # Graph factory function
├── dist/                # Compiled output
├── package.json
├── tsconfig.json
└── .env.example
```

## Configuration

Copy `.env.example` to `.env` and configure the following:

- `PORT`: Server port (default: 3000)
- `HOST`: Server host (default: 0.0.0.0)
- `NODE_ENV`: Environment (development/production)
- `WORKERS`: Number of worker threads

## License

MIT
