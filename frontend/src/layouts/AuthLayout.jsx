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

        <h1>课程安全靶场演示环境</h1>
        <p className="auth-intro__lead">
          本系统用于课程授权范围内的 Web 安全测试，当前为 M1 业务阶段：登录、条目增删改查、封面上传与审计已可用。
        </p>

        <ul className="auth-intro__list">
          <li>登录 / 退出 / 当前用户最小闭环</li>
          <li>统一响应格式与错误码</li>
          <li>条目 CRUD + 归属校验 + 状态机</li>
          <li>受控鉴权的封面读取与审计日志</li>
          <li>独立隔离部署，仅用于授权测试</li>
        </ul>

        <p className="auth-intro__warning">
          ⚠ 当前仍<strong>未</strong>植入 SQL 注入、XSS、越权、文件上传等漏洞；漏洞设计与实现计划见 docs/08。
        </p>
      </section>

      <section className="auth-panel">
        <Outlet />
      </section>
    </div>
  );
}
