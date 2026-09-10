import '../globals.css';
import { sitePath } from '../../lib/site-path';
import { notFound } from 'next/navigation';
import SiteHeader from '../../components/site-header';
import { SiteFooter } from '../../components/ui';
import { copy, locales } from '../../lib/content';

export const dynamicParams = false;
export function generateStaticParams() { return locales.map(locale => ({ locale })); }
export async function generateMetadata({ params }) { const { locale } = await params; const c = copy[locale]; if (!c) return {}; return { title: 'Forma Studio', description: c.home.intro, applicationName: 'Forma Studio', icons: { icon: sitePath('/icon.svg') } }; }
export default async function LocaleLayout({ children, params }) {
 const { locale } = await params;
 if (!locales.includes(locale)) notFound();
 return <html lang={locale}><body><a className="skip-link" href="#main-content">{copy[locale].skip}</a><SiteHeader locale={locale}/><main id="main-content">{children}</main><SiteFooter locale={locale}/></body></html>;
}
