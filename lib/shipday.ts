/**
 * Shipday — the delivery side of an order, behind admin → Shipday Delivery.
 *
 * Orders reach Shipday when one is accepted; Shipday then assigns a driver and
 * reports every step back to /webhooks/shipday. This module is the shared
 * vocabulary for that: the payload shape, the mapping into shipday_deliveries,
 * and the labels both the webhook and the screen read.
 *
 * The API key is a server secret, so the client half is server-only — the admin
 * screen talks to /api/admin/shipday and never sees the token.
 */

const BASE_URL = "https://api.shipday.com";

/* ── What Shipday sends ──────────────────────────────────────────────────── */

/** Every event Shipday fires. The spellings are theirs, typos included. */
export const SHIPDAY_EVENTS = [
  "ORDER_INSERTED",
  "ORDER_ASSIGNED",
  "ORDER_UNASSIGNED",
  "ORDER_ACCEPTED_AND_STARTED",
  "ORDER_ONTHEWAY",
  "ORDER_ONTHEWAY_REMOVED",
  /* Shipday's own spelling of "picked up" — matching it verbatim matters,
     because a corrected spelling would silently never match. */
  "ORDER_PIKEDUP",
  "ORDER_PIKEDUP_REMOVED",
  "ORDER_COMPLETED",
  "ORDER_FAILED",
  "ORDER_INCOMPLETE",
  "ORDER_POD_UPLOAD",
  "ORDER_DELETE",
] as const;

export type ShipdayEvent = (typeof SHIPDAY_EVENTS)[number];

/** Shipday's status for a delivery, as `order_status` on every payload. */
export type ShipdayStatus =
  | "NOT_ASSIGNED"
  | "NOT_ACCEPTED"
  | "NOT_STARTED_YET"
  | "STARTED"
  | "PICKED_UP"
  | "READY_TO_DELIVER"
  | "ALREADY_DELIVERED"
  | "INCOMPLETE"
  | "FAILED_DELIVERY";

export interface ShipdayCarrier {
  id?: number | null;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  status?: string | null;
  current_order?: number | null;
  plate_number?: string | null;
  vehicle_description?: string | null;
  /* The roster endpoint reports availability as a flag and the phone number
     under a longer name; the webhook uses `status` and `phone`. Both spellings
     are carried so one roster type covers either. */
  isOnShift?: boolean | null;
  phoneNumber?: string | null;
}

/** Whether a driver is available, whichever way Shipday said it. */
export function carrierIsOnline(carrier: ShipdayCarrier): boolean {
  if (typeof carrier.isOnShift === "boolean") return carrier.isOnShift;
  return (carrier.status ?? "").toUpperCase() === "ONLINE";
}

/** One end of the journey. `location` is where the coordinates live, not the top level. */
export interface ShipdayPlace {
  id?: number | null;
  name?: string | null;
  address?: string | null;
  formatted_address?: string | null;
  phone?: string | null;
  email?: string | null;
  location?: { lat?: number | null; lng?: number | null } | null;
  [key: string]: unknown;
}

/**
 * Set when the delivery was handed to a third-party fleet (DoorDash and the
 * like) rather than one of the company's own drivers.
 *
 * The person actually carrying the order is named here, not in `carrier` — so
 * a board that reads only `carrier` shows "no driver yet" for the whole of a
 * third-party delivery.
 */
export interface ShipdayThirdParty {
  orderId?: number | null;
  thirdPartyName?: string | null;
  referenceId?: string | null;
  status?: string | null;
  thirdPartyFee?: number | null;
  driverName?: string | null;
  driverPhone?: string | null;
}

export interface ShipdayOrder {
  id: number | string;
  order_number?: string | null;
  provider?: string | null;
  order_item?: string | null;
  delivery_note?: string | null;
  order_source?: string | null;
  auto_assignment_status?: string | null;
  payment_method?: string | null;
  total_cost?: number | null;
  delivery_fee?: number | null;
  predefined_tip?: number | null;
  cash_tip?: number | null;
  discount_amount?: number | null;
  tax?: number | null;
  podUrls?: string[] | null;
  driving_duration?: number | null;
  driving_distance?: number | null;
  /* Documented as a millisecond timestamp, but the sample payload sends "" for
     an order that has none — so it arrives as either. */
  eta?: number | string | null;
  /* Epoch milliseconds, every one of them. */
  placement_time?: number | null;
  expected_pickup_time?: number | null;
  expected_delivery_time?: number | null;
  assigned_time?: number | null;
  start_time?: number | null;
  pickedup_time?: number | null;
  arrived_time?: number | null;
  delivery_time?: number | null;
}

