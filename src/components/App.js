import React from 'react';
import Graph from './Graph';
import '../popup.css';

function App() {
  return (
    <div className="App">
      <h1>WebGraph</h1>
      <p>Welcome to WebGraph. This page is only accessible through the extension&apos;s context menu.</p>
      <div id="graph">
        <Graph />
      </div>
    </div>
  );
}

export default App;