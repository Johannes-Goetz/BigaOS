import React from 'react';
import { theme } from '../../../styles/theme';

interface SpeedItemProps {
  speed: number;
}

export const SpeedItem: React.FC<SpeedItemProps> = ({ speed }) => {
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
        Speed
      </div>
      <div style={{
        fontSize: theme.fontSize['3xl'],
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.dataSpeed,
        lineHeight: 1,
        marginTop: theme.space.xs,
      }}>
        {speed.toFixed(1)}
      </div>
      <div style={{ fontSize: theme.fontSize.md, color: theme.colors.textMuted }}>kts</div>
    </div>
  );
};