export interface ShipdayWebhookPayload {
  timestamp?: number | null;
  event?: string | null;
  order_status?: string | null;
  order?: ShipdayOrder | null;
  carrier?: ShipdayCarrier | null;
  company?: Record<string, unknown> | null;
  delivery_details?: ShipdayPlace | null;
  pickup_details?: ShipdayPlace | null;
  thirdPartyDeliveryOrder?: ShipdayThirdParty | null;
}

/* ── The row it becomes ──────────────────────────────────────────────────── */

export interface ShipdayDeliveryRow {
  id: string;
  order_number: string;
  provider: string;
  order_source: string;
  last_event: string;
  order_status: string;
  auto_assignment_status: string;
  event_at: string | null;
  carrier_id: number | null;
  carrier_name: string;
  carrier_phone: string;
  carrier_email: string;
  carrier_status: string;
  carrier_plate_number: string;
  carrier_vehicle: string;
  /** The outside fleet carrying it, when it is not one of our own drivers. */
  third_party_name: string;
  total_cost: number;
  delivery_fee: number;
  tip: number;
  discount_amount: number;
  tax: number;
  payment_method: string;
  delivery_details: unknown;
  pickup_details: unknown;
  delivery_note: string;
  driving_distance: number;
  driving_duration: number;
  eta: string | null;
  placement_time: string | null;
  expected_pickup_time: string | null;
  expected_delivery_time: string | null;
  assigned_time: string | null;
  start_time: string | null;
  pickedup_time: string | null;
  arrived_time: string | null;
  delivery_time: string | null;
  pod_urls: unknown;
  raw: unknown;
  updated_at: string;
}

const str = (value: unknown): string => (typeof value === "string" ? value : "");
const num = (value: unknown): number => (typeof value === "number" && Number.isFinite(value) ? value : 0);

/**
 * Shipday's epoch milliseconds as an ISO string.
 *
 * A milestone that has not happened yet comes through as 0, null or absent, and
 * all three have to end up null — `new Date(0)` is 1970, which would render as a
 * delivery completed fifty-odd years ago rather than one still in progress.
 */
