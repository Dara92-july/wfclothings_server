const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { adminOnly } = require('../middleware/admin');

router.get('/', protect, adminOnly, userController.getAllUsers);
router.get('/:id', protect, adminOnly, userController.getUser);

module.exports = router;
