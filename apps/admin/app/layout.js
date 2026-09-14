import './globals.css';
import '@fontsource-variable/figtree';
import '@fontsource/instrument-serif';
import {AdminLanguageProvider} from '../lib/i18n';
export const metadata = { title: 'Forma Studio | Workspace', robots: { index: false, follow: false } };
export default function Layout({children}) { return <html lang="en"><body><AdminLanguageProvider>{children}</AdminLanguageProvider></body></html>; }