function at(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Shipday reports a tip in two places depending on how it was paid. */
function tipOf(order: ShipdayOrder): number {
  return num(order.predefined_tip) + num(order.cash_tip);
}

/**
 * The ETA, which is a millisecond timestamp despite arriving as either type.
 *
 * Reading it as a plain string — as the empty one in Shipday's own sample
 * invites — turns a real ETA into the digits of an epoch, so it is parsed as a
 * time or dropped. Anything non-numeric is dropped rather than kept as text:
 * a column of stray strings is worse than an empty one.
 */
function etaOf(value: unknown): string | null {
  if (typeof value === "number") return at(value);
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return at(Number(value.trim()));
  return null;
}

export function toDeliveryRow(payload: ShipdayWebhookPayload): ShipdayDeliveryRow | null {
  const order = payload.order;
  if (!order || (typeof order.id !== "string" && typeof order.id !== "number")) return null;

  const carrier = payload.carrier ?? null;
  const third = payload.thirdPartyDeliveryOrder ?? null;

  return {
    id: String(order.id),
    order_number: str(order.order_number),
    provider: str(order.provider),
    order_source: str(order.order_source),
    last_event: str(payload.event),
    order_status: str(payload.order_status) || "NOT_ASSIGNED",
    auto_assignment_status: str(order.auto_assignment_status),
    /* Shipday's own clock for the event, falling back to when it was placed —
       never to now(), which would make a replayed delivery look current. */
    event_at: at(payload.timestamp) ?? at(order.placement_time),

    carrier_id: typeof carrier?.id === "number" ? carrier.id : null,
    /* A third-party delivery names its rider under thirdPartyDeliveryOrder and
       leaves `carrier` empty, so the fleet's driver stands in — otherwise the
       board reads "no driver yet" for a delivery already on its way. */
    carrier_name: str(carrier?.name) || str(third?.driverName),
    carrier_phone: str(carrier?.phone) || str(third?.driverPhone),
    carrier_email: str(carrier?.email),
    carrier_status: str(carrier?.status),
    carrier_plate_number: str(carrier?.plate_number),
    carrier_vehicle: str(carrier?.vehicle_description),
    third_party_name: str(third?.thirdPartyName),

    total_cost: num(order.total_cost),
    delivery_fee: num(order.delivery_fee),
    tip: tipOf(order),
    discount_amount: num(order.discount_amount),
    tax: num(order.tax),
    payment_method: str(order.payment_method),

    delivery_details: payload.delivery_details ?? {},
    pickup_details: payload.pickup_details ?? {},
    delivery_note: str(order.delivery_note),

    driving_distance: Math.trunc(num(order.driving_distance)),
    driving_duration: Math.trunc(num(order.driving_duration)),
    eta: etaOf(order.eta),

    placement_time: at(order.placement_time),
    expected_pickup_time: at(order.expected_pickup_time),
    expected_delivery_time: at(order.expected_delivery_time),
    assigned_time: at(order.assigned_time),
    start_time: at(order.start_time),
    pickedup_time: at(order.pickedup_time),
    arrived_time: at(order.arrived_time),
    delivery_time: at(order.delivery_time),

    pod_urls: Array.isArray(order.podUrls) ? order.podUrls : [],
    raw: payload,
    updated_at: new Date().toISOString(),
  };
}

/* ── How a status reads on screen ────────────────────────────────────────── */

export interface StatusLook {
  label: string;
  /** Tailwind classes for the chip, matching the Live Orders board. */
  chip: string;
  /** Where in the journey this sits, for the progress rail. 0–4, -1 when it went wrong. */
  step: number;
}

export const STATUS_LOOK: Record<string, StatusLook> = {
  NOT_ASSIGNED:      { label: "Unassigned",    chip: "bg-gray-100 text-gray-700",     step: 0 },
  NOT_ACCEPTED:      { label: "Not accepted",  chip: "bg-amber-100 text-amber-700",   step: 1 },
  NOT_STARTED_YET:   { label: "Not started",   chip: "bg-amber-100 text-amber-700",   step: 1 },
  STARTED:           { label: "On the way",    chip: "bg-blue-100 text-blue-700",     step: 2 },
  PICKED_UP:         { label: "Picked up",     chip: "bg-indigo-100 text-indigo-700", step: 3 },
  READY_TO_DELIVER:  { label: "Out for drop",  chip: "bg-indigo-100 text-indigo-700", step: 3 },
  ALREADY_DELIVERED: { label: "Delivered",     chip: "bg-green-100 text-green-700",   step: 4 },
  INCOMPLETE:        { label: "Incomplete",    chip: "bg-orange-100 text-orange-700", step: -1 },
  FAILED_DELIVERY:   { label: "Failed",        chip: "bg-red-100 text-red-700",       step: -1 },
};

export function statusLook(status: string): StatusLook {
  return (
    STATUS_LOOK[status] ?? {
      label: status ? status.replace(/_/g, " ").toLowerCase() : "Unknown",
      chip: "bg-gray-100 text-gray-700",
      step: 0,
    }
  );
}

/** An event name as a person would say it. */
export function eventLabel(event: string): string {
  const spoken: Record<string, string> = {
    ORDER_INSERTED: "Sent to Shipday",
    ORDER_ASSIGNED: "Driver assigned",
    ORDER_UNASSIGNED: "Driver unassigned",
    ORDER_ACCEPTED_AND_STARTED: "Driver started",
    ORDER_ONTHEWAY: "On the way",
    ORDER_ONTHEWAY_REMOVED: "On the way undone",
    ORDER_PIKEDUP: "Picked up",
    ORDER_PIKEDUP_REMOVED: "Pickup undone",
    ORDER_COMPLETED: "Delivered",
    ORDER_FAILED: "Delivery failed",
    ORDER_INCOMPLETE: "Delivery incomplete",
    ORDER_POD_UPLOAD: "Proof uploaded",
    ORDER_DELETE: "Deleted in Shipday",
  };
  return spoken[event] ?? (event ? event.replace(/_/g, " ").toLowerCase() : "Update");
}

/**
 * Whether an event should overwrite what is already stored.
 *
 * Webhook deliveries are not ordered, and a retried ORDER_ASSIGNED landing after
 * ORDER_COMPLETED would walk a finished delivery back to "unassigned". Anything
 * at least as new as the stored event wins; an older one is acknowledged and
 * dropped. A row with no timestamp either side is always overwritten, since
 * there is nothing to compare and the newer delivery is the better guess.
 */
export function supersedes(incoming: string | null, stored: string | null | undefined): boolean {
  if (!stored) return true;
  if (!incoming) return false;
  return new Date(incoming).getTime() >= new Date(stored).getTime();
}

/* ── Reading back from Shipday ───────────────────────────────────────────── */

export class ShipdayError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ShipdayError";
  }
}

