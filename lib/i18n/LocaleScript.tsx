import {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_META,
  LOCALE_QUERY_PARAM,
  LOCALE_STORAGE_KEY,
} from "./config";

/**
 * Runs in <head>, before the browser paints anything.
 *
 * The pages themselves are statically generated in English so they stay on ISR
 * rather than turning dynamic. This script is what makes that invisible: it
 * resolves the visitor's language from ?lang= → localStorage → navigator and
 * stamps <html lang/dir class> straight away, so an Arabic visitor gets an RTL
 * page and the Arabic font on first paint. React then swaps the wording in as
 * it hydrates.
 *
 * The locale table is generated from config.ts, so adding a language here needs
 * no edit — only a new entry in LOCALES.
 */
export default function LocaleScript() {
  const dirs = Object.fromEntries(
    LOCALES.map((code) => [code, [LOCALE_META[code].htmlLang, LOCALE_META[code].dir]]),
  );

  const script = `(function(){try{
var M=${JSON.stringify(dirs)},D=${JSON.stringify(DEFAULT_LOCALE)},K=${JSON.stringify(LOCALE_STORAGE_KEY)};
function ok(v){return v&&Object.prototype.hasOwnProperty.call(M,v)?v:null}
var v=ok(new URLSearchParams(location.search).get(${JSON.stringify(LOCALE_QUERY_PARAM)}));
if(!v){try{v=ok(localStorage.getItem(K))}catch(e){}}
if(!v){var L=navigator.languages||[navigator.language||""];for(var i=0;i<L.length;i++){var c=ok(String(L[i]).toLowerCase().split("-")[0]);if(c){v=c;break}}}
if(!v)v=D;
var e=document.documentElement;e.setAttribute("lang",M[v][0]);e.setAttribute("dir",M[v][1]);
}catch(e){}})();`;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
