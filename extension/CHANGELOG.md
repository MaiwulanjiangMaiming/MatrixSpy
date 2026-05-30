# Changelog

All notable changes to MatrixSpy will be documented in this file.

## Versioning Convention

- **Bug fixes**: z + 1 (e.g., 1.2.1 → 1.2.2)
- **New features**: y + 1, z = 0 (e.g., 1.2.1 → 1.3.0)
- **Major updates**: x + 1, y = z = 0 (e.g., 1.x.x → 2.0.0)

## [1.3.7] - 2026-05-30

### Added

- TypeScript unit tests with Jest — 10 test cases covering NPY encoding, PNG encoding, and message type validation

## [1.3.6] - 2026-05-30

### Added

- Loading progress feedback for large files — Python daemon sends progress events (detecting format → parsing structure → loading variables → generating preview) and webview displays an animated progress bar with stage labels

## [1.3.5] - 2026-05-30

### Changed

- Typed `CustomEditorProvider.createMessageHandler` with `WebviewToExtension` discriminated union from `types/messages.ts`
- Typed `postMessage` calls with `ExtensionToWebview` union type for compile-time message safety

## [1.3.4] - 2026-05-30

### Added

- Python input validation with `dataclass` for daemon requests (`LoadFileRequest`, `LoadSliceRequest`) — invalid requests now return `VALIDATION_ERROR` code
- `MatParseError` exception class with error codes (`FILE_NOT_FOUND`, `DEPENDENCY_MISSING`, `MEMORY_LIMIT`, `INVALID_FORMAT`) for structured error handling

## [1.3.3] - 2026-05-30

### Changed

- Refactored `handleMessage()` into separate handler functions (`handleFileLoaded`, `handleSliceLoaded`, `handleShowVariable`, `handleError`) for better readability
- Added `types/messages.ts` with discriminated union type definitions for webview-extension communication

## [1.3.2] - 2026-05-30

### Fixed

- Fixed `require('zlib')` runtime imports in exportData.ts — moved to top-level `import * as zlib from 'zlib'`
- Added `enablement` condition to `refreshVariables` command — only enabled when a MAT file is active
- Replaced `var` with `const`/`let` in `buildLUT()` function for code consistency

## [1.3.1] - 2026-05-30

### Fixed

- Fixed version fallback in CustomEditorProvider from '1.2.1' to '1.3.1'
- Fixed canvas transform state (rotation/flip) not resetting when loading a new file
- Fixed Window/Level sliders not resetting to defaults when loading a new file

## [1.3.0] - 2026-05-24

### Added

- **9 new colormaps**: Hot, Jet, Turbo, Coolwarm, RdBu — in addition to existing Grayscale, Viridis, Inferno, Plasma. All precomputed as LUT for zero performance cost
- **Keyboard shortcuts**: Arrow keys / `[` `]` for slice navigation, `+` `-` `0` for zoom, `T`/`I` for view mode toggle, `C`/`Shift+C` for colormap cycling
- **Status bar integration**: Displays current file name, variable count, active variable name, shape, dtype, and memory usage in the VS Code status bar
- **Variable search & filter**: Search box in the sidebar with fuzzy name matching and `type:` prefix filtering (e.g., `type:struct`). Matching text is highlighted
- **Image enhancement controls**: Window/Level sliders for contrast stretching, rotate left/right buttons (90° increments), horizontal/vertical flip buttons
- **New export formats**: NumPy `.npy` (binary) and `.png` (grayscale image) export, in addition to existing CSV and JSON

### Changed

- Export commands now support 4 formats: CSV, JSON, NPY, PNG
- Sidebar tree items highlight matched search terms with `<mark>` styling

## [1.2.1] - 2026-05-15

### Architecture

- **Persistent Python Daemon**: Replaced per-request process spawning with a single persistent daemon process communicating via stdin/stdout JSON-RPC. Slice loading time reduced from ~500ms to ~20ms
- **Heartbeat mechanism**: 30s ping/pong keepalive with automatic daemon restart on crash
- **Graceful shutdown**: `dispose()` sends `shutdown` signal before process termination

### Security

- **Python injection prevention**: All IPC now uses stdin JSON-RPC instead of command-line arguments, eliminating shell injection risk
- **CSP nonce hardening**: Replaced `unsafe-inline` with per-request nonce-based Content Security Policy
- **Resource limits**: Added `MAX_ARRAY_ELEMENTS = 100,000,000` check to prevent memory exhaustion from malicious MAT files

### Features

- **Enhanced statistics panel**: Added percentiles (P5/P25/P50/P75/P95), NaN count, Inf count, sparsity ratio, and memory usage (MB)
- **VS Code native theme support**: Replaced all custom CSS variables with VS Code native CSS variables, ensuring correct appearance in all themes (dark/light/high contrast) without manual switching

### Engineering

- **Python unit tests**: 28 pytest tests covering v5 parsing, HDF5 parsing, NaN/Inf serialization, and daemon JSON-RPC communication
- **GitHub Actions CI**: Automated pipeline with Python 3.10/3.11/3.12 matrix, ruff linting, TypeScript compilation, and VSIX packaging
- **Python linting**: Added type annotations, ruff checks pass, removed unused variables
- **Daemon bug fix**: Changed `for line in stdin:` to `while True: line = stdin.readline()` — the iterator's read-ahead buffer blocks on pipes

### Removed

