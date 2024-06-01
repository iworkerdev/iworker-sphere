import { Inter } from 'next/font/google'
import type { Metadata } from 'next'
import { Providers } from '../providers'
const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Iworker Sphere',
  description: 'Account warmup tool',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='en'>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
