/**
 * Weather Service
 *
 * Fetches weather and marine data from Open-Meteo APIs.
 * Caches data in SQLite for offline use.
 * Broadcasts updates via WebSocket.
 */

import { dbWorker } from './database-worker.service';
import { connectivityService } from './connectivity.service';
import {
  WeatherForecast,
  WeatherPoint,
  WeatherGrid,
  WeatherGridBounds,
  WeatherGridPoint,
  WeatherSettings,
  WeatherUpdateEvent,
  OpenMeteoWeatherResponse,
  OpenMeteoMarineResponse,
  DEFAULT_WEATHER_SETTINGS,
  UPFRONT_FORECAST_DAYS,
} from '../types/weather.types';

// Round coordinates to ~11km precision for cache keys (0.1 degrees)
const COORD_PRECISION = 1;

function roundCoord(coord: number): number {
  return Math.round(coord * Math.pow(10, COORD_PRECISION)) / Math.pow(10, COORD_PRECISION);
}

class WeatherService {
  private settings: WeatherSettings = DEFAULT_WEATHER_SETTINGS;
  private autoFetchInterval: ReturnType<typeof setInterval> | null = null;
  private getBoatPosition: (() => { lat: number; lon: number } | null) | null = null;
  private lastFetchedPosition: { lat: number; lon: number } | null = null;
  private onWeatherUpdate: ((event: WeatherUpdateEvent) => void) | null = null;

  /**
   * Initialize the weather service with settings
   */
  async initialize(settings?: Partial<WeatherSettings>): Promise<void> {
    if (settings) {
      this.settings = { ...DEFAULT_WEATHER_SETTINGS, ...settings };
    }
  }

  /**
   * Update settings at runtime
   */
  updateSettings(settings: Partial<WeatherSettings>): void {
    this.settings = { ...this.settings, ...settings };

    // Restart auto-fetch if interval changed
    if (this.autoFetchInterval && this.getBoatPosition) {
      this.stopAutoFetch();
      this.startAutoFetch(this.getBoatPosition, this.onWeatherUpdate || undefined);
    }
  }

  /**
   * Set callback for weather updates (used by WebSocket server)
   */
  setUpdateCallback(callback: (event: WeatherUpdateEvent) => void): void {
    this.onWeatherUpdate = callback;
  }

  /**
   * Start automatic weather fetching based on boat position
   */
  startAutoFetch(
    getBoatPosition: () => { lat: number; lon: number } | null,
    onUpdate?: (event: WeatherUpdateEvent) => void
  ): void {
    this.getBoatPosition = getBoatPosition;
    if (onUpdate) {
      this.onWeatherUpdate = onUpdate;
    }

    // Initial fetch
    this.fetchForBoatPosition();

    // Set up periodic fetch
    const intervalMs = this.settings.refreshIntervalMinutes * 60 * 1000;
    this.autoFetchInterval = setInterval(() => {
      this.fetchForBoatPosition();
    }, intervalMs);
  }

  /**
   * Stop automatic fetching
   */
  stopAutoFetch(): void {
    if (this.autoFetchInterval) {
      clearInterval(this.autoFetchInterval);
      this.autoFetchInterval = null;
    }
  }

