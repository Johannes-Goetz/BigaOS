import React, { useEffect, useRef, useCallback } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { weatherAPI } from '../../../services/api';
import { WeatherGridPoint } from '../../../types';
import { getWindColor } from '../../../utils/weather.utils';
import { useSettings } from '../../../context/SettingsContext';

interface WeatherOverlayProps {
  enabled: boolean;
  forecastHour: number;
  onLoadingChange?: (loading: boolean) => void;
  onError?: (error: string | null) => void;
}

interface WindData {
  speed: number;
  direction: number;
  gusts: number;
}

interface DataPoint {
  lat: number;
  lon: number;
  wind: WindData;
}

/**
 * Interpolate wind using Inverse Distance Weighting (IDW)
 * Creates smooth transitions between real data points
 */
function interpolateWind(
  targetLat: number,
  targetLon: number,
  dataPoints: DataPoint[]
): WindData | null {
  if (dataPoints.length === 0) return null;
  if (dataPoints.length === 1) return dataPoints[0].wind;

  // Find nearest neighbors and calculate weights
  const MAX_NEIGHBORS = 4;
  const neighbors: Array<{ point: DataPoint; dist: number }> = [];

  for (const point of dataPoints) {
    const dLat = targetLat - point.lat;
    const dLon = targetLon - point.lon;
    const dist = Math.sqrt(dLat * dLat + dLon * dLon);

    // If very close to a data point, just return it
    if (dist < 0.001) return point.wind;

    neighbors.push({ point, dist });
  }

  // Sort by distance and take closest neighbors
  neighbors.sort((a, b) => a.dist - b.dist);
  const nearby = neighbors.slice(0, MAX_NEIGHBORS);

  // IDW interpolation using vector components for proper direction blending
  let totalWeight = 0;
  let weightedU = 0;
  let weightedV = 0;
  let weightedSpeed = 0;
  let weightedGusts = 0;

  for (const { point, dist } of nearby) {
    const weight = 1 / (dist * dist); // IDW with power=2
    totalWeight += weight;

    // Convert wind to U/V components for proper direction averaging
    const dirRad = (point.wind.direction * Math.PI) / 180;
    weightedU += Math.sin(dirRad) * weight;
    weightedV += Math.cos(dirRad) * weight;
    weightedSpeed += point.wind.speed * weight;
    weightedGusts += point.wind.gusts * weight;
  }

  // Calculate interpolated direction from averaged U/V
  const avgU = weightedU / totalWeight;
  const avgV = weightedV / totalWeight;
  let direction = (Math.atan2(avgU, avgV) * 180) / Math.PI;
  if (direction < 0) direction += 360;

  return {
    speed: weightedSpeed / totalWeight,
    direction: Math.round(direction),
    gusts: weightedGusts / totalWeight,
  };
}

// ============================================
// Canvas Overlay Layer
// ============================================

