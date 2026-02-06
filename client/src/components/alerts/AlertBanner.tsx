import React from 'react';
import { theme } from '../../styles/theme';
import { TriggeredAlert, AlertSeverity } from '../../types/alerts';

interface AlertBannerProps {
  alert: TriggeredAlert;
  severity: AlertSeverity;
  onDismiss: () => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  alert,
  severity,
  onDismiss,
}) => {
  const isCritical = severity === 'critical';

  // Background colors with transparency
  const getBgColor = () => {
    switch (severity) {
      case 'info':
        return 'rgba(52, 152, 219, 0.95)'; // Blue
      case 'warning':
        return 'rgba(243, 156, 18, 0.95)'; // Orange
      case 'critical':
        return 'rgba(231, 76, 60, 0.95)'; // Red
    }
  };

  return (
    <div
      onClick={onDismiss}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: theme.space.sm,
        padding: `${theme.space.sm} ${theme.space.md}`,
        background: getBgColor(),
        borderRadius: theme.radius.md,
        boxShadow: theme.shadow.lg,
        cursor: 'pointer',
        animation: isCritical ? 'alertPulse 1s ease-in-out infinite' : 'slideDown 0.3s ease-out',
        transition: `transform ${theme.transition.fast}`,
        minWidth: '200px',
        maxWidth: '400px',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.02)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      {/* Content */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          fontWeight: theme.fontWeight.medium,
          color: '#fff',
          fontSize: theme.fontSize.sm,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {alert.message}
      </div>

      {/* Dismiss hint */}
      <div
        style={{
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: theme.fontSize.xs,
          flexShrink: 0,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </div>
    </div>
  );
};
