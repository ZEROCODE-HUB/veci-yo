import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/renderWithProviders';
import { residentesPropietarioInit } from '../../data/mockData';
import PropietarioCrearRolPage from './PropietarioCrearRolPage';
import PropietarioAceptacionPage from './PropietarioAceptacionPage';
import PropietarioConfiguracionPage from './PropietarioConfiguracionPage';

describe('Batch A/B/C — Propietario', () => {
  it('mockData ya no usa el rol "Residente Lider"', () => {
    const roles = residentesPropietarioInit.map(r => r.rol);
    expect(roles).not.toContain('Residente Lider');
    expect(roles).toContain('Inquilino Lider');
  });

  it('Crear rol: elimina la sección Contrato pero conserva Contacto de Emergencia con texto', () => {
    renderWithProviders(<PropietarioCrearRolPage />);
    expect(screen.getByText('Contacto de Emergencia')).toBeInTheDocument();
    expect(screen.getByText(/contacto alternativo/i)).toBeInTheDocument();
    expect(screen.queryByText('Contrato')).not.toBeInTheDocument();
    expect(screen.queryByText('Adjuntar Contrato')).not.toBeInTheDocument();
    expect(screen.queryByText('Términos y condiciones')).not.toBeInTheDocument();
  });

  it('Aceptación: sólo pide 3 toggles y muestra estacionamientos de solo lectura', () => {
    renderWithProviders(<PropietarioAceptacionPage />, {
      route: '/propietario/configuracion/aceptar',
      state: { ubicacionId: 1, unidadId: 6 },
    });
    expect(screen.getByText('Permite renta corta')).toBeInTheDocument();
    expect(screen.getByText('Permite mascotas')).toBeInTheDocument();
    expect(screen.getByText('Apto para niños')).toBeInTheDocument();
    expect(screen.getByText('Asignados por el Administrador')).toBeInTheDocument();
    expect(screen.queryByText('Integraciones')).not.toBeInTheDocument();
    expect(screen.queryByText('Personal')).not.toBeInTheDocument();
  });

  it('Configuración: muestra títulos jerárquicos y aclaración de edición', () => {
    renderWithProviders(<PropietarioConfiguracionPage />, { route: '/propietario/configuracion' });
    expect(screen.getByText('Residente Inquilino Lider')).toBeInTheDocument();
    expect(screen.getByText(/pueden agregar o editar los residentes/i)).toBeInTheDocument();
  });
});