export function apiKey(): string {
  return (process.env.SHIPDAY_API_KEY ?? "").trim();
}

export function webhookToken(): string {
  return (process.env.SHIPDAY_WEBHOOK_TOKEN ?? "").trim();
}

/**
 * A GET against the Shipday API.
 *
 * Shipday's "Basic" is not HTTP Basic — the key goes in the header raw, not
 * base64 of `user:pass` — so it is written out literally here rather than
 * through any helper that would encode it.
 *
 * This is only ever a supplement: the webhook is what keeps the board current,
 * and every screen works with the key absent. That is deliberate, because a key
 * that stops authenticating should cost a refresh button, not the section.
 */
async function request<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const key = apiKey();
  if (!key) {
    throw new ShipdayError(500, "No Shipday API key is set. Add SHIPDAY_API_KEY to the hosting environment.");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: init?.method ?? "GET",
      headers: {
        Authorization: `Basic ${key}`,
        Accept: "application/json",
        ...(init?.body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(init?.body === undefined ? {} : { body: JSON.stringify(init.body) }),
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    throw new ShipdayError(504, aborted ? "Shipday did not respond in time." : "Could not reach Shipday.");
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    /* Shipday answers an unusable key with a bodyless 403, so there is nothing
       to quote back — say what it means instead of printing an empty string. */
    const message =
      res.status === 401 || res.status === 403
        ? "Shipday rejected the API key. Check SHIPDAY_API_KEY against Dispatch → Settings → API."
        : `Shipday returned ${res.status}.`;
    throw new ShipdayError(res.status, message);
  }

  /* A 204, or a body that is not JSON, is not a failure worth throwing over —
     the callers here all tolerate an empty result. */
  return (await res.json().catch(() => null)) as T;
}

const get = <T>(path: string) => request<T>(path);
const post = <T>(path: string, body: unknown) => request<T>(path, { method: "POST", body });

/* ── Backfilling from the API ────────────────────────────────────────────────
   The order list is a different shape from the webhook: camelCase, ISO strings
   instead of epoch milliseconds, and the two addresses under `pickup`/
   `delivery` rather than `*_details`. It is mapped to the same row so a
   backfilled delivery is indistinguishable from a webhook-written one. */

export interface ShipdayApiPlace {
  id?: number | null;
  name?: string | null;
  address?: string | null;
  formattedAddress?: string | null;
  phone?: string | null;
  email?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export interface ShipdayApiOrder {
  orderId?: number | null;
  orderNumber?: string | null;
  status?: string | null;
  orderSource?: string | null;
  deliveryNote?: string | null;
  paymentMethod?: string | null;
  orderTotal?: number | null;
  deliveryFee?: number | null;
  tip?: number | null;
  discount?: number | null;
  tax?: number | null;
  distance?: number | null;
  placementTime?: string | null;
  requestedPickupTime?: string | null;
  requestedDeliveryTime?: string | null;
  assignedTime?: string | null;
  startTime?: string | null;
  pickedupTime?: string | null;
  arrivedTime?: string | null;
  deliveryTime?: string | null;
  carrier?: {
    id?: number | null;
    name?: string | null;
    phone?: string | null;
    email?: string | null;
    status?: string | null;
    vehiclePlateNumber?: string | null;
    vehicleDescription?: string | null;
  } | null;
  pickup?: ShipdayApiPlace | null;
  delivery?: ShipdayApiPlace | null;
}

/** An ISO string Shipday sent, or null when it is absent or unparseable. */
function iso(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * The API's address block in the webhook's shape.
 *
 * Renaming here rather than at the screen means one address shape reaches the
 * UI, so a backfilled row and a webhook row render through the same code.
 */
function placeFromApi(place: ShipdayApiPlace | null | undefined): ShipdayPlace {
  if (!place) return {};
  return {
    id: place.id ?? null,
    name: place.name ?? null,
    address: place.address ?? null,
    formatted_address: place.formattedAddress ?? null,
    phone: place.phone ?? null,
    email: place.email ?? null,
    location: { lat: place.lat ?? null, lng: place.lng ?? null },
  };
}

/** Marks a row the API filled in, so the board can tell it from a live event. */
export const BACKFILL_EVENT = "API_BACKFILL";

export function fromApiOrder(order: ShipdayApiOrder): ShipdayDeliveryRow | null {
  if (typeof order?.orderId !== "number") return null;

  const carrier = order.carrier ?? null;
  const times = [
    iso(order.deliveryTime), iso(order.arrivedTime), iso(order.pickedupTime),
    iso(order.startTime), iso(order.assignedTime), iso(order.placementTime),
  ].filter(Boolean) as string[];

  return {
    id: String(order.orderId),
    order_number: str(order.orderNumber),
    provider: "",
    order_source: str(order.orderSource),
    last_event: BACKFILL_EVENT,
    order_status: str(order.status) || "NOT_ASSIGNED",
    auto_assignment_status: "",
    /* The latest thing that has happened to it, so a backfill never looks newer
       than a webhook that already reported a later step. */
    event_at: times.length > 0 ? times.sort().at(-1)! : null,

    carrier_id: typeof carrier?.id === "number" ? carrier.id : null,
    carrier_name: str(carrier?.name),
    carrier_phone: str(carrier?.phone),
    carrier_email: str(carrier?.email),
    carrier_status: str(carrier?.status),
    carrier_plate_number: str(carrier?.vehiclePlateNumber),
    carrier_vehicle: str(carrier?.vehicleDescription),
    third_party_name: "",

    total_cost: num(order.orderTotal),
    delivery_fee: num(order.deliveryFee),
    tip: num(order.tip),
    discount_amount: num(order.discount),
    tax: num(order.tax),
    payment_method: str(order.paymentMethod),

    delivery_details: placeFromApi(order.delivery),
    pickup_details: placeFromApi(order.pickup),
    delivery_note: str(order.deliveryNote),

    driving_distance: Math.trunc(num(order.distance)),
    driving_duration: 0,
    eta: null,

    placement_time: iso(order.placementTime),
    expected_pickup_time: iso(order.requestedPickupTime),
    expected_delivery_time: iso(order.requestedDeliveryTime),
    assigned_time: iso(order.assignedTime),
    start_time: iso(order.startTime),
    pickedup_time: iso(order.pickedupTime),
    arrived_time: iso(order.arrivedTime),
    delivery_time: iso(order.deliveryTime),

    pod_urls: [],
    raw: order,
    updated_at: new Date().toISOString(),
  };
}

/**
 * The orders Shipday currently holds.
 *
 * A POST despite being a read — that is how Shipday spells this endpoint, and
 * the filters travel in the body. An empty body asks for the default window.
 */
export async function queryOrders(body: Record<string, unknown> = {}): Promise<ShipdayApiOrder[]> {
  const result = await post<unknown>("/orders/query", body);
  return Array.isArray(result) ? (result as ShipdayApiOrder[]) : [];
}

/* ── Active orders ───────────────────────────────────────────────────────────
   GET /orders is a third shape again: the two ends are `restaurant` and
   `customer` rather than `pickup`/`delivery`, the driver is `assignedCarrier`,
   the status is `orderState`, and pickup time gains a capital U. It returns
   only what is still in flight, which is exactly what a board of ongoing
   deliveries wants. */

interface ActivePlace {
  id?: number | null;
  name?: string | null;
  address?: string | null;
  phoneNumber?: string | null;
  emailAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface ShipdayActiveOrder {
  orderId?: number | null;
  orderNumber?: string | null;
  orderState?: string | null;
  status?: string | null;
  paymentMethod?: string | null;
  deliveryInstruction?: string | null;
  distance?: number | null;
  etaTime?: string | number | null;
  totalCost?: number | null;
  deliveryFee?: number | null;
  tip?: number | null;
  cashTip?: number | null;
  discountAmount?: number | null;
  tax?: number | null;
  placementTime?: string | null;
  expectedPickupTime?: string | null;
  expectedDeliveryTime?: string | null;
  assignedTime?: string | null;
  startTime?: string | null;
  /* Shipday's own casing differs between endpoints; both are read. */
  pickedUpTime?: string | null;
  pickedupTime?: string | null;
  arrivedTime?: string | null;
  deliveryTime?: string | null;
  assignedCarrier?: (ShipdayCarrier & { carrierPhoto?: string | null }) | null;
  restaurant?: ActivePlace | null;
  customer?: ActivePlace | null;
}

function placeFromActive(place: ActivePlace | null | undefined): ShipdayPlace {
  if (!place) return {};
  return {
    id: place.id ?? null,
    name: place.name ?? null,
    address: place.address ?? null,
    formatted_address: place.address ?? null,
    phone: place.phoneNumber ?? null,
    email: place.emailAddress ?? null,
    location: { lat: place.latitude ?? null, lng: place.longitude ?? null },
  };
}

export function fromActiveOrder(order: ShipdayActiveOrder): ShipdayDeliveryRow | null {
  if (typeof order?.orderId !== "number") return null;

  const carrier = order.assignedCarrier ?? null;
  const pickedUp = iso(order.pickedUpTime) ?? iso(order.pickedupTime);
  const times = [
    iso(order.deliveryTime), iso(order.arrivedTime), pickedUp,
    iso(order.startTime), iso(order.assignedTime), iso(order.placementTime),
  ].filter(Boolean) as string[];

  return {
    id: String(order.orderId),
    order_number: str(order.orderNumber),
    provider: "",
    order_source: "",
    last_event: BACKFILL_EVENT,
    order_status: str(order.orderState) || str(order.status) || "NOT_ASSIGNED",
    auto_assignment_status: "",
    event_at: times.length > 0 ? times.sort().at(-1)! : null,

    carrier_id: typeof carrier?.id === "number" ? carrier.id : null,
    carrier_name: str(carrier?.name),
    carrier_phone: str(carrier?.phoneNumber) || str(carrier?.phone),
    carrier_email: str(carrier?.email),
    carrier_status: carrier ? (carrierIsOnline(carrier) ? "ONLINE" : "OFFLINE") : "",
    carrier_plate_number: "",
    carrier_vehicle: "",
    third_party_name: "",

    total_cost: num(order.totalCost),
    delivery_fee: num(order.deliveryFee),
    tip: num(order.tip) + num(order.cashTip),
    discount_amount: num(order.discountAmount),
    tax: num(order.tax),
    payment_method: str(order.paymentMethod),

    delivery_details: placeFromActive(order.customer),
    pickup_details: placeFromActive(order.restaurant),
    delivery_note: str(order.deliveryInstruction),

    driving_distance: Math.trunc(num(order.distance)),
    driving_duration: 0,
    /* etaTime is documented loosely enough to arrive either way, so it goes
       through both readers rather than being assumed. */
    eta: iso(order.etaTime) ?? etaOf(order.etaTime),

    placement_time: iso(order.placementTime),
    expected_pickup_time: iso(order.expectedPickupTime),
    expected_delivery_time: iso(order.expectedDeliveryTime),
    assigned_time: iso(order.assignedTime),
    start_time: iso(order.startTime),
    pickedup_time: pickedUp,
    arrived_time: iso(order.arrivedTime),
    delivery_time: iso(order.deliveryTime),

    pod_urls: [],
    raw: order,
    updated_at: new Date().toISOString(),
  };
}

/** The orders still in flight. */
export async function fetchActiveOrders(): Promise<ShipdayActiveOrder[]> {
  const result = await get<unknown>("/orders");
  return Array.isArray(result) ? (result as ShipdayActiveOrder[]) : [];
}

/** The drivers on the account, for the roster panel. */
export function fetchCarriers(): Promise<ShipdayCarrier[]> {
  return get<ShipdayCarrier[]>("/carriers");
}
