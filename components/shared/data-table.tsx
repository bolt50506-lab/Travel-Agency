import type { ReactNode } from 'react';

export type DataColumn<T> = {
  key: keyof T | string;
  label: string;
  render?: (row: T) => ReactNode;
};

export function DataTable<T extends Record<string, unknown>>({
  rows,
  columns,
  empty = 'No records found.',
}: {
  rows: T[];
  columns: DataColumn<T>[];
  empty?: string;
}) {
  if (!rows.length) return <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">{empty}</div>;
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead><tr className="border-b bg-muted/30 text-left">
          {columns.map(column => <th key={String(column.key)} className="whitespace-nowrap px-3 py-2 font-medium">{column.label}</th>)}
        </tr></thead>
        <tbody>
          {rows.map((row, index) => <tr key={String(row.id ?? index)} className="border-b last:border-0">
            {columns.map(column => <td key={String(column.key)} className="max-w-[280px] px-3 py-3 align-top">{column.render ? column.render(row) : String(row[column.key] ?? '—')}</td>)}
          </tr>)}
        </tbody>
      </table>
    </div>
  );
}
