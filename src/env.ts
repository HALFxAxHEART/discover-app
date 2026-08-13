function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var ${name}`);
  return value;
}

export const env = {
  suwayomiUrl: required("SUWAYOMI_URL").replace(/\/$/, ""),
  suwayomiUsername: required("SUWAYOMI_USERNAME"),
  suwayomiPassword: required("SUWAYOMI_PASSWORD"),
  kavitaUrl: required("KAVITA_URL").replace(/\/$/, ""),
  kavitaUsername: required("KAVITA_USERNAME"),
  kavitaPassword: required("KAVITA_PASSWORD"),
  port: Number(process.env.PORT ?? "3100"),
};
