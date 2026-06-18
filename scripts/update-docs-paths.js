const fs = require('fs');
const path = require('path');
const docs = path.join(process.cwd(), 'docs');
const htmlFiles = ['index.html','login.html','signup.html','terms.html','admin-login.html','admin-dashboard.html'];
for (const fileName of htmlFiles) {
  const filePath = path.join(docs, fileName);
  let content = fs.readFileSync(filePath, 'utf8');
  const replacements = [
    [/href="\/admin\/dashboard"/g, 'href="admin-dashboard.html"'],
    [/href="\/admin"/g, 'href="admin-login.html"'],
    [/href="\/signup"/g, 'href="signup.html"'],
    [/href="\/login"/g, 'href="login.html"'],
    [/href="\/terms"/g, 'href="terms.html"'],
    [/href="\/"/g, 'href="index.html"'],
    [/src="\/assets\/logo.png"/g, 'src="assets/logo.png"'],
    [/href="\/assets\/logo.png"/g, 'href="assets/logo.png"'],
    [/href="\/css\/styles.css"/g, 'href="css/styles.css"'],
    [/href="\/css\/auth.css"/g, 'href="css/auth.css"'],
    [/src="\/js\/main.js"/g, 'src="js/main.js"'],
    [/src="\/js\/auth.js"/g, 'src="js/auth.js"'],
    [/src="\/js\/admin.js"/g, 'src="js/admin.js"']
  ];
  for (const [from, to] of replacements) {
    content = content.replace(from, to);
  }
  fs.writeFileSync(filePath, content, 'utf8');
}
const jsReplacements = [
  [/window\.location\.href = '\/'/g, "window.location.href = 'index.html'"],
  [/window\.location\.href = '\/login'/g, "window.location.href = 'login.html'"],
  [/window\.location\.href = '\/admin\/dashboard'/g, "window.location.href = 'admin-dashboard.html'"],
  [/window\.location\.href = '\/admin'/g, "window.location.href = 'admin-login.html'"],
];
const jsFiles = ['js/auth.js','js/admin.js'];
for (const fileName of jsFiles) {
  const filePath = path.join(docs, fileName);
  let content = fs.readFileSync(filePath, 'utf8');
  for (const [from, to] of jsReplacements) {
    content = content.replace(from, to);
  }
  fs.writeFileSync(filePath, content, 'utf8');
}
console.log('Docs path updates complete');
