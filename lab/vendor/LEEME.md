# Piezas de terceros del laboratorio

- `web-tree-sitter.js` y `web-tree-sitter.wasm`: web-tree-sitter 0.27.2 (licencia MIT, `LICENSE-web-tree-sitter`).
- `tree-sitter-julia.wasm`: tree-sitter-julia 0.23.1 (licencia MIT, `LICENSE-tree-sitter-julia`), la gramática de Julia.

Se copian tal cual desde `node_modules` (`npm ci`). Para actualizarlas: cambiar las versiones en
`package.json`, `npm install` y volver a copiarlas; después, `node herramientas/conformidad.mjs`.
