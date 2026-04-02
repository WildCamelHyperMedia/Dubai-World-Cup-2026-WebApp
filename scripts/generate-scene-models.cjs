const fs = require('fs');
const path = require('path');

const API_KEY = process.env.TRIPO3D_API_KEY;
const BASE_URL = 'https://api.tripo3d.ai/v2/openapi';

const SCENE_ASSETS = [
  {
    id: 'spectator_standing',
    prompt: 'A standing spectator person wearing casual clothes and a sun hat, low poly stylized, suitable for a horse racing venue crowd',
    imagePath: null,
    outputFile: 'spectator_standing.glb',
  },
  {
    id: 'spectator_cheering',
    prompt: 'A person cheering with arms raised wearing colorful sports clothing, low poly stylized, suitable for a horse racing venue crowd',
    imagePath: null,
    outputFile: 'spectator_cheering.glb',
  },
  {
    id: 'spectator_seated',
    prompt: 'A seated spectator person in casual clothes, low poly stylized, suitable for a horse racing grandstand',
    imagePath: null,
    outputFile: 'spectator_seated.glb',
  },
  {
    id: 'grandstand',
    prompt: 'A modern horse racing grandstand stadium structure with tiered seating, glass windows, and a white canopy roof, Dubai style architecture',
    imagePath: null,
    outputFile: 'grandstand.glb',
  },
  {
    id: 'start_gate',
    prompt: 'A horse racing starting gate with multiple metal stalls and overhead beam, metallic finish',
    imagePath: null,
    outputFile: 'start_gate.glb',
  },
  {
    id: 'finish_post',
    prompt: 'A horse racing finish line post with two tall white pillars connected by a horizontal beam, with a judges booth on one side',
    imagePath: null,
    outputFile: 'finish_post.glb',
  },
  {
    id: 'fence_segment',
    prompt: 'A white horse racing track rail fence segment with two posts and two horizontal rails, clean metallic look',
    imagePath: null,
    outputFile: 'fence_segment.glb',
  },
  {
    id: 'billboard_frame',
    prompt: 'An advertising billboard frame with two metal support poles and a rectangular display area, outdoor sports venue style',
    imagePath: null,
    outputFile: 'billboard_frame.glb',
  },
  {
    id: 'palm_tree',
    prompt: 'A tall Dubai style palm tree with a brown trunk and green fronds, suitable for a desert racing venue',
    imagePath: null,
    outputFile: 'palm_tree.glb',
  },
  {
    id: 'flag_pole',
    prompt: 'A tall flag pole with a waving flag, sports venue style',
    imagePath: null,
    outputFile: 'flag_pole.glb',
  },
  {
    id: 'barrier',
    prompt: 'A concrete jersey barrier painted in red and white stripes, used at sporting venues',
    imagePath: null,
    outputFile: 'barrier.glb',
  },
];

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { filter: null, imageOverride: null };
  for (const arg of args) {
    if (arg.startsWith('--image=')) {
      result.imageOverride = arg.slice('--image='.length);
    } else if (!arg.startsWith('--')) {
      result.filter = arg;
    }
  }
  return result;
}

async function uploadImage(imagePath) {
  const fileName = path.basename(imagePath);
  const fileBuffer = fs.readFileSync(imagePath);
  const blob = new Blob([fileBuffer], { type: 'image/jpeg' });

  const formData = new FormData();
  formData.append('file', blob, fileName);

  console.log(`  Uploading ${fileName}...`);
  const res = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: formData,
  });

  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`Upload failed: ${JSON.stringify(data)}`);
  }
  console.log(`  Upload successful. Token: ${data.data.image_token}`);
  return data.data.image_token;
}

async function createImageTask(imageToken, assetName) {
  console.log(`  Creating image-to-3D task for ${assetName}...`);
  const res = await fetch(`${BASE_URL}/task`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'image_to_model',
      file: {
        type: 'jpg',
        file_token: imageToken,
      },
      model_version: 'v2.0-20240919',
      face_limit: 30000,
      texture: true,
      pbr: true,
    }),
  });

  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`Task creation failed: ${JSON.stringify(data)}`);
  }
  console.log(`  Task created: ${data.data.task_id}`);
  return data.data.task_id;
}

async function createTextTask(prompt, assetName) {
  console.log(`  Creating text-to-3D task for ${assetName}...`);
  const res = await fetch(`${BASE_URL}/task`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'text_to_model',
      prompt: prompt,
      model_version: 'v2.0-20240919',
      face_limit: 30000,
      texture: true,
      pbr: true,
    }),
  });

  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`Task creation failed: ${JSON.stringify(data)}`);
  }
  console.log(`  Task created: ${data.data.task_id}`);
  return data.data.task_id;
}

