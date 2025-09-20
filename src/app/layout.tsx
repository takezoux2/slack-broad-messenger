import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { FirebaseProvider } from '../components/providers/FirebaseProvider';
import { AuthProvider } from '../components/providers/AuthProvider';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Slack Broad Messenger',
  description: 'Send messages to multiple Slack channels at once',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en'>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <FirebaseProvider>
          <AuthProvider>
            <div className='min-h-screen bg-gray-50'>
              <nav className='bg-white shadow-sm border-b'>
                <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
                  <div className='flex justify-between h-16'>
                    <div className='flex items-center'>
                      <h1 className='text-xl font-semibold text-gray-900'>Slack Broad Messenger</h1>
                    </div>
                  </div>
                </div>
              </nav>
              <main className='max-w-7xl mx-auto py-6 sm:px-6 lg:px-8'>{children}</main>
            </div>
          </AuthProvider>
        </FirebaseProvider>
      </body>
    </html>
  );
}
