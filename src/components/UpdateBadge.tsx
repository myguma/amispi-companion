// アップデートバッジ
// キャラクターの下に小さく表示する。モーダルや大きな UI は出さない。
// コンパニオンの世界観を壊さないよう最小限のデザインにする。

interface UpdateBadgeProps {
  version: string;
  installing: boolean;
  onInstall: () => void;
}

export function UpdateBadge({ version, installing, onInstall }: UpdateBadgeProps) {
  return (
    <div className="update-badge-wrapper" aria-live="polite">
      {installing ? (
        <span className="update-badge update-badge--installing">
          installing...
        </span>
      ) : (
        <button
          className="update-badge update-badge--available"
          onClick={onInstall}
          title={`v${version} が利用可能 — クリックしてインストール`}
        >
          ↑ v{version}
        </button>
      )}
    </div>
  );
}
