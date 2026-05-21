export function resolvePublicAssetUrl(value: string | null | undefined, origin: string) {
  if (!value) {
    return "";
  }

  if (/^(https?:|data:|blob:)/.test(value)) {
    return value;
  }

  if (value.startsWith("/")) {
    return `${origin}${value}`;
  }

  return value;
}
