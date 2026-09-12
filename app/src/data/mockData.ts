// Datos mock para el prototipo.
// Se usan cuando la app esta offline o el backend no esta disponible.

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

export interface EntregaItem {
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  producto_nombre: string;
  unidad: string;
}

export interface Entrega {
  id: number;
  estado: 'confirmado' | 'despachado' | 'entregado' | 'cancelado';
  total: number;
  cliente_id: number;
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_direccion: string;
  cliente_zona: string;
  vendedor_nombre: string;
  creado_en: string;
  items: EntregaItem[];
}

export const MOCK_USUARIOS: Usuario[] = [
  { id: 1, nombre: 'Carlos Revolorio', email: 'carlos@rutaexpress.gt', rol: 'vendedor' },
  { id: 2, nombre: 'Maria Garcia',     email: 'maria@rutaexpress.gt',  rol: 'vendedor' },
  { id: 4, nombre: 'Pedro Lopez',      email: 'pedro@rutaexpress.gt',  rol: 'repartidor' },
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

// Entregas de demo para el Repartidor (modo offline)
export const MOCK_ENTREGAS: Entrega[] = [
  {
    id: 1,
    estado: 'confirmado',
    total: 255.50,
    cliente_id: 1,
    cliente_nombre: 'Tienda La Esperanza',
    cliente_telefono: '5555-1001',
    cliente_direccion: '5a Av. 10-20',
    cliente_zona: 'Zona 6',
    vendedor_nombre: 'Carlos Revolorio',
    creado_en: new Date().toISOString(),
    items: [
      { cantidad: 2, precio_unitario: 85.00, subtotal: 170.00, producto_nombre: 'Arroz Diana 25 lb', unidad: 'saco' },
      { cantidad: 3, precio_unitario: 28.50, subtotal: 85.50,  producto_nombre: 'Aceite Capullo 1L', unidad: 'botella' },
    ],
  },
  {
    id: 2,
    estado: 'despachado',
    total: 85.00,
    cliente_id: 2,
    cliente_nombre: 'Despensa Don Juanito',
    cliente_telefono: '5555-1002',
    cliente_direccion: '12 Calle 3-45',
    cliente_zona: 'Zona 11',
    vendedor_nombre: 'Maria Garcia',
    creado_en: new Date().toISOString(),
    items: [
      { cantidad: 5, precio_unitario: 9.50, subtotal: 47.50, producto_nombre: 'Frijoles Negros 1 lb', unidad: 'bolsa' },
      { cantidad: 4, precio_unitario: 4.75, subtotal: 19.00, producto_nombre: 'Sal Refinada 2 lb',    unidad: 'bolsa' },
      { cantidad: 1, precio_unitario: 18.50, subtotal: 18.50, producto_nombre: 'Sardinas Sultana 425g', unidad: 'lata' },
    ],
  },
  {
    id: 3,
    estado: 'confirmado',
    total: 112.00,
    cliente_id: 3,
    cliente_nombre: 'Comedor La Familia',
    cliente_telefono: '5555-1003',
    cliente_direccion: '6a Calle 2-08',
    cliente_zona: 'Zona 1',
    vendedor_nombre: 'Carlos Revolorio',
    creado_en: new Date().toISOString(),
    items: [
      { cantidad: 6, precio_unitario: 7.25, subtotal: 43.50, producto_nombre: 'Pasta Roma 500g',     unidad: 'paquete' },
      { cantidad: 4, precio_unitario: 11.00, subtotal: 44.00, producto_nombre: 'Atun Van Camps 140g', unidad: 'lata' },
      { cantidad: 2, precio_unitario: 12.25, subtotal: 24.50, producto_nombre: 'Harina Maseca 1 kg', unidad: 'bolsa' },
    ],
  },
];
