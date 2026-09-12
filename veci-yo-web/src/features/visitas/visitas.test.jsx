import { describe, it, expect } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../test/renderWithProviders';
import VisitasHistorialPage from './VisitasHistorialPage';

describe('Batch E — Huésped Temporal (vista anfitrión)', () => {
  it('muestra barras de consumo de verificaciones en la vista general de Huéspedes', () => {
    renderWithProviders(<VisitasHistorialPage />, { route: '/visitas' });
    fireEvent.click(screen.getByRole('button', { name: 'Huéspedes' }));
    // Barras de consumo del paquete base y adicional
    expect(screen.getByText(/Verificaciones disponibles .* Paquete base/i)).toBeInTheDocument();
    expect(screen.getByText(/Paquete adicional/i)).toBeInTheDocument();
  });

  it('abre el detalle de reserva con timeline inline (sin popup "Ver detalles")', () => {
    renderWithProviders(<VisitasHistorialPage />, { route: '/visitas' });
    fireEvent.click(screen.getByRole('button', { name: 'Huéspedes' }));
    const reservas = screen.getAllByText(/Reserva de/i);
    fireEvent.click(reservas[0]);
    // Timeline embebido: etiquetas de pasos visibles dentro de la tarjeta
    expect(screen.getAllByText(/Documentación completada/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Términos y Condiciones aceptados/i).length).toBeGreaterThan(0);
    // El popup con botón "Ver detalles" fue eliminado
    expect(screen.queryByText(/Ver detalles/i)).not.toBeInTheDocument();
  });

  it('distinguue visualmente a los menores de edad dentro del detalle', () => {
    renderWithProviders(<VisitasHistorialPage />, { route: '/visitas' });
    fireEvent.click(screen.getByRole('button', { name: 'Huéspedes' }));
    const total = screen.getAllByText(/Reserva de/i).length;
    for (let i = 0; i < total; i++) {
      const list = screen.getAllByText(/Reserva de/i);
      fireEvent.click(list[i]);
      if (screen.queryAllByText(/Menor/i).length > 0) {
        expect(screen.getAllByText(/Menor/i).length).toBeGreaterThan(0);
        return;
      }
      fireEvent.click(screen.getByText(/Volver a visitas/i));
    }
    throw new Error('No se encontró ninguna reserva con menores');
  });
});
