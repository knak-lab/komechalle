import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' にしておくと GitHub Pages のサブパスでもそのまま動く
export default defineConfig({
  plugins: [react()],
  base: './',
});
