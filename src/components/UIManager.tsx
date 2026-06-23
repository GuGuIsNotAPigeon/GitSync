import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { motion } from 'framer-motion';

interface UIManagerProps {
  bgOpacity: number;
  setBgOpacity: (v: number) => void;
  setBgBase64: (v: string) => void;
  defaultBgBase64: string;
  panelMode: 'stack' | 'replace';
  setPanelMode: (v: 'stack' | 'replace') => void;
  theme: string;
  setTheme: (v: string) => void;
  torchSize: number;
  setTorchSize: (v: number) => void;
}

export default function UIManager({
  bgOpacity, setBgOpacity,
  setBgBase64,
  defaultBgBase64,
  panelMode, setPanelMode,
  theme, setTheme,
  torchSize, setTorchSize,
}: UIManagerProps) {
  const [customBgError, setCustomBgError] = useState('');

  const themes = ['dark', 'light', 'soft'];

  const handlePickBackground = async () => {
    setCustomBgError('');
    try {
      const b64 = await invoke<string>('pick_background_image');
      if (b64) {
        setBgBase64(b64);
        localStorage.setItem('bg_base64', b64);
      }
    } catch (e: any) {
      setCustomBgError(String(e));
    }
  };

  const handleResetBackground = () => {
    setBgBase64(defaultBgBase64);
    localStorage.setItem('bg_base64', defaultBgBase64);
  };

  const cycleTheme = () => {
    const idx = themes.indexOf(theme);
    const nextTheme = themes[(idx + 1) % themes.length];
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  return (
    <motion.div className="analysis-panel" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
      <h3>UI 管理</h3>

      <div className="analysis-section">
        <div className="section-title">背景遮罩强度</div>
        <input
          type="range"
          min="0"
          max="100"
          value={Math.round(bgOpacity * 100)}
          onChange={e => { setBgOpacity(Number(e.target.value) / 100); localStorage.setItem('bg_opacity', String(Number(e.target.value) / 100)); }}
          style={{ width: '100%' }}
        />
        <span style={{ fontSize: 12, color: '#8899aa' }}>{Math.round(bgOpacity * 100)}%</span>
      </div>

      <div className="analysis-section" style={{ marginTop: 16 }}>
        <div className="section-title">手电筒范围</div>
        <input
          type="range"
          min="30"
          max="300"
          value={torchSize}
          onChange={e => {
            setTorchSize(Number(e.target.value));
            localStorage.setItem('torch_size', String(Number(e.target.value)));
          }}
          style={{ width: '100%' }}
        />
        <span style={{ fontSize: 12, color: '#8899aa' }}>{torchSize}px</span>
      </div>

      <div className="analysis-section" style={{ marginTop: 16 }}>
        <div className="section-title">自定义背景图片</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-blue" onClick={handlePickBackground}>选择图片</button>
          <button className="btn" onClick={handleResetBackground} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#c8d6e5', cursor: 'pointer' }}>重置默认</button>
        </div>
        {customBgError && <div style={{ color: '#ff6b6b', fontSize: 12, marginTop: 6 }}>{customBgError}</div>}
      </div>

      <div className="analysis-section" style={{ marginTop: 16 }}>
        <div className="section-title">主题切换</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13 }}>当前: {theme}</span>
          <button className="btn btn-blue" onClick={cycleTheme}>点击切换</button>
        </div>
      </div>

      <div className="analysis-section" style={{ marginTop: 16 }}>
        <div className="section-title">面板模式</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13 }}>{panelMode === 'stack' ? '叠加模式' : '替换模式'}</span>
          <button className="btn btn-blue" onClick={() => { setPanelMode(panelMode === 'stack' ? 'replace' : 'stack'); localStorage.setItem('panel_mode', panelMode === 'stack' ? 'replace' : 'stack'); }}>
            切换
          </button>
        </div>
        <div style={{ fontSize: 11, color: '#8899aa', marginTop: 8, lineHeight: 1.5 }}>
          {panelMode === 'replace'
            ? '替换模式：点击新功能时会自动关闭之前的功能面板，只显示当前选中项。'
            : '叠加模式：多个功能面板可以同时展开，新面板出现时会自动滚动到其所在位置。'}
        </div>
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