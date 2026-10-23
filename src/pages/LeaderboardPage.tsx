import React, { useEffect, useState } from 'react';
import {
  Trophy,
  RefreshCw,
  Search,
  Filter,
  Shield,
  KeyRound,
  Compass,
  CheckCircle2,
  Clock,
  HelpCircle,
  Lock,
} from 'lucide-react';
import { api } from '../utils/api';
import { sound } from '../utils/audio';
import { Podium } from '../components/Podium';
import { TeamColorDot } from '../components/TeamColorDot';
import { PublicLeaderboardEntry, Round2LeaderboardEntry } from '../types';

interface LeaderboardPageProps {
  onNavigate: (path: string) => void;
  userTeamId?: string;
}

export const LeaderboardPage: React.FC<LeaderboardPageProps> = ({
  onNavigate,
  userTeamId,
}) => {
  const [activeRoundTab, setActiveRoundTab] = useState<'ROUND_1' | 'ROUND_2'>('ROUND_1');
  const [r1Entries, setR1Entries] = useState<PublicLeaderboardEntry[]>([]);
  const [r2Entries, setR2Entries] = useState<Round2LeaderboardEntry[]>([]);
  const [isPublic, setIsPublic] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [showOnlyRoom4Cleared, setShowOnlyRoom4Cleared] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const latestFetchTimestampRef = React.useRef<number>(0);

  const fetchLeaderboards = async (isBackground = false) => {
    const requestTimestamp = Date.now();
    latestFetchTimestampRef.current = requestTimestamp;
    try {
      if (!isBackground) setLoading(true);
      const [res1, res2] = await Promise.all([
        api.getLeaderboard(),
        api.getRound2Leaderboard().catch(() => ({ leaderboard: [], isPublic: true, totalTeams: 0 })),
      ]);

      // If a newer request has already started/completed, discard this stale response
      if (requestTimestamp < latestFetchTimestampRef.current) {
        return;
      }

      // Safe monotonic merge: a verified cleared team must never be demoted by stale background polling
      setR1Entries((prev) => {
        return (res1.leaderboard || []).map((incoming) => {
          const prevEntry = prev.find((p) => p.teamId === incoming.teamId);
          if (prevEntry && (prevEntry.isCompleted || prevEntry.passwordStatus === 'COMPLETED')) {
            return {
              ...incoming,
              isCompleted: true,
              passwordStatus: 'COMPLETED',
            };
          }
          return incoming;
        });
      });

      setR2Entries((prev) => {
        return (res2.leaderboard || []).map((incoming) => {
          const prevEntry = prev.find((p) => p.teamId === incoming.teamId);
          if (prevEntry && (prevEntry.clearedRoom4 || prevEntry.isCompleted || prevEntry.status === 'COMPLETED')) {
            return {
              ...incoming,
              clearedRoom4: true,
              isCompleted: true,
              status: 'COMPLETED' as const,
            };
          }
          return incoming;
        });
      });

      setIsPublic(res1.isPublic);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tournament standings.');
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboards(false);
    const interval = setInterval(() => fetchLeaderboards(true), 10000);
    return () => clearInterval(interval);
  }, []);

  // Department list aggregated from both leaderboards
  const allDepts = Array.from(
    new Set([...r1Entries.map((e) => e.department), ...r2Entries.map((e) => e.department)])
  ).filter(Boolean);
  const departments = ['ALL', ...allDepts];

  // Count of squads that cleared Room 4
  const r2Room4ClearedCount = r2Entries.filter((e) => e.clearedRoom4).length;
  const r1Room4ClearedCount = r1Entries.filter((e) => e.clearedRoom4).length;
  const totalRoom4Cleared = Math.max(r2Room4ClearedCount, r1Room4ClearedCount);

  // Filtering for Round 1
  const filteredR1 = r1Entries.filter((e) => {
    const matchesSearch =
      e.teamName.toLowerCase().includes(search.toLowerCase()) ||
      e.teamId.toLowerCase().includes(search.toLowerCase());
    const matchesDept = selectedDept === 'ALL' || e.department === selectedDept;
    const matchesR4 = !showOnlyRoom4Cleared || Boolean(e.clearedRoom4);
    return matchesSearch && matchesDept && matchesR4;
  });

  // Filtering for Round 2
  const filteredR2 = r2Entries.filter((e) => {
    const matchesSearch =
      e.teamName.toLowerCase().includes(search.toLowerCase()) ||
      e.teamId.toLowerCase().includes(search.toLowerCase());
    const matchesDept = selectedDept === 'ALL' || e.department === selectedDept;
    const matchesR4 = !showOnlyRoom4Cleared || Boolean(e.clearedRoom4);
    return matchesSearch && matchesDept && matchesR4;
  });

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 max-w-7xl mx-auto space-y-8 text-white">
      {/* Top Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-slate-300 font-mono text-xs">
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>OFFICIAL TOURNAMENT STANDINGS</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-heading font-black text-white tracking-wide">
          HALL OF CHAMPIONS
        </h2>
        <p className="text-xs sm:text-sm font-mono text-slate-400 max-w-xl mx-auto">
          Synchronized tournament rankings calculated by combining score percentage and completion time performance.
        </p>

        {/* Combined Score Formula Banner */}
        <div className="max-w-3xl mx-auto mt-4 p-3.5 rounded-2xl bg-slate-950/80 border border-cyan-500/30 text-xs font-mono text-slate-300 shadow-xl">
          <div className="text-[11px] text-cyan-400 font-bold uppercase tracking-wider mb-2 flex items-center justify-center gap-2">
            <span>OFFICIAL RANKING FORMULA: COMBINED SCORE = (SCORE % + TIME PERFORMANCE) / 2</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-center">
            <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">1. SCORE %</span>
              <span className="text-xs text-cyan-300 font-bold block mt-0.5">(Final Score / Max Score) × 100</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">2. TIME PERFORMANCE</span>
              <span className="text-xs text-amber-300 font-bold block mt-0.5">(Fastest Time / Squad Time) × 100</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">3. COMBINED SCORE</span>
              <span className="text-xs text-emerald-300 font-bold block mt-0.5">(Score % + Time %) / 2</span>
            </div>
          </div>
        </div>

        {/* Room 4 Cleared Live Telemetry Banner */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-400 text-emerald-300 font-mono text-xs shadow-[0_0_20px_rgba(16,185,129,0.35)]">
            <Trophy className="w-4 h-4 text-amber-400 animate-bounce" />
            <span className="font-heading font-bold text-white tracking-wider">ROOM 4 CLEARED:</span>
            <span className="px-2 py-0.5 bg-emerald-900 text-emerald-200 rounded font-black text-xs border border-emerald-600">
              {totalRoom4Cleared} SQUADS
            </span>
            <span className="text-slate-300 hidden sm:inline">• Final Vault Breached & Flag Captured</span>
          </div>
        </div>
      </div>

      {/* ROUND SELECTOR TABS */}
      <div className="flex items-center justify-center">
        <div className="bg-slate-950/90 border border-slate-800 p-1.5 rounded-2xl flex items-center gap-2 shadow-2xl">
          <button
            onClick={() => {
              sound.playKeystroke();
              setActiveRoundTab('ROUND_1');
            }}
            className={`px-5 py-2.5 rounded-xl text-xs font-heading font-black tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeRoundTab === 'ROUND_1'
                ? 'bg-cyan-500 text-slate-950 shadow-lg glow-cyan'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>ROUND 1: TECH HUNT</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
              activeRoundTab === 'ROUND_1' ? 'bg-slate-950 text-cyan-300' : 'bg-slate-900 text-slate-400'
            }`}>
              {r1Entries.length}
            </span>
          </button>

          <button
            onClick={() => {
              sound.playKeystroke();
              setActiveRoundTab('ROUND_2');
            }}
            className={`px-5 py-2.5 rounded-xl text-xs font-heading font-black tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeRoundTab === 'ROUND_2'
                ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>ROUND 2: ESCAPE ROOM</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
              activeRoundTab === 'ROUND_2' ? 'bg-slate-950 text-amber-400' : 'bg-slate-900 text-slate-400'
            }`}>
              {r2Entries.length}
            </span>
          </button>
        </div>
      </div>

      {/* Podium Visualization for Round 1 & Round 2 */}
      {isPublic && activeRoundTab === 'ROUND_1' && r1Entries.length > 0 && (
        <Podium entries={r1Entries} />
      )}
      {isPublic && activeRoundTab === 'ROUND_2' && r2Entries.length > 0 && (
        <Podium entries={r2Entries} />
      )}

      {/* Search, Department & Room 4 Filters */}
      <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Squad Name or Team ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl pl-10 pr-4 py-2 text-xs font-mono text-white focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          {/* Quick Filter: Room 4 Cleared Only */}
          <button
            type="button"
            onClick={() => {
              sound.playKeystroke();
              setShowOnlyRoom4Cleared(!showOnlyRoom4Cleared);
            }}
            className={`px-3 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              showOnlyRoom4Cleared
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30'
                : 'bg-slate-900 border border-slate-700 text-slate-300 hover:border-emerald-500/60 hover:text-emerald-300'
            }`}
            title="Filter to squads that cleared Room 4"
          >
            <Trophy className={`w-3.5 h-3.5 ${showOnlyRoom4Cleared ? 'text-slate-950' : 'text-amber-400'}`} />
            <span>ROOM 4 CLEARED</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-black ${
              showOnlyRoom4Cleared ? 'bg-slate-950 text-emerald-300' : 'bg-slate-800 text-emerald-400'
            }`}>
              {totalRoom4Cleared}
            </span>
          </button>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
            >
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              sound.playKeystroke();
              fetchLeaderboards();
            }}
            title="Refresh Leaderboard"
            className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Concealed Alert */}
      {!isPublic ? (
        <div className="p-8 rounded-2xl bg-slate-950 border border-amber-500/50 text-center space-y-2">
          <Shield className="w-10 h-10 text-amber-400 mx-auto" />
          <h4 className="font-heading font-bold text-lg text-white">LEADERBOARD CONCEALED</h4>
          <p className="text-xs font-mono text-slate-400">
            The organizer has momentarily masked public standing telemetry to preserve tournament suspense.
          </p>
        </div>
      ) : activeRoundTab === 'ROUND_1' ? (
        /* ROUND 1 STANDINGS TABLE */
        <div className="bg-slate-950/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="px-5 py-3 border-b border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-2">
              <Compass className="w-3.5 h-3.5" />
              ROUND 1: TECH HUNT STANDINGS
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Ranked by: Combined Score = (Score % + Time Performance) / 2
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 text-center">RANK</th>
                  <th className="py-3.5 px-4">TEAM / SQUAD</th>
                  <th className="py-3.5 px-4 text-right">POINTS</th>
                  <th className="py-3.5 px-4 text-center">COMPLETION TIME</th>
                  <th className="py-3.5 px-4 text-right">COMBINED SCORE</th>
                  <th className="py-3.5 px-4 text-center">ROUND 1 STATUS</th>
                  <th className="py-3.5 px-4">DEPARTMENT</th>
                  <th className="py-3.5 px-4 text-center">QUALIFICATION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {filteredR1.map((item) => {
                  const isUser = userTeamId === item.teamId;
                  const isCompleted = Boolean(item.isCompleted || item.passwordStatus === 'COMPLETED' || item.status === 'COMPLETED');
                  return (
                    <tr
                      key={item.teamId}
                      className={`transition-colors ${
                        isUser
                          ? 'bg-cyan-950/40 border-l-4 border-l-cyan-400'
                          : item.rank === 1
                          ? 'bg-amber-950/15 hover:bg-amber-950/30'
                          : 'hover:bg-slate-900/50'
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center font-bold">
                        {item.rank === 1 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/60 font-heading">
                            1
                          </span>
                        ) : item.rank === 2 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-300/20 text-slate-200 border border-slate-400 font-heading">
                            2
                          </span>
                        ) : item.rank === 3 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700/20 text-amber-600 border border-amber-700 font-heading">
                            3
                          </span>
                        ) : (
                          <span className="text-slate-500 font-heading">#{item.rank}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-heading font-bold text-white text-sm flex items-center gap-2">
                          <TeamColorDot color={item.color} size="sm" />
                          <span>{item.teamName}</span>
                          {isUser && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-900 text-cyan-300">
                              YOU
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          ID: {item.teamId} • {item.college}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="text-base font-bold text-cyan-300 font-mono">
                          {item.score} <span className="text-[10px] text-slate-500">PTS</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {item.scorePercentage !== undefined ? `${item.scorePercentage}%` : ''}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono">
                        {isCompleted && item.timeFormatted && item.timeFormatted !== '--' ? (
                          <div>
                            <span className="text-white font-bold text-xs">{item.timeFormatted}</span>
                            <span className="text-[9px] text-emerald-400 block">OFFICIAL</span>
                          </div>
                        ) : isCompleted ? (
                          <div>
                            <span className="text-emerald-400 font-bold text-xs">RECORDED</span>
                            <span className="text-[9px] text-emerald-400/80 block">OFFICIAL</span>
                          </div>
                        ) : (
                          <div>
                            <span className="text-slate-500 font-mono text-xs">--</span>
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 inline-block">
                              {item.completedCount > 0 ? 'IN PROGRESS' : 'NOT STARTED'}
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="text-base font-heading font-black text-emerald-300">
                          {item.combinedScore ?? 0}
                        </div>
                        <div className="text-[9px] font-mono text-slate-400">
                          Score {item.scorePercentage ?? 0}% • Time {item.timePerformance ?? 0}%
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-400 text-emerald-300 text-[10px] font-bold font-mono shadow-[0_0_12px_rgba(16,185,129,0.35)]">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>CLEARED</span>
                          </span>
                        ) : item.completedCount > 0 || item.passwordStatus === 'IN_PROGRESS' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-950/70 border border-amber-500/50 text-amber-300 text-[10px] font-bold font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            <span>IN PROGRESS</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-500 text-[10px] font-mono">
                            NOT STARTED
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 text-[10px]">
                          {item.department}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {item.isQualified ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-[10px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            QUALIFIED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-500 text-[10px]">
                            ACTIVE
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ROUND 2 STANDINGS TABLE */
        <div className="bg-slate-950/90 border border-amber-500/40 rounded-2xl overflow-hidden shadow-2xl">
          <div className="px-5 py-3 border-b border-slate-800 bg-amber-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <span className="text-xs font-mono text-amber-400 font-bold uppercase tracking-wider flex items-center gap-2">
              <KeyRound className="w-3.5 h-3.5" />
              ROUND 2: ESCAPE ROOM STANDINGS
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Ranked by: Combined Score = (Score % + Time Performance) / 2
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 text-center">RANK</th>
                  <th className="py-3.5 px-4">TEAM / SQUAD</th>
                  <th className="py-3.5 px-4">CURRENT SECTOR</th>
                  <th className="py-3.5 px-4 text-right">POINTS</th>
                  <th className="py-3.5 px-4 text-center">COMPLETION TIME</th>
                  <th className="py-3.5 px-4 text-right">COMBINED SCORE</th>
                  <th className="py-3.5 px-4 text-center">ROOM 4 CLEARED</th>
                  <th className="py-3.5 px-4 text-center">COMPLETION STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {filteredR2.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 font-mono">
                      No qualified teams match the selected filter. Check back once squads advance!
                    </td>
                  </tr>
                ) : (
                  filteredR2.map((item) => {
                    const isUser = userTeamId === item.teamId;
                    const isCompleted = Boolean(item.isCompleted || item.clearedRoom4 || item.status === 'COMPLETED');
                    return (
                      <tr
                        key={item.teamId}
                        className={`transition-colors ${
                          isUser
                            ? 'bg-amber-950/40 border-l-4 border-l-amber-400'
                            : item.rank === 1
                            ? 'bg-amber-950/20 hover:bg-amber-950/30'
                            : 'hover:bg-slate-900/50'
                        }`}
                      >
                        <td className="py-3.5 px-4 text-center font-bold">
                          {item.rank === 1 ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/60 font-heading">
                              1
                            </span>
                          ) : item.rank === 2 ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-300/20 text-slate-200 border border-slate-400 font-heading">
                              2
                            </span>
                          ) : item.rank === 3 ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700/20 text-amber-600 border border-amber-700 font-heading">
                              3
                            </span>
                          ) : (
                            <span className="text-slate-500 font-heading">#{item.rank}</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-heading font-bold text-white text-sm flex items-center gap-2">
                            <TeamColorDot color={item.color} size="sm" />
                            <span>{item.teamName}</span>
                            {isUser && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-900 text-amber-300">
                                YOU
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            ID: {item.teamId} • {item.department}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                            item.clearedRoom4 || item.status === 'COMPLETED'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                              : 'bg-slate-900 text-amber-300 border border-slate-700'
                          }`}>
                            {item.currentRoomName}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="text-base font-bold text-amber-400 font-mono">
                            {item.score} <span className="text-[10px] text-slate-500">PTS</span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {item.scorePercentage !== undefined ? `${item.scorePercentage}%` : ''}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center font-mono">
                          {isCompleted && item.timeFormatted && item.timeFormatted !== '--' ? (
                            <div>
                              <span className="text-white font-bold text-xs">{item.timeFormatted}</span>
                              <span className="text-[9px] text-emerald-400 block">OFFICIAL</span>
                            </div>
                          ) : isCompleted ? (
                            <div>
                              <span className="text-emerald-400 font-bold text-xs">RECORDED</span>
                              <span className="text-[9px] text-emerald-400/80 block">OFFICIAL</span>
                            </div>
                          ) : (
                            <div>
                              <span className="text-slate-500 font-mono text-xs">--</span>
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 inline-block">
                                {item.status === 'IN_PROGRESS' || (item.completedRooms && item.completedRooms.length > 0) ? 'IN PROGRESS' : 'NOT STARTED'}
                              </span>
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="text-base font-heading font-black text-amber-300">
                            {item.combinedScore ?? 0}
                          </div>
                          <div className="text-[9px] font-mono text-slate-400">
                            Score {item.scorePercentage ?? 0}% • Time {item.timePerformance ?? 0}%
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {item.clearedRoom4 ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/90 border-2 border-emerald-400 text-emerald-300 font-mono text-xs font-black shadow-[0_0_18px_rgba(16,185,129,0.5)]">
                              <Trophy className="w-3.5 h-3.5 text-amber-400" />
                              <span>CLEARED ✓</span>
                            </span>
                          ) : item.currentRoom === 4 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-950/70 border border-amber-500/70 text-amber-300 font-mono text-[11px] font-bold">
                              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                              <span>IN ROOM 4</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-500 font-mono text-[10px]">
                              <Lock className="w-3 h-3 text-slate-600" />
                              <span>ROOM {item.currentRoom}</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {isCompleted ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-[10px] font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              CLEARED
                            </span>
                          ) : item.status === 'IN_PROGRESS' || (item.completedRooms && item.completedRooms.length > 0) || item.currentRoom > 1 || item.timeSpentSeconds > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-950/70 border border-amber-500/50 text-amber-300 text-[10px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                              IN PROGRESS
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-500 text-[10px]">
                              NOT STARTED
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

