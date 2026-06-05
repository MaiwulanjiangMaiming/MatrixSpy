# MatrixSpy

<p align="center">
  <img src="https://raw.githubusercontent.com/MaiwulanjiangMaiming/MatrixSpy/main/extension/resources/Plugin.png" alt="MatrixSpy Logo" width="200"/>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=MaiwulanjiangMaiming.matrixspy">
    <img src="https://img.shields.io/badge/VS%20Code-Marketplace-blue?logo=visual-studio-code" alt="VS Code Marketplace"/>
  </a>
  <a href="https://open-vsx.org/extension/maiwulanjiangmaiming/matrixspy">
    <img src="https://img.shields.io/open-vsx/v/maiwulanjiangmaiming/matrixspy?label=Open%20VSX&style=flat&color=2C2255" alt="Open VSX Version"/>
  </a>
</p>

<p align="center">
  <a href="#中文">中文</a> | <a href="#english">English</a>
</p>

---

<h2 id="中文">MatrixSpy</h2>

一个强大的 VS Code 扩展，用于浏览、可视化和导出 MATLAB `.mat` 文件。支持所有 MAT 版本（v4–v7.3），交互式张量可视化与缩放控制，以及导出为 CSV/JSON/NumPy/PNG 格式。

> 💡 我是个人开发者，纯靠兴趣维护这个项目。如果 MatrixSpy 对你有帮助，希望能动动发财的小手点个 ⭐ Star，这是对我最大的鼓励，谢谢！

## 功能特性

- **全版本 MAT 文件支持**：v4、v5、v6、v7、v7.3（HDF5）
- **交互式张量可视化**：
  - 1D 数组：带迷你折线图的网格视图
  - 2D 矩阵：热图或表格视图
  - 3D/4D+ 张量：切片查看器与缩放控制
  - 复数：幅值 / 相位 / 实部 / 虚部
- **9 种配色方案**：Grayscale、Viridis、Inferno、Plasma、Hot、Jet、Turbo、Coolwarm、RdBu（还支持通过设置自定义配色）
- **键盘快捷键**：方向键切换切片、+/- 缩放、T/I 切换视图、C 切换配色
- **图像增强**：Window/Level 对比度调节、旋转、水平/垂直翻转
- **变量搜索与过滤**：侧边栏搜索框，支持 `type:` 前缀按类型过滤
- **状态栏**：显示文件名、变量数量、当前变量的维度/数据类型/内存占用
- **缩放控制**：+/- 按钮、1:1 重置、自适应大小
- **缩放持久化**：切换切片/轴/视图模式时保持缩放级别
- **树形视图**：变量导航，支持展开结构体
- **懒加载**：大型 3D 张量和 HDF5 数据集按需加载
- **数据导出**：CSV、JSON、NumPy NPY、PNG 图像、HDF5
- **安装向导**：自动检测依赖并引导安装

## 前置要求

**Python 3.8+** 及以下依赖：

```bash
pip install scipy numpy h5py mat73
```

扩展会在首次启动时检查依赖并引导你完成安装。

## 使用方法

### 打开 MAT 文件

1. 在资源管理器中**双击** `.mat` 文件
2. **右键点击** `.mat` 文件 → "Open MAT File"
3. 命令面板（`Cmd+Shift+P`）→ "MatrixSpy: Open MAT File"

### 导航

- **侧边栏**：浏览所有变量，展开结构体，点击查看
- **搜索框**：按名称或类型过滤变量（如 `type:struct`）
- **树形项**：展开/折叠嵌套结构

### 可视化

| 数据类型 | 可视化方式 |
|---------|-----------|
| 标量 | 大号数字显示 |
| 1D 数组 | 网格视图 + 侧边栏迷你折线图 |
| 2D 矩阵 | 热图（Image）或表格（Table） |
| 3D+ 张量 | 切片查看器，支持轴/切片控制 |
| 复数 | 幅值 / 相位 / 实部 / 虚部模式 |
| 结构体 | 可展开的字段树 |

