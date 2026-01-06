import {
  BusinessUnit,
  DailySchedule,
  EmployeeStatus,
  Ticket,
  TicketStatus,
  WorkOrder,
  Payroll,
  LeaveRequest,
  OvertimeRequest,
} from "@/lib/types";

export type AdminAuth = {
  email?: string;
  name?: string;
  businessUnit: BusinessUnit;
  role: "admin" | "employee";
  featureAccess?: string[];
};

export type Customer = {
  id: string;
  name: string;
  contact?: string;
};

export type CustomerUser = {
  id: string;
  email: string;
  username: string;
  companyName?: string;
};

export type ServiceType = {
  id: string;
  name: string;
  description?: string;
};

export type Employee = {
  id: string;
  name: string;
  role: string;
  status: EmployeeStatus;
};

export type AuthedFetch = (url: string, init?: RequestInit) => Promise<any>;

export interface AdminTabProps {
  adminAuth: AdminAuth;
  authedFetch: AuthedFetch;
  customers: Customer[];
  serviceTypes: ServiceType[];
  employees: Employee[];
  workOrders: WorkOrder[];
  tickets: Ticket[];
  payrolls: Payroll[];
  dailySchedules: DailySchedule[];
  rentalMachines: any[];
  copierModels: any[];
  assetDates: Array<{
    id: string;
    categoryKey: string;
    assetId: string;
    dateType: string;
    dateValue: string;
    status: string;
    daysUntil: number;
  }>;
  assetsSummary: {
    businessUnit: BusinessUnit;
    categories: Record<
      "vehicles" | "registrations" | "bills_contracts" | "it_equipment",
      { active: number }
    >;
    dates: { upcoming: number; overdue: number };
  } | null;
  customerUsers: CustomerUser[];
  assetNotifications: Array<{
    id: string;
    sentAt: string;
    categoryKey: string;
    assetId: string;
    dateType: string;
    dateValue: string;
    isOverdueEscalation?: boolean;
    type?: "asset" | "leave" | "ticket" | "asset_approaching" | "advance_salary" | "work_order";
    employeeId?: string;
    employeeName?: string;
    leaveType?: string;
    endDate?: string;
    customerId?: string;
    customerName?: string;
    subject?: string;
    priority?: string;
    status?: string;
    daysUntil?: number;
    isOverdue?: boolean;
    isApproaching?: boolean;
    amount?: number;
    workDescription?: string;
    locationAddress?: string;
  }>;
  employeeLeaves: Record<string, LeaveRequest[]>;
  employeeOvertimes: Record<string, OvertimeRequest[]>;
  advanceSalaryRequests: Array<{
    id: string;
    employeeId: string;
    employeeName: string;
    amount: number;
    reason: string;
    requestedDate: string;
    status: string;
    approvedByAdminId?: string;
    approvedAt?: string;
    rejectedByAdminId?: string;
    rejectedAt?: string;
    rejectionReason?: string;
    approvalMessage?: string;
  }>;
  onRefresh?: () => void;
}

