const { Router } = require('express');
const { crear, listar, obtenerPorId } = require('../controllers/pedidosController');

const router = Router();

router.post('/', crear);
router.get('/', listar);
router.get('/:id', obtenerPorId);

module.exports = router;
