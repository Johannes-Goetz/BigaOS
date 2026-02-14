/**
 * TerminalPanel - Server log viewer and command execution
 *
 * Shows BigaOS service logs with live follow mode,
 * allows running commands on the server, and provides
 * quick-access buttons for common system operations.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { theme } from '../../styles/theme';
import { wsService } from '../../services/websocket';
import { useLanguage } from '../../i18n/LanguageContext';
import { usePlugins } from '../../context/PluginContext';

const HELPFUL_COMMANDS = [
  { label: 'System Info', cmd: 'uname -a' },
  { label: 'Uptime', cmd: 'uptime' },
  { label: 'Disk Usage', cmd: 'df -h' },
  { label: 'Memory', cmd: 'free -h' },
  { label: 'Temperature', cmd: 'vcgencmd measure_temp 2>/dev/null || echo "N/A"' },
  { label: 'IP Addresses', cmd: 'hostname -I' },
  { label: 'CAN Status', cmd: 'ip -details link show can0 2>/dev/null || echo "CAN interface not found"' },
  { label: 'I2C Devices', cmd: 'i2cdetect -y 1 2>/dev/null || echo "i2c-tools not installed"' },
  { label: 'BigaOS Status', cmd: 'systemctl status bigaos --no-pager -l' },
  { label: 'Node Version', cmd: 'node --version' },
];

export const TerminalPanel: React.FC = () => {
  const { t } = useLanguage();
  const { rebootSystem } = usePlugins();
  const [logs, setLogs] = useState('');
  const [following, setFollowing] = useState(false);
  const [command, setCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [execResults, setExecResults] = useState<Array<{ command: string; stdout: string; stderr: string; exitCode: number }>>([]);
  const [showHelp, setShowHelp] = useState(false);
  const logRef = useRef<HTMLPreElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoScrollRef = useRef(true);

  // Load initial logs
  useEffect(() => {
    wsService.emit('terminal_logs', { lines: 200 });

    const handleLogs = (data: { logs: string }) => {
      setLogs(data.logs);
      setTimeout(() => {
        if (logRef.current && autoScrollRef.current) {
          logRef.current.scrollTop = logRef.current.scrollHeight;
        }
      }, 50);
    };

    const handleLogLine = (data: { line: string }) => {
      setLogs(prev => prev + data.line);
      setTimeout(() => {
        if (logRef.current && autoScrollRef.current) {
          logRef.current.scrollTop = logRef.current.scrollHeight;
        }
      }, 10);
    };

    const handleExecResult = (data: { command: string; stdout: string; stderr: string; exitCode: number }) => {
      setExecResults(prev => [...prev.slice(-20), data]);
    };

    wsService.on('terminal_logs_sync', handleLogs);
    wsService.on('terminal_log_line', handleLogLine);
    wsService.on('terminal_exec_result', handleExecResult);

    return () => {
      wsService.off('terminal_logs_sync', handleLogs);
      wsService.off('terminal_log_line', handleLogLine);
      wsService.off('terminal_exec_result', handleExecResult);
      wsService.emit('terminal_logs_follow', { follow: false });
    };
  }, []);

  const toggleFollow = useCallback(() => {
    const newFollow = !following;
    setFollowing(newFollow);
    wsService.emit('terminal_logs_follow', { follow: newFollow });
    if (newFollow) autoScrollRef.current = true;
  }, [following]);

  const refreshLogs = useCallback(() => {
    wsService.emit('terminal_logs', { lines: 200 });
  }, []);

  const executeCommand = useCallback((cmd?: string) => {
    const toRun = cmd || command.trim();
    if (!toRun) return;
    setCommandHistory(prev => {
      const filtered = prev.filter(c => c !== toRun);
      return [...filtered, toRun].slice(-50);
    });
    setHistoryIndex(-1);
    wsService.emit('terminal_exec', { command: toRun });
    if (!cmd) setCommand('');
  }, [command]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setCommand(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setCommand('');
        } else {
          setHistoryIndex(newIndex);
          setCommand(commandHistory[newIndex]);
        }
      }
    }
  };

  const handleLogScroll = () => {
    if (logRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = logRef.current;
      autoScrollRef.current = scrollHeight - scrollTop - clientHeight < 50;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.space.md }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{
          fontSize: theme.fontSize.xs,
          fontWeight: theme.fontWeight.semibold,
          color: theme.colors.textMuted,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          {t('terminal.title')}
        </div>
        <div style={{ display: 'flex', gap: theme.space.xs }}>
          <button
            onClick={refreshLogs}
            className="touch-btn"
            title={t('terminal.refresh')}
            style={{
              padding: `${theme.space.xs} ${theme.space.sm}`,
              background: 'transparent',
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.radius.sm,
              color: theme.colors.textMuted,
              fontSize: theme.fontSize.xs,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: theme.space.xs,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            {t('terminal.refresh')}
          </button>
          <button
            onClick={toggleFollow}
            className="touch-btn"
            style={{
              padding: `${theme.space.xs} ${theme.space.sm}`,
              background: following ? theme.colors.primaryLight : 'transparent',
              border: `1px solid ${following ? theme.colors.primary : theme.colors.border}`,
              borderRadius: theme.radius.sm,
              color: following ? theme.colors.primary : theme.colors.textMuted,
              fontSize: theme.fontSize.xs,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: theme.space.xs,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill={following ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            {following ? t('terminal.following') : t('terminal.follow')}
          </button>
          <button
            onClick={() => rebootSystem()}
            className="touch-btn"
            title={t('terminal.reboot')}
            style={{
              padding: `${theme.space.xs} ${theme.space.sm}`,
              background: 'transparent',
              border: `1px solid ${theme.colors.warning}66`,
              borderRadius: theme.radius.sm,
              color: theme.colors.warning,
              fontSize: theme.fontSize.xs,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: theme.space.xs,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
              <line x1="12" y1="2" x2="12" y2="12" />
            </svg>
            {t('terminal.reboot')}
          </button>
        </div>
      </div>

      {/* Log viewer */}
      <pre
        ref={logRef}
        onScroll={handleLogScroll}
        style={{
          background: '#000',
          color: '#c8d6e5',
          fontFamily: '"Cascadia Code", "Fira Code", "Source Code Pro", "Consolas", monospace',
          fontSize: '11px',
          lineHeight: 1.5,
          padding: theme.space.md,
          borderRadius: theme.radius.sm,
          border: `1px solid ${theme.colors.border}`,
          height: '300px',
          overflow: 'auto',
          margin: 0,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        }}
      >
        {logs || t('terminal.loading')}
      </pre>

      {/* Command input */}
      <div style={{ display: 'flex', gap: theme.space.xs }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: `0 ${theme.space.sm}`,
          color: theme.colors.primary,
          fontSize: theme.fontSize.sm,
          fontFamily: 'monospace',
          fontWeight: theme.fontWeight.bold,
        }}>$</div>
        <input
          ref={inputRef}
          type="text"
          value={command}
          onChange={e => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('terminal.placeholder')}
          style={{
            flex: 1,
            padding: `${theme.space.sm} ${theme.space.md}`,
            background: '#000',
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.radius.sm,
            color: '#c8d6e5',
            fontFamily: '"Cascadia Code", "Fira Code", "Source Code Pro", "Consolas", monospace',
            fontSize: '12px',
            outline: 'none',
          }}
        />
        <button
          onClick={() => executeCommand()}
          className="touch-btn"
          disabled={!command.trim()}
          style={{
            padding: `${theme.space.sm} ${theme.space.md}`,
            background: command.trim() ? theme.colors.primary : theme.colors.bgCardActive,
            border: 'none',
            borderRadius: theme.radius.sm,
            color: command.trim() ? '#fff' : theme.colors.textMuted,
            fontSize: theme.fontSize.sm,
            cursor: command.trim() ? 'pointer' : 'default',
            minHeight: '36px',
          }}
        >
          {t('terminal.run')}
        </button>
      </div>

      {/* Command results */}
      {execResults.length > 0 && (
        <div style={{
          background: '#000',
          borderRadius: theme.radius.sm,
          border: `1px solid ${theme.colors.border}`,
          maxHeight: '200px',
          overflow: 'auto',
        }}>
          {execResults.map((result, i) => (
            <div key={i} style={{
              padding: `${theme.space.sm} ${theme.space.md}`,
              borderBottom: i < execResults.length - 1 ? `1px solid ${theme.colors.border}` : 'none',
            }}>
              <div style={{
                fontFamily: 'monospace',
                fontSize: '11px',
                color: theme.colors.primary,
                marginBottom: '2px',
              }}>$ {result.command}</div>
              {result.stdout && (
                <pre style={{
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  color: '#c8d6e5',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}>{result.stdout}</pre>
              )}
              {result.stderr && (
                <pre style={{
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  color: theme.colors.error,
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}>{result.stderr}</pre>
              )}
              {result.exitCode !== 0 && (
                <div style={{ fontFamily: 'monospace', fontSize: '10px', color: theme.colors.warning, marginTop: '2px' }}>
                  exit code: {result.exitCode}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Quick commands */}
      <div>
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="touch-btn"
          style={{
            padding: `${theme.space.xs} ${theme.space.sm}`,
            background: 'transparent',
            border: 'none',
            color: theme.colors.textMuted,
            fontSize: theme.fontSize.xs,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: theme.space.xs,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ transform: showHelp ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
          {t('terminal.quick_commands')}
        </button>
        {showHelp && (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: theme.space.xs,
            marginTop: theme.space.xs,
            padding: `${theme.space.sm} 0`,
          }}>
            {HELPFUL_COMMANDS.map(({ label, cmd }) => (
              <button
                key={cmd}
                onClick={() => executeCommand(cmd)}
                className="touch-btn"
                title={cmd}
                style={{
                  padding: `${theme.space.xs} ${theme.space.sm}`,
                  background: theme.colors.bgCard,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.radius.sm,
                  color: theme.colors.textSecondary,
                  fontSize: theme.fontSize.xs,
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
