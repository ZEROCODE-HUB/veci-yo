import { describe, expect, it } from "vitest";
import { rutaParaElLector } from "./rutaParaElLector";

describe("rutaParaElLector", () => {
  it("quita «file://» y deja los espacios de verdad", () => {
    expect(rutaParaElLector("file:///data/user/0/com.veciyo/cache/Camera/foto%20uno.jpg")).toBe(
      "/data/user/0/com.veciyo/cache/Camera/foto uno.jpg",
    );
  });

  it("una ruta content:// o ya limpia se deja como viene", () => {
    expect(rutaParaElLector("content://media/external/images/1")).toBe("content://media/external/images/1");
    expect(rutaParaElLector("/data/foto.jpg")).toBe("/data/foto.jpg");
  });
});
