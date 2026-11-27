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

        <h1>课程授权靶场演示环境</h1>
        <p className="auth-intro__lead">
          本系统用于课程授权范围内的 Web 安全测试。main 保持安全基线；课程内网全量靶场位于独立的
          vuln/ALL 分支（默认 VULN_MODE=ALL）。
        </p>

        <ul className="auth-intro__list">
          <li>M1：登录 / 条目 CRUD / 封面受控读取 / 管理端</li>
          <li>M2：VULN-01～05 位于 vuln/ALL（默认 ALL，不合入 main）</li>
          <li>B-09：VULN-01～05 已完成验证；VULN-01/04 已补全</li>
          <li>M3：课程授权云服务器 HTTP 8080 已部署</li>
          <li>main 不包含漏洞代码，仅课程内网使用全量靶场</li>
        </ul>

        <p className="auth-intro__warning">
          ⚠ 全量靶场仅限课程内网；漏洞细节与验证方法见 docs/08 与 docs/16。
        </p>
      </section>

      <section className="auth-panel">
        <Outlet />
      </section>
    </div>
  );
}
