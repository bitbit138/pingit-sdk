import { ApiError } from '@pingit/contracts';

export function ErrorBanner({ error }: { error: unknown }) {
  if (!error) return null;
  let message = 'Something went wrong.';
  if (error instanceof ApiError) message = `${error.message} (HTTP ${error.status})`;
  else if (error instanceof Error) message = error.message;
  return (
    <div className="error-banner" role="alert">
      {message}
    </div>
  );
}
