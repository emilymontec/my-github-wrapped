/**
 * Fase 11 (Performance/Escalabilidad): tamaño de página compartido por
 * los dos crons de fan-out (`reconcile.ts`, `wrapped-auto-generate.ts`).
 *
 * ⚠️ El problema real que esto resuelve no es "cargar demasiados IDs en
 * memoria" (una lista de cuids de sobra cabe en RAM incluso para
 * cientos de miles de usuarios) — es que la versión anterior hacía
 * **un `step.sendEvent` por usuario dentro de un `for`**, y cada
 * `step.sendEvent` es un step durable de Inngest. Una función con
 * decenas de miles de steps es lenta (cada step implica un round-trip
 * con el motor de Inngest) y eventualmente choca contra límites
 * prácticos de cantidad de steps por ejecución. La solución no es
 * "paginar la lectura" solamente, es agrupar el ENVÍO: `step.sendEvent`
 * acepta un array de eventos y los manda todos en un solo step. Paginar
 * la lectura además evita levantar una sola página gigante en memoria y
 * mantiene cada página del mismo tamaño que el lote de eventos que
 * genera — leer y enviar quedan 1:1, una página = un `step.run` + un
 * `step.sendEvent`.
 *
 * 500 es un número conservador elegido a mano, no verificado contra los
 * límites reales de tamaño de batch de Inngest en este sandbox (no hay
 * forma de probarlo sin una cuenta de Inngest real) — está muy por
 * debajo de cualquier límite documentado públicamente por Inngest para
 * `step.sendEvent` con un array. Si el volumen de usuarios creciera lo
 * suficiente como para que incluso esto acumule demasiados steps en una
 * sola ejecución (varios cientos de miles de usuarios), el siguiente
 * paso natural sería que la función se reinvoque a sí misma mandándose
 * un evento de continuación con el último cursor, en vez de iterar
 * todas las páginas dentro de una sola ejecución — no se implementó acá
 * porque el volumen actual del producto no lo justifica.
 */
export const FANOUT_PAGE_SIZE = 500;

/**
 * ⚠️ Extraído a función pura a propósito: el error clásico de paginar
 * por cursor es olvidar `skip: 1` (Prisma incluye el propio cursor en
 * los resultados si no se salta explícitamente, duplicando el último
 * ítem de la página anterior como primero de la siguiente — esto puede
 * volverse un loop infinito si esa fila siempre "sobra"). Tenerlo en una
 * función con tests directos (`__tests__/fanout.test.ts`) es más barato
 * que descubrir el bug por lectura de código en cada uno de los dos
 * crons que la usan.
 */
export function buildCursorPageArgs<TCursorField extends string>(
  cursorField: TCursorField,
  cursor: string | null,
  pageSize: number
): { take: number; cursor?: Record<TCursorField, string>; skip?: number } {
  if (cursor === null) {
    return { take: pageSize };
  }
  return { take: pageSize, cursor: { [cursorField]: cursor } as Record<TCursorField, string>, skip: 1 };
}

/** `true` cuando la página devuelta es la última -- trajo menos de lo pedido. */
export function isLastPage(pageLength: number, pageSize: number): boolean {
  return pageLength < pageSize;
}
