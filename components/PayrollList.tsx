"use client";

import React, { useState } from "react";
import { Payroll, PayrollStatus } from "@/lib/types";
import Button from "./ui/Button";
import Select from "./ui/Select";
import { MdModeEdit } from "react-icons/md";
import { MdDelete } from "react-icons/md";

interface PayrollListProps {
  payrolls: Payroll[];
  employees?: Array<{ id: string; name: string }>;
  onMarkCompleted?: (id: string) => void;
  onRefresh?: () => void;
  onEdit?: (payroll: Payroll) => void;
  onDelete?: (id: string) => Promise<void>;
  showEmployeeColumn?: boolean;
}

const PayrollList = React.memo(function PayrollList({
  payrolls,
  employees = [],
  onMarkCompleted,
  onRefresh,
  showEmployeeColumn = true,
  onEdit,
  onDelete,
}: PayrollListProps) {
  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPeriod, setFilterPeriod] = useState("");

  const statusColors: Record<PayrollStatus, string> = {
    Generated: "bg-blue-100 text-blue-700 ring-blue-200",
    "Pending Signature": "bg-amber-100 text-amber-700 ring-amber-200",
    Signed: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    Completed: "bg-gray-100 text-gray-700 ring-gray-200",
    Rejected: "bg-rose-100 text-rose-700 ring-rose-200",
  };

  const filteredPayrolls = payrolls.filter((p) => {
    if (filterEmployee && p.employeeId !== filterEmployee) return false;
    if (filterStatus && p.status !== filterStatus) return false;
    if (filterPeriod && p.period !== filterPeriod) return false;
    return true;
  });

  const employeeOptions = [
    { value: "", label: "All Employees" },
    ...employees.map((e) => ({ value: e.id, label: e.name })),
  ];

  const statusOptions = [
    { value: "", label: "All Statuses" },
    { value: "Generated", label: "Generated" },
    { value: "Pending Signature", label: "Pending Signature" },
    { value: "Signed", label: "Signed" },
    { value: "Completed", label: "Completed" },
  ];

  // Get unique periods for filter
  const periods = Array.from(new Set(payrolls.map((p) => p.period))).sort().reverse();
  const periodOptions = [
    { value: "", label: "All Periods" },
    ...periods.map((p) => ({
      value: p,
      label: new Date(p + "-01").toLocaleString("default", { month: "long", year: "numeric" }),
    })),
  ];

  const handleMarkCompleted = async (id: string) => {
    if (!onMarkCompleted) return;
    
    try {
      const res = await fetch(`/api/payroll`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, status: "Completed" }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update payroll");
      }

      onMarkCompleted(id);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Failed to mark payroll as completed:", error);
    }
  };

  if (payrolls.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No payrolls found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {showEmployeeColumn && employees.length > 0 && (
          <Select
            label="Filter by Employee"
            options={employeeOptions}
            value={filterEmployee}
            onChange={setFilterEmployee}
          />
        )}
        <Select
          label="Filter by Status"
          options={statusOptions}
          value={filterStatus}
          onChange={setFilterStatus}
        />
        <Select
          label="Filter by Period"
          options={periodOptions}
          value={filterPeriod}
          onChange={setFilterPeriod}
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {showEmployeeColumn && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Employee</th>}
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Period</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Base Salary</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Allowances</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Deductions</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Net Pay</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayrolls.map((payroll) => (
              <tr
                key={payroll.id}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                {showEmployeeColumn && (
                  <td className="px-4 py-3 text-sm text-gray-900">{payroll.employeeName}</td>
                )}
                <td className="px-4 py-3 text-sm text-gray-700">
                  {new Date(payroll.period + "-01").toLocaleString("default", {
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="px-4 py-3 text-sm text-right text-gray-700">
                  {payroll.baseSalary.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-sm text-right text-gray-700">
                  {payroll.allowances.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-sm text-right text-gray-700">
                  {payroll.deductions.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                  {payroll.netPay.toFixed(2)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${statusColors[payroll.status]}`}
                  >
                    {payroll.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {onMarkCompleted &&
                      payroll.status === "Signed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkCompleted(payroll.id)}
                        >
                          Mark Completed
                        </Button>
                      )}
                    {onEdit && (
                      <button
                        type="button"
                        onClick={() => onEdit(payroll)}
                        className="text-xs px-2 py-1 rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200 flex items-center gap-1"
                        title="Edit"
                      >
                        <MdModeEdit className="w-4 h-4" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete payroll for ${payroll.employeeName} (${payroll.period})?`)) {
                            onDelete(payroll.id);
                          }
                        }}
                        className="text-xs px-2 py-1 rounded bg-rose-100 text-rose-700 hover:bg-rose-200 flex items-center gap-1"
                        title="Delete"
                      >
                        <MdDelete className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredPayrolls.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No payrolls match the selected filters</p>
        </div>
      )}
    </div>
  );
});

PayrollList.displayName = "PayrollList";

export default PayrollList;
