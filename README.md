# Simple Tools

A collection of simple, useful desktop tools built with Tauri, SolidJS, and TypeScript.

## Testing

This project uses [Vitest](https://vitest.dev/) for unit and integration testing, along with [@solidjs/testing-library](https://github.com/solidjs/solid-testing-library) for component testing.

### Running Tests

To run the test suite:

```bash
bun run test
```

To run tests with a UI interface:

```bash
bun run test:ui
```

### Testing Stack

- **Test Runner**: Vitest
- **Component Testing**: @solidjs/testing-library
- **DOM Environment**: jsdom
- **Assertions**: @testing-library/jest-dom
