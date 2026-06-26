import { useState } from 'react';
import type { AppCreatedResponse } from '@pingit/contracts';

export interface ApiKeyRevealProps {
  app: AppCreatedResponse;
  onClose: () => void;
}

/** One-time reveal of a freshly registered app's appId + secret apiKey. */
export function ApiKeyReveal({ app, onClose }: ApiKeyRevealProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied(null);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="API key">
      <div className="modal stack">
        <h2>App registered</h2>
        <p className="muted">
          Copy the API key now — it is shown <strong>only once</strong> and cannot be retrieved again.
        </p>

        <div className="field">
          <label>App ID</label>
          <div className="row">
            <code className="secret" style={{ flex: 1 }}>
              {app.appId}
            </code>
            <button className="btn btn--ghost" type="button" onClick={() => copy('appId', app.appId)}>
              {copied === 'appId' ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="field">
          <label>API key</label>
          <div className="row">
            <code className="secret" style={{ flex: 1 }}>
              {app.apiKey}
            </code>
            <button className="btn btn--ghost" type="button" onClick={() => copy('apiKey', app.apiKey)}>
              {copied === 'apiKey' ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        <p className="warn">Store this secret in your app's configuration before closing.</p>

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn" type="button" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
