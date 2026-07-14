import { mount } from "svelte"
// 使用 unsafeWindow 来访问全局对象，避免油猴沙箱代理导致无法正确挂载
import { GM_cookie, unsafeWindow } from "$"

// #region 获取异步不变量
const short_room_id = Number(location.pathname.split("/").pop()?.split("?")[0])

const room_id = await fetch(
    `https://api.live.bilibili.com/room/v1/Room/room_init?id=${short_room_id}`,
)
    .then((res) => res.json())
    .then((data) => data.data?.room_id || short_room_id)
    .catch(() => short_room_id)

type emoticon = {
    emoji: string
    url: string
}

type emoticonDataResponse = {
    code: number
    message: string
    ttl: number
    data: {
        data: {
            emoticons: {
                emoji: string
                url: string
                emoticon_unique: string
            }[]
        }[]
    }
}

// 使用哈希表来存储 emoticon 映射表，便于使用 emoticon_unique 快速查找对应的表情数据
const emoticon_map: Map<string, emoticon> = new Map()
// 请求获取完整表情
const all_emoticon: emoticonDataResponse = await fetch(
    `https://api.live.bilibili.com/xlive/web-ucenter/v2/emoticon/GetEmoticons?build=8530200&mobi_app=android&platform=android&room_id=${room_id}`,
    {
        headers: {
            accept: "application/json, text/plain, */*",
        },
        referrer: `https://live.bilibili.com/${room_id}`,
        body: null,
        method: "GET",
        mode: "cors",
        credentials: "include",
    },
)
    .then((res) => res.json())
    .catch((err) => {
        console.error("Failed to fetch emoticon data:", err)
        return { code: -1, message: "Error", ttl: 0, data: { data: [] } }
    })

for (const { emoticons } of all_emoticon.data.data) {
    for (const { emoji, url, emoticon_unique } of emoticons) {
        emoticon_map.set(emoticon_unique, { emoji, url })
    }
}

// 请求获取 CSRF Token
function getCookie(name: string): Promise<string> {
    return new Promise((resolve) => {
        GM_cookie.list({ name }, (cookies, error) => {
            if (error || !cookies || cookies.length === 0) {
                resolve("")
            } else {
                resolve(cookies[0].value)
            }
        })
    })
}

const csrf = await getCookie("bili_jct")
// 导出常量：长房间号、验证码、emoticon 映射表
export const constants = { room_id, csrf, emoticon_map }

// 解除循环引用：在 constants 就绪后再初始化 emoticon_list
import { emoticon_list } from "./utils.svelte"
emoticon_list.init(room_id)
// #endregion

// #region XHR 代理 —— 拦截 GetEmoticons 请求，重定向到移动端 API 以获取充电表情包列表
const XHR_INTERCEPTED_KEY = Symbol.for("__bili_live_xhr_intercepted__")

// 防止 SPA 导航导致脚本重复执行时，window.XMLHttpRequest 被多次包装
if (!(unsafeWindow as any)[XHR_INTERCEPTED_KEY]) {
    ;(unsafeWindow as any)[XHR_INTERCEPTED_KEY] = true
    const OriginalXHR = unsafeWindow.XMLHttpRequest

    class ProxiedXHR extends OriginalXHR {
        open(
            method: string,
            url: string | URL,
            async: boolean = true,
            user?: string | null,
            password?: string | null,
        ): void {
            const urlStr = url.toString()
            if (urlStr.includes("GetEmoticons")) {
                super.open(
                    method,
                    `https://api.live.bilibili.com/xlive/web-ucenter/v2/emoticon/GetEmoticons?build=8530200&mobi_app=android&platform=android&room_id=${room_id}`,
                    async,
                    user,
                    password,
                )
            } else {
                super.open(method, url, async, user, password)
            }
        }
    }

    unsafeWindow.XMLHttpRequest = ProxiedXHR as any
}
// #endregion

// #region FETCH 代理 —— 监听表情弹幕发送请求，并将表情弹幕的 emoticon_unique 添加到 emoticon_list 中
const FETCH_INTERCEPTED_KEY = Symbol.for("__bili_live_fetch_intercepted__")

// 防止 SPA 导航导致脚本重复执行时，window.fetch 被多次包装
if (!(unsafeWindow as any)[FETCH_INTERCEPTED_KEY]) {
    ;(unsafeWindow as any)[FETCH_INTERCEPTED_KEY] = true
    const originalFetch = unsafeWindow.fetch
    unsafeWindow.fetch = async (...args) => {
        const url = args[0] instanceof Request ? args[0].url : args[0]
        console.log("Intercepted fetch request:", url, args[1])
        const response = await originalFetch(...args)
        const clone = response.clone()
        if (
            clone.headers.get("content-type") ===
            "application/json; charset=utf-8"
        ) {
            if (String(url).includes("msg/send")) {
                const request_body = args[1]?.body
                const requestObject = Object.fromEntries(
                    request_body instanceof FormData
                        ? request_body.entries()
                        : [],
                )
                const msg = requestObject.msg
                // 判断弹幕类型，如果是表情弹幕，则将其添加到 emoticon_list 中
                if (requestObject.dm_type === "1" && typeof msg === "string") {
                    emoticon_list.add(msg)
                }
            }
        }

        return response
    }
}
// #endregion

// #region 监听 DOM 元素加载以挂载 Svelte 应用
function waitForElement(
    selector: string,
    timeout: number = 15000,
): Promise<Element> {
    return new Promise((resolve, reject) => {
        const element = document.querySelector(selector)
        if (element) {
            resolve(element)
            return
        }

        const observer = new MutationObserver(() => {
            const el = document.querySelector(selector)
            if (el) {
                observer.disconnect()
                resolve(el)
            }
        })
        observer.observe(document.body, { childList: true, subtree: true })

        setTimeout(() => {
            observer.disconnect()
            reject(
                new Error(
                    `Element with selector "${selector}" not found within ${timeout}ms`,
                ),
            )
        }, timeout)
    })
}

// 挂载 Svelte 应用到 DOM 元素上
// 防止引用时 emoticon_list 未初始化
import App from "./App.svelte"

waitForElement("#chat-control-panel-vm").then((target) => {
    const container = document.createElement("div")
    container.id = "bili-live-helper"
    mount(App, { target: container })
    target.insertAdjacentElement("beforebegin", container)
}).catch((err) => {
    console.error("[B站直播表情助手] 挂载失败:", err)
})
// #endregion