class WeatherCanvasLayer extends L.Layer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private frame: number | null = null;
  private dataPoints: DataPoint[] = [];
  private windConverter: (knots: number) => number = (knots) => knots;
  private loading: boolean = false;
  private loadingAnimationFrame: number | null = null;
  private loadingStartTime: number = 0;

  onAdd(map: L.Map): this {
    const pane = map.getPane('overlayPane');
    if (!pane) return this;

    this.canvas = L.DomUtil.create('canvas', 'weather-canvas-layer') as HTMLCanvasElement;
    this.canvas.style.position = 'absolute';
    this.canvas.style.pointerEvents = 'none';
    this.ctx = this.canvas.getContext('2d', { alpha: true });
    pane.appendChild(this.canvas);

    this.reset();
    return this;
  }

  onRemove(_map: L.Map): this {
    if (this.canvas?.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    if (this.frame) {
      cancelAnimationFrame(this.frame);
    }
    if (this.loadingAnimationFrame) {
      cancelAnimationFrame(this.loadingAnimationFrame);
    }
    return this;
  }

  setDataPoints(dataPoints: DataPoint[]): void {
    this.dataPoints = dataPoints;
    this.redraw();
  }

  setWindConverter(converter: (knots: number) => number): void {
    this.windConverter = converter;
    this.redraw();
  }

  setVisible(visible: boolean): void {
    if (this.canvas) {
      this.canvas.style.display = visible ? '' : 'none';
    }
  }

  setLoading(loading: boolean): void {
    const wasLoading = this.loading;
    this.loading = loading;

    if (loading && !wasLoading) {
      // Start loading animation
      this.loadingStartTime = performance.now();
      this.animateLoading();
    } else if (!loading && wasLoading) {
      // Stop loading animation
      if (this.loadingAnimationFrame) {
        cancelAnimationFrame(this.loadingAnimationFrame);
        this.loadingAnimationFrame = null;
      }
      // Reset opacity and redraw
      if (this.canvas) {
        this.canvas.style.opacity = '1';
      }
      this.redraw();
    }
  }

  private animateLoading(): void {
    if (!this.loading || !this.canvas) return;

    const elapsed = performance.now() - this.loadingStartTime;
    // Pulse between 0.3 and 0.7 opacity with a 1 second cycle
    const opacity = 0.5 + 0.2 * Math.sin((elapsed / 500) * Math.PI);
    this.canvas.style.opacity = opacity.toString();

    this.loadingAnimationFrame = requestAnimationFrame(() => this.animateLoading());
  }

  reset(): void {
    if (!this.canvas || !this._map) return;

    const size = this._map.getSize();
    const topLeft = this._map.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(this.canvas, topLeft);

    this.canvas.width = size.x;
    this.canvas.height = size.y;
    this.canvas.style.width = `${size.x}px`;
    this.canvas.style.height = `${size.y}px`;
    this.ctx = this.canvas.getContext('2d', { alpha: true });

    this.redraw();
  }

  redraw(): void {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => this.render());
  }

  private render(): void {
    if (!this.canvas || !this.ctx || !this._map || this.dataPoints.length === 0) return;

    const ctx = this.ctx;
    const map = this._map;
    const size = map.getSize();

    ctx.clearRect(0, 0, size.x, size.y);

    const bounds = map.getBounds();

    // Calculate diagonal distance of visible area in degrees
    const latRange = bounds.getNorth() - bounds.getSouth();
    const lonRange = bounds.getEast() - bounds.getWest();
    const diagonal = Math.sqrt(latRange * latRange + lonRange * lonRange);

    // Target: ~15 arrows along the diagonal gives good density
    const targetArrowsOnDiagonal = 15;
    const spacing = diagonal / targetArrowsOnDiagonal;

    // Use the calculated spacing directly (no snapping for consistency)
    const finalSpacing = spacing;

    // Snap to grid boundaries
    const startLat = Math.floor(bounds.getSouth() / finalSpacing) * finalSpacing;
    const endLat = Math.ceil(bounds.getNorth() / finalSpacing) * finalSpacing;
    const startLon = Math.floor(bounds.getWest() / finalSpacing) * finalSpacing;
    const endLon = Math.ceil(bounds.getEast() / finalSpacing) * finalSpacing;

    // Draw arrows at fixed geographic positions with interpolated wind data
    for (let lat = startLat; lat <= endLat; lat += finalSpacing) {
      for (let lon = startLon; lon <= endLon; lon += finalSpacing) {
        const screenPoint = map.latLngToContainerPoint([lat, lon]);

        // Skip if outside visible area
        if (screenPoint.x < -20 || screenPoint.x > size.x + 20) continue;
        if (screenPoint.y < -20 || screenPoint.y > size.y + 20) continue;

        const wind = interpolateWind(lat, lon, this.dataPoints);
        if (!wind) continue;

        this.drawArrow(ctx, screenPoint.x, screenPoint.y, wind.direction, wind.speed);
      }
    }

  }

  private drawArrow(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    direction: number,
    speed: number
  ): void {
    const color = getWindColor(speed);
    const arrowLength = 16;
    const arrowWidth = 6;

    // Direction is where wind comes FROM, arrow points where it goes TO
    const angle = ((direction + 180) * Math.PI) / 180;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Draw arrow shaft and head
    ctx.fillStyle = color;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 0.5;

    ctx.beginPath();
    ctx.moveTo(0, -arrowLength / 2);
    ctx.lineTo(-arrowWidth / 2, arrowLength / 6);
    ctx.lineTo(-arrowWidth / 4, arrowLength / 6);
    ctx.lineTo(-arrowWidth / 4, arrowLength / 2);
    ctx.lineTo(arrowWidth / 4, arrowLength / 2);
    ctx.lineTo(arrowWidth / 4, arrowLength / 6);
    ctx.lineTo(arrowWidth / 2, arrowLength / 6);
    ctx.closePath();

    ctx.fill();
    ctx.stroke();

    // Draw speed text (converted to user's preferred unit)
    ctx.restore();
    ctx.fillStyle = color;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const convertedSpeed = this.windConverter(speed);
    const text = Math.round(convertedSpeed).toString();
    ctx.strokeText(text, x, y + 10);
    ctx.fillText(text, x, y + 10);
  }
}

