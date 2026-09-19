import { useCallback, useRef } from 'react';

// 请求序号防竞态：快速连续发起同类请求时，慢的旧响应不得覆盖新状态。
// 用法：
//   const isLatest = useLatestRequest();
//   每次发起请求前：const stillLatest = isLatest();
//   响应回来后：if (stillLatest()) 才写入 state。
// （TimeMachine 的 snapshotSeqRef 模式通用化）
export function useLatestRequest() {
  const seqRef = useRef(0);
  return useCallback(() => {
    const seq = ++seqRef.current;
    return () => seq === seqRef.current;
  }, []);
}
