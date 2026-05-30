# Contributing to MatrixSpy

Thank you for your interest in contributing to MatrixSpy! This guide will help you get started.

## Development Environment

### Prerequisites

- Node.js >= 18.x
- Python >= 3.8
- VS Code

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/MaiwulanjiangMaiming/MatrixSpy.git
   cd MatrixSpy
   ```

2. Install dependencies:
   ```bash
   cd extension
   npm install
   pip install scipy numpy h5py mat73
   ```

3. Press `F5` in VS Code to launch the Extension Development Host for debugging.

### Build

```bash
npm run compile
```

### Test

```bash
npm test
```

### Package

```bash
npx vsce package
```

## Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `perf:` Performance improvement
- `docs:` Documentation change
- `refactor:` Code refactoring
- `test:` Test addition or modification
- `chore:` Build or tooling change

## Pull Request Process

1. Fork the repository and create a feature branch
2. Make your changes with clear commit messages
3. Ensure `npm run compile` passes without errors
4. Submit a pull request with a description of the changes

## Code Style

- TypeScript: Follow existing patterns in the codebase
- Python: Follow PEP 8, use type annotations
- No unnecessary comments — keep code self-documenting
