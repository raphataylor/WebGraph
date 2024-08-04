import React from 'react';
import ReactDOM from 'react-dom';
import GraphMarkUI from './components/GraphMarkUI';

ReactDOM.render(
  <React.StrictMode>
    <GraphMarkUI isPopup={true} />
  </React.StrictMode>,
  document.getElementById('root')
);