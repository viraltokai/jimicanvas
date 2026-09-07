export function isCanvasAdmin(profile) {
  if (!profile || typeof profile !== 'object') return false;

  // fetchUserInfo 返回结构里，原始 /api/user/info 在 profile.profile
  const raw =
    profile.profile && typeof profile.profile === 'object' ? profile.profile : profile;

  const userId = Number(raw.id ?? profile.id);
  if (userId === 1) return true;

  const roles = Array.isArray(raw.roles)
    ? raw.roles
    : Array.isArray(profile.roles)
      ? profile.roles
      : [];

  return roles.some((role) => {
    const slug = typeof role === 'string' ? role : role?.slug || role?.name || '';
    return slug === 'admin' || slug === 'super_admin';
  });
}
