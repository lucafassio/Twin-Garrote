import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Parpadeo',
  description: 'Comunicacion aumentativa para personas con ELA',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
