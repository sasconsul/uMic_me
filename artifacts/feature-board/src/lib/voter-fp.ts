import { useState, useEffect } from 'react';

const FP_KEY = 'feature-board-voter-fp';

export function getVoterFingerprint(): string {
  let fp = localStorage.getItem(FP_KEY);
  if (!fp) {
    fp = crypto.randomUUID();
    localStorage.setItem(FP_KEY, fp);
  }
  return fp;
}

export function useVoterFingerprint() {
  const [fp, setFp] = useState<string>("");

  useEffect(() => {
    setFp(getVoterFingerprint());
  }, []);

  return fp;
}
