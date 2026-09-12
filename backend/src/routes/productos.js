const { Router } = require('express');
const { listar, obtenerPorId } = require('../controllers/productosController');

const router = Router();

router.get('/', listar);
router.get('/:id', obtenerPorId);

module.exports = router;
