import React, { useEffect, useRef, useState } from 'react';
import GraphVisualizer from '../visualizer/GraphVisualizer';

function Graph() {
  const graphRef = useRef(null);
  const [graphVisualizer, setGraphVisualizer] = useState(null);

  useEffect(() => {
    if (graphRef.current) {
      const newGraphVisualizer = new GraphVisualizer(graphRef.current);
      setGraphVisualizer(newGraphVisualizer);
      
      const initializeGraph = async () => {
        await newGraphVisualizer.initializeGraph();
        
        try {
          await Promise.all([
            newGraphVisualizer.loadGraphSettings('/data/graph-settings.json'),
            newGraphVisualizer.loadBookmarksData('/data/bookmarks.json')
          ]);
          console.log('Graph initialized and data loaded');
        } catch (error) {
          console.error('Error loading graph data:', error);
        }
      };

      initializeGraph();
    }

    // Cleanup function
    return () => {
      if (graphVisualizer) {
        // Add any necessary cleanup for your GraphVisualizer
        // For example: graphVisualizer.cleanup();
      }
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (graphVisualizer) {
        graphVisualizer.updateSize(graphRef.current.clientWidth, graphRef.current.clientHeight);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial size update

    return () => window.removeEventListener('resize', handleResize);
  }, [graphVisualizer]);

  return <div ref={graphRef} id="graph" style={{ width: '100%', height: '100%' }} />;
}

export default Graph;