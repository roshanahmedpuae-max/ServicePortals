"use client";

import { useState, useMemo } from "react";
import { WorkOrder, WorkOrderStatus } from "@/lib/types";
import toast from "react-hot-toast";
import { downloadPdfFromBase64 } from "@/lib/pdf-client";

// Simple employee type for display purposes only
interface SimpleEmployee {
  id: string;
  name: string;
}

interface JobLogsProps {
  workOrders: WorkOrder[];
  employees: SimpleEmployee[];
  onStatusChange: (orderId: string, newStatus: WorkOrderStatus) => Promise<void>;
  onViewDetails: (order: WorkOrder) => void;
}

const STATUS_COLORS: Record<WorkOrderStatus, string> = {
  Draft: "bg-gray-100 text-gray-700 ring-1 ring-gray-200",
  Assigned: "bg-blue-100 text-blue-700 ring-1 ring-blue-200",
  Submitted: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200",
};

const STATUS_ICONS: Record<WorkOrderStatus, string> = {
  Draft: "📝",
  Assigned: "👷",
  Submitted: "✅",
};

// Format date for display
function formatDate(dateString: string): string {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString || "N/A";
  }
}

// Format datetime for display
function formatDateTime(dateTimeString: string): string {
  if (!dateTimeString) return "N/A";
  try {
    const date = new Date(dateTimeString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateTimeString || "N/A";
  }
}

export default function JobLogs({
  workOrders,
  employees,
  onStatusChange,
  onViewDetails,
}: JobLogsProps) {
  const [statusFilter, setStatusFilter] = useState<WorkOrderStatus | "all">("all");
  const [employeeFilter, setEmployeeFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<"orderDateTime" | "customerName" | "status">("orderDateTime");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);

  // Filter to show only submitted/completed work orders for job logs
  const jobLogOrders = useMemo(() => {
    return workOrders.filter(order => order.status === "Submitted");
  }, [workOrders]);

  const filteredOrders = useMemo(() => {
    return jobLogOrders
      .filter((order) => {
        // Status filter
        if (statusFilter !== "all" && order.status !== statusFilter) return false;

        // Employee filter
        if (employeeFilter !== "all" && order.assignedEmployeeId !== employeeFilter) return false;

        // Date range filter
        if (dateRange.start && order.orderDateTime < dateRange.start) return false;
        if (dateRange.end && order.orderDateTime > dateRange.end + "T23:59:59") return false;

        // Search filter
        if (searchTerm) {
          const search = searchTerm.toLowerCase();
          return (
            order.customerName?.toLowerCase().includes(search) ||
            order.workDescription?.toLowerCase().includes(search) ||
            order.locationAddress?.toLowerCase().includes(search) ||
            order.customerPhone?.toLowerCase().includes(search)
          );
        }

        return true;
      })
      .sort((a, b) => {
        let comparison = 0;
        switch (sortField) {
          case "orderDateTime":
            comparison = new Date(a.orderDateTime).getTime() - new Date(b.orderDateTime).getTime();
            break;
          case "customerName":
            comparison = (a.customerName || "").localeCompare(b.customerName || "");
            break;
          case "status":
            comparison = a.status.localeCompare(b.status);
            break;
        }
        return sortDirection === "desc" ? -comparison : comparison;
      });
  }, [jobLogOrders, statusFilter, employeeFilter, dateRange, searchTerm, sortField, sortDirection]);

  const getEmployeeName = (id?: string) => {
    if (!id) return "Unassigned";
    return employees.find((e) => e.id === id)?.name || "Unknown";
  };

  const handleStatusChange = async (orderId: string, newStatus: WorkOrderStatus) => {
    setUpdatingOrderId(orderId);
    try {
      await onStatusChange(orderId, newStatus);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setEmployeeFilter("all");
    setDateRange({ start: "", end: "" });
    setSearchTerm("");
  };

  const handleDownloadPdf = async (workOrderId: string) => {
    setDownloadingPdfId(workOrderId);
    try {
      const response = await fetch(`/api/work-orders/${workOrderId}/pdf`, {
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to download PDF");
      }

      const result = await response.json();
      if (result.success && result.pdf) {
        downloadPdfFromBase64(result.pdf.base64, result.pdf.filename);
        toast.success("PDF downloaded successfully!");
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error) {
      console.error("PDF download error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to download PDF");
    } finally {
      setDownloadingPdfId(null);
    }
  };

  // Stats for the summary cards
  const stats = useMemo(() => {
    const submitted = jobLogOrders.filter((o) => o.status === "Submitted").length;
    const thisWeek = jobLogOrders.filter((o) => {
      const orderDate = new Date(o.orderDateTime);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return orderDate >= weekAgo;
    }).length;
    const thisMonth = jobLogOrders.filter((o) => {
      const orderDate = new Date(o.orderDateTime);
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return orderDate >= monthAgo;
    }).length;

    return { submitted, thisWeek, thisMonth, filtered: filteredOrders.length };
  }, [jobLogOrders, filteredOrders]);

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <span className="text-lg">✅</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{stats.submitted}</div>
              <div className="text-sm text-slate-500">Completed Jobs</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <span className="text-lg">📅</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{stats.thisWeek}</div>
              <div className="text-sm text-slate-500">This Week</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <span className="text-lg">📆</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{stats.thisMonth}</div>
              <div className="text-sm text-slate-500">This Month</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <span className="text-lg">🔍</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{stats.filtered}</div>
              <div className="text-sm text-slate-500">Filtered Results</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Filters</h3>
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Clear All
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as WorkOrderStatus | "all")}
              className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="Submitted">Submitted</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Employee</label>
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">From Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
              className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">To Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
              className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">Search</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by customer, description, location, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm pl-10"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Job Logs Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th
                  onClick={() => handleSort("orderDateTime")}
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase cursor-pointer hover:bg-slate-100"
                >
                  <div className="flex items-center gap-1">
                    Date
                    {sortField === "orderDateTime" && (
                      <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("customerName")}
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase cursor-pointer hover:bg-slate-100"
                >
                  <div className="flex items-center gap-1">
                    Customer
                    {sortField === "customerName" && (
                      <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                  Work Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                  Employee
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                  Location
                </th>
                <th
                  onClick={() => handleSort("status")}
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase cursor-pointer hover:bg-slate-100"
                >
                  <div className="flex items-center gap-1">
                    Status
                    {sortField === "status" && (
                      <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-slate-900">
                      {formatDate(order.orderDateTime)}
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatDateTime(order.orderDateTime).split(",")[1]}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-slate-900">{order.customerName}</div>
                    <div className="text-xs text-slate-500">{order.customerPhone}</div>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <div className="text-sm text-slate-600 truncate" title={order.workDescription}>
                      {order.workDescription}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-slate-900">
                      {getEmployeeName(order.assignedEmployeeId)}
                    </div>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <div className="text-sm text-slate-600 truncate" title={order.locationAddress}>
                      {order.locationAddress}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[order.status]}`}
                    >
                      <span>{STATUS_ICONS[order.status]}</span>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onViewDetails(order)}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        title="View Details"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDownloadPdf(order.id)}
                        disabled={downloadingPdfId === order.id}
                        className="text-emerald-600 hover:text-emerald-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Download PDF"
                      >
                        {downloadingPdfId === order.id ? (
                          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-1">No job logs found</h3>
            <p className="text-slate-500">
              {searchTerm || statusFilter !== "all" || employeeFilter !== "all" || dateRange.start || dateRange.end
                ? "Try adjusting your filters to find what you're looking for."
                : "Completed work orders will appear here."}
            </p>
          </div>
        )}
      </div>

      {/* Pagination info */}
      {filteredOrders.length > 0 && (
        <div className="text-center text-sm text-slate-500">
          Showing {filteredOrders.length} of {jobLogOrders.length} completed job logs
        </div>
      )}
    </div>
  );
}
