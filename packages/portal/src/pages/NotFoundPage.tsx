import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="page-header">
      <h1>404 — Not found</h1>
      <p>
        That page doesn't exist. <Link to="/">Back to dashboard</Link>.
      </p>
    </div>
  );
}
