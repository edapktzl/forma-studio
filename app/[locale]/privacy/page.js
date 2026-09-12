import { copy } from '../../../lib/content';
import { Eyebrow, TextLink } from '../../../components/ui';
const livePrivacy = {
 en: 'Forma is a demonstration architecture studio. When you submit the contact form, your name, email, optional phone number, subject and message are stored so the studio can review your enquiry. Authorized administrators can access these messages. If email notifications are configured, the notification provider also processes the enquiry. Uploaded images are served by this site; some demonstration images come from Unsplash. Company profiles and stories remain illustrative.',
 tr: 'Forma, örnek bir mimarlık stüdyosudur. İletişim formunu gönderdiğinizde adınız, soyadınız, e-posta adresiniz, isteğe bağlı telefon numaranız, konu ve mesajınız talebinizin incelenmesi için kaydedilir. Yetkili yöneticiler bu mesajlara erişebilir. E-posta bildirimleri yapılandırılmışsa bildirim sağlayıcısı da talebi işler. Yüklenen görseller bu siteden, bazı örnek görseller ise Unsplash üzerinden sunulur. Şirket profilleri ve anlatılar örnek içeriktir.'
};
export async function generateMetadata({params}) { const {locale}=await params; return {title:`${copy[locale].footer.privacyTitle} | Forma Studio`}; }
export default async function Privacy({params}) { const {locale}=await params; const c=copy[locale]; return <section className="shell privacy-page"><Eyebrow>FORMA STUDIO</Eyebrow><h1>{c.footer.privacyTitle}</h1><p>{process.env.NEXT_PUBLIC_API_URL ? livePrivacy[locale] : c.footer.privacyText}</p><TextLink href={`/${locale}`}>{c.nav[0]}</TextLink></section>; }
