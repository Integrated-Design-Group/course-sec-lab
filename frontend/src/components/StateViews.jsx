/**
 * 状态视图组件：统一 loading / error / empty 的呈现
 */
export function FullPageLoading({ label = '加载中…' }) {
  return (
    <div className="full-page-loading" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

export function LoadingState({ label = '加载中…' }) {
  return (
    <div className="state-inline" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="state-card state-card--error" role="alert">
      <h3>请求失败</h3>
      <p>{error?.message ?? '未知错误'}</p>
      {error?.code && (
        <p className="muted">
          错误码：<code>{error.code}</code>
          {error.requestId ? ` · 请求 ID：${error.requestId}` : ''}
        </p>
      )}
      {onRetry && (
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          重试
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title = '暂无数据', description, action }) {
  return (
    <div className="state-card">
      <h3>{title}</h3>
      {description && <p className="muted">{description}</p>}
      {action}
    </div>
  );
}
