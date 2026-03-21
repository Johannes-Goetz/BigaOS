import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { SButton, SInput, SLabel } from '../ui/SettingsUI';
import { API_BASE_URL } from '../../utils/urls';

interface CreateClientDialogProps {
  onClose: () => void;
}

export const CreateClientDialog: React.FC<CreateClientDialogProps> = ({ onClose }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();

  const [name, setName] = useState('');
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const serverAddress = window.location.host;

  const generateUUID = (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    setError(null);

    const id = generateUUID();
    try {
      const res = await fetch(`${API_BASE_URL}/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: name.trim(), clientType: 'display' }),
      });
      if (!res.ok) throw new Error('Failed to create client');
      setCreatedId(id);
    } catch (err: any) {
      setError(err.message || 'Failed to create client');
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const input = document.createElement('input');
      input.value = text;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const CopyButton: React.FC<{ text: string; field: string }> = ({ text, field }) => (
    <SButton
      variant={copiedField === field ? 'primary' : 'outline'}
      onClick={() => handleCopy(text, field)}
      style={{ padding: `${theme.space.sm} ${theme.space.md}`, flexShrink: 0 }}
    >
      {copiedField === field ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </SButton>
  );

  const MonoField: React.FC<{ value: string; field: string }> = ({ value, field }) => (
    <div style={{ display: 'flex', gap: theme.space.sm, alignItems: 'stretch' }}>
      <div style={{
        flex: 1,
        fontSize: theme.fontSize.xs,
        color: theme.colors.textMuted,
        background: theme.colors.bgCard,
        padding: `${theme.space.sm} ${theme.space.md}`,
        borderRadius: theme.radius.md,
        border: `1px solid ${theme.colors.border}`,
        wordBreak: 'break-all',
        fontFamily: '"Cascadia Code", "Fira Code", "Source Code Pro", monospace',
        display: 'flex',
        alignItems: 'center',
        userSelect: 'all',
        minHeight: '42px',
      }}>
        {value}
      </div>
      <CopyButton text={value} field={field} />
    </div>
  );

  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: theme.colors.bgOverlay,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: theme.zIndex.modal,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: theme.colors.bgSecondary,
          borderRadius: theme.radius.lg,
          padding: theme.space['2xl'],
          width: '100%',
          maxWidth: '420px',
          maxHeight: '90dvh',
          overflowY: 'auto',
          boxShadow: theme.shadow.lg,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{
          margin: `0 0 ${theme.space.xl} 0`,
          fontSize: theme.fontSize.lg,
          fontWeight: theme.fontWeight.bold,
          color: theme.colors.textPrimary,
        }}>
          {t('clients.create_title')}
        </h2>

        {!createdId ? (
          <>
            {/* Name input */}
            <div style={{ marginBottom: theme.space.lg }}>
              <SLabel>{t('clients.name')}</SLabel>
              <SInput
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('clients.name_placeholder')}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
                autoFocus
              />
            </div>

            {error && (
              <div style={{
                color: theme.colors.error,
                fontSize: theme.fontSize.sm,
                marginBottom: theme.space.md,
              }}>
                {error}
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: theme.space.md }}>
              <SButton variant="secondary" onClick={onClose} style={{ flex: 1 }}>
                {t('common.cancel')}
              </SButton>
              <SButton variant="primary" onClick={handleCreate} disabled={!name.trim() || creating} style={{ flex: 1 }}>
                {creating ? t('common.loading') : t('clients.create_new')}
              </SButton>
            </div>
          </>
        ) : (
          <>
            {/* Success screen */}
            <div style={{
              textAlign: 'center',
              marginBottom: theme.space.xl,
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: theme.colors.successLight,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: theme.space.md,
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={theme.colors.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div style={{
                fontSize: theme.fontSize.md,
                fontWeight: theme.fontWeight.medium,
                color: theme.colors.textPrimary,
              }}>
                {t('clients.create_success')}
              </div>
            </div>

            {/* Client ID */}
            <div style={{ marginBottom: theme.space.lg }}>
              <SLabel>{t('clients.client_id')}</SLabel>
              <MonoField value={createdId} field="clientId" />
            </div>

            {/* Server Address */}
            <div style={{ marginBottom: theme.space.lg }}>
              <SLabel>{t('clients.server_address')}</SLabel>
              <MonoField value={serverAddress} field="serverAddress" />
            </div>

            {/* Setup hint */}
            <div style={{
              fontSize: theme.fontSize.xs,
              color: theme.colors.textMuted,
              background: theme.colors.bgCard,
              padding: theme.space.md,
              borderRadius: theme.radius.md,
              border: `1px solid ${theme.colors.border}`,
              marginBottom: theme.space.xl,
              lineHeight: 1.5,
            }}>
              {t('clients.setup_instructions')}
            </div>

            <SButton variant="primary" onClick={onClose} style={{ width: '100%' }}>
              {t('common.done')}
            </SButton>
          </>
        )}
      </div>
    </div>
  );
};
