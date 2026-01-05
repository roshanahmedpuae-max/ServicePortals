import crypto from "crypto";
import {
  AdminUser,
  BusinessUnit,
  Customer,
  Employee,
  EmployeeStatus,
  ServiceType,
  WorkOrder,
  WorkOrderStatus,
} from "@/lib/types";

const hashPassword = (value: string) =>
  crypto.createHash("sha256").update(value).digest("hex");

class InMemoryStore {
  private admins: AdminUser[] = [];
  private employees: Employee[] = [];
  private customers: Customer[] = [];
  private serviceTypes: ServiceType[] = [];
  private workOrders: WorkOrder[] = [];

  constructor() {
    this.seed();
  }

  private seed() {
    if (this.admins.length > 0) return;
    const seeds: Array<{
      email: string;
      password: string;
      businessUnit: BusinessUnit;
    }> = [
      { email: "info@g3fm.ae", password: "G3fm@2025", businessUnit: "G3" },
      {
        email: "info@printersuae.com",
        password: "Printersuae@2025",
        businessUnit: "PrintersUAE",
      },
      { email: "info@it.ae", password: "ITS@2025", businessUnit: "IT" },
    ];

    this.admins = seeds.map((seed) => ({
      id: crypto.randomUUID(),
      email: seed.email.toLowerCase(),
      passwordHash: hashPassword(seed.password),
      businessUnit: seed.businessUnit,
      role: "admin",
    }));
  }

  authenticateAdmin(email: string, password: string) {
    const admin = this.admins.find(
      (a) => a.email === email.toLowerCase().trim()
    );
    if (!admin) return null;
    const ok = admin.passwordHash === hashPassword(password);
    return ok ? admin : null;
  }

  authenticateEmployee(name: string, password: string, bu: BusinessUnit) {
    const employee = this.employees.find(
      (e) =>
        e.name.toLowerCase().trim() === name.toLowerCase().trim() &&
        e.businessUnit === bu
    );
    if (!employee) return null;
    return employee.passwordHash === hashPassword(password) ? employee : null;
  }

  authenticateEmployeeAny(name: string, password: string) {
    const targetName = name.toLowerCase().trim();
    const pwHash = hashPassword(password);
    const match = this.employees.find(
      (e) => e.name.toLowerCase().trim() === targetName && e.passwordHash === pwHash
    );
    return match ?? null;
  }

  getAdmins() {
    return this.admins;
  }

  listEmployees(bu: BusinessUnit) {
    return this.employees.filter((e) => e.businessUnit === bu);
  }

  createEmployee(input: {
    name: string;
    password: string;
    businessUnit: BusinessUnit;
    role: string;
    status?: EmployeeStatus;
  }) {
    const employee: Employee = {
      id: crypto.randomUUID(),
      name: input.name,
      passwordHash: hashPassword(input.password),
      businessUnit: input.businessUnit,
      role: input.role,
      status: input.status ?? "Available",
    };
    this.employees.push(employee);
    return employee;
  }

  updateEmployee(
    id: string,
    updates: Partial<Omit<Employee, "id" | "businessUnit" | "passwordHash">> & {
      password?: string;
    }
  ) {
    const existing = this.employees.find((e) => e.id === id);
    if (!existing) return null;
    if (updates.name) existing.name = updates.name;
    if (updates.role) existing.role = updates.role;
    if (updates.status) existing.status = updates.status;
    if (updates.password) existing.passwordHash = hashPassword(updates.password);
    return existing;
  }

  deleteEmployee(id: string) {
    const target = this.employees.find((e) => e.id === id);
    if (!target) return false;
    // Unassign any work orders tied to this employee
    this.workOrders = this.workOrders.map((w) =>
      w.assignedEmployeeId === id
        ? {
            ...w,
            assignedEmployeeId: undefined,
            status: "Draft",
          }
        : w
    );
    this.employees = this.employees.filter((e) => e.id !== id);
    return true;
  }

  listCustomers(bu: BusinessUnit) {
    return this.customers.filter((c) => c.businessUnit === bu);
  }

  createCustomer(input: { name: string; contact?: string; businessUnit: BusinessUnit }) {
    const customer: Customer = {
      id: crypto.randomUUID(),
      name: input.name,
      contact: input.contact,
      businessUnit: input.businessUnit,
    };
    this.customers.push(customer);
    return customer;
  }

  updateCustomer(id: string, updates: Partial<Omit<Customer, "id" | "businessUnit">>) {
    const existing = this.customers.find((c) => c.id === id);
    if (!existing) return null;
    if (updates.name) existing.name = updates.name;
    if (updates.contact !== undefined) existing.contact = updates.contact;
    return existing;
  }

  deleteCustomer(id: string) {
    const before = this.customers.length;
    this.customers = this.customers.filter((c) => c.id !== id);
    return before !== this.customers.length;
  }

