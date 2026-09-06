(() => {
  // src/lib/figmaCarousel/catalog.js
  var FILE_KEY = "7S69IVP6sJ8Y2kBE5SgXDt";
  var PAGE_ID = "238:4";
  var CATALOG_VERSION = 1;
  var templates = [
    { id: "capa", nodeId: "239:512", name: "Minha marca \xB7 Capa", role: "cover", fields: {
      title: { property: "T\xEDtulo edit\xE1vel#290:73", budget: 65 },
      label: { property: "Texto da etiqueta#290:74", budget: 16 },
      body: { property: "CTA#290:76", budget: 60 }
    } },
    { id: "roteiros", nodeId: "239:519", name: "Minha marca \xB7 Roteiros", role: "body", fields: {
      body: { property: "Texto edit\xE1vel#290:78", budget: 90 }
    } },
    { id: "fornecedores", nodeId: "239:525", name: "Minha marca \xB7 Fornecedores", role: "body", fields: {
      body: { property: "Texto edit\xE1vel#290:79", budget: 105 }
    } },
    { id: "comunidade", nodeId: "239:531", name: "Minha marca \xB7 Comunidade", role: "body", fields: {
      body: { property: "Texto edit\xE1vel#290:80", budget: 105 }
    } },
    { id: "encerramento", nodeId: "239:542", name: "Minha marca \xB7 Encerramento", role: "closing", fields: {
      title: { property: "T\xEDtulo edit\xE1vel#290:81", budget: 48 },
      body: { property: "Texto do CTA#290:83", budget: 26 }
    } }
  ];

  // src/lib/figmaCarousel/job.js
  function validateJob(job) {
    if (!job || job.schemaVersion !== 1 || job.catalogVersion !== CATALOG_VERSION || job.fileKey !== FILE_KEY) throw new Error("Arquivo incompat\xEDvel com esta biblioteca de templates.");
    if (typeof job.title !== "string" || job.title.length > 500) throw new Error("T\xEDtulo inv\xE1lido.");
    if (!Array.isArray(job.slides) || job.slides.length < 2 || job.slides.length > 30) throw new Error("Use entre 2 e 30 slides.");
    job.slides.forEach((slide, i) => {
      const template = templates.find((t) => t.id === slide.templateId);
      if (!template || !slide.fields || typeof slide.fields !== "object") throw new Error(`Slide ${i + 1}: template inv\xE1lido.`);
      if (Object.keys(slide.fields).some((key) => !template.fields[key])) throw new Error(`Slide ${i + 1}: campo n\xE3o autorizado.`);
      for (const key of Object.keys(template.fields)) {
        if (typeof slide.fields[key] !== "string" || slide.fields[key].length > 5e3) throw new Error(`Slide ${i + 1}: campo ${key} inv\xE1lido.`);
      }
    });
    return job;
  }

  // figma-plugin/engine.js
  async function assemble(figma2, input) {
    var _a;
    const job = validateJob(input);
    if (figma2.fileKey && figma2.fileKey !== FILE_KEY) throw new Error("Abra o arquivo original da biblioteca antes de montar.");
    const page = await figma2.getNodeByIdAsync(PAGE_ID);
    if (!page || page.type !== "PAGE") throw new Error("P\xE1gina de templates n\xE3o encontrada.");
    await figma2.setCurrentPageAsync(page);
    const sources = /* @__PURE__ */ new Map();
    const fonts = /* @__PURE__ */ new Map();
    for (const slide of job.slides) {
      const template = templates.find((t) => t.id === slide.templateId);
      if (sources.has(template.id)) continue;
      const source = await figma2.getNodeByIdAsync(template.nodeId);
      if (!source || source.type !== "COMPONENT" || source.width !== 1080 || source.height !== 1350) throw new Error(`Template alterado ou indispon\xEDvel: ${template.name}.`);
      for (const field of Object.values(template.fields)) {
        if (((_a = source.componentPropertyDefinitions[field.property]) == null ? void 0 : _a.type) !== "TEXT") throw new Error(`Campo alterado em ${template.name}. Atualize o cat\xE1logo.`);
      }
      for (const text of source.findAllWithCriteria({ types: ["TEXT"] })) {
        for (const segment of text.getStyledTextSegments(["fontName"])) fonts.set(JSON.stringify(segment.fontName), segment.fontName);
      }
      sources.set(template.id, source);
    }
    for (const font of fonts.values()) {
      try {
        await figma2.loadFontAsync(font);
      } catch (e) {
        throw new Error(`Fonte indispon\xEDvel: ${font.family} ${font.style}. Instale a fonte original.`);
      }
    }
    const right = Math.max(0, ...page.children.map((n) => n.x + n.width));
    const created = [];
    const issues = [];
    try {
      for (const [index, slide] of job.slides.entries()) {
        const template = templates.find((t) => t.id === slide.templateId);
        const source = sources.get(template.id);
        const instance = source.createInstance();
        created.push(instance);
        page.appendChild(instance);
        instance.x = right + 200 + index * 1160;
        instance.y = 0;
        instance.name = `${job.title.slice(0, 100)} / ${String(index + 1).padStart(2, "0")}`;
        const before = instance.findAllWithCriteria({ types: ["TEXT"] }).map((n) => ({ id: n.id, w: n.width, h: n.height, text: n.characters }));
        const props = Object.fromEntries(Object.entries(template.fields).map(([key, field]) => [field.property, slide.fields[key]]));
        instance.setProperties(props);
        for (const text of instance.findAllWithCriteria({ types: ["TEXT"] })) {
          const original = before.find((n) => n.id === text.id);
          if (!original || text.characters === original.text) continue;
          const b = text.absoluteBoundingBox, outer = instance.absoluteBoundingBox;
          if (text.width > original.w + 1 || text.height > original.h + 1 || b.x < outer.x - 1 || b.y < outer.y - 1 || b.x + b.width > outer.x + outer.width + 1 || b.y + b.height > outer.y + outer.height + 1) {
            issues.push({ slide: index + 1, nodeId: text.id, field: text.name, message: "Texto excede a \xE1rea original. Revise o roteiro antes de exportar." });
          }
        }
      }
      return { createdNodeIds: created.map((n) => n.id), issues };
    } catch (error) {
      for (const node of created) node.remove();
      throw error;
    }
  }

  // figma-plugin/main.js
  figma.showUI(__html__, { width: 440, height: 580 });
  var busy = false;
  figma.ui.onmessage = async (message) => {
    if (message.type !== "assemble" || busy) return;
    busy = true;
    try {
      const report = await assemble(figma, message.job);
      figma.ui.postMessage({ type: "report", report });
      if (!report.issues.length) {
        for (const [index, id] of report.createdNodeIds.entries()) {
          const node = await figma.getNodeByIdAsync(id);
          const bytes = await node.exportAsync({ format: "PNG", constraint: { type: "SCALE", value: 1 } });
          figma.ui.postMessage({ type: "image", index, bytes });
        }
      }
    } catch (e) {
      figma.ui.postMessage({ type: "error", message: e.message });
    } finally {
      busy = false;
      figma.ui.postMessage({ type: "done" });
    }
  };
})();
