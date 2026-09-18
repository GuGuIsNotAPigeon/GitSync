import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Command {
  id: string;
  label: string;
  action: () => void;
}

export default function CommandPalette({ commands }: { commands: Command[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);

  const filtered = commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(o => !o);
        setQuery('');
        setActiveIdx(0);
        return;
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  // 高亮项跟随键盘移动，滚出可视区时自动滚回来
  useEffect(() => {
    if (!open) return;
    document.querySelector('.cmd-item.cmd-active')?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx, open]);

  if (!open) return null;

  const runCommand = (idx: number) => {
    const cmd = filtered[idx];
    if (!cmd) return;
    setOpen(false);
    setQuery('');
    cmd.action();
  };

  return (
    <div className="cmd-overlay" onClick={() => setOpen(false)}>
      <motion.div
        initial={{ scale: 0.95, y: -8 }}
        animate={{ scale: 1, y: 0 }}
        className="analysis-panel cmd-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          className="path-input"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="输入命令，↑↓ 选择，回车执行，Esc 关闭..."
          autoFocus
          style={{ marginBottom: 12 }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActiveIdx(i => Math.min(i + 1, filtered.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActiveIdx(i => Math.max(i - 1, 0));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              runCommand(activeIdx);
            }
          }}
        />
        {filtered.length === 0 && (
          <div className="analysis-item" style={{ color: 'var(--text-dim)' }}>没有匹配的命令</div>
        )}
        {filtered.map((c, i) => (
          <div
            key={c.id}
            className={`analysis-item cmd-item ${i === activeIdx ? 'cmd-active' : ''}`}
            onClick={() => runCommand(i)}
            onMouseEnter={() => setActiveIdx(i)}
          >
            {c.label}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
