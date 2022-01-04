/* eslint-disable react/react-in-jsx-scope */
import Document, { Html, Head, Main, NextScript } from 'next/document';
import { settingService } from '@services/setting.service';

class CustomDocument extends Document {
  static async getInitialProps(ctx) {
    const initialProps = await Document.getInitialProps(ctx);
    const resp = await settingService.all();
    const settings = resp.data;
    return {
      ...initialProps,
      settings
    };
  }

  render() {
    const { settings } = this.props as any;
    return (
      <Html>
        <Head>
          <link rel="icon" href={settings?.favicon} sizes="64x64" />
          <meta name="keywords" content={settings?.metaKeywords} />
          <meta name="description" content={settings?.metaDescription} />
          {/* OG tags */}
          <meta property="og:title" content={settings?.siteName} key="title" />
          <meta property="og:image" content={settings?.logoUrl} />
          <meta property="og:keywords" content={settings?.metaKeywords} />
          <meta property="og:description" content={settings?.metaDescription} />
          {/* GA code */}
          {settings?.gaCode && (
            <script
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{
                __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer', '${settings.gaCode}');`
              }}
            />
          )}
          {/* extra script */}
          {settings && settings.headerScript && (
            // eslint-disable-next-line react/no-danger
            <div dangerouslySetInnerHTML={{ __html: settings.headerScript }} />
          )}
          {
            <script
              type="text/javascript"
              src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
            />
          }
          {
            <script
              dangerouslySetInnerHTML={{
                __html: `function googleTranslateElementInit() {
                         new google.translate.TranslateElement({pageLanguage: 'en'}, 'google_translate_element');
                        }`
              }}
            />
          }
        </Head>
        <body>
          <Main />
          <NextScript />

          {/* extra script */}
          {settings?.afterBodyScript && (
            // eslint-disable-next-line react/no-danger
            <div
              dangerouslySetInnerHTML={{ __html: settings.afterBodyScript }}
            />
          )}
        </body>
      </Html>
    );
  }
}

export default CustomDocument;
