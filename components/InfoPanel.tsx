import React, { useState } from 'react';
import { Weather, RaceControl, TeamRadio, Driver, Position, Interval, Lap, CarData } from '../types';
import { Radio, CloudRain, Flag, Users, User, Gauge, CircleOff, ChevronUp, ChevronDown } from 'lucide-react';

interface InfoPanelProps {
  weather: Weather | null;
  raceControlMessages: RaceControl[];
  teamRadio: TeamRadio[];
  drivers: Driver[];
  positions: Position[];
  intervals: Interval[];
  laps: Lap[];
  currentTime: Date | null;
  selectedDriver: number | null;
  onSelectDriver: (driverNumber: number) => void;
  carData: CarData | null;
  startingPositions: Map<number, number>;
}

type Tab = 'DRIVERS' | 'RADIO' | 'CONTROL' | 'WEATHER';

const InfoPanel: React.FC<InfoPanelProps> = ({ 
    weather, 
    raceControlMessages, 
    teamRadio, 
    drivers,
    positions,
    intervals,
    laps,
    currentTime,
    selectedDriver,
    onSelectDriver,
    carData,
    startingPositions
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('DRIVERS');

  const getDriver = (number: number) => drivers.find(d => d.driver_number === number);

  // Reverse arrays to show newest first for feeds
  const sortedRadio = [...teamRadio].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const sortedControl = [...raceControlMessages].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Helper to format lap time (seconds to m:ss.ms)
  const formatLapTime = (duration: number) => {
      if (!duration) return "-";
      const min = Math.floor(duration / 60);
      const sec = (duration % 60).toFixed(3);
      return `${min}:${sec.padStart(6, '0')}`;
  };

  // Prepare Driver List Data
  const driverListData = drivers.map(d => {
      const num = d.driver_number;
      // Get latest pos (fallback)
      const posData = positions.find(p => p.driver_number === num);
      
      const startPos = startingPositions.get(num);
      // Use live position if available, otherwise fallback to starting position, then 999
      const pos = posData ? posData.position : (startPos || 999);
      
      // Get intervals
      const intData = intervals.find(i => i.driver_number === num);
      
      // Get last completed lap
      const completedLaps = laps.filter(l => 
        l.driver_number === num && 
        l.lap_duration &&
        currentTime && 
        (new Date(l.date_start).getTime() + l.lap_duration * 1000) <= currentTime.getTime()
      );
      const lastLap = completedLaps.sort((a,b) => new Date(b.date_start).getTime() - new Date(a.date_start).getTime())[0];

      return {
          driver: d,
          position: pos,
          interval: intData,
          lastLap: lastLap
      };
  }).sort((a, b) => {
      // Sort logic: 
      // 1. If A or B is leader (gap_to_leader is null/0), they go first.
      // 2. Sort by gap_to_leader ascending.
      // 3. Fallback to position.
      
      const aGap = a.interval?.gap_to_leader;
      const bGap = b.interval?.gap_to_leader;

      // Check for Leader (Gap is null often for leader in OpenF1 if they are P1, or 0)
      const hasA = a.interval !== undefined;
      const hasB = b.interval !== undefined;

      if (!hasA && !hasB) return a.position - b.position;
      if (!hasA) return 1;
      if (!hasB) return -1;

      // Treat null gap as 0 for sorting
      const valA = aGap === null ? 0 : aGap;
      const valB = bGap === null ? 0 : bGap;

      return valA - valB;
  });

  return (
    <div className="flex flex-col h-full bg-f1-carbon rounded-lg shadow-lg overflow-hidden border border-f1-gray">
      {/* Tabs */}
      <div className="flex border-b border-f1-gray">
        <button 
          onClick={() => setActiveTab('DRIVERS')}
          className={`flex-1 py-3 flex justify-center items-center hover:bg-f1-gray transition ${activeTab === 'DRIVERS' ? 'bg-f1-gray text-white border-b-2 border-f1-red' : 'text-gray-400'}`}
        >
          <Users size={18} />
        </button>
        <button 
          onClick={() => setActiveTab('RADIO')}
          className={`flex-1 py-3 flex justify-center items-center hover:bg-f1-gray transition ${activeTab === 'RADIO' ? 'bg-f1-gray text-white border-b-2 border-f1-red' : 'text-gray-400'}`}
        >
          <Radio size={18} />
        </button>
        <button 
          onClick={() => setActiveTab('CONTROL')}
          className={`flex-1 py-3 flex justify-center items-center hover:bg-f1-gray transition ${activeTab === 'CONTROL' ? 'bg-f1-gray text-white border-b-2 border-f1-red' : 'text-gray-400'}`}
        >
          <Flag size={18} />
        </button>
        <button 
          onClick={() => setActiveTab('WEATHER')}
          className={`flex-1 py-3 flex justify-center items-center hover:bg-f1-gray transition ${activeTab === 'WEATHER' ? 'bg-f1-gray text-white border-b-2 border-f1-red' : 'text-gray-400'}`}
        >
          <CloudRain size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
        
        {activeTab === 'DRIVERS' && (
          <div className="space-y-2">
            {driverListData.map(({ driver, position, interval, lastLap }, index) => {
              const isSelected = selectedDriver === driver.driver_number;
              const borderColor = `#${driver.team_colour}`;
              // Use index + 1 as visual position based on our interval sort
              const visualPos = index + 1;
              
              // Calculate Position Change
              // If we have a start position, calculate diff. 
              // startPos (e.g. 5) - currentPos (e.g. 3) = +2 (Gained)
              // startPos (e.g. 3) - currentPos (e.g. 5) = -2 (Lost)
              const startPos = startingPositions.get(driver.driver_number);
              const posDiff = startPos ? startPos - visualPos : 0;
              
              // DRS Logic
              const intervalVal = interval?.interval;
              const isDRS = intervalVal !== null && intervalVal !== undefined && intervalVal < 1.0;

              return (
                <div 
                  key={driver.driver_number} 
                  className={`flex flex-col p-2 rounded border-l-4 transition-all duration-200 relative overflow-hidden group
                    ${isSelected ? 'bg-f1-gray' : 'bg-f1-dark hover:bg-opacity-80 cursor-pointer'}`}
                  style={{ borderLeftColor: borderColor }}
                  onClick={() => !isSelected && onSelectDriver(driver.driver_number)}
                >
                  <div className="flex items-center" onClick={() => isSelected && onSelectDriver(driver.driver_number)}>
                      {/* Position & Indicators */}
                      <div className="w-8 flex-shrink-0 flex flex-col items-center justify-center">
                        {posDiff > 0 && (
                            <div className="text-[10px] text-green-500 flex items-center leading-none mb-0.5 font-bold">
                                <ChevronUp size={12} strokeWidth={3} /> {posDiff}
                            </div>
                        )}
                        
                        <span className="text-xl font-bold font-mono text-white leading-none">
                          {visualPos}
                        </span>

                        {posDiff < 0 && (
                             <div className="text-[10px] text-f1-red flex items-center leading-none mt-0.5 font-bold">
                                <ChevronDown size={12} strokeWidth={3} /> {Math.abs(posDiff)}
                             </div>
                        )}
                      </div>

                      {/* Headshot */}
                      <div className="w-12 h-12 flex-shrink-0 mx-2 relative bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                        {driver.headshot_url ? (
                            <img src={driver.headshot_url} alt={driver.name_acronym} className="w-full h-full object-cover scale-110 translate-y-1" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500">
                                <User size={20} />
                            </div>
                        )}
                      </div>

                      {/* Names and Info */}
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex items-baseline gap-2 mb-1">
                            <span className="font-bold text-lg leading-none">{driver.name_acronym}</span>
                            <span className="text-xs text-gray-400 truncate hidden sm:inline">{driver.last_name.toUpperCase()}</span>
                            <span className="text-sm font-bold text-f1-red ml-1">#{driver.driver_number}</span>
                        </div>
                        
                        {/* Telemetry Row */}
                        <div className="flex items-center gap-3 text-xs font-mono text-gray-400">
                             {/* Gap */}
                             <div className="flex flex-col leading-none">
                                <span className="text-[10px] text-gray-500 uppercase">Gap</span>
                                <span className="text-white">{(interval?.gap_to_leader === null || interval?.gap_to_leader === 0) ? 'LEADER' : `+ ${interval?.gap_to_leader}`}</span>
                             </div>
                             {/* Interval */}
                             <div className="flex flex-col leading-none">
                                <span className="text-[10px] text-gray-500 uppercase">Int</span>
                                <span className={`${isDRS ? 'text-green-500 font-bold' : 'text-white'}`}>
                                    {interval?.interval ? `+ ${interval.interval}` : '-'}
                                </span>
                             </div>
                             {/* Last Lap */}
                             <div className="flex flex-col leading-none ml-auto">
                                <span className="text-[10px] text-gray-500 uppercase text-right">Last Lap</span>
                                <span className="text-yellow-500">{lastLap ? formatLapTime(lastLap.lap_duration) : '--:--'}</span>
                             </div>
                        </div>
                      </div>
                  </div>

                  {/* Expanded Car Data Area */}
                  {isSelected && (
                      <div className="mt-3 pt-3 border-t border-gray-700 grid grid-cols-2 gap-2 animate-in slide-in-from-top-2 duration-300">
                          {carData ? (
                              <>
                                <div className="bg-black/30 p-2 rounded">
                                    <div className="flex justify-between items-end mb-1">
                                        <span className="text-[10px] text-gray-400">SPEED</span>
                                        <span className="text-lg font-mono font-bold leading-none">{carData.speed} <span className="text-[10px] text-gray-500">KPH</span></span>
                                    </div>
                                    <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-blue-500 h-full" style={{ width: `${Math.min(carData.speed / 350 * 100, 100)}%` }} />
                                    </div>
                                </div>

                                <div className="bg-black/30 p-2 rounded">
                                    <div className="flex justify-between items-end mb-1">
                                        <span className="text-[10px] text-gray-400">RPM</span>
                                        <span className="text-lg font-mono font-bold leading-none">{carData.rpm}</span>
                                    </div>
                                    <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-purple-500 h-full" style={{ width: `${Math.min(carData.rpm / 13000 * 100, 100)}%` }} />
                                    </div>
                                </div>

                                <div className="bg-black/30 p-2 rounded">
                                    <div className="flex justify-between items-end mb-1">
                                        <span className="text-[10px] text-gray-400">GEAR</span>
                                        <span className="text-lg font-mono font-bold leading-none text-yellow-400">{carData.n_gear}</span>
                                    </div>
                                </div>

                                <div className="bg-black/30 p-2 rounded">
                                    <div className="flex justify-between items-end mb-1">
                                        <span className="text-[10px] text-gray-400">DRS</span>
                                        <span className={`text-lg font-bold leading-none ${carData.drs > 10 ? 'text-green-500' : 'text-gray-600'}`}>
                                            {carData.drs > 10 ? 'OPEN' : 'CLOSED'}
                                        </span>
                                    </div>
                                </div>

                                <div className="col-span-2 bg-black/30 p-2 rounded flex gap-2">
                                    <div className="flex-1">
                                        <div className="text-[10px] text-gray-400 mb-1">THROTTLE</div>
                                        <div className="h-6 w-full bg-gray-800 rounded overflow-hidden relative">
                                            <div className="absolute bottom-0 left-0 h-full bg-green-500 transition-all duration-75" style={{ width: `${carData.throttle}%` }} />
                                            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white mix-blend-difference">{carData.throttle}%</span>
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-[10px] text-gray-400 mb-1">BRAKE</div>
                                        <div className="h-6 w-full bg-gray-800 rounded overflow-hidden relative">
                                            <div className="absolute bottom-0 left-0 h-full bg-red-600 transition-all duration-75" style={{ width: `${carData.brake > 0 ? 100 : 0}%`, opacity: carData.brake > 0 ? 1 : 0.2 }} />
                                            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white mix-blend-difference">{carData.brake > 0 ? 'ON' : 'OFF'}</span>
                                        </div>
                                    </div>
                                </div>
                              </>
                          ) : (
                              <div className="col-span-2 text-center text-xs text-gray-500 py-4 italic">
                                  Connecting to telemetry stream...
                              </div>
                          )}
                      </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'RADIO' && (
          <div className="space-y-3 p-2">
             <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Live Team Radio</h3>
             {sortedRadio.length === 0 && <div className="text-sm text-gray-500 text-center mt-10">No radio comms yet.</div>}
             {sortedRadio.map((radio, idx) => {
               const driver = getDriver(radio.driver_number);
               return (
                 <div key={idx} className="bg-f1-dark p-3 rounded border-l-2 border-f1-red">
                   <div className="flex justify-between items-center mb-1">
                     <span className="font-bold text-f1-red text-sm">{driver?.name_acronym || radio.driver_number}</span>
                     <span className="text-xs text-gray-500">{new Date(radio.date).toLocaleTimeString()}</span>
                   </div>
                   <div className="text-xs text-gray-400 mb-2">Team Radio</div>
                   <audio controls src={radio.recording_url} className="w-full h-8" />
                 </div>
               );
             })}
          </div>
        )}

        {activeTab === 'CONTROL' && (
          <div className="space-y-2 p-2">
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Race Control</h3>
            {sortedControl.length === 0 && <div className="text-sm text-gray-500 text-center mt-10">All clear.</div>}
            {sortedControl.map((msg, idx) => (
              <div key={idx} className="bg-f1-dark p-3 rounded border border-gray-700">
                <div className="flex justify-between mb-1">
                  <span className="font-bold text-xs text-yellow-500 uppercase">{msg.category}</span>
                  <span className="text-xs text-gray-500 font-mono">{new Date(msg.date).toLocaleTimeString()}</span>
                </div>
                <div className="text-sm">{msg.message}</div>
                {msg.flag && (
                    <div className="mt-2 text-xs font-bold px-2 py-1 bg-white text-black inline-block rounded">
                        FLAG: {msg.flag}
                    </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'WEATHER' && weather && (
          <div className="space-y-4 p-2">
             <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Track Conditions</h3>
             
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-f1-dark p-4 rounded text-center">
                    <div className="text-gray-400 text-xs uppercase">Air Temp</div>
                    <div className="text-2xl font-bold font-mono">{weather.air_temperature}°C</div>
                </div>
                <div className="bg-f1-dark p-4 rounded text-center">
                    <div className="text-gray-400 text-xs uppercase">Track Temp</div>
                    <div className="text-2xl font-bold font-mono">{weather.track_temperature}°C</div>
                </div>
                <div className="bg-f1-dark p-4 rounded text-center">
                    <div className="text-gray-400 text-xs uppercase">Humidity</div>
                    <div className="text-2xl font-bold font-mono">{weather.humidity}%</div>
                </div>
                <div className="bg-f1-dark p-4 rounded text-center">
                    <div className="text-gray-400 text-xs uppercase">Rainfall</div>
                    <div className="text-2xl font-bold font-mono">{weather.rainfall > 0 ? 'YES' : 'NO'}</div>
                </div>
             </div>

             <div className="bg-f1-dark p-4 rounded">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400 text-xs uppercase">Wind Speed</span>
                    <span className="font-bold font-mono">{weather.wind_speed} m/s</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-xs uppercase">Wind Direction</span>
                    <span className="font-bold font-mono">{weather.wind_direction}°</span>
                </div>
             </div>
             <div className="text-xs text-gray-500 text-center">
                Last updated: {new Date(weather.date).toLocaleTimeString()}
             </div>
          </div>
        )}
        {activeTab === 'WEATHER' && !weather && (
             <div className="text-sm text-gray-500 text-center mt-10">Waiting for weather data...</div>
        )}

      </div>
    </div>
  );
};

export default InfoPanel;
