import React from 'react';
import Graph from './Graph';
import '../popup.css';

function App() {
  const openFullView = () => {
    if (chrome && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: chrome.runtime.getURL("index.html") });
    } else {
      console.log('Chrome API not available. This might be a development environment.');
      window.open("/index.html", "_blank");
    }
  };

  return (
    <div className="App">
      <div id="graph">
        <Graph />
      </div>
      <button onClick={openFullView}>Open Full View</button>
    </div>
  );
}

export default App;