import React, { useRef } from 'react';
import { Play, Pause } from 'lucide-react';
import { Session } from '../types';

interface SessionControlsProps {
  selectedSession: Session | null;
  isPlaying: boolean;
  onPlayPause: () => void;
  currentTime: Date | null;
  sessionStartTime: Date | null;
  sessionEndTime: Date | null;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
  onSeek: (time: Date) => void;
  currentLap: number;
  totalLaps: number;
}

const SessionControls: React.FC<SessionControlsProps> = ({
  selectedSession,
  isPlaying,
  onPlayPause,
  currentTime,
  sessionStartTime,
  sessionEndTime,
  playbackSpeed,
  onSpeedChange,
  onSeek,
  currentLap,
  totalLaps
}) => {
  const progressBarRef = useRef<HTMLDivElement>(null);

  const formatDeltaTime = (current: Date, start: Date) => {
    const diffMs = current.getTime() - start.getTime();
    if (diffMs < 0) return "00:00:00";
    
    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !sessionStartTime || !sessionEndTime) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const percentage = Math.max(0, Math.min(1, x / width));
    
    const totalDuration = sessionEndTime.getTime() - sessionStartTime.getTime();
    const seekTimeMs = sessionStartTime.getTime() + (totalDuration * percentage);
    
    onSeek(new Date(seekTimeMs));
  };

  const progress = currentTime && sessionStartTime && sessionEndTime
    ? ((currentTime.getTime() - sessionStartTime.getTime()) / (sessionEndTime.getTime() - sessionStartTime.getTime())) * 100
    : 0;

  return (
    <div className="bg-f1-carbon p-3 rounded-lg shadow-lg border-b-4 border-f1-red">
      {/* Playback Controls */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={onPlayPause}
            disabled={!selectedSession}
            className={`p-3 rounded-full ${isPlaying ? 'bg-f1-gray' : 'bg-f1-red'} hover:opacity-90 transition disabled:opacity-50`}
          >
            {isPlaying ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" className="ml-1" />}
          </button>
          
          <div className="flex flex-col min-w-[80px]">
            <span className="text-xs text-gray-400 font-mono leading-none">SESSION TIME</span>
            <span className="text-xl font-bold font-mono tracking-widest text-white leading-tight">
              {currentTime && sessionStartTime ? formatDeltaTime(currentTime, sessionStartTime) : '00:00:00'}
            </span>
            <span className="text-xs text-f1-red font-bold font-mono mt-0.5">
               LAP {currentLap} / {totalLaps}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div 
            ref={progressBarRef}
            className="flex-1 w-full mx-4 relative h-4 group cursor-pointer"
            onClick={handleProgressBarClick}
        >
          <div className="absolute top-1/2 -translate-y-1/2 w-full h-2 bg-gray-700 rounded-full overflow-hidden">
             <div 
                className="h-full bg-f1-red transition-all duration-100 ease-linear"
                style={{ width: `${progress}%` }}
             />
          </div>
        </div>

        <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500">SPEED</span>
            <select
                value={playbackSpeed}
                onChange={(e) => onSpeedChange(Number(e.target.value))}
                className="bg-f1-gray text-white text-xs font-bold font-mono p-1 rounded border border-transparent hover:border-gray-500 outline-none cursor-pointer"
            >
                <option value={1}>1x</option>
                <option value={2}>2x</option>
                <option value={5}>5x</option>
                <option value={10}>10x</option>
                <option value={20}>20x</option>
                <option value={50}>50x</option>
            </select>
        </div>
      </div>
    </div>
  );
};

export default SessionControls;
