import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const horses = ['brown', 'black', 'white'];

const gearMap = {
  brown: {
    gold: 'client/src/assets/images/gear-bridle-gold.png',
    silver: 'client/src/assets/images/gear-bridle-silver.png',
    dark: 'client/src/assets/images/gear-saddle-dark.png',
    tan: 'client/src/assets/images/gear-saddle-tan.png',
    natural: 'client/src/assets/images/gear-alkhous-natural.png',
    dyed: 'client/src/assets/images/gear-alkhous-dyed.png',
    red: 'client/src/assets/images/gear-blanket-red.png',
    black: 'client/src/assets/images/gear-blanket-black.png',
    terra: 'client/src/assets/images/gear-pottery-terra.png',
    blue: 'client/src/assets/images/gear-fabric-blue.png'
  },
  black: {
    gold: 'client/src/assets/images/gear-bridle-gold-black.png',
    silver: 'client/src/assets/images/gear-bridle-silver-black.png',
    dark: 'client/src/assets/images/gear-saddle-dark-black.png',
    tan: 'client/src/assets/images/gear-saddle-tan-black.png',
    natural: 'client/src/assets/images/gear-alkhous-natural-black.png',
    dyed: 'client/src/assets/images/gear-alkhous-dyed-black.png',
    red: 'client/src/assets/images/gear-blanket-red-black.png',
    black: 'client/src/assets/images/gear-blanket-black-black.png',
    terra: 'client/src/assets/images/gear-pottery-terra-black.png',
    blue: 'client/src/assets/images/gear-fabric-blue-black.png'
  },
  white: {
    gold: 'client/src/assets/images/gear-bridle-gold-white.png',
    silver: 'client/src/assets/images/gear-bridle-silver-white.png',
    dark: 'client/src/assets/images/gear-saddle-dark-white.png',
    tan: 'client/src/assets/images/gear-saddle-tan-white.png',
    natural: 'client/src/assets/images/gear-alkhous-natural-white.png',
    dyed: 'client/src/assets/images/gear-alkhous-dyed-white.png',
    red: 'client/src/assets/images/gear-blanket-red-white.png',
    black: 'client/src/assets/images/gear-blanket-black-white.png',
    terra: 'client/src/assets/images/gear-pottery-terra-white.png',
    blue: 'client/src/assets/images/gear-fabric-blue-white.png'
  }
};

const baseImages = {
  brown: 'client/public/images/horses/brown.png',
  black: 'client/public/images/horses/black.png',
  white: 'client/public/images/horses/white.png'
};

const outDir = 'client/public/images/comb';
fs.mkdirSync(outDir, { recursive: true });

const paths = [
  // S1
  ['gold'], ['silver'],
  // S2
  ['gold', 'dark'], ['gold', 'tan'], ['silver', 'dark'], ['silver', 'tan'],
  // S3
  ['gold', 'dark', 'natural'], ['gold', 'tan', 'natural'], ['silver', 'dark', 'natural'], ['silver', 'tan', 'natural'],
  ['gold', 'dark', 'dyed'], ['gold', 'tan', 'dyed'], ['silver', 'dark', 'dyed'], ['silver', 'tan', 'dyed'],
  // S4
  ['gold', 'dark', 'natural', 'red'], ['gold', 'tan', 'natural', 'red'], ['silver', 'dark', 'natural', 'red'], ['silver', 'tan', 'natural', 'red'],
  ['gold', 'dark', 'natural', 'black'], ['gold', 'tan', 'natural', 'black'], ['silver', 'dark', 'natural', 'black'], ['silver', 'tan', 'natural', 'black'],
  ['gold', 'dark', 'dyed', 'red'], ['gold', 'tan', 'dyed', 'red'], ['silver', 'dark', 'dyed', 'red'], ['silver', 'tan', 'dyed', 'red'],
  ['gold', 'dark', 'dyed', 'black'], ['gold', 'tan', 'dyed', 'black'], ['silver', 'dark', 'dyed', 'black'], ['silver', 'tan', 'dyed', 'black'],
  // S5
  ['gold', 'dark', 'natural', 'red', 'terra'], ['gold', 'tan', 'natural', 'red', 'terra'], ['silver', 'dark', 'natural', 'red', 'terra'], ['silver', 'tan', 'natural', 'red', 'terra'],
  ['gold', 'dark', 'natural', 'black', 'terra'], ['gold', 'tan', 'natural', 'black', 'terra'], ['silver', 'dark', 'natural', 'black', 'terra'], ['silver', 'tan', 'natural', 'black', 'terra'],
  ['gold', 'dark', 'dyed', 'red', 'terra'], ['gold', 'tan', 'dyed', 'red', 'terra'], ['silver', 'dark', 'dyed', 'red', 'terra'], ['silver', 'tan', 'dyed', 'red', 'terra'],
  ['gold', 'dark', 'dyed', 'black', 'terra'], ['gold', 'tan', 'dyed', 'black', 'terra'], ['silver', 'dark', 'dyed', 'black', 'terra'], ['silver', 'tan', 'dyed', 'black', 'terra'],
  // S6
  ['gold', 'dark', 'natural', 'red', 'terra', 'blue'], ['gold', 'tan', 'natural', 'red', 'terra', 'blue'], ['silver', 'dark', 'natural', 'red', 'terra', 'blue'], ['silver', 'tan', 'natural', 'red', 'terra', 'blue'],
  ['gold', 'dark', 'natural', 'black', 'terra', 'blue'], ['gold', 'tan', 'natural', 'black', 'terra', 'blue'], ['silver', 'dark', 'natural', 'black', 'terra', 'blue'], ['silver', 'tan', 'natural', 'black', 'terra', 'blue'],
  ['gold', 'dark', 'dyed', 'red', 'terra', 'blue'], ['gold', 'tan', 'dyed', 'red', 'terra', 'blue'], ['silver', 'dark', 'dyed', 'red', 'terra', 'blue'], ['silver', 'tan', 'dyed', 'red', 'terra', 'blue'],
  ['gold', 'dark', 'dyed', 'black', 'terra', 'blue'], ['gold', 'tan', 'dyed', 'black', 'terra', 'blue'], ['silver', 'dark', 'dyed', 'black', 'terra', 'blue'], ['silver', 'tan', 'dyed', 'black', 'terra', 'blue']
];

console.log(`Generating ${paths.length * 3} combinations...`);

let cnt = 0;
for (const horse of horses) {
  for (const combo of paths) {
    const outFile = path.join(outDir, `${horse}-${combo.join('-')}.png`);
    if (fs.existsSync(outFile)) continue;
    
    const baseImg = baseImages[horse];
    const gearImgs = combo.map(c => gearMap[horse][c]);
    
    // Check if gear images exist
    const missing = gearImgs.filter(g => !fs.existsSync(g));
    if (missing.length > 0) {
       console.log(`Skipping ${outFile} - missing ${missing.join(', ')}`);
       continue;
    }
    
    let cmd = `magick "${baseImg}"`;
    for (const gear of gearImgs) {
      cmd += ` "${gear}" -composite`;
    }
    cmd += ` "${outFile}"`;
    
    try {
      execSync(cmd);
      cnt++;
      if (cnt % 10 === 0) console.log(`Generated ${cnt} images...`);
    } catch (e) {
      console.error(`Failed: ${cmd}`);
      console.error(e);
    }
  }
}

console.log(`Done. Generated ${cnt} new combinations.`);
