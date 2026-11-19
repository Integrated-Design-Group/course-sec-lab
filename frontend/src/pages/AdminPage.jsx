/**
 * 管理后台（A-07）
 * 三个只读/受控操作面板：用户管理、条目审核、审计日志。
 * 前端守卫只影响可见性；所有接口在服务端要求 admin 角色。
 */
import { useCallback, useEffect, useState } from 'react';
import { listAuditLogs, listUsers, updateUserStatus } from '../api/admin.js';
import { listBusinessItems, updateBusinessItem } from '../api/business.js';
import { PageHeader } from '../components/PageHeader.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { EmptyState, ErrorState, LoadingState } from '../components/StateViews.jsx';
import { useAuth } from '../store/auth.jsx';
import { STATUS_LABELS, ROLE_LABELS, formatDateTime } from '../utils/format.js';

const TABS = [
  { id: 'users', label: '用户管理' },
  { id: 'items', label: '条目审核' },
  { id: 'audit', label: '审计日志' },
];

export function AdminPage() {
  const [tab, setTab] = useState('users');

  return (
    <>
      <PageHeader
        title="管理后台"
        description="用户启停、条目状态审核与审计检索；所有操作写审计日志。"
      />

      <div className="tabs" role="tablist" aria-label="管理后台分区">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={tab === item.id ? 'tab tab--active' : 'tab'}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'users' && <UsersPanel />}
      {tab === 'items' && <ItemsPanel />}
      {tab === 'audit' && <AuditPanel />}
    </>
  );
}

