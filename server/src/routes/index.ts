import { Router } from 'express'
import { designRouter } from './design.routes.js'
import { healthRouter } from './health.routes.js'
import { orderRouter } from './order.routes.js'
import { productRouter } from './product.routes.js'
import { stickerRouter } from './sticker.routes.js'
import { uploadRouter } from './upload.routes.js'

export const apiRouter = Router()

apiRouter.use('/health', healthRouter)
apiRouter.use('/products', productRouter)
apiRouter.use('/stickers', stickerRouter)
apiRouter.use('/orders', orderRouter)
apiRouter.use('/designs', designRouter)
apiRouter.use('/uploads', uploadRouter)
