import { API_BASE } from '../constants';
import { Session, Meeting, Driver, Location, Lap, Weather, RaceControl, TeamRadio, Position, Interval, CarData } from '../types';

async function fetchAPI<T>(endpoint: string, params: Record<string, string | number>): Promise<T[]> {
  const url = new URL(`${API_BASE}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, String(value));
    }
  });

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`OpenF1 API Error: ${response.status} ${response.statusText} for ${url.toString()}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Fetch error:", error);
    return [];
  }
}

export const getMeetings = async (year: number): Promise<Meeting[]> => {
  return fetchAPI<Meeting>('/meetings', { year });
};

export const getSessions = async (meetingKey: number): Promise<Session[]> => {
  return fetchAPI<Session>('/sessions', { meeting_key: meetingKey });
};

export const getDrivers = async (sessionKey: number): Promise<Driver[]> => {
  return fetchAPI<Driver>('/drivers', { session_key: sessionKey });
};

export const getLaps = async (sessionKey: number, driverNumber?: number): Promise<Lap[]> => {
  const params: Record<string, string | number> = { session_key: sessionKey };
  if (driverNumber) params.driver_number = driverNumber;
  return fetchAPI<Lap>('/laps', params);
};

// Fetch locations within a specific time window
export const getLocations = async (sessionKey: number, start: string, end: string, driverNumber?: number): Promise<Location[]> => {
  const params: Record<string, string | number> = { 
    session_key: sessionKey,
    'date>': start,
    'date<': end
  };
  if (driverNumber) params.driver_number = driverNumber;
  return fetchAPI<Location>('/location', params);
};

export const getWeather = async (sessionKey: number, start: string, end: string): Promise<Weather[]> => {
  return fetchAPI<Weather>('/weather', { 
    session_key: sessionKey,
    'date>': start,
    'date<': end
  });
};

export const getRaceControl = async (sessionKey: number, start: string, end: string): Promise<RaceControl[]> => {
  return fetchAPI<RaceControl>('/race_control', { 
    session_key: sessionKey,
    'date>': start,
    'date<': end
  });
};

export const getTeamRadio = async (sessionKey: number, start: string, end: string): Promise<TeamRadio[]> => {
  return fetchAPI<TeamRadio>('/team_radio', { 
    session_key: sessionKey,
    'date>': start,
    'date<': end
  });
};

export const getPositions = async (sessionKey: number, start: string, end: string): Promise<Position[]> => {
  return fetchAPI<Position>('/position', { 
    session_key: sessionKey,
    'date>': start,
    'date<': end
  });
};

export const getIntervals = async (sessionKey: number, start: string, end: string): Promise<Interval[]> => {
  return fetchAPI<Interval>('/intervals', { 
    session_key: sessionKey,
    'date>': start,
    'date<': end
  });
};

export const getCarData = async (sessionKey: number, driverNumber: number, start: string, end: string): Promise<CarData[]> => {
  return fetchAPI<CarData>('/car_data', { 
    session_key: sessionKey,
    driver_number: driverNumber,
    'date>': start,
    'date<': end
  });
};

// Helper to deduce podium from position data
// OpenF1 doesn't have a simple 'results' endpoint, so we fetch pos 1, 2, 3 and find the latest entries
export const getPodium = async (sessionKey: number): Promise<(Driver & { position: number })[]> => {
    try {
        const drivers = await getDrivers(sessionKey);
        
        // Fetch all occurrences of pos 1, 2, 3
        // This is imperfect but works for replay context usually
        const [p1, p2, p3] = await Promise.all([
            fetchAPI<Position>('/position', { session_key: sessionKey, position: 1 }),
            fetchAPI<Position>('/position', { session_key: sessionKey, position: 2 }),
            fetchAPI<Position>('/position', { session_key: sessionKey, position: 3 })
        ]);

        const getLast = (arr: Position[]) => arr.length > 0 ? arr.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] : null;

        const results = [
            { pos: 1, data: getLast(p1) },
            { pos: 2, data: getLast(p2) },
            { pos: 3, data: getLast(p3) }
        ];

        const podium: (Driver & { position: number })[] = [];

        results.forEach(r => {
            if (r.data) {
                const driver = drivers.find(d => d.driver_number === r.data!.driver_number);
                if (driver) {
                    podium.push({ ...driver, position: r.pos });
                }
            }
        });

        return podium.sort((a,b) => a.position - b.position);

    } catch (e) {
        console.error("Error fetching podium", e);
        return [];
    }
};
