# v1.6.0 Field QA Completion Audit

**最終更新: 2026-05-15**

この文書は、Visible Local Observer Companion goal を完了扱いにしてよいかを判定するための prompt-to-artifact audit である。
automated checks や release workflow success は重要な証拠だが、7日間常駐QAと実機 gate の代替にはしない。

## Objective Restatement

AmitySpirit Companion を、かわいい常駐コンパニオンとして振る舞いながら、観察・保存・AI送信・provider/model/fallback/suppression reason をUIで確認できる Visible Local Observer Companion として完成させる。

v1.6.0 Daily-use Beta では、以下を実機で確認する。

- 7日間常駐して crash / freeze / 操作不能がない
- installer / updater / latest.json / signature が実インストール環境で成立する
- OpenAIなし、OpenAIあり、Ollama fallback、RuleProvider fallback が破綻しない
- Memory v2 と filename samples の privacy boundary が崩れない
- Debug / Diagnostics / Transparency で観察・保存・AI送信範囲と provider/model/intent/fallback/suppression reason が追える
- UI comfort と発話品質が日常利用に耐える

## Evidence Snapshot

| Evidence | Current state |
|---|---|
| branch | `main` |
| main / origin/main | match |
| working tree | clean at preflight |
| latest release tag | `v1.5.4` |
| latest version files | `1.5.4` |
| preflight | `npm run qa:preflight` failures 0 / warnings 0 |
| release workflow | `v1.5.4` Release workflow success |
| release assets | installer / `.sig` / `latest.json` confirmed |
| field QA | Day 0 / Preflight only |
| 7-day residency QA | not performed |

## North-star Completion Audit

| # | Requirement | Evidence | Status |
|---:|---|---|---|
| 1 | 何を見ているかがUI上で分かる | Observation / Diagnostics UI implemented; v1.6 Day 4 field QA pending | weakly verified |
| 2 | 何を保存しているかがUI上で分かる | Memory v2 UI and export implemented; Day 3 field QA pending | weakly verified |
| 3 | どのAI provider/modelが返したか分かる | Debug / Diagnostics trace implemented; v1.1.3+ automated/release evidence | weakly verified |
| 4 | なぜ喋ったか分かる | ReactionIntent trace implemented; Day 1/7 field QA pending | weakly verified |
| 5 | なぜ喋らないか分かる | suppression reason UI implemented; daily-use field QA pending | weakly verified |
| 6 | なぜfallbackしたか分かる | fallback reason/status implemented; OpenAI/Ollama/Rule field QA pending | weakly verified |
| 7 | 発話が単調でない | ReactionIntent/recent history implemented; 30min+ and Day 7 QA pending | pending |
| 8 | 発話が説教臭くない | response quality rules implemented; daily-use subjective QA pending | pending |
| 9 | 発話が過剰に長すぎない | preview/full panel implemented; comfort QA pending | weakly verified |
| 10 | 発話が短すぎて意味不明にならない | low-quality fallback削減済み; daily-use QA pending | pending |
| 11 | OpenAIなしでも最低限かわいい | RuleProvider fallback implemented; Day 2 field QA pending | pending |
| 12 | OpenAIありなら自然で賢い | OpenAI provider implemented; usable-key field QA pending | pending |
| 13 | Ollama fallbackでも破綻しない | fallback path implemented; Ollama stopped/model-missing QA pending | pending |
| 14 | RuleProvider fallbackでも最低限成立する | RuleProvider implemented; external-AI-off QA pending | pending |
| 15 | ユーザーが保存した記憶を一覧・編集・削除・exportできる | Memory v2 implemented; Day 3 field QA pending | weakly verified |
| 16 | 観察・記憶・AI送信範囲がすべてUIで確認できる | UI implemented across pages; integrated QA pending | weakly verified |
| 17 | 1週間常駐しても壊れない | Day 0 only | pending |
| 18 | updater / installer / release workflow が安定している | release workflow/assets confirmed; real installer/updater QA pending | weakly verified |
| 19 | 変な監視アプリに見えない | privacy boundaries documented/UI designed; comfort QA pending | pending |
| 20 | ユーザーが安心して「ここにいてもいい」と感じられる | requires daily-use subjective QA | pending |

## v1.6.0 Release Criteria Audit

| Criteria | Evidence | Status |
|---|---|---|
| 7日間常駐QAの日次記録がある | only Day 0 / Preflight exists | pending |
| Product Gates がすべて passed または許容済み | checklist remains pending | pending |
| Privacy Boundary Regression Checks がすべて passed | checklist remains pending | pending |
| critical issueが残っていない | no preflight critical issue; field QA not performed | weakly verified |
| `npm run build` 成功 | passed on 2026-05-15 for Day 1 readiness; v1.6.0 candidate not cut | weakly verified |
| `cargo build` 成功 | passed on 2026-05-15 for Day 1 readiness; v1.6.0 candidate not cut | weakly verified |
| `cargo test` 成功 | passed on 2026-05-15 for Day 1 readiness; 3 passed / 0 failed | weakly verified |
| `npm run qa:privacy` 成功 | failures 0 / warnings 4; warnings require field verification | weakly verified |
| `git diff --check` 成功 | clean on 2026-05-15 for Day 1 readiness; rerun before release | weakly verified |
| main push成功 | latest docs commits pushed | passed |
| annotated tag push成功 | latest tag is v1.5.4; no v1.6.0 tag | pending |
| Release workflow success確認 | v1.5.4 success; no v1.6.0 release | pending |
| Windows Installer artifact確認 | v1.5.4 artifact confirmed; no v1.6.0 artifact | pending |
| `latest.json` / updater artifact確認 | v1.5.4 artifact confirmed; no v1.6.0 artifact | pending |

## Missing Evidence Before Completion

- Day 1: 2h 起動・基本操作・Debug / Diagnostics visibility
- Day 2: OpenAIなし、Ollama未起動、RuleProvider fallback
- Day 3: Memory v2 edit/delete/export/import
- Day 4: Observation visibility、custom app classification
- Day 5: filename samples明示ON/OFF、非保存/非送信
- Day 6: updater / installer実機経路
- Day 7: comfort、speech quality、critical issueなし
- v1.6.0 release candidate automated checks
- v1.6.0 release workflow and artifacts

## Current Decision

Do not mark the north-star goal complete.

The next concrete action is **v1.6.0 Daily-use Beta Day 1**: run the installed or dev app for at least 2 hours, exercise basic operations and Debug / Diagnostics visibility, then record the result in `docs/FIELD_QA_NOTES.md`.
