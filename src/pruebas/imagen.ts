/**
 * Lo que devuelve un `import logo from "...png"` en las pruebas.
 *
 * En la app lo resuelve Metro y acaba siendo una ruta o un numero de recurso.
 * Aqui basta con algo estable: los componentes solo se lo pasan a
 * `<Image source>`, y ninguna prueba de esta suite comprueba imagenes.
 */
export default "imagen-de-prueba";
