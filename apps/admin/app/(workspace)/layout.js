import Shell from '../../components/shell';
import {AdminLanguageProvider} from '../../lib/i18n';
export default function Layout({children}) { return <AdminLanguageProvider><Shell>{children}</Shell></AdminLanguageProvider>; }
