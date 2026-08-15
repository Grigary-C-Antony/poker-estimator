import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PointSprint — Planning Poker',
  description: 'Async-friendly planning poker for engineering teams',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';}catch(e){}})();` }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
