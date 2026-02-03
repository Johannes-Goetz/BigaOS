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
  WeatherCacheEntry,
  OpenMeteoWeatherResponse,
  OpenMeteoMarineResponse,
  DEFAULT_WEATHER_SETTINGS,
  UPFRONT_FORECAST_DAYS,
  MAX_FORECAST_DAYS,
} from '../types/weather.types';

// Round coordinates to ~11km precision for cache keys (0.1 degrees)
const COORD_PRECISION = 1;

function roundCoord(coord: number): number {
  return Math.round(coord * Math.pow(10, COORD_PRECISION)) / Math.pow(10, COORD_PRECISION);
}

function getCacheKey(lat: number, lon: number): string {
  return `${roundCoord(lat)},${roundCoord(lon)}`;
}

class WeatherService {
  private settings: WeatherSettings = DEFAULT_WEATHER_SETTINGS;
  private cache: Map<string, WeatherCacheEntry> = new Map();
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
    const needsFetch =
      !this.lastFetchedPosition ||
      Math.abs(position.lat - this.lastFetchedPosition.lat) > 0.1 ||
      Math.abs(position.lon - this.lastFetchedPosition.lon) > 0.1 ||
      this.isCacheExpired(position.lat, position.lon);

    if (!needsFetch) return;

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
   * Check if cache entry is expired
   */
  private isCacheExpired(lat: number, lon: number): boolean {
    const key = getCacheKey(lat, lon);
    const entry = this.cache.get(key);
    if (!entry) return true;
    return new Date() > entry.expiresAt;
  }

  /**
   * Get weather forecast for a location
   * @param requiredDays - Minimum number of forecast days needed (defaults to UPFRONT_FORECAST_DAYS)
   */
  async getWeather(lat: number, lon: number, requiredDays: number = UPFRONT_FORECAST_DAYS): Promise<WeatherForecast | null> {
    const key = getCacheKey(lat, lon);
    const requiredHours = requiredDays * 24;

    // Check in-memory cache first
    const cached = this.cache.get(key);
    if (cached && new Date() < cached.expiresAt) {
      // Check if cached data has enough hours
      if (cached.forecast.hourly.length >= requiredHours) {
        return cached.forecast;
      }
    }

    // Try to fetch fresh data if online
    const isOnline = connectivityService.getOnlineStatus();

    if (isOnline) {
      try {
        const forecast = await this.fetchFromApi(lat, lon, requiredDays);
        if (forecast) {
          this.cacheWeather(key, forecast);
          await this.saveToDatabase(lat, lon, forecast);
          return forecast;
        }
      } catch (error) {
        console.error('[Weather] API fetch failed:', error);
      }
    }

    // Fall back to database cache (even if it doesn't have enough hours)
    const dbCached = await this.loadFromDatabase(lat, lon);
    if (dbCached) {
      this.cache.set(key, {
        forecast: dbCached,
        fetchedAt: new Date(dbCached.fetchedAt),
        expiresAt: new Date(dbCached.expiresAt),
      });
      return dbCached;
    }

    return null;
  }

  /**
   * Get cached current weather (for WebSocket broadcasts)
   */
  getCachedCurrent(): WeatherPoint | null {
    if (!this.lastFetchedPosition) return null;
    const key = getCacheKey(this.lastFetchedPosition.lat, this.lastFetchedPosition.lon);
    const cached = this.cache.get(key);
    return cached?.forecast.current || null;
  }

  /**
   * Get cached forecast (for WebSocket broadcasts)
   */
  getCachedForecast(): WeatherPoint[] {
    if (!this.lastFetchedPosition) return [];
    const key = getCacheKey(this.lastFetchedPosition.lat, this.lastFetchedPosition.lon);
    const cached = this.cache.get(key);
    return cached?.forecast.hourly || [];
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

    // Calculate required days based on forecast hour (with buffer)
    // forecastHour is 0-indexed, so hour 72 = end of day 3
    const requiredDays = Math.min(Math.ceil((forecastHour + 1) / 24) + 1, MAX_FORECAST_DAYS);

    // Generate grid coordinates
    const latStep = resolution;
    const lonStep = resolution;
    const coordinates: Array<{ lat: number; lon: number }> = [];

    for (let lat = bounds.south; lat <= bounds.north; lat += latStep) {
      for (let lon = bounds.west; lon <= bounds.east; lon += lonStep) {
        coordinates.push({ lat, lon });
      }
    }

    // Fetch all points in parallel with concurrency limit
    const BATCH_SIZE = 10; // Limit concurrent requests to avoid overwhelming the API
    const points: WeatherGridPoint[] = [];

    for (let i = 0; i < coordinates.length; i += BATCH_SIZE) {
      const batch = coordinates.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (coord) => {
          try {
            const weather = await this.getWeather(coord.lat, coord.lon, requiredDays);
            if (weather) {
              const hourData = forecastHour === 0 ? weather.current : weather.hourly[forecastHour];
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
   * @param days - Number of forecast days to fetch (capped at MAX_FORECAST_DAYS)
   */
  private async fetchFromApi(lat: number, lon: number, days: number = UPFRONT_FORECAST_DAYS): Promise<WeatherForecast | null> {
    // Cap at maximum
    const forecastDays = Math.min(days, MAX_FORECAST_DAYS);

    try {
      // Fetch weather and marine data in parallel
      const [weatherData, marineData] = await Promise.all([
        this.fetchWeatherApi(lat, lon, forecastDays),
        this.fetchMarineApi(lat, lon, forecastDays),
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
   * Cache weather data in memory
   */
  private cacheWeather(key: string, forecast: WeatherForecast): void {
    this.cache.set(key, {
      forecast,
      fetchedAt: new Date(forecast.fetchedAt),
      expiresAt: new Date(forecast.expiresAt),
    });
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
