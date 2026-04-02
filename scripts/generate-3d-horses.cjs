const fs = require('fs');
const path = require('path');

const API_KEY = process.env.TRIPO3D_API_KEY;
const BASE_URL = 'https://api.tripo3d.ai/v2/openapi';

const HORSES = [
  {
    id: 'rebels_romance',
    imagePath: path.resolve(__dirname, '../attached_assets/REBEL\'S_ROMANCE_1774203583947.jpg'),
    outputPath: path.resolve(__dirname, '../server/assets/models/rebels_romance.glb'),
  },
  {
    id: 'muraad',
    imagePath: path.resolve(__dirname, '../attached_assets/MURAAD_-02_1774203583950.jpg'),
    outputPath: path.resolve(__dirname, '../server/assets/models/muraad.glb'),
  },
  {
    id: 'commissioner_king',
    imagePath: path.resolve(__dirname, '../attached_assets/COMMISSIONER_KING__1774203583950.jpg'),
    outputPath: path.resolve(__dirname, '../server/assets/models/commissioner_king.glb'),
  },
];

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

async function createTask(imageToken, horseName) {
  console.log(`  Creating 3D generation task for ${horseName}...`);
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
      face_limit: 100000,
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

async function pollTask(taskId, horseName) {
  console.log(`  Polling task ${taskId} for ${horseName}...`);
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
    console.log(`  [${horseName}] Status: ${status}, Progress: ${progress}%`);

    if (status === 'success') {
      const modelUrl = data.data.output?.pbr_model;
      if (!modelUrl) {
        console.log(`  Full output:`, JSON.stringify(data.data.output, null, 2));
        throw new Error(`No pbr_model in output for ${horseName}`);
      }
      return modelUrl;
    }

    if (status === 'failed') {
      throw new Error(`Task failed for ${horseName}: ${JSON.stringify(data.data)}`);
    }

    await new Promise(r => setTimeout(r, pollInterval));
  }

  throw new Error(`Timeout waiting for ${horseName} model generation`);
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

  console.log('=== Tripo3D Horse Model Generator ===\n');

  const tasks = [];

  for (const horse of HORSES) {
    console.log(`\n[${horse.id}] Starting...`);
    try {
      const imageToken = await uploadImage(horse.imagePath);
      const taskId = await createTask(imageToken, horse.id);
      tasks.push({ ...horse, taskId });
    } catch (err) {
      console.error(`  ERROR for ${horse.id}:`, err.message);
    }
  }

  console.log(`\n=== All tasks created. Polling for completion... ===\n`);

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

  console.log('\n=== All done! ===');

  for (const horse of HORSES) {
    if (fs.existsSync(horse.outputPath)) {
      const stats = fs.statSync(horse.outputPath);
      console.log(`  ${horse.id}: ${(stats.size / (1024 * 1024)).toFixed(1)} MB`);
    } else {
      console.log(`  ${horse.id}: MISSING`);
    }
  }
}

main().catch(console.error);
