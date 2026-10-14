import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AppShell } from "./app-shell";
import { logoutAction } from "@/actions/auth.action";

vi.mock("next/navigation", () => ({ usePathname: () => "/pos" }));
vi.mock("@/actions/auth.action", () => ({ logoutAction: vi.fn() }));
// Render the mobile drawer as well as the desktop sidebar.
vi.mock("react", async (importOriginal) => ({
  ...await importOriginal<typeof import("react")>(),
  useState: () => [true, vi.fn()]
}));

describe("logout controls", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(["OWNER", "STAFF"] as const)("uses explicit submit buttons for %s on desktop and mobile", (role) => {
    const html = renderToStaticMarkup(
      <AppShell currentUser={{ id: "test", username: "test", name: "Test", role }}>
        <p>Page content</p>
      </AppShell>
    );
    expect(html).not.toContain('href="/logout"');
    const forms = html.match(/<form\b[^>]*>[\s\S]*?<\/form>/g) ?? [];
    expect(forms).toHaveLength(2);
    for (const form of forms) {
      expect(form).toContain('type="submit"');
      expect(form).toContain("ອອກຈາກລະບົບ");
    }
    expect(logoutAction).not.toHaveBeenCalled();
  });
});
