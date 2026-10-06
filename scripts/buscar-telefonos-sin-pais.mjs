/**
 * Formularios que arrancan con el país del teléfono vacío.
 *
 * `CampoTelefono` pinta el país por defecto cuando `codigoPais` viene vacío
 * --un botón en blanco no se entiende-- así que la pantalla enseña «🇨🇴 +57»
 * mientras a la base viaja **cadena vacía**. El número se guarda sin país, que
 * es exactamente lo que ese campo existe para evitar: un «3001234567» sin país
 * no se puede marcar desde fuera ni mandar por WhatsApp.
 *
 * Lo que lo hace invisible es que **lo que se ve es correcto**. No hay error,
 * no hay campo vacío en pantalla, y el typecheck pasa: `""` es un `string`.
 *
 * Salió el 05/10/2026 invitando a un coadministrador desde el navegador: el
 * teléfono llegó a la invitación y `codigo_pais` quedó en null. Y no era de esa
 * pantalla, eran **las seis** que montan el campo.
 *
 * ## Por qué no se arregla dentro del componente
 *
 * Se intentó: un efecto que avisa al padre del país que está pintando. **No
 * sobrevive a react-hook-form**, cuyo `reset(initial)` corre después del efecto
 * del hijo y lo deshace. Comprobado en el navegador, no deducido: la pantalla
 * seguía guardando el país vacío con el efecto puesto.
 *
 * Un arreglo que se pierde según quién te monte es peor que ninguno, porque
 * parece que está. Así que el valor inicial es de quien monta el campo, y lo
 * que no se puede recordar se cuenta aquí.
 *
 * Marca: 0.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const RAIZ = resolve(import.meta.dirname, "..");
const FUENTE = join(RAIZ, "src");

/**
 * `codigoPais` con una cadena vacía por valor, en cualquiera de sus formas:
 *
 *     codigoPais: ""
 *     codigoPais: algo || ""
 *     codigoPais: algo ?? ""
 */
const VACIO = /codigoPais\s*:\s*(?:[^,\n]*?(?:\|\||\?\?)\s*)?["'`]["'`]/;

function archivos(directorio) {
  const salida = [];
  for (const nombre of readdirSync(directorio)) {
    const ruta = join(directorio, nombre);
    if (statSync(ruta).isDirectory()) salida.push(...archivos(ruta));
    else if (/\.tsx?$/.test(nombre)) salida.push(ruta);
  }
  return salida;
}

const revisados = archivos(FUENTE);
const culpables = [];

for (const ruta of revisados) {
  /*
    Las pruebas quedan fuera: una que comprueba **qué pasa sin país** tiene que
    poder escribirlo, y es justamente el caso que hay que cubrir.
  */
  if (/\.test\.tsx?$/.test(ruta)) continue;

  const lineas = readFileSync(ruta, "utf-8").split(/\r?\n/);
  lineas.forEach((linea, indice) => {
    /*
      Los comentarios no. Este guarda se marcaba a sí mismo: la cabecera de
      `CampoTelefono` **cita** el patrón malo para explicarlo. Un guarda que
      grita en falso se acaba ignorando, y entonces no sirve para nada.
    */
    const limpia = linea.trim();
    if (limpia.startsWith("*") || limpia.startsWith("//")) return;

    if (VACIO.test(linea)) {
      culpables.push({
        ruta: relative(RAIZ, ruta).replace(/\\/g, "/"),
        linea: indice + 1,
        texto: linea.trim(),
      });
    }
  });
}

console.log(`archivos revisados: ${revisados.length}`);
console.log(`telefonos que arrancan sin pais: ${culpables.length} (tope 0).`);
for (const c of culpables) console.log(`  ${c.ruta}:${c.linea}  ${c.texto}`);

if (culpables.length > 0) {
  console.error(
    `\nEl campo pinta el pais por defecto cuando no le dan ninguno, asi que la ` +
      `pantalla enseña «+57» y la base guarda vacio: el numero queda sin pais y ` +
      `no se puede marcar desde fuera. El valor inicial es \`PAIS_POR_DEFECTO\`, ` +
      `de \`@/shared/constants\`.`,
  );
  process.exit(1);
}
