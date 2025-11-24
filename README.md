# Simple Tools

<p align="center">
  <img src="src/assets/logo.svg" alt="Simple Tools Logo" width="120" />
</p>

<p align="center">
  A collection of simple, useful desktop tools built with <strong>Tauri</strong>, <strong>SolidJS</strong>, and <strong>TypeScript</strong>.
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#development">Development</a> •
  <a href="#testing">Testing</a> •
  <a href="#tech-stack">Tech Stack</a>
</p>

---

## Features

### 🔄 Batch File Renamer

A powerful tool for renaming multiple files at once with live preview.

- **Find & Replace** — Simple text-based search and replace
- **Regex Support** — Full regular expression support with capture groups
- **Live Preview** — See changes before applying them with diff highlighting
- **Collision Detection** — Automatically warns about duplicate filenames
- **Folder Selection** — Select entire folders to rename files recursively
- **Case Sensitivity** — Toggle case-sensitive matching
- **Dark/Light Theme** — Supports both dark and light modes

## Prerequisites

Before you begin, ensure you have the following installed:

- **[Bun](https://bun.sh/)** (v1.0+) — JavaScript runtime and package manager
- **[Rust](https://www.rust-lang.org/tools/install)** (v1.70+) — Required for Tauri backend
- **System Dependencies** — Platform-specific requirements for Tauri:

  **Linux (Debian/Ubuntu)**:

  ```bash
  sudo apt update
  sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
  ```

  **Fedora**:

  ```bash
  sudo dnf install webkit2gtk4.1-devel openssl-devel curl wget file libappindicator-gtk3-devel librsvg2-devel
  sudo dnf group install "C Development Tools and Libraries"
  ```

  **macOS**: Xcode Command Line Tools

  ```bash
  xcode-select --install
  ```

  **Windows**: [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)

## Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/yourusername/simple-tools.git
   cd simple-tools
   ```

2. **Install dependencies**:

   ```bash
   bun install
   ```

3. **Run the development server**:
   ```bash
   bun tauri dev
   ```

## Development

### Available Scripts

| Command             | Description                                   |
| ------------------- | --------------------------------------------- |
| `bun run dev`       | Start Vite development server (frontend only) |
| `bun tauri dev`     | Start full Tauri development environment      |
| `bun run build`     | Build frontend for production                 |
| `bun tauri build`   | Build complete application for distribution   |
| `bun run test`      | Run frontend tests with Vitest                |
| `bun run test:ui`   | Run tests with Vitest UI                      |
| `bun run test:rust` | Run Rust backend tests                        |
| `bun run test:all`  | Run all tests (frontend + backend)            |

### Project Structure

```
simple-tools/
├── src/                    # Frontend source code
│   ├── components/         # SolidJS components
│   │   ├── BatchRenamer/   # Batch file renamer feature
│   │   └── ui/             # Reusable UI components
│   ├── utils/              # Utility functions
│   └── assets/             # Static assets
├── src-tauri/              # Tauri backend (Rust)
│   └── src/
│       ├── lib.rs          # Core backend logic
│       └── main.rs         # Application entry point
├── docs/                   # Project documentation
│   ├── implementation-phases/
│   └── tests/
└── public/                 # Public static files
```

## Testing

This project maintains comprehensive test coverage for both frontend and backend.

### Frontend Testing

Uses [Vitest](https://vitest.dev/) with [@solidjs/testing-library](https://github.com/solidjs/solid-testing-library) for component testing.

```bash
# Run tests in watch mode
bun run test

# Run tests with UI
bun run test:ui

# Run tests once
bun run test -- --run
```

### Backend Testing

Uses Rust's built-in testing framework with [tempfile](https://docs.rs/tempfile/) for file system tests.

```bash
bun run test:rust
```

### Full Test Suite

```bash
bun run test:all
```

### Testing Stack

- **Test Runner**: Vitest
- **Component Testing**: @solidjs/testing-library
- **DOM Environment**: jsdom
- **Assertions**: @testing-library/jest-dom
- **Backend Testing**: Rust + tempfile

## Tech Stack

| Layer                  | Technology                                                                 |
| ---------------------- | -------------------------------------------------------------------------- |
| **Frontend Framework** | [SolidJS](https://www.solidjs.com/)                                        |
| **Desktop Framework**  | [Tauri 2.x](https://tauri.app/)                                            |
| **Language**           | TypeScript / Rust                                                          |
| **Build Tool**         | [Vite](https://vitejs.dev/)                                                |
| **Package Manager**    | [Bun](https://bun.sh/)                                                     |
| **Styling**            | [Tailwind CSS](https://tailwindcss.com/) + [DaisyUI](https://daisyui.com/) |

## Building for Production

To create a production build:

```bash
bun tauri build
```

This will generate platform-specific installers in `src-tauri/target/release/bundle/`:

- **Linux**: `.deb`, `.AppImage`
- **macOS**: `.dmg`, `.app`
- **Windows**: `.msi`, `.exe`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