- Manual theme switching UI (Dark/Light/Auto buttons) — now uses VS Code native theme
- All hardcoded CSS color values — replaced with VS Code CSS variables
- `test_output.json` debug artifact deleted and added to `.gitignore`

## [1.2.0] - 2026-05-15

### Security

- Fixed XSS vulnerability: all user data (variable names, string values, struct field names) is now HTML-escaped before insertion into the DOM
- Added Content-Security-Policy (CSP) meta tag to the webview

### Fixed

- Fixed critical memory leak: `onDidReceiveMessage` was re-registered on every file retry
- Fixed export commands (CSV/JSON) not working in custom editor context
- Fixed infinite retry loop on timeout errors — now limited to 3 retries with exponential backoff
- Fixed missing `selectSidebarVariable` function causing click errors in the sidebar
- Fixed `refreshVariables` command not actually refreshing data
- Fixed `loadSlice` process leak: timeout now properly kills the Python subprocess
- Fixed GitHub link in webview not working due to CSP restrictions — now opens in external browser
- Fixed `simplify_cells=True` losing cell array structure — changed to `False`
- Fixed NaN/Inf values causing JSON serialization failures
- Fixed HDF5 large dataset stats loading entire array into memory — now uses sampling
- Fixed 4D+ tensors displaying raw JSON instead of proper visualization
- Fixed empty arrays showing blank content
- Fixed ESLint configuration with duplicate parserOptions/plugins entries

### Performance

- Canvas rendering now uses `requestAnimationFrame` instead of `setTimeout(..., 0)`
- Added `scheduleCanvasRender` with dirty flag to prevent duplicate renders
- Slice slider now debounced at 50ms to avoid excessive Python process spawning
- Sidebar tree preserves `expandedPaths` state across re-renders
- Image viewer now has `overflow: auto` with `max-height: 600px`
- HDF5 stats use sampling for datasets > 1M elements

### Added

- **Image zoom controls**: +/- buttons and 1:1 reset for tensor visualization
- **Adaptive image sizing**: small tensors auto-upscaled to min 200px, large tensors fit container
- **Zoom persistence**: zoom level is preserved when switching slices/axis/view mode
- **4D+ tensor support**: proper visualization for any dimensionality (not just 3D)
- **Cross-platform venv support**: Windows `Scripts/activate` vs Unix `bin/activate`
- **Python CLI argument validation**: `--help`, file existence checks, parameter completeness
- **Complete type definitions**: `SliceResult`, `WebviewMessage`, `WebviewResponse`, `ErrorCode`
- **Constants module**: `COMMANDS`, `CONFIG_KEYS`, `STORAGE_KEYS`, `DATA_TYPES`, `VIEW_MODES`
- **Retry utility**: `withRetry()` with exponential backoff support

### Changed

- Python process management: SIGTERM → 3s timeout → SIGKILL (was immediate SIGKILL)
- `PythonBridge` now implements `Disposable` with proper cleanup
- `errorHandler` completely rewritten with typed errors and retry logic
- `MatVariableTreeDataProvider` no longer relies on module-level mutable state
- `exportData` commands simplified — removed unused `pythonBridge` parameter
- Webview HTML uses `vscode.postMessage` + `vscode.env.openExternal` for external links
- CSS: `.app` flex direction unified to `row` (removed duplicate definition)

### Removed

- Deleted unused files: `mat_parser.py`, `scipy_parser.py`, `hdf5_parser.py`, `json_serializer.py`, `lazy_loader.py`, `mri_tools.py`, `fileHelper.ts`
- Removed unused npm dependency: `await-lock`
- Removed empty directories: `python/parsers/`, `python/serializers/`, `python/utils/`
- Removed all `console.log`/`console.warn`/`console.error` from production webview code

## [1.1.2] - 2026-04-24

### Fixed

- Fixed v7.3 (HDF5) MAT file parsing failure — now uses h5py directly instead of mat73
- Fixed NaN/Inf JSON serialization errors in edge case files
- Fixed HDF5 version detection for binary file headers
- Fixed `_get_stats` returning NaN values that broke JSON output

### Changed

- Modernized webview architecture with modular CSS/JS/HTML
- Removed redundant TreeDataProvider and unused webviewMessageHelper
- Added colormap support, histograms, and sparkline visualizations

## [1.1.1] - 2026-04-20

- Welcome page with dependency check
- Auto-detect Python and required packages
- Simplified project structure

## [1.1.0] - 2026-04-07

### Added

- Multi-level Tree Navigation: expandable/collapsible tree structure for nested structs
- Lazy Loading for 3D Tensors: on-demand slice loading for large arrays
- v7.3 MAT File Support: full HDF5 format support

### Fixed

- Fixed 3D tensor visualization showing black canvas
- Fixed HTML structure corruption due to duplicate `<script>` tags
- Fixed `acquireVsCodeApi()` not being initialized
- Fixed parsing errors for struct variables with mixed-type arrays
- Fixed `_get_stats` failing on non-numeric arrays
- Fixed empty data causing frontend crashes

### Performance

- Reduced initial load time and JSON payload size
- Slice loading optimized

## [1.0.1] - 2026-04-05

- Fixed configuration namespace from 'matViewer' to 'matrixspy'
- Updated terminology from 'MRI data' to 'image mat data'
- Improved extension description

## [1.0.0] - 2026-04-05

- Initial release
