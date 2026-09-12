import { copy, pageMetadata } from '../../../lib/content';
import { PageIntro, CallToAction } from '../../../components/ui';
import ArticleList from '../../../components/article-list';
export async function generateMetadata({ params }) { return pageMetadata((await params).locale, 4); }
export default async function Insights({ params }) { const { locale } = await params; return <><PageIntro {...copy[locale].insights}/><section className="shell journal-list"><ArticleList locale={locale}/></section><CallToAction locale={locale}/></>; }
