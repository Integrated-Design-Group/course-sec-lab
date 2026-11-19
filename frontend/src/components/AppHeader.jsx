/**
 * 顶部导航
 */
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth.jsx';
import { ROLE_LABELS } from '../utils/format.js';

function navClass({ isActive }) {
  return isActive ? 'nav-link nav-link--active' : 'nav-link';
}

export function AppHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
      navigate('/login', { replace: true });
    }
  }

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <NavLink to="/" className="brand" end>
          <img src="/favicon.svg" alt="" width="30" height="30" />
          <span className="brand__text">
            <strong>课程安全靶场</strong>
            <small>校园二手教材交易平台</small>
          </span>
        </NavLink>

        <nav className="main-nav" aria-label="主导航">
          <NavLink to="/" end className={navClass}>
            概览
          </NavLink>
          <NavLink to="/business" className={navClass}>
            教材列表
          </NavLink>
          {user?.role === 'admin' && (
            <NavLink to="/admin" className={navClass}>
              管理后台
            </NavLink>
          )}
        </nav>

        <div className="header-user">
          <span className="user-chip">
            <span className="user-chip__name">{user?.displayName ?? user?.username ?? '未登录'}</span>
            <span className={`badge badge-${user?.role === 'admin' ? 'info' : 'neutral'}`}>
              {ROLE_LABELS[user?.role] ?? user?.role ?? '未知角色'}
            </span>
          </span>
          <button type="button" className="btn btn-ghost" onClick={handleSignOut} disabled={signingOut}>
            {signingOut ? '退出中…' : '退出登录'}
          </button>
        </div>
      </div>
    </header>
  );
}
