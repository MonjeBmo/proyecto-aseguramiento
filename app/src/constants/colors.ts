// Paleta de colores de RutaExpress GT
// Extraida de la presentacion del proyecto

export const COLORS = {
  // Primario
  primary: '#1A7FC4',    // teal azul (botones principales, header)
  primaryDark: '#135f96',

  // Acento
  accent: '#E8620A',     // naranja (badges, alertas, botones de accion)
  accentLight: '#F5A570',

  // Fondos
  dark: '#0D2137',       // azul marino oscuro (splash, login)
  background: '#F5F7FA', // gris muy claro (fondo de pantallas)
  surface: '#FFFFFF',    // blanco (tarjetas)

  // Texto
  text: '#1A2B3C',
  textLight: '#6B7C8D',
  textOnDark: '#FFFFFF',

  // Estado
  success: '#27AE60',
  error: '#E74C3C',
  warning: '#F39C12',
  offline: '#95A5A6',

  // Bordes
  border: '#DDE2E9',

  // Stock
  stockOk: '#27AE60',
  stockBajo: '#F39C12',
  stockSinStock: '#E74C3C',
} as const;
