const express = require('express')
const router = express.Router();

const authCtrl = require('../controllers/authorization')

//Post- register user
router.post("/register", authCtrl.registerUser)

router.post("/login", authCtrl.loginUser)

router.get("/logout", authCtrl.logoutUser)

module.exports = router;