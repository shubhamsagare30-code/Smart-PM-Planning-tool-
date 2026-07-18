import { useCallback, useEffect, useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';

export type ApiDiagStatus = 'checking' | 'ok' | 'error' | 'idle';

export interface ApiDiagResult {
  status: ApiDiagStatus;
  httpStatus?: number;
  message: string;
  detail?: string;
  ms?: number;
  checkedAt?: string;
}

async function probeHealth(timeoutMs = 25000): Promise<ApiDiagResult> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch('/api/health', { signal: controller.signal, cache: 'no-store' });
    const text = await res.text();
    const ms = Date.now() - started;
    if (res.ok) {
      return {
        status: 'ok',
        httpStatus: res.status,
        message: 'API is reachable',
        detail: text.slice(0, 200),
        ms,
        checkedAt: new Date().toLocaleTimeString(),
      };
    }
    const isProxyFail = res.status === 502 || text.includes('ROUTER_EXTERNAL_TARGET_ERROR');
    return {
      status: 'error',
      httpStatus: res.status,
      message: isProxyFail
        ? 'Backend (Render) is down or unreachable'
        : `API returned HTTP ${res.status}`,
      detail: text.slice(0, 240) || undefined,
      ms,
      checkedAt: new Date().toLocaleTimeString(),
    };
  } catch (e) {
    const ms = Date.now() - started;
    const aborted = e instanceof DOMException && e.name === 'AbortError';
    return {
      status: 'error',
      message: aborted
        ? 'API health check timed out (Render may be asleep or crashed)'
        : 'Network error reaching /api/health',
      detail: String(e),
      ms,
      checkedAt: new Date().toLocaleTimeString(),
    };
  } finally {
    clearTimeout(timer);
  }
}

interface ApiDiagnosticsProps {
  autoCheck?: boolean;
  lastLoginError?: string | null;
}

/** Connection debugger for login / production troubleshooting */
export function ApiDiagnostics({ autoCheck = true, lastLoginError }: ApiDiagnosticsProps) {
  const [result, setResult] = useState<ApiDiagResult>({ status: 'idle', message: 'Not checked yet' });
  const [open, setOpen] = useState(true);

  const runCheck = useCallback(async () => {
    setResult({ status: 'checking', message: 'Checking /api/health…' });
    const next = await probeHealth();
    setResult(next);
    // Always log for DevTools debugging
    console.info('[SmartPM diagnostics]', next);
  }, []);

  useEffect(() => {
    if (autoCheck) void runCheck();
  }, [autoCheck, runCheck]);

  const color =
    result.status === 'ok'
      ? 'border-green-200 bg-green-50 text-green-800'
      : result.status === 'error'
        ? 'border-amber-200 bg-amber-50 text-amber-900'
        : result.status === 'checking'
          ? 'border-blue-200 bg-blue-50 text-blue-800'
          : 'border-gray-200 bg-gray-50 text-gray-700';

  return (
    <div className={`mt-4 rounded-lg border text-xs ${color}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left font-medium"
      >
        <span className="flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5" />
          Connection debugger
        </span>
        <span>{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && (
        <div className="space-y-2 border-t border-black/5 px-3 py-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold">{result.message}</p>
              {result.httpStatus != null && <p>HTTP {result.httpStatus}{result.ms != null ? ` · ${result.ms}ms` : ''}</p>}
              {result.checkedAt && <p className="opacity-70">Checked at {result.checkedAt}</p>}
              {result.detail && (
                <pre className="mt-1 max-h-20 overflow-auto whitespace-pre-wrap rounded bg-black/5 p-1.5 text-[10px]">{result.detail}</pre>
              )}
              {lastLoginError && (
                <p className="mt-2 font-medium text-red-700">Last login: {lastLoginError}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => void runCheck()}
              disabled={result.status === 'checking'}
              className="inline-flex shrink-0 items-center gap-1 rounded border border-black/10 bg-white/80 px-2 py-1 hover:bg-white disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${result.status === 'checking' ? 'animate-spin' : ''}`} />
              Recheck
            </button>
          </div>
          {result.status === 'error' && (
            <ol className="list-decimal space-y-1 pl-4 opacity-90">
              <li>Open Render → service <strong>smart-pm-planning-tool</strong> → confirm status is Live</li>
              <li>Check logs for crash errors (migrations / startup)</li>
              <li>Open <a className="underline" href="https://smart-pm-planning-tool.onrender.com/api/health" target="_blank" rel="noreferrer">API health</a> directly (wait up to 1 min on free tier)</li>
              <li>Then click Recheck here and try Sign in again</li>
            </ol>
          )}
        </div>
      )}
    </div>
  );
}

export { probeHealth };
