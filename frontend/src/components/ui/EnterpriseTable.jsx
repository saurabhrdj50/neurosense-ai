/**
 * @fileoverview Advanced Reusable Enterprise Clinical Data Table.
 * Supports multi-column/single-column sorting, resizable columns, column hide/show,
 * pagination, search filtering, density modes, and CSV/Excel/Print exports.
 * Standardized with Phase 1 design tokens.
 */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search, ChevronDown, ChevronUp, SlidersHorizontal, Download, Printer,
  Eye, EyeOff, Check, FileSpreadsheet, Layers, Info, Trash, ChevronLeft, ChevronRight
} from 'lucide-react';
import Button from './Button';
import Badge from './Badge';

export default function EnterpriseTable({
  tableId,
  columns = [],
  data = [],
  searchPlaceholder = 'Search records...',
  emptyMessage = 'No matching records found',
  onRowClick,
  actions,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
}) {
  // ── PREFERENCE PERSISTENCE ────────────────────────────────────────────────
  const getStoredPref = (key, fallback) => {
    try {
      const item = localStorage.getItem(`table_pref_${tableId}_${key}`);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  };

  const setStoredPref = (key, value) => {
    try {
      localStorage.setItem(`table_pref_${tableId}_${key}`, JSON.stringify(value));
    } catch (e) {
      console.warn('Failed to store table preferences', e);
    }
  };

  // ── CORE STATES ──────────────────────────────────────────────────────────
  const [filterQuery, setFilterQuery] = useState('');
  const [density, setDensity] = useState(() => getStoredPref('density', 'comfortable')); // 'comfortable' | 'compact'
  const [sortState, setSortState] = useState(() => getStoredPref('sort', { columnId: null, direction: null }));
  const [columnWidths, setColumnWidths] = useState(() => getStoredPref('widths', {}));
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const list = columns.map((c) => c.id);
    return getStoredPref('visible', list);
  });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Visibility menu state
  const [showVisibilityMenu, setShowVisibilityMenu] = useState(false);
  const menuRef = useRef(null);

  // Close visibility menu on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowVisibilityMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync stored preferences
  useEffect(() => {
    setStoredPref('density', density);
  }, [density]);

  useEffect(() => {
    setStoredPref('sort', sortState);
  }, [sortState]);

  useEffect(() => {
    setStoredPref('visible', visibleColumns);
  }, [visibleColumns]);

  // Reset pagination on search filter or data update
  useEffect(() => {
    setCurrentPage(1);
  }, [filterQuery, data.length]);

  // ── COLUMN RESIZING ──────────────────────────────────────────────────────
  const handleResizeStart = (e, colId) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startWidth = columnWidths[colId] || columns.find((c) => c.id === colId)?.width || 120;

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const targetWidth = Math.max(60, startWidth + deltaX);
      setColumnWidths((prev) => {
        const next = { ...prev, [colId]: targetWidth };
        setStoredPref('widths', next);
        return next;
      });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const toggleColumnVisibility = (colId) => {
    setVisibleColumns((prev) => {
      if (prev.includes(colId)) {
        if (prev.length <= 1) return prev; // prevent hiding last column
        return prev.filter((id) => id !== colId);
      }
      return [...prev, colId];
    });
  };

  // ── FILTERING / SORTING ─────────────────────────────────────────────────
  const processedData = useMemo(() => {
    let result = [...data];
    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase();
      result = result.filter((row) => {
        return columns.some((col) => {
          if (!visibleColumns.includes(col.id)) return false;
          const val = col.accessor ? (typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor]) : row[col.id];
          if (val == null) return false;
          return String(val).toLowerCase().includes(q);
        });
      });
    }

    if (sortState.columnId && sortState.direction) {
      const colId = sortState.columnId;
      const dir = sortState.direction === 'asc' ? 1 : -1;
      const col = columns.find((c) => c.id === colId);

      result.sort((a, b) => {
        const valA = col?.accessor ? (typeof col.accessor === 'function' ? col.accessor(a) : a[col.accessor]) : a[colId];
        const valB = col?.accessor ? (typeof col.accessor === 'function' ? col.accessor(b) : b[col.accessor]) : b[colId];

        if (valA == null && valB == null) return 0;
        if (valA == null) return 1;
        if (valB == null) return -1;

        if (typeof valA === 'number' && typeof valB === 'number') {
          return (valA - valB) * dir;
        }
        return String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' }) * dir;
      });
    }

    return result;
  }, [data, filterQuery, sortState, visibleColumns, columns]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedData.slice(start, start + pageSize);
  }, [processedData, currentPage, pageSize]);

  const totalPages = Math.max(1, Math.ceil(processedData.length / pageSize));

  const handleSortToggle = (colId) => {
    setSortState((prev) => {
      if (prev.columnId === colId) {
        if (prev.direction === 'asc') return { columnId: colId, direction: 'desc' };
        return { columnId: null, direction: null };
      }
      return { columnId: colId, direction: 'asc' };
    });
  };

  const isRowSelected = (row) => {
    const rawId = row.patient_id || row.id || row.key;
    return selectedRows.includes(rawId);
  };

  const handleSelectRow = (row, e) => {
    e.stopPropagation();
    const rawId = row.patient_id || row.id || row.key;
    let nextSelected = [];
    if (selectedRows.includes(rawId)) {
      nextSelected = selectedRows.filter((id) => id !== rawId);
    } else {
      nextSelected = [...selectedRows, rawId];
    }
    onSelectionChange?.(nextSelected);
  };

  const handleSelectAll = () => {
    if (selectedRows.length === processedData.length) {
      onSelectionChange?.([]);
    } else {
      const ids = processedData.map((row) => row.patient_id || row.id || row.key);
      onSelectionChange?.(ids);
    }
  };

  // Export handlers
  const exportToCSV = () => {
    const headers = columns.filter((c) => visibleColumns.includes(c.id)).map((c) => `"${c.label}"`).join(',');
    const rows = processedData.map((row) => {
      return columns
        .filter((c) => visibleColumns.includes(c.id))
        .map((c) => {
          const val = c.accessor ? (typeof c.accessor === 'function' ? c.accessor(row) : row[c.accessor]) : row[c.id];
          const cleanText = val != null ? String(val).replace(/"/g, '""') : '';
          return `"${cleanText}"`;
        })
        .join(',');
    });
    
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `table_export_${tableId || 'report'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToExcel = () => {
    const headers = columns.filter((c) => visibleColumns.includes(c.id)).map((c) => c.label).join('\t');
    const rows = processedData.map((row) => {
      return columns
        .filter((c) => visibleColumns.includes(c.id))
        .map((c) => {
          const val = c.accessor ? (typeof c.accessor === 'function' ? c.accessor(row) : row[c.accessor]) : row[c.id];
          return val != null ? String(val).replace(/\t/g, ' ').replace(/\n/g, ' ') : '';
        })
        .join('\t');
    });
    
    const tsvContent = 'data:text/tab-separated-values;charset=utf-8,' + encodeURIComponent([headers, ...rows].join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', tsvContent);
    link.setAttribute('download', `table_export_${tableId || 'export'}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const activeColumns = useMemo(() => {
    return columns.filter((c) => visibleColumns.includes(c.id));
  }, [columns, visibleColumns]);

  return (
    <div className="w-full space-y-3.5">
      {/* ── TABLE TOOLBAR ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-border p-3.5 rounded-xl shadow-2xs">
        {/* Search Input */}
        <div className="relative w-full max-w-xs shrink-0">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted">
            <Search size={14} aria-hidden="true" />
          </span>
          <input
            type="text"
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-surface-secondary border border-border rounded-lg text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder={searchPlaceholder}
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {actions}

          {/* Density Toggle */}
          <div className="flex items-center bg-surface-secondary border border-border rounded-lg p-0.5" role="group" aria-label="Density selector">
            <button
              onClick={() => setDensity('comfortable')}
              className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-all ${density === 'comfortable' ? 'bg-card text-primary shadow-2xs font-bold' : 'text-muted hover:text-foreground'}`}
            >
              Comfortable
            </button>
            <button
              onClick={() => setDensity('compact')}
              className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-all ${density === 'compact' ? 'bg-card text-primary shadow-2xs font-bold' : 'text-muted hover:text-foreground'}`}
            >
              Compact
            </button>
          </div>

          {/* Columns Visibility Menu */}
          <div className="relative" ref={menuRef}>
            <Button
              variant="outline"
              size="sm"
              icon={SlidersHorizontal}
              onClick={() => setShowVisibilityMenu(!showVisibilityMenu)}
            >
              Columns
            </Button>
            {showVisibilityMenu && (
              <div className="absolute right-0 mt-1.5 w-52 z-30 bg-card border border-border rounded-xl shadow-xl p-2.5 space-y-1.5 focus:outline-none">
                <h4 className="text-[10px] font-bold text-muted uppercase tracking-wider px-1">Toggle Columns</h4>
                <div className="max-h-56 overflow-y-auto space-y-1">
                  {columns.map((col) => {
                    const isVisible = visibleColumns.includes(col.id);
                    return (
                      <button
                        key={col.id}
                        onClick={() => toggleColumnVisibility(col.id)}
                        className="w-full flex items-center justify-between px-2 py-1.5 text-xs text-foreground hover:bg-hover rounded-lg transition-colors"
                      >
                        <span>{col.label}</span>
                        {isVisible ? (
                          <Check size={13} className="text-primary" />
                        ) : (
                          <span className="w-3.5 h-3.5 rounded border border-border" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Export Toggles */}
          <div className="flex items-center gap-1.5">
            <Button
              className="text-[10px] font-medium"
              variant="outline"
              size="sm"
              icon={Printer}
              onClick={handlePrint}
            >
              Print
            </Button>
            <Button
              className="text-[10px] font-medium"
              variant="outline"
              size="sm"
              icon={Download}
              onClick={exportToCSV}
            >
              CSV
            </Button>
            <Button
              className="text-[10px] font-medium"
              variant="outline"
              size="sm"
              icon={FileSpreadsheet}
              onClick={exportToExcel}
            >
              Excel
            </Button>
          </div>
        </div>
      </div>

      {/* ── DATA TABLE ──────────────────────────────────────────────────────── */}
      <div className="border border-border rounded-xl overflow-hidden bg-card shadow-2xs">
        <div className="w-full overflow-x-auto max-h-[520px]">
          <table className="w-full border-collapse text-left select-text table-fixed">
            {/* Table Header */}
            <thead className="sticky top-0 z-10 bg-surface-secondary border-b border-border">
              <tr>
                {/* Checkbox Column */}
                {selectable && (
                  <th className="w-10 px-3 py-2.5 text-center bg-surface-secondary">
                    <input
                      type="checkbox"
                      className="rounded border-border text-primary focus:ring-primary shrink-0"
                      checked={processedData.length > 0 && selectedRows.length === processedData.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                )}
                
                {/* Active Column Headers */}
                {activeColumns.map((col, index) => {
                  const width = columnWidths[col.id] || col.width || 120;
                  const isSorted = sortState.columnId === col.id;
                  const isStickyLeft = col.sticky === 'left' && index === 0;
                  
                  return (
                    <th
                      key={col.id}
                      style={{
                        width,
                        left: isStickyLeft ? 0 : undefined,
                        zIndex: isStickyLeft ? 12 : undefined,
                      }}
                      className={`relative bg-surface-secondary text-[10px] font-bold text-muted uppercase tracking-wider select-none px-3.5 ${isStickyLeft ? 'sticky left-0 border-r border-border shadow-[2px_0_5px_rgba(0,0,0,0.05)]' : ''} ${col.sortable !== false ? 'cursor-pointer hover:text-foreground' : ''} ${density === 'compact' ? 'py-2' : 'py-3'}`}
                      onClick={() => col.sortable !== false && handleSortToggle(col.id)}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{col.label}</span>
                        {col.sortable !== false && isSorted && (
                          sortState.direction === 'asc' ? <ChevronUp size={12} className="text-primary" /> : <ChevronDown size={12} className="text-primary" />
                        )}
                      </div>
                      
                      {/* Column Resize Grab Handler */}
                      <div
                        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/50 z-10"
                        onMouseDown={(e) => handleResizeStart(e, col.id)}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                      />
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-border">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={activeColumns.length + (selectable ? 1 : 0)} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-1.5">
                      <Info size={20} className="text-muted" />
                      <p className="text-xs text-muted">{emptyMessage}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((row) => {
                  const isSelected = isRowSelected(row);
                  return (
                    <tr
                      key={row.patient_id || row.id || row.key}
                      onClick={() => onRowClick?.(row)}
                      className={`transition-colors duration-100 ${isSelected ? 'bg-primary-soft' : 'hover:bg-hover'} ${onRowClick ? 'cursor-pointer' : ''}`}
                    >
                      {/* Checkbox cell */}
                      {selectable && (
                        <td
                          className="px-3 text-center"
                          onClick={(e) => handleSelectRow(row, e)}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            className="rounded border-border text-primary focus:ring-primary shrink-0"
                            onChange={(e) => handleSelectRow(row, e)}
                          />
                        </td>
                      )}

                      {/* Diagnostic Cells */}
                      {activeColumns.map((col, index) => {
                        const isStickyLeft = col.sticky === 'left' && index === 0;
                        const cellVal = col.accessor ? (typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor]) : row[col.id];
                        const rendered = col.render ? col.render(cellVal, row) : cellVal;
                        
                        return (
                          <td
                            key={col.id}
                            style={{
                              left: isStickyLeft ? 0 : undefined,
                              zIndex: isStickyLeft ? 5 : undefined,
                            }}
                            className={`text-foreground font-normal px-3.5 overflow-hidden text-ellipsis whitespace-nowrap text-xs ${isStickyLeft ? 'sticky left-0 bg-card border-r border-border shadow-[2px_0_5px_rgba(0,0,0,0.03)] font-bold' : ''} ${density === 'compact' ? 'py-2' : 'py-3'}`}
                          >
                            {rendered}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── PAGINATION CONTROLS ──────────────────────────────────────────────── */}
        {processedData.length > 0 && (
          <div className="flex flex-wrap items-center justify-between border-t border-border px-4 py-3 bg-surface-secondary gap-3 text-xs">
            <span className="text-muted">
              Showing {(currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, processedData.length)} of{' '}
              {processedData.length} patient records
            </span>

            <div className="flex items-center flex-wrap gap-3">
              <div className="flex items-center gap-1.5 font-medium">
                <span className="text-muted text-[11px]">Rows per page</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-card border border-border rounded-md py-1 px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="flex items-center gap-1 font-semibold">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  className="px-2.5 py-1 border border-border rounded-lg bg-card text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-hover transition-colors"
                  aria-label="Go to first page"
                >
                  First
                </button>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  className="p-1 border border-border rounded-lg bg-card text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-hover transition-colors"
                  aria-label="Go to previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="px-2 text-foreground">
                  <b>{currentPage}</b> / <b>{totalPages}</b>
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  className="p-1 border border-border rounded-lg bg-card text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-hover transition-colors"
                  aria-label="Go to next page"
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="px-2.5 py-1 border border-border rounded-lg bg-card text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-hover transition-colors"
                  aria-label="Go to last page"
                >
                  Last
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
