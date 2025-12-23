import React, { useMemo, useState } from 'react';
import { useSettings } from '../../context/SettingsContext';

export interface DataPoint {
  timestamp: number;
  value: number;
}

export type TimeframeOption = '15m' | '1h' | '6h' | '24h';

interface TimeframeConfig {
  label: string;
  ms: number;
}

const TIMEFRAMES: Record<TimeframeOption, TimeframeConfig> = {
  '15m': { label: '15m', ms: 15 * 60 * 1000 },
  '1h': { label: '1h', ms: 60 * 60 * 1000 },
  '6h': { label: '6h', ms: 6 * 60 * 60 * 1000 },
  '24h': { label: '24h', ms: 24 * 60 * 60 * 1000 },
};

interface SensorChartProps {
  data: DataPoint[];
  unit: string;
  color?: string;
  fillColor?: string;
  thresholdLine?: number | null;
  thresholdColor?: string;
  invertY?: boolean; // For depth (deeper = higher value shown lower)
  minValue?: number; // Optional minimum Y value
  defaultTimeframe?: TimeframeOption;
  onTimeframeChange?: (timeframe: TimeframeOption) => void;
}

/**
 * Rounds a number up to a "nice" value for Y-axis max
 * Examples: 2.3 → 5, 6.7 → 10, 23 → 25, 67 → 100, 0.3 → 0.5
 */
function roundToNiceNumber(value: number): number {
  if (value <= 0) return 1;

  // Find the order of magnitude
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;

  // Round up to nice values: 1, 2, 2.5, 5, 10
  let niceNormalized: number;
  if (normalized <= 1) {
    niceNormalized = 1;
  } else if (normalized <= 2) {
    niceNormalized = 2;
  } else if (normalized <= 2.5) {
    niceNormalized = 2.5;
  } else if (normalized <= 5) {
    niceNormalized = 5;
  } else {
    niceNormalized = 10;
  }

  return niceNormalized * magnitude;
}

/**
 * Generate nice tick values for Y-axis
 */
function generateYTicks(min: number, max: number, targetCount: number = 5): number[] {
  const range = max - min;
  if (range === 0) return [min];

  const rawStep = range / (targetCount - 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitude;

  let niceStep: number;
  if (normalized <= 1) niceStep = magnitude;
  else if (normalized <= 2) niceStep = 2 * magnitude;
  else if (normalized <= 2.5) niceStep = 2.5 * magnitude;
  else if (normalized <= 5) niceStep = 5 * magnitude;
  else niceStep = 10 * magnitude;

  const ticks: number[] = [];
  const start = Math.floor(min / niceStep) * niceStep;

  for (let tick = start; tick <= max + niceStep * 0.01; tick += niceStep) {
    if (tick >= min - niceStep * 0.01) {
      ticks.push(Math.round(tick * 1000) / 1000); // Avoid floating point issues
    }
  }

  return ticks;
}

/**
 * Format time label for X-axis based on timeframe and format preference
 */
function formatTimeLabel(timestamp: number, timeFormat: '12h' | '24h'): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: timeFormat === '12h'
  });
}

