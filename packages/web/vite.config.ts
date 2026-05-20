import { defineConfig, type Plugin } from 'vite';
import { APP_NAME, APP_FILE_EXT } from './src/branding';

const brandingHtmlPlugin = (): Plugin => ({
  name: 'branding-html',
  transformIndexHtml(html) {
    return html
      .replace(/%APP_NAME%/g, APP_NAME)
      .replace(/%APP_FILE_EXT%/g, APP_FILE_EXT);
  },
});

export default defineConfig({
  resolve: {
    preserveSymlinks: true,
  },
  plugins: [brandingHtmlPlugin()],
});
