import typescript from "rollup-plugin-typescript2";
import terser from "@rollup/plugin-terser";
import json from "@rollup/plugin-json";
import dts from "rollup-plugin-dts";

// External dependencies that shouldn't be bundled
const external = ["react", "vue"];

// Shared configuration for ESM and CJS builds
const createConfig = (input, output, format = 'esm', plugins = []) => ({
  input,
  output: {
    file: output,
    format,
    sourcemap: true,
    exports: 'named',
  },
  external,
  plugins: [
    json(),
    typescript({
      tsconfig: './tsconfig.json',
      useTsconfigDeclarationDir: true,
      tsconfigOverride: {
        compilerOptions: {
          declaration: true,
        },
      },
    }),
    ...plugins,
  ],
});

export default [
  // Core library (ESM)
  createConfig('src/index.ts', 'dist/index.js'),
  
  // Core library (CJS)
  createConfig('src/index.ts', 'dist/index.cjs', 'cjs', [terser()]),
  
  // React integration (ESM)
  createConfig('src/react.ts', 'dist/react.js'),
  
  // React integration (CJS)
  createConfig('src/react.ts', 'dist/react.cjs', 'cjs', [terser()]),
  
  // Vue integration (ESM)
  createConfig('src/vue.ts', 'dist/vue.js'),
  
  // Vue integration (CJS)
  createConfig('src/vue.ts', 'dist/vue.cjs', 'cjs', [terser()]),
  
  // Run dts plugin in a separate step after TypeScript has generated declaration files
];