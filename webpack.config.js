const path = require('path');

module.exports = {
  entry: {
    popup: './src/popup/popup.js',
    background: './src/background/background.js',
    visualization: './src/visualization/visualization.js'
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  mode: 'development',
  devtool: 'cheap-module-source-map',
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  }
};