/**
 * 业务条目新建 / 编辑页（A-05）
 * 路由：/business/new 与 /business/:id/edit
 * - 编辑时校验归属：只有所有者或管理员可进入
 * - 提交后统一处理字段级错误（VALIDATION_ERROR.details）与冲突（CONFLICT）
 * - 封面：先上传拿 fileId，再随条目提交；支持移除
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  createBusinessItem,
  fetchBusinessItem,
  fetchCoverBlob,
  updateBusinessItem,
  uploadFile,
} from '../api/business.js';
import { PageHeader } from '../components/PageHeader.jsx';
import { EmptyState, ErrorState, LoadingState } from '../components/StateViews.jsx';
import { useAuth } from '../store/auth.jsx';
import { CATEGORY_LABELS, CONDITION_LABELS, STATUS_LABELS } from '../utils/format.js';

const EMPTY_FORM = {
  title: '',
  author: '',
  category: 'textbook',
  conditionLevel: 'good',
  price: '',
  description: '',
  status: 'draft',
};

export function BusinessFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY_FORM);
  const [coverFileId, setCoverFileId] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState(null);
  const [forbidden, setForbidden] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!isEdit) {
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);

    fetchBusinessItem(id, { signal: controller.signal })
      .then((envelope) => {
        const current = envelope.data.item;
        setItem(current);
        if (user && (user.role === 'admin' || current.owner.id === user.id)) {
          setForm({
            title: current.title,
            author: current.author,
            category: current.category,
            conditionLevel: current.conditionLevel,
            price: String(current.price),
            description: current.description ?? '',
            status: current.status,
          });
          setCoverFileId(current.coverFileId ?? null);
        } else {
          setForbidden(true);
        }
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setLoadError(error);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [id, isEdit, user]);

  useEffect(() => {
    if (!coverFileId) {
      setCoverPreview('');
      return undefined;
    }

    const controller = new AbortController();
    let objectUrl = '';
    fetchCoverBlob(coverFileId, { signal: controller.signal })
      .then((blob) => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setCoverPreview(objectUrl);
      })
      .catch(() => setCoverPreview(''))
      .finally(() => {
        if (controller.signal.aborted && objectUrl) URL.revokeObjectURL(objectUrl);
      });

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [coverFileId]);

  function updateField(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  function validate() {
    const errors = {};
    if (!form.title.trim()) errors.title = '标题不能为空';
    if (!form.author.trim()) errors.author = '作者不能为空';
    const price = Number(form.price);
    if (form.price === '' || !Number.isFinite(price) || price < 0) errors.price = '价格必须是 ≥ 0 的数字';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploading(true);
    setFormError('');
    try {
      const envelope = await uploadFile(file);
      setCoverFileId(envelope.data.file.id);
    } catch (error) {
      setFormError(error.message || '封面上传失败');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        author: form.author.trim(),
        category: form.category,
        conditionLevel: form.conditionLevel,
        price: Number(form.price),
        description: form.description.trim(),
        coverFileId,
      };

      const envelope = isEdit
        ? await updateBusinessItem(id, {
            ...payload,
            status: form.status,
            expectedUpdatedAt: item?.updatedAt,
          })
        : await createBusinessItem(payload);

      navigate(`/business/${envelope.data.item.id}`, { replace: true });
    } catch (error) {
      if (error.code === 'VALIDATION_ERROR' && Array.isArray(error.details)) {
        const errors = {};
        for (const detail of error.details) errors[detail.field] = detail.message;
        setFieldErrors(errors);
      } else if (error.code === 'FORBIDDEN') {
        setForbidden(true);
      } else {
        setFormError(error.message || '保存失败，请稍后重试');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState label="正在加载条目…" />;
  if (loadError && loadError.code === 'NOT_FOUND') {
    return (
      <EmptyState
        title="条目不存在"
        description="该条目可能已被删除。"
        action={
          <Link className="btn btn-outline" to="/business">
            返回列表
          </Link>
        }
      />
    );
  }
  if (loadError) return <ErrorState error={loadError} onRetry={() => navigate(0)} />;
  if (forbidden) {
    return (
      <EmptyState
        title="403 · 无权编辑该条目"
        description="只有条目所有者或管理员可以编辑。"
        action={
          <Link className="btn btn-outline" to="/business">
            返回列表
          </Link>
        }
      />
    );
  }

  return (
    <>
      <PageHeader
        title={isEdit ? `编辑条目 #${id}` : '新建条目'}
        description="字段校验、归属校验与状态流转均由后端强制执行；本页只负责收集与展示错误。"
        actions={
          <Link className="btn btn-ghost" to={isEdit ? `/business/${id}` : '/business'}>
            ← 取消
          </Link>
        }
      />

      {formError && (
        <div className="alert alert--error" role="alert">
          {formError}
        </div>
      )}

      <section className="card">
        <form className="form" onSubmit={handleSubmit} noValidate>
          <div className="form-grid">
            <label className="form-field">
              <span>标题 *</span>
              <input type="text" value={form.title} onChange={updateField('title')} maxLength={120} />
              {fieldErrors.title && <small className="field-error">{fieldErrors.title}</small>}
            </label>

            <label className="form-field">
              <span>作者 / 整理者 *</span>
              <input type="text" value={form.author} onChange={updateField('author')} maxLength={64} />
              {fieldErrors.author && <small className="field-error">{fieldErrors.author}</small>}
            </label>

            <label className="form-field">
              <span>分类</span>
              <select value={form.category} onChange={updateField('category')}>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span>成色</span>
              <select value={form.conditionLevel} onChange={updateField('conditionLevel')}>
                {Object.entries(CONDITION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span>价格（元）</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={updateField('price')}
                placeholder="例如 25.50"
              />
              {fieldErrors.price && <small className="field-error">{fieldErrors.price}</small>}
            </label>

            {isEdit && (
              <label className="form-field">
                <span>状态</span>
                <select value={form.status} onChange={updateField('status')}>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <small className="muted">状态流转由后端校验，非法流转会返回 409。</small>
              </label>
            )}
          </div>

          <label className="form-field">
            <span>描述</span>
            <textarea value={form.description} onChange={updateField('description')} rows={6} maxLength={4000} />
            {fieldErrors.description && <small className="field-error">{fieldErrors.description}</small>}
          </label>

          <div className="form-field">
            <span>封面（PNG / JPEG / WebP，≤ 2MB）</span>
            <div className="cover-editor">
              {coverPreview ? (
                <img className="cover-preview" src={coverPreview} alt="封面预览" />
              ) : (
                <div className="cover-placeholder">未设置封面</div>
              )}
              <div className="cover-editor__actions">
                <label className="btn btn-outline btn-small">
                  {uploading ? '上传中…' : coverFileId ? '更换封面' : '上传封面'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleUpload}
                    disabled={uploading}
                    hidden
                  />
                </label>
                {coverFileId && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-small"
                    onClick={() => setCoverFileId(null)}
                  >
                    移除封面
                  </button>
                )}
                {fieldErrors.coverFileId && <small className="field-error">{fieldErrors.coverFileId}</small>}
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={submitting || uploading}>
              {submitting ? '保存中…' : isEdit ? '保存修改' : '创建条目'}
            </button>
            <Link className="btn btn-ghost" to={isEdit ? `/business/${id}` : '/business'}>
              取消
            </Link>
          </div>
        </form>
      </section>
    </>
  );
}
