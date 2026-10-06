
let model = null;
let modelPromise = null;

async function ensureModel() {
  if (model) return model;
  if (!modelPromise) {
    modelPromise = (async () => {
      if (!self.tf || !self.nsfwjs) throw new Error("Classifier libraries failed to load");
      try { await tf.setBackend("webgl"); } catch {}
      await tf.ready();
      model = await nsfwjs.load();
      return model;
    })().catch(err => {
      modelPromise = null;
      throw err;
    });
  }
  return modelPromise;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not decode captured image"));
    img.src = src;
  });
}

window.addEventListener("message", async (event) => {
  const msg = event.data;
  if (!msg || msg.__feedshield !== true) return;

  if (msg.type === "PING_MODEL") {
    try {
      await ensureModel();
      parent.postMessage({__feedshield:true, type:"MODEL_STATUS", id:msg.id, ok:true}, "*");
    } catch (e) {
      parent.postMessage({__feedshield:true, type:"MODEL_STATUS", id:msg.id, ok:false, error:String(e.message || e)}, "*");
    }
    return;
  }

  if (msg.type === "CLASSIFY_IMAGE") {
    try {
      const m = await ensureModel();
      const img = await loadImage(msg.dataUrl);
      const predictions = await m.classify(img);
      const map = {};
      for (const p of predictions) map[p.className] = p.probability;
      const sexualRisk = (map.Porn || 0) + (map.Hentai || 0) + (map.Sexy || 0);

      parent.postMessage({
        __feedshield:true,
        type:"CLASSIFICATION_RESULT",
        id:msg.id,
        ok:true,
        predictions,
        sexualRisk
      }, "*");
    } catch (e) {
      parent.postMessage({
        __feedshield:true,
        type:"CLASSIFICATION_RESULT",
        id:msg.id,
        ok:false,
        error:String(e.message || e)
      }, "*");
    }
  }
});
