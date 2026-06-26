import { useState } from 'react';
import type { Feature } from '../data/features';
import type { Verdict } from '../pingit/types';

export function FeatureTile({
  feature,
  verdict,
  pending,
}: {
  feature: Feature;
  verdict: Verdict | null;
  pending: boolean;
}) {
  const [action, setAction] = useState<string | null>(null);

  const ready = verdict?.passed ?? false;

  const onClick = () => {
    if (!verdict) return;
    setAction(ready ? feature.readyMsg : feature.notReadyMsg);
  };

  return (
    <div className={`tile ${verdict ? (ready ? 'tile--ok' : 'tile--blocked') : ''}`}>
      <div className="tile__head">
        <span className="tile__icon" aria-hidden>
          {feature.tag}
        </span>
        <div>
          <div className="tile__title">{feature.title}</div>
          <div className="tile__blurb">{feature.blurb}</div>
        </div>
      </div>

      <div className="tile__status">
        {pending ? (
          <span className="chip chip--neutral">checking...</span>
        ) : verdict ? (
          ready ? (
            <span className="chip chip--ok">Ready</span>
          ) : (
            <span className="chip chip--bad">Not ready: {verdict.reason}</span>
          )
        ) : (
          <span className="chip chip--neutral">--</span>
        )}
      </div>

      <button className="btn" type="button" onClick={onClick} disabled={!verdict || pending}>
        {feature.actionLabel}
      </button>

      {action ? <div className={`tile__toast ${ready ? 'is-ok' : 'is-warn'}`}>{action}</div> : null}
    </div>
  );
}
