import React, { useState, useEffect, useRef } from 'react';
import { ChevronsRight } from 'lucide-react';
import { YEARS } from './constants';
import { getMeetings, getSessions, getDrivers, getLaps, getLocations, getWeather, getRaceControl, getTeamRadio, getPositions, getIntervals, getCarData } from './services/openf1';
import { Meeting, Session, Driver, Location, Weather, RaceControl, TeamRadio, Position, Interval, Lap, CarData } from './types';
import SessionControls from './components/SessionControls';
import TrackMap from './components/TrackMap';
import InfoPanel from './components/InfoPanel';

// Extended type for internal use to avoid repetitive Date parsing
interface BufferedLocation extends Location {
    timestamp: number;
}
interface BufferedCarData extends CarData {
    timestamp: number;
}

// Binary Search Helper: Finds the index of the last element <= targetTime
const findIndexBefore = <T,>(arr: T[], targetTime: number, getTime: (item: T) => number): number => {
    let low = 0;
    let high = arr.length - 1;
    let result = -1;

    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const midTime = getTime(arr[mid]);

        if (midTime <= targetTime) {
            result = mid;
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    return result;
};

const App: React.FC = () => {
  // --- Selection State ---
  const [year, setYear] = useState<number>(YEARS[0]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  
  // --- Data State ---
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trackLayout, setTrackLayout] = useState<Location[]>([]);
  const [allLaps, setAllLaps] = useState<Lap[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadStatus, setLoadStatus] = useState<string>("");

  // --- Replay State ---
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  const [sessionEnd, setSessionEnd] = useState<Date | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null);
  const [currentLap, setCurrentLap] = useState<number>(0);
  const [totalLaps, setTotalLaps] = useState<number>(0);
  
  // --- Real-time Data Buffer ---
  const [currentCarLocations, setCurrentCarLocations] = useState<Location[]>([]);
  const [currentWeather, setCurrentWeather] = useState<Weather | null>(null);
  const [currentRaceControl, setCurrentRaceControl] = useState<RaceControl[]>([]);
  const [currentTeamRadio, setCurrentTeamRadio] = useState<TeamRadio[]>([]);
  const [currentPositions, setCurrentPositions] = useState<Position[]>([]);
  const [currentIntervals, setCurrentIntervals] = useState<Interval[]>([]);
  const [currentCarData, setCurrentCarData] = useState<CarData | null>(null);
  const [startingPositions, setStartingPositions] = useState<Map<number, number>>(new Map());

  // Refs for loop management to avoid stale closures
  const currentTimeRef = useRef<Date | null>(null);
  const isPlayingRef = useRef<boolean>(false);
  const isFetchingBuffer = useRef<boolean>(false);
  const bufferedUntilRef = useRef<number>(0);
  
  // Buffers
  // Map of driver -> sorted locations with parsed timestamps
  const locationBufferRef = useRef<Map<number, BufferedLocation[]>>(new Map());
  // Array of telemetry for selected driver
  const carDataBufferRef = useRef<BufferedCarData[]>([]);
  
  const fullSessionDataRef = useRef<{
    weather: Weather[];
    raceControl: RaceControl[];
    teamRadio: TeamRadio[];
    positions: Position[];
    intervals: Interval[];
  }>({
    weather: [],
    raceControl: [],
    teamRadio: [],
    positions: [],
    intervals: []
  });

  // --- Fetch Meetings on Year Change ---
  useEffect(() => {
    getMeetings(year).then(setMeetings);
    setSelectedMeeting(null);
    setSelectedSession(null);
    setSessions([]);
  }, [year]);

  // --- Fetch Sessions on Meeting Change ---
  useEffect(() => {
    if (selectedMeeting) {
      getSessions(selectedMeeting.meeting_key).then(setSessions);
    }
  }, [selectedMeeting]);

  // --- Initialize Session ---
  useEffect(() => {
    if (!selectedSession) return;

    const initSession = async () => {
      setIsLoading(true);
      setIsPlaying(false);
      isPlayingRef.current = false;
      
      // Reset Data
      locationBufferRef.current = new Map();
      carDataBufferRef.current = [];
      fullSessionDataRef.current = {
        weather: [],
        raceControl: [],
        teamRadio: [],
        positions: [],
        intervals: []
      };
      bufferedUntilRef.current = 0;
      setCurrentCarLocations([]);
      setCurrentWeather(null);
      setCurrentRaceControl([]);
      setCurrentTeamRadio([]);
      setCurrentPositions([]);
      setCurrentIntervals([]);
      setCurrentCarData(null);
      setSelectedDriver(null);
      setStartingPositions(new Map());
      setTotalLaps(0);
      setCurrentLap(0);

      const sessionKey = selectedSession.session_key;
      const startStr = selectedSession.date_start;
      const endStr = selectedSession.date_end;

      // 1. Fetch Drivers
      setLoadStatus("Fetching drivers...");
      const driversData = await getDrivers(sessionKey);
      setDrivers(driversData);

      // 2. Fetch Laps & Track Map
      setLoadStatus("Fetching laps & map...");
      let laps = await getLaps(sessionKey);
      
      // Sort laps by start time for the timeline and finding current lap
      laps.sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());
      setAllLaps(laps);
      
      // Calculate total laps (max lap number found)
      if (laps.length > 0) {
        const maxLap = Math.max(...laps.map(l => l.lap_number));
        setTotalLaps(maxLap);
      }

      // Filter for valid laps for track generation (needs duration)
      const validLapsForMap = laps.filter(l => l.lap_duration && !l.is_pit_out_lap).sort((a, b) => a.lap_duration - b.lap_duration);
      
      let trackPoints: Location[] = [];
      if (validLapsForMap.length > 0) {
        const bestLap = validLapsForMap[0];
        trackPoints = await getLocations(sessionKey, bestLap.date_start, new Date(new Date(bestLap.date_start).getTime() + bestLap.lap_duration * 1000).toISOString(), bestLap.driver_number);
      } else {
         const s = new Date(startStr);
         const e = new Date(s.getTime() + 60000);
         const driver = driversData.length > 0 ? driversData[0] : { driver_number: 1 };
         if (driver) {
             trackPoints = await getLocations(sessionKey, s.toISOString(), e.toISOString(), driver.driver_number);
         }
      }
      setTrackLayout(trackPoints);

      // 3. Fetch Full Session Data (Parallel)
      setLoadStatus("Downloading session data...");
      try {
        const [w, rc, tr, pos, ints] = await Promise.all([
            getWeather(sessionKey, startStr, endStr),
            getRaceControl(sessionKey, startStr, endStr),
            getTeamRadio(sessionKey, startStr, endStr),
            getPositions(sessionKey, startStr, endStr),
            getIntervals(sessionKey, startStr, endStr),
        ]);

        // Sort data once
        fullSessionDataRef.current = {
            weather: w.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
            raceControl: rc.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
            teamRadio: tr.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
            positions: pos.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
            intervals: ints.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
        };

        // Determine starting positions (First valid positive position in session)
        const starts = new Map<number, number>();
        driversData.forEach(d => {
            // Find the first position that is > 0
            const firstPos = fullSessionDataRef.current.positions.find(
              p => p.driver_number === d.driver_number && p.position > 0
            );
            
            if (firstPos) {
                starts.set(d.driver_number, firstPos.position);
            } else {
                 // Fallback to absolute first if no positive position found
                 const anyPos = fullSessionDataRef.current.positions.find(p => p.driver_number === d.driver_number);
                 if (anyPos) starts.set(d.driver_number, anyPos.position);
            }
        });
        setStartingPositions(starts);

      } catch (e) {
          console.error("Error fetching session data", e);
      }

      // 4. Initialize Buffer (Locations only)
      const startDate = new Date(startStr);
      setSessionStart(startDate);
      setSessionEnd(new Date(endStr));
      setCurrentTime(startDate);
      currentTimeRef.current = startDate;
      bufferedUntilRef.current = startDate.getTime();

      setLoadStatus("Buffering telemetry...");
      // Buffer larger initial chunk
      await fetchDynamicBuffer(startDate, 30 * 1000); 

      updateViewState(startDate);

      setIsLoading(false);
      setLoadStatus("");
    };

    initSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSession]);

  // Buffer locations AND car data if driver selected
  const fetchDynamicBuffer = async (startTime: Date, durationMs: number) => {
    if (!selectedSession) return;
    if (isFetchingBuffer.current) return;
    
    isFetchingBuffer.current = true;
    const endTime = new Date(startTime.getTime() + durationMs);
    
    console.log(`Buffering: ${startTime.toISOString()} -> ${endTime.toISOString()}`);

    try {
        const promises: Promise<any>[] = [
            getLocations(selectedSession.session_key, startTime.toISOString(), endTime.toISOString())
        ];

        // If driver selected, fetch specific telemetry
        if (selectedDriver) {
            promises.push(
                getCarData(selectedSession.session_key, selectedDriver, startTime.toISOString(), endTime.toISOString())
            );
        }

        const results = await Promise.all(promises);
        const locs: Location[] = results[0];
        const carData: CarData[] = results[1] || [];

        // Process Locations
        locs.forEach(l => {
            const dNum = l.driver_number;
            if (!locationBufferRef.current.has(dNum)) {
                locationBufferRef.current.set(dNum, []);
            }
            // Parse date once and store as number
            locationBufferRef.current.get(dNum)?.push({
                ...l,
                timestamp: new Date(l.date).getTime()
            });
        });

        // Process Car Data
        if (carData.length > 0) {
            carData.forEach(cd => {
                carDataBufferRef.current.push({
                    ...cd,
                    timestamp: new Date(cd.date).getTime()
                });
            });
            // Ensure sorted
            carDataBufferRef.current.sort((a, b) => a.timestamp - b.timestamp);
        }

        if (endTime.getTime() > bufferedUntilRef.current) {
            bufferedUntilRef.current = endTime.getTime();
        }
    } catch (err) {
        console.error("Buffer fetch error", err);
    } finally {
        isFetchingBuffer.current = false;
    }
  };

  // --- Replay Loop ---
  useEffect(() => {
    let animationFrameId: number;
    let lastTick = performance.now();

    const tick = async (now: number) => {
      if (!isPlayingRef.current || !currentTimeRef.current) return;

      const delta = now - lastTick;
      
      if (delta > 32) { 
        const timeAdvance = delta * playbackSpeed;
        const newTime = new Date(currentTimeRef.current.getTime() + timeAdvance);
        
        if (sessionEnd && newTime > sessionEnd) {
          setIsPlaying(false);
          return;
        }

        currentTimeRef.current = newTime;
        setCurrentTime(newTime);
        lastTick = now;

        updateViewState(newTime);

        // Buffer Management
        // Buffer significantly ahead (20s minimum or scaled by speed) to avoid gaps
        const bufferThreshold = Math.max(20000, 5000 * playbackSpeed);
        const timeToBufferEnd = bufferedUntilRef.current - newTime.getTime();
        
        if (timeToBufferEnd < bufferThreshold && !isFetchingBuffer.current) {
            const fetchStart = new Date(bufferedUntilRef.current);
            // Fetch a substantial chunk
            const fetchSize = Math.max(30000, 10000 * playbackSpeed);
            await fetchDynamicBuffer(fetchStart, fetchSize); 
        }
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    if (isPlaying) {
      isPlayingRef.current = true;
      lastTick = performance.now();
      animationFrameId = requestAnimationFrame(tick);
    } else {
      isPlayingRef.current = false;
      cancelAnimationFrame(animationFrameId);
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, playbackSpeed, sessionEnd, selectedDriver]);

  // Optimized View Update
  const updateViewState = (time: Date) => {
    const timeMs = time.getTime();

    // 1. Interpolate Cars (From Location Buffer)
    const activeCars: Location[] = [];
    locationBufferRef.current.forEach((locs) => {
      // Use pre-calculated timestamp for fast lookups
      const idx = findIndexBefore<BufferedLocation>(locs, timeMs, (l) => l.timestamp);
      
      // Interpolate if possible
      if (idx !== -1 && idx < locs.length - 1) {
        const prev = locs[idx];
        const next = locs[idx + 1];
        
        const tPrev = prev.timestamp;
        const tNext = next.timestamp;
        
        // Prevent division by zero if duplicates exist
        if (tNext > tPrev) {
            const ratio = (timeMs - tPrev) / (tNext - tPrev);
            activeCars.push({
            ...prev,
            x: prev.x + (next.x - prev.x) * ratio,
            y: prev.y + (next.y - prev.y) * ratio
            });
        } else {
             activeCars.push(prev);
        }
      }
    });
    setCurrentCarLocations(activeCars);

    // 2. Interpolate Car Telemetry (If selected)
    if (selectedDriver && carDataBufferRef.current.length > 0) {
        const cdBuffer = carDataBufferRef.current;
        const idx = findIndexBefore<BufferedCarData>(cdBuffer, timeMs, (c) => c.timestamp);

        if (idx !== -1 && idx < cdBuffer.length - 1) {
             const prev = cdBuffer[idx];
             const next = cdBuffer[idx + 1];
             const tPrev = prev.timestamp;
             const tNext = next.timestamp;
             
             if (tNext > tPrev) {
                const ratio = (timeMs - tPrev) / (tNext - tPrev);
                setCurrentCarData({
                    ...prev,
                    speed: Math.round(prev.speed + (next.speed - prev.speed) * ratio),
                    rpm: Math.round(prev.rpm + (next.rpm - prev.rpm) * ratio),
                    throttle: Math.round(prev.throttle + (next.throttle - prev.throttle) * ratio),
                    brake: Math.round(prev.brake + (next.brake - prev.brake) * ratio),
                    // Gear and DRS shouldn't really interpolate floats, just take nearest or prev
                    n_gear: prev.n_gear, 
                    drs: prev.drs
                });
             } else {
                 setCurrentCarData(prev);
             }
        } else if (idx !== -1) {
            setCurrentCarData(cdBuffer[idx]);
        }
    } else {
        setCurrentCarData(null);
    }


    // 3. Update State Data (From Full Session Data)
    const data = fullSessionDataRef.current;

    // Weather
    const wIdx = findIndexBefore<Weather>(data.weather, timeMs, (w) => new Date(w.date).getTime());
    if (wIdx !== -1) setCurrentWeather(data.weather[wIdx]);

    // Messages
    const rcIdx = findIndexBefore<RaceControl>(data.raceControl, timeMs, (rc) => new Date(rc.date).getTime());
    setCurrentRaceControl(rcIdx !== -1 ? data.raceControl.slice(0, rcIdx + 1) : []);
    
    const trIdx = findIndexBefore<TeamRadio>(data.teamRadio, timeMs, (tr) => new Date(tr.date).getTime());
    setCurrentTeamRadio(trIdx !== -1 ? data.teamRadio.slice(0, trIdx + 1) : []);

    // Positions & Intervals (Latest per driver)
    const pIdx = findIndexBefore<Position>(data.positions, timeMs, (p) => new Date(p.date).getTime());
    const iIdx = findIndexBefore<Interval>(data.intervals, timeMs, (i) => new Date(i.date).getTime());

    if (pIdx !== -1) {
        const latestPos = new Map<number, Position>();
        const start = Math.max(0, pIdx - 500);
        for (let i = pIdx; i >= start; i--) {
            const p = data.positions[i];
            if (!latestPos.has(p.driver_number)) latestPos.set(p.driver_number, p);
            if (latestPos.size >= drivers.length) break; 
        }
        setCurrentPositions(Array.from(latestPos.values()));
    } else {
        setCurrentPositions([]);
    }

    if (iIdx !== -1) {
        const latestInt = new Map<number, Interval>();
        const start = Math.max(0, iIdx - 500);
        for (let i = iIdx; i >= start; i--) {
            const int = data.intervals[i];
            if (!latestInt.has(int.driver_number)) latestInt.set(int.driver_number, int);
            if (latestInt.size >= drivers.length) break; 
        }
        setCurrentIntervals(Array.from(latestInt.values()));
    } else {
        setCurrentIntervals([]);
    }

    // 4. Update Current Lap
    // Find the latest lap start event across all drivers that happened before current time
    // allLaps is sorted by date_start (initSession)
    const lIdx = findIndexBefore<Lap>(allLaps, timeMs, (l) => new Date(l.date_start).getTime());
    if (lIdx !== -1) {
        setCurrentLap(allLaps[lIdx].lap_number);
    } else {
        setCurrentLap(0);
    }
  };

  const handleSeek = (time: Date) => {
      currentTimeRef.current = time;
      setCurrentTime(time);
      updateViewState(time);
      
      // If seek forces a re-buffer
      if (time.getTime() > bufferedUntilRef.current || time.getTime() < bufferedUntilRef.current - 600000 ) { 
           locationBufferRef.current = new Map(); 
           carDataBufferRef.current = []; // Clear telemetry buffer
           bufferedUntilRef.current = time.getTime();
           fetchDynamicBuffer(time, 30000);
      }
  };

  const toggleDriverSelection = async (driverNumber: number) => {
    // If selecting a new driver, we need to clear current telemetry buffer and fetch for them immediately
    if (selectedDriver !== driverNumber) {
        setSelectedDriver(driverNumber);
        carDataBufferRef.current = [];
        if (currentTimeRef.current) {
            // Fetch telemetry for current buffer window
            await fetchDynamicBuffer(currentTimeRef.current, 10000);
        }
    } else {
        setSelectedDriver(null);
        setCurrentCarData(null);
        carDataBufferRef.current = [];
    }
  };

  return (
    <div className="flex flex-col h-screen bg-f1-dark text-white overflow-hidden">
      {/* Header */}
      <header className="h-16 bg-f1-red flex items-center px-6 shadow-md z-10">
        <ChevronsRight size={32} strokeWidth={3} className="mr-2" />
        <h1 className="text-2xl font-bold italic tracking-tighter">
          F1<span className="font-light">REPLAY</span>
        </h1>
        <div className="ml-auto text-sm font-semibold opacity-80">
          POWERED BY OPENF1
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/80 z-50 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-f1-red border-t-transparent rounded-full animate-spin mb-4"></div>
            <div className="text-xl font-bold animate-pulse">{loadStatus}</div>
          </div>
        )}

        {/* Left: Map Area */}
        <div className="flex-1 flex flex-col p-4 gap-4 relative">
          {/* Controls */}
          <SessionControls
            years={YEARS}
            selectedYear={year}
            onYearChange={setYear}
            meetings={meetings}
            selectedMeeting={selectedMeeting}
            onMeetingChange={setSelectedMeeting}
            sessions={sessions}
            selectedSession={selectedSession}
            onSessionChange={setSelectedSession}
            isPlaying={isPlaying}
            onPlayPause={() => setIsPlaying(!isPlaying)}
            currentTime={currentTime}
            sessionStartTime={sessionStart}
            sessionEndTime={sessionEnd}
            playbackSpeed={playbackSpeed}
            onSpeedChange={setPlaybackSpeed}
            onSeek={handleSeek}
            currentLap={currentLap}
            totalLaps={totalLaps}
          />

          {/* Map Container */}
          <div className="flex-1 min-h-0 bg-f1-carbon rounded-lg border border-f1-gray p-1">
             <TrackMap 
               trackLocations={trackLayout} 
               carLocations={currentCarLocations} 
               drivers={drivers}
               selectedDriver={selectedDriver}
             />
          </div>
        </div>

        {/* Right: Info Panel */}
        <div className="w-full md:w-96 p-4 md:pl-0 h-1/2 md:h-full">
            <InfoPanel 
              weather={currentWeather}
              raceControlMessages={currentRaceControl}
              teamRadio={currentTeamRadio}
              drivers={drivers}
              positions={currentPositions}
              intervals={currentIntervals}
              laps={allLaps}
              currentTime={currentTime}
              selectedDriver={selectedDriver}
              onSelectDriver={toggleDriverSelection}
              carData={currentCarData}
              startingPositions={startingPositions}
            />
        </div>

      </div>
    </div>
  );
};

export default App;
