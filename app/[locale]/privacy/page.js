import { copy } from '../../../lib/content';
import { Eyebrow, TextLink } from '../../../components/ui';
export async function generateMetadata({params}) { const {locale}=await params; return {title:`${copy[locale].footer.privacyTitle} | Forma Studio`}; }
export default async function Privacy({params}) { const {locale}=await params; const c=copy[locale]; return <section className="shell privacy-page"><Eyebrow>FORMA STUDIO</Eyebrow><h1>{c.footer.privacyTitle}</h1><p>{c.footer.privacyText}</p><TextLink href={`/${locale}`}>{c.nav[0]}</TextLink></section>; }
