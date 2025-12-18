import React, { useState, useEffect } from 'react';
import { ChevronsRight, Trophy, Calendar, MapPin, Flag, Timer, Search } from 'lucide-react';
import { Meeting, Session, Driver } from '../types';
import { getMeetings, getSessions, getPodium } from '../services/openf1';

interface LandingPageProps {
    years: number[];
    onSelectSession: (meeting: Meeting, session: Session) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ years, onSelectSession }) => {
    const [selectedYear, setSelectedYear] = useState<number>(years[0]);
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [selectedSession, setSelectedSession] = useState<Session | null>(null);
    const [loadingMeetings, setLoadingMeetings] = useState(false);
    const [loadingSessions, setLoadingSessions] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Podiums
    const [racePodium, setRacePodium] = useState<(Driver & { position: number })[]>([]);
    const [sprintPodium, setSprintPodium] = useState<(Driver & { position: number })[]>([]);
    const [loadingPodium, setLoadingPodium] = useState(false);

    // Fetch Meetings
    useEffect(() => {
        setLoadingMeetings(true);
        setMeetings([]);
        setSelectedMeeting(null);
        setSessions([]);
        setSearchQuery(''); // Reset search on year change
        
        getMeetings(selectedYear).then((data) => {
            // Sort meetings by date
            const sorted = data.sort((a,b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());
            setMeetings(sorted);
            setLoadingMeetings(false);
        });
    }, [selectedYear]);

    // Fetch Sessions & Podiums when Meeting Selected
    useEffect(() => {
        if (!selectedMeeting) return;
        
        setLoadingSessions(true);
        setLoadingPodium(true);
        setSessions([]);
        setRacePodium([]);
        setSprintPodium([]);
        setSelectedSession(null);

        getSessions(selectedMeeting.meeting_key).then(async (sessionList) => {
            setSessions(sessionList);
            setLoadingSessions(false);

            // Find Race and Sprint sessions for podium
            const raceSession = sessionList.find(s => s.session_name.toLowerCase() === 'race');
            const sprintSession = sessionList.find(s => s.session_name.toLowerCase().includes('sprint'));

            if (raceSession) {
                const podium = await getPodium(raceSession.session_key);
                setRacePodium(podium);
            }
            if (sprintSession) {
                const podium = await getPodium(sprintSession.session_key);
                setSprintPodium(podium);
            }
            setLoadingPodium(false);
        });
    }, [selectedMeeting]);

    const handleStartReplay = () => {
        if (selectedMeeting && selectedSession) {
            onSelectSession(selectedMeeting, selectedSession);
        }
    };

    const filteredMeetings = meetings.filter(meeting => {
        const query = searchQuery.toLowerCase();
        return (
            meeting.meeting_official_name.toLowerCase().includes(query) ||
            meeting.circuit_short_name.toLowerCase().includes(query) ||
            meeting.country_name.toLowerCase().includes(query) ||
            meeting.location.toLowerCase().includes(query)
        );
    });

    const PodiumDisplay = ({ title, drivers }: { title: string, drivers: (Driver & { position: number })[] }) => {
        if (drivers.length === 0) return null;

        // Reorder for visual podium: 2nd, 1st, 3rd
        const p1 = drivers.find(d => d.position === 1);
        const p2 = drivers.find(d => d.position === 2);
        const p3 = drivers.find(d => d.position === 3);

        return (
            <div className="bg-f1-carbon/50 p-4 rounded-xl border border-gray-800">
                <h3 className="text-f1-red font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Trophy size={16} /> {title} Podium
                </h3>
                <div className="flex justify-center items-end gap-2 md:gap-4 h-48 mb-2">
                    {/* P2 */}
                    {p2 && <DriverCard driver={p2} height="h-32" order={2} />}
                    {/* P1 */}
                    {p1 && <DriverCard driver={p1} height="h-44" order={1} />}
                    {/* P3 */}
                    {p3 && <DriverCard driver={p3} height="h-24" order={3} />}
                </div>
            </div>
        );
    };

    const DriverCard = ({ driver, height, order }: { driver: Driver, height: string, order: number }) => (
        <div className={`flex flex-col items-center justify-end w-24 md:w-32 ${height} transition-all duration-500`}>
             <div className="relative w-full flex-1 flex items-end justify-center mb-2">
                {driver.headshot_url ? (
                    <img src={driver.headshot_url} alt={driver.name_acronym} className="w-full object-contain max-h-full drop-shadow-xl" />
                ) : (
                    <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center text-gray-500 font-bold text-xl">
                        {driver.name_acronym}
                    </div>
                )}
                <div className="absolute -bottom-3 bg-f1-dark border border-gray-600 rounded px-2 py-0.5 text-xs font-bold z-10">
                    P{order}
                </div>
             </div>
             <div className="text-center w-full bg-f1-dark/80 rounded p-1 border-t-4" style={{ borderTopColor: `#${driver.team_colour}` }}>
                <div className="font-bold text-sm leading-tight">{driver.last_name}</div>
                <div className="text-xs text-gray-400">#{driver.driver_number}</div>
             </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-f1-dark text-white flex flex-col">
            {/* Hero Header */}
            <header className="bg-gradient-to-r from-f1-red to-red-900 p-8 shadow-2xl">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-3">
                        <ChevronsRight size={48} strokeWidth={3} className="text-white" />
                        <div>
                            <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter">
                                F1<span className="font-light opacity-90">REPLAY</span>
                            </h1>
                            <p className="text-white/80 font-mono text-sm tracking-wide mt-1">
                                HISTORICAL TELEMETRY ARCHIVE
                            </p>
                        </div>
                    </div>
                    
                    {/* Year Selector */}
                    <div className="flex gap-2 bg-black/20 p-1 rounded-lg backdrop-blur-sm">
                        {years.map(y => (
                            <button
                                key={y}
                                onClick={() => setSelectedYear(y)}
                                className={`px-6 py-2 rounded font-bold transition-all ${
                                    selectedYear === y 
                                    ? 'bg-white text-f1-red shadow-lg scale-105' 
                                    : 'text-white/70 hover:text-white hover:bg-white/10'
                                }`}
                            >
                                {y}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left Column: Event Selection */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="flex items-center gap-2 text-f1-red font-bold uppercase tracking-widest text-sm mb-2">
                        <Calendar size={16} /> Select Event
                    </div>

                    {/* Search Input */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input 
                            type="text" 
                            placeholder="Filter events..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-f1-carbon border border-gray-700 rounded px-4 py-2 pl-9 text-sm text-white placeholder-gray-500 focus:border-f1-red focus:outline-none transition-colors"
                        />
                    </div>
                    
                    {loadingMeetings ? (
                        <div className="h-64 flex items-center justify-center border border-gray-800 rounded-xl bg-f1-carbon">
                            <div className="animate-spin w-8 h-8 border-4 border-f1-red border-t-transparent rounded-full"></div>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
                            {filteredMeetings.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 bg-f1-carbon rounded-xl border border-gray-800">
                                    {meetings.length === 0 ? `No events found for ${selectedYear}.` : "No matching events found."}
                                </div>
                            ) : filteredMeetings.map(meeting => (
                                <button
                                    key={meeting.meeting_key}
                                    onClick={() => setSelectedMeeting(meeting)}
                                    className={`w-full text-left p-4 rounded-xl border transition-all duration-200 group relative overflow-hidden ${
                                        selectedMeeting?.meeting_key === meeting.meeting_key
                                        ? 'bg-f1-red border-f1-red text-white shadow-lg shadow-f1-red/20'
                                        : 'bg-f1-carbon border-gray-800 text-gray-300 hover:border-gray-600 hover:bg-gray-800'
                                    }`}
                                >
                                    <div className="flex justify-between items-start relative z-10">
                                        <div>
                                            <div className="text-xs opacity-70 font-mono mb-1">
                                                ROUND {meeting.meeting_key % 100} • {new Date(meeting.date_start).toLocaleDateString()}
                                            </div>
                                            <div className="font-bold text-lg leading-tight group-hover:text-white transition-colors">
                                                {meeting.meeting_official_name.replace('Formula 1', '').replace(String(meeting.year), '').trim()}
                                            </div>
                                            <div className="flex items-center gap-1 mt-2 text-xs font-bold uppercase tracking-wider opacity-80">
                                                <MapPin size={12} /> {meeting.location}, {meeting.country_name}
                                            </div>
                                        </div>
                                        {selectedMeeting?.meeting_key === meeting.meeting_key && (
                                            <ChevronsRight className="animate-pulse" />
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Column: Details & Action */}
                <div className="lg:col-span-8 space-y-8">
                    {selectedMeeting ? (
                        <div className="animate-in slide-in-from-right duration-500 space-y-8">
                            
                            {/* Header Info */}
                            <div className="flex flex-col md:flex-row justify-between items-end border-b border-gray-800 pb-4">
                                <div>
                                    <h2 className="text-3xl font-bold text-white mb-2">{selectedMeeting.meeting_official_name}</h2>
                                    <div className="flex gap-4 text-sm text-gray-400">
                                        <span className="flex items-center gap-1"><MapPin size={14} /> {selectedMeeting.circuit_short_name}</span>
                                        <span className="flex items-center gap-1"><Flag size={14} /> {selectedMeeting.country_name}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Podiums Area */}
                            {loadingPodium ? (
                                <div className="h-48 flex items-center justify-center bg-f1-carbon/30 rounded-xl border border-gray-800 animate-pulse">
                                    <span className="text-gray-500 font-mono">Loading results data...</span>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {racePodium.length > 0 && <PodiumDisplay title="Grand Prix" drivers={racePodium} />}
                                    {sprintPodium.length > 0 && <PodiumDisplay title="Sprint" drivers={sprintPodium} />}
                                    {racePodium.length === 0 && sprintPodium.length === 0 && (
                                        <div className="col-span-2 p-8 text-center text-gray-500 italic bg-f1-carbon/30 rounded-xl border border-gray-800">
                                            No classification data available yet for this event.
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Session Selection */}
                            <div className="bg-f1-carbon p-6 rounded-xl border border-gray-800">
                                <div className="flex items-center gap-2 text-f1-red font-bold uppercase tracking-widest text-sm mb-4">
                                    <Timer size={16} /> Select Session to Replay
                                </div>

                                {loadingSessions ? (
                                    <div className="text-gray-500 italic">Fetching sessions...</div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {sessions.map(session => (
                                            <button
                                                key={session.session_key}
                                                onClick={() => setSelectedSession(session)}
                                                className={`p-3 rounded text-sm font-bold border transition-all ${
                                                    selectedSession?.session_key === session.session_key
                                                    ? 'bg-white text-black border-white scale-105 shadow-lg'
                                                    : 'bg-f1-dark text-gray-400 border-gray-700 hover:border-gray-500 hover:text-white'
                                                }`}
                                            >
                                                {session.session_name}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Action Button */}
                                <div className="mt-8 flex justify-end">
                                    <button
                                        onClick={handleStartReplay}
                                        disabled={!selectedSession}
                                        className={`px-8 py-4 rounded-full font-black text-xl italic tracking-tighter flex items-center gap-2 transition-all shadow-xl ${
                                            selectedSession
                                            ? 'bg-f1-red text-white hover:bg-red-600 hover:scale-105 hover:shadow-f1-red/40'
                                            : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                                        }`}
                                    >
                                        WATCH REPLAY <ChevronsRight size={24} strokeWidth={4} />
                                    </button>
                                </div>
                            </div>

                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50 space-y-4">
                            <Flag size={64} />
                            <p className="text-xl font-bold uppercase tracking-widest">Select an Event to Begin</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default LandingPage;