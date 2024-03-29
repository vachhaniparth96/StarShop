const express = require('express');
const router = express.Router();

const productsCtrl = require('../controllers/products');
const { checkAuthentication, authorizeRoles } = require('../utility/checkAuth');

//GET- all products
router.get('/', productsCtrl.getProducts);

//GET- a single product
router.get('/:id', productsCtrl.productDetails);

//PUT- update a product (Admin Only)
router.put('/admin/:id', checkAuthentication, authorizeRoles('admin'), productsCtrl.updateProduct);

//DELETE- delete a product (Admin Only)
router.delete('/admin/:id', checkAuthentication, authorizeRoles('admin'), productsCtrl.deleteProduct);

//POST- create a product (Admin Only)
router.post('/admin/new', checkAuthentication, authorizeRoles('admin'), productsCtrl.createProduct);

//PUT- creating/updating reviews
router.put('/reviews', checkAuthentication, productsCtrl.createReview);

//DELETE- delete a review (Admin Only)
router.delete('/reviews', checkAuthentication, authorizeRoles('admin'), productsCtrl.deleteReview)

//GET- all reviews for a product
router.get('/reviews/:id', checkAuthentication, productsCtrl.allReviews);


module.exports = router;