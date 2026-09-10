import { copy, articles, pageMetadata } from '../../../lib/content';
import { PageIntro, ArticleCard, CallToAction } from '../../../components/ui';
export async function generateMetadata({ params }) { return pageMetadata((await params).locale, 4); }
export default async function Insights({ params }) { const { locale } = await params; return <><PageIntro {...copy[locale].insights}/><section className="shell journal-list"><div className="article-grid">{articles.map(article=><ArticleCard key={article.slug} article={article} locale={locale}/>)}</div></section><CallToAction locale={locale}/></>; }
