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

        <h1>框架阶段演示环境</h1>
        <p className="auth-intro__lead">
          本系统为课程小组自主设计的 Web 管理系统框架，当前仅完成工程骨架、数据库结构、API 契约与最小登录链路。
        </p>

        <ul className="auth-intro__list">
          <li>登录 / 退出 / 当前用户最小闭环</li>
          <li>统一响应格式与错误码</li>
          <li>业务条目只读接口（写操作为 501 占位）</li>
          <li>独立隔离部署，仅用于授权测试</li>
        </ul>

        <p className="auth-intro__warning">
          ⚠ 框架阶段<strong>未</strong>植入 SQL 注入、XSS、越权、文件上传等漏洞；漏洞设计见 docs/08。
        </p>
      </section>

      <section className="auth-panel">
        <Outlet />
      </section>
    </div>
  );
}
