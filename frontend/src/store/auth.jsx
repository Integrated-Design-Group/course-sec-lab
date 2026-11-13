/**
 * 登录态管理（Context）
 * ---------------------------------------------------------------------------
 * 状态机：booting（校验本地令牌）→ authenticated / anonymous
 * 路由守卫依赖该状态，避免“刷新页面先闪一下登录页”。
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { clearToken, getToken, onUnauthorized, setToken } from '../api/client.js';
import { fetchMe, login as loginRequest, logout as logoutRequest } from '../api/auth.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'booting', user: null });

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setState({ status: 'anonymous', user: null });
      return undefined;
    }

    let cancelled = false;
    fetchMe()
      .then((envelope) => {
        if (!cancelled) setState({ status: 'authenticated', user: envelope.data });
      })
      .catch(() => {
        if (cancelled) return;
        clearToken();
        setState({ status: 'anonymous', user: null });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // 任意请求收到 401（令牌过期/被撤销）时，统一回到未登录态
    return onUnauthorized(() => setState({ status: 'anonymous', user: null }));
  }, []);

  const signIn = useCallback(async ({ username, password }) => {
    const envelope = await loginRequest({ username, password });
    setToken(envelope.data.token);
    setState({ status: 'authenticated', user: envelope.data.user });
    return envelope.data.user;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logoutRequest();
    } catch {
      // 令牌可能已过期：无论服务端结果如何，本地都要清理
    } finally {
      clearToken();
      setState({ status: 'anonymous', user: null });
    }
  }, []);

  const value = useMemo(
    () => ({ ...state, isAuthenticated: state.status === 'authenticated', signIn, signOut }),
    [state, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth 必须在 <AuthProvider> 内使用');
  return context;
}
