import { describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { Text } from "react-native";
import { Modal } from "./Modal";
import { useUIStore } from "@/stores/ui-store";

/**
 * El aviso se lee aunque haya un modal abierto.
 *
 * El modal se pinta en una capa por encima de la aplicación, y los avisos
 * vivían solo en la raíz: el 12/10/2026 el cliente vio el error de «Dar
 * reconocimiento» difuminado **detrás** del modal que lo provocó.
 *
 * Aquí no se monta la raíz: si el aviso aparece, es que lo pinta el modal.
 */
describe("un aviso con un modal abierto", () => {
  it("sale dentro del modal", () => {
    render(
      <Modal visible onClose={() => {}} title="Dar reconocimiento">
        <Text>contenido</Text>
      </Modal>,
    );
    expect(screen.queryByText("Ya diste el de este mes")).toBeNull();

    act(() => {
      useUIStore.getState().addToast("Ya diste el de este mes", "error");
    });
    expect(screen.getByText("Ya diste el de este mes")).toBeTruthy();
  });
});