### 图像模式控制

在 Image 模式下查看张量时：

- **+ / -**：放大/缩小（每次 1.5 倍）
- **1:1**：重置为自适应大小
- **Window/Level**：通过滑块调节对比度范围
- **旋转**：↺ / ↻ 按钮（90° 步进）
- **翻转**：⇄ 水平 / ⇅ 垂直
- **缩放持久化**：切换切片时保持缩放级别
- **自适应大小**：小张量自动放大，大张量适应容器

### 键盘快捷键

| 按键 | 操作 |
|-----|------|
| `←` / `[` | 上一个切片 |
| `→` / `]` | 下一个切片 |
| `+` / `=` | 放大 |
| `-` / `_` | 缩小 |
| `0` | 重置缩放 |
| `T` | 切换 图像/表格 视图 |
| `I` | 切换到图像视图 |
| `C` | 下一个配色方案 |
| `Shift+C` | 上一个配色方案 |

### 导出

- 命令面板 → "MatrixSpy: Export to CSV" / "Export to JSON" / "Export to NumPy" / "Export to PNG" / "Export to HDF5"

## 配置

```json
{
  "matrixspy.pythonPath": "python3",
  "matrixspy.maxDataSize": 10000
}
```

## 更新日志

完整版本历史请查看 [CHANGELOG.md](CHANGELOG.md)。

### v1.5.0 亮点 (2026-06-03)

- **MAT 文件差异对比**：对比两个 .mat 文件的变量差异
- **国际化 (i18n)**：支持中文界面

### v1.4.0 亮点 (2026-06-02)

- **1D 折线图视图**：1D 数组可视化折线图
- **Table 虚拟滚动**：大数据表格流畅滚动
- **面包屑导航**：结构体字段路径导航

### v1.3.0 亮点 (2026-05-24)

- **9 种配色方案**：新增 Hot、Jet、Turbo、Coolwarm、RdBu
- **键盘快捷键**：常用操作快捷键
- **状态栏**：显示当前文件和变量信息
- **变量搜索与过滤**：侧边栏搜索
- **图像增强**：Window/Level、旋转、翻转
- **新导出格式**：NumPy NPY 和 PNG 图像

### v1.2.0 亮点 (2026-05-15)

- **持久化 Python 守护进程**：切片加载速度提升约 25 倍
- **安全**：CSP nonce、Python 注入防护
- **增强统计信息**：百分位数、NaN/Inf、稀疏度、内存占用

## 许可证

MIT License

## 联系方式

