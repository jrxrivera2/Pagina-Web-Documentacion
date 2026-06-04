import type {
  DocumentoDestinatario,
  EstadoCasoManual,
  EstadoDocumento,
  EstadoRecepcion,
} from "@/lib/types";

/** @deprecated Usar EstadoCasoManual del documento. */
export type EstadoCaso = "abierto" | "cerrado" | "borrador" | "en_seguimiento";

export type EstadoSolucion =
  | "pendiente"
  | "parcial"
  | "aprobado"
  | "rechazado"
  | "mixto"
  | "no_aplica";

export interface ResumenCaso {
  estadoCaso: EstadoCasoManual;
  etiquetaCaso: string;
  solucion: EstadoSolucion;
  etiquetaSolucion: string;
  descripcion: string;
}

const ETIQUETAS_CASO: Record<EstadoCasoManual, string> = {
  abierto: "Abierto",
  cerrado: "Cerrado",
  en_seguimiento: "En seguimiento",
};

const ESTADOS_CERRADOS_DOC: EstadoDocumento[] = [
  "aprobado",
  "rechazado",
  "archivado",
];

const ESTADOS_RESPUESTA: EstadoRecepcion[] = ["aprobado", "rechazado"];

export function etiquetaEstadoCaso(estado: EstadoCasoManual): string {
  return ETIQUETAS_CASO[estado] ?? estado;
}

export function calcularResumenCaso(
  estadoDoc: EstadoDocumento,
  estadoCaso: EstadoCasoManual,
  destinatarios: Pick<DocumentoDestinatario, "estado_recepcion">[] = [],
): ResumenCaso {
  if (estadoDoc === "borrador") {
    return {
      estadoCaso: "abierto",
      etiquetaCaso: "Borrador",
      solucion: "no_aplica",
      etiquetaSolucion: "Sin enviar",
      descripcion: "El documento aun no se ha enviado. Envia para gestionar el caso.",
    };
  }

  const total = destinatarios.length;
  const aprobados = destinatarios.filter(
    (d) => d.estado_recepcion === "aprobado",
  ).length;
  const rechazados = destinatarios.filter(
    (d) => d.estado_recepcion === "rechazado",
  ).length;
  const respondidos = aprobados + rechazados;

  let solucion: EstadoSolucion = "pendiente";
  if (total === 0) {
    if (estadoDoc === "aprobado") solucion = "aprobado";
    else if (estadoDoc === "rechazado") solucion = "rechazado";
    else if (ESTADOS_CERRADOS_DOC.includes(estadoDoc)) solucion = "aprobado";
  } else if (respondidos === 0) {
    solucion = "pendiente";
  } else if (aprobados === total) {
    solucion = "aprobado";
  } else if (rechazados === total) {
    solucion = "rechazado";
  } else if (aprobados > 0 && rechazados > 0) {
    solucion = "mixto";
  } else {
    solucion = "parcial";
  }

  const etiquetaSolucion: Record<EstadoSolucion, string> = {
    pendiente: "Sin solucion formal",
    parcial: "Solucion parcial",
    aprobado: "Con solucion (aprobado)",
    rechazado: "Con solucion (rechazado)",
    mixto: "Solucion mixta",
    no_aplica: "No aplica",
  };

  const descripcionesCaso: Record<EstadoCasoManual, string> = {
    abierto: "Caso abierto: pendiente de gestion o respuesta.",
    cerrado: "Caso cerrado: el responsable considera el asunto resuelto.",
    en_seguimiento:
      "En seguimiento: se esta dando seguimiento activo al expediente.",
  };

  let descripcion = descripcionesCaso[estadoCaso];
  if (solucion === "parcial") {
    descripcion += ` ${respondidos} de ${total} destinatario(s) respondieron.`;
  }

  return {
    estadoCaso: estadoCaso,
    etiquetaCaso: etiquetaEstadoCaso(estadoCaso),
    solucion,
    etiquetaSolucion: etiquetaSolucion[solucion],
    descripcion,
  };
}

export function calcularResumenDestinatario(
  estado: EstadoRecepcion,
): { abierto: boolean; conSolucion: boolean; etiqueta: string } {
  if (ESTADOS_RESPUESTA.includes(estado)) {
    return {
      abierto: false,
      conSolucion: true,
      etiqueta:
        estado === "aprobado" ? "Cerrado - Aprobado" : "Cerrado - Rechazado",
    };
  }
  if (estado === "visto" || estado === "recibido") {
    return {
      abierto: true,
      conSolucion: false,
      etiqueta: "Abierto - Visto sin resolver",
    };
  }
  return {
    abierto: true,
    conSolucion: false,
    etiqueta: "Abierto - Sin abrir",
  };
}

export interface EstadisticasTrazabilidad {
  vistas: number;
  descargas: number;
  comentarios: number;
  respuestas: number;
}

export function contarEventos(
  eventos: { tipo_evento: string }[],
): EstadisticasTrazabilidad {
  return {
    vistas: eventos.filter((e) => e.tipo_evento === "visto").length,
    descargas: eventos.filter((e) => e.tipo_evento === "descargado").length,
    comentarios: eventos.filter((e) => e.tipo_evento === "comentado").length,
    respuestas: eventos.filter((e) =>
      ["aprobado", "rechazado"].includes(e.tipo_evento),
    ).length,
  };
}
