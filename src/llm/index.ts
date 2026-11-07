// Interfaz publica del path llm (lado servidor). El cliente del navegador esta en cliente.ts.
export { crearOpciones, ErrorOpciones } from './opciones.ts'
export type { DependenciasOpciones, GenerarOpciones } from './opciones.ts'
export { crearAlmacenEnMemoria, memoriaVacia } from './almacen.ts'
export { crearProveedorFalso } from './proveedor-falso.ts'
export { PERFIL_ROBERTO } from './perfil-roberto.ts'
export type * from './tipos.ts'
