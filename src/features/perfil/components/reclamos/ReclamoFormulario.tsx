import { View, Text, Pressable, Image } from 'react-native';
import { Controller, type Control, type FieldErrors } from 'react-hook-form';
import { Button, Input, Select } from '@/shared/components';
import { CATEGORIAS_PQRS, DESTINATARIOS, MEDIOS_CONTACTO } from '../../soporteMockData';
import type { ReclamoFormularioValores } from '../../schemas/reclamo.schema';

const iconAdjuntarDocumento = require('@/assets/icons/shared/adjuntar-documento.png');
const iconAdjuntarImagen = require('@/assets/icons/shared/adjuntar-imagen.png');

interface Props {
  control: Control<ReclamoFormularioValores>;
  errors: FieldErrors<ReclamoFormularioValores>;
  categoria: string;
  onCategoriaChange: (value: string) => void;
  onSubmit: () => void;
}

export function ReclamoFormulario({ control, errors, categoria, onCategoriaChange, onSubmit }: Props) {
  const categoriaSel = CATEGORIAS_PQRS.find((item) => item.id === categoria);
  const subcategoriasDisponibles = categoriaSel?.subcategorias || [];
  const tieneSubcategorias = subcategoriasDisponibles.length > 0;
  const esAppVeciYo = categoria === 'Aplicación VeciYo';

  return <>
    <Controller control={control} name="titulo" render={({ field }) => <Input label="Titulo*" value={field.value} onChangeText={field.onChange} placeholder="Describe brevemente el motivo" error={errors.titulo?.message} />} />
    <Controller control={control} name="descripcion" render={({ field }) => <Input label="Descripción*" value={field.value} onChangeText={field.onChange} placeholder="Describe el problema con el mayor detalle posible" multiline error={errors.descripcion?.message} />} />
    <Controller control={control} name="categoria" render={({ field }) => <Select label="Categoría*" value={field.value} options={CATEGORIAS_PQRS.map((item) => item.id)} onChange={(value) => { const next = String(value) || ''; field.onChange(next); onCategoriaChange(next); }} placeholder="Seleccione una categoría" />} />
    {errors.categoria?.message && <Text className="text-xs text-red-500 font-medium -mt-2">{errors.categoria.message}</Text>}
    {tieneSubcategorias && <><Controller control={control} name="subcategoria" render={({ field }) => <Select label="Subcategoría*" value={field.value} options={subcategoriasDisponibles} onChange={(value) => field.onChange(String(value) || '')} placeholder="Seleccione una subcategoría" />} />{errors.subcategoria?.message && <Text className="text-xs text-red-500 font-medium -mt-2">{errors.subcategoria.message}</Text>}</>}
    {esAppVeciYo && <Controller control={control} name="modelo" render={({ field }) => <Input label="Modelo del dispositivo*" value={field.value} onChangeText={field.onChange} placeholder="Ej. iPhone 15 Pro, Samsung Galaxy S24, Pixel 9" error={errors.modelo?.message} />} />}
    <Controller control={control} name="destinatario" render={({ field }) => <Select label="Destinatario" value={field.value} options={DESTINATARIOS} onChange={(value) => field.onChange(String(value))} placeholder="Seleccione un destinatario" />} />
    <Controller control={control} name="correo" render={({ field }) => <Input label="Correo electrónico" value={field.value} onChangeText={field.onChange} placeholder="correo@ejemplo.com" type="email" />} />
    <Controller control={control} name="telefono" render={({ field }) => <Input label="Teléfono" value={field.value} onChangeText={field.onChange} placeholder="+54 11 1234-5678" type="numeric" />} />
    <Controller control={control} name="medioContacto" render={({ field }) => <Select label="Medio de contacto preferido" value={field.value} options={MEDIOS_CONTACTO} onChange={(value) => field.onChange(String(value))} placeholder="Seleccione un medio" />} />
    <View className="flex-row gap-6 justify-center mt-1">{[{ key: 'documento', label: 'Adjuntar Documento', icon: iconAdjuntarDocumento }, { key: 'imagen', label: 'Adjuntar Imagen', icon: iconAdjuntarImagen }].map((adj) => <Pressable key={adj.key} className="items-center gap-2"><Image source={adj.icon} style={{ width: 64, height: 64, borderRadius: 12 }} resizeMode="cover" /><Text className="text-sm text-gray-900 text-center">{adj.label}</Text></Pressable>)}</View>
    <Button variant="primary" fullWidth onPress={onSubmit}>Enviar</Button>
  </>;
}

