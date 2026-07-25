/* @vitest-environment jsdom */

import { afterEach, describe, expect, it } from "vitest";
import { i18n } from "../../i18n/index.ts";
import type { DashboardHeader } from "./dashboard-header.ts";
import "./dashboard-header.ts";

describe("dashboard-header", () => {
  afterEach(async () => {
    document.body.replaceChildren();
    await i18n.setLocale("en");
  });

  it("rerenders its breadcrumb when the active locale changes", async () => {
    await i18n.setLocale("en");
    const header = document.createElement("dashboard-header") as DashboardHeader;
    header.tab = "chat";
    document.body.append(header);
    await header.updateComplete;

    expect(header.querySelector(".dashboard-header__breadcrumb-current")?.textContent).toBe("Chat");

    await i18n.setLocale("zh-CN");
    await header.updateComplete;

    expect(header.querySelector(".dashboard-header__breadcrumb-current")?.textContent).toBe("聊天");
  });
});
