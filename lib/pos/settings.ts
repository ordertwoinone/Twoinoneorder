/** How the till is configured. Client-safe: no database, no secrets. */
export interface PosSettings {
  order_prefix: string;
  delivery_charge: number;
  free_delivery_over: number;
  max_cashier_discount_percent: number;
  manager_expense_over: number;
  expected_float: number;
  whatsapp_report_to: string;
  whatsapp_report_label: string;
  whatsapp_auto_send: boolean;
}

export const DEFAULT_POS_SETTINGS: PosSettings = {
  order_prefix: "ORD",
  delivery_charge: 10,
  free_delivery_over: 0,
  max_cashier_discount_percent: 10,
  manager_expense_over: 500,
  expected_float: 0,
  whatsapp_report_to: "",
  whatsapp_report_label: "Management",
  whatsapp_auto_send: false,
};
