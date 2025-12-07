import { type PinoLogger } from "nestjs-pino";

export async function ExponentialBackoffWaitFunction(retry: number, max_retry: number, logger: PinoLogger) {
  const waittime = 2 ** (retry + 1) * 10 + 1000 * Math.random();
  logger.warn(`Waiting ${waittime.toFixed(2)} on retry ${String(retry + 1)} of ${String(max_retry)}`);
  return await new Promise((res) => setTimeout(res, waittime));
}

export async function ExponentialBackoff<T>(
  request: () => Promise<T>,
  retry_checker: (err: unknown) => boolean,
  retry: number,
  max_retry: number,
  logger: PinoLogger,
): Promise<T> {
  try {
    const response = await request();
    return response;
  } catch (err: unknown) {
    if (retry_checker(err) && retry < max_retry) {
      await ExponentialBackoffWaitFunction(retry, max_retry, logger);
      return await ExponentialBackoff<T>(request, retry_checker, retry + 1, max_retry, logger);
    }
    throw err;
  }
}