import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../context/AppContext';

export function renderWithProviders(ui, { route = '/', state } = {}) {
  return render(
    <AppProvider>
      <MemoryRouter initialEntries={[{ pathname: route, state }]}>
        {ui}
      </MemoryRouter>
    </AppProvider>
  );
}