  /**
   * Fetch weather for current boat position
   */
  private async fetchForBoatPosition(): Promise<void> {
    if (!this.settings.enabled || !this.getBoatPosition) return;

    const position = this.getBoatPosition();
    if (!position) return;

    // Check if we've moved significantly (> 0.1 degrees ~ 11km)
    const hasMoved =
      !this.lastFetchedPosition ||
      Math.abs(position.lat - this.lastFetchedPosition.lat) > 0.1 ||
      Math.abs(position.lon - this.lastFetchedPosition.lon) > 0.1;

    if (!hasMoved) return; // getWeather will check cache expiry internally

    try {
      const forecast = await this.getWeather(position.lat, position.lon);
      this.lastFetchedPosition = position;

      // Broadcast update
      if (this.onWeatherUpdate && forecast) {
        this.onWeatherUpdate({
          current: forecast.current,
          forecast: forecast.hourly.slice(0, 48), // Next 48 hours
          lastUpdated: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('[Weather] Auto-fetch failed:', error);
    }
  }

  /**
   * Get weather forecast for a location
   * Uses database cache only - no in-memory caching to conserve RAM
   * @param requiredDays - Minimum number of forecast days needed (defaults to UPFRONT_FORECAST_DAYS)
   */
  async getWeather(lat: number, lon: number, requiredDays: number = UPFRONT_FORECAST_DAYS): Promise<WeatherForecast | null> {
    const requiredHours = requiredDays * 24;

    // Check database cache first
    const cached = await this.loadFromDatabase(lat, lon);
    if (cached && new Date() < new Date(cached.expiresAt)) {
      // Check if cached data has enough hours
      if (cached.hourly.length >= requiredHours) {
        return cached;
      }
    }

    // Try to fetch fresh data if online
    const isOnline = connectivityService.getOnlineStatus();

    if (isOnline) {
      try {
        const forecast = await this.fetchFromApi(lat, lon, requiredDays);
        if (forecast) {
          await this.saveToDatabase(lat, lon, forecast);
          return forecast;
        }
      } catch (error) {
        console.error('[Weather] API fetch failed:', error);
      }
    }

    // Return cached data even if expired/insufficient (better than nothing when offline)
    return cached;
  }

  /**
   * Get cached current weather (for WebSocket broadcasts)
   */
  async getCachedCurrent(): Promise<WeatherPoint | null> {
    if (!this.lastFetchedPosition) return null;
    const cached = await this.loadFromDatabase(this.lastFetchedPosition.lat, this.lastFetchedPosition.lon);
    return cached?.current || null;
  }

  /**
   * Get cached forecast (for WebSocket broadcasts)
   */
  async getCachedForecast(): Promise<WeatherPoint[]> {
    if (!this.lastFetchedPosition) return [];
    const cached = await this.loadFromDatabase(this.lastFetchedPosition.lat, this.lastFetchedPosition.lon);
    return cached?.hourly || [];
  }

  /**
   * Fetch weather grid for map overlay
   * Fetches all points in parallel for better performance
   */
  async getWeatherGrid(
    bounds: WeatherGridBounds,
    resolution: number,
    forecastHour: number = 0
  ): Promise<WeatherGrid> {
    const fetchedAt = new Date().toISOString();

    // Calculate required days based on forecast hour
    // Add 24h buffer since current time could be up to 23 hours into today
    // e.g., at 11pm + 1h forecast = need index 24, so 2 days minimum
    const requiredDays = Math.ceil((forecastHour + 24) / 24);

    // Generate grid coordinates using integer steps to avoid floating point accumulation errors
    const coordinates: Array<{ lat: number; lon: number }> = [];

    // Calculate number of steps (add small epsilon to handle floating point edge cases)
    const latSteps = Math.round((bounds.north - bounds.south) / resolution) + 1;
    const lonSteps = Math.round((bounds.east - bounds.west) / resolution) + 1;

    for (let latIdx = 0; latIdx < latSteps; latIdx++) {
      for (let lonIdx = 0; lonIdx < lonSteps; lonIdx++) {
        const lat = bounds.south + latIdx * resolution;
        const lon = bounds.west + lonIdx * resolution;
        coordinates.push({ lat, lon });
      }
    }

    // Fetch all points in parallel with concurrency limit
    const BATCH_SIZE = 10; // Limit concurrent requests to avoid overwhelming the API
    const points: WeatherGridPoint[] = [];
    const now = new Date();

    for (let i = 0; i < coordinates.length; i += BATCH_SIZE) {
      const batch = coordinates.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (coord) => {
          try {
            const weather = await this.getWeather(coord.lat, coord.lon, requiredDays);
            if (weather && weather.hourly.length > 0) {
              // Find the current hour index in the hourly array
              const currentIndex = weather.hourly.findIndex((p) => new Date(p.timestamp) >= now);
              const baseIndex = currentIndex >= 0 ? currentIndex : 0;

              // Offset from current time by forecastHour
              const targetIndex = baseIndex + forecastHour;
              const hourData = weather.hourly[targetIndex];

              if (hourData) {
                return hourData as WeatherGridPoint;
              }
            }
          } catch (error) {
            console.error(`[Weather] Failed to fetch point (${coord.lat}, ${coord.lon}):`, error);
          }
          return null;
        })
      );

      points.push(...batchResults.filter((p): p is WeatherGridPoint => p !== null));
    }

    return {
      bounds,
      resolution,
      forecastHour,
      points,
      fetchedAt,
    };
  }

  /**
   * Fetch from Open-Meteo APIs
   * @param days - Number of forecast days to fetch
   */
  private async fetchFromApi(lat: number, lon: number, days: number = UPFRONT_FORECAST_DAYS): Promise<WeatherForecast | null> {
    try {
      // Fetch weather and marine data in parallel
      const [weatherData, marineData] = await Promise.all([
        this.fetchWeatherApi(lat, lon, days),
        this.fetchMarineApi(lat, lon, days),
      ]);

      if (!weatherData) return null;

      // Combine into WeatherForecast
      const hourly: WeatherPoint[] = [];
      const times = weatherData.hourly.time;

      for (let i = 0; i < times.length; i++) {
        const point: WeatherPoint = {
          timestamp: times[i],
          location: { lat, lon },
          wind: {
            speed: weatherData.hourly.wind_speed_10m[i] ?? 0,
            direction: weatherData.hourly.wind_direction_10m[i] ?? 0,
            gusts: weatherData.hourly.wind_gusts_10m[i] ?? 0,
          },
          pressure: weatherData.hourly.pressure_msl?.[i] ?? undefined,
        };

        // Add wave data if available
        if (marineData) {
          if (
            marineData.hourly.wave_height?.[i] != null &&
            marineData.hourly.wave_direction?.[i] != null &&
            marineData.hourly.wave_period?.[i] != null
          ) {
            point.waves = {
              height: marineData.hourly.wave_height[i]!,
              direction: marineData.hourly.wave_direction[i]!,
              period: marineData.hourly.wave_period[i]!,
            };
          }

          if (
            marineData.hourly.swell_wave_height?.[i] != null &&
            marineData.hourly.swell_wave_direction?.[i] != null &&
            marineData.hourly.swell_wave_period?.[i] != null
          ) {
            point.swell = {
              height: marineData.hourly.swell_wave_height[i]!,
              direction: marineData.hourly.swell_wave_direction[i]!,
              period: marineData.hourly.swell_wave_period[i]!,
            };
          }
        }

        hourly.push(point);
      }

      // Find current hour
      const now = new Date();
      const currentIndex = hourly.findIndex((p) => new Date(p.timestamp) >= now);
      const current = hourly[Math.max(0, currentIndex)] || hourly[0];

      const fetchedAt = new Date().toISOString();
      const expiresAt = new Date(Date.now() + this.settings.refreshIntervalMinutes * 60 * 1000).toISOString();

      return {
        location: { lat, lon },
        current,
        hourly,
        fetchedAt,
        expiresAt,
      };
    } catch (error) {
      console.error('[Weather] fetchFromApi error:', error);
      return null;
    }
  }

  /**
   * Fetch from Open-Meteo Weather API
   */
  private async fetchWeatherApi(lat: number, lon: number, days: number): Promise<OpenMeteoWeatherResponse | null> {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      hourly: 'wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl',
      wind_speed_unit: 'kn',
      forecast_days: days.toString(),
    });

