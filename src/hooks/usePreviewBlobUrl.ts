import { useCallback, useEffect, useRef } from "react";

/** Own only the Blob URLs created by this preview, including late responses. */
export function usePreviewBlobUrl() {
  const current = useRef<string | null>(null);
  const mounted = useRef(true);
  const clear = useCallback(() => {
    if (current.current) URL.revokeObjectURL(current.current);
    current.current = null;
  }, []);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; clear(); };
  }, [clear]);
  const create = useCallback((blob: Blob) => {
    clear();
    const url = URL.createObjectURL(blob);
    if (mounted.current) current.current = url;
    else URL.revokeObjectURL(url);
    return url;
  }, [clear]);
  return { create, clear };
}
