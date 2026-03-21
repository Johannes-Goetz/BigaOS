import React from 'react';
import { ViewType } from '../../types/dashboard';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';

interface DashboardItemProps {
  children: React.ReactNode;
  targetView: ViewType;
  onNavigate: (view: ViewType) => void;
  editMode?: boolean;
  onDelete?: () => void;
  onTap?: () => void;
  onSettings?: () => void;
}

export const DashboardItem: React.FC<DashboardItemProps> = ({
  children,
  targetView,
  onNavigate,
  editMode = false,
  onDelete,
  onTap,
  onSettings,
}) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const handleClick = () => {
    if (editMode) {
      return;
    }
    if (onTap) {
      onTap();
      return;
    }
    onNavigate(targetView);
  };

  const handleDeleteMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };

  const handleDeleteClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onDelete) {
      onDelete();
    }
  };

  return (
    <div
      onClick={handleClick}
      className={editMode ? '' : 'touch-btn'}
      style={{
        width: '100%',
        height: '100%',
        background: editMode ? theme.colors.bgCardHover : theme.colors.bgCard,
        backdropFilter: 'blur(10px)',
        borderRadius: theme.radius.md,
        border: editMode
          ? `2px dashed ${theme.colors.primaryMedium}`
          : `1px solid ${theme.colors.border}`,
        cursor: editMode ? 'move' : 'pointer',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: `border ${theme.transition.normal}, background ${theme.transition.normal}`,
        position: 'relative',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: editMode ? 'none' : 'auto',
      }}
    >
      {/* Content */}
      <div style={{ width: '100%', height: '100%', position: 'relative', zIndex: 1, containerType: 'size' as any }}>
        {children}
      </div>

      {/* Settings Button (only in edit mode, for switch items) */}
      {editMode && onSettings && (
        <button
          onMouseDown={handleDeleteMouseDown}
          onTouchStart={handleDeleteMouseDown}
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onSettings(); }}
          onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); onSettings(); }}
          className="touch-btn"
          style={{
            position: 'absolute',
            top: theme.space.sm,
            left: theme.space.sm,
            width: '36px',
            height: '36px',
            borderRadius: theme.radius.sm,
            background: theme.colors.primaryMedium,
            border: `2px solid ${theme.colors.borderFocus}`,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: theme.zIndex.tooltip,
            boxShadow: theme.shadow.md,
          }}
          title={t('common.settings')}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      )}

      {/* Delete Button (only in edit mode) */}
      {editMode && onDelete && (
        <button
          onMouseDown={handleDeleteMouseDown}
          onTouchStart={handleDeleteMouseDown}
          onClick={handleDeleteClick}
          onTouchEnd={handleDeleteClick}
          className="touch-btn"
          style={{
            position: 'absolute',
            top: theme.space.sm,
            right: theme.space.sm,
            width: '36px',
            height: '36px',
            borderRadius: theme.radius.sm,
            background: theme.colors.errorSolid,
            border: `2px solid ${theme.colors.borderFocus}`,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: theme.zIndex.tooltip,
            boxShadow: theme.shadow.md,
          }}
          title={t('dashboard.delete_widget')}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      )}
    </div>
  );
};
