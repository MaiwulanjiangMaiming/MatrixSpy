# Changelog

All notable changes to MatrixSpy will be documented in this file.

## Versioning Convention

- **Bug fixes**: z + 1 (e.g., 1.2.1 → 1.2.2)
- **New features**: y + 1, z = 0 (e.g., 1.2.1 → 1.3.0)
- **Major updates**: x + 1, y = z = 0 (e.g., 1.x.x → 2.0.0)

## [1.5.9] - 2026-06-28

### Changed

- **Unified webview state persistence** — all 26 `localStorage` reads/writes in the webview are migrated to `vscode.getState()` / `vscode.setState()` via `readState` / `persistState` helpers. `localStorage` is not scoped to the workspace and does not survive a panel dispose/reopen cycle; `vscode.setState` is the documented webview API for persisting state across hide/show. Persisted keys: `displayMode`, `viewMode`, `axis`, `slice`, `colormap`, `sidebarCollapsed`, `viewMode1D`, `theme`, plus the previously-migrated `showCount1D` / `showRows2D` / `showCols2D`.
- **Single colormap constant** — the built-in colormap name list existed twice (`BUILTIN_COLORMAP_NAMES` and `COLORMAP_LIST`) with identical contents. `COLORMAP_LIST` is removed; `getNextColormap` now cycles through `BUILTIN_COLORMAP_NAMES`. The duplicated `<option>` HTML in `render2DArray` and `renderNDArray` is extracted into a single `renderColormapOptions()` helper (built-in labels via `COLORMAP_LABELS` + custom colormaps from `COLORMAPS`).

### Fixed

- **Focus loss on control interaction** — `refreshPreview` now saves the active element's id and selection range before re-rendering and restores focus afterward. Previously, changing colormap / view mode / slice in table mode rebuilt the entire `mainContent.innerHTML`, dropping focus from the slider or select the user was still interacting with.

## [1.5.8] - 2026-06-28

### Changed

