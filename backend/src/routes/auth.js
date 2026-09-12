const { Router } = require('express');
const { login, listarVendedores } = require('../controllers/authController');

const router = Router();

router.post('/login', login);
router.get('/vendedores', listarVendedores);

module.exports = router;
