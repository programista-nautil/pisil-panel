import { Queue } from 'bullmq'
import IORedis from 'ioredis'

// Konfiguracja połączenia z Redisem (domyślnie localhost:6379)
const connection = new IORedis({
	host: process.env.REDIS_HOST || '127.0.0.1',
	port: process.env.REDIS_PORT || 6379,
	maxRetriesPerRequest: null,
})

export const emailQueue = new Queue('email-queue', { connection })
