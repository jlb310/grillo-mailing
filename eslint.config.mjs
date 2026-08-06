import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // `set-state-in-effect` marca nuestro patrón de "fetch al montar": el efecto
  // llama a un `fetch` async y el setState ocurre DESPUÉS del await, así que no
  // hay render en cascada sincrónico — la regla no ve a través del límite async.
  // Queda como warning en vez de error: el arreglo real es mover estas páginas a
  // Server Components o a una capa de datos (SWR/React Query), no silenciarlas
  // archivo por archivo.
  {
    files: ["src/**/*.tsx"],
    rules: {
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Los scripts de `scripts/` corren con `node` crudo dentro del contenedor
  // (entrypoint.sh), no pasan por el bundler: CommonJS es lo correcto ahí.
  {
    files: ["scripts/**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]);

export default eslintConfig;
