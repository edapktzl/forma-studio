import { copy, pageMetadata } from '../../../lib/content';
import { PageIntro, CallToAction } from '../../../components/ui';
import ProjectGallery from '../../../components/project-gallery';
export async function generateMetadata({ params }) { return pageMetadata((await params).locale, 3); }
export default async function Projects({ params }) { const { locale } = await params; return <><PageIntro {...copy[locale].projects}/><section className="shell portfolio-section"><ProjectGallery locale={locale}/></section><CallToAction locale={locale}/></>; }
