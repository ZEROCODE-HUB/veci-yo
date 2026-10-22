import { describe, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

/** El número de versión al pie de la entrada (22/10/2026). */
vi.mock("@/shared/version/version.generado", () => ({ VERSION: "1.0.0", ACTUALIZACION: 4 }));
vi.mock("@/shared/layouts", () => ({ ScreenLayout: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/features/onboarding/components", () => ({ OnboardingHeader: () => null }));
vi.mock("../components/acceso", () => ({
  LoginFormulario: () => null,
  LoginHero: () => null,
  RecuperarPasswordModal: () => null,
}));
vi.mock("../hooks/useRecuperacion", () => ({ useRecuperacion: () => ({ setVisible: () => {} }) }));
vi.mock("@/shared/hooks", () => ({ useNavegacionEntrada: () => ({ navigate: () => {} }) }));

const { LoginScreen } = await import("./LoginScreen");

describe("la pantalla de entrada", () => {
  it("dice la versión y el número de actualización", () => {
    render(<LoginScreen />);
    screen.getByText("Versión 1.0.0 · actualización 4");
  });
});
