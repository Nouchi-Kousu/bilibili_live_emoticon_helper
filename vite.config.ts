import { defineConfig } from "vite"
import { svelte } from "@sveltejs/vite-plugin-svelte"
import monkey from "vite-plugin-monkey"

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        svelte(),
        monkey({
            entry: "src/main.ts",
            userscript: {
                name: "B站直播表情助手",
                icon: "http://bilibili.com/favicon.ico",
                namespace: "npm/vite-plugin-monkey",
                match: ["https://live.bilibili.com/*"],
                grant: "GM_cookie",
                connect: ["api.live.bilibili.com"],
            },
        }),
    ],
})
