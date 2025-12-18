import React, { useMemo } from 'react';
import { Location, Driver, Session } from '../types';

interface TrackMapProps {
  trackLocations: Location[];
  carLocations: Location[];
  drivers: Driver[];
  selectedDriver: number | null;
  session: Session | null;
}

const TrackMap: React.FC<TrackMapProps> = ({ trackLocations, carLocations, drivers, selectedDriver, session }) => {
  
  // Calculate bounding box for the track
  const { minX, maxX, minY, maxY } = useMemo(() => {
    if (trackLocations.length === 0) return { minX: 0, maxX: 100, minY: 0, maxY: 100 };
    
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    trackLocations.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });
    
    // Add some padding
    const padding = 1000;
    return { 
      minX: minX - padding, 
      maxX: maxX + padding, 
      minY: minY - padding, 
      maxY: maxY + padding 
    };
  }, [trackLocations]);

  const width = maxX - minX;
  const height = maxY - minY;

  // Helper to scale coordinates
  const getCx = (x: number) => x;
  const getCy = (y: number) => -y; // Invert Y for SVG

  // Need to adjust viewBox because we inverted Y. 
  // Original Y range: [minY, maxY]. Inverted: [-maxY, -minY].
  // ViewBox min-y should be -maxY.
  const viewBox = `${minX} ${-maxY} ${width} ${height}`;

  // Create path data
  const trackPath = useMemo(() => {
    if (trackLocations.length === 0) return "";
    
    // Simple line connection. For better quality, one could use curves, but linear is fast.
    const path = trackLocations.map((p, i) => {
      const cmd = i === 0 ? 'M' : 'L';
      return `${cmd} ${getCx(p.x)} ${getCy(p.y)}`;
    }).join(' ');
    
    return path;
  }, [trackLocations, minX, maxY]);

  const getDriverColor = (number: number) => {
    const driver = drivers.find(d => d.driver_number === number);
    return driver ? `#${driver.team_colour}` : '#FFFFFF';
  };

  const getDriverAcronym = (number: number) => {
    const driver = drivers.find(d => d.driver_number === number);
    return driver ? driver.name_acronym : `${number}`;
  };

  if (trackLocations.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-f1-gray animate-pulse">
        Generating Track Layout...
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-f1-carbon rounded-lg shadow-lg overflow-hidden relative group">
      <svg 
        viewBox={viewBox} 
        className="w-full h-full p-4"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Track Line */}
        <path 
          d={trackPath} 
          fill="none" 
          stroke="#38383F" 
          strokeWidth="180" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
        <path 
          d={trackPath} 
          fill="none" 
          stroke="#F3F3F3" 
          strokeWidth="20" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          strokeOpacity="0.8"
        />

        {/* Cars */}
        {carLocations.map((car) => {
          const isSelected = selectedDriver === car.driver_number;
          return (
            <g 
              key={car.driver_number} 
              transform={`translate(${getCx(car.x)}, ${getCy(car.y)})`}
              className="transition-all duration-300"
            >
              {isSelected && (
                <circle 
                  r="600" 
                  fill="none" 
                  stroke="#FFFF00" 
                  strokeWidth="80"
                  className="animate-pulse"
                />
              )}
              <circle 
                r={isSelected ? "400" : "280"} 
                fill={getDriverColor(car.driver_number)} 
                stroke="#000" 
                strokeWidth="40"
              />
              <text 
                y={isSelected ? "-600" : "-400"} 
                textAnchor="middle" 
                fill="white" 
                fontSize={isSelected ? "600" : "400"} 
                fontFamily="monospace"
                fontWeight="bold"
                style={{ textShadow: '2px 2px 4px #000' }}
              >
                {getDriverAcronym(car.driver_number)}
              </text>
            </g>
          );
        })}
      </svg>
      
      {/* Info Overlay */}
      {session && (
          <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
              <div className="bg-black/60 backdrop-blur-md p-4 rounded-lg border-l-4 border-f1-red shadow-2xl">
                   <div className="text-gray-300 text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
                      <span>{session.year}</span>
                      <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
                      <span>{session.country_name}</span>
                   </div>
                   <div className="text-3xl font-black italic text-white tracking-tighter leading-none uppercase drop-shadow-lg">
                      {session.session_name}
                   </div>
                   <div className="text-sm font-bold text-f1-red mt-1 uppercase tracking-wide">
                      {session.circuit_short_name}
                   </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default TrackMap;
