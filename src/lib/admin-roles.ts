import type { NombreRol } from "@/lib/types";

export interface FlagsRolUsuario {
  esAdministrador: boolean;
  esEmisor: boolean;
  esReceptor: boolean;
}

/** Convierte el nombre de rol en la BD a flags para la UI. */
export function rolNombreAFlags(nombre: string): FlagsRolUsuario {
  switch (nombre) {
    case "administrador":
      return { esAdministrador: true, esEmisor: false, esReceptor: false };
    case "emisor_receptor":
      return { esAdministrador: false, esEmisor: true, esReceptor: true };
    case "emisor":
      return { esAdministrador: false, esEmisor: true, esReceptor: false };
    case "receptor":
      return { esAdministrador: false, esEmisor: false, esReceptor: true };
    default:
      return { esAdministrador: false, esEmisor: false, esReceptor: false };
  }
}

/** Etiqueta legible del rol para badges. */
export function etiquetaRol(nombre: NombreRol | string): string {
  switch (nombre) {
    case "administrador":
      return "Administrador";
    case "emisor_receptor":
      return "Emisor + Receptor";
    case "emisor":
      return "Emisor";
    case "receptor":
      return "Receptor";
    default:
      return nombre;
  }
}

export function flagsTienenAlgunPermiso(flags: FlagsRolUsuario): boolean {
  return flags.esAdministrador || flags.esEmisor || flags.esReceptor;
}

export function validarFlagsRol(flags: FlagsRolUsuario): string | null {
  if (!flagsTienenAlgunPermiso(flags)) {
    return "Selecciona al menos un permiso: Emisor, Receptor o Administrador";
  }
  if (flags.esAdministrador && (flags.esEmisor || flags.esReceptor)) {
    return "El administrador ya tiene todos los permisos; desmarca Emisor y Receptor";
  }
  return null;
}
