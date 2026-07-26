type Props = {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
};

const PAGE_SIZES = [5, 10, 15, 20, 25, 50];

export default function Pagination({ total, page, pageSize, onPageChange, onPageSizeChange }: Props) {
  const totalPages = Math.ceil(total / pageSize);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-gray-600 dark:text-slate-300">Rows per page:</span>
        <select
          value={pageSize}
          onChange={(e) => { onPageSizeChange(Number(e.target.value)); onPageChange(1); }}
          className="border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <span className="text-gray-500 dark:text-slate-400">{from}–{to} of {total}</span>

      <div className="flex items-center gap-1">
        {["«", "‹"].map((label, i) => (
          <button key={label} onClick={() => onPageChange(i === 0 ? 1 : page - 1)} disabled={page === 1}
            className="px-2 py-1 rounded text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition">
            {label}
          </button>
        ))}

        {pages.map((p) => (
          <button key={p} onClick={() => onPageChange(p)}
            className={`px-3 py-1 rounded text-sm font-medium transition ${
              p === page
                ? "bg-blue-600 text-white"
                : "text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
            }`}>
            {p}
          </button>
        ))}

        {["›", "»"].map((label, i) => (
          <button key={label} onClick={() => onPageChange(i === 0 ? page + 1 : totalPages)} disabled={page === totalPages || totalPages === 0}
            className="px-2 py-1 rounded text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition">
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