  listServiceTypes(bu: BusinessUnit) {
    return this.serviceTypes.filter((s) => s.businessUnit === bu);
  }

  createServiceType(input: {
    name: string;
    description?: string;
    businessUnit: BusinessUnit;
  }) {
    const serviceType: ServiceType = {
      id: crypto.randomUUID(),
      name: input.name,
      description: input.description,
      businessUnit: input.businessUnit,
    };
    this.serviceTypes.push(serviceType);
    return serviceType;
  }

  updateServiceType(
    id: string,
    updates: Partial<Omit<ServiceType, "id" | "businessUnit">>
  ) {
    const existing = this.serviceTypes.find((s) => s.id === id);
    if (!existing) return null;
    if (updates.name) existing.name = updates.name;
    if (updates.description !== undefined) existing.description = updates.description;
    return existing;
  }

  deleteServiceType(id: string) {
    const before = this.serviceTypes.length;
    this.serviceTypes = this.serviceTypes.filter((s) => s.id !== id);
    return before !== this.serviceTypes.length;
  }

  listWorkOrders(bu: BusinessUnit) {
    return this.workOrders.filter((w) => w.businessUnit === bu);
  }

  createWorkOrder(input: {
    businessUnit: BusinessUnit;
    customerId: string;
    serviceTypeId?: string;
    assignedEmployeeId?: string;
    workDescription: string;
    locationAddress: string;
    customerPhone: string;
    orderDateTime: string;
    createdBy: string;
  }) {
    const now = new Date().toISOString();
    const workOrder: WorkOrder = {
      id: crypto.randomUUID(),
      businessUnit: input.businessUnit,
      customerId: input.customerId,
      serviceTypeId: input.serviceTypeId,
      assignedEmployeeId: input.assignedEmployeeId,
      workDescription: input.workDescription,
      locationAddress: input.locationAddress,
      customerPhone: input.customerPhone,
      orderDateTime: input.orderDateTime,
      status: input.assignedEmployeeId ? "Assigned" : "Draft",
      audit: {
        createdAt: now,
        updatedAt: now,
        createdBy: input.createdBy,
        updatedBy: input.createdBy,
      },
    };
    this.workOrders.push(workOrder);
    if (input.assignedEmployeeId) {
      this.setEmployeeStatus(input.assignedEmployeeId, "Unavailable");
    }
    return workOrder;
  }

  updateWorkOrderAdmin(
    id: string,
    updates: Partial<
      Pick<
        WorkOrder,
        "customerId" | "serviceTypeId" | "assignedEmployeeId" | "workDescription"
      >
    > & { updatedBy: string }
  ) {
    const existing = this.workOrders.find((w) => w.id === id);
    if (!existing) return null;

    const previousEmployee = existing.assignedEmployeeId;

    if (updates.customerId) existing.customerId = updates.customerId;
    if (updates.serviceTypeId !== undefined)
      existing.serviceTypeId = updates.serviceTypeId;
    if (updates.workDescription) existing.workDescription = updates.workDescription;
    if (updates.assignedEmployeeId !== undefined) {
      existing.assignedEmployeeId = updates.assignedEmployeeId;
      existing.status = updates.assignedEmployeeId ? "Assigned" : "Draft";
    }

    existing.audit.updatedBy = updates.updatedBy;
    existing.audit.updatedAt = new Date().toISOString();

    // Update employee status transitions
    if (updates.assignedEmployeeId && updates.assignedEmployeeId !== previousEmployee) {
      this.setEmployeeStatus(updates.assignedEmployeeId, "Unavailable");
      if (previousEmployee) this.setEmployeeStatus(previousEmployee, "Available");
    }
    if (!updates.assignedEmployeeId && previousEmployee) {
      this.setEmployeeStatus(previousEmployee, "Available");
    }

    return existing;
  }

  updateWorkOrderByEmployee(
    id: string,
    updates: Pick<
      WorkOrder,
      "findings" | "beforePhotos" | "afterPhotos" | "signature" | "customerApproval"
    > & { updatedBy: string }
  ) {
    const existing = this.workOrders.find((w) => w.id === id);
    if (!existing) return null;
    existing.findings = updates.findings;
    existing.beforePhotos = updates.beforePhotos;
    existing.afterPhotos = updates.afterPhotos;
    existing.signature = updates.signature;
    existing.customerApproval = updates.customerApproval;
    existing.status = "Submitted";
    existing.audit.updatedBy = updates.updatedBy;
    existing.audit.updatedAt = new Date().toISOString();
    if (existing.assignedEmployeeId) {
      this.setEmployeeStatus(existing.assignedEmployeeId, "Available");
    }
    return existing;
  }

  private setEmployeeStatus(id: string, status: EmployeeStatus) {
    const employee = this.employees.find((e) => e.id === id);
    if (employee) {
      employee.status = status;
    }
  }
}

let store: InMemoryStore | null = null;

export const getStore = () => {
  if (!store) store = new InMemoryStore();
  return store;
};

