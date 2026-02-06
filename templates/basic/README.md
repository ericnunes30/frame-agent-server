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

**Note:** The server will fail to start until you implement your graph in `src/graph.ts`.

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
│   ├── server.ts        # Server entry point (do not modify)
│   ├── config.ts        # Configuration (dotenv loaded here)
│   └── graph.ts         # Your graph definition (start here)
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

Add your own configuration variables to `src/config.ts` as needed.

## Creating Your Agent

1. Open `src/graph.ts`
2. Import the SDK: `npm install @ericnunes/frame-agent-sdk`
3. Define your graph using `createGraph()`
4. Export your graph as `export const graph`

See the comments in `src/graph.ts` for a basic example.

## License

MIT
