import React, { useEffect, useState, useRef } from 'react';
import { ShieldAlert, AlertTriangle, Maximize2, X, ShieldCheck } from 'lucide-react';
import { api } from '../utils/api';
import { sound } from '../utils/audio';

interface AntiCheatMonitorProps {
  teamId?: string;
  enabled?: boolean;
  isCompleted?: boolean;
  isSubmitting?: boolean;
  lastSubmittedTime?: number;
}

export const AntiCheatMonitor: React.FC<AntiCheatMonitorProps> = ({
  teamId,
  enabled = true,
  isCompleted = false,
}) => {
  const [warningsCount, setWarningsCount] = useState<number>(0);
  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);
  const [warningMessage, setWarningMessage] = useState<string>('');

  const lastSwitchTimeRef = useRef<number>(0);
  const lastReturnTimeRef = useRef<number>(0);
  const isAwayRef = useRef<boolean>(false);

  useEffect(() => {
    // If not enabled or team is not logged in, do not arm listeners
    if (!enabled || !teamId) return;

    const handleSwitchAway = (source: string) => {
      const now = Date.now();
      // Deduplicate rapid focus changes (e.g. visibilitychange + blur firing at the same instant)
      if (now - lastSwitchTimeRef.current < 1500) {
        return;
      }
      lastSwitchTimeRef.current = now;
      isAwayRef.current = true;

      setWarningsCount((prev) => prev + 1);
      setWarningMessage(
        'Tab switch or window focus loss detected. This activity has been recorded in the organizer security audit log with an exact timestamp.'
      );
      setShowWarningModal(true);
      sound.playAccessDenied();

      api
        .logAntiCheatAlert(
          'TAB_SWITCH',
          `Participant switched away from game tab via ${source}`
        )
        .catch(() => {});
    };

    const handleReturnToTab = () => {
      const now = Date.now();
      if (!isAwayRef.current) return;
      if (now - lastReturnTimeRef.current < 1500) return;
      lastReturnTimeRef.current = now;
      isAwayRef.current = false;

      api
        .logAntiCheatAlert(
          'TAB_RETURN',
          'Participant returned to competition game tab'
        )
        .catch(() => {});
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        handleSwitchAway('visibilitychange (tab hidden)');
      } else {
        handleReturnToTab();
      }
    };

    const onWindowBlur = () => {
      handleSwitchAway('window.blur (focus lost)');
    };

    const onWindowFocus = () => {
      handleReturnToTab();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onWindowBlur);
    window.addEventListener('focus', onWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener('focus', onWindowFocus);
    };
  }, [enabled, teamId]);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <>
      {/* Floating anti-cheat indicator */}
      <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-slate-900/90 border border-slate-700/60 text-[11px] font-mono text-slate-400 select-none">
        {isCompleted ? (
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
        )}
        <span className="hidden sm:inline">INTEGRITY:</span>
        {isCompleted ? (
          <span className="text-emerald-400 font-semibold">ROUND CLEARED (MONITORED)</span>
        ) : (
          <span className="text-cyan-400 font-semibold">ACTIVE (TAB LOCK)</span>
        )}
        {warningsCount > 0 && (
          <span className="text-amber-400 ml-1 font-bold">
            [{warningsCount} TAB SWITCH{warningsCount > 1 ? 'ES' : ''}]
          </span>
        )}
        <button
          onClick={toggleFullScreen}
          title="Toggle Fullscreen Arena"
          className="ml-1 p-0.5 hover:text-cyan-300 text-slate-500 transition-colors"
        >
          <Maximize2 className="w-3 h-3" />
        </button>
      </div>

      {/* Security alert modal */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="max-w-md w-full bg-slate-950 border border-red-500/80 rounded-xl p-5 shadow-2xl glow-red">
            <div className="flex items-center justify-between pb-3 border-b border-red-500/30">
              <div className="flex items-center gap-2 text-red-400 font-heading tracking-wide">
                <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
                <span className="font-bold">TAB SWITCH DETECTED</span>
              </div>
              <button
                onClick={() => setShowWarningModal(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3 font-mono text-sm">
              <p className="text-slate-200">{warningMessage}</p>
              <div className="bg-red-950/40 border border-red-800/40 p-3 rounded text-xs text-red-300 space-y-1.5">
                <p>
                  • Total tab switches recorded: <span className="font-bold text-red-400">{warningsCount}</span>
                </p>
                <p>• Window focus and tab visibility are monitored throughout your entire tournament session.</p>
                <p>• Each event is time-stamped and broadcast to the competition administrator.</p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowWarningModal(false)}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-bold tracking-wider rounded transition-colors cursor-pointer"
              >
                ACKNOWLEDGE & RETURN
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
