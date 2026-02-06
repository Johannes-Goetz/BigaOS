import React, { useState } from 'react';
import { theme } from '../../styles/theme';
import { useSettings, windConversions, speedConversions, depthConversions, temperatureConversions } from '../../context/SettingsContext';
import { useAlerts } from '../../context/AlertContext';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  AlertDefinition,
  OPERATOR_LABELS,
  getSeverityColor,
  isWeatherDataSource,
  getUnitForDataSource,
  getDataSourceLabel,
} from '../../types/alerts';
import { AlertEditDialog } from './AlertEditDialog';

export const AlertsTab: React.FC = () => {
  const {
    alertSettings,
    windUnit,
    speedUnit,
    depthUnit,
    temperatureUnit,
  } = useSettings();
  const { toggleAlert, deleteAlert, createAlert, updateAlert, setGlobalEnabled } = useAlerts();
  const { t } = useLanguage();
  const [editingAlert, setEditingAlert] = useState<AlertDefinition | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const formatCondition = (alert: AlertDefinition) => {
    const sourceLabel = getDataSourceLabel(alert.dataSource, t);
    const unit = getUnitForDataSource(
      alert.dataSource,
      windConversions[windUnit].label,
      speedConversions[speedUnit].label,
      depthConversions[depthUnit].label,
      temperatureConversions[temperatureUnit].label
    );
    const operatorLabel = OPERATOR_LABELS[alert.operator];
    // Threshold is already in user's display units (server converts internally)
    const thresholdStr = alert.threshold.toFixed(1);

    if (isWeatherDataSource(alert.dataSource) && alert.forecastHours) {
      return `${sourceLabel} ${operatorLabel} ${thresholdStr}${unit} in ${alert.forecastHours}h`;
    }
    return `${sourceLabel} ${operatorLabel} ${thresholdStr}${unit}`;
  };

  const handleToggleGlobal = (enabled: boolean) => {
    setGlobalEnabled(enabled);
  };

  const renderAlertItem = (alert: AlertDefinition) => {
    const severityColor = getSeverityColor(alert.severity);

    return (
      <div
        key={alert.id}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: theme.space.md,
          background: theme.colors.bgCard,
          borderRadius: theme.radius.md,
          borderLeft: `3px solid ${severityColor}`,
          marginBottom: theme.space.sm,
          opacity: alertSettings.globalEnabled ? 1 : 0.5,
        }}
      >
        {/* Toggle */}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            marginRight: theme.space.md,
          }}
        >
          <input
            type="checkbox"
            checked={alert.enabled}
            onChange={(e) => toggleAlert(alert.id, e.target.checked)}
            disabled={!alertSettings.globalEnabled}
            style={{
              width: '18px',
              height: '18px',
              cursor: 'pointer',
            }}
          />
        </label>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.space.sm,
              marginBottom: theme.space.xs,
            }}
          >
            <span
              style={{
                fontWeight: theme.fontWeight.semibold,
                color: theme.colors.textPrimary,
                fontSize: theme.fontSize.md,
              }}
            >
              {alert.name}
            </span>
            <span
              style={{
                fontSize: theme.fontSize.xs,
                padding: `2px ${theme.space.xs}`,
                borderRadius: theme.radius.sm,
                background: `${severityColor}30`,
                color: severityColor,
                textTransform: 'uppercase',
              }}
            >
              {alert.severity}
            </span>
          </div>
          <div
            style={{
              fontSize: theme.fontSize.sm,
              color: theme.colors.textMuted,
            }}
          >
            {formatCondition(alert)}
          </div>
        </div>

        {/* Edit Button */}
        <button
          onClick={() => setEditingAlert(alert)}
          style={{
            padding: `${theme.space.sm} ${theme.space.lg}`,
            background: 'transparent',
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.radius.md,
            color: theme.colors.textSecondary,
            fontSize: theme.fontSize.md,
            cursor: 'pointer',
            transition: `all ${theme.transition.fast}`,
            marginRight: theme.space.sm,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = theme.colors.bgCardHover;
            e.currentTarget.style.borderColor = theme.colors.borderHover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = theme.colors.border;
          }}
        >
          {t('common.edit')}
        </button>

        {/* Delete Button */}
        <button
          onClick={() => deleteAlert(alert.id)}
          style={{
            padding: `${theme.space.sm} ${theme.space.md}`,
            background: 'transparent',
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.radius.md,
            color: theme.colors.textMuted,
            fontSize: theme.fontSize.md,
            cursor: 'pointer',
            transition: `all ${theme.transition.fast}`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = `${theme.colors.error}20`;
            e.currentTarget.style.borderColor = theme.colors.error;
            e.currentTarget.style.color = theme.colors.error;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = theme.colors.border;
            e.currentTarget.style.color = theme.colors.textMuted;
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    );
  };

  return (
    <div>
      {/* Global Toggle */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: theme.space.lg,
          background: theme.colors.bgCard,
          borderRadius: theme.radius.md,
          marginBottom: theme.space.xl,
        }}
      >
        <div>
          <div
            style={{
              fontWeight: theme.fontWeight.semibold,
              color: theme.colors.textPrimary,
              fontSize: theme.fontSize.md,
              marginBottom: theme.space.xs,
            }}
          >
            {t('alerts.enable_alerts')}
          </div>
          <div
            style={{
              fontSize: theme.fontSize.sm,
              color: theme.colors.textMuted,
            }}
          >
            {t('alerts.master_toggle')}
          </div>
        </div>
        <label
          style={{
            position: 'relative',
            display: 'inline-block',
            width: '48px',
            height: '26px',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={alertSettings.globalEnabled}
            onChange={(e) => handleToggleGlobal(e.target.checked)}
            style={{
              opacity: 0,
              width: 0,
              height: 0,
            }}
          />
          <span
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: alertSettings.globalEnabled
                ? theme.colors.primary
                : theme.colors.bgCardActive,
              borderRadius: '13px',
              transition: `background-color ${theme.transition.fast}`,
            }}
          >
            <span
              style={{
                position: 'absolute',
                content: '',
                height: '20px',
                width: '20px',
                left: alertSettings.globalEnabled ? '25px' : '3px',
                bottom: '3px',
                backgroundColor: theme.colors.textPrimary,
                borderRadius: '50%',
                transition: `left ${theme.transition.fast}`,
              }}
            />
          </span>
        </label>
      </div>

      {/* Alerts List */}
      <div style={{ marginBottom: theme.space.lg }}>
        {alertSettings.alerts.map(renderAlertItem)}
        {alertSettings.alerts.length === 0 && (
          <div
            style={{
              padding: theme.space.lg,
              color: theme.colors.textMuted,
              textAlign: 'center',
              background: theme.colors.bgCard,
              borderRadius: theme.radius.md,
              marginBottom: theme.space.md,
            }}
          >
            {t('alerts.no_alerts')}
          </div>
        )}
      </div>

      {/* Add Custom Alert Button */}
      <button
        onClick={() => setIsCreating(true)}
        style={{
          width: '100%',
          padding: theme.space.md,
          background: theme.colors.bgCard,
          border: `1px dashed ${theme.colors.border}`,
          borderRadius: theme.radius.md,
          color: theme.colors.textSecondary,
          fontSize: theme.fontSize.md,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.space.sm,
          transition: `all ${theme.transition.fast}`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = theme.colors.bgCardHover;
          e.currentTarget.style.borderColor = theme.colors.borderHover;
          e.currentTarget.style.color = theme.colors.textPrimary;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = theme.colors.bgCard;
          e.currentTarget.style.borderColor = theme.colors.border;
          e.currentTarget.style.color = theme.colors.textSecondary;
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        {t('alerts.add_alert')}
      </button>

      {/* Edit Dialog */}
      {editingAlert && (
        <AlertEditDialog
          alert={editingAlert}
          onSave={(updated) => {
            updateAlert(updated as AlertDefinition);
            setEditingAlert(null);
          }}
          onDelete={() => {
            deleteAlert(editingAlert.id);
            setEditingAlert(null);
          }}
          onClose={() => setEditingAlert(null)}
        />
      )}

      {/* Create Dialog */}
      {isCreating && (
        <AlertEditDialog
          alert={null}
          onSave={(newAlert) => {
            createAlert(newAlert);
            setIsCreating(false);
          }}
          onClose={() => setIsCreating(false)}
        />
      )}
    </div>
  );
};
