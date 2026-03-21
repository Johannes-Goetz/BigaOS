import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { useConfirmDialog } from '../../context/ConfirmDialogContext';
import { useSwitches } from '../../context/SwitchContext';
import { wsService } from '../../services/websocket';
import { SButton, SCard, SLabel, SSection } from '../ui/SettingsUI';
import { SwitchEditDialog } from './SwitchEditDialog';
import type { SwitchDefinition } from '../../types/switches';
import { getSwitchIconSvg } from './switchIcons';

interface RawClient {
  id: string;
  name: string;
}

export const SwitchesTab: React.FC = () => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { confirm } = useConfirmDialog();
  const { switches, deleteSwitch } = useSwitches();

  const [editSwitch, setEditSwitch] = useState<SwitchDefinition | undefined>(undefined);
  const [showCreate, setShowCreate] = useState(false);
  const [clients, setClients] = useState<RawClient[]>([]);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());

  // Fetch clients for name display and online status
  useEffect(() => {
    wsService.emit('get_clients');
    const handleSync = (data: { clients: RawClient[]; onlineIds?: string[] }) => {
      setClients(data.clients || []);
      setOnlineIds(new Set(data.onlineIds || []));
    };
    const handleChanged = () => { wsService.emit('get_clients'); };
    wsService.on('clients_sync', handleSync);
    wsService.on('clients_changed', handleChanged);
    return () => {
      wsService.off('clients_sync', handleSync);
      wsService.off('clients_changed', handleChanged);
    };
  }, []);

  const getClientName = (clientId: string) => {
    return clients.find(c => c.id === clientId)?.name || clientId.slice(0, 8);
  };

  const handleDelete = async (sw: SwitchDefinition) => {
    const confirmed = await confirm({
      title: t('switches.delete'),
      message: t('switches.delete_confirm'),
    });
    if (confirmed) {
      deleteSwitch(sw.id);
    }
  };

  return (
    <div>
      <SSection>
        <div style={{ marginBottom: theme.space.md }}>
          <SLabel style={{ marginBottom: theme.space.xs }}>{t('switches.title')}</SLabel>
          <div style={{ fontSize: theme.fontSize.xs, color: theme.colors.textMuted }}>
            {t('switches.description')}
          </div>
        </div>

        {switches.length === 0 ? (
          <SCard style={{ textAlign: 'center', padding: theme.space.xl }}>
            <p style={{ color: theme.colors.textMuted, margin: 0 }}>{t('switches.no_switches')}</p>
          </SCard>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.space.sm }}>
            {switches.map((sw) => {
              const isTargetOnline = onlineIds.has(sw.targetClientId);

              return (
                <SCard key={sw.id} highlight="default" style={{ padding: theme.space.lg }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: theme.space.md, flex: 1, minWidth: 0 }}>
                      {/* Icon */}
                      <div style={{
                        width: 36, height: 36,
                        borderRadius: theme.radius.sm,
                        background: sw.state ? theme.colors.successLight : theme.colors.bgCard,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <span
                          style={{ color: sw.state ? theme.colors.success : theme.colors.textMuted }}
                          dangerouslySetInnerHTML={{ __html: getSwitchIconSvg(sw.icon) }}
                        />
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: theme.space.sm,
                          marginBottom: 2,
                        }}>
                          <span style={{
                            fontSize: theme.fontSize.base,
                            fontWeight: theme.fontWeight.medium,
                            color: theme.colors.textPrimary,
                          }}>
                            {sw.name}
                          </span>
                          <span style={{
                            fontSize: theme.fontSize.xs,
                            fontWeight: theme.fontWeight.medium,
                            color: sw.state ? theme.colors.success : theme.colors.textMuted,
                            background: sw.state ? theme.colors.successLight : theme.colors.bgCard,
                            padding: `1px ${theme.space.sm}`,
                            borderRadius: theme.radius.sm,
                          }}>
                            {sw.state ? t('switches.state_on') : t('switches.state_off')}
                          </span>
                        </div>
                        <div style={{
                          fontSize: theme.fontSize.xs,
                          color: theme.colors.textMuted,
                          display: 'flex',
                          alignItems: 'center',
                          gap: theme.space.sm,
                        }}>
                          {/* Online indicator */}
                          <span style={{
                            width: 6, height: 6,
                            borderRadius: '50%',
                            background: isTargetOnline ? theme.colors.success : theme.colors.textMuted,
                            display: 'inline-block',
                            flexShrink: 0,
                          }} />
                          <span>{getClientName(sw.targetClientId)}</span>
                          <span style={{ opacity: 0.5 }}>GPIO {sw.gpioPin}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: theme.space.sm, flexShrink: 0 }}>
                      <SButton
                        variant="outline"
                        onClick={() => setEditSwitch(sw)}
                        style={{ padding: `${theme.space.sm} ${theme.space.md}` }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </SButton>
                      <SButton
                        variant="danger"
                        onClick={() => handleDelete(sw)}
                        style={{ padding: `${theme.space.sm} ${theme.space.md}` }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </SButton>
                    </div>
                  </div>
                </SCard>
              );
            })}
          </div>
        )}

        {/* Add Switch button */}
        <div style={{ marginTop: theme.space.lg }}>
          <SButton variant="primary" onClick={() => setShowCreate(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: theme.space.xs }}>
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {t('switches.add')}
          </SButton>
        </div>
      </SSection>

      {/* Dialogs */}
      {showCreate && <SwitchEditDialog onClose={() => setShowCreate(false)} />}
      {editSwitch && <SwitchEditDialog switchDef={editSwitch} onClose={() => setEditSwitch(undefined)} />}
    </div>
  );
};
