import React from 'react';
import Graph from './Graph';
import '../popup.css';

function App() {
  return (
    <div className="App">
      <div id="graph">
        <Graph />
      </div>
      {/* Removed the "Open Full View" button as it's no longer needed */}
    </div>
  );
}

export default App;