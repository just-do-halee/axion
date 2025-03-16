# AXION Project Guidelines

## Build/Test Commands

- Build: `bun run build`
- Typecheck: `bun run typecheck`
- Lint: `bun run lint`
- Format: `bun run format`
- Run all tests: `bun run test`
- Run all tests coverage: `bun run test:coverage`
- Run specific test: `npx jest path/to/test.test.ts`
- Run tests in watch mode: `bun run test:watch`
- Run performance tests: `bun run test:performance`

## Code Style Guidelines

- Use TypeScript strict mode with explicit typing
- Follow named exports pattern (not default exports)
- Use camelCase for variables/functions, PascalCase for types/interfaces
- Use abstract classes for base error types, extended for specific errors
- Document all functions and types with JSDoc comments
- Handle errors with factory functions and centralized error management
- Maintain immutability in all state operations
- Use descriptive variable names in English
- Prefer functional programming patterns with pure functions
- Organize files by domain (core, internals, utils, etc.)
- Include proper type guards and assertions
- Respect layered architecture (core->API->integration)
- Follow established patterns in the codebase for consistency
