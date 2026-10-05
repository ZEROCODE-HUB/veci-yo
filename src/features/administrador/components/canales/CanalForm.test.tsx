import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CanalForm } from "./CanalForm";

/**
 * El formulario de un canal del chat.
 *
 * Pedido por el cliente el 02/10/2026: «canales con nombre y roles, editables».
 * Hasta entonces los roles de un grupo vivían dentro de una función de la base,
 * así que cambiarlos era escribir una migración.
 *
 * Se comprueba aquí y no recorriendo la pantalla porque lo que importa es lo
 * que **se ve y se pulsa**: qué roles van marcados al abrir, que marcar y
 * desmarcar sume y reste, y que no se pueda guardar un canal sin nadie dentro.
 */
describe("el formulario de un canal", () => {
  it("abre vacío para uno nuevo", () => {
    render(
      <CanalForm
        editando={null}
        guardando={false}
        onGuardar={() => {}}
        onCancelar={() => {}}
      />,
    );

    expect(screen.getByRole("checkbox", { name: "Propietarios" }).getAttribute("aria-checked")).toBe("false");
    // Y avisa de que así no lo vería nadie, antes de pulsar nada.
    screen.getByText(/no lo vería nadie/i);
  });

  it("y con los roles que ya tiene, para editarlo", () => {
    render(
      <CanalForm
        editando={{
          id: "c1",
          nombre: "Residentes",
          rolesVivienda: ["propietario", "corresidente"],
          rolesEdificio: ["guardia"],
          personas: 7,
          archivado: false,
        }}
        guardando={false}
        onGuardar={() => {}}
        onCancelar={() => {}}
      />,
    );

    /*
      `aria-checked`, no solo el color: react-native-web **no traduce**
      `accessibilityState`, así que sin el atributo el estado existiría nada más
      en el borde. Es la quinta vez que este error aparece en el proyecto.
    */
    expect(
      screen.getByRole("checkbox", { name: "Propietarios" }).getAttribute("aria-checked"),
    ).toBe("true");
    expect(
      screen.getByRole("checkbox", { name: "Corresidentes" }).getAttribute("aria-checked"),
    ).toBe("true");
    expect(
      screen.getByRole("checkbox", { name: "Portería" }).getAttribute("aria-checked"),
    ).toBe("true");
    // Y los que no tiene, sin marcar.
    expect(
      screen.getByRole("checkbox", { name: "Residentes" }).getAttribute("aria-checked"),
    ).toBe("false");
  });

  it("el huésped temporal se puede marcar, y no viene marcado", () => {
    /*
      Antes la función de la base lo excluía a mano --`m.rol <>
      'huesped_temporal'`, porque está de paso-- y ahora es, sencillamente, un
      rol que no viene en la lista del canal. Que un edificio quiera meterlo en
      uno de avisos es asunto suyo, y para eso tiene que estar en la lista.
    */
    render(
      <CanalForm
        editando={null}
        guardando={false}
        onGuardar={() => {}}
        onCancelar={() => {}}
      />,
    );

    const huesped = screen.getByRole("checkbox", { name: "Huéspedes temporales" });
    expect(huesped.getAttribute("aria-checked")).toBe("false");
  });

  it("manda el nombre y los roles marcados", async () => {
    const guardar = vi.fn();
    render(
      <CanalForm
        editando={null}
        guardando={false}
        onGuardar={guardar}
        onCancelar={() => {}}
      />,
    );

    await userEvent.type(screen.getByDisplayValue(""), "Obras");
    await userEvent.click(screen.getByRole("checkbox", { name: "Propietarios" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Portería" }));
    await userEvent.click(screen.getByText("Crear canal"));

    expect(guardar).toHaveBeenCalledWith({
      nombre: "Obras",
      rolesVivienda: ["propietario"],
      rolesEdificio: ["guardia"],
      canalId: undefined,
    });
  });

  it("y al volver a pulsar un rol, lo quita", async () => {
    const guardar = vi.fn();
    render(
      <CanalForm
        editando={{
          id: "c1",
          nombre: "Residentes",
          rolesVivienda: ["propietario", "residente"],
          rolesEdificio: [],
          personas: 3,
          archivado: false,
        }}
        guardando={false}
        onGuardar={guardar}
        onCancelar={() => {}}
      />,
    );

    await userEvent.click(screen.getByRole("checkbox", { name: "Propietarios" }));
    await userEvent.click(screen.getByText("Guardar"));

    // Reemplaza, no suma: la pantalla manda la lista entera.
    expect(guardar).toHaveBeenCalledWith({
      nombre: "Residentes",
      rolesVivienda: ["residente"],
      rolesEdificio: [],
      canalId: "c1",
    });
  });

  it("y sin ningún rol no se puede guardar", async () => {
    /*
      La base lo rechaza igual --«El canal necesita al menos un rol»-- pero un
      canal sin nadie dentro no se ve ni para arreglarlo, así que mejor no
      llegar ahí. El control positivo es el caso de arriba, que sí guarda.
    */
    const guardar = vi.fn();
    render(
      <CanalForm
        editando={null}
        guardando={false}
        onGuardar={guardar}
        onCancelar={() => {}}
      />,
    );

    await userEvent.type(screen.getByDisplayValue(""), "Vacío");
    await userEvent.click(screen.getByText("Crear canal"));

    expect(guardar).not.toHaveBeenCalled();
  });
});
