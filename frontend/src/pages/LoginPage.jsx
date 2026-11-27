/**
 * 登录页：课程授权环境入口
 */
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth.jsx';

const DEMO_ACCOUNTS = [
  { label: '管理员', username: 'admin', password: 'Demo@123456' },
  { label: '学生', username: 'student', password: 'Demo@123456' },
];

export function LoginPage() {
  const { signIn, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname ?? '/';

  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (status === 'authenticated') {
    return <Navigate to={from} replace />;
  }

  function updateField(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  function fillDemo(account) {
    setForm({ username: account.username, password: account.password });
    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await signIn(form);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || '登录失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-card">
      <header className="login-card__header">
        <h2>登录</h2>
        <p className="muted">课程内网全量靶场入口：5 个漏洞默认开启，仅限课程授权环境使用。</p>
      </header>

      {error && (
        <div className="alert alert--error" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="form" noValidate>
        <label className="form-field">
          <span>用户名或邮箱</span>
          <input
            type="text"
            name="username"
            autoComplete="username"
            value={form.username}
            onChange={updateField('username')}
            placeholder="admin"
            required
            minLength={3}
            maxLength={64}
          />
        </label>

        <label className="form-field">
          <span>密码</span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            value={form.password}
            onChange={updateField('password')}
            placeholder="至少 8 位"
            required
            minLength={8}
            maxLength={128}
          />
        </label>

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? '登录中…' : '登录'}
        </button>
      </form>

      <div className="demo-accounts">
        <p className="muted">演示账号（密码均为 <code>Demo@123456</code>，仅限课程环境使用）</p>
        <div className="demo-accounts__buttons">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.username}
              type="button"
              className="btn btn-outline btn-small"
              onClick={() => fillDemo(account)}
            >
              填入{account.label}账号
            </button>
          ))}
        </div>
      </div>

      <p className="muted login-card__footer">
        认证方式：JWT Bearer Token；密码使用 bcrypt 哈希存储；退出登录后令牌立即失效。
      </p>
    </div>
  );
}
