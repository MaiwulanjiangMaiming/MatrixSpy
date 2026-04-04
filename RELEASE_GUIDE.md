# MatrixSpy 发布指南

## ✅ 已完成

插件已成功打包！文件位置：
```
/Users/rock/Interesting_Projects/mat-file-viewer/extension/matrixspy-1.0.0.vsix
```

---

## 🚀 下一步：发布到 GitHub Releases

### 第一步：确保本地代码已推送到 GitHub

```bash
cd /Users/rock/Interesting_Projects/mat-file-viewer
git add .
git commit -m "v1.0.0 release"
git push
```

### 第二步：在 GitHub 上创建 Release

1. 访问：https://github.com/MaiwulanjiangMaiming/MatrixSpy
2. 点击右侧的 **Releases**
3. 点击 **Draft a new release**
4. 填写：
   - **Tag version**: `v1.0.0`
   - **Release title**: `MatrixSpy v1.0.0`
   - **Describe this release**: （使用下方的 Release Notes）
5. 点击 **Attach binaries**，上传：
   - `matrixspy-1.0.0.vsix`（从 extension 文件夹中）
6. 点击 **Publish release**

---

## 🚀 发布到 Open VSX

### 第一步：安装 ovsx 工具

```bash
npm install -g ovsx
```

### 第二步：在 Open VSX 上创建账号

1. 访问：https://open-vsx.org/
2. 点击右上角 **Sign in**
3. 使用 GitHub 账号登录
4. 点击用户名 → **Settings** → **Access Tokens**
5. 点击 **Generate New Token**
6. 复制保存这个 token

### 第三步：创建发布者

1. 访问：https://open-vsx.org/-/user-settings/publishers
2. 点击 **New Publisher**
3. 填写：
   - **Namespace**: `maiwulanjiangmaiming`
   - **Display Name**: `Maiwulanjiang Maiming`
4. 点击 **Create**

### 第四步：发布插件

```bash
cd /Users/rock/Interesting_Projects/mat-file-viewer/extension
ovsx publish -p <your_openvsx_token>
```

---

## 📝 Release Notes (GitHub)

```markdown
# MatrixSpy v1.0.0

A powerful VS Code extension for exploring, visualizing, and exporting MATLAB .mat files with beautiful matrix visualization.

## Features

### ✅ Core Features
- **Full MAT File Support**: All versions (v4, v5, v6, v7, v7.3)
- **Built-in Sidebar**: Browse variables directly in the editor
- **Tree View**: Variable navigation in VSCode sidebar
- **Multiple Data Types**: Scalars, vectors, matrices, tensors
- **Complex Numbers**: Magnitude/Phase display
- **Structs**: Nested field exploration

### ✅ Visualization
- **1D Arrays**: Beautiful grid view with load-more
- **2D Matrices**: Table view & Image view
- **3D Arrays**: Slice navigation
- **Dark/Light Theme**: Auto-detect + manual switch
- **Smooth Animations**: Apple-inspired UI

### ✅ Export
- **CSV Export**: Export variables to CSV
- **JSON Export**: Export variables to JSON

### ✅ Settings Panel
- Version information
- Theme switch (Dark/Light/Auto)
- GitHub repository link

## Installation

### Prerequisites
- Python 3.8+ with:
  ```bash
  pip install scipy numpy h5py mat73
  ```

### Install from VSIX
1. Download `matrixspy-1.0.0.vsix` from this release
2. Open VSCode
3. Press `Cmd+Shift+P` → "Install from VSIX"
4. Select the downloaded file

## Usage

1. **Open a .mat file**: Double-click or right-click → "Open MAT File"
2. **Browse variables**: Use left sidebar in editor or VSCode activity bar
3. **Click a variable**: View its contents
4. **Export**: Right-click on a variable → "Export to CSV/JSON"

## Screenshots

### Dark Theme
Built-in sidebar with Variables, smooth animations, and beautiful matrix displays.

### Light Theme
Clean interface with perfect readability.

## Configuration

In VSCode settings:
```json
{
  "matrixspy.pythonPath": "python3",
  "matrixspy.maxDataSize": 10000,
  "matrixspy.enableMRI": true
}
```

## Repository

https://github.com/MaiwulanjiangMaiming/MatrixSpy

## License

MIT License

---

Enjoy viewing your MAT files! 🎉
```

---

## 📦 本地安装测试（可选）

在发布前，先在本地测试：

```bash
# 在 extension 目录下
code --install-extension matrixspy-1.0.0.vsix
```

---

## 💡 提示

| 平台 | 链接 |
|------|------|
| GitHub Releases | https://github.com/MaiwulanjiangMaiming/MatrixSpy/releases |
| Open VSX | https://open-vsx.org/ |
| VSCode Marketplace | https://marketplace.visualstudio.com/ (requires Azure DevOps) |

---

**Good luck with your release! 🚀**
