'use client';

import { GoogleAuthProvider, getAuth, signInWithPopup } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { getFirebaseApp, getFirebaseAuth } from '@/lib/firebase';

export default function SignIn() {
  const router = useRouter();
  return (
    <div className='max-w-md mx-auto text-center'>
      <div className='bg-white shadow-sm rounded-lg p-8'>
        <h2 className='text-2xl font-bold text-gray-900 mb-4'>Welcome to Slack Broad Messenger</h2>
        <p className='text-gray-600 mb-6'>
          Send messages to multiple Slack channels at once. Sign in with Google to get started.
        </p>
        <button
          type='button'
          onClick={async () => {
            const app = getFirebaseApp();
            const auth = getAuth(app);

            const provider = new GoogleAuthProvider();
            signInWithPopup(auth, provider).then(async result => {
              console.log(result);
              const idToken = await result.user?.getIdToken();
              if (idToken) {
                await fetch('/api/auth/signin', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ idToken }),
                });
                router.replace('/');
              }
            });
            console.log(auth);
          }}
          className='w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors'
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
