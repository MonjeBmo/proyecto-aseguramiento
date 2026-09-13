const { Router } = require('express');
const { listar, crear, actualizar, resetearContrasena } = require('../controllers/usuariosController');

const router = Router();

router.get('/', listar);
router.post('/', crear);
router.put('/:id', actualizar);
router.patch('/:id/reset-password', resetearContrasena);

module.exports = router;
