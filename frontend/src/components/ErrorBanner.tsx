interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function ErrorBanner({ message, onRetry, onDismiss }: ErrorBannerProps) {
  return (
    <div className="banner banner--error" role="alert">
      <span>{message}</span>
      <div className="banner__actions">
        {onRetry ? (
          <button type="button" className="button button--small" onClick={onRetry}>
            Reintentar
          </button>
        ) : null}
        {onDismiss ? (
          <button type="button" className="button button--small button--ghost" onClick={onDismiss}>
            Cerrar
          </button>
        ) : null}
      </div>
    </div>
  );
}
