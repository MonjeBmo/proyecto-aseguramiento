const { Router } = require('express');
const { listar, crear, eliminar } = require('../controllers/lotesController');

const router = Router();

router.get('/', listar);
router.post('/', crear);
router.delete('/:id', eliminar);

module.exports = router;
