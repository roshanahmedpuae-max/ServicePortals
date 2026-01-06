"use client";

import { useEffect, useMemo, useState, FormEvent, ChangeEvent, useRef, use } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { BusinessUnit, Ticket, TicketPriority, TicketStatus } from "@/lib/types";
import { FaEye, FaRegEye } from "react-icons/fa";
import { RiMenu5Fill } from "react-icons/ri";
import { BiSolidHomeSmile } from "react-icons/bi";
import { FaUser } from "react-icons/fa6";
import { IoExit, IoNotifications } from "react-icons/io5";
import { MdLockReset } from "react-icons/md";

type AuthMode = "login" | "register";

type CustomerSession = {
  id: string;
  email?: string;
  username?: string;
  businessUnit: BusinessUnit;
};

const BU_THEMES: Record<BusinessUnit, { name: string; gradient: string; primary: string }> = {
  PrintersUAE: {
    name: "Printers UAE",
    gradient: "from-blue-600 to-purple-600",
    primary: "text-indigo-600",
  },
  G3: {
    name: "G3 Facility",
    gradient: "from-emerald-600 to-teal-600",
    primary: "text-emerald-600",
  },
  IT: {
    name: "IT Services",
    gradient: "from-purple-600 to-violet-600",
    primary: "text-purple-600",
  },
};

const STATUS_BADGE: Record<TicketStatus, string> = {
  New: "bg-sky-100 text-sky-700 border-sky-200",
  "In Progress": "bg-amber-100 text-amber-800 border-amber-200",
  "On Hold": "bg-slate-100 text-slate-700 border-slate-200",
  Resolved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Closed: "bg-slate-200 text-slate-800 border-slate-300",
};

const PRIORITY_BADGE: Record<TicketPriority, string> = {
  Low: "bg-slate-100 text-slate-700 border-slate-200",
  Medium: "bg-indigo-100 text-indigo-700 border-indigo-200",
  High: "bg-rose-100 text-rose-700 border-rose-200",
};

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    credentials: "include",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Request failed");
  }
  return res.json();
}

interface PageProps {
  params: Promise<{ bu: string }>;
}

