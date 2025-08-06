import React, { useState, useEffect, useCallback } from 'react';
import { useUI } from '~/contexts/UIContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Editor from '@monaco-editor/react';
import { Database, Play, Table, X, RefreshCw, Download } from 'lucide-react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  ColumnDef,
} from '@tanstack/react-table';

interface DbColumn {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

interface DbRow {
  [key: string]: any;
}

interface QueryResult {
  success: boolean;
  rows: DbRow[];
  rowCount: number;
  fields?: Array<{ name: string; dataTypeID: number }>;
  command: string;
  isSelect: boolean;
  error?: string;
  details?: string;
}

interface RowsResponse {
  columns: DbColumn[];
  rows: DbRow[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

export function DbManagerModal() {
  const { showDbModal, setShowDbModal } = useUI();
  const queryClient = useQueryClient();
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [sqlQuery, setSqlQuery] = useState('');
  const [activeView, setActiveView] = useState<'data' | 'query'>('data');
  const [queryResults, setQueryResults] = useState<QueryResult | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  // Fetch tables
  const { data: tablesData, isLoading: tablesLoading, refetch: refetchTables } = useQuery({
    queryKey: ['db-tables'],
    queryFn: async () => {
      const response = await fetch('/api/db/tables');
      if (!response.ok) throw new Error('Failed to fetch tables');
      return response.json();
    },
    enabled: showDbModal,
  });

  // Fetch rows for selected table
  const { data: rowsData, isLoading: rowsLoading, refetch: refetchRows } = useQuery({
    queryKey: ['db-rows', selectedTable, currentPage, pageSize],
    queryFn: async () => {
      if (!selectedTable) return null;
      const response = await fetch(
        `/api/db/rows?table=${selectedTable}&limit=${pageSize}&offset=${currentPage * pageSize}`
      );
      if (!response.ok) throw new Error('Failed to fetch rows');
      return response.json() as Promise<RowsResponse>;
    },
    enabled: showDbModal && !!selectedTable && activeView === 'data',
  });

  // Execute query mutation
  const executeMutation = useMutation({
    mutationFn: async (sql: string) => {
      const response = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql }),
      });
      const data = await response.json();
      if (!response.ok) throw data;
      return data as QueryResult;
    },
    onSuccess: (data) => {
      setQueryResults(data);
      // If query modified data, refetch tables and current table data
      if (!data.isSelect) {
        refetchTables();
        if (selectedTable) refetchRows();
      }
    },
    onError: (error: any) => {
      setQueryResults({
        success: false,
        rows: [],
        rowCount: 0,
        isSelect: true,
        error: error.error || 'Query failed',
        details: error.details || error.message,
      });
    },
  });

  // Create table columns dynamically
  const tableColumns = React.useMemo(() => {
    if (!rowsData?.columns) return [];
    
    return rowsData.columns.map((col) => ({
      accessorKey: col.column_name,
      header: col.column_name,
      cell: (info: any) => {
        const value = info.getValue();
        if (value === null) return <span className="text-gray-500 italic">NULL</span>;
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
      },
    }));
  }, [rowsData?.columns]);

  // Create table instance for data view
  const table = useReactTable({
    data: rowsData?.rows || [],
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: rowsData ? Math.ceil(rowsData.pagination.total / pageSize) : 0,
    state: {
      pagination: {
        pageIndex: currentPage,
        pageSize,
      },
    },
    onPaginationChange: (updater) => {
      if (typeof updater === 'function') {
        const newState = updater({ pageIndex: currentPage, pageSize });
        setCurrentPage(newState.pageIndex);
        setPageSize(newState.pageSize);
      }
    },
  });

  // Query results table columns
  const queryResultColumns = React.useMemo(() => {
    if (!queryResults?.fields || queryResults.fields.length === 0) return [];
    
    return queryResults.fields.map((field) => ({
      accessorKey: field.name,
      header: field.name,
      cell: (info: any) => {
        const value = info.getValue();
        if (value === null) return <span className="text-gray-500 italic">NULL</span>;
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
      },
    }));
  }, [queryResults?.fields]);

  // Create table instance for query results
  const queryTable = useReactTable({
    data: queryResults?.rows || [],
    columns: queryResultColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const handleExecuteQuery = () => {
    if (sqlQuery.trim()) {
      executeMutation.mutate(sqlQuery);
    }
  };

  const handleExportResults = () => {
    if (!queryResults?.rows || queryResults.rows.length === 0) return;
    
    const csv = [
      // Headers
      queryResults.fields?.map(f => f.name).join(',') || Object.keys(queryResults.rows[0]).join(','),
      // Rows
      ...queryResults.rows.map(row => 
        Object.values(row).map(v => 
          v === null ? 'NULL' : typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v
        ).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query-results-${new Date().toISOString()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!showDbModal) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={() => setShowDbModal(false)}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="w-full max-w-6xl h-[90vh] bg-bolt-elements-background-depth-1 rounded-lg shadow-2xl flex flex-col overflow-hidden border border-bolt-elements-borderColor"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-bolt-elements-borderColor bg-gradient-to-r from-purple-900/20 to-pink-900/20">
            <div className="flex items-center gap-3">
              <Database className="w-6 h-6 text-purple-400" />
              <h2 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Database Cockpit
              </h2>
            </div>
            <button
              onClick={() => setShowDbModal(false)}
              className="p-2 rounded-lg hover:bg-bolt-elements-background-depth-3 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Content */}
          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar - Tables */}
            <div className="w-64 border-r border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 flex flex-col">
              <div className="p-3 border-b border-bolt-elements-borderColor">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-bolt-elements-textSecondary">Tables</h3>
                  <button
                    onClick={() => refetchTables()}
                    className="p-1 rounded hover:bg-bolt-elements-background-depth-3 transition-colors"
                    title="Refresh tables"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {tablesLoading ? (
                  <div className="text-center py-4 text-bolt-elements-textSecondary">Loading...</div>
                ) : (
                  <div className="space-y-1">
                    {tablesData?.tables?.map((table: string) => (
                      <button
                        key={table}
                        onClick={() => {
                          setSelectedTable(table);
                          setActiveView('data');
                          setCurrentPage(0);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-all flex items-center gap-2 ${
                          selectedTable === table
                            ? 'bg-gradient-to-r from-purple-600/20 to-pink-600/20 text-white'
                            : 'hover:bg-bolt-elements-background-depth-3 text-bolt-elements-textSecondary hover:text-white'
                        }`}
                      >
                        <Table className="w-4 h-4" />
                        <span className="text-sm truncate">{table}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Main Panel */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* View Tabs */}
              <div className="flex items-center gap-2 p-3 border-b border-bolt-elements-borderColor bg-bolt-elements-background-depth-2">
                <button
                  onClick={() => setActiveView('data')}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    activeView === 'data'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                      : 'hover:bg-bolt-elements-background-depth-3 text-bolt-elements-textSecondary'
                  }`}
                >
                  Data Browser
                </button>
                <button
                  onClick={() => setActiveView('query')}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    activeView === 'query'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                      : 'hover:bg-bolt-elements-background-depth-3 text-bolt-elements-textSecondary'
                  }`}
                >
                  SQL Query
                </button>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-hidden flex flex-col">
                {activeView === 'data' ? (
                  // Data Browser View
                  selectedTable ? (
                    <>
                      <div className="flex-1 overflow-auto p-4">
                        {rowsLoading ? (
                          <div className="text-center py-8 text-bolt-elements-textSecondary">
                            Loading data...
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                              <thead>
                                {table.getHeaderGroups().map(headerGroup => (
                                  <tr key={headerGroup.id}>
                                    {headerGroup.headers.map(header => (
                                      <th
                                        key={header.id}
                                        className="px-4 py-2 text-left text-xs font-medium text-bolt-elements-textSecondary uppercase tracking-wider border-b border-bolt-elements-borderColor bg-bolt-elements-background-depth-3"
                                      >
                                        {flexRender(
                                          header.column.columnDef.header,
                                          header.getContext()
                                        )}
                                      </th>
                                    ))}
                                  </tr>
                                ))}
                              </thead>
                              <tbody>
                                {table.getRowModel().rows.map(row => (
                                  <tr
                                    key={row.id}
                                    className="hover:bg-bolt-elements-background-depth-3 transition-colors"
                                  >
                                    {row.getVisibleCells().map(cell => (
                                      <td
                                        key={cell.id}
                                        className="px-4 py-2 text-sm border-b border-bolt-elements-borderColor"
                                      >
                                        {flexRender(
                                          cell.column.columnDef.cell,
                                          cell.getContext()
                                        )}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                      {/* Pagination */}
                      {rowsData && (
                        <div className="flex items-center justify-between p-4 border-t border-bolt-elements-borderColor bg-bolt-elements-background-depth-2">
                          <div className="text-sm text-bolt-elements-textSecondary">
                            Showing {currentPage * pageSize + 1} to{' '}
                            {Math.min((currentPage + 1) * pageSize, rowsData.pagination.total)} of{' '}
                            {rowsData.pagination.total} rows
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => table.previousPage()}
                              disabled={!table.getCanPreviousPage()}
                              className="px-3 py-1 rounded border border-bolt-elements-borderColor disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bolt-elements-background-depth-3 transition-colors"
                            >
                              Previous
                            </button>
                            <span className="px-3 py-1">
                              Page {currentPage + 1} of {table.getPageCount()}
                            </span>
                            <button
                              onClick={() => table.nextPage()}
                              disabled={!table.getCanNextPage()}
                              className="px-3 py-1 rounded border border-bolt-elements-borderColor disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bolt-elements-background-depth-3 transition-colors"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-bolt-elements-textSecondary">
                      <div className="text-center">
                        <Database className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p>Select a table to view data</p>
                      </div>
                    </div>
                  )
                ) : (
                  // SQL Query View
                  <>
                    <div className="h-64 border-b border-bolt-elements-borderColor">
                      <Editor
                        height="100%"
                        defaultLanguage="sql"
                        value={sqlQuery}
                        onChange={(value) => setSqlQuery(value || '')}
                        theme="vs-dark"
                        options={{
                          minimap: { enabled: false },
                          fontSize: 14,
                          wordWrap: 'on',
                          lineNumbers: 'on',
                          scrollBeyondLastLine: false,
                          automaticLayout: true,
                        }}
                      />
                    </div>
                    <div className="p-3 border-b border-bolt-elements-borderColor flex items-center gap-2">
                      <button
                        onClick={handleExecuteQuery}
                        disabled={!sqlQuery.trim() || executeMutation.isPending}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <Play className="w-4 h-4" />
                        {executeMutation.isPending ? 'Executing...' : 'Execute'}
                      </button>
                      {queryResults && queryResults.success && queryResults.rows.length > 0 && (
                        <button
                          onClick={handleExportResults}
                          className="px-4 py-2 border border-bolt-elements-borderColor rounded-lg hover:bg-bolt-elements-background-depth-3 transition-colors flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Export CSV
                        </button>
                      )}
                    </div>
                    <div className="flex-1 overflow-auto p-4">
                      {queryResults && (
                        <div>
                          {queryResults.success ? (
                            <>
                              <div className="mb-2 text-sm text-bolt-elements-textSecondary">
                                {queryResults.command} - {queryResults.rowCount} row(s){' '}
                                {queryResults.isSelect ? 'returned' : 'affected'}
                              </div>
                              {queryResults.rows.length > 0 && (
                                <div className="overflow-x-auto">
                                  <table className="w-full border-collapse">
                                    <thead>
                                      {queryTable.getHeaderGroups().map(headerGroup => (
                                        <tr key={headerGroup.id}>
                                          {headerGroup.headers.map(header => (
                                            <th
                                              key={header.id}
                                              className="px-4 py-2 text-left text-xs font-medium text-bolt-elements-textSecondary uppercase tracking-wider border-b border-bolt-elements-borderColor bg-bolt-elements-background-depth-3"
                                            >
                                              {flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                              )}
                                            </th>
                                          ))}
                                        </tr>
                                      ))}
                                    </thead>
                                    <tbody>
                                      {queryTable.getRowModel().rows.map(row => (
                                        <tr
                                          key={row.id}
                                          className="hover:bg-bolt-elements-background-depth-3 transition-colors"
                                        >
                                          {row.getVisibleCells().map(cell => (
                                            <td
                                              key={cell.id}
                                              className="px-4 py-2 text-sm border-b border-bolt-elements-borderColor"
                                            >
                                              {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                              )}
                                            </td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="p-4 bg-red-500/20 text-red-400 rounded-lg">
                              <div className="font-semibold">{queryResults.error}</div>
                              {queryResults.details && (
                                <div className="mt-1 text-sm">{queryResults.details}</div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}