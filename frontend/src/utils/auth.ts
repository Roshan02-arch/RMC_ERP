export const normalizeRole = (value: unknown): string => {
  const raw = String(value ?? "").trim().toUpperCase();

  if (raw === "USER" || raw === "ROLE_USER" || raw === "ROLE_CUSTOMER") {
    return "CUSTOMER";
  }

  if (raw === "ROLE_ADMIN") {
    return "ADMIN";
  }

  return raw;
};