功能请求或 Bug 报告：[GitHub Issues](https://github.com/MaiwulanjiangMaiming/MatrixSpy/issues)

---

**祝你查看 MAT 文件愉快！**

---

<h2 id="english">MatrixSpy</h2>

A powerful VS Code extension for exploring, visualizing, and exporting MATLAB `.mat` files. Supports all MAT versions (v4–v7.3), interactive tensor visualization with zoom controls, and export to CSV/JSON/NumPy/PNG.

> 💡 I'm a solo developer building this out of passion in my spare time. If MatrixSpy helps your workflow, a ⭐ star on GitHub would mean a lot — it keeps the project going. Thank you!

## Features

- **All MAT file versions**: v4, v5, v6, v7, v7.3 (HDF5)
- **Interactive tensor visualization**:
  - 1D arrays with sparkline previews
  - 2D matrices as heatmaps or tables
  - 3D/4D+ tensors with slice viewer and zoom controls
  - Complex numbers: Magnitude / Phase / Real / Imag
- **9 Colormaps**: Grayscale, Viridis, Inferno, Plasma, Hot, Jet, Turbo, Coolwarm, RdBu (+ custom colormaps via settings)
- **Keyboard shortcuts**: Arrow keys for slices, +/- for zoom, T/I for view mode, C for colormap
- **Image enhancement**: Window/Level contrast, rotate, flip horizontal/vertical
- **Variable search & filter**: Search box in sidebar with type: prefix filtering
- **Status bar**: Shows file name, variable count, active variable shape/dtype/memory
- **Zoom controls** for image mode: +/- buttons, 1:1 reset, adaptive sizing
- **Zoom persistence**: zoom level kept when switching slices/axis/view mode
- **Tree view** for variable navigation with expandable structs
- **Lazy loading** for large 3D tensors and HDF5 datasets
- **Export**: CSV, JSON, NumPy NPY, PNG Image, HDF5
- **Setup wizard** with automatic dependency detection

## Prerequisites

**Python 3.8+** with:

```bash
pip install scipy numpy h5py mat73
```

The extension checks dependencies on first launch and guides you through installation.

## Usage

### Opening MAT Files

1. **Double-click** a `.mat` file in Explorer
2. **Right-click** a `.mat` file → "Open MAT File"
3. Command Palette (`Cmd+Shift+P`) → "MatrixSpy: Open MAT File"

### Navigation

- **Sidebar**: Browse all variables, expand structs, click to view
- **Search box**: Filter variables by name or type (e.g., `type:struct`)
- **Tree items**: Expand/collapse nested structures

### Visualization

| Data Type | Visualization |
|-----------|---------------|
| Scalar | Large number display |
| 1D array | Grid with sparkline in sidebar |
| 2D matrix | Heatmap (Image) or table (Table) |
| 3D+ tensor | Slice viewer with axis/slice controls |
| Complex | Magnitude / Phase / Real / Imag modes |
| Struct | Expandable field tree |

### Image Mode Controls

When viewing tensors in Image mode:

- **+ / -**: Zoom in/out (1.5x per click)
- **1:1**: Reset to adaptive size
- **Window/Level**: Adjust contrast range with sliders
- **Rotate**: ↺ / ↻ buttons (90° increments)
- **Flip**: ⇄ horizontal / ⇅ vertical
- **Zoom persistence**: zoom level is kept when switching slices
- **Adaptive sizing**: small tensors auto-upscaled, large tensors fit container

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `←` / `[` | Previous slice |
| `→` / `]` | Next slice |
| `+` / `=` | Zoom in |
| `-` / `_` | Zoom out |
| `0` | Reset zoom |
| `T` | Toggle Image/Table view |
| `I` | Switch to Image view |
| `C` | Next colormap |
| `Shift+C` | Previous colormap |

### Export

- Command Palette → "MatrixSpy: Export to CSV" / "Export to JSON" / "Export to NumPy" / "Export to PNG" / "Export to HDF5"

## Configuration

```json
{
  "matrixspy.pythonPath": "python3",
  "matrixspy.maxDataSize": 10000
}
```

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for full version history.

### v1.5.0 Highlights (2026-06-03)

- **MAT file diff/compare**: Compare variables between two .mat files
- **i18n**: Chinese language support

### v1.4.0 Highlights (2026-06-02)

- **1D line chart view**: Line chart visualization for 1D arrays
- **Table virtual scrolling**: Smooth scrolling for large data tables
- **Breadcrumb navigation**: Struct field path navigation

### v1.3.0 Highlights (2026-05-24)

- **9 Colormaps**: Hot, Jet, Turbo, Coolwarm, RdBu added
- **Keyboard shortcuts** for all common operations
- **Status bar** showing active file and variable info
- **Variable search & filter** in sidebar
- **Image enhancement**: Window/Level, rotate, flip
- **New exports**: NumPy NPY and PNG image formats

### v1.2.0 Highlights (2026-05-15)

- **Persistent Python Daemon**: ~25x faster slice loading
- **Security**: CSP nonce, Python injection prevention
- **Enhanced statistics**: percentiles, NaN/Inf, sparsity, memory

## License

MIT License

## Contact

For feature requests or bug reports: [GitHub Issues](https://github.com/MaiwulanjiangMaiming/MatrixSpy/issues)

---

**Enjoy viewing your MAT files!**
