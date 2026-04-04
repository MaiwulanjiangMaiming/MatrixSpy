const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: './src/main.tsx',
  output: {
    path: path.resolve(__dirname, '../extension/webview-dist'),
    filename: 'main.js'
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js']
  },
  externals: {
    'vscode': 'commonjs vscode'
  },
  optimization: {
    minimize: true,
    usedExports: true,
    sideEffects: true
  },
  performance: {
    hints: 'warning',
    maxEntrypointSize: 2000000,  // 2 MB
    maxAssetSize: 2000000  // 2 MB
  },
  plugins: [
    new webpack.IgnorePlugin({
      resourceRegExp: /^moment$/
    }),
    new webpack.optimize.LimitChunkCountPlugin({
      maxChunks: 1
    })
  ]
};
