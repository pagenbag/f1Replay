export interface Session {
  session_key: number;
  meeting_key: number;
  country_name: string;
  circuit_short_name: string;
  circuit_key: number;
  location: string;
  session_name: string;
  date_start: string;
  date_end: string;
  year: number;
}

export interface Meeting {
  meeting_key: number;
  meeting_name: string;
  meeting_official_name: string;
  location: string;
  country_key: number;
  country_code: string;
  country_name: string;
  circuit_key: number;
  circuit_short_name: string;
  date_start: string;
  year: number;
}

export interface Driver {
  driver_number: number;
  broadcast_name: string;
  full_name: string;
  name_acronym: string;
  team_name: string;
  team_colour: string;
  first_name: string;
  last_name: string;
  headshot_url: string | null;
  country_code: string;
  session_key: number;
  meeting_key: number;
}

export interface Location {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  date: string;
  x: number;
  y: number;
  z: number;
}

export interface Weather {
  air_temperature: number;
  humidity: number;
  pressure: number;
  rainfall: number;
  track_temperature: number;
  wind_direction: number;
  wind_speed: number;
  date: string;
}

export interface RaceControl {
  category: string;
  flag: string;
  date: string;
  scope: string;
  sector: number | null;
  message: string;
}

export interface TeamRadio {
  date: string;
  driver_number: number;
  recording_url: string;
}

export interface Lap {
  meeting_key: number;
  session_key: number;
  driver_number: number;
  lap_number: number;
  date_start: string;
  lap_duration: number;
  is_pit_out_lap: boolean;
}

export interface Position {
  date: string;
  driver_number: number;
  position: number;
}

export interface Interval {
  date: string;
  driver_number: number;
  gap_to_leader: number | null;
  interval: number | null;
}

export interface CarData {
  date: string;
  driver_number: number;
  rpm: number;
  speed: number;
  n_gear: number;
  throttle: number;
  brake: number;
  drs: number;
}
