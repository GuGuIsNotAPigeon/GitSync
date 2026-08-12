import { useEffect, useState } from 'react';

interface ContributorAvatarProps {
  name: string;
  email?: string;
  size?: number;
}

const CACHE_PREFIX = 'gitsync.avatar.';
const FAIL_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function initialsColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return `hsl(${Math.abs(hash) % 360}, 55%, 45%)`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function candidateUsernames(name: string, email?: string): string[] {
  const valid = (s: string) => /^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/.test(s);
  const list: string[] = [];
  const push = (v: string) => {
    const s = v.trim();
    if (valid(s) && !list.includes(s)) list.push(s);
  };
  push(name);
  const local = email?.trim().toLowerCase().split('@')[0] || '';
  push(local);
  return list;
}

function cacheKey(name: string, email?: string): string {
  return `${CACHE_PREFIX}${(name || '').trim().toLowerCase()}|${(email || '').trim().toLowerCase()}`;
}

function readCache(key: string): string | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { url, failed, ts } = JSON.parse(raw);
    if (url) return url;
    if (failed && Date.now() - ts < FAIL_TTL_MS) return '';
    return null;
  } catch {
    return null;
  }
}

function writeCache(key: string, value: { url?: string; failed?: boolean }) {
  try {
    localStorage.setItem(key, JSON.stringify({ ...value, ts: Date.now() }));
  } catch {
    // localStorage unavailable → skip caching
  }
}

export default function ContributorAvatar({ name, email, size = 24 }: ContributorAvatarProps) {
  const key = cacheKey(name, email);
  const usernames = candidateUsernames(name, email);
  const [cachedUrl, setCachedUrl] = useState<string | null>(() => readCache(key));
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const cached = readCache(key);
    setCachedUrl(cached || null);
    setIdx(0);
    setDone(false);
  }, [key]);

  if (cachedUrl) {
    return (
      <img
        className="contributor-avatar"
        src={`${cachedUrl}?size=${Math.round(size * 2)}`}
        alt={name}
        width={size}
        height={size}
        onError={() => { setCachedUrl(null); setDone(true); }}
      />
    );
  }

  if (done || idx >= usernames.length) {
    return (
      <span
        className="contributor-avatar-fallback"
        style={{ width: size, height: size, fontSize: Math.max(10, size * 0.45), background: initialsColor(name) }}
        title={name}
      >
        {initials(name)}
      </span>
    );
  }

  const last = idx === usernames.length - 1;
  return (
    <img
      className="contributor-avatar"
      src={`https://github.com/${encodeURIComponent(usernames[idx])}.png?size=${Math.round(size * 2)}`}
      alt={name}
      width={size}
      height={size}
      onLoad={() => writeCache(key, { url: `https://github.com/${encodeURIComponent(usernames[idx])}.png` })}
      onError={() => {
        if (last) {
          writeCache(key, { failed: true });
        }
        setIdx(i => i + 1);
      }}
    />
  );
}