async function pollTask(taskId, assetName) {
  console.log(`  Polling task ${taskId} for ${assetName}...`);
  const maxWait = 600000;
  const pollInterval = 5000;
  const start = Date.now();

  while (Date.now() - start < maxWait) {
    const res = await fetch(`${BASE_URL}/task/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
      },
    });

    const data = await res.json();
    if (data.code !== 0) {
      throw new Error(`Poll failed: ${JSON.stringify(data)}`);
    }

    const status = data.data.status;
    const progress = data.data.progress || 0;
    console.log(`  [${assetName}] Status: ${status}, Progress: ${progress}%`);

    if (status === 'success') {
      const modelUrl = data.data.output?.pbr_model || data.data.output?.model;
      if (!modelUrl) {
        console.log(`  Full output:`, JSON.stringify(data.data.output, null, 2));
        throw new Error(`No model in output for ${assetName}`);
      }
      return modelUrl;
    }

    if (status === 'failed') {
      throw new Error(`Task failed for ${assetName}: ${JSON.stringify(data.data)}`);
    }

    await new Promise(r => setTimeout(r, pollInterval));
  }

  throw new Error(`Timeout waiting for ${assetName} model generation`);
}

async function downloadModel(url, outputPath) {
  console.log(`  Downloading model to ${outputPath}...`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);
  const sizeMB = (buffer.length / (1024 * 1024)).toFixed(1);
  console.log(`  Downloaded: ${sizeMB} MB`);
}

async function main() {
  if (!API_KEY) {
    console.error('TRIPO3D_API_KEY not set');
    process.exit(1);
  }

  const modelsDir = path.resolve(__dirname, '../server/assets/models');
  if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
  }

  const { filter, imageOverride } = parseArgs();

  const assetsToGenerate = filter
    ? SCENE_ASSETS.filter(a => a.id === filter || a.id.includes(filter))
    : SCENE_ASSETS;

  if (assetsToGenerate.length === 0) {
    console.log(`No assets matching filter: ${filter}`);
    console.log('Available assets:', SCENE_ASSETS.map(a => a.id).join(', '));
    process.exit(1);
  }

  console.log('=== Tripo3D Scene Model Generator ===');
  console.log('Usage: node generate-scene-models.cjs [asset_filter] [--image=path/to/ref.jpg]');
  console.log('  asset_filter: optional name/partial to filter which assets to generate');
  console.log('  --image=path: use image-to-model for the filtered asset instead of text-to-model\n');
  console.log(`Generating ${assetsToGenerate.length} models...\n`);

  const tasks = [];

  for (const asset of assetsToGenerate) {
    const outputPath = path.join(modelsDir, asset.outputFile);
    if (fs.existsSync(outputPath)) {
      console.log(`[${asset.id}] Already exists, skipping`);
      continue;
    }

    console.log(`\n[${asset.id}] Starting...`);
    try {
      let taskId;
      const resolvedImagePath = imageOverride
        ? path.resolve(__dirname, '..', imageOverride)
        : asset.imagePath
          ? path.resolve(__dirname, '..', asset.imagePath)
          : null;

      if (resolvedImagePath && fs.existsSync(resolvedImagePath)) {
        console.log(`  Using image-to-model with: ${resolvedImagePath}`);
        const imageToken = await uploadImage(resolvedImagePath);
        taskId = await createImageTask(imageToken, asset.id);
      } else {
        console.log(`  Using text-to-model with prompt: "${asset.prompt.substring(0, 60)}..."`);
        taskId = await createTextTask(asset.prompt, asset.id);
      }
      tasks.push({ ...asset, taskId, outputPath });
    } catch (err) {
      console.error(`  ERROR for ${asset.id}:`, err.message);
    }
  }

  console.log(`\n=== ${tasks.length} tasks created. Polling for completion... ===\n`);

  for (const task of tasks) {
    try {
      console.log(`\n[${task.id}] Waiting for model...`);
      const modelUrl = await pollTask(task.taskId, task.id);
      await downloadModel(modelUrl, task.outputPath);
      console.log(`  [${task.id}] COMPLETE!`);
    } catch (err) {
      console.error(`  ERROR for ${task.id}:`, err.message);
    }
  }

  console.log('\n=== Summary ===');
  for (const asset of SCENE_ASSETS) {
    const outputPath = path.join(modelsDir, asset.outputFile);
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      console.log(`  ${asset.id}: ${(stats.size / (1024 * 1024)).toFixed(1)} MB`);
    } else {
      console.log(`  ${asset.id}: MISSING`);
    }
  }
}

main().catch(console.error);
