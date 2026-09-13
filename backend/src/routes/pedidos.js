const { Router } = require('express');
const { crear, listar, obtenerPorId, asignarRepartidor, reprogramar, programar } = require('../controllers/pedidosController');

const { soloSupervisor } = require('../middleware/sesion');
const router = Router();
router.patch('/:id/reprogramar', soloSupervisor, reprogramar);
router.patch('/:id/programar', soloSupervisor, programar);
router.patch('/:id/repartidor', soloSupervisor, asignarRepartidor);

router.post('/', crear);
router.get('/', listar);
router.get('/:id', obtenerPorId);

module.exports = router;
