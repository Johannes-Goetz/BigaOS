import React from 'react';
import { theme } from '../../../styles/theme';

interface BatteryItemProps {
  voltage: number;
  stateOfCharge: number;
}

export const BatteryItem: React.FC<BatteryItemProps> = ({ voltage, stateOfCharge }) => {
  const getBatteryColor = (soc: number): string => {
    if (soc < 20) return theme.colors.error;
    if (soc < 50) return theme.colors.warning;
    return theme.colors.success;
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      padding: theme.space.lg,
    }}>
      <div style={{
        fontSize: theme.fontSize.sm,
        color: theme.colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
      }}>
        Battery
      </div>
      <div style={{
        fontSize: theme.fontSize['2xl'],
        fontWeight: theme.fontWeight.bold,
        color: getBatteryColor(stateOfCharge),
        lineHeight: 1,
        marginTop: theme.space.xs,
      }}>
        {stateOfCharge.toFixed(0)}%
      </div>
      <div style={{ fontSize: theme.fontSize.md, color: theme.colors.textMuted }}>{voltage.toFixed(1)}V</div>
    </div>
  );
};
