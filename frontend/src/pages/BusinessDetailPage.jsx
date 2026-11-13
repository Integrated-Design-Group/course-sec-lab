/**
 * 业务条目详情页（只读）
 */
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchBusinessItem } from '../api/business.js';
import { PageHeader } from '../components/PageHeader.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { EmptyState, ErrorState, LoadingState } from '../components/StateViews.jsx';
import {
  CATEGORY_LABELS,
  CONDITION_LABELS,
  formatCurrency,
  formatDateTime,
} from '../utils/format.js';

export function BusinessDetailPage() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setItem(null);

    fetchBusinessItem(id, { signal: controller.signal })
      .then((envelope) => setItem(envelope.data.item))
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [id, reloadKey]);

  return (
    <>
      <PageHeader
        title={`条目详情 #${id}`}
        description="框架阶段只读视图：用于验证详情接口与错误处理。"
        actions={
          <Link className="btn btn-ghost" to="/business">
            ← 返回列表
          </Link>
        }
      />

      {loading && <LoadingState label="正在加载条目详情…" />}

      {!loading && error && error.code === 'NOT_FOUND' && (
        <EmptyState
          title="条目不存在"
          description="该条目可能已被删除，或数据库尚未执行种子脚本。"
          action={
            <Link className="btn btn-outline" to="/business">
              返回列表
            </Link>
          }
        />
      )}

      {!loading && error && error.code !== 'NOT_FOUND' && (
        <ErrorState error={error} onRetry={() => setReloadKey((value) => value + 1)} />
      )}

      {!loading && item && (
        <section className="card">
          <div className="detail-head">
            <h2>{item.title}</h2>
            <StatusBadge status={item.status} />
          </div>

          <dl className="kv kv--wide">
            <div>
              <dt>作者</dt>
              <dd>{item.author}</dd>
            </div>
            <div>
              <dt>分类</dt>
              <dd>{CATEGORY_LABELS[item.category] ?? item.category}</dd>
            </div>
            <div>
              <dt>成色</dt>
              <dd>{CONDITION_LABELS[item.conditionLevel] ?? item.conditionLevel}</dd>
            </div>
            <div>
              <dt>价格</dt>
              <dd>{formatCurrency(item.price)}</dd>
            </div>
            <div>
              <dt>发布者</dt>
              <dd>{item.owner.displayName ?? `用户 #${item.owner.id}`}</dd>
            </div>
            <div>
              <dt>创建时间</dt>
              <dd>{formatDateTime(item.createdAt)}</dd>
            </div>
            <div>
              <dt>更新时间</dt>
              <dd>{formatDateTime(item.updatedAt)}</dd>
            </div>
            <div>
              <dt>封面文件 ID</dt>
              <dd>{item.coverFileId ?? '未上传'}</dd>
            </div>
          </dl>

          <h3>描述</h3>
          <p className={item.description ? '' : 'muted'}>{item.description || '暂无描述'}</p>

          <p className="muted">
            编辑与删除在框架阶段为占位接口（501）。实现时必须补上“仅所有者或管理员可操作”的鉴权。
          </p>
        </section>
      )}
    </>
  );
}
