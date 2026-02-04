import React from 'react';
import { SearchResult } from '../../../services/geocoding';
import { CustomMarker, markerIcons } from './map-icons';
import { useSettings, windConversions } from '../../../context/SettingsContext';

interface DepthSettingsPanelProps {
  sidebarWidth: number;
  depthUnit: string;
  depthAlarm: number | null;
  soundAlarmEnabled: boolean;
  onSetDepthAlarm: (value: number | null) => void;
  onSetSoundAlarm: (enabled: boolean) => void;
  onClose: () => void;
}

export const DepthSettingsPanel: React.FC<DepthSettingsPanelProps> = ({
  sidebarWidth,
  depthUnit,
  depthAlarm,
  soundAlarmEnabled,
  onSetDepthAlarm,
  onSetSoundAlarm,
  onClose,
}) => {
  const settingsPanelWidth = 180;
  const alarmOptions = depthUnit === 'm' ? [1, 2, 3, 5, 10] : [3, 6, 10, 15, 30];

  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: '50%',
          transform: 'translateY(-50%)',
          right: `${sidebarWidth + 8}px`,
          width: `${settingsPanelWidth}px`,
          maxHeight: 'calc(100vh - 32px)',
          overflowY: 'auto',
          background: 'rgb(10, 25, 41)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '4px',
          padding: '1rem',
          zIndex: 1001,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '0.75rem' }}>
          DEPTH ALARM
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={() => onSetDepthAlarm(null)}
            style={{
              padding: '0.9rem 0.75rem',
              background:
                depthAlarm === null
                  ? 'rgba(25, 118, 210, 0.5)'
                  : 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '3px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '1.1rem',
              textAlign: 'left',
            }}
          >
            Off
          </button>
          {alarmOptions.map((alarmDepth) => (
            <button
              key={alarmDepth}
              onClick={() => onSetDepthAlarm(alarmDepth)}
              style={{
                padding: '0.9rem 0.75rem',
                background:
                  depthAlarm === alarmDepth
                    ? 'rgba(25, 118, 210, 0.5)'
                    : 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '3px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '1.1rem',
                textAlign: 'left',
              }}
            >
              &lt; {alarmDepth} {depthUnit}
            </button>
          ))}
        </div>

        <div
          style={{
            fontSize: '0.8rem',
            opacity: 0.6,
            marginBottom: '0.75rem',
            marginTop: '1rem',
          }}
        >
          SOUND
        </div>
        <button
          onClick={() => onSetSoundAlarm(!soundAlarmEnabled)}
          style={{
            width: '100%',
            padding: '0.9rem 0.75rem',
            background: soundAlarmEnabled
              ? 'rgba(25, 118, 210, 0.5)'
              : 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            borderRadius: '3px',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '1.1rem',
            textAlign: 'left',
          }}
        >
          {soundAlarmEnabled ? 'On' : 'Off'}
        </button>
      </div>

      {/* Click outside to close */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: sidebarWidth,
          bottom: 0,
          zIndex: 999,
        }}
      />
    </>
  );
};

interface SearchPanelProps {
  sidebarWidth: number;
  searchQuery: string;
  searchResults: SearchResult[];
  searchLoading: boolean;
  customMarkers: CustomMarker[];
  isOffline?: boolean;
  onSearchChange: (query: string) => void;
  onResultClick: (result: SearchResult) => void;
  onMarkerClick: (marker: CustomMarker) => void;
  onClose: () => void;
}

interface AutopilotPanelProps {
  sidebarWidth: number;
  targetHeading: number;
  isActive: boolean;
  hasActiveNavigation: boolean;
  followingRoute: boolean;
  currentBearing?: number | null;
  onSetHeading: (heading: number) => void;
  onToggleActive: () => void;
  onToggleFollowRoute: () => void;
  onClose: () => void;
}

