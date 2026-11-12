import { Router } from 'express'
import {
  createProduct,
  deleteProduct,
  getProduct,
  listProducts,
  updateProduct,
} from '../controllers/product.controller.js'
import { requireAuth, requireStaff } from '../middleware/auth.js'

export const productRouter = Router()

productRouter.get('/', listProducts)
productRouter.get('/:slug', getProduct)

productRouter.post('/', requireAuth, requireStaff, createProduct)
productRouter.patch('/:slug', requireAuth, requireStaff, updateProduct)
productRouter.delete('/:slug', requireAuth, requireStaff, deleteProduct)
