# Export Data

MatrixSpy provides multiple export options for your data.

## Export Formats

### CSV (Comma-Separated Values)

**How to export:**
1. Right-click on a variable in the sidebar
2. Select **"Export to CSV"**
3. Choose the save location

**Best for:**
- Spreadsheets (Excel, Google Sheets)
- Data analysis tools
- Simple tabular data

**Limitations:**
- Only works for 1D and 2D arrays
- Complex numbers are split into real/imaginary columns

### JSON (JavaScript Object Notation)

**How to export:**
1. Right-click on a variable in the sidebar
2. Select **"Export to JSON"**
3. Choose the save location

**Best for:**
- Web applications
- API data exchange
- Preserving structure (nested data)

**Features:**
- Preserves data types
- Handles nested structures
- Supports all array dimensions

### NumPy Format

**How to export:**
1. Open Command Palette: `Cmd+Shift+P`
2. Type **"MatrixSpy: Export to NumPy"**
3. Select the variable and save location

**Best for:**
- Python data analysis
- Machine learning workflows
- Preserving exact numerical precision

**Features:**
- Native NumPy `.npy` or `.npz` format
- Preserves array shape and dtype
- Efficient binary storage

## Export Settings

Configure export behavior in VS Code settings:

1. Open Settings (`Cmd+,`)
2. Search for "MatrixSpy"
3. Adjust:
   - `matrixspy.maxDataSize`: Maximum elements to export
   - CSV delimiter (comma, semicolon, tab)
   - JSON indentation

## Batch Export

To export multiple variables:

1. Select multiple variables in the sidebar (Cmd/Ctrl+Click)
2. Right-click and choose export format
3. Each variable will be saved as a separate file

---

**Tip**: For large datasets, CSV export may be slow. Consider using NumPy format for better performance.
