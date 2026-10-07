import redisDriver from 'unstorage/drivers/redis';
export default defineNitroPlugin(async () => {
  // Release builds do not read production .env. Redis must be selected at runtime too.
  if (process.env.REDIS_URL) {
    const storage = useStorage();
    await storage.unmount('adCache');
    storage.mount('adCache', redisDriver({ url: process.env.REDIS_URL, ttl: 900 }));
  }
});
