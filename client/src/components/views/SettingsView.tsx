import React from 'react';
import {
  useSettings,
  SpeedUnit,
  DepthUnit,
  DistanceUnit,
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
    setSpeedUnit,
    setDepthUnit,
    setDistanceUnit,
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
        </div>

        {/* Info section */}
        <div style={{
          padding: theme.space.lg,
          background: theme.colors.bgCard,
          borderRadius: theme.radius.md,
          fontSize: theme.fontSize.md,
          color: theme.colors.textSecondary,
        }}>
          <div style={{ marginBottom: theme.space.sm, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary }}>About Units</div>
          <p style={{ margin: 0, lineHeight: 1.5 }}>
            Changing units here will update all displays across the application.
            The depth alarm will be reset when changing depth units to avoid confusion.
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
