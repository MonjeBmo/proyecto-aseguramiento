// Datos mock para el prototipo.
// Estos datos se usan cuando la app esta offline o el backend no esta disponible.
// En produccion se reemplazan con llamadas reales a la API.

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: 'vendedor' | 'supervisor' | 'repartidor';
}

export interface Cliente {
  id: number;
  nombre: string;
  telefono: string;
  zona: string;
  direccion: string;
}

export interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
  unidad: string;
  categoria: string;
}

export const MOCK_USUARIOS: Usuario[] = [
  { id: 1, nombre: 'Carlos Revolorio', email: 'carlos@rutaexpress.gt', rol: 'vendedor' },
  { id: 2, nombre: 'Maria Garcia',     email: 'maria@rutaexpress.gt',  rol: 'vendedor' },
];

export const MOCK_CLIENTES: Cliente[] = [
  { id: 1, nombre: 'Tienda La Esperanza',  telefono: '5555-1001', zona: 'Zona 6',  direccion: '5a Av. 10-20' },
  { id: 2, nombre: 'Despensa Don Juanito', telefono: '5555-1002', zona: 'Zona 11', direccion: '12 Calle 3-45' },
  { id: 3, nombre: 'Comedor La Familia',   telefono: '5555-1003', zona: 'Zona 1',  direccion: '6a Calle 2-08' },
  { id: 4, nombre: 'Abarrotes El Central', telefono: '5555-1004', zona: 'Zona 3',  direccion: '9a Av. 14-62' },
  { id: 5, nombre: 'Tienda San Miguel',    telefono: '5555-1005', zona: 'Zona 7',  direccion: '3a Calle 7-30' },
];

export const MOCK_PRODUCTOS: Producto[] = [
  { id: 1,  nombre: 'Arroz Diana 25 lb',     descripcion: 'Arroz blanco extra largo',      precio: 85.00, stock: 150, unidad: 'saco',    categoria: 'Granos' },
  { id: 2,  nombre: 'Aceite Capullo 1L',      descripcion: 'Aceite vegetal comestible',     precio: 28.50, stock: 200, unidad: 'botella', categoria: 'Aceites' },
  { id: 3,  nombre: 'Azucar Pantaleon 5 lb',  descripcion: 'Azucar blanca refinada',        precio: 22.00, stock: 100, unidad: 'bolsa',   categoria: 'Endulzantes' },
  { id: 4,  nombre: 'Frijoles Negros 1 lb',   descripcion: 'Frijoles negros secos',         precio: 9.50,  stock: 300, unidad: 'bolsa',   categoria: 'Granos' },
  { id: 5,  nombre: 'Sal Refinada 2 lb',      descripcion: 'Sal de cocina yodada',          precio: 4.75,  stock: 250, unidad: 'bolsa',   categoria: 'Condimentos' },
  { id: 6,  nombre: 'Harina Maseca 1 kg',     descripcion: 'Harina de maiz nixtamalizado', precio: 12.00, stock: 80,  unidad: 'bolsa',   categoria: 'Harinas' },
  { id: 7,  nombre: 'Pasta Roma 500g',        descripcion: 'Pasta de trigo spaghetti',      precio: 7.25,  stock: 175, unidad: 'paquete', categoria: 'Pastas' },
  { id: 8,  nombre: 'Atun Van Camps 140g',    descripcion: 'Atun en agua',                  precio: 11.00, stock: 120, unidad: 'lata',    categoria: 'Enlatados' },
  { id: 9,  nombre: 'Sardinas Sultana 425g',  descripcion: 'Sardinas en salsa de tomate',   precio: 18.50, stock: 90,  unidad: 'lata',    categoria: 'Enlatados' },
  { id: 10, nombre: 'Leche Clover 1L',        descripcion: 'Leche entera pasteurizada',     precio: 15.00, stock: 160, unidad: 'litro',   categoria: 'Lacteos' },
];
