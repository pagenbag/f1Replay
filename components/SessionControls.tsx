import React, { useRef } from 'react';
import { Play, Pause } from 'lucide-react';
import { Meeting, Session } from '../types';

interface SessionControlsProps {
  years: number[];
  selectedYear: number;
  onYearChange: (year: number) => void;
  meetings: Meeting[];
  selectedMeeting: Meeting | null;
  onMeetingChange: (meeting: Meeting) => void;
  sessions: Session[];
  selectedSession: Session | null;
  onSessionChange: (session: Session) => void;
  isPlaying: boolean;
  onPlayPause: () => void;
  currentTime: Date | null;
  sessionStartTime: Date | null;
  sessionEndTime: Date | null;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
  onSeek: (time: Date) => void;
}

const SessionControls: React.FC<SessionControlsProps> = ({
  years,
  selectedYear,
  onYearChange,
  meetings,
  selectedMeeting,
  onMeetingChange,
  sessions,
  selectedSession,
  onSessionChange,
  isPlaying,
  onPlayPause,
  currentTime,
  sessionStartTime,
  sessionEndTime,
  playbackSpeed,
  onSpeedChange,
  onSeek
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
    <div className="bg-f1-carbon p-4 rounded-lg shadow-lg border-b-4 border-f1-red space-y-4">
      
      {/* Selection Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="text-xs text-f1-gray uppercase font-bold tracking-wider">Year</label>
          <select 
            className="w-full bg-f1-dark border border-f1-gray rounded p-2 text-white focus:border-f1-red outline-none"
            value={selectedYear}
            onChange={(e) => onYearChange(Number(e.target.value))}
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-f1-gray uppercase font-bold tracking-wider">Event</label>
          <select 
            className="w-full bg-f1-dark border border-f1-gray rounded p-2 text-white focus:border-f1-red outline-none"
            value={selectedMeeting?.meeting_key || ''}
            onChange={(e) => {
              const m = meetings.find(m => m.meeting_key === Number(e.target.value));
              if (m) onMeetingChange(m);
            }}
            disabled={meetings.length === 0}
          >
            <option value="">Select Event...</option>
            {meetings.map(m => (
              <option key={m.meeting_key} value={m.meeting_key}>{m.meeting_official_name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-f1-gray uppercase font-bold tracking-wider">Session</label>
          <select 
            className="w-full bg-f1-dark border border-f1-gray rounded p-2 text-white focus:border-f1-red outline-none"
            value={selectedSession?.session_key || ''}
            onChange={(e) => {
              const s = sessions.find(s => s.session_key === Number(e.target.value));
              if (s) onSessionChange(s);
            }}
            disabled={sessions.length === 0}
          >
            <option value="">Select Session...</option>
            {sessions.map(s => (
              <option key={s.session_key} value={s.session_key}>{s.session_name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex flex-col md:flex-row items-center justify-between bg-f1-dark p-3 rounded gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={onPlayPause}
            disabled={!selectedSession}
            className={`p-3 rounded-full ${isPlaying ? 'bg-f1-gray' : 'bg-f1-red'} hover:opacity-90 transition disabled:opacity-50`}
          >
            {isPlaying ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" className="ml-1" />}
          </button>
          
          <div className="flex flex-col min-w-[80px]">
            <span className="text-xs text-gray-400 font-mono">SESSION TIME</span>
            <span className="text-xl font-bold font-mono tracking-widest text-white">
              {currentTime && sessionStartTime ? formatDeltaTime(currentTime, sessionStartTime) : '00:00:00'}
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
          {/* Hover indicator could go here */}
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
