// Single source of truth for the app's public base URL.
//
// NEXTAUTH_URL is set by hand in Dokploy and has carried a trailing slash, which
// leaked into every link we build by concatenation ("…cl//admin/campanas/x",
// "…cl//email/x") — ugly in customer-facing emails and easy to reintroduce.
// Normalize once here instead of at each call site, and always join with a
// leading-slash path.
const RAW_BASE_URL = process.env.NEXTAUTH_URL ?? "https://correo.grillo.click";

export const BASE_URL = RAW_BASE_URL.trim().replace(/\/+$/, "");
