const { Router } = require('express');
const { listar, obtenerPorId, crear, actualizar, eliminar } = require('../controllers/clientesController');

const router = Router();

router.get('/', listar);
router.get('/:id', obtenerPorId);
router.post('/', crear);
router.put('/:id', actualizar);
router.delete('/:id', eliminar);

module.exports = router;
