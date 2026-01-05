"use client";

import { useState, FormEvent } from "react";
import Input from "./ui/Input";
import Select from "./ui/Select";
import Button from "./ui/Button";
import { Employee, Payroll } from "@/lib/types";
import toast from "react-hot-toast";

interface PayrollFormProps {
  employees: Employee[];
  onSuccess: () => void;
}

export default function PayrollForm({ employees, onSuccess }: PayrollFormProps) {
  const [loading, setLoading] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [period, setPeriod] = useState("");
  const [baseSalary, setBaseSalary] = useState("");
  const [allowances, setAllowances] = useState("0");
  const [deductions, setDeductions] = useState("0");

  // Generate period options (last 3 months and next 3 months)
  const generatePeriodOptions = () => {
    const options: Array<{ value: string; label: string }> = [];
    const now = new Date();
    
    for (let i = -3; i <= 3; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const periodValue = `${year}-${month}`;
      const monthName = date.toLocaleString("default", { month: "long", year: "numeric" });
      options.push({ value: periodValue, label: monthName });
    }
    
    return options;
  };

  const periodOptions = generatePeriodOptions();

  // Calculate derived values
  const baseSalaryNum = parseFloat(baseSalary) || 0;
  const allowancesNum = parseFloat(allowances) || 0;
  const deductionsNum = parseFloat(deductions) || 0;
  const grossPay = baseSalaryNum + allowancesNum;
  const netPay = grossPay - deductionsNum;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!employeeId || !period || !baseSalary) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (baseSalaryNum <= 0) {
      toast.error("Base salary must be greater than 0");
      return;
    }

    if (netPay < 0) {
      toast.error("Net pay cannot be negative");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          employeeId,
          period,
          baseSalary: baseSalaryNum,
          allowances: allowancesNum,
          deductions: deductionsNum,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate payroll");
      }

      toast.success("Payroll generated successfully");
      // Reset form
      setEmployeeId("");
      setPeriod("");
      setBaseSalary("");
      setAllowances("0");
      setDeductions("0");
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate payroll");
    } finally {
      setLoading(false);
    }
  };

  const employeeOptions = employees.map((emp) => ({
    value: emp.id,
    label: `${emp.name} (${emp.role})`,
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select
        label="Employee"
        required
        options={employeeOptions}
        placeholder="Select employee"
        value={employeeId}
        onChange={setEmployeeId}
      />

      <Select
        label="Period (Month/Year)"
        required
        options={periodOptions}
        placeholder="Select period"
        value={period}
        onChange={setPeriod}
      />

      <Input
        label="Base Salary"
        type="number"
        required
        min="0"
        step="0.01"
        value={baseSalary}
        onChange={(e) => setBaseSalary(e.target.value)}
      />

      <Input
        label="Allowances"
        type="number"
        min="0"
        step="0.01"
        value={allowances}
        onChange={(e) => setAllowances(e.target.value)}
      />

      <Input
        label="Deductions"
        type="number"
        min="0"
        step="0.01"
        value={deductions}
        onChange={(e) => setDeductions(e.target.value)}
      />

      {/* Calculated values display */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 space-y-2 border border-blue-100">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">Gross Pay:</span>
          <span className="text-lg font-semibold text-gray-900">
            {grossPay.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">Net Pay:</span>
          <span className="text-xl font-bold text-blue-600">
            {netPay.toFixed(2)}
          </span>
        </div>
      </div>

      <Button type="submit" loading={loading} fullWidth>
        Generate Payroll
      </Button>
    </form>
  );
}
