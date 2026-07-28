import { describe, expect, it } from "vitest";
import { normalizeInitialApplicationLocation } from "./bootstrap.ts";

describe("normalizeInitialApplicationLocation", () => {
  it("opens the task-first workspace from the application root", () => {
    expect(
      normalizeInitialApplicationLocation(
        { pathname: "/", search: "", hash: "" },
        "",
        "agent:main:main",
      ),
    ).toEqual({ pathname: "/new", search: "", hash: "" });
  });

  it("opens the mounted task-first workspace from a base path root", () => {
    expect(
      normalizeInitialApplicationLocation(
        { pathname: "/openclaw/", search: "", hash: "" },
        "/openclaw",
        "agent:main:main",
      ),
    ).toEqual({ pathname: "/openclaw/new", search: "", hash: "" });
  });

  it("keeps explicit session deep links on chat", () => {
    const location = { pathname: "/", search: "?session=agent%3Amain%3Amain", hash: "" };
    expect(normalizeInitialApplicationLocation(location, "", "agent:main:main")).toEqual(location);
  });

  it("keeps the existing default chat session normalization for /chat", () => {
    expect(
      normalizeInitialApplicationLocation(
        { pathname: "/chat", search: "", hash: "" },
        "",
        "agent:main:main",
      ),
    ).toEqual({
      pathname: "/chat",
      search: "?session=agent%3Amain%3Amain",
      hash: "",
    });
  });
});
