import { type NextRequest, NextResponse } from 'next/server'; // App Router
import { adminAuth } from '@/lib/firebase-admin';

export type SignInRequest = {
  idToken: string;
};

export async function POST(req: NextRequest) {
  try {
    const { idToken } = (await req.json()) as SignInRequest;
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 30日間
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn,
    });

    const options = {
      name: 'session',
      value: sessionCookie,
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    };

    const response = NextResponse.json({ status: 'success' }, { status: 200 });
    response.cookies.set(options);
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    console.log(
      `Sign-in successful: session cookie set for user. Email: ${decodedToken.email}, Name: ${decodedToken.name}`
    );
    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create session' }, { status: 401 });
  }
}
