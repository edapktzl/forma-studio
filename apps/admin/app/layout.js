import './globals.css';
import '@fontsource-variable/plus-jakarta-sans';
import {AdminLanguageProvider} from '../lib/i18n';
export const metadata = { title: 'Forma Studio | Workspace', robots: { index: false, follow: false } };
export default function Layout({children}) { return <html lang="en"><body><AdminLanguageProvider>{children}</AdminLanguageProvider></body></html>; }
