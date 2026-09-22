export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      adjunto_reclamo: {
        Row: {
          created_at: string
          id: string
          nombre_original: string
          reclamo_id: string
          ruta: string
          subido_por: string
          tamano_bytes: number | null
          tipo_mime: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nombre_original: string
          reclamo_id: string
          ruta: string
          subido_por: string
          tamano_bytes?: number | null
          tipo_mime: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nombre_original?: string
          reclamo_id?: string
          ruta?: string
          subido_por?: string
          tamano_bytes?: number | null
          tipo_mime?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "adjunto_reclamo_reclamo_id_fkey"
            columns: ["reclamo_id"]
            isOneToOne: false
            referencedRelation: "reclamo"
            referencedColumns: ["id"]
          },
        ]
      }
      asignacion_estacionamiento: {
        Row: {
          asignado_en: string
          asignado_por: string | null
          created_at: string
          estacionamiento_id: string
          id: string
          liberado_en: string | null
          updated_at: string
          visita_id: string
        }
        Insert: {
          asignado_en?: string
          asignado_por?: string | null
          created_at?: string
          estacionamiento_id: string
          id?: string
          liberado_en?: string | null
          updated_at?: string
          visita_id: string
        }
        Update: {
          asignado_en?: string
          asignado_por?: string | null
          created_at?: string
          estacionamiento_id?: string
          id?: string
          liberado_en?: string | null
          updated_at?: string
          visita_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asignacion_estacionamiento_estacionamiento_id_fkey"
            columns: ["estacionamiento_id"]
            isOneToOne: false
            referencedRelation: "estacionamiento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignacion_estacionamiento_visita_id_fkey"
            columns: ["visita_id"]
            isOneToOne: false
            referencedRelation: "visita"
            referencedColumns: ["id"]
          },
        ]
      }
      comite_propietarios: {
        Row: {
          cargo: string | null
          condominio_id: string
          created_at: string
          desde: string
          hasta: string | null
          id: string
          updated_at: string
          usuario_id: string
        }
        Insert: {
          cargo?: string | null
          condominio_id: string
          created_at?: string
          desde?: string
          hasta?: string | null
          id?: string
          updated_at?: string
          usuario_id: string
        }
        Update: {
          cargo?: string | null
          condominio_id?: string
          created_at?: string
          desde?: string
          hasta?: string | null
          id?: string
          updated_at?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comite_propietarios_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominio"
            referencedColumns: ["id"]
          },
        ]
      }
      condominio: {
        Row: {
          ciudad: string | null
          created_at: string
          deleted_at: string | null
          direccion: string
          email: string | null
          horario_atencion: string | null
          id: string
          identificacion_fiscal: string | null
          moneda: string
          nombre: string
          pais: string
          telefono: string | null
          updated_at: string
        }
        Insert: {
          ciudad?: string | null
          created_at?: string
          deleted_at?: string | null
          direccion: string
          email?: string | null
          horario_atencion?: string | null
          id?: string
          identificacion_fiscal?: string | null
          moneda?: string
          nombre: string
          pais: string
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          ciudad?: string | null
          created_at?: string
          deleted_at?: string | null
          direccion?: string
          email?: string | null
          horario_atencion?: string | null
          id?: string
          identificacion_fiscal?: string | null
          moneda?: string
          nombre?: string
          pais?: string
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      config_renta_corta: {
        Row: {
          activa: boolean
          apto_ninos: boolean
          checkin_24h: boolean
          checkin_desde: string | null
          checkin_hasta: string | null
          created_at: string
          descripcion: string | null
          estacionamientos: number
          estancia_maxima_noches: number | null
          estancia_minima_noches: number
          id: string
          max_huespedes: number
          num_habitaciones: number | null
          permite_cocheras_visita: boolean
          permite_mascotas: boolean
          permite_visitas: boolean
          unidad_id: string
          updated_at: string
        }
        Insert: {
          activa?: boolean
          apto_ninos?: boolean
          checkin_24h?: boolean
          checkin_desde?: string | null
          checkin_hasta?: string | null
          created_at?: string
          descripcion?: string | null
          estacionamientos?: number
          estancia_maxima_noches?: number | null
          estancia_minima_noches?: number
          id?: string
          max_huespedes?: number
          num_habitaciones?: number | null
          permite_cocheras_visita?: boolean
          permite_mascotas?: boolean
          permite_visitas?: boolean
          unidad_id: string
          updated_at?: string
        }
        Update: {
          activa?: boolean
          apto_ninos?: boolean
          checkin_24h?: boolean
          checkin_desde?: string | null
          checkin_hasta?: string | null
          created_at?: string
          descripcion?: string | null
          estacionamientos?: number
          estancia_maxima_noches?: number | null
          estancia_minima_noches?: number
          id?: string
          max_huespedes?: number
          num_habitaciones?: number | null
          permite_cocheras_visita?: boolean
          permite_mascotas?: boolean
          permite_visitas?: boolean
          unidad_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "config_renta_corta_unidad_id_fkey"
            columns: ["unidad_id"]
            isOneToOne: true
            referencedRelation: "unidad"
            referencedColumns: ["id"]
          },
        ]
      }
      conversacion: {
        Row: {
          ambito: Database["public"]["Enums"]["ambito_grupo"] | null
          area: Database["public"]["Enums"]["area_conversacion"] | null
          condominio_id: string
          creada_por: string | null
          created_at: string
          id: string
          nombre: string | null
          tipo: Database["public"]["Enums"]["tipo_conversacion"]
          unidad_id: string | null
          updated_at: string
        }
        Insert: {
          ambito?: Database["public"]["Enums"]["ambito_grupo"] | null
          area?: Database["public"]["Enums"]["area_conversacion"] | null
          condominio_id: string
          creada_por?: string | null
          created_at?: string
          id?: string
          nombre?: string | null
          tipo: Database["public"]["Enums"]["tipo_conversacion"]
          unidad_id?: string | null
          updated_at?: string
        }
        Update: {
          ambito?: Database["public"]["Enums"]["ambito_grupo"] | null
          area?: Database["public"]["Enums"]["area_conversacion"] | null
          condominio_id?: string
          creada_por?: string | null
          created_at?: string
          id?: string
          nombre?: string | null
          tipo?: Database["public"]["Enums"]["tipo_conversacion"]
          unidad_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversacion_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversacion_unidad_id_fkey"
            columns: ["unidad_id"]
            isOneToOne: false
            referencedRelation: "unidad"
            referencedColumns: ["id"]
          },
        ]
      }
      correspondencia: {
        Row: {
          categoria:
            | Database["public"]["Enums"]["categoria_correspondencia"]
            | null
          condicion: Database["public"]["Enums"]["estado_encomienda"] | null
          condominio_id: string
          created_at: string
          deleted_at: string | null
          descripcion: string | null
          destinatario_documento: string | null
          destinatario_nombre: string | null
          empresa: string | null
          entrega_en_puerta: boolean
          entregada_a: string | null
          entregada_en: string | null
          estado: Database["public"]["Enums"]["estado_correspondencia"]
          id: string
          logistica: string | null
          recibida_en: string | null
          recibida_por: string | null
          registrada_en: string
          registrada_por: string | null
          unidad_id: string
          updated_at: string
        }
        Insert: {
          categoria?:
            | Database["public"]["Enums"]["categoria_correspondencia"]
            | null
          condicion?: Database["public"]["Enums"]["estado_encomienda"] | null
          condominio_id: string
          created_at?: string
          deleted_at?: string | null
          descripcion?: string | null
          destinatario_documento?: string | null
          destinatario_nombre?: string | null
          empresa?: string | null
          entrega_en_puerta?: boolean
          entregada_a?: string | null
          entregada_en?: string | null
          estado?: Database["public"]["Enums"]["estado_correspondencia"]
          id?: string
          logistica?: string | null
          recibida_en?: string | null
          recibida_por?: string | null
          registrada_en?: string
          registrada_por?: string | null
          unidad_id: string
          updated_at?: string
        }
        Update: {
          categoria?:
            | Database["public"]["Enums"]["categoria_correspondencia"]
            | null
          condicion?: Database["public"]["Enums"]["estado_encomienda"] | null
          condominio_id?: string
          created_at?: string
          deleted_at?: string | null
          descripcion?: string | null
          destinatario_documento?: string | null
          destinatario_nombre?: string | null
          empresa?: string | null
          entrega_en_puerta?: boolean
          entregada_a?: string | null
          entregada_en?: string | null
          estado?: Database["public"]["Enums"]["estado_correspondencia"]
          id?: string
          logistica?: string | null
          recibida_en?: string | null
          recibida_por?: string | null
          registrada_en?: string
          registrada_por?: string | null
          unidad_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "correspondencia_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "correspondencia_unidad_id_fkey"
            columns: ["unidad_id"]
            isOneToOne: false
            referencedRelation: "unidad"
            referencedColumns: ["id"]
          },
        ]
      }
      cuota_administracion: {
        Row: {
          condominio_id: string
          created_at: string
          id: string
          moneda: string
          monto: number
          periodo: string
          updated_at: string
          vence_en: string | null
        }
        Insert: {
          condominio_id: string
          created_at?: string
          id?: string
          moneda: string
          monto: number
          periodo: string
          updated_at?: string
          vence_en?: string | null
        }
        Update: {
          condominio_id?: string
          created_at?: string
          id?: string
          moneda?: string
          monto?: number
          periodo?: string
          updated_at?: string
          vence_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cuota_administracion_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominio"
            referencedColumns: ["id"]
          },
        ]
      }
      deposito: {
        Row: {
          codigo: string
          condominio_id: string
          created_at: string
          id: string
          torre_id: string | null
          ubicacion: string | null
          unidad_id: string | null
          updated_at: string
        }
        Insert: {
          codigo: string
          condominio_id: string
          created_at?: string
          id?: string
          torre_id?: string | null
          ubicacion?: string | null
          unidad_id?: string | null
          updated_at?: string
        }
        Update: {
          codigo?: string
          condominio_id?: string
          created_at?: string
          id?: string
          torre_id?: string | null
          ubicacion?: string | null
          unidad_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deposito_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposito_torre_id_fkey"
            columns: ["torre_id"]
            isOneToOne: false
            referencedRelation: "torre"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposito_unidad_id_fkey"
            columns: ["unidad_id"]
            isOneToOne: false
            referencedRelation: "unidad"
            referencedColumns: ["id"]
          },
        ]
      }
      estacionamiento: {
        Row: {
          codigo: string
          condominio_id: string
          created_at: string
          id: string
          tipo: Database["public"]["Enums"]["tipo_estacionamiento"]
          torre_id: string | null
          ubicacion: string | null
          unidad_id: string | null
          updated_at: string
        }
        Insert: {
          codigo: string
          condominio_id: string
          created_at?: string
          id?: string
          tipo: Database["public"]["Enums"]["tipo_estacionamiento"]
          torre_id?: string | null
          ubicacion?: string | null
          unidad_id?: string | null
          updated_at?: string
        }
        Update: {
          codigo?: string
          condominio_id?: string
          created_at?: string
          id?: string
          tipo?: Database["public"]["Enums"]["tipo_estacionamiento"]
          torre_id?: string | null
          ubicacion?: string | null
          unidad_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estacionamiento_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estacionamiento_torre_id_fkey"
            columns: ["torre_id"]
            isOneToOne: false
            referencedRelation: "torre"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estacionamiento_unidad_id_fkey"
            columns: ["unidad_id"]
            isOneToOne: false
            referencedRelation: "unidad"
            referencedColumns: ["id"]
          },
        ]
      }
      incidencia_correspondencia: {
        Row: {
          correspondencia_id: string
          created_at: string
          descripcion: string
          fotos: string[]
          id: string
          reportada_en: string
          reportada_por: string | null
          updated_at: string
        }
        Insert: {
          correspondencia_id: string
          created_at?: string
          descripcion: string
          fotos?: string[]
          id?: string
          reportada_en?: string
          reportada_por?: string | null
          updated_at?: string
        }
        Update: {
          correspondencia_id?: string
          created_at?: string
          descripcion?: string
          fotos?: string[]
          id?: string
          reportada_en?: string
          reportada_por?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidencia_correspondencia_correspondencia_id_fkey"
            columns: ["correspondencia_id"]
            isOneToOne: false
            referencedRelation: "correspondencia"
            referencedColumns: ["id"]
          },
        ]
      }
      insignia: {
        Row: {
          clave: string
          created_at: string
          etiqueta: string
          icono: string | null
          id: string
          updated_at: string
        }
        Insert: {
          clave: string
          created_at?: string
          etiqueta: string
          icono?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          clave?: string
          created_at?: string
          etiqueta?: string
          icono?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      invitacion: {
        Row: {
          aceptada_en: string | null
          aceptada_por: string | null
          ambito: Database["public"]["Enums"]["ambito_invitacion"]
          condominio_id: string
          correo: string
          created_at: string
          enviada_en: string | null
          estado: Database["public"]["Enums"]["estado_invitacion"]
          expira_en: string
          id: string
          invitada_por: string | null
          nombre: string
          rol_condominio: Database["public"]["Enums"]["rol_condominio"] | null
          rol_unidad: Database["public"]["Enums"]["rol_unidad"] | null
          token_hash: string
          unidad_id: string | null
          updated_at: string
        }
        Insert: {
          aceptada_en?: string | null
          aceptada_por?: string | null
          ambito: Database["public"]["Enums"]["ambito_invitacion"]
          condominio_id: string
          correo: string
          created_at?: string
          enviada_en?: string | null
          estado?: Database["public"]["Enums"]["estado_invitacion"]
          expira_en?: string
          id?: string
          invitada_por?: string | null
          nombre: string
          rol_condominio?: Database["public"]["Enums"]["rol_condominio"] | null
          rol_unidad?: Database["public"]["Enums"]["rol_unidad"] | null
          token_hash: string
          unidad_id?: string | null
          updated_at?: string
        }
        Update: {
          aceptada_en?: string | null
          aceptada_por?: string | null
          ambito?: Database["public"]["Enums"]["ambito_invitacion"]
          condominio_id?: string
          correo?: string
          created_at?: string
          enviada_en?: string | null
          estado?: Database["public"]["Enums"]["estado_invitacion"]
          expira_en?: string
          id?: string
          invitada_por?: string | null
          nombre?: string
          rol_condominio?: Database["public"]["Enums"]["rol_condominio"] | null
          rol_unidad?: Database["public"]["Enums"]["rol_unidad"] | null
          token_hash?: string
          unidad_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitacion_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitacion_unidad_id_fkey"
            columns: ["unidad_id"]
            isOneToOne: false
            referencedRelation: "unidad"
            referencedColumns: ["id"]
          },
        ]
      }
      invitado: {
        Row: {
          created_at: string
          documento_numero: string | null
          es_menor: boolean
          fecha_nacimiento: string | null
          id: string
          ingreso_en: string | null
          llego: boolean
          nombre: string
          orden: number
          salida_en: string | null
          terminos_aceptados: boolean
          terminos_aprobado_por: string | null
          terminos_excepcion: boolean
          tiene_tutela: boolean
          tipo_documento: Database["public"]["Enums"]["tipo_documento"] | null
          updated_at: string
          visita_id: string
        }
        Insert: {
          created_at?: string
          documento_numero?: string | null
          es_menor?: boolean
          fecha_nacimiento?: string | null
          id?: string
          ingreso_en?: string | null
          llego?: boolean
          nombre: string
          orden?: number
          salida_en?: string | null
          terminos_aceptados?: boolean
          terminos_aprobado_por?: string | null
          terminos_excepcion?: boolean
          tiene_tutela?: boolean
          tipo_documento?: Database["public"]["Enums"]["tipo_documento"] | null
          updated_at?: string
          visita_id: string
        }
        Update: {
          created_at?: string
          documento_numero?: string | null
          es_menor?: boolean
          fecha_nacimiento?: string | null
          id?: string
          ingreso_en?: string | null
          llego?: boolean
          nombre?: string
          orden?: number
          salida_en?: string | null
          terminos_aceptados?: boolean
          terminos_aprobado_por?: string | null
          terminos_excepcion?: boolean
          tiene_tutela?: boolean
          tipo_documento?: Database["public"]["Enums"]["tipo_documento"] | null
          updated_at?: string
          visita_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitado_visita_id_fkey"
            columns: ["visita_id"]
            isOneToOne: false
            referencedRelation: "visita"
            referencedColumns: ["id"]
          },
        ]
      }
      libro_huesped: {
        Row: {
          created_at: string
          id: string
          instrucciones: string | null
          notas: string | null
          puerta_password_secret: string | null
          unidad_id: string
          updated_at: string
          wifi_nombre: string | null
          wifi_password_secret: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          instrucciones?: string | null
          notas?: string | null
          puerta_password_secret?: string | null
          unidad_id: string
          updated_at?: string
          wifi_nombre?: string | null
          wifi_password_secret?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          instrucciones?: string | null
          notas?: string | null
          puerta_password_secret?: string | null
          unidad_id?: string
          updated_at?: string
          wifi_nombre?: string | null
          wifi_password_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "libro_huesped_unidad_id_fkey"
            columns: ["unidad_id"]
            isOneToOne: true
            referencedRelation: "unidad"
            referencedColumns: ["id"]
          },
        ]
      }
      limite_renta_corta_condominio: {
        Row: {
          capacidad_maxima: number | null
          condominio_id: string
          created_at: string
          estancia_minima_noches: number | null
          id: string
          permite_renta_corta: boolean
          updated_at: string
        }
        Insert: {
          capacidad_maxima?: number | null
          condominio_id: string
          created_at?: string
          estancia_minima_noches?: number | null
          id?: string
          permite_renta_corta?: boolean
          updated_at?: string
        }
        Update: {
          capacidad_maxima?: number | null
          condominio_id?: string
          created_at?: string
          estancia_minima_noches?: number | null
          id?: string
          permite_renta_corta?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "limite_renta_corta_condominio_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: true
            referencedRelation: "condominio"
            referencedColumns: ["id"]
          },
        ]
      }
      llamada: {
        Row: {
          a_nombre: string
          a_usuario: string | null
          condominio_id: string
          created_at: string
          de_usuario: string
          duracion_segundos: number
          id: string
          iniciada_en: string
          tipo: Database["public"]["Enums"]["tipo_llamada"]
          unidad_id: string | null
          updated_at: string
        }
        Insert: {
          a_nombre: string
          a_usuario?: string | null
          condominio_id: string
          created_at?: string
          de_usuario: string
          duracion_segundos?: number
          id?: string
          iniciada_en?: string
          tipo: Database["public"]["Enums"]["tipo_llamada"]
          unidad_id?: string | null
          updated_at?: string
        }
        Update: {
          a_nombre?: string
          a_usuario?: string | null
          condominio_id?: string
          created_at?: string
          de_usuario?: string
          duracion_segundos?: number
          id?: string
          iniciada_en?: string
          tipo?: Database["public"]["Enums"]["tipo_llamada"]
          unidad_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "llamada_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "llamada_unidad_id_fkey"
            columns: ["unidad_id"]
            isOneToOne: false
            referencedRelation: "unidad"
            referencedColumns: ["id"]
          },
        ]
      }
      membresia_condominio: {
        Row: {
          activo: boolean
          condominio_id: string
          created_at: string
          documento: string | null
          id: string
          nombre: string | null
          permisos: Json
          porteria_id: string | null
          rol: Database["public"]["Enums"]["rol_condominio"]
          rotacion_activa: boolean
          telefono: string | null
          tipo_rotacion: string | null
          updated_at: string
          usuario_id: string
        }
        Insert: {
          activo?: boolean
          condominio_id: string
          created_at?: string
          documento?: string | null
          id?: string
          nombre?: string | null
          permisos?: Json
          porteria_id?: string | null
          rol: Database["public"]["Enums"]["rol_condominio"]
          rotacion_activa?: boolean
          telefono?: string | null
          tipo_rotacion?: string | null
          updated_at?: string
          usuario_id: string
        }
        Update: {
          activo?: boolean
          condominio_id?: string
          created_at?: string
          documento?: string | null
          id?: string
          nombre?: string | null
          permisos?: Json
          porteria_id?: string | null
          rol?: Database["public"]["Enums"]["rol_condominio"]
          rotacion_activa?: boolean
          telefono?: string | null
          tipo_rotacion?: string | null
          updated_at?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membresia_condominio_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membresia_condominio_porteria_id_fkey"
            columns: ["porteria_id"]
            isOneToOne: false
            referencedRelation: "porteria"
            referencedColumns: ["id"]
          },
        ]
      }
      membresia_unidad: {
        Row: {
          activo: boolean
          created_at: string
          es_admin_primario: boolean
          es_anfitrion_primario: boolean
          es_menor: boolean
          es_residente: boolean
          id: string
          nombre: string
          permisos: Json
          puede_acceder: boolean
          rol: Database["public"]["Enums"]["rol_unidad"]
          telefono: string | null
          unidad_id: string
          updated_at: string
          usuario_id: string | null
          vigente_desde: string | null
          vigente_hasta: string | null
        }
        Insert: {
          activo?: boolean
          created_at?: string
          es_admin_primario?: boolean
          es_anfitrion_primario?: boolean
          es_menor?: boolean
          es_residente?: boolean
          id?: string
          nombre: string
          permisos?: Json
          puede_acceder?: boolean
          rol: Database["public"]["Enums"]["rol_unidad"]
          telefono?: string | null
          unidad_id: string
          updated_at?: string
          usuario_id?: string | null
          vigente_desde?: string | null
          vigente_hasta?: string | null
        }
        Update: {
          activo?: boolean
          created_at?: string
          es_admin_primario?: boolean
          es_anfitrion_primario?: boolean
          es_menor?: boolean
          es_residente?: boolean
          id?: string
          nombre?: string
          permisos?: Json
          puede_acceder?: boolean
          rol?: Database["public"]["Enums"]["rol_unidad"]
          telefono?: string | null
          unidad_id?: string
          updated_at?: string
          usuario_id?: string | null
          vigente_desde?: string | null
          vigente_hasta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "membresia_unidad_unidad_id_fkey"
            columns: ["unidad_id"]
            isOneToOne: false
            referencedRelation: "unidad"
            referencedColumns: ["id"]
          },
        ]
      }
      mensaje: {
        Row: {
          autor_id: string
          autor_nombre: string
          conversacion_id: string
          created_at: string
          deleted_at: string | null
          enviado_en: string
          id: string
          texto: string
          updated_at: string
        }
        Insert: {
          autor_id: string
          autor_nombre: string
          conversacion_id: string
          created_at?: string
          deleted_at?: string | null
          enviado_en?: string
          id?: string
          texto: string
          updated_at?: string
        }
        Update: {
          autor_id?: string
          autor_nombre?: string
          conversacion_id?: string
          created_at?: string
          deleted_at?: string | null
          enviado_en?: string
          id?: string
          texto?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensaje_conversacion_id_fkey"
            columns: ["conversacion_id"]
            isOneToOne: false
            referencedRelation: "conversacion"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacion: {
        Row: {
          condominio_id: string
          created_at: string
          entidad_id: string | null
          entidad_tipo: string | null
          id: string
          leida_en: string | null
          mensaje: string
          tipo: Database["public"]["Enums"]["motivo_notificacion"]
          titulo: string
          updated_at: string
          usuario_id: string
        }
        Insert: {
          condominio_id: string
          created_at?: string
          entidad_id?: string | null
          entidad_tipo?: string | null
          id?: string
          leida_en?: string | null
          mensaje: string
          tipo: Database["public"]["Enums"]["motivo_notificacion"]
          titulo: string
          updated_at?: string
          usuario_id: string
        }
        Update: {
          condominio_id?: string
          created_at?: string
          entidad_id?: string | null
          entidad_tipo?: string | null
          id?: string
          leida_en?: string | null
          mensaje?: string
          tipo?: Database["public"]["Enums"]["motivo_notificacion"]
          titulo?: string
          updated_at?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacion_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominio"
            referencedColumns: ["id"]
          },
        ]
      }
      opcion_voto: {
        Row: {
          created_at: string
          etiqueta: string
          id: string
          orden: number
          publicacion_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          etiqueta: string
          id?: string
          orden?: number
          publicacion_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          etiqueta?: string
          id?: string
          orden?: number
          publicacion_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opcion_voto_publicacion_id_fkey"
            columns: ["publicacion_id"]
            isOneToOne: false
            referencedRelation: "publicacion"
            referencedColumns: ["id"]
          },
        ]
      }
      pago_cuota: {
        Row: {
          created_at: string
          cuota_id: string
          id: string
          monto: number | null
          origen: Database["public"]["Enums"]["origen_pago"]
          pagado: boolean
          pagado_en: string | null
          registrado_por: string | null
          unidad_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cuota_id: string
          id?: string
          monto?: number | null
          origen?: Database["public"]["Enums"]["origen_pago"]
          pagado?: boolean
          pagado_en?: string | null
          registrado_por?: string | null
          unidad_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cuota_id?: string
          id?: string
          monto?: number | null
          origen?: Database["public"]["Enums"]["origen_pago"]
          pagado?: boolean
          pagado_en?: string | null
          registrado_por?: string | null
          unidad_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pago_cuota_cuota_id_fkey"
            columns: ["cuota_id"]
            isOneToOne: false
            referencedRelation: "cuota_administracion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pago_cuota_unidad_id_fkey"
            columns: ["unidad_id"]
            isOneToOne: false
            referencedRelation: "unidad"
            referencedColumns: ["id"]
          },
        ]
      }
      paquete_verificaciones: {
        Row: {
          cantidad: number
          comprado_en: string
          comprado_por: string | null
          created_at: string
          id: string
          moneda: string | null
          monto: number | null
          unidad_id: string
          updated_at: string
          vence_en: string | null
        }
        Insert: {
          cantidad: number
          comprado_en?: string
          comprado_por?: string | null
          created_at?: string
          id?: string
          moneda?: string | null
          monto?: number | null
          unidad_id: string
          updated_at?: string
          vence_en?: string | null
        }
        Update: {
          cantidad?: number
          comprado_en?: string
          comprado_por?: string | null
          created_at?: string
          id?: string
          moneda?: string | null
          monto?: number | null
          unidad_id?: string
          updated_at?: string
          vence_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "paquete_verificaciones_unidad_id_fkey"
            columns: ["unidad_id"]
            isOneToOne: false
            referencedRelation: "unidad"
            referencedColumns: ["id"]
          },
        ]
      }
      participante_conversacion: {
        Row: {
          conversacion_id: string
          created_at: string
          id: string
          ultimo_leido_en: string | null
          updated_at: string
          usuario_id: string
        }
        Insert: {
          conversacion_id: string
          created_at?: string
          id?: string
          ultimo_leido_en?: string | null
          updated_at?: string
          usuario_id: string
        }
        Update: {
          conversacion_id?: string
          created_at?: string
          id?: string
          ultimo_leido_en?: string | null
          updated_at?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "participante_conversacion_conversacion_id_fkey"
            columns: ["conversacion_id"]
            isOneToOne: false
            referencedRelation: "conversacion"
            referencedColumns: ["id"]
          },
        ]
      }
      participante_reserva: {
        Row: {
          asistencia: Database["public"]["Enums"]["asistencia_participante"]
          created_at: string
          id: string
          nombre: string
          reserva_id: string
          tipo: Database["public"]["Enums"]["tipo_participante"]
          updated_at: string
        }
        Insert: {
          asistencia?: Database["public"]["Enums"]["asistencia_participante"]
          created_at?: string
          id?: string
          nombre: string
          reserva_id: string
          tipo?: Database["public"]["Enums"]["tipo_participante"]
          updated_at?: string
        }
        Update: {
          asistencia?: Database["public"]["Enums"]["asistencia_participante"]
          created_at?: string
          id?: string
          nombre?: string
          reserva_id?: string
          tipo?: Database["public"]["Enums"]["tipo_participante"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "participante_reserva_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reserva_zona"
            referencedColumns: ["id"]
          },
        ]
      }
      perfil: {
        Row: {
          alias: string | null
          apellido: string
          created_at: string
          id: string
          identificacion: string | null
          nombre: string
          telefono: string | null
          tipo_documento: Database["public"]["Enums"]["tipo_documento"] | null
          updated_at: string
          usa_alias_cuadro_honor: boolean
          usa_alias_zonas: boolean
          verificado: boolean
        }
        Insert: {
          alias?: string | null
          apellido?: string
          created_at?: string
          id: string
          identificacion?: string | null
          nombre: string
          telefono?: string | null
          tipo_documento?: Database["public"]["Enums"]["tipo_documento"] | null
          updated_at?: string
          usa_alias_cuadro_honor?: boolean
          usa_alias_zonas?: boolean
          verificado?: boolean
        }
        Update: {
          alias?: string | null
          apellido?: string
          created_at?: string
          id?: string
          identificacion?: string | null
          nombre?: string
          telefono?: string | null
          tipo_documento?: Database["public"]["Enums"]["tipo_documento"] | null
          updated_at?: string
          usa_alias_cuadro_honor?: boolean
          usa_alias_zonas?: boolean
          verificado?: boolean
        }
        Relationships: []
      }
      periodo_suscripcion: {
        Row: {
          created_at: string
          desde: string
          hasta: string
          id: string
          suscripcion_id: string
          updated_at: string
          verificaciones_base: number
        }
        Insert: {
          created_at?: string
          desde: string
          hasta: string
          id?: string
          suscripcion_id: string
          updated_at?: string
          verificaciones_base: number
        }
        Update: {
          created_at?: string
          desde?: string
          hasta?: string
          id?: string
          suscripcion_id?: string
          updated_at?: string
          verificaciones_base?: number
        }
        Relationships: [
          {
            foreignKeyName: "periodo_suscripcion_suscripcion_id_fkey"
            columns: ["suscripcion_id"]
            isOneToOne: false
            referencedRelation: "suscripcion_renta_corta"
            referencedColumns: ["id"]
          },
        ]
      }
      permiso_vivienda: {
        Row: {
          condominio_id: string
          corta_checkin_desde: string | null
          corta_checkin_hasta: string | null
          corta_estancia_maxima: number | null
          corta_estancia_minima: number
          corta_permite_cocheras: boolean
          corta_permite_mascotas: boolean
          corta_permite_ninos: boolean
          corta_permite_visitas: boolean
          created_at: string
          diferencia_estancia: boolean
          entrega_directa: boolean
          huespedes_temporales: boolean
          id: string
          larga_checkin_desde: string | null
          larga_checkin_hasta: string | null
          larga_estancia_maxima: number | null
          larga_estancia_minima: number
          larga_permite_cocheras: boolean
          larga_permite_mascotas: boolean
          larga_permite_ninos: boolean
          larga_permite_visitas: boolean
          unidad_id: string | null
          updated_at: string
        }
        Insert: {
          condominio_id: string
          corta_checkin_desde?: string | null
          corta_checkin_hasta?: string | null
          corta_estancia_maxima?: number | null
          corta_estancia_minima?: number
          corta_permite_cocheras?: boolean
          corta_permite_mascotas?: boolean
          corta_permite_ninos?: boolean
          corta_permite_visitas?: boolean
          created_at?: string
          diferencia_estancia?: boolean
          entrega_directa?: boolean
          huespedes_temporales?: boolean
          id?: string
          larga_checkin_desde?: string | null
          larga_checkin_hasta?: string | null
          larga_estancia_maxima?: number | null
          larga_estancia_minima?: number
          larga_permite_cocheras?: boolean
          larga_permite_mascotas?: boolean
          larga_permite_ninos?: boolean
          larga_permite_visitas?: boolean
          unidad_id?: string | null
          updated_at?: string
        }
        Update: {
          condominio_id?: string
          corta_checkin_desde?: string | null
          corta_checkin_hasta?: string | null
          corta_estancia_maxima?: number | null
          corta_estancia_minima?: number
          corta_permite_cocheras?: boolean
          corta_permite_mascotas?: boolean
          corta_permite_ninos?: boolean
          corta_permite_visitas?: boolean
          created_at?: string
          diferencia_estancia?: boolean
          entrega_directa?: boolean
          huespedes_temporales?: boolean
          id?: string
          larga_checkin_desde?: string | null
          larga_checkin_hasta?: string | null
          larga_estancia_maxima?: number | null
          larga_estancia_minima?: number
          larga_permite_cocheras?: boolean
          larga_permite_mascotas?: boolean
          larga_permite_ninos?: boolean
          larga_permite_visitas?: boolean
          unidad_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "permiso_vivienda_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permiso_vivienda_unidad_id_fkey"
            columns: ["unidad_id"]
            isOneToOne: false
            referencedRelation: "unidad"
            referencedColumns: ["id"]
          },
        ]
      }
      porteria: {
        Row: {
          condominio_id: string
          created_at: string
          deleted_at: string | null
          id: string
          nombre: string
          telefono: string | null
          tipo: Database["public"]["Enums"]["tipo_porteria"]
          ubicacion: string | null
          updated_at: string
        }
        Insert: {
          condominio_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          nombre: string
          telefono?: string | null
          tipo: Database["public"]["Enums"]["tipo_porteria"]
          ubicacion?: string | null
          updated_at?: string
        }
        Update: {
          condominio_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          nombre?: string
          telefono?: string | null
          tipo?: Database["public"]["Enums"]["tipo_porteria"]
          ubicacion?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "porteria_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominio"
            referencedColumns: ["id"]
          },
        ]
      }
      pregunta_frecuente: {
        Row: {
          categoria: string
          condominio_id: string
          created_at: string
          id: string
          orden: number
          pregunta: string
          respuesta: string
          updated_at: string
        }
        Insert: {
          categoria: string
          condominio_id: string
          created_at?: string
          id?: string
          orden?: number
          pregunta: string
          respuesta: string
          updated_at?: string
        }
        Update: {
          categoria?: string
          condominio_id?: string
          created_at?: string
          id?: string
          orden?: number
          pregunta?: string
          respuesta?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pregunta_frecuente_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominio"
            referencedColumns: ["id"]
          },
        ]
      }
      publicacion: {
        Row: {
          categoria: Database["public"]["Enums"]["categoria_anuncio"]
          condominio_id: string
          creada_por: string | null
          created_at: string
          deleted_at: string | null
          descripcion: string | null
          id: string
          ocultar_resultados: boolean
          para_huespedes: boolean
          para_propietarios: boolean
          para_residentes: boolean
          publicada_desde: string
          publicada_hasta: string | null
          tipo: Database["public"]["Enums"]["tipo_publicacion"]
          titulo: string
          umbral: number | null
          updated_at: string
          url_video: string | null
          voto_multiple: boolean
        }
        Insert: {
          categoria: Database["public"]["Enums"]["categoria_anuncio"]
          condominio_id: string
          creada_por?: string | null
          created_at?: string
          deleted_at?: string | null
          descripcion?: string | null
          id?: string
          ocultar_resultados?: boolean
          para_huespedes?: boolean
          para_propietarios?: boolean
          para_residentes?: boolean
          publicada_desde?: string
          publicada_hasta?: string | null
          tipo?: Database["public"]["Enums"]["tipo_publicacion"]
          titulo: string
          umbral?: number | null
          updated_at?: string
          url_video?: string | null
          voto_multiple?: boolean
        }
        Update: {
          categoria?: Database["public"]["Enums"]["categoria_anuncio"]
          condominio_id?: string
          creada_por?: string | null
          created_at?: string
          deleted_at?: string | null
          descripcion?: string | null
          id?: string
          ocultar_resultados?: boolean
          para_huespedes?: boolean
          para_propietarios?: boolean
          para_residentes?: boolean
          publicada_desde?: string
          publicada_hasta?: string | null
          tipo?: Database["public"]["Enums"]["tipo_publicacion"]
          titulo?: string
          umbral?: number | null
          updated_at?: string
          url_video?: string | null
          voto_multiple?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "publicacion_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominio"
            referencedColumns: ["id"]
          },
        ]
      }
      reclamo: {
        Row: {
          area: Database["public"]["Enums"]["area_reclamo"]
          categoria: Database["public"]["Enums"]["categoria_reclamo"] | null
          condominio_id: string
          correo_contacto: string | null
          creado_por: string | null
          creado_por_nombre: string | null
          created_at: string
          descripcion: string
          destinatario:
            | Database["public"]["Enums"]["destinatario_reclamo"]
            | null
          estado: Database["public"]["Enums"]["estado_reclamo"]
          id: string
          medio_contacto_preferido:
            | Database["public"]["Enums"]["medio_contacto"]
            | null
          modelo_dispositivo: string | null
          numero: string | null
          resolucion: string | null
          resuelto_en: string | null
          resuelto_por: string | null
          telefono_contacto: string | null
          tipo: Database["public"]["Enums"]["tipo_reclamo"]
          titulo: string
          unidad_denunciada: string | null
          unidad_id: string | null
          updated_at: string
        }
        Insert: {
          area?: Database["public"]["Enums"]["area_reclamo"]
          categoria?: Database["public"]["Enums"]["categoria_reclamo"] | null
          condominio_id: string
          correo_contacto?: string | null
          creado_por?: string | null
          creado_por_nombre?: string | null
          created_at?: string
          descripcion: string
          destinatario?:
            | Database["public"]["Enums"]["destinatario_reclamo"]
            | null
          estado?: Database["public"]["Enums"]["estado_reclamo"]
          id?: string
          medio_contacto_preferido?:
            | Database["public"]["Enums"]["medio_contacto"]
            | null
          modelo_dispositivo?: string | null
          numero?: string | null
          resolucion?: string | null
          resuelto_en?: string | null
          resuelto_por?: string | null
          telefono_contacto?: string | null
          tipo: Database["public"]["Enums"]["tipo_reclamo"]
          titulo: string
          unidad_denunciada?: string | null
          unidad_id?: string | null
          updated_at?: string
        }
        Update: {
          area?: Database["public"]["Enums"]["area_reclamo"]
          categoria?: Database["public"]["Enums"]["categoria_reclamo"] | null
          condominio_id?: string
          correo_contacto?: string | null
          creado_por?: string | null
          creado_por_nombre?: string | null
          created_at?: string
          descripcion?: string
          destinatario?:
            | Database["public"]["Enums"]["destinatario_reclamo"]
            | null
          estado?: Database["public"]["Enums"]["estado_reclamo"]
          id?: string
          medio_contacto_preferido?:
            | Database["public"]["Enums"]["medio_contacto"]
            | null
          modelo_dispositivo?: string | null
          numero?: string | null
          resolucion?: string | null
          resuelto_en?: string | null
          resuelto_por?: string | null
          telefono_contacto?: string | null
          tipo?: Database["public"]["Enums"]["tipo_reclamo"]
          titulo?: string
          unidad_denunciada?: string | null
          unidad_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reclamo_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reclamo_unidad_denunciada_fkey"
            columns: ["unidad_denunciada"]
            isOneToOne: false
            referencedRelation: "unidad"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reclamo_unidad_id_fkey"
            columns: ["unidad_id"]
            isOneToOne: false
            referencedRelation: "unidad"
            referencedColumns: ["id"]
          },
        ]
      }
      reconocimiento: {
        Row: {
          condominio_id: string
          created_at: string
          id: string
          insignia_id: string
          motivo: string | null
          otorgado_en: string
          otorgado_por: string
          updated_at: string
          usuario_id: string
        }
        Insert: {
          condominio_id: string
          created_at?: string
          id?: string
          insignia_id: string
          motivo?: string | null
          otorgado_en?: string
          otorgado_por?: string
          updated_at?: string
          usuario_id: string
        }
        Update: {
          condominio_id?: string
          created_at?: string
          id?: string
          insignia_id?: string
          motivo?: string | null
          otorgado_en?: string
          otorgado_por?: string
          updated_at?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reconocimiento_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconocimiento_insignia_id_fkey"
            columns: ["insignia_id"]
            isOneToOne: false
            referencedRelation: "insignia"
            referencedColumns: ["id"]
          },
        ]
      }
      registro_turismo: {
        Row: {
          cargado_por: string | null
          created_at: string
          emitido_en: string | null
          id: string
          numero: string
          unidad_id: string
          updated_at: string
          vence_en: string | null
        }
        Insert: {
          cargado_por?: string | null
          created_at?: string
          emitido_en?: string | null
          id?: string
          numero: string
          unidad_id: string
          updated_at?: string
          vence_en?: string | null
        }
        Update: {
          cargado_por?: string | null
          created_at?: string
          emitido_en?: string | null
          id?: string
          numero?: string
          unidad_id?: string
          updated_at?: string
          vence_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registro_turismo_unidad_id_fkey"
            columns: ["unidad_id"]
            isOneToOne: true
            referencedRelation: "unidad"
            referencedColumns: ["id"]
          },
        ]
      }
      reglamento: {
        Row: {
          archivo_path: string | null
          condominio_id: string
          contenido: Json
          created_at: string
          id: string
          tipo: Database["public"]["Enums"]["tipo_regla"]
          titulo: string
          updated_at: string
          version: number
          vigente: boolean
        }
        Insert: {
          archivo_path?: string | null
          condominio_id: string
          contenido?: Json
          created_at?: string
          id?: string
          tipo: Database["public"]["Enums"]["tipo_regla"]
          titulo: string
          updated_at?: string
          version?: number
          vigente?: boolean
        }
        Update: {
          archivo_path?: string | null
          condominio_id?: string
          contenido?: Json
          created_at?: string
          id?: string
          tipo?: Database["public"]["Enums"]["tipo_regla"]
          titulo?: string
          updated_at?: string
          version?: number
          vigente?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "reglamento_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominio"
            referencedColumns: ["id"]
          },
        ]
      }
      reporte_legal: {
        Row: {
          created_at: string
          enviado_en: string | null
          enviado_por: string | null
          error_detalle: string | null
          estado: Database["public"]["Enums"]["estado_reporte_legal"]
          id: string
          invitado_id: string
          momento: Database["public"]["Enums"]["momento_reporte"]
          respuesta: Json | null
          rnt_referencia: string | null
          tipo: Database["public"]["Enums"]["tipo_reporte_legal"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          enviado_en?: string | null
          enviado_por?: string | null
          error_detalle?: string | null
          estado?: Database["public"]["Enums"]["estado_reporte_legal"]
          id?: string
          invitado_id: string
          momento: Database["public"]["Enums"]["momento_reporte"]
          respuesta?: Json | null
          rnt_referencia?: string | null
          tipo: Database["public"]["Enums"]["tipo_reporte_legal"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          enviado_en?: string | null
          enviado_por?: string | null
          error_detalle?: string | null
          estado?: Database["public"]["Enums"]["estado_reporte_legal"]
          id?: string
          invitado_id?: string
          momento?: Database["public"]["Enums"]["momento_reporte"]
          respuesta?: Json | null
          rnt_referencia?: string | null
          tipo?: Database["public"]["Enums"]["tipo_reporte_legal"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reporte_legal_invitado_id_fkey"
            columns: ["invitado_id"]
            isOneToOne: false
            referencedRelation: "invitado"
            referencedColumns: ["id"]
          },
        ]
      }
      reserva_zona: {
        Row: {
          acompanantes: number
          comentarios: string | null
          comprobante_path: string | null
          created_at: string
          estado: Database["public"]["Enums"]["estado_reserva"]
          fecha: string
          hora_fin: string
          hora_inicio: string
          id: string
          motivo_rechazo: string | null
          numero: string | null
          resuelta_en: string | null
          resuelta_por: string | null
          solicitada_por: string | null
          unidad_id: string
          updated_at: string
          zona_id: string
        }
        Insert: {
          acompanantes?: number
          comentarios?: string | null
          comprobante_path?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_reserva"]
          fecha: string
          hora_fin: string
          hora_inicio: string
          id?: string
          motivo_rechazo?: string | null
          numero?: string | null
          resuelta_en?: string | null
          resuelta_por?: string | null
          solicitada_por?: string | null
          unidad_id: string
          updated_at?: string
          zona_id: string
        }
        Update: {
          acompanantes?: number
          comentarios?: string | null
          comprobante_path?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_reserva"]
          fecha?: string
          hora_fin?: string
          hora_inicio?: string
          id?: string
          motivo_rechazo?: string | null
          numero?: string | null
          resuelta_en?: string | null
          resuelta_por?: string | null
          solicitada_por?: string | null
          unidad_id?: string
          updated_at?: string
          zona_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reserva_zona_unidad_id_fkey"
            columns: ["unidad_id"]
            isOneToOne: false
            referencedRelation: "unidad"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reserva_zona_zona_id_fkey"
            columns: ["zona_id"]
            isOneToOne: false
            referencedRelation: "zona_comun"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitud_reporte: {
        Row: {
          condominio_id: string
          created_at: string
          desde: string | null
          filas: number | null
          hasta: string | null
          id: string
          solicitada_por: string | null
          tipo: Database["public"]["Enums"]["tipo_reporte"]
          todo_historial: boolean
          updated_at: string
        }
        Insert: {
          condominio_id: string
          created_at?: string
          desde?: string | null
          filas?: number | null
          hasta?: string | null
          id?: string
          solicitada_por?: string | null
          tipo: Database["public"]["Enums"]["tipo_reporte"]
          todo_historial?: boolean
          updated_at?: string
        }
        Update: {
          condominio_id?: string
          created_at?: string
          desde?: string | null
          filas?: number | null
          hasta?: string | null
          id?: string
          solicitada_por?: string | null
          tipo?: Database["public"]["Enums"]["tipo_reporte"]
          todo_historial?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitud_reporte_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominio"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_alojamiento: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          nombre: string
          rol: Database["public"]["Enums"]["rol_staff_alojamiento"]
          telefono: string | null
          unidad_id: string
          updated_at: string
          usuario_id: string | null
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre: string
          rol: Database["public"]["Enums"]["rol_staff_alojamiento"]
          telefono?: string | null
          unidad_id: string
          updated_at?: string
          usuario_id?: string | null
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre?: string
          rol?: Database["public"]["Enums"]["rol_staff_alojamiento"]
          telefono?: string | null
          unidad_id?: string
          updated_at?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_alojamiento_unidad_id_fkey"
            columns: ["unidad_id"]
            isOneToOne: false
            referencedRelation: "unidad"
            referencedColumns: ["id"]
          },
        ]
      }
      suscripcion_renta_corta: {
        Row: {
          cancelada_en: string | null
          created_at: string
          descripcion: string | null
          estacionamientos_huesped: number
          estado: Database["public"]["Enums"]["estado_suscripcion"]
          id: string
          iniciada_en: string
          max_huespedes: number | null
          ocultar_contacto: boolean
          ocultar_numero: boolean
          tiene_antirruido: boolean
          tiene_no_fumar: boolean
          tiene_sensor: boolean
          unidad_id: string
          updated_at: string
          verificaciones_base: number
          verificada_en: string | null
          verificada_por: string | null
        }
        Insert: {
          cancelada_en?: string | null
          created_at?: string
          descripcion?: string | null
          estacionamientos_huesped?: number
          estado?: Database["public"]["Enums"]["estado_suscripcion"]
          id?: string
          iniciada_en?: string
          max_huespedes?: number | null
          ocultar_contacto?: boolean
          ocultar_numero?: boolean
          tiene_antirruido?: boolean
          tiene_no_fumar?: boolean
          tiene_sensor?: boolean
          unidad_id: string
          updated_at?: string
          verificaciones_base?: number
          verificada_en?: string | null
          verificada_por?: string | null
        }
        Update: {
          cancelada_en?: string | null
          created_at?: string
          descripcion?: string | null
          estacionamientos_huesped?: number
          estado?: Database["public"]["Enums"]["estado_suscripcion"]
          id?: string
          iniciada_en?: string
          max_huespedes?: number | null
          ocultar_contacto?: boolean
          ocultar_numero?: boolean
          tiene_antirruido?: boolean
          tiene_no_fumar?: boolean
          tiene_sensor?: boolean
          unidad_id?: string
          updated_at?: string
          verificaciones_base?: number
          verificada_en?: string | null
          verificada_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suscripcion_renta_corta_unidad_id_fkey"
            columns: ["unidad_id"]
            isOneToOne: true
            referencedRelation: "unidad"
            referencedColumns: ["id"]
          },
        ]
      }
      tipologia: {
        Row: {
          banos: number | null
          condominio_id: string
          created_at: string
          habitaciones: number | null
          id: string
          metros_cuadrados: number | null
          nombre: string
          updated_at: string
        }
        Insert: {
          banos?: number | null
          condominio_id: string
          created_at?: string
          habitaciones?: number | null
          id?: string
          metros_cuadrados?: number | null
          nombre: string
          updated_at?: string
        }
        Update: {
          banos?: number | null
          condominio_id?: string
          created_at?: string
          habitaciones?: number | null
          id?: string
          metros_cuadrados?: number | null
          nombre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tipologia_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominio"
            referencedColumns: ["id"]
          },
        ]
      }
      torre: {
        Row: {
          almacenes_privados: number
          cocheras_privadas: number
          cocheras_visitas: number
          condominio_id: string
          created_at: string
          deleted_at: string | null
          descripcion: string | null
          entradas_peatonales: number
          entradas_vehiculares: number
          id: string
          nombre: string
          nomenclatura_desde: string | null
          nomenclatura_hasta: string | null
          numero: number
          pisos: number | null
          sotanos: number | null
          updated_at: string
        }
        Insert: {
          almacenes_privados?: number
          cocheras_privadas?: number
          cocheras_visitas?: number
          condominio_id: string
          created_at?: string
          deleted_at?: string | null
          descripcion?: string | null
          entradas_peatonales?: number
          entradas_vehiculares?: number
          id?: string
          nombre: string
          nomenclatura_desde?: string | null
          nomenclatura_hasta?: string | null
          numero: number
          pisos?: number | null
          sotanos?: number | null
          updated_at?: string
        }
        Update: {
          almacenes_privados?: number
          cocheras_privadas?: number
          cocheras_visitas?: number
          condominio_id?: string
          created_at?: string
          deleted_at?: string | null
          descripcion?: string | null
          entradas_peatonales?: number
          entradas_vehiculares?: number
          id?: string
          nombre?: string
          nomenclatura_desde?: string | null
          nomenclatura_hasta?: string | null
          numero?: number
          pisos?: number | null
          sotanos?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "torre_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominio"
            referencedColumns: ["id"]
          },
        ]
      }
      turno_guardia: {
        Row: {
          created_at: string
          dia_semana: number
          hora_fin: string
          hora_inicio: string
          id: string
          membresia_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dia_semana: number
          hora_fin: string
          hora_inicio: string
          id?: string
          membresia_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dia_semana?: number
          hora_fin?: string
          hora_inicio?: string
          id?: string
          membresia_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "turno_guardia_membresia_id_fkey"
            columns: ["membresia_id"]
            isOneToOne: false
            referencedRelation: "membresia_condominio"
            referencedColumns: ["id"]
          },
        ]
      }
      turno_override: {
        Row: {
          created_at: string
          fecha: string
          hora_fin: string | null
          hora_inicio: string | null
          id: string
          membresia_id: string
          motivo: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          fecha: string
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          membresia_id: string
          motivo?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          fecha?: string
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          membresia_id?: string
          motivo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "turno_override_membresia_id_fkey"
            columns: ["membresia_id"]
            isOneToOne: false
            referencedRelation: "membresia_condominio"
            referencedColumns: ["id"]
          },
        ]
      }
      unidad: {
        Row: {
          codigo: string
          condominio_id: string
          created_at: string
          deleted_at: string | null
          estado: Database["public"]["Enums"]["estado_unidad"]
          id: string
          piso: number
          tipologia_id: string | null
          torre_id: string
          updated_at: string
        }
        Insert: {
          codigo: string
          condominio_id: string
          created_at?: string
          deleted_at?: string | null
          estado?: Database["public"]["Enums"]["estado_unidad"]
          id?: string
          piso: number
          tipologia_id?: string | null
          torre_id: string
          updated_at?: string
        }
        Update: {
          codigo?: string
          condominio_id?: string
          created_at?: string
          deleted_at?: string | null
          estado?: Database["public"]["Enums"]["estado_unidad"]
          id?: string
          piso?: number
          tipologia_id?: string | null
          torre_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unidad_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unidad_tipologia_id_fkey"
            columns: ["tipologia_id"]
            isOneToOne: false
            referencedRelation: "tipologia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unidad_torre_id_fkey"
            columns: ["torre_id"]
            isOneToOne: false
            referencedRelation: "torre"
            referencedColumns: ["id"]
          },
        ]
      }
      vehiculo_residente: {
        Row: {
          color: string | null
          created_at: string
          deleted_at: string | null
          id: string
          marca: string | null
          placa: string
          registrado_por: string | null
          tipo: Database["public"]["Enums"]["tipo_vehiculo"]
          unidad_id: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          marca?: string | null
          placa: string
          registrado_por?: string | null
          tipo: Database["public"]["Enums"]["tipo_vehiculo"]
          unidad_id: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          marca?: string | null
          placa?: string
          registrado_por?: string | null
          tipo?: Database["public"]["Enums"]["tipo_vehiculo"]
          unidad_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehiculo_residente_unidad_id_fkey"
            columns: ["unidad_id"]
            isOneToOne: false
            referencedRelation: "unidad"
            referencedColumns: ["id"]
          },
        ]
      }
      vehiculo_visita: {
        Row: {
          created_at: string
          id: string
          placa: string
          tipo: Database["public"]["Enums"]["tipo_vehiculo"] | null
          updated_at: string
          visita_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          placa: string
          tipo?: Database["public"]["Enums"]["tipo_vehiculo"] | null
          updated_at?: string
          visita_id: string
        }
        Update: {
          created_at?: string
          id?: string
          placa?: string
          tipo?: Database["public"]["Enums"]["tipo_vehiculo"] | null
          updated_at?: string
          visita_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehiculo_visita_visita_id_fkey"
            columns: ["visita_id"]
            isOneToOne: false
            referencedRelation: "visita"
            referencedColumns: ["id"]
          },
        ]
      }
      verificacion_antecedentes: {
        Row: {
          created_at: string
          ejecutada_en: string
          id: string
          invitado_id: string
          origen: Database["public"]["Enums"]["origen_verificacion"]
          paquete_id: string | null
          periodo_id: string | null
          proveedor: string | null
          referencia_externa: string | null
          respuesta: Json | null
          resultado: Database["public"]["Enums"]["resultado_verificacion"]
          unidad_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ejecutada_en?: string
          id?: string
          invitado_id: string
          origen: Database["public"]["Enums"]["origen_verificacion"]
          paquete_id?: string | null
          periodo_id?: string | null
          proveedor?: string | null
          referencia_externa?: string | null
          respuesta?: Json | null
          resultado?: Database["public"]["Enums"]["resultado_verificacion"]
          unidad_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ejecutada_en?: string
          id?: string
          invitado_id?: string
          origen?: Database["public"]["Enums"]["origen_verificacion"]
          paquete_id?: string | null
          periodo_id?: string | null
          proveedor?: string | null
          referencia_externa?: string | null
          respuesta?: Json | null
          resultado?: Database["public"]["Enums"]["resultado_verificacion"]
          unidad_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "verificacion_antecedentes_invitado_id_fkey"
            columns: ["invitado_id"]
            isOneToOne: true
            referencedRelation: "invitado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verificacion_antecedentes_paquete_id_fkey"
            columns: ["paquete_id"]
            isOneToOne: false
            referencedRelation: "paquete_verificaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verificacion_antecedentes_periodo_id_fkey"
            columns: ["periodo_id"]
            isOneToOne: false
            referencedRelation: "periodo_suscripcion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verificacion_antecedentes_unidad_id_fkey"
            columns: ["unidad_id"]
            isOneToOne: false
            referencedRelation: "unidad"
            referencedColumns: ["id"]
          },
        ]
      }
      verificacion_documento: {
        Row: {
          created_at: string
          documento_original_path: string | null
          documento_tomado_path: string | null
          estado: Database["public"]["Enums"]["estado_verificacion"]
          id: string
          invitado_id: string
          observaciones: string | null
          updated_at: string
          verificado_en: string | null
          verificado_por: string | null
        }
        Insert: {
          created_at?: string
          documento_original_path?: string | null
          documento_tomado_path?: string | null
          estado?: Database["public"]["Enums"]["estado_verificacion"]
          id?: string
          invitado_id: string
          observaciones?: string | null
          updated_at?: string
          verificado_en?: string | null
          verificado_por?: string | null
        }
        Update: {
          created_at?: string
          documento_original_path?: string | null
          documento_tomado_path?: string | null
          estado?: Database["public"]["Enums"]["estado_verificacion"]
          id?: string
          invitado_id?: string
          observaciones?: string | null
          updated_at?: string
          verificado_en?: string | null
          verificado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verificacion_documento_invitado_id_fkey"
            columns: ["invitado_id"]
            isOneToOne: true
            referencedRelation: "invitado"
            referencedColumns: ["id"]
          },
        ]
      }
      visita: {
        Row: {
          anotaciones_ingreso: string | null
          anotaciones_salida: string | null
          anunciada_en: string | null
          anunciada_por: string | null
          autorizada_por: string | null
          autorizada_por_nombre: string | null
          codigo_acceso: string | null
          condominio_id: string
          created_at: string
          deleted_at: string | null
          dias_laborales: string | null
          es_evento: boolean
          estado: Database["public"]["Enums"]["estado_visita"]
          fecha_desde: string | null
          fecha_hasta: string | null
          fotos_ingreso: string[]
          fotos_salida: string[]
          hora_estimada_llegada: string | null
          hora_estimada_salida: string | null
          id: string
          ingreso_en: string | null
          instruccion_documento: Database["public"]["Enums"]["instruccion_documento"]
          nombre_evento: string | null
          para_administracion: boolean
          profesion: string | null
          registrada_por: string | null
          salida_en: string | null
          tipo: Database["public"]["Enums"]["tipo_visita"]
          tipo_notificacion: Database["public"]["Enums"]["tipo_notificacion"]
          unidad_id: string | null
          updated_at: string
        }
        Insert: {
          anotaciones_ingreso?: string | null
          anotaciones_salida?: string | null
          anunciada_en?: string | null
          anunciada_por?: string | null
          autorizada_por?: string | null
          autorizada_por_nombre?: string | null
          codigo_acceso?: string | null
          condominio_id: string
          created_at?: string
          deleted_at?: string | null
          dias_laborales?: string | null
          es_evento?: boolean
          estado?: Database["public"]["Enums"]["estado_visita"]
          fecha_desde?: string | null
          fecha_hasta?: string | null
          fotos_ingreso?: string[]
          fotos_salida?: string[]
          hora_estimada_llegada?: string | null
          hora_estimada_salida?: string | null
          id?: string
          ingreso_en?: string | null
          instruccion_documento?: Database["public"]["Enums"]["instruccion_documento"]
          nombre_evento?: string | null
          para_administracion?: boolean
          profesion?: string | null
          registrada_por?: string | null
          salida_en?: string | null
          tipo: Database["public"]["Enums"]["tipo_visita"]
          tipo_notificacion?: Database["public"]["Enums"]["tipo_notificacion"]
          unidad_id?: string | null
          updated_at?: string
        }
        Update: {
          anotaciones_ingreso?: string | null
          anotaciones_salida?: string | null
          anunciada_en?: string | null
          anunciada_por?: string | null
          autorizada_por?: string | null
          autorizada_por_nombre?: string | null
          codigo_acceso?: string | null
          condominio_id?: string
          created_at?: string
          deleted_at?: string | null
          dias_laborales?: string | null
          es_evento?: boolean
          estado?: Database["public"]["Enums"]["estado_visita"]
          fecha_desde?: string | null
          fecha_hasta?: string | null
          fotos_ingreso?: string[]
          fotos_salida?: string[]
          hora_estimada_llegada?: string | null
          hora_estimada_salida?: string | null
          id?: string
          ingreso_en?: string | null
          instruccion_documento?: Database["public"]["Enums"]["instruccion_documento"]
          nombre_evento?: string | null
          para_administracion?: boolean
          profesion?: string | null
          registrada_por?: string | null
          salida_en?: string | null
          tipo?: Database["public"]["Enums"]["tipo_visita"]
          tipo_notificacion?: Database["public"]["Enums"]["tipo_notificacion"]
          unidad_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "visita_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visita_unidad_id_fkey"
            columns: ["unidad_id"]
            isOneToOne: false
            referencedRelation: "unidad"
            referencedColumns: ["id"]
          },
        ]
      }
      visita_evento: {
        Row: {
          actor_id: string | null
          completado_en: string
          created_at: string
          id: string
          invitado_id: string
          paso: Database["public"]["Enums"]["paso_visita"]
          updated_at: string
        }
        Insert: {
          actor_id?: string | null
          completado_en?: string
          created_at?: string
          id?: string
          invitado_id: string
          paso: Database["public"]["Enums"]["paso_visita"]
          updated_at?: string
        }
        Update: {
          actor_id?: string | null
          completado_en?: string
          created_at?: string
          id?: string
          invitado_id?: string
          paso?: Database["public"]["Enums"]["paso_visita"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "visita_evento_invitado_id_fkey"
            columns: ["invitado_id"]
            isOneToOne: false
            referencedRelation: "invitado"
            referencedColumns: ["id"]
          },
        ]
      }
      voto: {
        Row: {
          created_at: string
          emitido_en: string
          id: string
          opcion_id: string
          publicacion_id: string
          unidad_id: string | null
          updated_at: string
          usuario_id: string
        }
        Insert: {
          created_at?: string
          emitido_en?: string
          id?: string
          opcion_id: string
          publicacion_id: string
          unidad_id?: string | null
          updated_at?: string
          usuario_id?: string
        }
        Update: {
          created_at?: string
          emitido_en?: string
          id?: string
          opcion_id?: string
          publicacion_id?: string
          unidad_id?: string | null
          updated_at?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voto_opcion_id_fkey"
            columns: ["opcion_id"]
            isOneToOne: false
            referencedRelation: "opcion_voto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voto_publicacion_id_fkey"
            columns: ["publicacion_id"]
            isOneToOne: false
            referencedRelation: "publicacion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voto_unidad_id_fkey"
            columns: ["unidad_id"]
            isOneToOne: false
            referencedRelation: "unidad"
            referencedColumns: ["id"]
          },
        ]
      }
      zona_comun: {
        Row: {
          activa: boolean
          capacidad_maxima: number | null
          condominio_id: string
          costo_limpieza: number
          costo_reserva: number
          created_at: string
          cupos_simultaneos: number
          deleted_at: string | null
          descripcion: string | null
          dias_habilitados: number[]
          duracion_maxima_min: number | null
          duracion_minima_min: number | null
          emoji: string | null
          horario_apertura: string | null
          horario_cierre: string | null
          id: string
          imagen_path: string | null
          moneda: string | null
          monto_garantia: number
          nombre: string
          permite_estancia_corta: boolean
          permite_estancia_larga: boolean
          reglamento: string | null
          requiere_aprobacion: boolean
          restringida_huesped: boolean
          tiempo_min_entre_reservas: number
          tipo: string | null
          updated_at: string
          usa_slots: boolean
        }
        Insert: {
          activa?: boolean
          capacidad_maxima?: number | null
          condominio_id: string
          costo_limpieza?: number
          costo_reserva?: number
          created_at?: string
          cupos_simultaneos?: number
          deleted_at?: string | null
          descripcion?: string | null
          dias_habilitados?: number[]
          duracion_maxima_min?: number | null
          duracion_minima_min?: number | null
          emoji?: string | null
          horario_apertura?: string | null
          horario_cierre?: string | null
          id?: string
          imagen_path?: string | null
          moneda?: string | null
          monto_garantia?: number
          nombre: string
          permite_estancia_corta?: boolean
          permite_estancia_larga?: boolean
          reglamento?: string | null
          requiere_aprobacion?: boolean
          restringida_huesped?: boolean
          tiempo_min_entre_reservas?: number
          tipo?: string | null
          updated_at?: string
          usa_slots?: boolean
        }
        Update: {
          activa?: boolean
          capacidad_maxima?: number | null
          condominio_id?: string
          costo_limpieza?: number
          costo_reserva?: number
          created_at?: string
          cupos_simultaneos?: number
          deleted_at?: string | null
          descripcion?: string | null
          dias_habilitados?: number[]
          duracion_maxima_min?: number | null
          duracion_minima_min?: number | null
          emoji?: string | null
          horario_apertura?: string | null
          horario_cierre?: string | null
          id?: string
          imagen_path?: string | null
          moneda?: string | null
          monto_garantia?: number
          nombre?: string
          permite_estancia_corta?: boolean
          permite_estancia_larga?: boolean
          reglamento?: string | null
          requiere_aprobacion?: boolean
          restringida_huesped?: boolean
          tiempo_min_entre_reservas?: number
          tipo?: string | null
          updated_at?: string
          usa_slots?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "zona_comun_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominio"
            referencedColumns: ["id"]
          },
        ]
      }
      zona_fecha_especial: {
        Row: {
          created_at: string
          fecha: string
          hora_apertura: string | null
          hora_cierre: string | null
          id: string
          motivo: string | null
          tipo: Database["public"]["Enums"]["tipo_fecha_especial"]
          updated_at: string
          zona_id: string
        }
        Insert: {
          created_at?: string
          fecha: string
          hora_apertura?: string | null
          hora_cierre?: string | null
          id?: string
          motivo?: string | null
          tipo: Database["public"]["Enums"]["tipo_fecha_especial"]
          updated_at?: string
          zona_id: string
        }
        Update: {
          created_at?: string
          fecha?: string
          hora_apertura?: string | null
          hora_cierre?: string | null
          id?: string
          motivo?: string | null
          tipo?: Database["public"]["Enums"]["tipo_fecha_especial"]
          updated_at?: string
          zona_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zona_fecha_especial_zona_id_fkey"
            columns: ["zona_id"]
            isOneToOne: false
            referencedRelation: "zona_comun"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      aceptar_invitacion: { Args: { p_token: string }; Returns: string }
      buscar_placa: {
        Args: { p_condominio_id: string; p_placa: string }
        Returns: {
          detalle: string
          placa: string
          procedencia: string
          tipo: string
          torre_numero: number
          unidad_codigo: string
          vigente: boolean
        }[]
      }
      condominio_de_unidad: { Args: { p_unidad_id: string }; Returns: string }
      consultar_invitacion: {
        Args: { p_token: string }
        Returns: {
          condominio: string
          correo: string
          expira_en: string
          nombre: string
          rol: string
          unidad: string
          vigente: boolean
        }[]
      }
      consumo_verificaciones: {
        Args: { p_unidad_id: string }
        Returns: {
          incluidas: number
          suplementarias: number
          suplementarias_usadas: number
          suscritas_usadas: number
          vencimiento_suplementarias: string
        }[]
      }
      crear_invitacion: {
        Args: {
          p_ambito: Database["public"]["Enums"]["ambito_invitacion"]
          p_condominio_id: string
          p_correo: string
          p_nombre: string
          p_rol_condominio?: Database["public"]["Enums"]["rol_condominio"]
          p_rol_unidad?: Database["public"]["Enums"]["rol_unidad"]
          p_unidad_id?: string
        }
        Returns: {
          invitacion_id: string
          token: string
        }[]
      }
      cuadro_honor: {
        Args: { p_condominio_id: string }
        Returns: {
          codigo: string
          insignias: number
          periodos_al_dia: number
          periodos_totales: number
          responsable: string
          responsable_usuario_id: string
          torre_numero: number
          unidad_id: string
        }[]
      }
      detalle_votacion: {
        Args: { p_publicacion_id: string }
        Returns: {
          emitido_en: string
          opcion: string
          unidad: string
          votante: string
        }[]
      }
      es_admin_condominio: {
        Args: { p_condominio_id: string }
        Returns: boolean
      }
      es_huesped_de_unidad: { Args: { p_unidad_id: string }; Returns: boolean }
      es_miembro_condominio: {
        Args: { p_condominio_id: string }
        Returns: boolean
      }
      es_miembro_unidad: { Args: { p_unidad_id: string }; Returns: boolean }
      es_personal_condominio: {
        Args: { p_condominio_id: string }
        Returns: boolean
      }
      es_residente_o_huesped: {
        Args: { p_unidad_id: string }
        Returns: boolean
      }
      notificar_unidad: {
        Args: {
          p_entidad_id?: string
          p_entidad_tipo?: string
          p_excepto?: string
          p_mensaje: string
          p_tipo: Database["public"]["Enums"]["motivo_notificacion"]
          p_titulo: string
          p_unidad_id: string
        }
        Returns: undefined
      }
      pendientes_votacion: {
        Args: { p_publicacion_id: string }
        Returns: {
          propietario: string
          unidad: string
        }[]
      }
      permisos_de_unidad: {
        Args: { p_unidad_id: string }
        Returns: {
          condominio_id: string
          corta_checkin_desde: string | null
          corta_checkin_hasta: string | null
          corta_estancia_maxima: number | null
          corta_estancia_minima: number
          corta_permite_cocheras: boolean
          corta_permite_mascotas: boolean
          corta_permite_ninos: boolean
          corta_permite_visitas: boolean
          created_at: string
          diferencia_estancia: boolean
          entrega_directa: boolean
          huespedes_temporales: boolean
          id: string
          larga_checkin_desde: string | null
          larga_checkin_hasta: string | null
          larga_estancia_maxima: number | null
          larga_estancia_minima: number
          larga_permite_cocheras: boolean
          larga_permite_mascotas: boolean
          larga_permite_ninos: boolean
          larga_permite_visitas: boolean
          unidad_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "permiso_vivienda"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      placa_normalizada: { Args: { p_placa: string }; Returns: string }
      puede_invitar_a_unidad: {
        Args: { p_unidad_id: string }
        Returns: boolean
      }
      puede_operar_unidad: { Args: { p_unidad_id: string }; Returns: boolean }
      puede_ver_conversacion: {
        Args: { p_conversacion_id: string }
        Returns: boolean
      }
      puede_ver_conversacion_fila: {
        Args: {
          p_ambito: Database["public"]["Enums"]["ambito_grupo"]
          p_area: Database["public"]["Enums"]["area_conversacion"]
          p_condominio_id: string
          p_conversacion_id: string
          p_tipo: Database["public"]["Enums"]["tipo_conversacion"]
          p_unidad_id: string
        }
        Returns: boolean
      }
      puede_ver_reclamo: { Args: { p_reclamo_id: string }; Returns: boolean }
      puede_ver_reserva: { Args: { p_reserva_id: string }; Returns: boolean }
      puede_ver_visita: { Args: { p_visita_id: string }; Returns: boolean }
      rechazar_invitacion: { Args: { p_token: string }; Returns: undefined }
      reporte_areas_comunes: {
        Args: { p_condominio_id: string; p_desde?: string; p_hasta?: string }
        Returns: {
          estado: string
          fecha: string
          horario: string
          participantes: number
          resuelta_por: string
          unidad: string
          zona: string
        }[]
      }
      reporte_correspondencia: {
        Args: { p_condominio_id: string; p_desde?: string; p_hasta?: string }
        Returns: {
          categoria: string
          destinatario: string
          empresa: string
          entregada: string
          entregada_a: string
          estado: string
          registrada: string
          unidad: string
        }[]
      }
      reporte_visitantes: {
        Args: { p_condominio_id: string; p_desde?: string; p_hasta?: string }
        Returns: {
          documento: string
          fecha: string
          ingreso: string
          placas: string
          registro: string
          salida: string
          tipo: string
          unidad: string
          visitante: string
        }[]
      }
      resultados_publicacion: {
        Args: { p_publicacion_id: string }
        Returns: {
          etiqueta: string
          opcion_id: string
          votos: number
        }[]
      }
      resumen_cuotas: {
        Args: { p_condominio_id: string }
        Returns: {
          al_dia: number
          atrasados: number
          esperado: number
          moneda: string
          periodo: string
          recibido: number
        }[]
      }
      rnt_vigente: { Args: { p_unidad_id: string }; Returns: boolean }
      unidades_renta_corta: {
        Args: { p_como_personal?: boolean; p_condominio_id: string }
        Returns: {
          administrador: string
          administrador_tel: string
          anfitrion: string
          anfitrion_tel: string
          codigo: string
          estado: string
          permite_mascotas: boolean
          piso: number
          propietario: string
          propietario_tel: string
          tiene_antirruido: boolean
          tiene_no_fumar: boolean
          tiene_sensor: boolean
          torre_numero: number
          unidad_id: string
          verificada_en: string
        }[]
      }
      usuario_actual: { Args: never; Returns: string }
    }
    Enums: {
      ambito_grupo: "residentes" | "propietarios"
      ambito_invitacion: "condominio" | "unidad"
      area_conversacion: "seguridad" | "administracion"
      area_reclamo:
        | "condominio"
        | "aplicacion"
        | "constructora"
        | "documentos_antiguos"
      asistencia_participante: "pendiente" | "presente" | "salio"
      categoria_anuncio:
        | "servicios"
        | "eventos"
        | "mantenimiento"
        | "seguridad"
        | "administracion"
      categoria_correspondencia: "delivery" | "sobres" | "paqueteria"
      categoria_reclamo:
        | "convivencia"
        | "mantenimiento"
        | "seguridad"
        | "pagos"
        | "servicios"
      destinatario_reclamo: "administrador" | "propietario" | "aplicacion"
      estado_correspondencia: "no_recibido" | "en_porteria" | "entregado"
      estado_encomienda: "buen_estado" | "estado_intermedio" | "mal_estado"
      estado_invitacion:
        | "pendiente"
        | "aceptada"
        | "rechazada"
        | "revocada"
        | "expirada"
      estado_reclamo: "pendiente" | "en_curso" | "resuelto"
      estado_reporte_legal: "pendiente" | "enviado" | "fallido"
      estado_reserva:
        | "pendiente"
        | "aprobada"
        | "rechazada"
        | "en_curso"
        | "finalizada"
        | "cancelada"
      estado_suscripcion: "activa" | "vencida" | "cancelada"
      estado_unidad:
        | "disponible"
        | "invitado"
        | "aceptado"
        | "config_pendiente"
        | "config_completado"
      estado_verificacion: "pendiente" | "verificado" | "no_coincide"
      estado_visita: "programada" | "ingresada" | "finalizada" | "cancelada"
      instruccion_documento: "verificar" | "no_verificar"
      medio_contacto: "correo" | "telefono" | "cualquiera"
      momento_reporte: "entrada" | "salida"
      motivo_notificacion:
        | "correspondencia_recibida"
        | "correspondencia_entregada"
        | "visita_ingreso"
        | "reserva_aprobada"
        | "reserva_rechazada"
        | "anuncio_publicado"
        | "reconocimiento_recibido"
      origen_pago: "manual" | "carga_masiva"
      origen_verificacion: "paquete_base" | "paquete_complementario"
      paso_visita:
        | "preregistro_enviado"
        | "documentacion_completa"
        | "terminos_aceptados"
        | "verificacion_aprobada"
        | "reporte_entrada"
        | "reporte_salida"
      resultado_verificacion:
        | "pendiente"
        | "aprobada"
        | "rechazada"
        | "error_proveedor"
      rol_condominio: "administrador" | "coadministrador" | "guardia"
      rol_staff_alojamiento: "coanfitrion" | "limpieza" | "mantenimiento"
      rol_unidad:
        | "propietario"
        | "inquilino_lider"
        | "residente"
        | "corresidente"
        | "coadministrador"
        | "huesped_temporal"
      tipo_conversacion: "directa" | "area" | "grupo"
      tipo_documento:
        | "cedula_ciudadania"
        | "cedula_extranjeria"
        | "dni"
        | "carne_extranjeria"
        | "pep"
        | "pasaporte"
      tipo_estacionamiento: "visitante" | "privado"
      tipo_fecha_especial: "cerrada" | "horario_especial"
      tipo_llamada: "entrante" | "saliente" | "perdida"
      tipo_notificacion: "solo_notificar" | "notificar_y_anunciar"
      tipo_participante: "residente" | "visitante" | "huesped_temporal"
      tipo_porteria: "entrada_principal" | "acceso_vehicular"
      tipo_publicacion: "anuncio" | "encuesta"
      tipo_reclamo:
        | "consulta"
        | "reclamo"
        | "sugerencia"
        | "pregunta"
        | "queja"
        | "idea"
        | "soporte"
      tipo_regla:
        | "residente_permanente"
        | "huesped_temporal"
        | "guardia_seguridad"
      tipo_reporte: "visitantes" | "correspondencia" | "areas_comunes"
      tipo_reporte_legal: "tra" | "sire"
      tipo_vehiculo: "auto" | "camioneta" | "moto" | "bus" | "van"
      tipo_visita: "amigos" | "temporal" | "permanente" | "huesped_temporal"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      ambito_grupo: ["residentes", "propietarios"],
      ambito_invitacion: ["condominio", "unidad"],
      area_conversacion: ["seguridad", "administracion"],
      area_reclamo: [
        "condominio",
        "aplicacion",
        "constructora",
        "documentos_antiguos",
      ],
      asistencia_participante: ["pendiente", "presente", "salio"],
      categoria_anuncio: [
        "servicios",
        "eventos",
        "mantenimiento",
        "seguridad",
        "administracion",
      ],
      categoria_correspondencia: ["delivery", "sobres", "paqueteria"],
      categoria_reclamo: [
        "convivencia",
        "mantenimiento",
        "seguridad",
        "pagos",
        "servicios",
      ],
      destinatario_reclamo: ["administrador", "propietario", "aplicacion"],
      estado_correspondencia: ["no_recibido", "en_porteria", "entregado"],
      estado_encomienda: ["buen_estado", "estado_intermedio", "mal_estado"],
      estado_invitacion: [
        "pendiente",
        "aceptada",
        "rechazada",
        "revocada",
        "expirada",
      ],
      estado_reclamo: ["pendiente", "en_curso", "resuelto"],
      estado_reporte_legal: ["pendiente", "enviado", "fallido"],
      estado_reserva: [
        "pendiente",
        "aprobada",
        "rechazada",
        "en_curso",
        "finalizada",
        "cancelada",
      ],
      estado_suscripcion: ["activa", "vencida", "cancelada"],
      estado_unidad: [
        "disponible",
        "invitado",
        "aceptado",
        "config_pendiente",
        "config_completado",
      ],
      estado_verificacion: ["pendiente", "verificado", "no_coincide"],
      estado_visita: ["programada", "ingresada", "finalizada", "cancelada"],
      instruccion_documento: ["verificar", "no_verificar"],
      medio_contacto: ["correo", "telefono", "cualquiera"],
      momento_reporte: ["entrada", "salida"],
      motivo_notificacion: [
        "correspondencia_recibida",
        "correspondencia_entregada",
        "visita_ingreso",
        "reserva_aprobada",
        "reserva_rechazada",
        "anuncio_publicado",
        "reconocimiento_recibido",
      ],
      origen_pago: ["manual", "carga_masiva"],
      origen_verificacion: ["paquete_base", "paquete_complementario"],
      paso_visita: [
        "preregistro_enviado",
        "documentacion_completa",
        "terminos_aceptados",
        "verificacion_aprobada",
        "reporte_entrada",
        "reporte_salida",
      ],
      resultado_verificacion: [
        "pendiente",
        "aprobada",
        "rechazada",
        "error_proveedor",
      ],
      rol_condominio: ["administrador", "coadministrador", "guardia"],
      rol_staff_alojamiento: ["coanfitrion", "limpieza", "mantenimiento"],
      rol_unidad: [
        "propietario",
        "inquilino_lider",
        "residente",
        "corresidente",
        "coadministrador",
        "huesped_temporal",
      ],
      tipo_conversacion: ["directa", "area", "grupo"],
      tipo_documento: [
        "cedula_ciudadania",
        "cedula_extranjeria",
        "dni",
        "carne_extranjeria",
        "pep",
        "pasaporte",
      ],
      tipo_estacionamiento: ["visitante", "privado"],
      tipo_fecha_especial: ["cerrada", "horario_especial"],
      tipo_llamada: ["entrante", "saliente", "perdida"],
      tipo_notificacion: ["solo_notificar", "notificar_y_anunciar"],
      tipo_participante: ["residente", "visitante", "huesped_temporal"],
      tipo_porteria: ["entrada_principal", "acceso_vehicular"],
      tipo_publicacion: ["anuncio", "encuesta"],
      tipo_reclamo: [
        "consulta",
        "reclamo",
        "sugerencia",
        "pregunta",
        "queja",
        "idea",
        "soporte",
      ],
      tipo_regla: [
        "residente_permanente",
        "huesped_temporal",
        "guardia_seguridad",
      ],
      tipo_reporte: ["visitantes", "correspondencia", "areas_comunes"],
      tipo_reporte_legal: ["tra", "sire"],
      tipo_vehiculo: ["auto", "camioneta", "moto", "bus", "van"],
      tipo_visita: ["amigos", "temporal", "permanente", "huesped_temporal"],
    },
  },
} as const
