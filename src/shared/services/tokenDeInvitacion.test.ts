import { describe, expect, it } from "vitest";
import { tokenDeInvitacion } from "./tokenDeInvitacion";

describe("el código de la invitación dentro del enlace", () => {
  it("con dos o tres barras, y desde la web", () => {
    expect(tokenDeInvitacion("veciyo://invitacion?token=abc123")).toBe("abc123");
    expect(tokenDeInvitacion("veciyo:///invitacion?token=abc123")).toBe("abc123");
    expect(tokenDeInvitacion("https://veciyo.app/invitacion?token=abc%20123&x=1")).toBe("abc 123");
  });

  it("sin invitación o sin código, nada", () => {
    expect(tokenDeInvitacion("veciyo://")).toBeNull();
    expect(tokenDeInvitacion("veciyo://login?token=abc")).toBeNull();
    expect(tokenDeInvitacion("veciyo://invitacion")).toBeNull();
    expect(tokenDeInvitacion(null)).toBeNull();
  });
});
