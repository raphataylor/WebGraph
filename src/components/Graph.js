import React, { useEffect, useRef } from 'react';
import GraphVisualizer from '../visualizer/GraphVisualizer';

function Graph() {
  const graphRef = useRef(null);

  useEffect(() => {
    if (graphRef.current) {
      const graphVisualizer = new GraphVisualizer(graphRef.current);
      graphVisualizer.initializeGraph();
      
      Promise.all([
        graphVisualizer.loadGraphSettings('/data/graph-settings.json'),
        graphVisualizer.loadBookmarksData('/data/bookmarks.json')
      ]).then(() => {
        // Both settings and data are loaded, graph is ready
        console.log('Graph initialized and data loaded');
      });
    }
  }, []);

  return <div ref={graphRef} id="graph" />;
}

export default Graph;