export const AutopilotPanel: React.FC<AutopilotPanelProps> = ({
  sidebarWidth,
  targetHeading,
  isActive,
  hasActiveNavigation,
  followingRoute,
  currentBearing,
  onSetHeading,
  onToggleActive,
  onToggleFollowRoute,
  onClose,
}) => {
  const settingsPanelWidth = 200;

  const adjustHeading = (delta: number) => {
    // Turn off follow mode when manually adjusting
    if (followingRoute) {
      onToggleFollowRoute();
    }
    let newHeading = targetHeading + delta;
    if (newHeading >= 360) newHeading -= 360;
    if (newHeading < 0) newHeading += 360;
    onSetHeading(newHeading);
  };

  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: '50%',
          transform: 'translateY(-50%)',
          right: `${sidebarWidth + 8}px`,
          width: `${settingsPanelWidth}px`,
          maxHeight: 'calc(100vh - 32px)',
          overflowY: 'auto',
          background: 'rgb(10, 25, 41)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '4px',
          padding: '1rem',
          zIndex: 1001,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '0.75rem' }}>
          AUTOPILOT
        </div>

        {/* Heading display */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: '1rem',
            padding: '0.75rem',
            background: isActive ? 'rgba(39, 174, 96, 0.2)' : 'rgba(255, 255, 255, 0.05)',
            borderRadius: '4px',
            border: isActive ? '1px solid rgba(39, 174, 96, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <div style={{ fontSize: '0.65rem', opacity: 0.6, marginBottom: '0.25rem' }}>
            SET COURSE
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
            {targetHeading.toFixed(0)}°
          </div>
        </div>

        {/* Adjustment buttons - minus on left, plus on right */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
          {/* Minus buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
            <button
              onClick={() => adjustHeading(-1)}
              style={{
                padding: '0.6rem',
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '3px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              -1°
            </button>
            <button
              onClick={() => adjustHeading(-10)}
              style={{
                padding: '0.6rem',
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '3px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              -10°
            </button>
          </div>
          {/* Plus buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
            <button
              onClick={() => adjustHeading(1)}
              style={{
                padding: '0.6rem',
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '3px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              +1°
            </button>
            <button
              onClick={() => adjustHeading(10)}
              style={{
                padding: '0.6rem',
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '3px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              +10°
            </button>
          </div>
        </div>

        {/* Follow Route toggle - show when navigation is active */}
        {hasActiveNavigation && currentBearing !== null && currentBearing !== undefined && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.5rem 0',
              marginBottom: '0.5rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div>
              <div style={{ fontSize: '0.9rem' }}>
                Follow Route
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>
                {currentBearing.toFixed(0)}°
              </div>
            </div>
            <button
              onClick={onToggleFollowRoute}
              style={{
                width: '56px',
                height: '32px',
                borderRadius: '16px',
                border: 'none',
                background: followingRoute ? 'rgba(39, 174, 96, 0.8)' : 'rgba(255, 255, 255, 0.2)',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.2s',
              }}
            >
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: '#fff',
                  position: 'absolute',
                  top: '3px',
                  left: followingRoute ? '27px' : '3px',
                  transition: 'left 0.2s',
                }}
              />
            </button>
          </div>
        )}

        {/* Activate/Deactivate button */}
        <button
          onClick={onToggleActive}
          style={{
            width: '100%',
            padding: '0.75rem',
            background: isActive ? 'rgba(239, 83, 80, 0.3)' : 'rgba(39, 174, 96, 0.3)',
            border: `1px solid ${isActive ? 'rgba(239, 83, 80, 0.5)' : 'rgba(39, 174, 96, 0.5)'}`,
            borderRadius: '3px',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          {isActive ? 'DEACTIVATE' : 'ACTIVATE'}
        </button>
      </div>

      {/* Click outside to close */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: sidebarWidth,
          bottom: 0,
          zIndex: 999,
        }}
      />
    </>
  );
};

// Weather forecast panel
interface WeatherPanelProps {
  sidebarWidth: number;
  enabled: boolean;
  forecastHour: number;
  loading?: boolean;
  error?: string | null;
  onToggleEnabled: () => void;
  onSetForecastHour: (hour: number) => void;
  onClose: () => void;
}

// Forecast time options (2x5 grid = 10 buttons)
const FORECAST_OPTIONS = [
  { hour: -1, label: 'Off' },
  { hour: 0, label: 'Now' },
  { hour: 1, label: '+1h' },
  { hour: 3, label: '+3h' },
  { hour: 6, label: '+6h' },
  { hour: 12, label: '+12h' },
  { hour: 24, label: '+1d' },
  { hour: 48, label: '+2d' },
  { hour: 72, label: '+3d' },
  { hour: 168, label: '+7d' },
];

