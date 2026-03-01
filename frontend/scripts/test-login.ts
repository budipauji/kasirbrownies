import { authClient } from '../src/lib/auth-client';

async function run() {
  try {
    const res = await authClient.signIn.email({
      email: 'chocofellas@mail.com',
      password: 'felaniacantik',
    });
    console.log('login result', res);
  } catch (e) {
    console.error('login error', e);
  }
}

run();
