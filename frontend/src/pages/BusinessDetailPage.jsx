/**
 * 业务条目详情页（M1）
 * - 只读信息对所有访问者开放
 * - 所有者或管理员可编辑 / 删除（服务端同样强制校验）
 * - 封面通过受控鉴权接口读取，用 Blob URL 渲染
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { deleteBusinessItem, fetchBusinessItem, fetchCoverBlob } from '../api/business.js';
import { fetchHealth } from '../api/health.js';
import { PageHeader } from '../components/PageHeader.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { EmptyState, ErrorState, LoadingState } from '../components/StateViews.jsx';
import { useAuth } from '../store/auth.jsx';
import {
  CATEGORY_LABELS,
  CONDITION_LABELS,
  formatCurrency,
  formatDateTime,
} from '../utils/format.js';

export function BusinessDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [coverUrl, setCoverUrl] = useState('');
  const [actionError, setActionError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [vulnMode, setVulnMode] = useState('off');

  useEffect(() => {
    const controller = new AbortController();
    fetchHealth({ signal: controller.signal })
      .then((envelope) => setVulnMode(envelope.data?.vulnMode ?? 'off'))
      .catch(() => setVulnMode('off'));
    return () => controller.abort();
  }, []);

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

  useEffect(() => {
    if (!item?.coverFileId) {
      setCoverUrl('');
      return undefined;
    }

    const controller = new AbortController();
    let objectUrl = '';
    fetchCoverBlob(item.coverFileId, { signal: controller.signal })
      .then((blob) => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setCoverUrl(objectUrl);
      })
      .catch(() => setCoverUrl(''));

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [item?.coverFileId]);

  const canEdit = Boolean(item && user && (user.role === 'admin' || item.owner.id === user.id));

  async function handleDelete() {
    if (!item) return;
    const confirmed = window.confirm(`确定删除条目「${item.title}」吗？删除后不可在列表中恢复。`);
    if (!confirmed) return;

    setDeleting(true);
    setActionError('');
    try {
      await deleteBusinessItem(item.id);
      navigate('/business', { replace: true });
    } catch (err) {
      setActionError(err.message || '删除失败，请稍后重试');
      setDeleting(false);
    }
  }

  return (
    <>
      <PageHeader
        title={`条目详情 #${id}`}
        description="读接口公开；写操作仅限条目所有者或管理员。"
        actions={
          <>
            <Link className="btn btn-ghost" to="/business">
              ← 返回列表
            </Link>
            {canEdit && (
              <>
                <Link className="btn btn-outline" to={`/business/${id}/edit`}>
                  编辑
                </Link>
                <button type="button" className="btn btn-outline" onClick={handleDelete} disabled={deleting}>
                  {deleting ? '删除中…' : '删除'}
                </button>
              </>
            )}
          </>
        }
      />

      {actionError && (
        <div className="alert alert--error" role="alert">
          {actionError}
        </div>
      )}

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

          <div className="detail-layout">
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
            </dl>

            {coverUrl && (
              <figure className="cover-figure">
                <img src={coverUrl} alt={`${item.title} 封面`} />
                <figcaption className="muted">封面（受控鉴权读取）</figcaption>
              </figure>
            )}
          </div>

          <h3>描述</h3>
          {item.description ? (
            vulnMode === 'VULN-02' || vulnMode === 'ALL' ? (
              // ──【刻意漏洞 VULN-02】ALL / VULN-02 时把描述当作 HTML 渲染 ──
              <p className="pre-wrap" dangerouslySetInnerHTML={{ __html: item.description }} />
            ) : (
              <p className="pre-wrap">{item.description}</p>
            )
          ) : (
            <p className="muted">暂无描述</p>
          )}

          <p className="muted">
            {canEdit
              ? '你是该条目的所有者或管理员，可编辑内容与状态。'
              : '只有条目所有者或管理员可以编辑 / 删除；前端隐藏按钮只是体验优化。'}
          </p>
        </section>
      )}
    </>
  );
}
