# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-03

### Added
- Initial release of `@ericnunes/frame-agent-server`
- Fastify HTTP server with CORS and rate limiting
- Worker Threads support for concurrent execution
- In-memory job queue with TTL and cleanup
- Health check endpoints (`/health`, `/ready`, `/live`)
- Graceful shutdown support
- TypeScript support with strict mode
- Comprehensive test suite

### Features
- `serveGraph()` function to start server with GraphEngine
- `POST /execute` endpoint for job submission
- `GET /jobs/:id` endpoint for job status
- Job queue with configurable size limits
- Automatic cleanup of completed jobs
- Structured logging with pino

[1.0.0]: https://github.com/ericnunes/frame-agent-server/releases/tag/v1.0.0