export const WeatherPanel: React.FC<WeatherPanelProps> = ({
  sidebarWidth,
  enabled,
  forecastHour,
  loading = false,
  error = null,
  onToggleEnabled,
  onSetForecastHour,
  onClose,
}) => {
  const settingsPanelWidth = 280;
  const { windUnit } = useSettings();

  const handleSelect = (hour: number) => {
    if (hour === -1) {
      // Turn off
      if (enabled) onToggleEnabled();
    } else {
      // Turn on and set hour
      if (!enabled) onToggleEnabled();
      onSetForecastHour(hour);
    }
  };

  const isSelected = (hour: number) => {
    if (hour === -1) return !enabled;
    return enabled && forecastHour === hour;
  };

  // Wind speed legend ranges with nice round numbers per unit
  const legendRanges: Record<string, string[]> = {
    'kt': ['<10', '10-20', '20-30', '30-40', '40+'],
    'km/h': ['<20', '20-35', '35-55', '55-75', '75+'],
    'mph': ['<15', '15-25', '25-35', '35-45', '45+'],
    'm/s': ['<5', '5-10', '10-15', '15-20', '20+'],
    'bft': ['0-3', '3-5', '5-6', '6-8', '8+'],
  };

  const unitLabel = windConversions[windUnit].label;
  const ranges = legendRanges[windUnit] || legendRanges['kt'];

  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: '50%',
          transform: 'translateY(-50%)',
          right: `${sidebarWidth + 8}px`,
          width: `${settingsPanelWidth}px`,
          maxHeight: 'calc(100vh - 32px)',
          overflowY: 'auto',
          background: 'rgb(10, 25, 41)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '4px',
          padding: '1rem',
          zIndex: 1001,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '0.75rem' }}>
          WIND FORECAST
        </div>

        {/* Status indicator */}
        {loading && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.75rem',
            padding: '0.4rem 0.6rem',
            background: 'rgba(79, 195, 247, 0.15)',
            borderRadius: '4px',
            fontSize: '0.7rem',
            color: '#4FC3F7',
          }}>
            <div
              style={{
                width: '10px',
                height: '10px',
                border: '2px solid rgba(79, 195, 247, 0.3)',
                borderTopColor: '#4FC3F7',
                borderRadius: '50%',
                animation: 'weather-spin 1s linear infinite',
              }}
            />
            Loading...
          </div>
        )}
        {error && !loading && (
          <div style={{
            marginBottom: '0.75rem',
            padding: '0.4rem 0.6rem',
            background: 'rgba(255, 152, 0, 0.15)',
            borderRadius: '4px',
            fontSize: '0.65rem',
            color: '#FF9800',
          }}>
            {error}
          </div>
        )}

        {/* 2x5 Grid of time buttons */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '0.4rem',
          marginBottom: '1rem',
        }}>
          {FORECAST_OPTIONS.map((opt) => (
            <button
              key={opt.hour}
              onClick={() => handleSelect(opt.hour)}
              style={{
                padding: '0.6rem 0.25rem',
                borderRadius: '3px',
                border: 'none',
                background: isSelected(opt.hour) ? 'rgba(25, 118, 210, 0.5)' : 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div style={{
          paddingTop: '0.75rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          <div style={{ fontSize: '0.6rem', opacity: 0.5, marginBottom: '0.4rem' }}>
            Wind speed ({unitLabel})
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.6rem',
            color: 'rgba(255, 255, 255, 0.7)',
          }}>
            <span><span style={{ color: '#4FC3F7' }}>●</span> {ranges[0]}</span>
            <span><span style={{ color: '#4CAF50' }}>●</span> {ranges[1]}</span>
            <span><span style={{ color: '#FFEB3B' }}>●</span> {ranges[2]}</span>
            <span><span style={{ color: '#FF9800' }}>●</span> {ranges[3]}</span>
            <span><span style={{ color: '#F44336' }}>●</span> {ranges[4]}</span>
          </div>
        </div>

        {/* Attribution */}
        <div style={{
          marginTop: '0.75rem',
          paddingTop: '0.5rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          fontSize: '0.55rem',
          opacity: 0.5,
          textAlign: 'center',
        }}>
          Powered by Open-Meteo.com
        </div>

        <style>{`
          @keyframes weather-spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>

      {/* Click outside to close */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: sidebarWidth,
          bottom: 0,
          zIndex: 999,
        }}
      />
    </>
  );
};

export const SearchPanel: React.FC<SearchPanelProps> = ({
  sidebarWidth,
  searchQuery,
  searchResults,
  searchLoading,
  customMarkers,
  isOffline = false,
  onSearchChange,
  onResultClick,
  onMarkerClick,
  onClose,
}) => {
  const getMatchingMarkers = (query: string): CustomMarker[] => {
    const lowerQuery = query.toLowerCase().trim();
    if (lowerQuery.length < 2) return [];
    return customMarkers.filter((marker) =>
      marker.name.toLowerCase().includes(lowerQuery)
    );
  };

  const matchingMarkers = getMatchingMarkers(searchQuery);

  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: '50%',
          transform: 'translateY(-50%)',
          right: `${sidebarWidth + 8}px`,
          width: '300px',
          maxHeight: 'calc(100vh - 32px)',
          background: 'rgb(10, 25, 41)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '4px',
          padding: '1rem',
          zIndex: 1001,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        <div style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '0.25rem' }}>
          SEARCH LOCATIONS
        </div>

        {/* Offline notice */}
        {isOffline && (
          <div
            style={{
              padding: '0.5rem 0.75rem',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '3px',
              fontSize: '0.75rem',
              color: 'rgba(239, 68, 68, 0.9)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
              <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
              <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
              <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
              <line x1="12" y1="20" x2="12.01" y2="20" />
            </svg>
            Offline - only marker search available
          </div>
        )}

        {/* Search input */}
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Type to search (min 2 chars)..."
            style={{
              width: '100%',
              padding: '0.75rem',
              paddingRight: searchLoading ? '2.5rem' : '0.75rem',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '3px',
              color: '#fff',
              fontSize: '0.9rem',
              outline: 'none',
            }}
            autoFocus
          />
          {searchLoading && (
            <div
              style={{
                position: 'absolute',
                right: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '0.8rem',
                opacity: 0.6,
              }}
            >
              ...
            </div>
          )}
        </div>

        {/* Search results */}
        <div
          className="chart-search-results"
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            paddingRight: '8px',
            marginRight: '-4px',
          }}
        >
          {/* Custom markers section */}
          {searchQuery && matchingMarkers.length > 0 && (
            <>
              <div
                style={{
                  fontSize: '0.7rem',
                  opacity: 0.5,
                  marginBottom: '0.25rem',
                  marginTop: '0.25rem',
                }}
              >
                YOUR MARKERS
              </div>
              {matchingMarkers.map((marker) => (
                <button
                  key={`marker-${marker.id}`}
                  onClick={() => onMarkerClick(marker)}
                  className="touch-btn"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: `1px solid ${marker.color}`,
                    borderRadius: '3px',
                    color: '#fff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill={marker.color}
                    stroke="#fff"
                    strokeWidth="1.5"
                  >
                    <path d={markerIcons[marker.icon] || markerIcons.pin} />
                  </svg>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{marker.name}</div>
                    <div style={{ opacity: 0.5, fontSize: '0.7rem' }}>
                      {marker.lat.toFixed(4)}, {marker.lon.toFixed(4)}
                    </div>
                  </div>
                </button>
              ))}
            </>
          )}

          {/* Geocoding results section */}
          {searchQuery && searchResults.length > 0 && (
            <div
              style={{
                fontSize: '0.7rem',
                opacity: 0.5,
                marginBottom: '0.25rem',
                marginTop: '0.5rem',
              }}
            >
              LOCATIONS
            </div>
          )}
          {searchLoading && searchQuery && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2rem',
                  gap: '0.75rem',
                }}
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
                <div style={{ opacity: 0.6, fontSize: '0.85rem' }}>
                  Searching...
                </div>
              </div>
            )}
          {searchResults.length === 0 &&
            matchingMarkers.length === 0 &&
            !searchLoading &&
            searchQuery && (
              <div
                style={{
                  opacity: 0.6,
                  fontSize: '0.85rem',
                  textAlign: 'center',
                  padding: '1rem',
                }}
              >
                No results found
              </div>
            )}
          {searchResults.map((result, index) => (
            <button
              key={`${result.lat}-${result.lon}-${index}`}
              onClick={() => onResultClick(result)}
              className="touch-btn"
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '3px',
                color: '#fff',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '0.85rem',
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                {result.display_name.split(',')[0]}
              </div>
              <div style={{ opacity: 0.7, fontSize: '0.75rem' }}>
                {result.display_name.split(',').slice(1).join(',').trim()}
              </div>
              <div style={{ opacity: 0.5, fontSize: '0.7rem', marginTop: '0.25rem' }}>
                {result.type}
              </div>
            </button>
          ))}
        </div>

        {/* Attribution */}
        <div style={{
          marginTop: '0.5rem',
          paddingTop: '0.5rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          fontSize: '0.55rem',
          opacity: 0.5,
          textAlign: 'center',
        }}>
          Search powered by Photon (© OpenStreetMap)
        </div>
      </div>

      {/* Click outside to close */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: sidebarWidth,
          bottom: 0,
          zIndex: 999,
        }}
      />

      {/* Spinner animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
};
