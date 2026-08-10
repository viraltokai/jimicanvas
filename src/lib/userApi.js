import { JIMIAIGO_TOKEN_STORAGE_KEY } from './constants';
import { getChatApiBaseUrl, requestJimiaigo } from './jimiaigoApi';

export function saveAuthToken(token) {
  if (typeof window === 'undefined' || !token) return;
  const value = String(token).trim();
  if (!value) return;
  window.localStorage.setItem(JIMIAIGO_TOKEN_STORAGE_KEY, value);
  window.localStorage.setItem('token', value);
  window.dispatchEvent(new CustomEvent('auth:token-saved'));
}

export function clearAuthToken() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(JIMIAIGO_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem('token');
  window.localStorage.removeItem('access_token');
  window.dispatchEvent(new CustomEvent('auth:token-cleared'));
}

export async function login({ username, password }) {
  const data = await requestJimiaigo('/api/login', {
    method: 'POST',
    body: { username, password },
    fallback: '登录失败',
  });
  const token = data?.JimiAiToken || data?.token;
  if (!token) throw new Error('未获取到登录凭证');
  saveAuthToken(token);
  return token;
}

/** Google 一键登录：前端 GSI credential → 后端 /api/google-login */
export async function googleLogin(idToken) {
  const tokenValue = String(idToken || '').trim();
  if (!tokenValue) throw new Error('Google 登录凭证为空');
  const data = await requestJimiaigo('/api/google-login', {
    method: 'POST',
    body: { id_token: tokenValue },
    fallback: 'Google 登录失败',
  });
  const token = data?.JimiAiToken || data?.token;
  if (!token) throw new Error('未获取到登录凭证');
  saveAuthToken(token);
  return token;
}

export async function register({
  email,
  nickname,
  password,
  verify_code,
  role_id,
  invite_code = '',
}) {
  const data = await requestJimiaigo('/api/register', {
    method: 'POST',
    body: {
      email,
      nickname,
      password,
      verify_code,
      role_id,
      invite_code,
    },
    fallback: '注册失败',
  });
  const token = data?.JimiAiToken || data?.token;
  if (!token) throw new Error('未获取到登录凭证');
  saveAuthToken(token);
  return token;
}

export async function sendEmailCode(email) {
  return requestJimiaigo('/api/sendEmailCode', {
    method: 'POST',
    body: { email },
    fallback: '发送验证码失败',
  });
}

export async function fetchPublicRoles() {
  const data = await requestJimiaigo('/api/roles', {
    method: 'GET',
    fallback: '获取角色列表失败',
  });
  return Array.isArray(data) ? data : [];
}

export function parseUserPayment(payment) {
  const jimicoin = parseFloat(payment?.jimicoin ?? 0) || 0;
  const subscriptionCoin = parseFloat(payment?.subscription_coin ?? payment?.subscriptionCoin ?? 0) || 0;
  const totalCoin =
    parseFloat(payment?.total_coin ?? payment?.totalCoin ?? jimicoin + subscriptionCoin) || 0;
  const usedCoin = parseFloat(payment?.used_coin ?? payment?.usedCoin ?? 0) || 0;
  // 优先后端 available_coin（含过期赠送冲销），与 admin / web 一致
  const availableFromApi = payment?.available_coin ?? payment?.availableCoin;
  const remaining =
    availableFromApi !== undefined && availableFromApi !== null && availableFromApi !== ''
      ? Math.max(0, parseFloat(String(availableFromApi)) || 0)
      : Math.max(0, totalCoin - usedCoin);
  const percentage =
    totalCoin > 0 ? Math.min(100, Math.max(0, (remaining / totalCoin) * 100)) : 0;

  return {
    jimicoin,
    subscriptionCoin,
    totalCoin,
    usedCoin,
    remaining,
    percentage: Math.round(percentage),
  };
}

export function formatBalanceAmount(amount) {
  return `$${Math.max(parseFloat(amount) || 0, 0).toFixed(4)}`;
}

/** 将接口返回的头像路径转为可访问 URL */
export function resolveUserAvatarUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw) || raw.startsWith('data:') || raw.startsWith('blob:')) {
    return raw;
  }
  const base = getChatApiBaseUrl().replace(/\/$/, '');
  return raw.startsWith('/') ? `${base}${raw}` : `${base}/${raw}`;
}

export function getUserDisplayInitial(nickname) {
  const text = String(nickname || '').trim();
  if (!text) return 'U';
  const first = [...text][0];
  return first ? first.toUpperCase() : 'U';
}

export function parseVipInfo(vipInfo) {
  const isVip = Boolean(vipInfo?.is_vip);
  const vipType = String(vipInfo?.vip_type || '');
  const isFoundingMember = Boolean(
    vipInfo?.is_founding_member || vipInfo?.isFoundingMember || vipType === 'founding',
  );
  return {
    isVip,
    vipLevel: Number(vipInfo?.vip_level) || 0,
    vip_type: vipType,
    is_founding_member: isFoundingMember,
    isFoundingMember,
    vip_info: vipInfo || null,
  };
}

export function getRechargeUrl() {
  const explicit = import.meta.env.VITE_RECHARGE_URL;
  if (explicit) return String(explicit).trim();

  const webApp = import.meta.env.VITE_WEB_APP_URL || import.meta.env.VITE_JIMIAIAPP_URL;
  if (webApp) return `${String(webApp).replace(/\/$/, '')}/recharge`;

  if (typeof window !== 'undefined') {
    return `${window.location.origin}/recharge`;
  }

  return '/recharge';
}

export async function fetchUserInfo(token) {
  const data = await requestJimiaigo('/api/user/info', {
    token,
    method: 'GET',
    fallback: '获取用户信息失败',
  });

  if (!data) {
    throw new Error('用户信息为空');
  }

  const payment = parseUserPayment(data.payment);
  const nickname = data.nickname || data.email || '';
  return {
    nickname,
    avatarUrl: resolveUserAvatarUrl(data.avatar_url || data.avatar || ''),
    ...parseVipInfo(data.vip_info),
    ...payment,
    profile: data,
  };
}

export async function fetchPricingList(token) {
  return requestJimiaigo('/api/pricing/list', {
    token,
    method: 'GET',
    fallback: '获取价格配置失败',
  });
}

