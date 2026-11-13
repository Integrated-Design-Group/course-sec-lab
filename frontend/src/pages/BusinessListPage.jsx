/**
 * 业务条目列表页（只读）
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listBusinessItems } from '../api/business.js';
import { PageHeader } from '../components/PageHeader.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { EmptyState, ErrorState, LoadingState } from '../components/StateViews.jsx';
import {
  CATEGORY_LABELS,
  CONDITION_LABELS,
  STATUS_LABELS,
  formatCurrency,
  formatDateTime,
} from '../utils/format.js';

const PAGE_SIZE = 10;

export function BusinessListPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    listBusinessItems({
      page,
      pageSize: PAGE_SIZE,
      status: status || undefined,
      keyword: keyword || undefined,
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
  }, [page, status, keyword, reloadKey]);

  const items = data?.data?.items ?? [];
  const pagination = data?.meta?.pagination ?? null;
  const hasFilters = Boolean(status || keyword);

  function handleSearch(event) {
    event.preventDefault();
    setPage(1);
    setKeyword(searchInput.trim());
  }

  function clearFilters() {
    setSearchInput('');
    setKeyword('');
    setStatus('');
    setPage(1);
  }

  return (
    <>
      <PageHeader
        title="教材条目"
        description="框架阶段只读列表：写操作尚未实现，接口返回 501 占位。"
        actions={
          <button
            type="button"
            className="btn btn-primary"
            disabled
            title="框架阶段占位，后续 Issue 实现"
          >
            新增条目（占位）
          </button>
        }
      />

      <section className="card">
        <form className="filters" onSubmit={handleSearch}>
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="搜索标题或作者"
            aria-label="搜索关键词"
          />
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            aria-label="按状态过滤"
          >
            <option value="">全部状态</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn-primary">
            搜索
          </button>
          {hasFilters && (
            <button type="button" className="btn btn-ghost" onClick={clearFilters}>
              清除筛选
            </button>
          )}
        </form>

        {loading && <LoadingState label="正在加载业务条目…" />}
        {!loading && error && (
          <ErrorState error={error} onRetry={() => setReloadKey((value) => value + 1)} />
        )}

        {!loading && !error && items.length === 0 && (
          <EmptyState
            title="没有符合条件的条目"
            description={hasFilters ? '尝试清除筛选条件，或使用其他关键词。' : '数据库暂无业务条目。'}
          />
        )}

        {!loading && !error && items.length > 0 && (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>标题</th>
                  <th>作者</th>
                  <th>分类</th>
                  <th>成色</th>
                  <th className="align-right">价格</th>
                  <th>状态</th>
                  <th>创建时间</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link to={`/business/${item.id}`}>{item.title}</Link>
                    </td>
                    <td>{item.author}</td>
                    <td>{CATEGORY_LABELS[item.category] ?? item.category}</td>
                    <td>{CONDITION_LABELS[item.conditionLevel] ?? item.conditionLevel}</td>
                    <td className="align-right">{formatCurrency(item.price)}</td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="muted">{formatDateTime(item.createdAt)}</td>
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
                onClick={() => setPage((value) => Math.max(value - 1, 1))}
                disabled={!pagination.hasPrev || loading}
              >
                上一页
              </button>
              <button
                type="button"
                className="btn btn-outline btn-small"
                onClick={() => setPage((value) => value + 1)}
                disabled={!pagination.hasNext || loading}
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
