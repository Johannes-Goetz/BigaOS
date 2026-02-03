export enum BoatState {
  ANCHORED = 'ANCHORED',
  IN_MARINA = 'IN_MARINA',
  MOTORING = 'MOTORING',
  SAILING = 'SAILING',
  DRIFTING = 'DRIFTING'
}

export interface GeoPosition {
  latitude: number;
  longitude: number;
  timestamp: Date;
}

export interface SensorData {
  navigation: NavigationData;
  environment: EnvironmentData;
  electrical: ElectricalData;
  propulsion: PropulsionData;
  weather?: WeatherSensorData;
}

export interface WeatherSensorData {
  current: WeatherPoint;
  forecast: WeatherPoint[];
  lastUpdated: string;
}

export interface NavigationData {
  position: GeoPosition;
  courseOverGround: number;
  speedOverGround: number;
  headingMagnetic: number;
  headingTrue: number;
  attitude: AttitudeData;
}

export interface AttitudeData {
  roll: number;
  pitch: number;
  yaw: number;
}

export interface EnvironmentData {
  depth: {
    belowTransducer: number;
  };
  wind: {
    speedApparent: number;
    angleApparent: number;
    speedTrue: number;
    angleTrue: number;
  };
  temperature: {
    engineRoom: number;
    cabin: number;
    batteryCompartment: number;
    outside: number;
  };
}

export interface ElectricalData {
  battery: {
    voltage: number;
    current: number;
    temperature: number;
    stateOfCharge: number;
  };
}

export interface PropulsionData {
  motor: {
    state: 'running' | 'stopped';
    temperature: number;
    throttle: number;
  };
}

export interface BoatStateData {
  currentState: BoatState;
  previousState: BoatState | null;
  lastTransition: Date;
  manualOverride: any;
  inputs: any;
}

// Legacy WeatherData - kept for backwards compatibility
export interface WeatherData {
  temperature: number;
  windSpeed: number;
  windDirection: number;
  pressure: number;
  humidity: number;
}

// New weather types for Open-Meteo integration
export interface WindData {
  speed: number; // knots
  direction: number; // degrees (direction wind is coming FROM, 0 = North)
  gusts: number; // knots
}

export interface WaveData {
  height: number; // meters
  direction: number; // degrees
  period: number; // seconds
}

export interface WeatherPoint {
  timestamp: string; // ISO date
  location: { lat: number; lon: number };
  wind: WindData;
  waves?: WaveData;
  swell?: WaveData;
  pressure?: number; // hPa
  seaTemperature?: number; // celsius
}

export interface WeatherForecast {
  location: { lat: number; lon: number };
  current: WeatherPoint;
  hourly: WeatherPoint[];
  fetchedAt: string;
  expiresAt: string;
}

export interface WeatherGridBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface WeatherGridPoint extends WeatherPoint {
  // No additional fields - just a typed alias for grid points
}

export interface WeatherGrid {
  bounds: WeatherGridBounds;
  resolution: number;
  forecastHour: number;
  points: WeatherGridPoint[];
  fetchedAt: string;
}

export interface WeatherSettings {
  enabled: boolean;
  provider: 'open-meteo' | 'custom';
  weatherApiUrl: string;
  marineApiUrl: string;
  refreshIntervalMinutes: number;
}

export interface Camera {
  id: string;
  name: string;
  location: string;
  enabled: boolean;
  status: string;
}
