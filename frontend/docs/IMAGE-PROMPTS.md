# Imágenes de demostración — segunda pasada

Generadas mediante ImageGen integrado, sin API ni herramienta CLI externa. Exportadas a JPEG calidad 88 con `tools/optimize-image.ps1`, sin recorte ni cambios de composición. Los PNG originales permanecen en el directorio de imágenes generadas de Codex.

## Portada

Archivo final: `src/assets/brand/living-room-v2.jpg`.

Prompt:

> Use case: photorealistic-natural. Asset type: wide homepage hero photograph for WebStore, an independent home electronics retailer. Create one beautiful horizontal 3:2 architectural interior photograph, no text or logos. A quiet contemporary Lima apartment living room in warm daylight: a thin black widescreen television on a low walnut media console, screen showing a still natural coastal landscape, discreet black soundbar beneath it, soft ivory walls with natural plaster texture, pale stone floor, a small corner of an olive upholstered chair. The scene feels lived-in but uncluttered, photographed by an interiors magazine with a 35mm lens, believable straight architecture, restrained styling and subtle real-world textures, natural shadows, no oversaturated colors, no floating objects. Composition: television and walnut console are the focus on the right half; left side of the photo is a calm plain ivory wall and softly lit empty space. This will be placed on the right side of a website hero beside black typography. Warm neutral palette, refined high-end retail photography. No text, no numbers, no badges, no watermark, no brand identity, no LG assets, no decorative geometric shapes, no illustration or cartoon rendering.

## Catálogo

Se ejecutó una generación por producto, sustituyendo `{subject}` en este prompt base:

> Use case: product-mockup. Asset type: ecommerce catalog product photograph for a fictional demo retailer. Subject: {subject}. Professional product photography, centered isolated object fully visible with generous consistent margins, seamless pure white background, soft realistic contact shadow only, front-oriented catalog angle, neutral studio light, crisp material details, no decorative plinth, no background objects, no packaging, no text, no logo, no watermark, no brand markings, no purple accents, no rounded illustration style. The object should occupy about 75 percent of a wide 4:3 frame. Realistic proportions and manufacture, polished retail product image.

| Archivo en `src/assets/products/` | Subject |
|---|---|
| `tv-studio.jpg` | a thin black 55 inch OLED television, straight-on front view, two slim black angled feet, screen displaying a natural Pacific coastline landscape at dusk |
| `washer-studio.jpg` | a premium white front-loading washing machine, one single round black glass door, realistic control dial and small unlit control panel, straight-on view |
| `fridge-studio.jpg` | a brushed stainless steel two-door refrigerator, freezer on top, fridge below, simple narrow recessed handles on the right, no water dispenser, straight-on view |
| `soundbar-studio.jpg` | a slim black soundbar paired with one compact rectangular black wireless subwoofer, laid out together naturally, grille fabric and metal details, slight three-quarter view |
| `monitor-studio.jpg` | a black 34 inch ultrawide computer monitor with a discreet matte black pedestal stand, screen displaying a calm teal and slate abstract desktop wallpaper, no UI, straight-on view |
| `microwave-studio.jpg` | a compact brushed silver countertop microwave oven with black glass door, subtle unbranded controls to the right, straight-on view |
