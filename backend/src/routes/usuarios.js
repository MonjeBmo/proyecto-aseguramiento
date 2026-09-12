const { Router } = require('express');
const { listar, crear, actualizar } = require('../controllers/usuariosController');

const router = Router();

router.get('/', listar);
router.post('/', crear);
router.put('/:id', actualizar);

module.exports = router;
