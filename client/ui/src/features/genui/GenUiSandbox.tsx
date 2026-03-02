import { useRef, useEffect, useState, useCallback } from 'react';
import './GenUiSandbox.scss';

export interface GenUiSandboxProps {
  projectId: string;
  bundleUrl: string;
  onMessage?: (message: unknown) => void;
  onError?: (error: Error) => void;
  width?: string | number;
  height?: string | number;
}

export function GenUiSandbox({
  projectId,
  bundleUrl,
  onMessage,
  onError,
  width = '100%',
  height = 400,
}: GenUiSandboxProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      if (
        iframeRef.current &&
        event.source !== iframeRef.current.contentWindow
      ) {
        return;
      }

      const data = event.data as { type?: string; error?: string };

      if (data.type === 'genui:ready') {
        setLoading(false);
        setError(null);
      } else if (data.type === 'error') {
        const err = new Error(data.error ?? 'Unknown iframe error');
        setError(err.message);
        onError?.(err);
      } else {
        onMessage?.(data);
      }
    },
    [onMessage, onError],
  );

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  /* eslint-disable react-hooks/set-state-in-effect -- reset loading when URL changes before iframe load */
  useEffect(() => {
    setLoading(true);
    setError(null);
  }, [bundleUrl]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleIframeLoad = useCallback(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        setLoading(false);
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [loading]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const cleanup = handleIframeLoad();
    iframe.addEventListener('load', handleIframeLoad);

    return () => {
      cleanup();
      iframe.removeEventListener('load', handleIframeLoad);
    };
  }, [handleIframeLoad]);

  return (
    <div
      className="GenUiSandbox"
      style={{ width, height }}
      data-project-id={projectId}
    >
      {loading && (
        <div className="GenUiSandbox__loading">
          <div className="GenUiSandbox__spinner" />
          <span>Loading generated UI...</span>
        </div>
      )}

      {error && (
        <div className="GenUiSandbox__error">
          <span className="GenUiSandbox__errorIcon">!</span>
          <span>{error}</span>
        </div>
      )}

      <iframe
        ref={iframeRef}
        className="GenUiSandbox__iframe"
        src={bundleUrl}
        sandbox="allow-scripts"
        title={`Gen-UI: ${projectId}`}
        style={{
          opacity: loading ? 0 : 1,
          pointerEvents: error ? 'none' : 'auto',
        }}
      />

      {error && <div className="GenUiSandbox__overlay" />}
    </div>
  );
}
