import type { Residente } from '@/shared/types';

export type { Residente };

export interface VehiculoPropietario {
  id: number;
  placa: string;
  tipo: string;
}

export interface ConfiguracionAceptacion {
  permiteRentaCorta: boolean;
  permiteMascotas: boolean;
  aptoNinos: boolean;
}

export interface PagoSuscripcion {
  cardNumber: string;
  cardName: string;
  cardExpiry: string;
  cardCvv: string;
}

