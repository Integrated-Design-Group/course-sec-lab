/**
 * 管理后台占位页（仅 admin 可见）
 * 框架阶段只展示后续规划，不提供任何真实管理能力。
 */
import { PageHeader } from '../components/PageHeader.jsx';

export function AdminPage() {
  return (
    <>
      <PageHeader
        title="管理后台（占位）"
        description="角色守卫已生效；具体管理能力留待后续 Issue。"
      />

      <section className="card">
        <h2>后续规划</h2>
        <ul className="check-list">
          <li className="check-list__pending">用户管理：查看用户、停用账号（需审计日志）</li>
          <li className="check-list__pending">业务条目审核：上下架、归档</li>
          <li className="check-list__pending">审计日志检索：按操作人 / 动作 / 时间</li>
          <li className="check-list__pending">上传文件治理：清理孤儿文件、限制配额</li>
        </ul>
        <p className="muted">
          注意：前端守卫只影响可见性，所有管理接口必须在后端使用 requireRole('admin') 做独立鉴权。
        </p>
      </section>
    </>
  );
}