export default function CustomerPortalPage({ params }: PageProps) {
  const router = useRouter();
  // In Next.js 16, params is a Promise and must be unwrapped with React.use()
  const resolvedParams = use(params);
  const buParam = (resolvedParams?.bu || "").toLowerCase();

  const businessUnit: BusinessUnit | null = useMemo(() => {
    if (!buParam) return null;
    if (buParam === "puae" || buParam === "printersuae" || buParam === "printers-uae") return "PrintersUAE";
    if (buParam === "g3") return "G3";
    if (buParam === "it") return "IT";
    return null;
  }, [buParam]);

  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [session, setSession] = useState<CustomerSession | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [filterStatus, setFilterStatus] = useState<TicketStatus | "all">("all");

  const [creatingTicket, setCreatingTicket] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newPriority, setNewPriority] = useState<TicketPriority>("Medium");
  const [newAttachments, setNewAttachments] = useState<string[]>([]);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterPasswordConfirmation, setShowRegisterPasswordConfirmation] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [activeCustomerTab, setActiveCustomerTab] = useState<"home" | "tickets" | "profile">("home");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [resetOtpRequested, setResetOtpRequested] = useState(false);
  const [resetOtp, setResetOtp] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number } | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationButtonRef = useRef<HTMLButtonElement>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    relatedId?: string;
    sentAt: string;
    readAt?: string;
  }>>([]);
  const [advertisements, setAdvertisements] = useState<Array<{
    id: string;
    type: "image" | "message";
    imageUrl?: string;
    message?: string;
    createdAt: string;
    expiresAt: string;
  }>>([]);

  useEffect(() => {
    if (!businessUnit) return;

    const loadSession = async () => {
      try {
        const data = await fetchJson<{ user?: { id: string; role: string; businessUnit: BusinessUnit; email?: string; name?: string } }>(
          "/api/auth/session"
        );
        if (data.user?.role === "customer" && data.user.businessUnit === businessUnit) {
          setSession({
            id: data.user.id,
            email: data.user.email,
            username: data.user.name,
            businessUnit: data.user.businessUnit,
          });
        }
      } catch {
        // Not logged in – ignore
      } finally {
        setLoadingSession(false);
      }
    };

    loadSession();
  }, [businessUnit]);

  useEffect(() => {
    if (!session) return;

    const loadTickets = async () => {
      setTicketsLoading(true);
      try {
        const qs = filterStatus === "all" ? "" : `?status=${encodeURIComponent(filterStatus)}`;
        const data = await fetchJson<Ticket[]>(`/api/tickets${qs}`);
        setTickets(Array.isArray(data) ? data : []);
        
        // Load customer notifications
        try {
          const notifData = await fetchJson<Array<{
            id: string;
            type: string;
            title: string;
            message: string;
            relatedId?: string;
            sentAt: string;
            readAt?: string;
          }>>("/api/customer/notifications");
          setNotifications(Array.isArray(notifData) ? notifData : []);
          setNotificationCount(notifData.filter((n: any) => !n.readAt).length);
        } catch {
          setNotifications([]);
          setNotificationCount(0);
        }

        // Load advertisements
        try {
          const adData = await fetchJson<Array<{
            id: string;
            type: "image" | "message";
            imageUrl?: string;
            message?: string;
            createdAt: string;
            expiresAt: string;
          }>>("/api/customer/advertisements");
          setAdvertisements(Array.isArray(adData) ? adData : []);
        } catch {
          setAdvertisements([]);
        }
      } catch (error) {
        toast.error((error as Error).message);
      } finally {
        setTicketsLoading(false);
      }
    };

    loadTickets();
  }, [session, filterStatus]);

  // Refresh notifications and advertisements periodically
  useEffect(() => {
    if (!session) return;

    const refreshNotifications = async () => {
      try {
        const notifData = await fetchJson<Array<{
          id: string;
          type: string;
          title: string;
          message: string;
          relatedId?: string;
          sentAt: string;
          readAt?: string;
        }>>("/api/customer/notifications");
        setNotifications(Array.isArray(notifData) ? notifData : []);
        setNotificationCount(notifData.filter((n) => !n.readAt).length);
      } catch {
        // Ignore errors
      }
    };

    const refreshAdvertisements = async () => {
      try {
        const adData = await fetchJson<Array<{
          id: string;
          type: "image" | "message";
          imageUrl?: string;
          message?: string;
          createdAt: string;
          expiresAt: string;
        }>>("/api/customer/advertisements");
        setAdvertisements(Array.isArray(adData) ? adData : []);
      } catch {
        // Ignore errors
      }
    };

    refreshNotifications();
    refreshAdvertisements();
    const interval = setInterval(() => {
      refreshNotifications();
      refreshAdvertisements();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [session]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showNotifications &&
        notificationButtonRef.current &&
        !notificationButtonRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest('[data-notification-dropdown]')
      ) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showNotifications]);

  if (!businessUnit) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-900 text-white px-4">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-2xl font-bold">Invalid customer portal</h1>
          <p className="text-sm text-slate-300">
            The business unit in this URL is not recognized. Please use `/customer/Puae`, `/customer/G3`, or `/customer/IT`.
          </p>
        </div>
      </main>
    );
  }

  const theme = BU_THEMES[businessUnit];

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!businessUnit) return;

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    const username = String(form.get("username") || "").trim();
    const companyName = String(form.get("companyName") || "").trim();
    const password = String(form.get("password") || "");
    const passwordConfirmation = String(form.get("passwordConfirmation") || "");

    setSubmitting(true);
    try {
      const data = await fetchJson<{
        customer: { id: string; email: string; username: string; companyName?: string; businessUnit: BusinessUnit };
      }>("/api/auth/customer/register", {
        method: "POST",
        body: JSON.stringify({
          email,
          username,
          companyName: companyName || undefined,
          password,
          passwordConfirmation,
          businessUnit,
        }),
      });

      setSession({
        id: data.customer.id,
        email: data.customer.email,
        username: data.customer.username,
        businessUnit: data.customer.businessUnit,
      });
      toast.success("Registration successful");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!businessUnit) return;

    const form = new FormData(event.currentTarget);
    const identifier = String(form.get("identifier") || "").trim();
    const password = String(form.get("password") || "");

    setSubmitting(true);
    try {
      const data = await fetchJson<{
        customer: { id: string; email: string; username: string; businessUnit: BusinessUnit };
      }>("/api/auth/customer/login", {
        method: "POST",
        body: JSON.stringify({
          identifier,
          password,
          businessUnit,
        }),
      });

      setSession({
        id: data.customer.id,
        email: data.customer.email,
        username: data.customer.username,
        businessUnit: data.customer.businessUnit,
      });
      toast.success("Logged in");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {});
    setSession(null);
    setTickets([]);
    setActiveTicket(null);
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const dataUrls: string[] = [];

    for (const file of fileArray) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File "${file.name}" is too large. Maximum size is 10MB.`);
        continue;
      }

      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === "string") {
              resolve(reader.result);
            } else {
              reject(new Error("Failed to read file"));
            }
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        dataUrls.push(dataUrl);
      } catch (error) {
        toast.error(`Failed to read file "${file.name}"`);
      }
    }

    setNewAttachments((prev) => [...prev, ...dataUrls]);
    // Reset input
    event.target.value = "";
  };

  const removeAttachment = (index: number) => {
    setNewAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateTicket = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session) return;

    if (!newSubject.trim() || !newDescription.trim()) {
      toast.error("Subject and description are required");
      return;
    }

    setCreatingTicket(true);
    try {
      const created = await fetchJson<Ticket>("/api/tickets", {
        method: "POST",
        body: JSON.stringify({
          subject: newSubject.trim(),
          description: newDescription.trim(),
          category: newCategory.trim() || undefined,
          priority: newPriority,
          attachments: newAttachments,
        }),
      });

      setTickets((prev) => [created, ...prev]);
      setNewSubject("");
      setNewDescription("");
      setNewCategory("");
      setNewPriority("Medium");
      setNewAttachments([]);
      toast.success("Ticket created");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setCreatingTicket(false);
    }
  };

  if (loadingSession) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <p className="text-sm text-slate-200">Loading {theme.name} customer portal...</p>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-50 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-300">Customer Portal</p>
            <h1 className="text-2xl font-bold text-white">
              {theme.name} Support Tickets
            </h1>
            <p className="text-sm text-slate-300">
              Register as a new customer or log in to raise and track support tickets.
            </p>
          </div>

          <div className="bg-white/10 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-md p-5 space-y-4">
            <div className="flex rounded-xl bg-slate-900/60 p-1 text-xs font-medium">
              <button
                type="button"
                onClick={() => setAuthMode("login")}
                className={`flex-1 py-2 rounded-lg transition ${
                  authMode === "login"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-200 hover:bg-white/5"
                }`}
              >
                Existing customer
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("register")}
                className={`flex-1 py-2 rounded-lg transition ${
                  authMode === "register"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-200 hover:bg-white/5"
                }`}
              >
                New customer
              </button>
            </div>

            {authMode === "register" ? (
              <form className="space-y-3" onSubmit={handleRegister}>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-200">Email address</label>
                  <input
                    name="email"
                    type="email"
                    required
                    className="w-full rounded-lg border border-white/20 bg-slate-900/40 px-3 py-2 text-sm text-white placeholder:text-slate-400"
                    placeholder="you@example.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-200">User name</label>
                  <input
                    name="username"
                    required
                    className="w-full rounded-lg border border-white/20 bg-slate-900/40 px-3 py-2 text-sm text-white placeholder:text-slate-400"
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-200">Company name</label>
                  <input
                    name="companyName"
                    className="w-full rounded-lg border border-white/20 bg-slate-900/40 px-3 py-2 text-sm text-white placeholder:text-slate-400"
                    placeholder="Your company name (optional)"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-200">Password</label>
                  <div className="relative">
                    <input
                      name="password"
                      type={showRegisterPassword ? "text" : "password"}
                      required
                      minLength={8}
                      className="w-full rounded-lg border border-white/20 bg-slate-900/40 px-3 py-2 pr-10 text-sm text-white placeholder:text-slate-400"
                      placeholder="Minimum 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegisterPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-200"
                      aria-label={showRegisterPassword ? "Hide password" : "Show password"}
                    >
                      {showRegisterPassword ? (
                        <FaEye className="w-5 h-5" />
                      ) : (
                        <FaRegEye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-200">Confirm password</label>
                  <div className="relative">
                    <input
                      name="passwordConfirmation"
                      type={showRegisterPasswordConfirmation ? "text" : "password"}
                      required
                      minLength={8}
                      className="w-full rounded-lg border border-white/20 bg-slate-900/40 px-3 py-2 pr-10 text-sm text-white placeholder:text-slate-400"
                      placeholder="Re-enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegisterPasswordConfirmation((prev) => !prev)}
                      className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-200"
                      aria-label={showRegisterPasswordConfirmation ? "Hide password" : "Show password"}
                    >
                      {showRegisterPasswordConfirmation ? (
                        <FaEye className="w-5 h-5" />
                      ) : (
                        <FaRegEye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg bg-gradient-to-r from-indigo-500 to-emerald-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/40 hover:brightness-110 disabled:opacity-60"
                >
                  {submitting ? "Creating account..." : "Register & continue"}
                </button>
                <p className="text-[11px] text-slate-300">
                  You are registering for{" "}
                  <span className="font-semibold">{theme.name}</span> customer portal.
                </p>
              </form>
            ) : (
              <form className="space-y-3" onSubmit={handleLogin}>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-200">User name or email</label>
                  <input
                    name="identifier"
                    required
                    className="w-full rounded-lg border border-white/20 bg-slate-900/40 px-3 py-2 text-sm text-white placeholder:text-slate-400"
                    placeholder="Registered user name or email"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-200">Password</label>
                  <div className="relative">
                    <input
                      name="password"
                      type={showLoginPassword ? "text" : "password"}
                      required
                      className="w-full rounded-lg border border-white/20 bg-slate-900/40 px-3 py-2 pr-10 text-sm text-white placeholder:text-slate-400"
                      placeholder="Your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-200"
                      aria-label={showLoginPassword ? "Hide password" : "Show password"}
                    >
                      {showLoginPassword ? (
                        <FaEye className="w-5 h-5" />
                      ) : (
                        <FaRegEye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg bg-gradient-to-r from-indigo-500 to-emerald-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/40 hover:brightness-110 disabled:opacity-60"
                >
                  {submitting ? "Signing in..." : "Sign in"}
                </button>
                <p className="text-[11px] text-slate-300">
                  Accessing{" "}
                  <span className="font-semibold">{theme.name}</span> customer ticket portal.
                </p>
              </form>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-3 py-6 sm:px-6 sm:py-8">
      <div className="max-w-5xl mx-auto space-y-5">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">
              Customer Tickets
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              {theme.name} Support Portal
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Raise new tickets and track the status of your existing requests.
            </p>
          </div>
          {/* Desktop profile entry – mirrors mobile/tablet profile icon behaviour */}
          <div className="hidden sm:flex items-center gap-2 sm:gap-3">
            <div className="relative">
              <button
                ref={notificationButtonRef}
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-9 h-9 rounded-full bg-slate-800 text-slate-100 border border-slate-600 grid place-items-center hover:bg-slate-700 relative transition"
                aria-label="Notifications"
              >
                <IoNotifications className="w-4 h-4 text-sky-300" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-500 text-[10px] font-semibold flex items-center justify-center text-white border border-slate-800 shadow-sm">
                    {notificationCount > 9 ? "9+" : notificationCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div data-notification-dropdown className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 max-h-[80vh] overflow-hidden flex flex-col">
                  <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-slate-400 hover:text-slate-600 text-lg leading-none"
                      aria-label="Close"
                    >
                      ×
                    </button>
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-slate-500 text-sm">
                        No notifications available
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className="p-4 hover:bg-slate-50 transition cursor-pointer"
                            onClick={async () => {
                              if (!notification.readAt) {
                                try {
                                  await fetchJson("/api/customer/notifications", {
                                    method: "POST",
                                    body: JSON.stringify({ id: notification.id, action: "read" }),
                                  });
                                  // Refresh notifications
                                  const notifData = await fetchJson<Array<{
                                    id: string;
                                    type: string;
                                    title: string;
                                    message: string;
                                    relatedId?: string;
                                    sentAt: string;
                                    readAt?: string;
                                  }>>("/api/customer/notifications");
                                  const validNotifications = Array.isArray(notifData) ? notifData : [];
                                  setNotifications(validNotifications);
                                  setNotificationCount(validNotifications.filter((n) => !n.readAt).length);
                                } catch {
                                  // Ignore errors
                                }
                              }
                              setShowNotifications(false);
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                                notification.type === "leave_approval" ? "bg-blue-500" :
                                notification.type === "payroll" ? "bg-green-500" :
                                notification.type === "document_update" ? "bg-purple-500" :
                                "bg-indigo-500"
                              }`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 line-clamp-1">
                                  {notification.title}
                                </p>
                                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                  {new Date(notification.sentAt).toLocaleString()}
                                </p>
                              </div>
                              {!notification.readAt && (
                                <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="relative">
              <button
                ref={profileButtonRef}
                type="button"
                onClick={() => {
                  if (profileButtonRef.current && typeof window !== "undefined") {
                    const rect = profileButtonRef.current.getBoundingClientRect();
                    setDropdownPosition({
                      top: rect.bottom + 8,
                      right: window.innerWidth - rect.right,
                    });
                  }
                  setActiveCustomerTab("profile");
                  setShowProfileSheet(true);
                }}
                className="w-9 h-9 rounded-full bg-slate-800 text-slate-100 border border-slate-600 grid place-items-center hover:bg-slate-700"
                aria-label="Open profile"
              >
                <FaUser className="w-4 h-4 text-sky-300" />
              </button>
            </div>
          </div>
        </header>

        <section className="grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 sm:gap-5 items-start min-h-0">
          <div
            className={`space-y-4 ${
              activeCustomerTab === "home" ? "block" : "hidden lg:block"
            }`}
          >
            <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm sm:text-base font-semibold text-white">
                    Create new ticket
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Describe your issue in detail so our team can assist you quickly.
                  </p>
                </div>
              </div>
              <form className="space-y-3" onSubmit={handleCreateTicket}>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-200">Subject</label>
                  <input
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-600 bg-slate-900/70 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                    placeholder="Short summary of your request"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-200">Description</label>
                  <textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    required
                    rows={4}
                    className="w-full rounded-lg border border-slate-600 bg-slate-900/70 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                    placeholder="Provide as much detail as possible, including any relevant references or asset information."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-200">Category (optional)</label>
                    <input
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full rounded-lg border border-slate-600 bg-slate-900/70 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                      placeholder="e.g. Hardware, Facility, IT Support"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-200">Priority</label>
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value as TicketPriority)}
                      className="w-full rounded-lg border border-slate-600 bg-slate-900/70 px-3 py-2 text-sm text-white"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-200">Attachments (optional)</label>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="w-full rounded-lg border border-slate-600 bg-slate-900/70 px-3 py-2 text-sm text-white file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-500/20 file:text-indigo-300 hover:file:bg-indigo-500/30 file:cursor-pointer cursor-pointer"
                    accept="image/*,.pdf,.doc,.docx,.txt"
                  />
                  {newAttachments.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {newAttachments.map((attachment, index) => {
                        const isImage = attachment.startsWith("data:image");
                        const fileName = isImage
                          ? `Image ${index + 1}`
                          : attachment.includes("data:application/pdf")
                          ? `Document ${index + 1}.pdf`
                          : `File ${index + 1}`;
                        return (
                          <div
                            key={index}
                            className="flex items-center justify-between gap-2 rounded-lg border border-slate-600 bg-slate-800/50 px-2 py-1.5"
                          >
                            <span className="text-xs text-slate-300 truncate flex-1">{fileName}</span>
                            <button
                              type="button"
                              onClick={() => removeAttachment(index)}
                              className="text-rose-400 hover:text-rose-300 text-xs"
                            >
                              Remove
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={creatingTicket}
                  className="w-full rounded-lg bg-gradient-to-r from-indigo-500 to-emerald-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/40 hover:brightness-110 disabled:opacity-60"
                >
                  {creatingTicket ? "Submitting ticket..." : "Submit ticket"}
                </button>
              </form>
            </div>
          </div>

          <div
            className={`space-y-3 ${
              activeCustomerTab === "tickets" ? "block" : "hidden lg:block"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm sm:text-base font-semibold text-white">Your tickets</h2>
              <div className="flex items-center gap-2 text-xs">
                <select
                  value={filterStatus}
                  onChange={(e) =>
                    setFilterStatus(e.target.value as TicketStatus | "all")
                  }
                  className="rounded-full border border-slate-600 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-100"
                >
                  <option value="all">All statuses</option>
                  <option value="New">New</option>
                  <option value="In Progress">In Progress</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-900/80 border border-slate-700 p-3 sm:p-4 space-y-3 overflow-hidden">
              {ticketsLoading ? (
                <p className="text-xs text-slate-300">Loading your tickets...</p>
              ) : tickets.length === 0 ? (
                <p className="text-xs text-slate-400">
                  You have not raised any tickets yet. Use the form on the left to submit your
                  first request.
                </p>
              ) : (
                <div className="space-y-2 max-h-[420px] overflow-y-auto overflow-x-hidden pr-1">
                  {tickets.map((t) => {
                    const created = new Date(t.createdAt);
                    const updated = new Date(t.updatedAt);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setActiveTicket(t)}
                        className={`w-full text-left rounded-xl border px-3 py-2.5 text-xs sm:text-sm transition ${
                          activeTicket?.id === t.id
                            ? "border-indigo-400 bg-indigo-950/60"
                            : "border-slate-700 bg-slate-900/60 hover:border-indigo-400/80 hover:bg-slate-800/80"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <p className="font-semibold text-slate-50 line-clamp-1">
                              {t.subject}
                            </p>
                            <p className="text-[11px] text-slate-400 line-clamp-2">
                              {t.description}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[t.status]}`}
                            >
                              {t.status}
                            </span>
                          </div>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500">
                          <span>
                            Created{" "}
                            {Number.isNaN(created.getTime())
                              ? "—"
                              : created.toLocaleString()}
                          </span>
                          <span>
                            Updated{" "}
                            {Number.isNaN(updated.getTime())
                              ? "—"
                              : updated.toLocaleString()}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {activeTicket && (
              <div className="rounded-2xl bg-slate-900/80 border border-slate-700 p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                      Ticket detail
                    </p>
                    <h3 className="text-sm sm:text-base font-semibold text-white">
                      {activeTicket.subject}
                    </h3>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${STATUS_BADGE[activeTicket.status]}`}
                  >
                    {activeTicket.status}
                  </span>
                </div>
                <p className="text-xs text-slate-200 whitespace-pre-line">
                  {activeTicket.description}
                </p>
                {activeTicket.attachments && activeTicket.attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Attachments</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {activeTicket.attachments.map((attachment, index) => {
                        const isImage = attachment.match(/\.(jpg|jpeg|png|gif|webp)$/i) || attachment.includes("image");
                        return (
                          <a
                            key={index}
                            href={attachment}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="relative group rounded-lg border border-slate-600 bg-slate-800/50 overflow-hidden hover:border-indigo-400 transition"
                          >
                            {isImage ? (
                              <img
                                src={attachment}
                                alt={`Attachment ${index + 1}`}
                                className="w-full h-24 object-cover"
                              />
                            ) : (
                              <div className="w-full h-24 flex items-center justify-center bg-slate-700/50">
                                <span className="text-xs text-slate-300">📄 File</span>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center">
                              <span className="text-xs text-white opacity-0 group-hover:opacity-100">View</span>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-1">
                  {activeTicket.category && (
                    <span className="inline-flex items-center rounded-full border border-slate-600 px-2 py-0.5">
                      Category: {activeTicket.category}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Advertisements Section */}
            {advertisements.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm sm:text-base font-semibold text-white">Advertisements</h2>
                <div className="space-y-3">
                  {advertisements.map((ad) => (
                    <div
                      key={ad.id}
                      className="rounded-2xl bg-slate-900/80 border border-slate-700 p-3 sm:p-4"
                    >
                      {ad.type === "image" && ad.imageUrl ? (
                        <div className="space-y-2">
                          <img
                            src={ad.imageUrl}
                            alt="Advertisement"
                            className="w-full rounded-lg object-contain max-h-96"
                          />
                        </div>
                      ) : ad.type === "message" && ad.message ? (
                        <div className="space-y-2">
                          <p className="text-xs sm:text-sm text-slate-200 whitespace-pre-line">
                            {ad.message}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Mobile bottom nav (app-like) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 lg:hidden">
        <div className="mx-auto max-w-5xl px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="rounded-3xl bg-slate-900/90 backdrop-blur-lg shadow-2xl border border-slate-700/80 flex items-center justify-between px-3 py-2">
            <button
              type="button"
              onClick={() => setShowMobileMenu(true)}
              className="flex flex-col items-center gap-1 flex-1 text-[11px] font-medium text-slate-200"
            >
              <span className="w-10 h-10 rounded-2xl grid place-items-center border border-slate-700 bg-slate-900">
                <RiMenu5Fill className="w-5 h-5 text-slate-100" />
              </span>
              Menu
            </button>
            <button
              type="button"
              onClick={() => setActiveCustomerTab("home")}
              className={`flex flex-col items-center gap-1 flex-1 text-[11px] font-medium ${
                activeCustomerTab === "home" ? "text-white" : "text-slate-200"
              }`}
            >
              <span
                className={`w-10 h-10 rounded-2xl grid place-items-center border ${
                  activeCustomerTab === "home"
                    ? "border-emerald-400 bg-emerald-500/20"
                    : "border-slate-700 bg-slate-900"
                }`}
              >
                <BiSolidHomeSmile className="w-5 h-5 text-emerald-300" />
              </span>
              Home
            </button>
            <div className="relative flex-1">
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className="flex flex-col items-center gap-1 w-full text-[11px] font-medium text-slate-200"
              >
                <span className="w-10 h-10 rounded-2xl grid place-items-center border border-slate-700 bg-slate-900 relative">
                  <IoNotifications className="w-5 h-5 text-sky-300" />
                  {notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-500 text-[10px] font-semibold flex items-center justify-center text-white border border-slate-900 shadow-sm">
                      {notificationCount > 9 ? "9+" : notificationCount}
                    </span>
                  )}
                </span>
                Notifications
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveCustomerTab("profile");
                setShowProfileSheet(true);
              }}
              className="flex flex-col items-center gap-1 flex-1 text-[11px] font-medium text-slate-200"
            >
              <span className="w-10 h-10 rounded-2xl grid place-items-center border border-slate-700 bg-slate-900">
                <FaUser className="w-5 h-5 text-sky-300" />
              </span>
              Profile
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu modal for quick navigation */}
      {showMobileMenu && (
        <div
          className="fixed inset-0 z-40 lg:hidden flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-3"
          onClick={() => setShowMobileMenu(false)}
        >
          <div
            className="w-full max-w-md bg-slate-900 rounded-3xl shadow-2xl border border-slate-700 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/80">
              <p className="text-sm font-semibold text-slate-50">Customer menu</p>
              <button
                type="button"
                onClick={() => setShowMobileMenu(false)}
                className="rounded-full bg-slate-800 text-slate-200 w-9 h-9 grid place-items-center"
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>
            <div className="divide-y divide-slate-800 text-sm">
              <button
                type="button"
                onClick={() => {
                  setActiveCustomerTab("home");
                  setShowMobileMenu(false);
                }}
                className={`w-full text-left px-4 py-4 flex items-center justify-between ${
                  activeCustomerTab === "home"
                    ? "bg-slate-800 text-emerald-300"
                    : "text-slate-100 hover:bg-slate-800/70"
                }`}
              >
                <span>Create ticket</span>
                {activeCustomerTab === "home" && (
                  <span className="text-[11px] px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-200">
                    Active
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveCustomerTab("tickets");
                  setShowMobileMenu(false);
                }}
                className={`w-full text-left px-4 py-4 flex items-center justify-between ${
                  activeCustomerTab === "tickets"
                    ? "bg-slate-800 text-indigo-300"
                    : "text-slate-100 hover:bg-slate-800/70"
                }`}
              >
                <span>Your tickets</span>
                {activeCustomerTab === "tickets" && (
                  <span className="text-[11px] px-2 py-1 rounded-full bg-indigo-500/20 text-indigo-200">
                    Active
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile sheet (used on mobile, tablet and desktop) */}
      {showProfileSheet && session && (
        <>
          {/* Mobile & tablet: bottom sheet */}
          <div
            className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setShowProfileSheet(false)}
          >
            <div
              className="w-full max-w-md bg-slate-900 rounded-t-3xl shadow-2xl border border-slate-700 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
            <div className="px-4 pt-3 pb-2 border-b border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                  Profile
                </p>
                <p className="text-sm font-semibold text-slate-50">
                  {session.username ?? session.email ?? "Customer"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowProfileSheet(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-200 grid place-items-center"
                aria-label="Close profile"
              >
                ✕
              </button>
            </div>
            <div className="px-4 py-3 space-y-3 text-sm text-slate-100">
              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  Name
                </p>
                <p className="font-medium">
                  {session.username ?? "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  Company
                </p>
                <p className="font-medium">
                  {BU_THEMES[session.businessUnit].name}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  Email
                </p>
                <p className="font-medium">
                  {session.email ?? "—"}
                </p>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (!session.email) {
                      toast.error("Email not available for this account");
                      return;
                    }
                    setResetSubmitting(true);
                    try {
                      await fetchJson("/api/auth/customer/reset-password", {
                        method: "POST",
                        body: JSON.stringify({
                          action: "request",
                          email: session.email,
                          businessUnit: session.businessUnit,
                        }),
                      });
                      setResetOtpRequested(true);
                      toast.success("OTP sent to your email");
                    } catch (error) {
                      toast.error((error as Error).message);
                    } finally {
                      setResetSubmitting(false);
                    }
                  }}
                  disabled={resetSubmitting || !session.email}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-800 text-slate-100 px-3 py-2 text-sm font-medium border border-slate-700 hover:bg-slate-700 disabled:opacity-60"
                >
                  <MdLockReset className="w-4 h-4" />
                  Reset password
                </button>
                {resetOtpRequested && (
                  <div className="space-y-2 border border-slate-800 rounded-2xl p-3 bg-slate-900/80">
                    <p className="text-[11px] text-slate-400">
                      Enter the 6-digit OTP sent to your registered email, then choose a new password.
                    </p>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={resetOtp}
                      onChange={(e) => setResetOtp(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500"
                      placeholder="Enter OTP"
                    />
                    <input
                      type="password"
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500"
                      placeholder="New password (min 8 characters)"
                    />
                    <button
                      type="button"
                      disabled={resetSubmitting}
                      onClick={async () => {
                        if (!resetOtp.trim() || !resetNewPassword.trim()) {
                          toast.error("Enter OTP and new password");
                          return;
                        }
                        if (resetNewPassword.length < 8) {
                          toast.error("Password must be at least 8 characters");
                          return;
                        }
                        if (!session.email) {
                          toast.error("Email not available for this account");
                          return;
                        }
                        setResetSubmitting(true);
                        try {
                          await fetchJson("/api/auth/customer/reset-password", {
                            method: "POST",
                            body: JSON.stringify({
                              action: "confirm",
                              email: session.email,
                              businessUnit: session.businessUnit,
                              otp: resetOtp.trim(),
                              newPassword: resetNewPassword.trim(),
                            }),
                          });
                          toast.success("Password updated. Please sign in again.");
                          setResetOtp("");
                          setResetNewPassword("");
                          setResetOtpRequested(false);
                          setShowProfileSheet(false);
                          await handleLogout();
                        } catch (error) {
                          toast.error((error as Error).message);
                        } finally {
                          setResetSubmitting(false);
                        }
                      }}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-white px-3 py-2 text-sm font-semibold hover:bg-emerald-400 disabled:opacity-60"
                    >
                      Update password
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={async () => {
                    await handleLogout();
                    setShowProfileSheet(false);
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 text-white px-3 py-2 text-sm font-semibold hover:bg-rose-500"
                >
                  <IoExit className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
          </div>

          {/* Desktop: dropdown positioned below profile button */}
          {dropdownPosition && (
            <div
              className="fixed inset-0 z-40 hidden lg:block"
              onClick={() => {
                setShowProfileSheet(false);
                setDropdownPosition(null);
              }}
            >
              <div
                className="absolute w-80 bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden"
                style={{
                  top: `${dropdownPosition.top}px`,
                  right: `${dropdownPosition.right}px`,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-4 pt-3 pb-2 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                      Profile
                    </p>
                    <p className="text-sm font-semibold text-slate-50">
                      {session.username ?? session.email ?? "Customer"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowProfileSheet(false)}
                    className="w-8 h-8 rounded-full bg-slate-800 text-slate-200 grid place-items-center"
                    aria-label="Close profile"
                  >
                    ✕
                  </button>
                </div>
                <div className="px-4 py-3 space-y-3 text-sm text-slate-100">
                  <div className="space-y-1">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                      Name
                    </p>
                    <p className="font-medium">
                      {session.username ?? "—"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                      Company
                    </p>
                    <p className="font-medium">
                      {BU_THEMES[session.businessUnit].name}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                      Email
                    </p>
                    <p className="font-medium">
                      {session.email ?? "—"}
                    </p>
                  </div>

                  <div className="pt-2 space-y-2">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!session.email) {
                          toast.error("Email not available for this account");
                          return;
                        }
                        setResetSubmitting(true);
                        try {
                          await fetchJson("/api/auth/customer/reset-password", {
                            method: "POST",
                            body: JSON.stringify({
                              action: "request",
                              email: session.email,
                              businessUnit: session.businessUnit,
                            }),
                          });
                          setResetOtpRequested(true);
                          toast.success("OTP sent to your email");
                        } catch (error) {
                          toast.error((error as Error).message);
                        } finally {
                          setResetSubmitting(false);
                        }
                      }}
                      disabled={resetSubmitting || !session.email}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-800 text-slate-100 px-3 py-2 text-sm font-medium border border-slate-700 hover:bg-slate-700 disabled:opacity-60"
                    >
                      <MdLockReset className="w-4 h-4" />
                      Reset password
                    </button>
                    {resetOtpRequested && (
                      <div className="space-y-2 border border-slate-800 rounded-2xl p-3 bg-slate-900/80">
                        <p className="text-[11px] text-slate-400">
                          Enter the 6-digit OTP sent to your registered email, then choose a new password.
                        </p>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={resetOtp}
                          onChange={(e) => setResetOtp(e.target.value)}
                          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500"
                          placeholder="Enter OTP"
                        />
                        <input
                          type="password"
                          value={resetNewPassword}
                          onChange={(e) => setResetNewPassword(e.target.value)}
                          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500"
                          placeholder="New password (min 8 characters)"
                        />
                        <button
                          type="button"
                          disabled={resetSubmitting}
                          onClick={async () => {
                            if (!resetOtp.trim() || !resetNewPassword.trim()) {
                              toast.error("Enter OTP and new password");
                              return;
                            }
                            if (resetNewPassword.length < 8) {
                              toast.error("Password must be at least 8 characters");
                              return;
                            }
                            if (!session.email) {
                              toast.error("Email not available for this account");
                              return;
                            }
                            setResetSubmitting(true);
                            try {
                              await fetchJson("/api/auth/customer/reset-password", {
                                method: "POST",
                                body: JSON.stringify({
                                  action: "confirm",
                                  email: session.email,
                                  businessUnit: session.businessUnit,
                                  otp: resetOtp.trim(),
                                  newPassword: resetNewPassword.trim(),
                                }),
                              });
                              toast.success("Password updated. Please sign in again.");
                              setResetOtp("");
                              setResetNewPassword("");
                              setResetOtpRequested(false);
                              setShowProfileSheet(false);
                              await handleLogout();
                            } catch (error) {
                              toast.error((error as Error).message);
                            } finally {
                              setResetSubmitting(false);
                            }
                          }}
                          className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-white px-3 py-2 text-sm font-medium border border-emerald-500 hover:bg-emerald-500 disabled:opacity-60"
                        >
                          Confirm reset & sign out
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={async () => {
                        await handleLogout();
                        setShowProfileSheet(false);
                      }}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 text-white px-3 py-2 text-sm font-medium border border-rose-500 hover:bg-rose-500"
                    >
                      <IoExit className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}

