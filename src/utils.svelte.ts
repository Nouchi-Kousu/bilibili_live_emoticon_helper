// #region emoticon 列表数据
// 使用 localStorage 来存储最近使用的 emoticon 列表
const storage = localStorage

class emoticonList {
    emoticons: string[] = $state([])
    private _room_id: number | null = null

    /** 由 main.ts 在 constants 就绪后调用，完成延迟初始化 */
    init(room_id: number): void {
        this._room_id = room_id
        const stored = storage.getItem(`emoticon_list_${room_id}`)
        if (stored) {
            try {
                this.emoticons = JSON.parse(stored).slice(0, 6)
            } catch {
                this.emoticons = []
            }
        }
    }

    add(emoticon: string) {
        this.emoticons = [emoticon, ...this.emoticons.filter((e) => e !== emoticon)].slice(0, 6)
        if (this._room_id !== null) {
            storage.setItem(`emoticon_list_${this._room_id}`, JSON.stringify(this.emoticons))
        }
    }
}

export const emoticon_list = new emoticonList()
// #endregion