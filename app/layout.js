import { Poppins } from 'next/font/google';
import './globals.css';
import Providers from './providers';

const poppins = Poppins({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-poppins'
});

export const metadata = {
  title: 'Crocco-DZ Admin Dashboard',
  description: 'Admin dashboard for Crocco-DZ E-commerce Platform',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={poppins.className} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
