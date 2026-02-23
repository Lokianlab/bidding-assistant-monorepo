/**
 * 知識庫項目表格
 * 使用 TanStack Table v8
 */

import React, { useMemo } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  ColumnDef,
} from '@tanstack/react-table';
import { KBItem } from '@/lib/kb/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2 } from 'lucide-react';

interface KBTableProps {
  items: KBItem[];
  selectedIds: Set<string>;
  onSelectOne: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  onEdit: (item: KBItem) => void;
  onDelete: (item: KBItem) => void;
  isLoading?: boolean;
}

const columnHelper = createColumnHelper<KBItem>();

export function KBTable({
  items,
  selectedIds,
  onSelectOne,
  onSelectAll,
  onEdit,
  onDelete,
  isLoading,
}: KBTableProps) {
  const columns = useMemo(
    () => [
      columnHelper.accessor('id', {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllRowsSelected()}
            indeterminate={table.getIsSomeRowsSelected()}
            onChange={() =>
              onSelectAll(items.map((item) => item.id))
            }
            disabled={isLoading}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onChange={() => onSelectOne(row.original.id)}
            disabled={isLoading}
          />
        ),
        size: 40,
      }),
      columnHelper.accessor('title', {
        header: '標題',
        cell: (info) => (
          <div className="font-medium truncate">{info.getValue()}</div>
        ),
      }),
      columnHelper.accessor('category', {
        header: '分類',
        cell: (info) => (
          <span className="inline-block rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
            {info.getValue()}
          </span>
        ),
        size: 80,
      }),
      columnHelper.accessor('tags', {
        header: '標籤',
        cell: (info) => {
          const tags = info.getValue() || [];
          if (tags.length === 0) return '-';
          return (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="inline-block rounded bg-gray-100 px-2 py-1 text-xs text-gray-700"
                >
                  {tag}
                </span>
              ))}
              {tags.length > 2 && (
                <span className="text-xs text-gray-500">
                  +{tags.length - 2}
                </span>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor('created_by', {
        header: '建立者',
        cell: (info) => (
          <span className="text-sm text-gray-600">{info.getValue()}</span>
        ),
        size: 120,
      }),
      columnHelper.accessor('created_at', {
        header: '建立日期',
        cell: (info) => (
          <span className="text-sm text-gray-600">
            {new Date(info.getValue()).toLocaleDateString('zh-TW')}
          </span>
        ),
        size: 100,
      }),
      columnHelper.display({
        id: 'actions',
        header: '操作',
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(row.original)}
              disabled={isLoading}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(row.original)}
              disabled={isLoading}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        ),
        size: 80,
      }),
    ],
    [items, selectedIds, onSelectOne, onSelectAll, onEdit, onDelete, isLoading],
  );

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: {
      rowSelection: Object.fromEntries(
        Array.from(selectedIds).map((id) => [id, true]),
      ),
    },
  });

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-100 border-b">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="text-left px-4 py-3 font-semibold text-sm text-gray-700"
                  style={{ width: header.getSize() }}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className={`border-b hover:bg-gray-50 ${
                selectedIds.has(row.original.id) ? 'bg-blue-50' : ''
              }`}
            >
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className="px-4 py-3 text-sm"
                  style={{ width: cell.column.getSize() }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {items.length === 0 && !isLoading && (
        <div className="text-center py-12 text-gray-500">
          沒有找到符合條件的項目
        </div>
      )}
    </div>
  );
}
