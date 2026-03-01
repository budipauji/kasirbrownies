import { auth } from '../src/lib/auth';

async function run() {
  console.log('auth methods:', Object.keys(auth));
  // use the signUpEmail API helper provided by better-auth
  try {
    const result = await auth.api.signUpEmail({
      body: {
        email: 'chocofellas@mail.com',
        password: 'felaniacantik',
        name: 'Choco Fellas',
      }
    });
    console.log('signUpEmail result:', result);
  } catch (err) {
    console.error('failed to create user via API:', err);
  }
}

run().catch(console.error);
