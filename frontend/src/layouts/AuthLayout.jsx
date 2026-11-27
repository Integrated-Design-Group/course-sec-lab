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
          本系统用于课程授权范围内的 Web 安全测试。main 保持安全基线；5 个漏洞实现位于独立的
          vuln/* 分支（默认 off），并已完成云服务器 loopback 验证。
        </p>

        <ul className="auth-intro__list">
          <li>M1：登录 / 条目 CRUD / 封面受控读取 / 管理端</li>
          <li>M2：VULN-01～05 独立分支，默认关闭（VULN_MODE=off）</li>
          <li>B-09：服务器 loopback 逐项验证；漏洞实例不公网暴露</li>
          <li>M3：课程授权云服务器 HTTP 8080 已部署</li>
          <li>独立隔离部署，仅用于授权测试</li>
        </ul>

        <p className="auth-intro__warning">
          ⚠ main 不合并漏洞代码；VULN-01/04 仅部分达到设计目标。详见 docs/08 与 docs/14。
        </p>
      </section>

      <section className="auth-panel">
        <Outlet />
      </section>
    </div>
  );
}
