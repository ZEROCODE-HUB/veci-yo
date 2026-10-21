import { describe, expect, it } from "vitest";
import { hayVersionNueva } from "./versionNueva";

describe("hayVersionNueva", () => {
  it("si se publicó otro commit, hay versión nueva", () => {
    expect(hayVersionNueva("4f7d5bc", { commit: "8c7cdb0" })).toBe(true);
  });

  it("si es el mismo, no", () => {
    expect(hayVersionNueva("4f7d5bc", { commit: "4f7d5bc" })).toBe(false);
  });

  it("si alguna de las dos no sabe su commit, no se molesta a nadie", () => {
    expect(hayVersionNueva("", { commit: "8c7cdb0" })).toBe(false);
    expect(hayVersionNueva("4f7d5bc", { commit: "" })).toBe(false);
    expect(hayVersionNueva("4f7d5bc", null)).toBe(false);
    expect(hayVersionNueva("4f7d5bc", { commit: 7 })).toBe(false);
  });
});
