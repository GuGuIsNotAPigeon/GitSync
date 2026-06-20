import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { motion } from 'framer-motion';

export default function SideBySideDiff({ repoPath, commitHash }: { repoPath: string; commitHash: string }) {
  const [files, setFiles] = useState<[string, any][]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    if (!commitHash) {
      setError('请先在提交列表中选中一个提交');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await invoke<[string, any][]>('get_diff_detail', { path: repoPath, commitHash });
      setFiles(res);
    } catch (e: any) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div className="analysis-panel" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
      <h3>并排对比</h3>
      <button className="btn btn-blue" onClick={load} disabled={loading}>
        {loading ? '加载中...' : '加载对比'}
      </button>
      {error && <div className="analysis-item" style={{ color: '#ff6b6b' }}>{error}</div>}
      {files.map(([path, detail]) => (
        <div key={path} style={{ marginTop: 12 }}>
          <div className="section-title">{path}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontFamily: 'monospace', fontSize: 12 }}>
            <div style={{ background: 'rgba(244,67,54,0.05)', padding: 8 }}><pre>{detail.old_content}</pre></div>
            <div style={{ background: 'rgba(76,175,80,0.05)', padding: 8 }}><pre>{detail.new_content}</pre></div>
          </div>
        </div>
      ))}
    </motion.div>
  );
}