/**
 * Table components.
 * Provides basic table layout elements.
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
    <thead className="sticky top-0 z-10 bg-surface-secondary/90 backdrop-blur-xs border-b border-border">
      {children}
    </thead>
  )
}

/** Table body. */
export function Tbody({ children }) {
  return <tbody className="divide-y divide-border">{children}</tbody>
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
      className={`px-4 py-3.5 text-[15px] font-bold text-foreground-muted uppercase tracking-wider ${alignClass} ${sortable ? 'cursor-pointer select-none hover:text-foreground' : ''} ${className}`}
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
    <td className={`px-4 py-3.5 text-[15px] font-medium text-foreground ${alignClass} ${className}`}>
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
      className={`transition-colors duration-150 ${selected ? 'bg-primary-soft' : 'hover:bg-surface-hover/80'} ${onClick ? 'cursor-pointer' : ''} ${className}`}
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
