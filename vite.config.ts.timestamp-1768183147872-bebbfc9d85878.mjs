// vite.config.ts
import { sveltekit } from "file:///C:/Users/28639/Desktop/DBC/HPVideo/node_modules/@sveltejs/kit/src/exports/vite/index.js";
import { defineConfig } from "file:///C:/Users/28639/Desktop/DBC/HPVideo/node_modules/vite/dist/node/index.js";
var vite_config_default = defineConfig({
  plugins: [
    sveltekit()
  ],
  define: {
    APP_VERSION: JSON.stringify(process.env.npm_package_version)
  },
  worker: {
    format: "es"
  },
  optimizeDeps: {
    include: ["core-js"]
  },
  server: {
    fs: {
      allow: [
        "./static"
      ]
    }
  },
  build: {
    // 开启代码压缩
    minify: "terser",
    rollupOptions: {
      output: {
        assetFileNames: "assets/[name]-[hash][extname]",
        chunkFileNames: "chunks/[name]-[hash].js",
        entryFileNames: "entries/[name]-[hash].js"
      }
    },
    terserOptions: {
      // 自定义 terser 配置
      compress: {
        // drop_console: true, // 移除 console 语句
        drop_debugger: true
        // 移除 debugger 语句
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFwyODYzOVxcXFxEZXNrdG9wXFxcXERCQ1xcXFxIUFZpZGVvXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFwyODYzOVxcXFxEZXNrdG9wXFxcXERCQ1xcXFxIUFZpZGVvXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy8yODYzOS9EZXNrdG9wL0RCQy9IUFZpZGVvL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgc3ZlbHRla2l0IH0gZnJvbSAnQHN2ZWx0ZWpzL2tpdC92aXRlJztcbmltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnO1xuXG4vLyAvKiogQHR5cGUge2ltcG9ydCgndml0ZScpLlBsdWdpbn0gKi9cbi8vIGNvbnN0IHZpdGVTZXJ2ZXJDb25maWcgPSB7XG4vLyBcdG5hbWU6ICdsb2ctcmVxdWVzdC1taWRkbGV3YXJlJyxcbi8vIFx0Y29uZmlndXJlU2VydmVyKHNlcnZlcikge1xuLy8gXHRcdHNlcnZlci5taWRkbGV3YXJlcy51c2UoKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG4vLyBcdFx0XHRyZXMuc2V0SGVhZGVyKCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nLCAnKicpO1xuLy8gXHRcdFx0cmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcycsICdHRVQnKTtcbi8vIFx0XHRcdHJlcy5zZXRIZWFkZXIoJ0Nyb3NzLU9yaWdpbi1PcGVuZXItUG9saWN5JywgJ3NhbWUtb3JpZ2luJyk7XG4vLyBcdFx0XHRyZXMuc2V0SGVhZGVyKCdDcm9zcy1PcmlnaW4tRW1iZWRkZXItUG9saWN5JywgJ3JlcXVpcmUtY29ycCcpO1xuLy8gXHRcdFx0bmV4dCgpO1xuLy8gXHRcdH0pO1xuLy8gXHR9XG4vLyB9O1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuXHRwbHVnaW5zOiBbXG5cdFx0c3ZlbHRla2l0KClcblx0XSxcblx0ZGVmaW5lOiB7XG5cdFx0QVBQX1ZFUlNJT046IEpTT04uc3RyaW5naWZ5KHByb2Nlc3MuZW52Lm5wbV9wYWNrYWdlX3ZlcnNpb24pXG5cdH0sXG5cdHdvcmtlcjoge1xuXHRcdGZvcm1hdDogJ2VzJ1xuXHR9LFxuXHRvcHRpbWl6ZURlcHM6IHtcblx0XHRpbmNsdWRlOiBbJ2NvcmUtanMnXVxuXHR9LFxuXHRzZXJ2ZXI6IHtcblx0XHRmczoge1xuXHRcdFx0YWxsb3c6IFtcblx0XHRcdFx0Jy4vc3RhdGljJyxcblx0XHRcdF0sXG5cdFx0fVxuXHR9LFxuXHRidWlsZDoge1xuICAgIC8vIFx1NUYwMFx1NTQyRlx1NEVFM1x1NzgwMVx1NTM4Qlx1N0YyOVxuICAgIG1pbmlmeTogJ3RlcnNlcicsXG5cdFx0cm9sbHVwT3B0aW9uczoge1xuXHRcdFx0b3V0cHV0OiB7XG5cdFx0XHRcdGFzc2V0RmlsZU5hbWVzOiAnYXNzZXRzL1tuYW1lXS1baGFzaF1bZXh0bmFtZV0nLFxuXHRcdFx0XHRjaHVua0ZpbGVOYW1lczogJ2NodW5rcy9bbmFtZV0tW2hhc2hdLmpzJyxcblx0XHRcdFx0ZW50cnlGaWxlTmFtZXM6ICdlbnRyaWVzL1tuYW1lXS1baGFzaF0uanMnXG5cdFx0XHR9XG5cdFx0fSxcbiAgICB0ZXJzZXJPcHRpb25zOiB7XG4gICAgICAvLyBcdTgxRUFcdTVCOUFcdTRFNDkgdGVyc2VyIFx1OTE0RFx1N0Y2RVxuICAgICAgY29tcHJlc3M6IHtcbiAgICAgICAgLy8gZHJvcF9jb25zb2xlOiB0cnVlLCAvLyBcdTc5RkJcdTk2NjQgY29uc29sZSBcdThCRURcdTUzRTVcbiAgICAgICAgZHJvcF9kZWJ1Z2dlcjogdHJ1ZSAvLyBcdTc5RkJcdTk2NjQgZGVidWdnZXIgXHU4QkVEXHU1M0U1XG4gICAgICB9XG4gICAgfVxuICB9XG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBb1MsU0FBUyxpQkFBaUI7QUFDOVQsU0FBUyxvQkFBb0I7QUFnQjdCLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzNCLFNBQVM7QUFBQSxJQUNSLFVBQVU7QUFBQSxFQUNYO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDUCxhQUFhLEtBQUssVUFBVSxRQUFRLElBQUksbUJBQW1CO0FBQUEsRUFDNUQ7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNQLFFBQVE7QUFBQSxFQUNUO0FBQUEsRUFDQSxjQUFjO0FBQUEsSUFDYixTQUFTLENBQUMsU0FBUztBQUFBLEVBQ3BCO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDUCxJQUFJO0FBQUEsTUFDSCxPQUFPO0FBQUEsUUFDTjtBQUFBLE1BQ0Q7QUFBQSxJQUNEO0FBQUEsRUFDRDtBQUFBLEVBQ0EsT0FBTztBQUFBO0FBQUEsSUFFSixRQUFRO0FBQUEsSUFDVixlQUFlO0FBQUEsTUFDZCxRQUFRO0FBQUEsUUFDUCxnQkFBZ0I7QUFBQSxRQUNoQixnQkFBZ0I7QUFBQSxRQUNoQixnQkFBZ0I7QUFBQSxNQUNqQjtBQUFBLElBQ0Q7QUFBQSxJQUNFLGVBQWU7QUFBQTtBQUFBLE1BRWIsVUFBVTtBQUFBO0FBQUEsUUFFUixlQUFlO0FBQUE7QUFBQSxNQUNqQjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
