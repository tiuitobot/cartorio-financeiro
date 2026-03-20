import { useEffect, useRef, useState } from 'react';

export default function StickyXScroll({ children, style = {}, contentStyle = {} }) {
  const contentRef = useRef(null);
  const barRef = useRef(null);
  const [metrics, setMetrics] = useState({ scrollWidth: 0, clientWidth: 0 });

  useEffect(() => {
    const content = contentRef.current;
    const bar = barRef.current;
    if (!content) return undefined;

    let syncing = false;

    const updateMetrics = () => {
      setMetrics({
        scrollWidth: content.scrollWidth,
        clientWidth: content.clientWidth,
      });
    };

    const syncScroll = (source, target) => {
      if (!target || syncing) return;
      syncing = true;
      target.scrollLeft = source.scrollLeft;
      requestAnimationFrame(() => {
        syncing = false;
      });
    };

    const handleContentScroll = () => syncScroll(content, bar);
    const handleBarScroll = () => syncScroll(bar, content);

    updateMetrics();
    content.addEventListener('scroll', handleContentScroll);
    bar?.addEventListener('scroll', handleBarScroll);

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(updateMetrics)
      : null;
    resizeObserver?.observe(content);
    window.addEventListener('resize', updateMetrics);

    return () => {
      content.removeEventListener('scroll', handleContentScroll);
      bar?.removeEventListener('scroll', handleBarScroll);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateMetrics);
    };
  }, [children]);

  const showStickyBar = metrics.scrollWidth > metrics.clientWidth + 1;

  return (
    <div style={{ position: 'relative', ...style }}>
      <div
        ref={contentRef}
        style={{ overflowX: 'auto', paddingBottom: showStickyBar ? 8 : 0, ...contentStyle }}
      >
        {children}
      </div>
      {showStickyBar && (
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            zIndex: 2,
            paddingTop: 8,
            background: 'linear-gradient(180deg, rgba(255,255,255,0), #fff 55%)',
          }}
        >
          <div
            ref={barRef}
            style={{
              overflowX: 'auto',
              overflowY: 'hidden',
              height: 14,
              borderTop: '1px solid #e2e8f0',
              background: '#f8fafc',
            }}
          >
            <div style={{ width: metrics.scrollWidth, height: 1 }} />
          </div>
        </div>
      )}
    </div>
  );
}
