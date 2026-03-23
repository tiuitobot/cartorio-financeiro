import { useMemo, useState } from 'react';

const PAGE_SIZES = [25, 50, 100];
const DEFAULT_PAGE_SIZE = 50;

export function usePagination(items, storageKey) {
  const savedSize = storageKey ? localStorage.getItem(`${storageKey}_size`) : null;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeRaw] = useState(savedSize ? Number(savedSize) : DEFAULT_PAGE_SIZE);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  const setPageSize = (size) => {
    setPageSizeRaw(size);
    setPage(1);
    if (storageKey) localStorage.setItem(`${storageKey}_size`, String(size));
  };

  // Reset to page 1 when items change significantly
  if (safePage !== page) setPage(safePage);

  return { page: safePage, setPage, pageSize, setPageSize, paginatedItems, totalPages };
}

export function Pagination({ page, setPage, pageSize, setPageSize, totalPages, totalItems }) {
  const inicio = (page - 1) * pageSize + 1;
  const fim = Math.min(page * pageSize, totalItems);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', fontSize: 13, color: '#64748b', borderTop: '1px solid #f1f5f9' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>{inicio}–{fim} de {totalItems}</span>
        <select
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
          style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '2px 6px', fontSize: 12, color: '#64748b', background: '#f8fafc' }}
        >
          {PAGE_SIZES.map((s) => (
            <option key={s} value={s}>{s} por página</option>
          ))}
        </select>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          onClick={() => setPage(1)}
          disabled={page <= 1}
          style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 8px', fontSize: 12, cursor: page <= 1 ? 'default' : 'pointer', background: '#f8fafc', color: page <= 1 ? '#cbd5e1' : '#64748b' }}
        >
          ««
        </button>
        <button
          onClick={() => setPage(page - 1)}
          disabled={page <= 1}
          style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 8px', fontSize: 12, cursor: page <= 1 ? 'default' : 'pointer', background: '#f8fafc', color: page <= 1 ? '#cbd5e1' : '#64748b' }}
        >
          «
        </button>
        <span style={{ padding: '0 8px', fontWeight: 600 }}>{page} / {totalPages}</span>
        <button
          onClick={() => setPage(page + 1)}
          disabled={page >= totalPages}
          style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 8px', fontSize: 12, cursor: page >= totalPages ? 'default' : 'pointer', background: '#f8fafc', color: page >= totalPages ? '#cbd5e1' : '#64748b' }}
        >
          »
        </button>
        <button
          onClick={() => setPage(totalPages)}
          disabled={page >= totalPages}
          style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 8px', fontSize: 12, cursor: page >= totalPages ? 'default' : 'pointer', background: '#f8fafc', color: page >= totalPages ? '#cbd5e1' : '#64748b' }}
        >
          »»
        </button>
      </div>
    </div>
  );
}
