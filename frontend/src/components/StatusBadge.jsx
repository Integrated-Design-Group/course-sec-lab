/**
 * 业务状态徽标
 */
const STATUS_META = {
  draft: { label: '草稿', tone: 'neutral' },
  published: { label: '已发布', tone: 'success' },
  reserved: { label: '已预订', tone: 'warning' },
  sold: { label: '已售出', tone: 'info' },
  archived: { label: '已归档', tone: 'neutral' },
};

export function StatusBadge({ status }) {
  const meta = STATUS_META[status] ?? { label: status ?? '未知', tone: 'neutral' };
  return <span className={`badge badge-${meta.tone}`}>{meta.label}</span>;
}
