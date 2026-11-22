export type Platform = "github" | "linkedin";

export function profileHandle(platform: Platform, input: string): string | null {
  let value = input.trim();
  if (!value) return null;
  if (value.includes("/")) {
    const url = new URL(value.includes("://") ? value : "https://" + value);
    const host = platform === "github" ? /^(www\.)?github\.com$/ : /^([a-z]{2}\.|www\.)?linkedin\.com$/;
    if (!host.test(url.hostname) || url.username || url.password || url.port || !["https:", "http:"].includes(url.protocol)) throw Error();
    const path = url.pathname.match(platform === "github" ? /^\/([^/]+)\/?$/ : /^\/in\/([^/]+)\/?$/);
    if (!path) throw Error();
    value = decodeURIComponent(path[1]);
  } else value = value.replace(/^@/, "");
  const valid = platform === "github" ? /^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$/i : /^[\p{L}\p{N}_-]{1,100}$/u;
  if (!valid.test(value)) throw Error();
  return value;
}

export function profileUrl(platform: Platform, handle: string) {
  return (platform === "github" ? "https://github.com/" : "https://www.linkedin.com/in/") + encodeURIComponent(handle);
}
