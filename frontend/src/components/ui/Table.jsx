/**
 * @fileoverview Enterprise clinical data table primitives.
 * Provides sticky headers, semantic structure, and consistent enterprise styling.
 */
import React from 'react'

/**
 * Table wrapper with sticky header support and horizontal scroll.
 * Wrap in <TableRoot> for scrollable container.
 */
export function TableRoot({ children, className = '' }) {
  return (
    <div className={`w-full overflow-x-auto ${className}`}>
      <table className="w-full border-collapse min-w-max">
        {children}
      </table>
    </div>
  )
}

/** Sticky table head. */
export function Thead({ children }) {
  return (
    <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800/90 backdrop-blur-sm">
      {children}
    </thead>
  )
}

/** Table body. */
export function Tbody({ children }) {
  return <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{children}</tbody>
}

/**
 * Table header cell.
 * @param {'left'|'right'|'center'} [props.align='left']
 * @param {boolean} [props.sortable] Shows sort cursor.
 * @param {function} [props.onClick] Sort handler.
 */
export function Th({ children, align = 'left', sortable, onClick, className = '' }) {
  const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
  return (
    <th
      onClick={onClick}
      scope="col"
      className={`px-3.5 py-2.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 ${alignClass} ${sortable ? 'cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-200' : ''} ${className}`}
    >
      {children}
    </th>
  )
}

/**
 * Table data cell.
 * @param {'left'|'right'|'center'} [props.align='left']
 */
export function Td({ children, align = 'left', className = '' }) {
  const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
  return (
    <td className={`px-3.5 py-3 text-xs text-slate-700 dark:text-slate-300 ${alignClass} ${className}`}>
      {children}
    </td>
  )
}

/**
 * Table row with hover state.
 * @param {boolean} [props.selected] Highlighted row state.
 */
export function Tr({ children, selected, onClick, className = '' }) {
  return (
    <tr
      onClick={onClick}
      className={`transition-colors duration-100 ${selected ? 'bg-blue-50 dark:bg-blue-950/20' : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'} ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </tr>
  )
}

/**
 * Empty state row spanning all columns.
 */
export function TableEmpty({ colSpan = 6, icon: Icon, message, action }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-14 text-center">
        <div className="flex flex-col items-center gap-2">
          {Icon && <Icon size={24} className="text-slate-300 dark:text-slate-600" />}
          <p className="text-xs text-slate-400 dark:text-slate-500">{message}</p>
          {action}
        </div>
      </td>
    </tr>
  )
}
