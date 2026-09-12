import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/renderWithProviders';
import ReglasPage from './ReglasPage';

describe('Batch H — Reglamento / Renta Corta', () => {
  it('muestra la lista de departamentos con indicadores de confianza', () => {
    renderWithProviders(<ReglasPage />, { route: '/reglas' });
    expect(screen.getByText('Lista de departamentos habilitados para renta corta')).toBeInTheDocument();
    // Badge de mascotas presente para departamentos que las permiten
    expect(screen.getAllByText(/Mascotas/i).length).toBeGreaterThan(0);
    // Íconos de cumplimiento (antirruido / no fumar / sensor) presentes
    expect(screen.getAllByTitle(/antirruido/i).length).toBeGreaterThan(0);
    expect(screen.getAllByTitle(/no fumar/i).length).toBeGreaterThan(0);
    expect(screen.getAllByTitle(/incendio/i).length).toBeGreaterThan(0);
  });
});
