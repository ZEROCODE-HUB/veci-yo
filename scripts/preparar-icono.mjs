/**
 * Deja una imagen lista para usarse como icono de un modulo de la portada.
 *
 *   node scripts/preparar-icono.mjs <origen> <destino.png>
 *
 * Los iconos se pintan a **88x88** con `resizeMode="contain"` sobre una tarjeta
 * blanca (`ViviendaResumen`). Una imagen que llega a 2048px con fondo blanco
 * opaco se ve, pero se ve mal y pesa de mas: los que ya habia iban de 366 KB a
 * 2,2 MB cada uno, y `mi_alojamiento.jpg` era un **jpg sin transparencia**, asi
 * que pintaba un cuadrado blanco encima de la tarjeta.
 *
 * Esto hace cuatro cosas, en este orden:
 *
 *   1. **Quita el fondo**, rellenando desde el borde hacia dentro.
 *   2. **Recorta el margen sobrante**, para que el dibujo llene el cuadro. Sin
 *      esto, una imagen con mucho aire alrededor se ve mas pequeña que las
 *      demas aunque todas midan 88.
 *   3. **Lo cuadra**, metiendolo centrado en un lienzo cuadrado. `contain`
 *      respeta la proporcion, asi que un dibujo apaisado se veria mas bajo que
 *      sus vecinos; cuadrarlo lo alinea con los demas.
 *   4. **Lo baja a 512**, que es 88 por seis: de sobra para la pantalla mas
 *      densa y una fraccion del peso.
 *
 * ----------------------------------------------------------------------------
 * Por que se rellena desde el borde y no por umbral
 * ----------------------------------------------------------------------------
 * La primera version marcaba como fondo todo pixel casi blanco. Funciono con la
 * porteria y **fallo con la casa**: estas imagenes llevan una sombra suave, que
 * no es blanca, asi que se quedaba opaca y el recorte no apretaba. Resultado: la
 * casa arrinconada arriba a la izquierda con un hueco gris abajo a la derecha.
 *
 * Bajar el umbral hasta tragarse la sombra se come el dibujo, porque los objetos
 * de estas imagenes son **grises plateados**: hay partes de la casa mas claras
 * que su propia sombra.
 *
 * El fondo no se distingue por su color, se distingue por **estar pegado al
 * borde**. La sombra tambien lo esta; los brillos del tejado, no. Asi que se
 * rellena desde los cuatro lados hacia dentro y se para al llegar a algo que no
 * sea un gris claro: lo que queda dentro es el dibujo, por claro que sea.
 */
import Jimp from "jimp-compact";
import { resolve } from "node:path";

/**
 * Hasta donde avanza el relleno. Un pixel mas oscuro que esto ya es dibujo y
 * detiene el avance.
 *
 * Es generoso --227 de 255-- justamente porque solo se aplica a lo que viene
 * conectado con el borde. Por umbral suelto, este valor arrasaria la imagen.
 */
const LIMITE = 227;

/** Un pixel con mucho color no es fondo, por claro que sea. */
const NEUTRO = 10;

/** El lado del icono ya preparado. */
const LADO = 512;

/**
 * Marca el fondo avanzando desde los cuatro bordes.
 *
 * Iterativo y no recursivo: una imagen de dos millones de pixeles desborda la
 * pila de llamadas a la primera.
 */
function marcarFondo(img) {
  const { width: ancho, height: alto, data } = img.bitmap;
  const fondo = new Uint8Array(ancho * alto);
  const pila = [];

  const esClaro = (p) => {
    const i = p * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    return (
      Math.min(r, g, b) >= LIMITE &&
      Math.max(r, g, b) - Math.min(r, g, b) <= NEUTRO
    );
  };

  const empujar = (p) => {
    if (fondo[p] || !esClaro(p)) return;
    fondo[p] = 1;
    pila.push(p);
  };

  for (let x = 0; x < ancho; x++) {
    empujar(x);
    empujar((alto - 1) * ancho + x);
  }
  for (let y = 0; y < alto; y++) {
    empujar(y * ancho);
    empujar(y * ancho + ancho - 1);
  }

  while (pila.length > 0) {
    const p = pila.pop();
    const x = p % ancho;
    const y = (p - x) / ancho;
    if (x > 0) empujar(p - 1);
    if (x < ancho - 1) empujar(p + 1);
    if (y > 0) empujar(p - ancho);
    if (y < alto - 1) empujar(p + ancho);
  }

  return fondo;
}

/**
 * Suaviza el borde del recorte.
 *
 * Sin esto el contorno queda dentado, que a 88 pixeles se nota como un halo
 * sucio alrededor del dibujo. Un pixel de dibujo que toca el fondo se queda a
 * media opacidad, que es lo que hace el antialias de toda la vida.
 */
function suavizarBorde(img, fondo) {
  const { width: ancho, height: alto, data } = img.bitmap;

  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const p = y * ancho + x;
      if (fondo[p]) {
        data[p * 4 + 3] = 0;
        continue;
      }
      const vecinos = [
        x > 0 ? p - 1 : p,
        x < ancho - 1 ? p + 1 : p,
        y > 0 ? p - ancho : p,
        y < alto - 1 ? p + ancho : p,
      ];
      const fuera = vecinos.filter((v) => fondo[v]).length;
      if (fuera > 0) data[p * 4 + 3] = Math.round(255 * (1 - fuera / 8));
    }
  }
}

async function main() {
  const [origen, destino] = process.argv.slice(2);
  if (!origen || !destino) {
    console.error(
      "Uso: node scripts/preparar-icono.mjs <origen> <destino.png>",
    );
    process.exit(1);
  }

  const img = await Jimp.read(resolve(origen));
  console.log(`origen: ${img.bitmap.width}x${img.bitmap.height}`);

  const fondo = marcarFondo(img);
  suavizarBorde(img, fondo);

  const quitados = fondo.reduce((suma, v) => suma + v, 0);
  const total = img.bitmap.width * img.bitmap.height;
  console.log(`fondo quitado: ${Math.round((quitados / total) * 100)}%`);

  /*
    Si no se quita casi nada, el fondo no era blanco y lo que sale no sirve.
    Mejor enterarse aqui que al ver el icono puesto.
  */
  if (quitados / total < 0.05) {
    console.error(
      "Apenas se quito fondo. ¿Seguro que la imagen viene sobre blanco?",
    );
    process.exit(1);
  }

  img.autocrop({ tolerance: 0.002, cropOnlyFrames: false });
  console.log(`recortado: ${img.bitmap.width}x${img.bitmap.height}`);

  const lado = Math.max(img.bitmap.width, img.bitmap.height);
  const lienzo = await new Jimp(lado, lado, 0x00000000);
  lienzo.composite(
    img,
    Math.round((lado - img.bitmap.width) / 2),
    Math.round((lado - img.bitmap.height) / 2),
  );

  lienzo.resize(LADO, LADO);
  await lienzo.writeAsync(resolve(destino));

  console.log(`listo: ${destino} ${LADO}x${LADO}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
