import fs from "fs";
import path from "path";

const API_BASE = "https://api.tripo3d.ai/v2/openapi";
const API_KEY = process.env.TRIPO3D_API_KEY;

interface TripoTaskResponse {
  code: number;
  data: {
    task_id: string;
  };
}

interface TripoTaskStatus {
  code: number;
  data: {
    task_id: string;
    type: string;
    status: string;
    progress: number;
    output?: {
      model?: string;
      rendered_image?: string;
    };
  };
}

const HORSES = [
  {
    id: "rebels_romance",
    imagePath: "attached_assets/REBEL'S_ROMANCE_1774203583947.jpg",
    outputFile: "rebels_romance.glb",
  },
  {
    id: "muraad",
    imagePath: "attached_assets/MURAAD_-02_1774203583950.jpg",
    outputFile: "muraad.glb",
  },
  {
    id: "commissioner_king",
    imagePath: "attached_assets/COMMISSIONER_KING__1774203583950.jpg",
    outputFile: "commissioner_king.glb",
  },
];

async function uploadImage(imagePath: string): Promise<string> {
  const fullPath = path.resolve(process.cwd(), imagePath);
  const fileBuffer = fs.readFileSync(fullPath);
  const blob = new Blob([fileBuffer], { type: "image/jpeg" });

  const formData = new FormData();
  formData.append("file", blob, path.basename(imagePath));

  const response = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
    },
    body: formData,
  });

  const data = await response.json();
  console.log(`Upload response for ${imagePath}:`, JSON.stringify(data));

  if (data.code !== 0) {
    throw new Error(`Upload failed: ${JSON.stringify(data)}`);
  }

  return data.data.image_token;
}

async function createTask(imageToken: string): Promise<string> {
  const response = await fetch(`${API_BASE}/task`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      type: "image_to_model",
      file: {
        type: "jpg",
        file_token: imageToken,
      },
    }),
  });

  const data: TripoTaskResponse = await response.json();
  console.log(`Create task response:`, JSON.stringify(data));

  if (data.code !== 0) {
    throw new Error(`Task creation failed: ${JSON.stringify(data)}`);
  }

  return data.data.task_id;
}

async function pollTask(taskId: string): Promise<TripoTaskStatus["data"]> {
  const maxAttempts = 120;
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(`${API_BASE}/task/${taskId}`, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
    });

    const data: TripoTaskStatus = await response.json();
    const status = data.data.status;
    const progress = data.data.progress;

    console.log(`Task ${taskId}: status=${status}, progress=${progress}%`);

    if (status === "success") {
      return data.data;
    } else if (status === "failed" || status === "cancelled") {
      throw new Error(`Task ${taskId} ${status}`);
    }

    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error(`Task ${taskId} timed out after ${maxAttempts * 5}s`);
}

async function downloadModel(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);
  console.log(`Downloaded model to ${outputPath} (${buffer.length} bytes)`);
}

async function main() {
  if (!API_KEY) {
    console.error("TRIPO3D_API_KEY not set");
    process.exit(1);
  }

  const modelsDir = path.resolve(process.cwd(), "server", "assets", "models");
  if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
  }

  const existingModels = HORSES.filter((h) =>
    fs.existsSync(path.join(modelsDir, h.outputFile)),
  );
  if (existingModels.length === HORSES.length) {
    console.log("All models already exist, skipping generation");
    return;
  }

  for (const horse of HORSES) {
    const outputPath = path.join(modelsDir, horse.outputFile);
    if (fs.existsSync(outputPath)) {
      console.log(`Model ${horse.outputFile} already exists, skipping`);
      continue;
    }

    console.log(`\n=== Processing ${horse.id} ===`);
    console.log(`Uploading ${horse.imagePath}...`);
    const imageToken = await uploadImage(horse.imagePath);

    console.log(`Creating model generation task...`);
    const taskId = await createTask(imageToken);

    console.log(`Polling task ${taskId}...`);
    const result = await pollTask(taskId);

    const modelUrl = result.output?.pbr_model || result.output?.model;
    if (modelUrl) {
      console.log(`Downloading model...`);
      await downloadModel(modelUrl, outputPath);
    } else {
      console.error(`No model output for ${horse.id}`, JSON.stringify(result.output));
    }
  }

  console.log("\nDone! All models generated.");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