export const SensorChart: React.FC<SensorChartProps> = ({
  data,
  unit,
  color = '#4fc3f7',
  fillColor,
  thresholdLine,
  thresholdColor = '#ef5350',
  invertY = false,
  minValue,
  defaultTimeframe = '15m',
  onTimeframeChange,
}) => {
  const { timeFormat } = useSettings();
  const [timeframe, setTimeframe] = useState<TimeframeOption>(defaultTimeframe);

  const handleTimeframeChange = (newTimeframe: TimeframeOption) => {
    setTimeframe(newTimeframe);
    onTimeframeChange?.(newTimeframe);
  };

  // Filter data to selected timeframe
  const filteredData = useMemo(() => {
    const now = Date.now();
    const cutoff = now - TIMEFRAMES[timeframe].ms;
    return data.filter(d => d.timestamp >= cutoff);
  }, [data, timeframe]);

  // Calculate Y-axis bounds with nice rounding
  const { yMin, yMax, yTicks } = useMemo(() => {
    if (filteredData.length === 0) {
      return { yMin: 0, yMax: 10, yTicks: [0, 2, 4, 6, 8, 10] };
    }

    const values = filteredData.map(d => d.value);
    const dataMin = Math.min(...values);
    const dataMax = Math.max(...values);

    // Determine actual min/max with some padding
    let calculatedMin = minValue !== undefined ? Math.min(minValue, dataMin) : dataMin * 0.9;
    let calculatedMax = dataMax * 1.1;

    // Apply nice rounding
    const niceMax = roundToNiceNumber(calculatedMax);
    const niceMin = calculatedMin < 0 ? -roundToNiceNumber(Math.abs(calculatedMin)) : 0;

    // Generate ticks
    const ticks = generateYTicks(niceMin, niceMax, 5);

    return {
      yMin: ticks[0],
      yMax: ticks[ticks.length - 1],
      yTicks: ticks,
    };
  }, [filteredData, minValue]);

  // Calculate time bounds for X-axis
  const { xMin, xMax, xTicks } = useMemo(() => {
    const now = Date.now();
    const cutoff = now - TIMEFRAMES[timeframe].ms;

    // Generate time ticks
    const tickCount = timeframe === '15m' ? 4 : timeframe === '1h' ? 5 : 5;
    const ticks: number[] = [];
    const step = TIMEFRAMES[timeframe].ms / (tickCount - 1);

    for (let i = 0; i < tickCount; i++) {
      ticks.push(cutoff + step * i);
    }

    return { xMin: cutoff, xMax: now, xTicks: ticks };
  }, [timeframe]);

  const gradientId = `chartGradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Timeframe selector */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '0.75rem',
        justifyContent: 'flex-start',
      }}>
        {(Object.keys(TIMEFRAMES) as TimeframeOption[]).map((tf) => (
          <button
            key={tf}
            onClick={() => handleTimeframeChange(tf)}
            style={{
              padding: '0.35rem 0.75rem',
              background: timeframe === tf ? 'rgba(25, 118, 210, 0.5)' : 'rgba(255, 255, 255, 0.1)',
              border: timeframe === tf ? '1px solid rgba(25, 118, 210, 0.8)' : '1px solid transparent',
              borderRadius: '4px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: timeframe === tf ? 'bold' : 'normal',
              transition: 'all 0.2s',
            }}
          >
            {TIMEFRAMES[tf].label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div style={{ flex: 1, position: 'relative', minHeight: '150px' }}>
        {filteredData.length < 2 ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            opacity: 0.5,
            fontSize: '0.9rem',
          }}>
            Collecting data...
          </div>
        ) : (
          <div style={{ display: 'flex', width: '100%', height: '100%' }}>
            {/* Y-axis labels (HTML, won't stretch) */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              paddingRight: '8px',
              paddingTop: '4px',
              paddingBottom: '24px',
              minWidth: '35px',
              textAlign: 'right',
            }}>
              <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>{unit}</span>
              {[...yTicks].reverse().map((tick, i) => (
                <span
                  key={`y-${i}`}
                  style={{
                    fontSize: '0.75rem',
                    color: 'rgba(255,255,255,0.6)',
                  }}
                >
                  {tick % 1 === 0 ? tick : tick.toFixed(1)}
                </span>
              ))}
            </div>

            {/* Chart area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* SVG chart */}
              <div style={{ flex: 1, position: 'relative' }}>
                <svg
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  style={{ width: '100%', height: '100%', display: 'block' }}
                >
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={fillColor || color} stopOpacity="0.4" />
                      <stop offset="100%" stopColor={fillColor || color} stopOpacity="0.05" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal grid lines */}
                  {yTicks.map((tick, i) => {
                    const yRatio = (tick - yMin) / (yMax - yMin);
                    const y = invertY ? yRatio * 100 : (1 - yRatio) * 100;
                    return (
                      <line
                        key={`grid-${i}`}
                        x1="0"
                        y1={y}
                        x2="100"
                        y2={y}
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="1"
                        vectorEffect="non-scaling-stroke"
                      />
                    );
                  })}

                  {/* Threshold line */}
                  {thresholdLine !== null && thresholdLine !== undefined && (() => {
                    const yRatio = (thresholdLine - yMin) / (yMax - yMin);
                    const y = invertY ? yRatio * 100 : (1 - yRatio) * 100;
                    return (
                      <line
                        x1="0"
                        y1={y}
                        x2="100"
                        y2={y}
                        stroke={thresholdColor}
                        strokeWidth="2"
                        strokeDasharray="6,4"
                        vectorEffect="non-scaling-stroke"
                      />
                    );
                  })()}

                  {/* Area fill */}
                  {(() => {
                    if (filteredData.length < 2) return null;
                    const sortedData = [...filteredData].sort((a, b) => a.timestamp - b.timestamp);
                    const points = sortedData.map(point => {
                      const xRatio = (point.timestamp - xMin) / (xMax - xMin);
                      const yRatio = (point.value - yMin) / (yMax - yMin);
                      const x = xRatio * 100;
                      const y = invertY ? yRatio * 100 : (1 - yRatio) * 100;
                      return { x, y };
                    });
                    const baseline = invertY ? 0 : 100;
                    let path = `M${points[0].x},${baseline}`;
                    points.forEach(p => { path += ` L${p.x},${p.y}`; });
                    path += ` L${points[points.length - 1].x},${baseline} Z`;
                    return <path d={path} fill={`url(#${gradientId})`} />;
                  })()}

                  {/* Data line */}
                  {(() => {
                    if (filteredData.length < 2) return null;
                    const sortedData = [...filteredData].sort((a, b) => a.timestamp - b.timestamp);
                    const pathData = sortedData.map((point, i) => {
                      const xRatio = (point.timestamp - xMin) / (xMax - xMin);
                      const yRatio = (point.value - yMin) / (yMax - yMin);
                      const x = xRatio * 100;
                      const y = invertY ? yRatio * 100 : (1 - yRatio) * 100;
                      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
                    }).join(' ');
                    return (
                      <path
                        d={pathData}
                        fill="none"
                        stroke={color}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                      />
                    );
                  })()}

                  {/* Current value dot */}
                  {filteredData.length > 0 && (() => {
                    const lastPoint = filteredData.reduce((a, b) =>
                      a.timestamp > b.timestamp ? a : b
                    );
                    const xRatio = (lastPoint.timestamp - xMin) / (xMax - xMin);
                    const yRatio = (lastPoint.value - yMin) / (yMax - yMin);
                    const x = xRatio * 100;
                    const y = invertY ? yRatio * 100 : (1 - yRatio) * 100;
                    return (
                      <circle
                        cx={x}
                        cy={y}
                        r="5"
                        fill={color}
                        stroke="#0a1929"
                        strokeWidth="2"
                        vectorEffect="non-scaling-stroke"
                      />
                    );
                  })()}
                </svg>
              </div>

              {/* X-axis labels (HTML, won't stretch) */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: '6px',
                height: '20px',
              }}>
                {xTicks.map((tick, i) => (
                  <span
                    key={`x-${i}`}
                    style={{
                      fontSize: '0.7rem',
                      color: 'rgba(255,255,255,0.5)',
                      textAlign: 'center',
                      flex: i === 0 || i === xTicks.length - 1 ? '0 0 auto' : '1',
                    }}
                  >
                    {formatTimeLabel(tick, timeFormat)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
