/**
 * Leest een afbeelding in als dataURL en schaalt hem terug tot maxDim pixels,
 * zodat logo's de localStorage (±5 MB) en de online blob niet opblazen.
 */
export function fileToDataUrl(file: File, maxDim = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const raw = reader.result as string;
      const img = new Image();
      img.onerror = () => resolve(raw);
      img.onload = () => {
        if (img.width <= maxDim && img.height <= maxDim) return resolve(raw);
        const scale = maxDim / Math.max(img.width, img.height);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/png"));
      };
      img.src = raw;
    };
    reader.readAsDataURL(file);
  });
}