- **Daemon thread pool** — `daemon_main` now dispatches `load_file` / `load_slice` / `export_*` / `compare_files` to a `ThreadPoolExecutor` (4 workers) instead of processing sequentially. A long-running parse on one file no longer blocks a slice request for another. `HighPerfMatParser` is stateless (each call opens its own file), so concurrent access is safe. stdout writes are serialized by a `threading.Lock` so response lines never interleave. `ping` / `shutdown` stay on the main thread for immediacy.
- **Large-array statistics sampling** — arrays with >10M elements now use a deterministic 1M-element random sample (fixed seed for reproducibility) instead of computing exact `nanpercentile` / `nanstd` on the full array. This reduces blocking time from seconds to milliseconds for very large arrays. `memory_mb` stays exact (it's just `nbytes`). The result includes `note: 'Estimated from sample'` so the UI can indicate the estimate.
- **Sparsity without temporary array** — `_get_stats` now computes sparsity as `(arr.size - np.count_nonzero(arr)) / arr.size` instead of `np.count_nonzero(arr == 0) / arr.size`. This avoids materializing a temporary boolean array the same size as the input, halving peak memory for sparsity computation on large arrays.

### Fixed

- **Stale test assertions** — `test_serializer.py` expected NaN/Inf to be serialized as `None`, but the serializer returns `"NaN"` / `"Inf"` / `"-Inf"` strings (since v1.5.6). Tests updated to match actual behavior.
- **Daemon tests missed ready handshake** — `test_daemon.py` fixtures now consume the `{"action":"ready"}` handshake before yielding, and `read_result` skips progress messages to reach the final response. Previously the first `read_response` captured the ready signal and failed with `KeyError: 'success'`.

### Added

- **Statistics test suite** — `tests/unit/python/test_stats.py` with 12 tests covering sparsity correctness (all-zero, all-nonzero, mixed, integer, NaN handling), sampling path threshold, reproducibility, accuracy tolerance, complex arrays, and JSON serializability.

## [1.5.7] - 2026-06-28

### Changed

- **Per-requestId progress routing** — `PythonBridge` now keys progress callbacks by `requestId` in a `Map` instead of a single `onProgressCallback` field. Concurrent `load_file` calls (e.g. opening two MAT files at once) no longer deliver each other's progress events to the wrong webview. The public `setProgressCallback` method is removed; `parseFile` now accepts an optional `progressCallback` parameter.
- **Idle-only heartbeat** — the 30s heartbeat now skips its ping when there are pending requests, so a daemon busy parsing a large file is no longer killed by a false 5s heartbeat timeout. The request's own timeout is the liveness proof while busy; the ping only runs when the daemon is idle.
- **Dynamic request timeout** — `load_file` timeout is now `60s + 2s/MB` (capped at 300s) based on file size, instead of a flat 60s. `load_slice` uses 30s. This prevents false timeouts on large v7.3 files while keeping fast failure for stuck slice requests.
- **Safe stdout buffer truncation** — when the stdout buffer exceeds 64MB it now keeps the tail after the last newline (preserving the most recent in-progress response) instead of clearing everything, which previously caused large `load_file` responses to be lost mid-stream.
- **Tab switch refreshes sidebar & status bar** — `onDidChangeViewState` now restores the variable tree and status bar from `fileDataCache` for the newly-active file, so switching tabs no longer leaves the sidebar showing the previous file's variables.
- **Single-source tree data** — `MatVariableTreeDataProvider` no longer keeps a module-level `currentData` shadowing its instance `this.data`. The `setCurrentData` export is removed; `updateTreeData` now calls `setData` directly. This eliminates the state-inconsistency risk where `setData` updated the instance but `setCurrentData` updated the module global.

## [1.5.6] - 2026-06-28

### Fixed

- **Status bar memory display** — `varInfo.memory_mb` was always `null` because the webview read `value.stats` while the Python backend returns the field as `value.statistics`. Now checks both names so memory usage shows correctly in the status bar.
- **Wrong config key in error hint** — the "file too large" error suggested increasing `matrixspy.maxArrayElements`, which does not exist. Corrected to `matrixspy.maxFileSizeMB`.
- **Mypy CI bypass** — removed `|| true` from the mypy step so type-check failures actually block CI.

### Changed

- **True LRU slice cache** — `sliceCache` rewritten from a plain object (FIFO eviction) to a `Map` with delete-and-re-insert on access, so frequently viewed slices survive eviction instead of being dropped in insertion order.
- **Windows Python interpreter fallback** — `checkDependencies` now tries the configured path, then platform-appropriate candidates (`python`, `py`, `python3` on Windows; `python3`, `python` elsewhere). The `PythonBridge.pythonPath` getter also maps the default `python3` to `python` on Windows so the daemon starts with the right interpreter. This eliminates the misleading "Python not found" error for Windows users who never touched the setting.
- **CI runs tests and lint** — the `typescript-compile` job now executes `npm run lint` and `npm test` in addition to `tsc`, so regressions are caught before packaging.
- **Tighter `.vscodeignore`** — excludes `tsconfig.eslint.json`, `jest.config.js`, `webview-dist/**`, and `__tests__/**` from the packaged VSIX to reduce extension size.

### Added

- **Web Worker cleanup on unload** — the render Worker is now `terminate()`d on `window.unload`, preventing Worker leaks when MAT file panels are repeatedly opened and closed with `retainContextWhenHidden: false`.

## [1.5.5] - 2026-06-22

### Security

- **CSP nonce for Setup Wizard and Compare Panel webviews** — prevents XSS attacks from injected scripts/styles.
- **Hardened shell argument quoting** — platform-specific quoting (POSIX vs cmd.exe) that rejects embedded metacharacters to prevent command injection.

### Correctness

- **PythonBridge config hot-reload** — `pythonPath` now read from config on each call; daemon auto-restarts when interpreter changes.
- **Multi-editor message listeners** — `CustomEditorProvider` now uses `Map<filePath, Disposable>` so each open MAT file keeps its own listener; fixes multi-tab slice loading.
- **exportAll sentinel detection** — uses `exportAll === true` instead of fragile label string matching.
- **New `maxFileSizeMB` setting** — range 1–4096 MB; `maxDataSize` deprecated with migration message.
- **Deprecate `enableImage`** — setting never read by code; marked deprecated to avoid user confusion.

### UX

- **Status bar command dynamic switching** — opens file when environment ready, Setup Wizard when not.
- **Keybinding conflict avoidance** — changed from `Cmd/Ctrl+Shift+E/D/R/M` to `Cmd/Ctrl+Alt+E/D/R/M`.
- **Command palette coverage** — `openRecent`, `compareFiles`, etc. now appear in command palette menu.
- **Export format memory** — placeholder shows last-used format hint after first export.
- **Webview toolbar Export button** — 📤 button in header triggers unified export flow.
- **Setup Wizard auto-test** — environment auto-tested after install terminal closes; status updates automatically.

### i18n

- **Localized generateCode, compareFiles, walkthroughCommands, Setup Wizard** — all user-facing strings now use `localize()`.

### Cleanup

- **Non-blocking activation** — `checkAndShowWelcome` runs fire-and-forget; Python check no longer delays command/view availability.
- **Removed dead code** — 6 unused per-format export functions, 6 dead NLS entries, 2 unused `WebviewMessage`/`WebviewResponse` types.
- **Fixed CHANGELOG telemetry default** — corrected "default: enabled" to "default: disabled".
- **Fixed walkthrough keybinding reference** — updated from `Shift+E` to `Alt+E`.

## [1.5.4] - 2026-06-08

### Added

- **Recent files history**: `MatrixSpy: Open Recent MAT File` command shows last 10 opened files.
- **Full-size interactive histogram**: Expand Histogram button opens SVG histogram with adjustable bins, log Y axis, hover tooltips, and median line.
- **Mini histogram SVG rewrite**: Distribution preview now uses SVG instead of Canvas for crisp Retina rendering.

### Fixed

- **Histogram blur**: Both mini and full histograms rewritten from Canvas to SVG for sharp rendering on all displays.
- **Expand Histogram button**: Fixed `state.currentStats` not being stored, causing the button to do nothing.

## [1.5.3] - 2026-06-08

### Added

- **Matrix value search**: click 🔍 in toolbar to search by condition (`> 1e6`, `== NaN`, `< 0`, `Inf`, etc.). Matches are highlighted on heatmap (yellow dots) and table (yellow cells).
- **Global keybindings**: `Cmd/Ctrl+Shift+M` open file, `Cmd/Ctrl+Shift+E` export CSV, `Cmd/Ctrl+Shift+R` refresh, `Cmd/Ctrl+Shift+D` compare files.

## [1.5.2] - 2026-06-08

### Added

- **Heatmap pixel tooltip**: hover over any pixel in the heatmap to see row, column, and value. NaN/Inf/complex values are properly displayed.
- **Right-click copy menu (Table)**: copy cell value, current row, current column, or entire table as CSV.
- **Right-click copy menu (Heatmap)**: copy pixel value or position with value.

## [1.5.1] - 2026-06-05

### Changed

- **1D Chart: SVG rewrite** — replaced Canvas-based line chart with SVG rendering. The chart is now vector-based, auto-adapts to any DPI, and visually integrates with the VS Code webview. Added gradient area fill, dashed grid lines, and hover tooltip.
- **Theme switching** — added Light / Dark / Auto theme buttons in the Settings panel (below Version info). Switching themes smoothly transitions all UI colors with 0.4s cubic-bezier animation. Theme buttons feature hover lift, active glow, and icon pop animations.

## [1.5.0] - 2026-06-03

### Added

- **MAT File Diff/Compare** — new `matrixspy.compareFiles` command (right-click a .mat file → "Compare with...") to compare two .mat files side by side. Shows variable-level additions, deletions, modifications, and unchanged entries. For modified numeric arrays, computes the difference matrix (second − first) and renders it with an RdBu diverging colormap. Diff statistics (min, max, mean, std, abs mean) are displayed alongside the visual diff.
- **i18n Internationalization** — added multi-language support using `vscode-nls`. All command titles and configuration descriptions in `package.json` now use `%key%` references resolved via `package.nls.json` (English) and `package.nls.zh-cn.json` (Chinese). User-facing messages in `extension.ts`, `exportData.ts`, and `CustomEditorProvider.ts` are localized through `vscode-nls` message bundles.

## [1.4.2] - 2026-06-03

### Added

- Optional anonymous telemetry — uses `@vscode/extension-telemetry` to send anonymized usage events (file loaded, variable selected, export completed, errors). Controlled by the `matrixspy.enableTelemetry` setting (default: disabled). No data is sent unless the user explicitly opts in.
- Centralized state management Store — new `MatViewerStore` class wraps webview state with `get`/`set`/`subscribe`/`snapshot`/`undo`/`redo`/`persist`/`restore` methods. State is persisted via `vscode.setState()` and automatically synced with the existing `state` object.
- Undo/Redo keyboard shortcuts — `Ctrl+Z` / `Cmd+Z` to undo, `Ctrl+Shift+Z` / `Cmd+Shift+Z` to redo view state changes (display mode, colormap, axis, variable selection). Up to 50 history entries.

## [1.4.1] - 2026-06-03

### Added

- Web Worker canvas rendering — moves heavy colormap LUT application and pixel computation to an inline Web Worker (Blob URL) for matrices with >500K elements, keeping the main thread responsive. Falls back to main-thread rendering if Worker creation fails.
- ROI Selection Measurement — new ROI button (⬚) in the image toolbar toggles region-of-interest mode. Drag on the canvas to draw a selection rectangle; on release, a floating stats panel shows Mean, Std, Min, Max, and Count for the selected region. Press Escape or click the ROI button again to dismiss.

## [1.4.0] - 2026-06-03

### Added

- 1D Line Chart View — new Canvas 2D line chart for 1D arrays with X/Y axes, grid lines, mouse hover tooltip, zoom (scroll wheel), and pan (drag). Toggle between Grid and Chart views via tabs.
- Table Virtual Scrolling — virtual scrolling for 2D and 3D tables with >200 rows, rendering only visible rows ± buffer for smooth performance on large matrices. Fixed header row preserved.
- Breadcrumb Navigation — breadcrumb path bar shown at top when navigating into nested structs. Each segment is clickable to navigate back.

## [1.3.19] - 2026-06-01

### Added

- Generate Python Code command — select a variable and generate a ready-to-run Python script with `scipy.io.loadmat` + `matplotlib` visualization code, opened in a new editor tab

## [1.3.18] - 2026-06-01

### Added

- Excel (.xlsx) export command — export any variable to Excel format via `matrixspy.exportXLSX` command (requires `openpyxl` Python package; shows install prompt if missing)

## [1.3.17] - 2026-05-30

### Fixed

- Critical bug: `builtInNames` variable was undefined in `renderNDArray`, causing 3D+ tensor views to crash — now extracted as global `BUILTIN_COLORMAP_NAMES`
- Critical bug: `_process_value(None)` returned string `"None"` instead of `null`, causing v7.3 HDF5 struct fields to display as "None" — now returns `null` so h5py fallback can correctly fill the data

### Changed

- Improved mini-histogram: bars now use colormap colors instead of confusing percentile lines; only median line shown as dashed; added "Distribution" title and min/max axis labels
- Improved colorbar: cleaner border style, wider label area
- Removed ROI selection feature (not essential)

## [1.3.16] - 2026-05-30

### Added

- Custom colormap support — define your own colormaps in VS Code settings (`matrixspy.customColormaps`) as key-point arrays; they appear in the colormap selector alongside built-in options
- Fixed duplicate colormap options in the selector dropdown

## [1.3.15] - 2026-05-30

### Added

- Direction-aware slice prefetching — detects forward/backward scroll direction and prefetches 3 slices in the scroll direction + 1 in the opposite direction, improving cache hit rate during sequential browsing
- Contributing guide (`.github/CONTRIBUTING.md`) and GitHub Issue templates (bug report + feature request)

## [1.3.14] - 2026-05-30

### Added

- Slice drag real-time refresh — removed debounce for arrays with data (instant rendering), added LRU slice cache (10 entries) and prefetch mechanism (±2 adjacent slices) for large files without data
- HDF5 export command — export any variable to HDF5 format with gzip compression via `matrixspy.exportHDF5` command

## [1.3.13] - 2026-05-30

### Added

- Colorbar display next to image canvas — shows colormap gradient with min/max/mid value labels
- Mini histogram in statistics panel — estimated distribution from percentile data with percentile markers

## [1.3.12] - 2026-05-30

### Added

- ARIA accessibility attributes for sidebar tree (`role="tree"`, `role="treeitem"`, `aria-expanded`), canvas (`role="img"`), range inputs (`aria-label`), and toolbar buttons
- Actionable error hints in webview — when Python is missing, packages are not installed, or file is too large, the error message now includes specific fix instructions

## [1.3.11] - 2026-05-30

### Fixed

- Fixed v7.3 nested HDF5 groups showing "None" for child datasets — added recursive `_fill_none_from_hdf5` / `_fill_none_in_struct` to replace all None values with h5py direct reads
- Fixed content still not being copyable in webview — changed to `user-select: text` on `.main-content *` with exclusions for canvas/buttons

## [1.3.10] - 2026-05-30

### Fixed

- Fixed v7.3 HDF5 files with non-standard MATLAB types (float32, int64, etc.) showing "None" — now falls back to h5py direct read when mat73 returns None
- Fixed webview content not being selectable/copyable — added `user-select: text` to main content area

## [1.3.9] - 2026-05-30

### Added

- CI auto-publish to Open VSX on push to main branch (requires `OPEN_VSX_TOKEN` secret in GitHub repo settings)

## [1.3.8] - 2026-05-30

### Fixed

- Fixed 4D+ tensor images not rendering — replaced `get3DSlice` with `getNDSlice` that supports arbitrary dimensionality via recursive slice extraction and automatic flattening to 2D
- Removed axis selector limit of 4 — all dimensions are now visible in the dropdown

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
