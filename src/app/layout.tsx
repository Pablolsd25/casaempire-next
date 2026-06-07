import type { Metadata } from 'next'
import { Oswald, Poppins } from 'next/font/google'
import './globals.css'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import FloatingSocialButtons from '@/components/FloatingSocialButtons'

const oswald = Oswald({
  subsets: ['latin'],
  variable: '--font-oswald',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

const poppins = Poppins({
  subsets: ['latin'],
  variable: '--font-poppins',
  weight: ['300', '400', '500', '600'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default:  'Empire Nutrition | Suplementos de Alto Rendimiento',
    template: '%s | Empire Nutrition',
  },
  description:
    'Suplementos deportivos de alta calidad para hombres y mujeres. Proteínas, creatina, BCAA, quemadores y más. Envíos a todo México.',
  keywords: ['suplementos', 'proteína', 'creatina', 'BCAA', 'nutrición deportiva', 'México'],
  icons: {
    icon: '/favicon.jpg',
    apple: '/favicon.jpg',
  },
  openGraph: {
    siteName: 'Empire Nutrition',
    locale:   'es_MX',
    type:     'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`${oswald.variable} ${poppins.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-black text-white font-sans">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <FloatingSocialButtons />
      </body>
    </html>
  )
}
