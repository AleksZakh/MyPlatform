import {
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual,
} from 'node:crypto';


import { promisify } from 'node:util';

const scrypt =
  promisify(nodeScrypt);

const KEY_LENGTH = 64;

export const hashPassword = async (
  password: string,
): Promise<string> => {
  const salt =
    randomBytes(16);

  const derivedKey =
    await scrypt(
      password,
      salt,
      KEY_LENGTH,
    ) as Buffer;

  return [
    'scrypt',
    salt.toString('hex'),
    derivedKey.toString('hex'),
  ].join('$');
};


export const verifyPassword = async (
  password: string,
  storedHash: string,
): Promise<boolean> => {
  const [
    algorithm,
    saltHex,
    hashHex,
  ] = storedHash.split('$');

  if (
    algorithm !== 'scrypt' ||
    !saltHex ||
    !hashHex
  ) {
    return false;
  }

  try {
    const salt =
      Buffer.from(
        saltHex,
        'hex',
      );

    const storedKey =
      Buffer.from(
        hashHex,
        'hex',
      );

    const derivedKey =
      await scrypt(
        password,
        salt,
        storedKey.length,
      ) as Buffer;

    if (
      derivedKey.length !==
      storedKey.length
    ) {
      return false;
    }

    return timingSafeEqual(
      derivedKey,
      storedKey,
    );
  }
  catch {
    return false;
  }
};