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
                namespace: "https://github.com/Nouchi-Kousu/bilibili_live_emoticon_helper",
                match: ["https://live.bilibili.com/*"],
                grant: "GM_cookie",
                connect: ["api.live.bilibili.com"],
                description: "B站直播间表情辅助脚本",
                license: "MIT",
            },
        }),
    ],
})
