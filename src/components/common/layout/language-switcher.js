import { useContext } from 'react';
import { I18nContext } from 'next-i18next';
import { i18n } from '../../../../i18n';

function LanguageSwitcher() {
  const {
    i18n: { language }
  } = useContext(I18nContext);

  return (
    <>
      <button
        type="button"
        onClick={() => i18n.changeLanguage('fr')}
        className={language === 'fr' ? 'is-active' : ''}
      >
        FR
      </button>
      <button
        type="button"
        onClick={() => i18n.changeLanguage('en')}
        className={language === 'en' ? 'is-active' : ''}
      >
        EN
      </button>
    </>
  );
}

export default LanguageSwitcher;
