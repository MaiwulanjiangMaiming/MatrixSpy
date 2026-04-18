# Visualize Data

MatrixSpy automatically selects the best visualization for your data type.

## Visualization Types

### 1D Arrays (Vectors)
- **Line Plot**: Shows the data as a connected line graph
- **Table View**: Displays all values in a scrollable table

### 2D Matrices
- **Heatmap**: Color-coded visualization of matrix values
- **Table View**: Interactive table with cell highlighting
- **Image View**: For image data (uint8, RGB)

### 3D Tensors
- **Slice Viewer**: Navigate through 3D data slice by slice
- **Controls**: 
  - Use the slider to change the active slice
  - Choose the slicing axis (X, Y, or Z)
  - Auto-play through slices

### Complex Numbers
- **Magnitude**: Absolute value visualization
- **Phase**: Phase angle visualization
- **Real/Imaginary**: Separate real and imaginary parts

## View Modes

Switch between views using the tabs at the top of the editor:

| Tab | Description |
|-----|-------------|
| **Image** | Graphical visualization |
| **Table** | Raw data in table format |

## Interactive Features

- **Zoom**: Scroll to zoom in/out (in image view)
- **Pan**: Click and drag to pan (in image view)
- **Hover**: See exact values when hovering over cells
- **Statistics**: View min, max, mean, std in the info panel

## Color Maps

For heatmaps, you can choose different color maps:
- Viridis (default)
- Jet
- Grayscale
- Hot
- Cool

---

**Tip**: For large 3D datasets, use the slice viewer for efficient navigation without loading all data at once.
