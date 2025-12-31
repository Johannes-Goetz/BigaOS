import React from 'react';
import {
  useSettings,
  SpeedUnit,
  DepthUnit,
  DistanceUnit,
  TimeFormat,
  speedConversions,
  depthConversions,
  distanceConversions,
} from '../../context/SettingsContext';
import { theme } from '../../styles/theme';

interface SettingsViewProps {
  onClose: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onClose }) => {
  const {
    speedUnit,
    depthUnit,
    distanceUnit,
    timeFormat,
    setSpeedUnit,
    setDepthUnit,
    setDistanceUnit,
    setTimeFormat,
    mapTileUrls,
    setMapTileUrls,
    apiUrls,
    setApiUrls,
  } = useSettings();

  const renderUnitSelector = <T extends string>(
    label: string,
    currentValue: T,
    options: T[],
    labels: Record<T, string>,
    onChange: (value: T) => void
  ) => (
    <div style={{ marginBottom: theme.space.xl }}>
      <div style={{
        fontSize: theme.fontSize.sm,
        color: theme.colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginBottom: theme.space.md,
      }}>
        {label}
      </div>
      <div style={{
        display: 'flex',
        gap: theme.space.sm,
        flexWrap: 'wrap',
      }}>
        {options.map((option) => (
          <button
            key={option}
            onClick={() => onChange(option)}
            style={{
              flex: '1 1 auto',
              minWidth: '70px',
              padding: theme.space.lg,
              background: currentValue === option ? theme.colors.primaryMedium : theme.colors.bgCardActive,
              border: currentValue === option ? `2px solid ${theme.colors.primary}` : '2px solid transparent',
              borderRadius: theme.radius.md,
              color: theme.colors.textPrimary,
              cursor: 'pointer',
              fontSize: theme.fontSize.base,
              fontWeight: currentValue === option ? theme.fontWeight.bold : theme.fontWeight.normal,
              transition: `all ${theme.transition.normal}`,
            }}
          >
            {labels[option]}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: theme.colors.bgPrimary,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: theme.space.lg,
        borderBottom: `1px solid ${theme.colors.border}`,
      }}>
        <h1 style={{ fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, margin: 0 }}>Settings</h1>
        <button
          onClick={onClose}
          style={{
            background: theme.colors.bgCardActive,
            border: 'none',
            color: theme.colors.textPrimary,
            cursor: 'pointer',
            padding: theme.space.md,
            borderRadius: theme.radius.md,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </button>
      </div>

      {/* Settings content */}
      <div style={{
        flex: 1,
        padding: theme.space.xl,
        overflowY: 'auto',
      }}>
        {/* Units section */}
        <div style={{
          marginBottom: theme.space['2xl'],
        }}>
          <div style={{
            fontSize: theme.fontSize.base,
            fontWeight: theme.fontWeight.bold,
            marginBottom: theme.space.lg,
            display: 'flex',
            alignItems: 'center',
            gap: theme.space.sm,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="21" y1="10" x2="3" y2="10" />
              <line x1="21" y1="6" x2="3" y2="6" />
              <line x1="21" y1="14" x2="3" y2="14" />
              <line x1="21" y1="18" x2="3" y2="18" />
            </svg>
            Units
          </div>

          {renderUnitSelector<SpeedUnit>(
            'Speed',
            speedUnit,
            ['kt', 'km/h', 'mph', 'm/s'],
            {
              'kt': speedConversions['kt'].label,
              'km/h': speedConversions['km/h'].label,
              'mph': speedConversions['mph'].label,
              'm/s': speedConversions['m/s'].label,
            },
            setSpeedUnit
          )}

          {renderUnitSelector<DepthUnit>(
            'Depth',
            depthUnit,
            ['m', 'ft'],
            {
              'm': depthConversions['m'].label,
              'ft': depthConversions['ft'].label,
            },
            setDepthUnit
          )}

          {renderUnitSelector<DistanceUnit>(
            'Distance',
            distanceUnit,
            ['nm', 'km', 'mi'],
            {
              'nm': distanceConversions['nm'].label,
              'km': distanceConversions['km'].label,
              'mi': distanceConversions['mi'].label,
            },
            setDistanceUnit
          )}

          {renderUnitSelector<TimeFormat>(
            'Time Format',
            timeFormat,
            ['24h', '12h'],
            {
              '24h': '24h',
              '12h': 'AM/PM',
            },
            setTimeFormat
          )}
        </div>

        {/* Maps & Tiles section */}
        <div style={{
          marginBottom: theme.space['2xl'],
        }}>
          <div style={{
            fontSize: theme.fontSize.base,
            fontWeight: theme.fontWeight.bold,
            marginBottom: theme.space.lg,
            display: 'flex',
            alignItems: 'center',
            gap: theme.space.sm,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
              <line x1="8" y1="2" x2="8" y2="18" />
              <line x1="16" y1="6" x2="16" y2="22" />
            </svg>
            Maps & Tiles
          </div>

          {/* Street Map Tile URL */}
          <div style={{ marginBottom: theme.space.xl }}>
            <div style={{
              fontSize: theme.fontSize.sm,
              color: theme.colors.textMuted,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: theme.space.md,
            }}>
              Street Map Tile URL
            </div>
            <input
              type="text"
              value={mapTileUrls.streetMap}
              onChange={(e) => setMapTileUrls({ ...mapTileUrls, streetMap: e.target.value })}
              style={{
                width: '100%',
                padding: theme.space.lg,
                background: theme.colors.bgCardActive,
                border: `2px solid ${theme.colors.border}`,
                borderRadius: theme.radius.md,
                color: theme.colors.textPrimary,
                fontSize: theme.fontSize.sm,
                fontFamily: 'monospace',
              }}
              placeholder="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </div>

          {/* Satellite Map Tile URL */}
          <div style={{ marginBottom: theme.space.xl }}>
            <div style={{
              fontSize: theme.fontSize.sm,
              color: theme.colors.textMuted,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: theme.space.md,
            }}>
              Satellite Map Tile URL
            </div>
            <input
              type="text"
              value={mapTileUrls.satelliteMap}
              onChange={(e) => setMapTileUrls({ ...mapTileUrls, satelliteMap: e.target.value })}
              style={{
                width: '100%',
                padding: theme.space.lg,
                background: theme.colors.bgCardActive,
                border: `2px solid ${theme.colors.border}`,
                borderRadius: theme.radius.md,
                color: theme.colors.textPrimary,
                fontSize: theme.fontSize.sm,
                fontFamily: 'monospace',
              }}
              placeholder="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </div>

          {/* Nautical Overlay Tile URL */}
          <div style={{ marginBottom: theme.space.xl }}>
            <div style={{
              fontSize: theme.fontSize.sm,
              color: theme.colors.textMuted,
              textTransform: '0.1em',
              letterSpacing: '0.1em',
              marginBottom: theme.space.md,
            }}>
              Nautical Overlay Tile URL
            </div>
            <input
              type="text"
              value={mapTileUrls.nauticalOverlay}
              onChange={(e) => setMapTileUrls({ ...mapTileUrls, nauticalOverlay: e.target.value })}
              style={{
                width: '100%',
                padding: theme.space.lg,
                background: theme.colors.bgCardActive,
                border: `2px solid ${theme.colors.border}`,
                borderRadius: theme.radius.md,
                color: theme.colors.textPrimary,
                fontSize: theme.fontSize.sm,
                fontFamily: 'monospace',
              }}
              placeholder="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png"
            />
          </div>

          {/* Reset to defaults button */}
          <button
            onClick={() => setMapTileUrls({
              streetMap: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
              satelliteMap: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
              nauticalOverlay: 'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png',
            })}
            style={{
              padding: `${theme.space.md} ${theme.space.lg}`,
              background: theme.colors.bgCardActive,
              border: `2px solid ${theme.colors.border}`,
              borderRadius: theme.radius.md,
              color: theme.colors.textPrimary,
              cursor: 'pointer',
              fontSize: theme.fontSize.sm,
              fontWeight: theme.fontWeight.normal,
              transition: `all ${theme.transition.normal}`,
            }}
          >
            Reset to Defaults
          </button>
        </div>

        {/* API URLs section */}
        <div style={{
          marginBottom: theme.space['2xl'],
        }}>
          <div style={{
            fontSize: theme.fontSize.base,
            fontWeight: theme.fontWeight.bold,
            marginBottom: theme.space.lg,
            display: 'flex',
            alignItems: 'center',
            gap: theme.space.sm,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            API Endpoints
          </div>

          {/* Photon/Geocoding URL */}
          <div style={{ marginBottom: theme.space.xl }}>
            <div style={{
              fontSize: theme.fontSize.sm,
              color: theme.colors.textMuted,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: theme.space.md,
            }}>
              Geocoding API URL
            </div>
            <input
              type="text"
              value={apiUrls.nominatimUrl}
              onChange={(e) => setApiUrls({ ...apiUrls, nominatimUrl: e.target.value })}
              style={{
                width: '100%',
                padding: theme.space.lg,
                background: theme.colors.bgCardActive,
                border: `2px solid ${theme.colors.border}`,
                borderRadius: theme.radius.md,
                color: theme.colors.textPrimary,
                fontSize: theme.fontSize.sm,
                fontFamily: 'monospace',
              }}
              placeholder="https://photon.komoot.io"
            />
            <div style={{
              fontSize: theme.fontSize.xs,
              color: theme.colors.textMuted,
              marginTop: theme.space.sm,
              opacity: 0.7,
            }}>
              Used for location search (harbors, cities, POIs). Default uses Photon (free, CORS-enabled). Can be changed to Nominatim or other geocoding service.
            </div>
          </div>

          {/* Reset to defaults button */}
          <button
            onClick={() => setApiUrls({
              nominatimUrl: 'https://photon.komoot.io',
            })}
            style={{
              padding: `${theme.space.md} ${theme.space.lg}`,
              background: theme.colors.bgCardActive,
              border: `2px solid ${theme.colors.border}`,
              borderRadius: theme.radius.md,
              color: theme.colors.textPrimary,
              cursor: 'pointer',
              fontSize: theme.fontSize.sm,
              fontWeight: theme.fontWeight.normal,
              transition: `all ${theme.transition.normal}`,
            }}
          >
            Reset to Defaults
          </button>
        </div>

        {/* Info section */}
        <div style={{
          padding: theme.space.lg,
          background: theme.colors.bgCard,
          borderRadius: theme.radius.md,
          fontSize: theme.fontSize.md,
          color: theme.colors.textSecondary,
        }}>
          <div style={{ marginBottom: theme.space.sm, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary }}>About Settings</div>
          <p style={{ margin: 0, lineHeight: 1.5, marginBottom: theme.space.md }}>
            <strong>Units:</strong> Changing units here will update all displays across the application.
            The depth alarm will be reset when changing depth units to avoid confusion.
          </p>
          <p style={{ margin: 0, lineHeight: 1.5, marginBottom: theme.space.md }}>
            <strong>Map Tiles:</strong> Configure custom tile server URLs for maps. Use standard XYZ tile format with placeholders:
            {'{z}'} for zoom, {'{x}'}/{'{y}'} for coordinates, and {'{s}'} for subdomains (if applicable).
          </p>
          <p style={{ margin: 0, lineHeight: 1.5 }}>
            <strong>API Endpoints:</strong> Customize external service endpoints. The geocoding URL is used for location search (harbors, cities, POIs).
            Default uses Photon (free, CORS-enabled). You can change to Nominatim or your own geocoding server. All settings sync across connected devices.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: theme.space.lg,
        borderTop: `1px solid ${theme.colors.border}`,
        textAlign: 'center',
        fontSize: theme.fontSize.sm,
        color: theme.colors.textMuted,
      }}>
        BigaOS v1.0
      </div>
    </div>
  );
};
