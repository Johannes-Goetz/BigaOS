import React from 'react';
import { theme } from '../../../styles/theme';

interface COGItemProps {
  cog: number;
}

export const COGItem: React.FC<COGItemProps> = ({ cog }) => {
  const getCardinalDirection = (deg: number): string => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(deg / 45) % 8;
    return directions[index];
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
        COG
      </div>
      <div style={{
        fontSize: theme.fontSize['3xl'],
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.dataCog,
        lineHeight: 1,
        marginTop: theme.space.xs,
      }}>
        {cog.toFixed(0)}°
      </div>
      <div style={{ fontSize: theme.fontSize.md, color: theme.colors.textMuted }}>{getCardinalDirection(cog)}</div>
    </div>
  );
};
