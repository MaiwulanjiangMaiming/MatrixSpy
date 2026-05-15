# Changelog

All notable changes to MatrixSpy will be documented in this file.

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
