import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { ENQUIRY_LIMITS, SERVICE_OPTIONS } from "@/constants/services.constants";

// Public /services enquiry form -> Site_Service_Enquiries. Server-only: only
// imported from api.services.enquiry.ts. The table has RLS on with no
// policies, so supabaseAdmin (service role) is the only reader/writer.
// Same supabaseAdmin cast as the Hangar persistence files, since the
// generated types.ts doesn't know this table.

// Mission Hub -> Business -> Service Requests reads and updates the same
// table through api.mission-hub.service-enquiries.ts, admins only.

type DbResult<T> = Promise<{ data: T; error: { message: string } | null }>;

const TABLE = "Site_Service_Enquiries";

const db = supabaseAdmin as unknown as {
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => DbResult<null>;
  };
};

// Loose handle for the chained list query (select/or/eq/gte/lte/order/range).
const dbAny = supabaseAdmin as unknown as { from: (table: string) => any };

export class InvalidEnquiryError extends Error {}
export class ForbiddenError extends Error {}

export type ServiceEnquiry = {
  name: string;
  organisation: string;
  email: string;
  service: string;
  message: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Returns null when the honeypot field was filled in (a bot): the caller
// answers 200 so the bot sees a normal success, but nothing is stored.
export function validateEnquiry(body: Record<string, unknown>): ServiceEnquiry | null {
  if (String(body.website ?? "").trim() !== "") return null;

  const field = (key: keyof ServiceEnquiry) => String(body[key] ?? "").trim();
  const enquiry: ServiceEnquiry = {
    name: field("name"),
    organisation: field("organisation"),
    email: field("email"),
    service: field("service"),
    message: field("message"),
  };

  if (!enquiry.name) throw new InvalidEnquiryError("Please enter your name.");
  if (!enquiry.organisation) throw new InvalidEnquiryError("Please enter your organisation.");
  if (!enquiry.email) throw new InvalidEnquiryError("Please enter your work email.");
  if (!enquiry.message) throw new InvalidEnquiryError("Please describe your vehicle and what you need to know.");
  if (!EMAIL_RE.test(enquiry.email)) throw new InvalidEnquiryError("Please enter a valid email address.");
  if (!SERVICE_OPTIONS.includes(enquiry.service)) throw new InvalidEnquiryError("Please choose a service.");
  if (enquiry.name.length > ENQUIRY_LIMITS.name) throw new InvalidEnquiryError(`Name must be ${ENQUIRY_LIMITS.name} characters or fewer.`);
  if (enquiry.organisation.length > ENQUIRY_LIMITS.organisation) throw new InvalidEnquiryError(`Organisation must be ${ENQUIRY_LIMITS.organisation} characters or fewer.`);
  if (enquiry.email.length > ENQUIRY_LIMITS.email) throw new InvalidEnquiryError("Email address is too long.");
  if (enquiry.message.length > ENQUIRY_LIMITS.message) throw new InvalidEnquiryError(`Message must be ${ENQUIRY_LIMITS.message} characters or fewer.`);

  return enquiry;
}

export async function insertEnquiry(enquiry: ServiceEnquiry): Promise<void> {
  const { error } = await db.from(TABLE).insert({ ...enquiry });
  if (error) throw new Error(`Failed to save enquiry: ${error.message}`);
}

// ── Mission Hub (admins only) ──

export const ENQUIRY_STATUSES = ["new", "replied", "quoted", "in_progress", "closed"] as const;

// Same check as Mission Hub's own server functions (mission_hub_users.role/status).
export async function assertMissionHubAdmin(userId: string): Promise<void> {
  const { data, error } = await dbAny.from("mission_hub_users").select("role, status").eq("id", userId).limit(1);
  const caller = data?.[0];
  if (error || !caller || caller.status !== "active" || (caller.role !== "admin" && caller.role !== "super_admin")) {
    throw new ForbiddenError("Only Mission Hub admins can view service requests.");
  }
}

export type EnquiryListQuery = {
  search?: string;
  status?: string;
  service?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  all?: boolean;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function listEnquiries(q: EnquiryListQuery): Promise<{ rows: Record<string, unknown>[]; count: number }> {
  let query = dbAny.from(TABLE).select("*", { count: "exact" }).order("created_at", { ascending: false });
  // Strip PostgREST filter syntax characters so the search text can't change the filter.
  const search = (q.search ?? "").replace(/[,()%*\\]/g, " ").trim().slice(0, 100);
  if (search) {
    query = query.or(["name", "organisation", "email"].map((f) => `${f}.ilike.%${search}%`).join(","));
  }
  if (q.status) query = query.eq("status", q.status);
  if (q.service) query = query.eq("service", q.service);
  if (q.dateFrom && DATE_RE.test(q.dateFrom)) query = query.gte("created_at", q.dateFrom);
  if (q.dateTo && DATE_RE.test(q.dateTo)) query = query.lte("created_at", `${q.dateTo}T23:59:59`);
  if (!q.all) {
    const size = Math.min(Math.max(q.pageSize ?? 20, 1), 100);
    const page = Math.max(q.page ?? 0, 0);
    query = query.range(page * size, page * size + size - 1);
  }
  const { data, count, error } = await query;
  if (error) throw new Error(`Failed to load service requests: ${error.message}`);
  return { rows: data ?? [], count: count ?? 0 };
}

export async function updateEnquiryStatus(id: string, status: string): Promise<void> {
  if (!(ENQUIRY_STATUSES as readonly string[]).includes(status)) throw new InvalidEnquiryError("Unknown status.");
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new InvalidEnquiryError("Unknown request.");
  const { error } = await dbAny.from(TABLE).update({ status }).eq("id", id);
  if (error) throw new Error(`Failed to update status: ${error.message}`);
}
