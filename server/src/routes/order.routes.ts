import { Router } from 'express'
import {
  createOrder,
  getOrder,
  listOrders,
  trackOrder,
  updateOrderStatus,
} from '../controllers/order.controller.js'
import { requireAuth, requireStaff } from '../middleware/auth.js'
import { rateLimit } from '../middleware/rateLimit.js'

export const orderRouter = Router()

/**
 * Public order tracking. Kept above requireAuth on purpose.
 *
 * Throttled because order numbers are guessable (IJZ-YYMMDD-NNNN is only 9000
 * values per day). The lookup itself runs server-side with the service-role
 * key, so the anon key in the browser bundle cannot call the database at all.
 */
orderRouter.get(
  '/track/:orderNumber',
  rateLimit({ windowMs: 10 * 60_000, max: 20 }),
  trackOrder,
)

orderRouter.use(requireAuth)

orderRouter.get('/', listOrders)
orderRouter.get('/:id', getOrder)
orderRouter.post('/', createOrder)
orderRouter.patch('/:id/status', requireStaff, updateOrderStatus)
