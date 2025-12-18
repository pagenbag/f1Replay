import { API_BASE } from '../constants';
import { Session, Meeting, Driver, Location, Lap, Weather, RaceControl, TeamRadio, Position, Interval, CarData, StartingGrid } from '../types';

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

export const getStartingGrid = async (sessionKey: number): Promise<StartingGrid[]> => {
  return fetchAPI<StartingGrid>('/starting_grid', { session_key: sessionKey });
};
