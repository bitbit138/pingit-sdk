import { useEffect, useMemo, useState } from 'react';
import { ConnectionPill } from './components/ConnectionPill';
import { FeatureTile } from './components/FeatureTile';
import { NetworkSelector, type Condition } from './components/NetworkSelector';
import { RawMetricsPanel } from './components/RawMetricsPanel';
import { FEATURES } from './data/features';
import { PingItClient } from './pingit/client';
import { evaluate } from './pingit/evaluate';
import { label, score } from './pingit/score';
import type { Metrics, ProfileTable, TestResult, Verdict } from './pingit/types';

// Two clearly-labelled simulated conditions so the value of the SDK is visible
// even against a perfect localhost connection. "This connection" uses the real,
// live measurement.
const PRESETS: Record<Exclude<Condition, 'real'>, Metrics> = {
  mobile: { downloadMbps: 12, uploadMbps: 4, latencyMs: 70, jitterMs: 18, packetLossPct: 0 },
  weak: { downloadMbps: 0.8, uploadMbps: 0.2, latencyMs: 320, jitterMs: 55, packetLossPct: 0 },
};

function effectiveResult(measured: TestResult, condition: Condition): TestResult {
  if (condition === 'real') return measured;
  const m = PRESETS[condition];
  const s = score(m);
  return { ...m, score: s, label: label(s), timestamp: measured.timestamp };
}

function getDeviceId(): string {
  const KEY = 'pingit.demo.deviceId';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

type Status = 'idle' | 'measuring' | 'ready' | 'error';

export function App() {
  const client = useMemo(() => new PingItClient(), []);
  const deviceId = useMemo(getDeviceId, []);

  const [profiles, setProfiles] = useState<ProfileTable | null>(null);
  const [measured, setMeasured] = useState<TestResult | null>(null);
  const [condition, setCondition] = useState<Condition>('real');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [reported, setReported] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  async function measure() {
    setStatus('measuring');
    setError(null);
    try {
      const [profs, result] = await Promise.all([client.getProfiles(true), client.runTest()]);
      setProfiles(profs);
      setMeasured(result);
      setStatus('ready');
    } catch (e) {
      setError(
        `Couldn't reach the PingIt server at ${client.endpoint}. Is it running? (${(e as Error).message})`,
      );
      setStatus('error');
    }
  }

  // Measure once on load.
  useEffect(() => {
    void measure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const effective = useMemo(
    () => (measured ? effectiveResult(measured, condition) : null),
    [measured, condition],
  );

  const verdicts = useMemo<Record<string, Verdict>>(() => {
    if (!effective || !profiles) return {};
    const map: Record<string, Verdict> = {};
    for (const f of FEATURES) {
      const spec = profiles.profiles.find((p) => p.id === f.profile);
      map[f.id] = spec ? evaluate(spec.requires, effective) : { passed: true, reason: 'ok' };
    }
    return map;
  }, [effective, profiles]);

  // Report the currently-shown result to the server so the portal reflects it.
  useEffect(() => {
    if (!effective || status !== 'ready') return;
    setReported(false);
    client
      .postResult(effective, deviceId)
      .then(() => setReported(true))
      .catch(() => setReported(false));
  }, [effective, status, client, deviceId]);

  const pending = status === 'measuring';

  return (
    <div className="app">
      <header className="app__header">
        <div className="brand">
          <span className="brand__dot" />
          Hub
        </div>
        <ConnectionPill result={effective} busy={pending} />
      </header>

      <section className="controls">
        <div>
          <div className="controls__label">What can your connection handle right now?</div>
          <div className="controls__hint">
            Each action quietly asks the PingIt SDK before it runs.
          </div>
        </div>
        <div className="controls__right">
          <NetworkSelector value={condition} onChange={setCondition} />
          <button className="btn btn--ghost" type="button" onClick={() => void measure()} disabled={pending}>
            {pending ? 'Checking…' : 'Re-check'}
          </button>
        </div>
      </section>

      {error ? (
        <div className="banner banner--error">
          {error}
          <button className="btn btn--ghost" type="button" onClick={() => void measure()}>
            Retry
          </button>
        </div>
      ) : null}

      <section className="grid">
        {FEATURES.map((f) => (
          <FeatureTile key={f.id} feature={f} verdict={verdicts[f.id] ?? null} pending={pending} />
        ))}
      </section>

      <footer className="app__footer">
        <button className="link" type="button" onClick={() => setShowRaw((s) => !s)}>
          {showRaw ? 'Hide measurement' : 'Show measurement'}
        </button>
        <span className="powered">Powered by PingIt SDK</span>
      </footer>

      {showRaw && effective ? (
        <RawMetricsPanel metrics={effective} appId={client.appId} deviceId={deviceId} reported={reported} />
      ) : null}
    </div>
  );
}
