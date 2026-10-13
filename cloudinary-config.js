// Cloudinary unsigned upload configuration.
// 1. Create a free Cloudinary account.
// 2. Settings -> Upload -> Upload presets -> Add upload preset.
//    Set signing mode to "Unsigned" and allow image (and raw) uploads.
// 3. Fill in your cloud name and the preset name below.

window.CLOUDINARY_CONFIG = {
  cloudName: "deqwdzy5w",
  uploadPreset: "YOUR_UNSIGNED_UPLOAD_PRESET"
};

window.cloudinaryReady = function () {
  return !!(
    window.CLOUDINARY_CONFIG &&
    window.CLOUDINARY_CONFIG.cloudName !== "YOUR_CLOUD_NAME" &&
    window.CLOUDINARY_CONFIG.uploadPreset !== "YOUR_UNSIGNED_UPLOAD_PRESET"
  );
};
