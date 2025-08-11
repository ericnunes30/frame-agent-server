import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  cacheDir: 'node_modules/.vite_custom_cache', // Adiciona um diretório de cache customizado para o Vite
  server: {
    host: "::",
    port: 8080,
    fs: {
      strict: false, // Pode ajudar a evitar problemas de HMR em alguns sistemas
    },
    watch: {
      usePolling: true, // Usar polling para detecção de mudanças de arquivo
    },
    // Tentar desabilitar o cache do servidor de desenvolvimento (para fins de teste)
    // Remova ou comente esta linha se causar problemas ou lentidão excessiva
    // hmr: {
    //   overlay: false, // Desabilita o overlay de erro do HMR, pode ajudar em alguns casos
    // },
    // Nota: A opção para desabilitar o cache do servidor diretamente (como `server.hmr.cache = false`) não é padrão.
    // A melhor abordagem é limpar o cache do navegador e o `cacheDir` do Vite.
    // O `usePolling` e as meta tags no index.html são as principais ferramentas contra cache.
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