// ============================================
// Main WeatherOverlay Component
// ============================================

export const WeatherOverlay: React.FC<WeatherOverlayProps> = ({
  enabled,
  forecastHour,
  onLoadingChange,
  onError,
}) => {
  const map = useMap();
  const layerRef = useRef<WeatherCanvasLayer | null>(null);
  const dataPointsRef = useRef<DataPoint[]>([]);
  const lastFetchKey = useRef<string>('');
  const [isLoading, setIsLoading] = React.useState(false);
  const { convertWind } = useSettings();

  // Fetch weather data for current bounds
  const fetchWeatherData = useCallback(async () => {
    if (!enabled) return;

    let bounds;
    try {
      bounds = map.getBounds();
    } catch {
      // Map not ready yet
      return;
    }

    // Calculate visible area size
    const latRange = bounds.getNorth() - bounds.getSouth();
    const lonRange = bounds.getEast() - bounds.getWest();
    const diagonal = Math.sqrt(latRange * latRange + lonRange * lonRange);

    // Calculate how many arrows will be shown (~15 along diagonal)
    const arrowSpacing = diagonal / 15;
    const arrowCols = Math.ceil(lonRange / arrowSpacing) + 1;
    const arrowRows = Math.ceil(latRange / arrowSpacing) + 1;
    const totalArrows = arrowCols * arrowRows;

    // Open-Meteo maximum resolution is 0.1° (~11km) - always aim for this
    const OPEN_METEO_MAX_RESOLUTION = 0.1;

    // Maximum data points = number of arrows on screen (never fetch more than we display)
    const maxDataPoints = totalArrows;

    // Calculate minimum resolution needed to not exceed maxDataPoints
    // Grid with ring adds ~2 extra rows/cols, use 0.6 factor as buffer
    const minResolutionForLimit = Math.sqrt((latRange * lonRange) / (maxDataPoints * 0.6));

    // Use best resolution possible: start at 0.1° but back off only if needed
    const targetResolution = Math.max(OPEN_METEO_MAX_RESOLUTION, minResolutionForLimit);

    // Standard resolutions (0.1° is finest for Open-Meteo)
    const standardResolutions = [0.1, 0.25, 0.5, 1.0, 2.0, 5.0];
    let resolution = standardResolutions[standardResolutions.length - 1];
    for (const res of standardResolutions) {
      if (res >= targetResolution) {
        resolution = res;
        break;
      }
    }

    // Snap viewport to resolution grid (these are the points that cover the viewport)
    const gridSouth = Math.floor(bounds.getSouth() / resolution) * resolution;
    const gridNorth = Math.ceil(bounds.getNorth() / resolution) * resolution;
    const gridWest = Math.floor(bounds.getWest() / resolution) * resolution;
    const gridEast = Math.ceil(bounds.getEast() / resolution) * resolution;

    // Add one ring around (1 resolution step in each direction)
    const gridBounds = {
      south: gridSouth - resolution,
      north: gridNorth + resolution,
      west: gridWest - resolution,
      east: gridEast + resolution,
    };

    const fetchKey = `${gridBounds.south},${gridBounds.west},${gridBounds.north},${gridBounds.east},${resolution},${forecastHour}`;
    if (fetchKey === lastFetchKey.current && dataPointsRef.current.length > 0) return;
    lastFetchKey.current = fetchKey;

    setIsLoading(true);
    onLoadingChange?.(true);
    onError?.(null);

    try {
      const response = await weatherAPI.getGrid(
        gridBounds,
        resolution,
        forecastHour
      );

      const points = (response.data?.points || [])
        .filter((p: WeatherGridPoint) => p.wind)
        .map((p: WeatherGridPoint) => ({
          lat: p.location.lat,
          lon: p.location.lon,
          wind: {
            speed: p.wind!.speed,
            direction: p.wind!.direction,
            gusts: p.wind!.gusts,
          },
        }));

      dataPointsRef.current = points;
      layerRef.current?.setDataPoints(points);

      if (points.length === 0) {
        onError?.('No weather data available for this area');
      }
    } catch (error: any) {
      console.error('[WeatherOverlay] Fetch failed:', error);
      onError?.(error.message || 'Failed to fetch weather');
    } finally {
      setIsLoading(false);
      onLoadingChange?.(false);
    }
  }, [map, enabled, forecastHour, onLoadingChange, onError]);

  // Layer lifecycle
  useEffect(() => {
    if (!enabled) {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
      return;
    }

    const layer = new WeatherCanvasLayer();
    layer.addTo(map);
    layer.setWindConverter(convertWind);
    layerRef.current = layer;

    if (dataPointsRef.current.length > 0) {
      layer.setDataPoints(dataPointsRef.current);
    }
    fetchWeatherData();

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [enabled, map, fetchWeatherData, convertWind]);

  // Update wind converter when unit changes
  useEffect(() => {
    if (layerRef.current) {
      layerRef.current.setWindConverter(convertWind);
    }
  }, [convertWind]);

  // Sync loading state with canvas layer
  useEffect(() => {
    if (layerRef.current) {
      layerRef.current.setLoading(isLoading);
    }
  }, [isLoading]);

  // Map events
  useMapEvents({
    move: () => {
      if (enabled && layerRef.current) {
        layerRef.current.reset();
      }
    },
    moveend: () => {
      if (enabled) {
        fetchWeatherData();
      }
    },
    zoomstart: () => {
      // Hide arrows while zooming
      if (enabled && layerRef.current) {
        layerRef.current.setVisible(false);
      }
    },
    zoomend: () => {
      // Show and redraw after zoom completes
      if (enabled && layerRef.current) {
        layerRef.current.setVisible(true);
        layerRef.current.reset();
      }
    },
  });

  // Refetch when forecast hour changes
  useEffect(() => {
    if (enabled) {
      lastFetchKey.current = '';
      fetchWeatherData();
    }
  }, [forecastHour, enabled, fetchWeatherData]);

  return null;
};

// ============================================
// Hook for managing weather overlay state
// ============================================

export function useWeatherOverlay() {
  const [enabled, setEnabled] = React.useState(false);
  const [forecastHour, setForecastHour] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const toggle = React.useCallback(() => {
    setEnabled((prev) => !prev);
  }, []);

  return {
    enabled,
    setEnabled,
    forecastHour,
    setForecastHour,
    loading,
    setLoading,
    error,
    setError,
    toggle,
  };
}
