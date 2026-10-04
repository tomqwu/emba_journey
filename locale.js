const locale = document.documentElement.dataset.locale || "en";
const base = document.documentElement.dataset.base;
// A language button is an explicit choice. Retain filters; translated section slugs differ.
for (const link of document.querySelectorAll("a[data-locale]")) {
  const url = new URL(link.href);
  url.search = location.search;
  link.href = url.href;
  link.addEventListener("click", () => {
    const target = new URL(link.href);
    target.search = location.search;
    link.href = target.href;
    try {
      window.localStorage.setItem("emba-locale", link.dataset.locale);
    } catch {}
  });
}
let preferred;
try {
  preferred = window.localStorage.getItem("emba-locale");
} catch {}
const explicit =
  document.referrer && new URL(document.referrer).origin === location.origin;
if (!explicit && locale === "en" && preferred === "zh") {
  const relative = location.pathname.slice(base.length).replace(/^zh\//, "");
  location.replace(
    base + (preferred === "zh" ? "zh/" : "") + relative + location.search,
  );
}
