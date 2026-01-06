"use client";

import React, { useMemo } from "react";
import { Card } from "./Card";
import { AdminTabProps } from "./types";
import { MdModeEdit, MdDelete } from "react-icons/md";

const badgeColor = (status: string) =>
  status === "Available"
    ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
    : "bg-amber-100 text-amber-700 ring-amber-200";

interface DashboardTabProps extends AdminTabProps {
  activeDashboardPanel: string | null;
  setActiveDashboardPanel: (panel: string | null) => void;
  editingEmployeeId: string | null;
  editName: string;
  editRole: string;
  editStatus: string;
  editPassword: string;
  editFeatureAccess: string[];
  setEditName: (name: string) => void;
  setEditRole: (role: string) => void;
  setEditStatus: (status: string) => void;
  setEditPassword: (password: string) => void;
  setEditFeatureAccess: (access: string[]) => void;
  startEditEmployee: (emp: any) => void;
  handleUpdateEmployee: () => void;
  handleDeleteEmployee: (id: string) => void;
  availableCount: number;
  assignedCount: number;
  openTicketCount: number;
  submittedCount: number;
}

export default React.memo(function DashboardTab({
  customers,
  serviceTypes,
  employees,
  workOrders,
  tickets,
  payrolls,
  rentalMachines,
  adminAuth,
  activeDashboardPanel,
  setActiveDashboardPanel,
  editingEmployeeId,
  editName,
  editRole,
  editStatus,
  editPassword,
  editFeatureAccess,
  setEditName,
  setEditRole,
  setEditStatus,
  setEditPassword,
  setEditFeatureAccess,
  startEditEmployee,
  handleUpdateEmployee,
  handleDeleteEmployee,
  availableCount,
  assignedCount,
  openTicketCount,
  submittedCount,
}: DashboardTabProps) {
  const dashboardStats = useMemo(() => [
    {
      id: "customers",
      label: "Customers",
      value: customers.length,
      accent: "from-sky-500 to-indigo-500",
    },
    {
      id: "serviceTypes",
      label: "Service Types",
      value: serviceTypes.length,
      accent: "from-emerald-500 to-teal-500",
    },
    {
      id: "availableStaff",
      label: "Available Staff",
      value: availableCount,
      accent: "from-amber-500 to-orange-500",
    },
    {
      id: "assignedJobs",
      label: "Assigned Jobs",
      value: assignedCount,
      accent: "from-fuchsia-500 to-purple-500",
    },
    {
      id: "openTickets",
      label: "Open Tickets",
      value: openTicketCount,
      accent: "from-rose-500 to-orange-500",
    },
    {
      id: "payroll",
      label: "Payroll",
      value: payrolls.length,
      accent: "from-blue-500 to-cyan-500",
    },
    ...(adminAuth?.businessUnit === "PrintersUAE"
      ? [
          {
            id: "rentalMachines",
            label: "Rental Machines",
            value: rentalMachines.length,
            accent: "from-amber-500 to-yellow-500",
          } as const,
        ]
      : []),
  ], [customers.length, serviceTypes.length, availableCount, assignedCount, openTicketCount, payrolls.length, rentalMachines.length, adminAuth?.businessUnit]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {dashboardStats.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveDashboardPanel(item.id)}
            className={`rounded-2xl bg-gradient-to-br ${item.accent} text-white p-4 shadow-xl border border-white/10 text-left hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-white/60`}
          >
            <p className="text-sm uppercase tracking-wide text-white/80">{item.label}</p>
            <p className="text-3xl font-bold mt-1">{item.value}</p>
          </button>
        ))}
      </div>

      {/* Panel Modals - Simplified for now, can be extracted later */}
      {activeDashboardPanel === "customers" && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 py-8"
          onClick={() => setActiveDashboardPanel(null)}
        >
          <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <Card
              title="Customers"
              action={
                <button
                  type="button"
                  onClick={() => setActiveDashboardPanel(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center text-sm"
                >
                  ✕
                </button>
              }
            >
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {customers.length === 0 ? (
                  <p className="text-sm text-slate-500">No customers yet.</p>
                ) : (
                  customers.map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 bg-white">
                      <p className="text-sm font-medium text-slate-900">{c.name}</p>
                      {c.contact && <p className="text-xs text-slate-500 truncate max-w-[40%]">{c.contact}</p>}
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeDashboardPanel === "availableStaff" && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 py-8"
          onClick={() => setActiveDashboardPanel(null)}
        >
          <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <Card
              title="Staff Overview"
              action={
                <button
                  type="button"
                  onClick={() => setActiveDashboardPanel(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center text-sm"
                >
                  ✕
                </button>
              }
            >
              <div className="grid md:grid-cols-2 gap-4 max-h-[360px] overflow-y-auto pr-1">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Available staff</p>
                  {employees.filter((e) => e.status === "Available").length === 0 ? (
                    <p className="text-sm text-slate-500">No staff currently marked as available.</p>
                  ) : (
                    employees
                      .filter((e) => e.status === "Available")
                      .map((e) => (
                        <div key={e.id} className="flex items-center justify-between gap-2 rounded-lg border border-emerald-100 px-3 py-2 bg-emerald-50">
                          <div>
                            <p className="text-sm font-medium text-slate-900">{e.name}</p>
                            <p className="text-xs text-slate-600">{e.role}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${badgeColor(e.status)}`}>
                              {e.status}
                            </span>
                            <button
                              type="button"
                              onClick={() => startEditEmployee(e)}
                              className="text-xs px-2 py-1 rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200 flex items-center gap-1"
                            >
                              <MdModeEdit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteEmployee(e.id)}
                              className="text-xs px-2 py-1 rounded bg-rose-100 text-rose-700 hover:bg-rose-200 flex items-center gap-1"
                            >
                              <MdDelete className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Unavailable staff</p>
                  {employees.filter((e) => e.status !== "Available").length === 0 ? (
                    <p className="text-sm text-slate-500">No staff currently marked as unavailable.</p>
                  ) : (
                    employees
                      .filter((e) => e.status !== "Available")
                      .map((e) => (
                        <div key={e.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 bg-white">
                          <div>
                            <p className="text-sm font-medium text-slate-900">{e.name}</p>
                            <p className="text-xs text-slate-600">{e.role}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${badgeColor(e.status)}`}>
                              {e.status}
                            </span>
                            <button
                              type="button"
                              onClick={() => startEditEmployee(e)}
                              className="text-xs px-2 py-1 rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200 flex items-center gap-1"
                            >
                              <MdModeEdit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteEmployee(e.id)}
                              className="text-xs px-2 py-1 rounded bg-rose-100 text-rose-700 hover:bg-rose-200 flex items-center gap-1"
                            >
                              <MdDelete className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>

              {editingEmployeeId && employees.some((e) => e.id === editingEmployeeId) && (
                <div className="mt-4 border-t border-slate-200 pt-3">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Edit employee</p>
                  <div className="grid md:grid-cols-2 gap-3">
                    <input
                      value={editName}
                      onChange={(ev) => setEditName(ev.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      placeholder="Employee name"
                    />
                    <input
                      value={editRole}
                      onChange={(ev) => setEditRole(ev.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      placeholder="Role"
                    />
                    <select
                      value={editStatus}
                      onChange={(ev) => setEditStatus(ev.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      <option value="Available">Available</option>
                      <option value="Unavailable">Unavailable</option>
                    </select>
                    <input
                      type="password"
                      value={editPassword}
                      onChange={(ev) => setEditPassword(ev.target.value)}
                      placeholder="New password (optional)"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2 pt-2 border-t border-slate-200">
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Feature Access</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: "payroll", label: "Payroll" },
                        { key: "assets", label: "Assets" },
                        { key: "tickets", label: "Tickets" },
                        { key: "schedule_works", label: "Schedule Works" },
                        { key: "dashboard", label: "Dashboard" },
                        { key: "setup", label: "Setup" },
                        { key: "notifications", label: "Notifications" },
                        { key: "advertisements", label: "Advertisements" },
                      ].map((feature) => (
                        <label key={feature.key} className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={editFeatureAccess.includes(feature.key)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditFeatureAccess([...editFeatureAccess, feature.key]);
                              } else {
                                setEditFeatureAccess(editFeatureAccess.filter((f) => f !== feature.key));
                              }
                            }}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>{feature.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        // Reset edit state - this will be handled by parent
                        setEditName("");
                        setEditRole("");
                        setEditStatus("Available");
                        setEditPassword("");
                        setEditFeatureAccess([]);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleUpdateEmployee}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-500"
                    >
                      Save changes
                    </button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Other panels can be added similarly */}
    </div>
  );
});

