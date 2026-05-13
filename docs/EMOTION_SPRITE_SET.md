# Emotion Sprite Set

**最終更新: 2026-05-13 (v0.2.1)**

表情スプライトは、キャラ描画の安定性を優先して最小構成で扱う。
window size / hit test / character-stage / compact speech layout は変更しない。

## 方針

- Emotion は既存spriteへ安全fallbackする
- 専用PNGがない場合でも表示は消えない
- 画像未存在時は `idle.png` までフォールバックする
- sprite追加は任意。未追加でもアプリは壊れない

## 現在の mapping

| emotion | preferred asset | fallback state |
|---|---|---|
| `idle` | `idle.png` | `idle` |
| `aware` | `aware.png` | `touched` |
| `touched` | `touched.png` | `touched` |
| `thinking` | `thinking.png` | `thinking` |
| `speaking` | `speaking.png` | `speaking` |
| `sleep` | `sleep.png` | `sleep` |
| `waking` | `waking.png` | `waking` |
| `happy` | `happy.png` | `touched` |
| `shy` | `shy.png` | `idle` |
| `concerned` | `concerned.png` | `touched` |

## 実装メモ

- `Character` は `emotion` を受け取り、`emotionToSpriteState()` で既存stateへ落とす
- `SpriteSurface` は `emotion.png → fallback state.png → current state.png → idle.png` の順で試す
- DebugOverlay は `emo=` と `eff=` を表示する
- AI/RuleProvider が `emotion` を返した時だけ反映する
- Ollamaがemotionを返さない場合、従来通りstateベース表示になる

## 禁止

- window size変更
- hit test geometry変更
- speech時window resize復活
- 410px expanded window復活
- 画像未存在で表示を消す実装
