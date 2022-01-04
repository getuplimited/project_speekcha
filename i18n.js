const NextI18Next = require('next-i18next').default;

module.exports = new NextI18Next({
  otherLanguages: ['hr', 'fr'],
  defaultNS: 'common',
  localeSubpaths: {
    hr: 'hr',
    fr: 'fr'
  },
  localePath: 'public/static/locales'
});
