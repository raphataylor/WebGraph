import React from 'react';
import ReactDOM from 'react-dom';
import WebGraphUI from './components/WebGraphUI';

ReactDOM.render(
  <React.StrictMode>
    <WebGraphUI isPopup={true} />
  </React.StrictMode>,
  document.getElementById('root')
);