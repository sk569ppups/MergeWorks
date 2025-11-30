// ===== キャンバスのA3横サイズ（300dpi相当の目安） =====
const A3_WIDTH = 4961;
const A3_HEIGHT = 3508;

const fileLeftInput = document.getElementById("fileLeft");
const fileRightInput = document.getElementById("fileRight");
const previewLeft = document.getElementById("previewLeft");
const previewRight = document.getElementById("previewRight");
const mergeBtn = document.getElementById("mergeBtn");
const statusEl = document.getElementById("status");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let leftDataUrl = null;
let rightDataUrl = null;

// ===== イベント設定 =====
fileLeftInput.addEventListener("change", handleFileChange);
fileRightInput.addEventListener("change", handleFileChange);
mergeBtn.addEventListener("click", handleMerge);

// ===== ファイル選択時処理 =====
function handleFileChange() {
  const leftFile = fileLeftInput.files[0];
  const rightFile = fileRightInput.files[0];

  updatePreview(previewLeft, leftFile, (url) => (leftDataUrl = url));
  updatePreview(previewRight, rightFile, (url) => (rightDataUrl = url));

  mergeBtn.disabled = !(leftFile && rightFile);
  statusEl.textContent = "";
}

// プレビュー更新
function updatePreview(container, file, onLoaded) {
  container.innerHTML = "";
  if (!file) {
    container.textContent = "画像未選択";
    return;
  }
  if (!file.type.startsWith("image/")) {
    container.textContent = "画像ファイルを選択してください";
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    const img = document.createElement("img");
    img.src = dataUrl;
    img.className = "preview-img";
    container.appendChild(img);
    if (onLoaded) onLoaded(dataUrl);
  };
  reader.readAsDataURL(file);
}

// ===== 合成処理 =====
async function handleMerge() {
  if (!leftDataUrl || !rightDataUrl) return;

  try {
    mergeBtn.disabled = true;
    statusEl.textContent = "合成中… 少しお待ちください。";

    const [leftImg, rightImg] = await Promise.all([
      loadImage(leftDataUrl),
      loadImage(rightDataUrl),
    ]);

    // キャンバスをA3横サイズに設定
    canvas.width = A3_WIDTH;
    canvas.height = A3_HEIGHT;

    // 背景を白で塗りつぶし（印刷時の透過トラブル防止）
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, A3_WIDTH, A3_HEIGHT);

    // 左右に描画
    drawSideBySide(leftImg, rightImg);

    // JPEGに変換してダウンロード
    const quality = 0.92; // 0〜1（画質優先）
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          statusEl.textContent =
            "ブラウザが画像出力に対応していません。（別ブラウザを試してください）";
          return;
        }
        const url = URL.createObjectURL(blob);
        downloadBlob(url);
        URL.revokeObjectURL(url);
        statusEl.textContent =
          "合成完了！ A3横JPEGをダウンロードしました。";
      },
      "image/jpeg",
      quality
    );
  } catch (e) {
    console.error(e);
    statusEl.textContent =
      "エラーが発生しました。もう一度画像を選択してお試しください。";
  } finally {
    mergeBtn.disabled = !(fileLeftInput.files[0] && fileRightInput.files[0]);
  }
}

// 画像ロード（DataURL → Imageオブジェクト）
function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

// 左右にフィットさせて描画
function drawSideBySide(leftImg, rightImg) {
  const halfW = A3_WIDTH / 2;

  // それぞれ半分の幅・全体の高さに収まるようスケール計算
  const leftFit = calcFit(leftImg.width, leftImg.height, halfW, A3_HEIGHT);
  const rightFit = calcFit(rightImg.width, rightImg.height, halfW, A3_HEIGHT);

  // 左画像：右端を中央線に合わせる
  const leftX = halfW - leftFit.w;
  const leftY = (A3_HEIGHT - leftFit.h) / 2;

  // 右画像：左端を中央線に合わせる
  const rightX = halfW;
  const rightY = (A3_HEIGHT - rightFit.h) / 2;

  ctx.drawImage(leftImg, leftX, leftY, leftFit.w, leftFit.h);
  ctx.drawImage(rightImg, rightX, rightY, rightFit.w, rightFit.h);
}

// 指定枠内に収まるようにリサイズ
function calcFit(origW, origH, maxW, maxH) {
  const scale = Math.min(maxW / origW, maxH / origH);
  return {
    w: origW * scale,
    h: origH * scale,
  };
}

// ダウンロード処理
function downloadBlob(url) {
  const a = document.createElement("a");
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");

  a.href = url;
  a.download = `POP_A3横_${y}${m}${d}_${hh}${mm}${ss}.jpg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
