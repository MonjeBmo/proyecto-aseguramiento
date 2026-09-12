const { Router } = require('express');
const {
  listar,
  actualizarEstado,
  listarNotificacionesHandler,
} = require('../controllers/entregasController');

const router = Router();

// GET /api/entregas?repartidor_id=X
router.get('/', listar);

// GET /api/entregas/notificaciones
router.get('/notificaciones', listarNotificacionesHandler);

// PATCH /api/entregas/:pedido_id/estado
router.patch('/:pedido_id/estado', actualizarEstado);

module.exports = router;
