<script lang="ts">
    import { unsafeWindow } from "$"
    let favWidth: number = $state(0)
    let itemWidth: number = $derived((favWidth - 5) / 6 - 5)
    import { constants } from "./main"
    import { emoticon_list } from "./utils.svelte"
    let emoticon_list_with_descript = $derived(
        emoticon_list.emoticons.map((emoticon) => {
            return {
                descript:
                    constants.emoticon_map.get(emoticon)?.descript ||
                    "未知表情",
                url: constants.emoticon_map.get(emoticon)?.url || "",
                emoticon_unique: emoticon,
            }
        }),
    )
</script>

<main>
    {#if emoticon_list_with_descript.length > 0}
        <div
            id="emoticon-fav"
            class="emoticon-fav"
            bind:offsetWidth={favWidth}
            style="height: {(favWidth - 5) / 6 + 5}px"
        >
            {#each emoticon_list_with_descript as emoticon (emoticon.emoticon_unique)}
                <button
                    class="emoticon-fav-item"
                    title={emoticon.descript}
                    style="width: {itemWidth}px; height: {itemWidth}px;"
                    id={emoticon.emoticon_unique}
                    onclick={async () => {
                        const csrf = constants.csrf
                        const body = new FormData()
                        body.append("msg", emoticon.emoticon_unique)
                        body.append("roomid", String(constants.room_id))
                        body.append("csrf", csrf)
                        body.append("csrf_token", csrf)
                        body.append("color", "16777215")
                        body.append("mode", "1")
                        body.append("fontsize", "25")
                        body.append(
                            "rnd",
                            String(Math.floor(Date.now() / 1000)),
                        )
                        body.append("room_type", "0")
                        body.append("bubble", "0")
                        body.append("dm_type", "1")
                        unsafeWindow.fetch("https://api.live.bilibili.com/msg/send", {
                            method: "POST",
                            credentials: "include",
                            body,
                        })
                    }}
                >
                    <img src={emoticon.url} alt={emoticon.descript} />
                </button>
            {/each}
        </div>
    {/if}
</main>

<style>
    .emoticon-fav {
        background-color: var(--bg1);
        display: flex;
        box-sizing: border-box;
        padding: 5px 0px 0px 5px;
    }

    .emoticon-fav .emoticon-fav-item {
        background-color: var(--bg1);
        margin: 0px 5px 5px 0px;
        box-sizing: border-box;
        border: none;
        padding: 0px;
        outline: none;
        cursor: pointer;
    }
    .emoticon-fav .emoticon-fav-item img {
        width: 100%;
        height: 100%;
    }
</style>
