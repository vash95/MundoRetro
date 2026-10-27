import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Mundo Retro | Mi colección', description: 'Colección de videojuegos, consolas y accesorios' };
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es"><body>{children}</body></html>}