    const url = `${this.settings.weatherApiUrl}?${params}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Weather] API error ${response.status}: ${errorText}`);
        throw new Error(`Weather API error: ${response.status}`);
      }
      return (await response.json()) as OpenMeteoWeatherResponse;
    } catch (error) {
      console.error('[Weather] Weather API fetch failed:', error);
      return null;
    }
  }

  /**
   * Fetch from Open-Meteo Marine API
   */
  private async fetchMarineApi(lat: number, lon: number, days: number): Promise<OpenMeteoMarineResponse | null> {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      hourly: 'wave_height,wave_direction,wave_period,swell_wave_height,swell_wave_direction,swell_wave_period',
      forecast_days: days.toString(),
    });

    const url = `${this.settings.marineApiUrl}?${params}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        // Marine API might not be available for all locations
        console.warn('[Weather] Marine API not available for this location');
        return null;
      }
      return (await response.json()) as OpenMeteoMarineResponse;
    } catch (error) {
      // Marine data is optional, don't fail completely
      console.warn('[Weather] Marine API fetch failed:', error);
      return null;
    }
  }

  /**
   * Save weather data to database
   */
  private async saveToDatabase(lat: number, lon: number, forecast: WeatherForecast): Promise<void> {
    try {
      const roundedLat = roundCoord(lat);
      const roundedLon = roundCoord(lon);

      // Use INSERT OR REPLACE to upsert
      await dbWorker.setSetting(
        `weather_cache_${roundedLat}_${roundedLon}`,
        JSON.stringify({
          lat: roundedLat,
          lon: roundedLon,
          data: forecast,
          fetched_at: forecast.fetchedAt,
          expires_at: forecast.expiresAt,
        })
      );
    } catch (error) {
      console.error('[Weather] Failed to save to database:', error);
    }
  }

  /**
   * Load weather data from database
   */
  private async loadFromDatabase(lat: number, lon: number): Promise<WeatherForecast | null> {
    try {
      const roundedLat = roundCoord(lat);
      const roundedLon = roundCoord(lon);

      const cached = await dbWorker.getSetting(`weather_cache_${roundedLat}_${roundedLon}`);
      if (!cached) return null;

      const parsed = JSON.parse(cached);
      return parsed.data as WeatherForecast;
    } catch (error) {
      console.error('[Weather] Failed to load from database:', error);
      return null;
    }
  }

  /**
   * Get current settings
   */
  getSettings(): WeatherSettings {
    return { ...this.settings };
  }

  /**
   * Check if service is enabled
   */
  isEnabled(): boolean {
    return this.settings.enabled;
  }
}

// Export singleton instance
export const weatherService = new WeatherService();

export default weatherService;