function UsersPanel() {
  const { user: currentUser } = useAuth();
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    listUsers({ page, pageSize: 10, status: status || undefined, signal: controller.signal })
      .then((envelope) => setData(envelope))
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, status, reloadKey]);

  async function toggleStatus(target) {
    const next = target.status === 'active' ? 'disabled' : 'active';
    setBusyId(target.id);
    setActionError('');
    try {
      await updateUserStatus(target.id, next);
      setReloadKey((value) => value + 1);
    } catch (err) {
      setActionError(err.message || '操作失败');
    } finally {
      setBusyId(null);
    }
  }

  const users = data?.data?.users ?? [];
  const pagination = data?.meta?.pagination ?? null;

  return (
    <section className="card">
      <div className="filters">
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          aria-label="按账号状态过滤"
        >
          <option value="">全部状态</option>
          <option value="active">启用</option>
          <option value="disabled">停用</option>
        </select>
      </div>

      {actionError && (
        <div className="alert alert--error" role="alert">
          {actionError}
        </div>
      )}

      {loading && <LoadingState label="正在加载用户列表…" />}
      {!loading && error && <ErrorState error={error} onRetry={() => setReloadKey((v) => v + 1)} />}
      {!loading && !error && users.length === 0 && <EmptyState title="没有符合条件的用户" />}

      {!loading && !error && users.length > 0 && (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>用户名</th>
                <th>显示名</th>
                <th>角色</th>
                <th>状态</th>
                <th>最近登录</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.username}</td>
                  <td>{row.displayName ?? '—'}</td>
                  <td>{ROLE_LABELS[row.role] ?? row.role}</td>
                  <td>
                    <span className={`badge badge-${row.status === 'active' ? 'success' : 'danger'}`}>
                      {row.status === 'active' ? '启用' : '停用'}
                    </span>
                  </td>
                  <td className="muted">{formatDateTime(row.lastLoginAt)}</td>
                  <td>
                    {row.id === currentUser?.id ? (
                      <span className="muted">当前账号</span>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-outline btn-small"
                        onClick={() => toggleStatus(row)}
                        disabled={busyId === row.id}
                      >
                        {busyId === row.id ? '处理中…' : row.status === 'active' ? '停用' : '启用'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination && (
        <div className="pagination">
          <span className="muted">
            共 {pagination.total} 个用户 · 第 {pagination.page} / {Math.max(pagination.totalPages, 1)} 页
          </span>
          <div className="pagination__actions">
            <button
              type="button"
              className="btn btn-outline btn-small"
              disabled={!pagination.hasPrev}
              onClick={() => setPage((v) => Math.max(v - 1, 1))}
            >
              上一页
            </button>
            <button
              type="button"
              className="btn btn-outline btn-small"
              disabled={!pagination.hasNext}
              onClick={() => setPage((v) => v + 1)}
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function ItemsPanel() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    listBusinessItems({
      page,
      pageSize: 10,
      status: status || undefined,
      signal: controller.signal,
    })
      .then((envelope) => setData(envelope))
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, status, reloadKey]);

  async function changeStatus(item, nextStatus) {
    if (nextStatus === item.status) return;
    setBusyId(item.id);
    setActionError('');
    try {
      await updateBusinessItem(item.id, { status: nextStatus });
      setReloadKey((value) => value + 1);
    } catch (err) {
      setActionError(`${item.title}：${err.message || '状态更新失败'}`);
      setReloadKey((value) => value + 1);
    } finally {
      setBusyId(null);
    }
  }

  const items = data?.data?.items ?? [];
  const pagination = data?.meta?.pagination ?? null;

  return (
    <section className="card">
      <div className="filters">
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          aria-label="按条目状态过滤"
        >
          <option value="">全部状态</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {actionError && (
        <div className="alert alert--error" role="alert">
          {actionError}
        </div>
      )}

      {loading && <LoadingState label="正在加载条目…" />}
      {!loading && error && <ErrorState error={error} onRetry={() => setReloadKey((v) => v + 1)} />}
      {!loading && !error && items.length === 0 && <EmptyState title="没有符合条件的条目" />}

      {!loading && !error && items.length > 0 && (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>标题</th>
                <th>发布者</th>
                <th>当前状态</th>
                <th>调整状态</th>
                <th>更新时间</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.title}</td>
                  <td>{item.owner.displayName ?? `用户 #${item.owner.id}`}</td>
                  <td>
                    <StatusBadge status={item.status} />
                  </td>
                  <td>
                    <select
                      className="table-select"
                      value={item.status}
                      disabled={busyId === item.id}
                      onChange={(event) => changeStatus(item, event.target.value)}
                      aria-label={`调整 ${item.title} 的状态`}
                    >
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="muted">{formatDateTime(item.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination && (
        <div className="pagination">
          <span className="muted">
            共 {pagination.total} 条 · 第 {pagination.page} / {Math.max(pagination.totalPages, 1)} 页
          </span>
          <div className="pagination__actions">
            <button
              type="button"
              className="btn btn-outline btn-small"
              disabled={!pagination.hasPrev}
              onClick={() => setPage((v) => Math.max(v - 1, 1))}
            >
              上一页
            </button>
            <button
              type="button"
              className="btn btn-outline btn-small"
              disabled={!pagination.hasNext}
              onClick={() => setPage((v) => v + 1)}
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function AuditPanel() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [actionInput, setActionInput] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    listAuditLogs({
      page,
      pageSize: 20,
      action: action || undefined,
      result: result || undefined,
      signal: controller.signal,
    })
      .then((envelope) => setData(envelope))
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return controller;
  }, [page, action, result, reloadKey]);

  useEffect(() => {
    const controller = load();
    return () => controller.abort();
  }, [load]);

  function handleSearch(event) {
    event.preventDefault();
    setPage(1);
    setAction(actionInput.trim());
  }

  const logs = data?.data?.logs ?? [];
  const pagination = data?.meta?.pagination ?? null;

  return (
    <section className="card">
      <form className="filters" onSubmit={handleSearch}>
        <input
          type="search"
          value={actionInput}
          onChange={(event) => setActionInput(event.target.value)}
          placeholder="按动作过滤，如 business_item.create"
          aria-label="按动作过滤审计日志"
        />
        <select
          value={result}
          onChange={(event) => {
            setResult(event.target.value);
            setPage(1);
          }}
          aria-label="按结果过滤审计日志"
        >
          <option value="">全部结果</option>
          <option value="success">成功</option>
          <option value="failure">失败</option>
        </select>
        <button type="submit" className="btn btn-primary">
          检索
        </button>
      </form>

      {loading && <LoadingState label="正在加载审计日志…" />}
      {!loading && error && <ErrorState error={error} onRetry={() => setReloadKey((v) => v + 1)} />}
      {!loading && !error && logs.length === 0 && <EmptyState title="没有符合条件的审计日志" />}

      {!loading && !error && logs.length > 0 && (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>时间</th>
                <th>操作人</th>
                <th>动作</th>
                <th>结果</th>
                <th>资源</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="muted">{formatDateTime(log.createdAt)}</td>
                  <td>{log.actorId ?? '—'}</td>
                  <td>
                    <code>{log.action}</code>
                  </td>
                  <td>
                    <span className={`badge badge-${log.result === 'success' ? 'success' : 'danger'}`}>
                      {log.result === 'success' ? '成功' : '失败'}
                    </span>
                  </td>
                  <td>
                    {log.resourceType ?? '—'}
                    {log.resourceId ? ` #${log.resourceId}` : ''}
                  </td>
                  <td className="muted">{log.ip ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination && (
        <div className="pagination">
          <span className="muted">
            共 {pagination.total} 条 · 第 {pagination.page} / {Math.max(pagination.totalPages, 1)} 页
          </span>
          <div className="pagination__actions">
            <button
              type="button"
              className="btn btn-outline btn-small"
              disabled={!pagination.hasPrev}
              onClick={() => setPage((v) => Math.max(v - 1, 1))}
            >
              上一页
            </button>
            <button
              type="button"
              className="btn btn-outline btn-small"
              disabled={!pagination.hasNext}
              onClick={() => setPage((v) => v + 1)}
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
