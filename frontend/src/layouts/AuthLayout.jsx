/**
 * 认证布局：左侧品牌说明 + 右侧表单
 */
import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="auth-shell">
      <section className="auth-intro">
        <div className="auth-intro__brand">
          <img src="/favicon.svg" alt="" width="40" height="40" />
          <div>
            <strong>课程安全靶场</strong>
            <p>校园二手教材交易平台</p>
          </div>
        </div>

        <h1>课程内网全量靶场</h1>
        <p className="auth-intro__lead">
          本实例用于课程授权范围内的安全测试。5 个漏洞在独立 vuln/ALL 分支默认开启
          （VULN_MODE=ALL）；main 仍保持安全基线。
        </p>

        <ul className="auth-intro__list">
          <li>M1：登录 / 条目 CRUD / 封面受控读取 / 管理端</li>
          <li>VULN-01：登录 SQL 注入（可绕过密码）</li>
          <li>VULN-02：描述存储型 XSS（详情页执行）</li>
          <li>VULN-03：条目水平越权</li>
          <li>VULN-04：不安全上传 + 公开读取执行</li>
          <li>VULN-05：登录限流失效</li>
        </ul>

        <p className="auth-intro__warning">
          ⚠ 仅限课程内部使用；不要对非本项目目标测试。漏洞细节与验证方法见 docs/08、docs/16。
        </p>
      </section>

      <section className="auth-panel">
        <Outlet />
      </section>
    </div>
  );
}
