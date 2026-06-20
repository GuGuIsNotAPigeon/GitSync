import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const themes = ['dark', 'light', 'soft'] as const;
type Theme = typeof themes[number];

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const cycle = () => {
    const idx = themes.indexOf(theme);
    setTheme(themes[(idx + 1) % themes.length]);
  };

  return (
    <motion.div className="analysis-panel" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
      <h3>主题切换</h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 13 }}>当前: {theme}</span>
        <button className="btn btn-blue" onClick={cycle} style={{ whiteSpace: 'nowrap' }}>点击切换</button>
      </div>
      <style>{`
        :root[data-theme='light'] { --bg: #f0f0f0; --text: #222; }
        :root[data-theme='soft'] { --bg: #e6e2d9; --text: #333; }
        :root[data-theme='dark'] { --bg: #0a0a14; --text: #c8d6e5; }
        body { background: var(--bg); color: var(--text); }
      `}</style>
    </motion.div>
  );
}