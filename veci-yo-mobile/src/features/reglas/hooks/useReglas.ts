import { useMemo, useState } from 'react';
import { Linking } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores';
import { obtenerDepartamentosRentaCorta } from '../services/reglas.service';
import type { DepartamentoRentaCorta } from '../types/reglas';
import { reglasDepartamentos } from '../reglasMockData';

export const REGLAS_DEPARTAMENTOS_QUERY_KEY = ['reglas', 'departamentos'];

export function useReglas() {
  const role = useAuthStore((state) => state.rolActivo);
  const query = useQuery({ queryKey: REGLAS_DEPARTAMENTOS_QUERY_KEY, queryFn: obtenerDepartamentosRentaCorta });
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [tower, setTower] = useState('');
  const [department, setDepartment] = useState('');
  const [floor, setFloor] = useState('');
  const [actionsDepartment, setActionsDepartment] = useState<DepartamentoRentaCorta | null>(null);
  const [complianceDepartment, setComplianceDepartment] = useState<DepartamentoRentaCorta | null>(null);
  const departamentos = query.data ?? reglasDepartamentos;
  const filtered = useMemo(() => departamentos.filter((item) => {
    const queryText = search.toLowerCase();
    return !queryText || item.departamento.toLowerCase().includes(queryText) || item.responsable.toLowerCase().includes(queryText);
  }), [departamentos, search]);
  const callContact = (type: 'anfitrion' | 'administrador' | 'propietario') => {
    if (!actionsDepartment) return;
    const phone = type === 'anfitrion' ? actionsDepartment.telAnfitrion : type === 'administrador' ? actionsDepartment.telAdmin : actionsDepartment.telPropietario;
    setActionsDepartment(null);
    if (phone) Linking.openURL(`tel:${phone}`);
  };
  return { ...query, role, isTemporaryGuest: role === 'huesped-temporal', canCallDepartmentContacts: role === 'guardia' || role === 'huesped-temporal' || role === 'administrador', search, setSearch, filterOpen, setFilterOpen, tower, setTower, department, setDepartment, floor, setFloor, filtered, actionsDepartment, setActionsDepartment, complianceDepartment, setComplianceDepartment, callContact };
}
