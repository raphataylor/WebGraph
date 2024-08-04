import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Search, Settings, Image, Maximize2 } from 'lucide-react';

const WebGraphUI = ({ isPopup }) => {
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left Sidebar */}
      <div className={`bg-white shadow-lg transition-all ${leftSidebarOpen ? 'w-64' : 'w-0'}`}>
        <div className="p-4">
          <button onClick={() => setLeftSidebarOpen(!leftSidebarOpen)} className="mb-4">
            <ChevronLeft size={24} />
          </button>
          <h2 className="text-lg font-semibold mb-4">Graph Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Node Size</label>
              <input type="range" className="w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Line Size</label>
              <input type="range" className="w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Force Strength</label>
              <input type="range" className="w-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Graph Area */}
        <div className="flex-1 bg-gray-200 p-4 relative">
          {/* Floating Settings Button */}
          <button className="absolute top-4 left-4 p-2 bg-white rounded-full shadow hover:bg-gray-100">
            <Settings size={24} />
          </button>

          {/* Add Current Site Button (Only in popup mode) */}
          {isPopup && (
            <button className="absolute top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded flex items-center">
              <Plus size={20} className="mr-2" /> Add Current Site
            </button>
          )}

          {/* Fullscreen Button (Only in popup mode) */}
          {isPopup && (
            <button className="absolute top-4 right-40 p-2 bg-white rounded-full shadow hover:bg-gray-100">
              <Maximize2 size={24} />
            </button>
          )}

          {/* Placeholder for graph visualization */}
          <div className="w-full h-full bg-white rounded shadow flex items-center justify-center">
            Graph Visualization Goes Here
          </div>
        </div>

        {/* Bottom Search Bar and Space Selector */}
        <div className="bg-white shadow-sm p-4 flex items-center space-x-4">
          <div className="flex-1 flex items-center border rounded overflow-hidden">
            <input type="text" placeholder="Enter search here..." className="flex-1 px-4 py-2 focus:outline-none" />
            <button className="bg-blue-500 text-white p-2">
              <Search size={20} />
            </button>
          </div>
          <select className="border rounded px-4 py-2">
            <option>Select Space</option>
            <option>Space 1</option>
            <option>Space 2</option>
          </select>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className={`bg-white shadow-lg transition-all ${rightSidebarOpen ? 'w-64' : 'w-0'}`}>
        <div className="p-4">
          <button onClick={() => setRightSidebarOpen(!rightSidebarOpen)} className="mb-4">
            <ChevronRight size={24} />
          </button>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Snapshot</h3>
              <div className="bg-gray-200 h-40 flex items-center justify-center">
                <Image size={24} />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Notes</h3>
              <textarea className="w-full h-40 p-2 border rounded" placeholder="Enter markdown notes..."></textarea>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebGraphUI;